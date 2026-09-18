"""
HIS (Hospital Information System) & OpenMRS / FHIR Reconciliation Schemas.
"""

from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field
import uuid


class OpenMRSPatientPayload(BaseModel):
    given_name: str
    family_name: Optional[str] = "Patient"
    gender: str  # M or F or O
    birthdate: str  # YYYY-MM-DD
    age: Optional[int] = None
    identifier: str  # ABHA ID or MediKiosk Queue ID
    identifier_type_uuid: Optional[str] = "8d79403a-c2cc-11de-8d13-0010c6dffd0f"  # OpenMRS default ID type
    location_uuid: Optional[str] = "8d6c3e12-c2cc-11de-8d13-0010c6dffd0f"
    address: Optional[Dict[str, str]] = None


class OpenMRSVisitPayload(BaseModel):
    patient_uuid: str
    visit_type_uuid: str = "7b0f5697-27e3-40c4-8bae-f4049abfb4ed"  # OPD Visit
    location_uuid: str = "8d6c3e12-c2cc-11de-8d13-0010c6dffd0f"
    start_datetime: Optional[str] = None


class OpenMRSEncounterPayload(BaseModel):
    patient_uuid: str
    visit_uuid: str
    encounter_type_uuid: str = "d7151276-2434-4faa-ab86-2b6d4d8d4dc8"  # Consultation Encounter
    encounter_datetime: Optional[str] = None
    provider_uuid: Optional[str] = "c1c44249-2438-4541-9457-418f77341ad6"
    observations: List[Dict[str, Any]] = []


class FHIRBundlePushRequest(BaseModel):
    session_id: str
    idempotency_key: str = Field(default_factory=lambda: str(uuid.uuid4()))
    bundle: Dict[str, Any] = Field(..., description="NRCeS-compliant HL7 FHIR R4 Document Bundle")
    target_system: str = Field(default="OPENMRS", description="OPENMRS or HAPI_FHIR or EMULATOR")
    clinician_id: Optional[str] = "Dr. Sharma"
    hospital_name: Optional[str] = "AIIMS New Delhi"


class FHIRBundlePushResponse(BaseModel):
    status: str  # SUCCESS, DUPLICATE_SUBMISSION, VALIDATION_FAILED, ERROR
    message: str
    idempotency_key: str
    is_duplicate: bool = False
    validation_passed: bool
    validation_issues: List[str] = []
    remote_fhir_id: Optional[str] = None
    openmrs_encounter_uuid: Optional[str] = None
    http_status: int
    target_endpoint: str
    timestamp: str
