"""
DPDP Act 2023 Consent Artifact Schemas for MediKiosk Module D.
Standard Version: DPDP v5.0 Itemized Affirmative Action.
"""

import uuid
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


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
    data_elements: list[ConsentDataElement]
    retention: RetentionPolicy = RetentionPolicy.EPHEMERAL_POST_INGESTION
    is_mandatory: bool = False
    default_granted: bool = True


class ConsentNoticeRequest(BaseModel):
    language: str = Field(default="hi", description="BCP-47 language code e.g. hi, en, mr, ta")
    patient_id: str | None = None


class ConsentNoticeResponse(BaseModel):
    notice_version: str = "v5.0"
    data_fiduciary: str
    grievance_officer: str
    contact: str
    language: str
    title: str
    body: str
    itemized_purposes: list[ItemizedPurposeDetail]
    rights_summary: dict[str, str]
    audio_notice_available: bool = True
    notice_timestamp: str


class ConsentArtifactCreate(BaseModel):
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str | None = None
    abha_id: str | None = None
    granted_purposes: list[ConsentPurpose] = Field(
        default=[ConsentPurpose.CARE_INTAKE, ConsentPurpose.DOCTOR_CONSULTATION, ConsentPurpose.DOCUMENT_DIGITIZATION]
    )
    language: str = "hi"
    method: ConsentMethod = ConsentMethod.TOUCH
    is_guardian_consent: bool = False
    guardian_name: str | None = None
    guardian_relationship: str | None = None
    is_emergency_exception: bool = False  # DPDP Act Section 7(a)
    emergency_justification: str | None = None
    ip_address: str | None = "127.0.0.1"
    device_fingerprint: str | None = "medikiosk-hardware-kiosk-01"


class ConsentArtifact(BaseModel):
    artifact_id: str
    session_id: str
    patient_id: str | None
    abha_id: str | None
    notice_version: str
    granted_purposes: list[ConsentPurpose]
    language: str
    method: ConsentMethod
    is_guardian_consent: bool
    guardian_name: str | None
    guardian_relationship: str | None
    is_emergency_exception: bool
    emergency_justification: str | None
    created_at: str
    expires_at: str
    dataEraseAt: str | None = None  # DPDP v5.0 erase timestamp (default: 120 minutes)
    is_active: bool = True
    revoked_at: str | None = None
    revocation_reason: str | None = None
    sha256_signature: str


class ConsentVerifyResponse(BaseModel):
    is_valid: bool
    artifact: ConsentArtifact | None = None
    reasons: list[str] = []


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
    details: dict[str, Any]
    prev_checksum: str | None = None
    checksum: str
