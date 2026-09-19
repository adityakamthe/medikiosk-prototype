"""
Verification schemas for clinical safety, alert tiers, action gates, and report contracts.
"""
from enum import Enum
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class SeverityTier(str, Enum):
    NORMAL = "NORMAL"
    WARNING = "WARNING"
    ABNORMAL = "ABNORMAL"
    CRITICAL_PANIC = "CRITICAL_PANIC"
    HIGH = "HIGH"
    INFO = "INFO"


class VerificationActionGate(str, Enum):
    AUTO_APPROVED = "AUTO_APPROVED"
    AMBIGUOUS_REQUIRES_CONFIRMATION = "AMBIGUOUS_REQUIRES_CONFIRMATION"
    MANUAL_REVIEW_REQUIRED = "MANUAL_REVIEW_REQUIRED"


class ClinicalAlert(BaseModel):
    type: str = Field(..., description="GASTROPROTECTION_OMISSION, THERAPEUTIC_DUPLICATION, DRUG_INTERACTION, DOSE_CEILING")
    severity: SeverityTier = Field(..., description="Alert clinical severity tier")
    title: str = Field(..., description="Human readable summary title")
    description: str = Field(..., description="Clinical mechanism and risk explanation")
    recommendation: str = Field(..., description="Actionable clinical guidance for the physician")


class NormalizedMedicationItem(BaseModel):
    name: str = Field(..., description="Prescribed raw name")
    brand_name: Optional[str] = None
    generic_name: Optional[str] = None
    active_ingredients: List[Dict[str, str]] = []
    dose: Optional[str] = None
    frequency: Optional[str] = None
    standardized_sig: Optional[str] = None
    duration: Optional[str] = None
    category: Optional[str] = None
    rxcui: Optional[str] = None
    requires_ppi_warning: bool = False
    composite_score: float = 0.0
    action_gate: VerificationActionGate = VerificationActionGate.AUTO_APPROVED
    top_candidates: List[Dict[str, Any]] = []
    candidates: List[Dict[str, Any]] = []
    recognizer_outputs: Optional[Dict[str, Any]] = None
    verification_pass: Optional[str] = "pass_3_closed_set"
    signal_breakdown: Optional[Dict[str, float]] = None
    raw_image_crop: Optional[str] = None


class EvaluatedLabItem(BaseModel):
    test_name: str
    raw_test_query: str
    parsed_value: Optional[float] = None
    raw_value: str
    unit: Optional[str] = None
    status: str = "NORMAL"
    flag: SeverityTier = SeverityTier.NORMAL
    is_panic: bool = False
    alert_message: Optional[str] = None
    reference_range: Optional[str] = None
    loinc_code: Optional[str] = None
    panel: Optional[str] = None


class LongitudinalEpisode(BaseModel):
    episode_id: str
    title: str
    start_date: str
    end_date: str
    records: List[Dict[str, Any]]


class VerificationReport(BaseModel):
    session_id: Optional[str] = None
    document_type: str = "prescription"
    quality_assessment: str = "good"
    confidence_tier: str = "high"
    was_dewarped: bool = False
    sharpness_score: float = 0.0
    line_strips_detected: int = 0
    medications: List[NormalizedMedicationItem] = []
    labs: List[EvaluatedLabItem] = []
    alerts: List[ClinicalAlert] = []
    total_alerts: int = 0
    has_critical_alerts: bool = False
    gastroprotection_status: str = "NOT_APPLICABLE"
    episodes: List[LongitudinalEpisode] = []
    fhir_bundle: Optional[Dict[str, Any]] = None
