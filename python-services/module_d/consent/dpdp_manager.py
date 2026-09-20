"""
DPDP Act 2023 Consent Manager for MediKiosk Module D.
Handles itemized consent lifecycle, validity checking, emergency overrides,
and tamper-evident append-only audit logging.
"""

import hashlib
import json
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from ..config import settings
from ..privacy.session_cleaner import session_cleaner
from ..schemas.consent_schemas import (
    ConsentArtifact,
    ConsentArtifactCreate,
    ConsentAuditEntry,
    ConsentDataElement,
    ConsentNoticeResponse,
    ConsentPurpose,
    ConsentRevokeRequest,
    ConsentRevokeResponse,
    ConsentVerifyResponse,
    ItemizedPurposeDetail,
    RetentionPolicy,
)

# Multilingual Itemized Purpose Descriptions
PURPOSE_DESCRIPTIONS: dict[str, dict[ConsentPurpose, dict[str, str]]] = {
    "en": {
        ConsentPurpose.CARE_INTAKE: {
            "title": "Clinical Intake & Symptom Clarification",
            "desc": "Collecting self-reported chief complaints, symptom timeline, and severity for doctor preparation."
        },
        ConsentPurpose.DOCTOR_CONSULTATION: {
            "title": "OPD Physician Transfer",
            "desc": "Transmitting the structured clinical summary directly to your consulting doctor's computer."
        },
        ConsentPurpose.DOCUMENT_DIGITIZATION: {
            "title": "Prescription & Lab Report Scanning",
            "desc": "Ephemeral optical text scanning of previous medical papers; data is wiped immediately post-consultation."
        },
        ConsentPurpose.EMERGENCY_TRIAGE: {
            "title": "Immediate Red-Flag Detection",
            "desc": "Screening for critical chest pain, stroke, or severe distress to trigger immediate emergency alert."
        },
        ConsentPurpose.ABDM_LINK: {
            "title": "ABDM Care Context Linking (Optional)",
            "desc": "Linking this OPD encounter to your 14-digit ABHA ID under the national digital health ecosystem."
        }
    },
    "hi": {
        ConsentPurpose.CARE_INTAKE: {
            "title": "नैदानिक साक्षात्कार एवं लक्षण विश्लेषण",
            "desc": "डॉक्टर के परामर्श से पूर्व आपकी मुख्य बीमारी, लक्षणों की अवधि व गंभीरता दर्ज करना।"
        },
        ConsentPurpose.DOCTOR_CONSULTATION: {
            "title": "ओपीडी डॉक्टर को सारांश प्रेषण",
            "desc": "तैयार किया गया सारांश सीधे आपके परामर्शदाता चिकित्सक के कंप्यूटर पर सुरक्षित भेजना।"
        },
        ConsentPurpose.DOCUMENT_DIGITIZATION: {
            "title": "पुराने पर्चे व जांच रिपोर्ट स्कैनिंग",
            "desc": "पुरानी रिपोर्ट का केवल रैम (RAM) में अस्थायी विश्लेषण; कियोस्क पर कोई फोटो या फाइल नहीं रखी जाती।"
        },
        ConsentPurpose.EMERGENCY_TRIAGE: {
            "title": "आपातकालीन संकेत पहचान (रेड फ्लैग)",
            "desc": "गंभीर छाती दर्द, आघात या सांस की तकलीफ पहचानकर तत्काल आपातकालीन डेस्क को सूचित करना।"
        },
        ConsentPurpose.ABDM_LINK: {
            "title": "आभा डिजिटल स्वास्थ्य रिकॉर्ड लिंक (वैकल्पिक)",
            "desc": "इस ओपीडी परामर्श को आपके 14-अंकीय आभा नंबर से सुरक्षित रूप से जोड़ना।"
        }
    }
}


