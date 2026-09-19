"""
Intake schemas for raw document OCR, line segmentation, and VLM extraction.
"""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class BoundingBox(BaseModel):
    x: int = Field(..., description="Top-left X coordinate")
    y: int = Field(..., description="Top-left Y coordinate")
    width: int = Field(..., description="Box width in pixels")
    height: int = Field(..., description="Box height in pixels")


class RawPrescriptionLine(BaseModel):
    line_index: int
    bbox: BoundingBox
    raw_text: Optional[str] = None
    confidence: float = 0.90
    crop_shape: Optional[Dict[str, int]] = None
    crop_base64: Optional[str] = None


class ExtractedMedication(BaseModel):
    name: str = Field(..., description="Drug brand or generic name as deciphered by VLM")
    dose: Optional[str] = Field(None, description="Strength or dosage, e.g. 500mg, 40mg")
    frequency: Optional[str] = Field(None, description="Frequency or sig instruction, e.g. 1+0+1, OD, BD")
    duration: Optional[str] = Field(None, description="Duration of treatment, e.g. 5 days, 1 month")
    route: Optional[str] = Field("Oral", description="Administration route, e.g. Oral, Topical, IV")
    confidence: float = Field(0.90, description="VLM extraction confidence score")
    raw_text: Optional[str] = Field(None, description="Raw transcription fragment")


class ExtractedLabResult(BaseModel):
    name: str = Field(..., description="Analyte name, e.g. Hemoglobin, Fasting Blood Sugar")
    raw_value: str = Field(..., description="Raw text value from report, e.g. 6.8, >140")
    parsed_value: Optional[float] = Field(None, description="Parsed numeric value")
    qualifier: Optional[str] = Field(None, description="Qualifier like >, <, >=")
    unit: Optional[str] = Field(None, description="Analyte measurement unit, e.g. g/dL, mg/dL")
    reference_range: Optional[str] = Field(None, description="Reported reference interval")
    confidence: float = Field(0.90, description="VLM extraction confidence score")


class DocumentMetadata(BaseModel):
    session_id: Optional[str] = Field(None, description="Intake session UUID")
    document_type: str = Field("prescription", description="prescription, lab_report, or discharge_summary")
    document_date: Optional[str] = Field(None, description="Extracted date in YYYY-MM-DD or Indian format")
    doctor_or_hospital: Optional[str] = Field(None, description="Doctor or clinic name")
    patient_name: Optional[str] = Field(None, description="Patient name if printed")
    patient_age: Optional[str] = Field(None, description="Patient age")
    patient_gender: Optional[str] = Field(None, description="Patient gender")
    abha_id: Optional[str] = Field(None, description="Patient ABHA ID")
    verbal_transcription: Optional[str] = Field(None, description="Audio chief complaint transcription from Module A")


class DocumentIntakePayload(BaseModel):
    image_base64: Optional[str] = Field(None, description="Base64 encoded JPEG or PNG image")
    session_id: Optional[str] = Field(None, description="MediKiosk intake session UUID")
    verbal_context: Optional[str] = Field(None, description="Patient verbal chief complaint from Module A")
    apply_dewarp: bool = True
    apply_shadow_removal: bool = True
    apply_ink_isolation: bool = False
    extract_lines: bool = True
    metadata: Optional[DocumentMetadata] = None
    medications: List[ExtractedMedication] = []
    labs: List[ExtractedLabResult] = []


class ConstrainedMedicationExtraction(BaseModel):
    """Constrained schema for individual medication extraction with explicit structural fields."""
    drug_candidate: str = Field(..., description="Transcribed brand or generic name as deciphered")
    dosage_form: Optional[str] = Field(None, description="Dosage form e.g. Tab, Cap, Syr, Inj, Oint")
    strength: Optional[str] = Field(None, description="Strength or concentration e.g. 500mg, 650mg, 50mcg")
    frequency: Optional[str] = Field(None, description="Frequency or sig instruction e.g. 1-0-1, OD, BD, TDS")
    duration: Optional[str] = Field(None, description="Duration of treatment e.g. 5 days, 3/7, 1/52")
    raw_sig: Optional[str] = Field(None, description="Raw transcription instruction fragment")
    confidence_self_assessment: Optional[float] = Field(0.85, ge=0.0, le=1.0, description="Self-reported model confidence")


class ConstrainedPrescriptionExtraction(BaseModel):
    """Constrained schema for whole prescription extraction enforcing strict output format."""
    medications: List[ConstrainedMedicationExtraction] = Field(default_factory=list)
    is_rx_symbol_present: bool = Field(True, description="Whether Rx symbol was identified")
    doctor_notes: Optional[str] = Field(None, description="Clinical notes or remarks")
    validation_error: Optional[str] = Field(None, description="Validation error message if schema parsing was corrected")
    schema_retry_attempted: bool = Field(False, description="Whether schema format retry was executed")

