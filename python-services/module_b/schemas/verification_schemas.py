"""
Verification schemas for clinical safety, alert tiers, action gates, and report contracts.
"""
from enum import Enum
from typing import Any

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
    brand_name: str | None = None
    generic_name: str | None = None
    active_ingredients: list[dict[str, str]] = []
    dose: str | None = None
    frequency: str | None = None
    standardized_sig: str | None = None
    duration: str | None = None
    category: str | None = None
    rxcui: str | None = None
    requires_ppi_warning: bool = False
    composite_score: float = 0.0
    action_gate: VerificationActionGate = VerificationActionGate.AUTO_APPROVED
    top_candidates: list[dict[str, Any]] = []
    candidates: list[dict[str, Any]] = []
    recognizer_outputs: dict[str, Any] | None = None
    verification_pass: str | None = "pass_3_closed_set"
    signal_breakdown: dict[str, float] | None = None
    raw_image_crop: str | None = None


class EvaluatedLabItem(BaseModel):
    test_name: str
    raw_test_query: str
    parsed_value: float | None = None
    raw_value: str
    unit: str | None = None
    status: str = "NORMAL"
    flag: SeverityTier = SeverityTier.NORMAL
    is_panic: bool = False
    alert_message: str | None = None
    reference_range: str | None = None
    loinc_code: str | None = None
    panel: str | None = None


class LongitudinalEpisode(BaseModel):
    episode_id: str
    title: str
    start_date: str
    end_date: str
    records: list[dict[str, Any]]


class VerificationReport(BaseModel):
    session_id: str | None = None
    document_type: str = "prescription"
    quality_assessment: str = "good"
    confidence_tier: str = "high"
    was_dewarped: bool = False
    sharpness_score: float = 0.0
    line_strips_detected: int = 0
    medications: list[NormalizedMedicationItem] = []
    labs: list[EvaluatedLabItem] = []
    alerts: list[ClinicalAlert] = []
    total_alerts: int = 0
    has_critical_alerts: bool = False
    gastroprotection_status: str = "NOT_APPLICABLE"
    episodes: list[LongitudinalEpisode] = []
    fhir_bundle: dict[str, Any] | None = None