class DPDPManager:
    """Manages the DPDP Act 2023 Consent Artifact lifecycle."""

    def __init__(self):
        self._consent_store: dict[str, ConsentArtifact] = {}
        self._last_audit_checksum: str | None = None
        self._init_audit_log()

    def _init_audit_log(self):
        """Ensure audit log file exists and compute starting checksum chain."""
        if not os.path.exists(settings.AUDIT_LOG_FILE):
            settings.AUDIT_LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
            with open(settings.AUDIT_LOG_FILE, "w", encoding="utf-8") as f:
                pass
        else:
            # Read last line to get previous checksum
            try:
                with open(settings.AUDIT_LOG_FILE, "r", encoding="utf-8") as f:
                    lines = f.readlines()
                    if lines:
                        last = json.loads(lines[-1].strip())
                        self._last_audit_checksum = last.get("checksum")
            except Exception:
                self._last_audit_checksum = None

    def _append_audit_entry(self, session_id: str, action: str, actor: str, details: dict[str, Any]) -> str:
        """Append an immutable, cryptographically chained audit record."""
        audit_id = str(uuid.uuid4())
        now_iso = datetime.now(timezone.utc).isoformat()

        entry_raw = f"{audit_id}|{now_iso}|{session_id}|{action}|{actor}|{json.dumps(details, sort_keys=True)}|{self._last_audit_checksum or ''}"
        checksum = hashlib.sha256(entry_raw.encode("utf-8")).hexdigest()

        entry = ConsentAuditEntry(
            audit_id=audit_id,
            timestamp=now_iso,
            session_id=session_id,
            action=action,
            actor=actor,
            details=details,
            prev_checksum=self._last_audit_checksum,
            checksum=checksum
        )

        with open(settings.AUDIT_LOG_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry.model_dump()) + "\n")

        self._last_audit_checksum = checksum
        return audit_id

    def generate_notice(self, language: str = "hi", patient_id: str | None = None) -> ConsentNoticeResponse:
        """
        Generate itemized DPDP v5.0 consent notice with statutory details.
        """
        lang_key = language if language in PURPOSE_DESCRIPTIONS else "en"
        desc_map = PURPOSE_DESCRIPTIONS[lang_key]

        itemized = [
            ItemizedPurposeDetail(
                purpose=ConsentPurpose.CARE_INTAKE,
                title=desc_map[ConsentPurpose.CARE_INTAKE]["title"],
                description=desc_map[ConsentPurpose.CARE_INTAKE]["desc"],
                data_elements=[ConsentDataElement.CHIEF_COMPLAINTS, ConsentDataElement.VITALS, ConsentDataElement.PAST_HISTORY],
                retention=RetentionPolicy.EPHEMERAL_POST_INGESTION,
                is_mandatory=True,
                default_granted=True
            ),
            ItemizedPurposeDetail(
                purpose=ConsentPurpose.DOCTOR_CONSULTATION,
                title=desc_map[ConsentPurpose.DOCTOR_CONSULTATION]["title"],
                description=desc_map[ConsentPurpose.DOCTOR_CONSULTATION]["desc"],
                data_elements=[ConsentDataElement.DEMOGRAPHICS, ConsentDataElement.CHIEF_COMPLAINTS],
                retention=RetentionPolicy.EPHEMERAL_POST_INGESTION,
                is_mandatory=True,
                default_granted=True
            ),
            ItemizedPurposeDetail(
                purpose=ConsentPurpose.DOCUMENT_DIGITIZATION,
                title=desc_map[ConsentPurpose.DOCUMENT_DIGITIZATION]["title"],
                description=desc_map[ConsentPurpose.DOCUMENT_DIGITIZATION]["desc"],
                data_elements=[ConsentDataElement.SCANNED_PRESCRIPTIONS],
                retention=RetentionPolicy.EPHEMERAL_POST_INGESTION,
                is_mandatory=False,
                default_granted=True
            ),
            ItemizedPurposeDetail(
                purpose=ConsentPurpose.EMERGENCY_TRIAGE,
                title=desc_map[ConsentPurpose.EMERGENCY_TRIAGE]["title"],
                description=desc_map[ConsentPurpose.EMERGENCY_TRIAGE]["desc"],
                data_elements=[ConsentDataElement.CHIEF_COMPLAINTS, ConsentDataElement.VITALS],
                retention=RetentionPolicy.EPHEMERAL_POST_INGESTION,
                is_mandatory=False,
                default_granted=True
            ),
            ItemizedPurposeDetail(
                purpose=ConsentPurpose.ABDM_LINK,
                title=desc_map[ConsentPurpose.ABDM_LINK]["title"],
                description=desc_map[ConsentPurpose.ABDM_LINK]["desc"],
                data_elements=[ConsentDataElement.DEMOGRAPHICS],
                retention=RetentionPolicy.EPHEMERAL_POST_INGESTION,
                is_mandatory=False,
                default_granted=True
            ),
        ]

        title = "डिजिटल स्वास्थ्य डेटा सहमति (DPDP Act 2023)" if language == "hi" else "Digital Health Data Consent (DPDP Act 2023)"
        body = (
            "आपकी चिकित्सा जानकारी केवल आपके डॉक्टर के परामर्श और पूर्व-जांच सारांश तैयार करने के लिए सुरक्षित रूप से ली जा रही है। "
            "यह डेटा पूरी तरह गोपनीय है और डॉक्टर के सत्यापन के बाद कियोस्क से स्वतः 0-बाइट नष्ट कर दिया जाएगा।"
            if language == "hi" else
            "Your health information is collected strictly for clinical consultation and automated intake preparation. "
            "Under DPDP Act 2023, data is protected, never sold, and ephemeral session memory is purged upon doctor ingestion."
        )

        rights = {
            "right_to_withdraw": "You can withdraw consent anytime before consultation completion.",
            "right_to_correction": "You may review and edit any spoken or transcribed answer on-screen.",
            "grievance_redressal": f"Contact Grievance Officer: {settings.GRIEVANCE_OFFICER_NAME} ({settings.GRIEVANCE_OFFICER_CONTACT})"
        }

        notice = ConsentNoticeResponse(
            notice_version=settings.DPDP_NOTICE_VERSION,
            data_fiduciary=settings.DATA_FIDUCIARY,
            grievance_officer=settings.GRIEVANCE_OFFICER_NAME,
            contact=settings.GRIEVANCE_OFFICER_CONTACT,
            language=language,
            title=title,
            body=body,
            itemized_purposes=itemized,
            rights_summary=rights,
            audio_notice_available=True,
            notice_timestamp=datetime.now(timezone.utc).isoformat()
        )

        self._append_audit_entry(
            session_id=patient_id or "ANONYMOUS",
            action="NOTICE_ISSUED",
            actor="SYSTEM",
            details={"language": language, "notice_version": settings.DPDP_NOTICE_VERSION}
        )

        return notice

    def capture_consent(self, payload: ConsentArtifactCreate) -> ConsentArtifact:
        """
        Record affirmative action consent and generate an immutable artifact.
        Handles emergency deemed consent under Section 7(a).
        """
        artifact_id = f"CA-DPDP-{uuid.uuid4().hex[:12].upper()}"
        created_at = datetime.now(timezone.utc)
        expires_at = created_at + timedelta(hours=settings.CONSENT_VALIDITY_HOURS)
        data_erase_at = (created_at + timedelta(minutes=120)).isoformat()

        # Compute SHA-256 signature for tamper-evidence
        purposes_str = ",".join(sorted([p.value for p in payload.granted_purposes]))
        raw_to_sign = f"{artifact_id}|{payload.session_id}|{payload.patient_id or ''}|{purposes_str}|{created_at.isoformat()}|{payload.method}"
        sig = hashlib.sha256(raw_to_sign.encode("utf-8")).hexdigest()

        artifact = ConsentArtifact(
            artifact_id=artifact_id,
            session_id=payload.session_id,
            patient_id=payload.patient_id,
            abha_id=payload.abha_id,
            notice_version=settings.DPDP_NOTICE_VERSION,
            granted_purposes=payload.granted_purposes,
            language=payload.language,
            method=payload.method,
            is_guardian_consent=payload.is_guardian_consent,
            guardian_name=payload.guardian_name,
            guardian_relationship=payload.guardian_relationship,
            is_emergency_exception=payload.is_emergency_exception,
            emergency_justification=payload.emergency_justification,
            created_at=created_at.isoformat(),
            expires_at=expires_at.isoformat(),
            dataEraseAt=data_erase_at,
            is_active=True,
            sha256_signature=sig
        )

        self._consent_store[payload.session_id] = artifact

        action_name = "EMERGENCY_OVERRIDE" if payload.is_emergency_exception else "CONSENT_GRANTED"
        self._append_audit_entry(
            session_id=payload.session_id,
            action=action_name,
            actor=(payload.guardian_name or "GUARDIAN") if payload.is_guardian_consent else "PATIENT",
            details={
                "artifact_id": artifact_id,
                "purposes": [p.value for p in payload.granted_purposes],
                "method": payload.method.value,
                "is_emergency": payload.is_emergency_exception,
                "dataEraseAt": data_erase_at,
                "signature": sig
            }
        )

        # DPDP Act 2023 Section 7(a): Write immutable emergency entry to audit_emergency.log
        if payload.is_emergency_exception:
            emergency_log_path = settings.AUDIT_LOG_FILE.parent / "audit_emergency.log"
            emergency_entry = {
                "emergency_id": f"EMERG-{uuid.uuid4().hex[:8].upper()}",
                "timestamp": created_at.isoformat(),
                "session_id": payload.session_id,
                "patient_id": payload.patient_id,
                "abha_id": payload.abha_id,
                "dpdp_section": "DPDP Act 2023 Section 7(a) - Legitimate Use Emergency Exception",
                "justification": payload.emergency_justification or "Acute clinical emergency flagged during intake",
                "minimum_intake_scope": "TRIAGE_ONLY",
                "data_erase_at": data_erase_at,
                "artifact_id": artifact_id,
                "sha256_signature": sig
            }
            try:
                emergency_log_path.parent.mkdir(parents=True, exist_ok=True)
                with open(emergency_log_path, "a", encoding="utf-8") as ef:
                    ef.write(json.dumps(emergency_entry) + "\n")
            except Exception as e:
                print(f"[DPDPManager] Error logging emergency entry: {e}")

        return artifact

    def verify_consent(self, session_id: str, required_purpose: ConsentPurpose | None = None) -> ConsentVerifyResponse:
        """
        Verify whether an active, non-expired consent artifact covers the session.
        """
        artifact = self._consent_store.get(session_id)
        if not artifact:
            return ConsentVerifyResponse(is_valid=False, reasons=["No consent artifact registered for session"])

        reasons = []
        if not artifact.is_active:
            reasons.append(f"Consent was revoked on {artifact.revoked_at}")

        # Check expiration
        exp = datetime.fromisoformat(artifact.expires_at)
        if datetime.now(timezone.utc) > exp:
            reasons.append("Consent artifact has expired")

        if required_purpose and required_purpose not in artifact.granted_purposes:
            reasons.append(f"Required purpose '{required_purpose.value}' not granted in artifact")

        # Verify cryptographic signature integrity
        purposes_str = ",".join(sorted([p.value for p in artifact.granted_purposes]))
        raw_to_sign = f"{artifact.artifact_id}|{artifact.session_id}|{artifact.patient_id or ''}|{purposes_str}|{artifact.created_at}|{artifact.method}"
        expected_sig = hashlib.sha256(raw_to_sign.encode("utf-8")).hexdigest()
        if artifact.sha256_signature != expected_sig:
            reasons.append("Cryptographic signature mismatch: artifact tampered with")

        is_valid = len(reasons) == 0
        return ConsentVerifyResponse(is_valid=is_valid, artifact=artifact, reasons=reasons)

    def revoke_consent(self, req: ConsentRevokeRequest) -> ConsentRevokeResponse:
        """
        Revoke consent immediately and invoke ephemeral memory purge.
        """
        artifact = self._consent_store.get(req.session_id)
        now_iso = datetime.now(timezone.utc).isoformat()

        if artifact:
            artifact.is_active = False
            artifact.revoked_at = now_iso
            artifact.revocation_reason = req.reason

        # Trigger privacy cleaner (zero-byte wipe of ephemeral memory)
        purge_result = session_cleaner.purge_session(req.session_id)

        audit_id = self._append_audit_entry(
            session_id=req.session_id,
            action="CONSENT_REVOKED",
            actor=req.revoked_by,
            details={
                "reason": req.reason,
                "memory_purged": purge_result["success"],
                "shredded_bytes": purge_result.get("bytes_purged", 0)
            }
        )

        return ConsentRevokeResponse(
            success=True,
            session_id=req.session_id,
            revoked_at=now_iso,
            memory_purged=purge_result["success"],
            audit_id=audit_id,
            message="Consent revoked and ephemeral memory purged successfully under DPDP Act 2023."
        )


dpdp_manager = DPDPManager()
