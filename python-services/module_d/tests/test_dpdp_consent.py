"""
Unit Tests for DPDP Act 2023 Consent Management in MediKiosk Module D.
"""

import pytest
import uuid
from module_d.consent.dpdp_manager import dpdp_manager
from module_d.schemas.consent_schemas import (
    ConsentArtifactCreate,
    ConsentPurpose,
    ConsentMethod,
    ConsentRevokeRequest
)


def test_generate_multilingual_notice():
    """Verify that DPDP notice is generated with all statutory requirements in Hindi & English."""
    # Hindi notice
    hi_notice = dpdp_manager.generate_notice(language="hi")
    assert hi_notice.notice_version == "v5.0"
    assert "डिजिटल स्वास्थ्य डेटा सहमति" in hi_notice.title
    assert len(hi_notice.itemized_purposes) >= 4
    assert any(p.purpose == ConsentPurpose.CARE_INTAKE for p in hi_notice.itemized_purposes)
    assert hi_notice.audio_notice_available is True

    # English notice
    en_notice = dpdp_manager.generate_notice(language="en")
    assert "Digital Health Data Consent" in en_notice.title
    assert "grievance" in en_notice.rights_summary["grievance_redressal"].lower()


def test_affirmative_consent_grant_and_signature():
    """Verify affirmative consent creates a tamper-evident artifact with valid cryptographic signature."""
    session_id = str(uuid.uuid4())
    req = ConsentArtifactCreate(
        session_id=session_id,
        patient_id="PAT-101",
        abha_id="91-4582-7391-0428",
        granted_purposes=[ConsentPurpose.CARE_INTAKE, ConsentPurpose.DOCTOR_CONSULTATION],
        language="hi",
        method=ConsentMethod.TOUCH
    )
    artifact = dpdp_manager.capture_consent(req)

    assert artifact.session_id == session_id
    assert artifact.is_active is True
    assert len(artifact.sha256_signature) == 64  # Valid SHA-256 hex string

    # Verify validity
    verification = dpdp_manager.verify_consent(session_id, required_purpose=ConsentPurpose.CARE_INTAKE)
    assert verification.is_valid is True
    assert len(verification.reasons) == 0


def test_consent_scope_enforcement():
    """Verify consent verification fails if a requested clinical purpose was not granted."""
    session_id = str(uuid.uuid4())
    req = ConsentArtifactCreate(
        session_id=session_id,
        granted_purposes=[ConsentPurpose.CARE_INTAKE]  # ABDM_LINK not granted
    )
    dpdp_manager.capture_consent(req)

    # Granted purpose passes
    assert dpdp_manager.verify_consent(session_id, ConsentPurpose.CARE_INTAKE).is_valid is True

    # Ungranted purpose fails
    res = dpdp_manager.verify_consent(session_id, ConsentPurpose.ABDM_LINK)
    assert res.is_valid is False
    assert any("not granted" in r for r in res.reasons)


def test_emergency_exception_override():
    """Verify Section 7(a) medical emergency deemed consent flags emergency justification."""
    session_id = str(uuid.uuid4())
    req = ConsentArtifactCreate(
        session_id=session_id,
        is_emergency_exception=True,
        emergency_justification="Patient unconscious with acute chest pain; emergency triage protocol initiated.",
        method=ConsentMethod.EMERGENCY_OVERRIDE
    )
    artifact = dpdp_manager.capture_consent(req)

    assert artifact.is_emergency_exception is True
    assert "chest pain" in artifact.emergency_justification

    # Emergency consent must still be active and verifiable
    assert dpdp_manager.verify_consent(session_id).is_valid is True


def test_consent_revocation_and_invalidation():
    """Verify that consent revocation immediately invalidates artifact and triggers purge."""
    session_id = str(uuid.uuid4())
    req = ConsentArtifactCreate(session_id=session_id)
    dpdp_manager.capture_consent(req)

    # Before revocation: valid
    assert dpdp_manager.verify_consent(session_id).is_valid is True

    # Revoke
    revoke_res = dpdp_manager.revoke_consent(
        ConsentRevokeRequest(session_id=session_id, reason="Patient walked out of OPD")
    )
    assert revoke_res.success is True
    assert revoke_res.memory_purged is True

    # After revocation: invalid
    check = dpdp_manager.verify_consent(session_id)
    assert check.is_valid is False
    assert any("revoked" in r.lower() for r in check.reasons)


def test_consent_artifact_data_erase_at_and_emergency_audit():
    """Verify dataEraseAt timestamp (default: 120 minutes) and audit_emergency.log append."""
    import os
    from module_d.config import settings
    from module_d.consent.voice_notice import generate_vernacular_audio_notice

    session_id = f"EMERG-TEST-{uuid.uuid4().hex[:6]}"
    req = ConsentArtifactCreate(
        session_id=session_id,
        is_emergency_exception=True,
        emergency_justification="Patient experiencing severe dyspnea and syncope in waiting room.",
        method=ConsentMethod.EMERGENCY_OVERRIDE
    )
    artifact = dpdp_manager.capture_consent(req)

    # 1. Check dataEraseAt is present
    assert artifact.dataEraseAt is not None
    assert artifact.dataEraseAt > artifact.created_at

    # 2. Check audit_emergency.log entry
    emergency_log_path = settings.AUDIT_LOG_FILE.parent / "audit_emergency.log"
    assert emergency_log_path.exists()
    with open(emergency_log_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert session_id in content
    assert "Section 7(a)" in content

    # 3. Check vernacular audio notice generation in Hindi, Bengali, Marathi, and English
    for lang in ["hi", "bn", "mr", "en"]:
        notice = generate_vernacular_audio_notice(language=lang)
        assert notice["language"] == lang
        assert len(notice["audio_script"]) > 20
        assert notice["data_fiduciary"] == settings.DATA_FIDUCIARY

