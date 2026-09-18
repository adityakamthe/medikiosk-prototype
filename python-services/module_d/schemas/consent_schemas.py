"""
DPDP Act 2023 Consent Artifact Schemas for MediKiosk Module D.
Standard Version: DPDP v5.0 Itemized Affirmative Action.
"""

from enum import Enum
from typing import List, Dict, Optional, Any
from datetime import datetime, timezone
from pydantic import BaseModel, Field
import uuid


class ConsentPurpose(str, Enum):
    CARE_INTAKE = "CARE_INTAKE"
    DOCTOR_CONSULTATION = "DOCTOR_CONSULTATION"
    EMERGENCY_TRIAGE = "EMERGENCY_TRIAGE"
    ABDM_LINK = "ABDM_LINK"
    DOCUMENT_DIGITIZATION = "DOCUMENT_DIGITIZATION"


class ConsentDataElement(str, Enum):
    DEMOGRAPHICS = "DEMOGRAPHICS"
    CHIEF_COMPLAINTS = "CHIEF_COMPLAINTS"
    VITALS = "VITALS"
    PAST_HISTORY = "PAST_HISTORY"
    ALLERGIES = "ALLERGIES"
    FAMILY_HISTORY = "FAMILY_HISTORY"
    SCANNED_PRESCRIPTIONS = "SCANNED_PRESCRIPTIONS"


class RetentionPolicy(str, Enum):
    EPHEMERAL_POST_INGESTION = "EPHEMERAL_POST_INGESTION"  # 0 bytes retained on kiosk once ingested into HIS
    STATUTORY_HOSPITAL_ARCHIVE = "STATUTORY_HOSPITAL_ARCHIVE"


class ConsentMethod(str, Enum):
    TOUCH = "TOUCH"
    VOICE = "VOICE"
    ASSISTED = "ASSISTED"
    EMERGENCY_OVERRIDE = "EMERGENCY_OVERRIDE"


class ItemizedPurposeDetail(BaseModel):
    purpose: ConsentPurpose
    title: str
    description: str
    data_elements: List[ConsentDataElement]
    retention: RetentionPolicy = RetentionPolicy.EPHEMERAL_POST_INGESTION
    is_mandatory: bool = False
    default_granted: bool = True


class ConsentNoticeRequest(BaseModel):
    language: str = Field(default="hi", description="BCP-47 language code e.g. hi, en, mr, ta")
    patient_id: Optional[str] = None


class ConsentNoticeResponse(BaseModel):
    notice_version: str = "v5.0"
    data_fiduciary: str
    grievance_officer: str
    contact: str
    language: str
    title: str
    body: str
    itemized_purposes: List[ItemizedPurposeDetail]
    rights_summary: Dict[str, str]
    audio_notice_available: bool = True
    notice_timestamp: str


class ConsentArtifactCreate(BaseModel):
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: Optional[str] = None
    abha_id: Optional[str] = None
    granted_purposes: List[ConsentPurpose] = Field(
        default=[ConsentPurpose.CARE_INTAKE, ConsentPurpose.DOCTOR_CONSULTATION, ConsentPurpose.DOCUMENT_DIGITIZATION]
    )
    language: str = "hi"
    method: ConsentMethod = ConsentMethod.TOUCH
    is_guardian_consent: bool = False
    guardian_name: Optional[str] = None
    guardian_relationship: Optional[str] = None
    is_emergency_exception: bool = False  # DPDP Act Section 7(a)
    emergency_justification: Optional[str] = None
    ip_address: Optional[str] = "127.0.0.1"
    device_fingerprint: Optional[str] = "medikiosk-hardware-kiosk-01"


class ConsentArtifact(BaseModel):
    artifact_id: str
    session_id: str
    patient_id: Optional[str]
    abha_id: Optional[str]
    notice_version: str
    granted_purposes: List[ConsentPurpose]
    language: str
    method: ConsentMethod
    is_guardian_consent: bool
    guardian_name: Optional[str]
    guardian_relationship: Optional[str]
    is_emergency_exception: bool
    emergency_justification: Optional[str]
    created_at: str
    expires_at: str
    dataEraseAt: Optional[str] = None  # DPDP v5.0 erase timestamp (default: 120 minutes)
    is_active: bool = True
    revoked_at: Optional[str] = None
    revocation_reason: Optional[str] = None
    sha256_signature: str


class ConsentVerifyResponse(BaseModel):
    is_valid: bool
    artifact: Optional[ConsentArtifact] = None
    reasons: List[str] = []


class ConsentRevokeRequest(BaseModel):
    session_id: str
    reason: str = "Patient withdrawn consent at kiosk or reception"
    revoked_by: str = "PATIENT"  # PATIENT or GUARDIAN or CLINICIAN


class ConsentRevokeResponse(BaseModel):
    success: bool
    session_id: str
    revoked_at: str
    memory_purged: bool
    audit_id: str
    message: str


class ConsentAuditEntry(BaseModel):
    audit_id: str
    timestamp: str
    session_id: str
    action: str  # NOTICE_ISSUED, CONSENT_GRANTED, CONSENT_REVOKED, EMERGENCY_OVERRIDE, MEMORY_PURGED
    actor: str
    details: Dict[str, Any]
    prev_checksum: Optional[str] = None
    checksum: str
