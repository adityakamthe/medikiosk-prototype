"""
Ingestion schemas for MediKiosk Module C.
Captures structured data streamed from Module A (vocal dialogue) and Module B (document OCR).
"""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class ChiefComplaint(BaseModel):
    verbatim: str = Field(..., description="Verbatim patient statement, e.g. 'pet me tez dard hai'")
    normalized: str = Field(..., description="Standard medical normalized label, e.g. 'Acute Epigastric Pain'")
    duration: str = Field(..., description="Duration string, e.g. '3 days'")
    source: str = Field("speech", description="Source modality: 'speech' or 'document'")
    confidence: float = Field(0.95, description="Extraction confidence score")


class SocratesHPI(BaseModel):
    site: str = Field("Unknown", description="Anatomical location of symptom")
    onset: str = Field("Unknown", description="Mode of onset: sudden, gradual")
    character: str = Field("Unknown", description="Quality of pain: throbbing, dull, sharp, burning")
    radiation: str = Field("None", description="Radiation to other anatomical regions")
    associations: List[str] = Field(default_factory=list, description="Associated symptoms, e.g. nausea, fever")
    timing: str = Field("Unknown", description="Pattern over time: constant, intermittent")
    exacerbating_relieving: str = Field("Unknown", description="Aggravating or alleviating factors")
    severity: str = Field("Unknown", description="Severity on 1-10 numerical scale or qualitative")


class MedicalItem(BaseModel):
    condition: str = Field(..., description="Disease, past diagnosis or surgery name")
    source: str = Field("patient", description="'patient' (reported) or 'document' (corroborated)")
    diagnosed_year: Optional[int] = Field(None, description="Year of diagnosis if known")
    doc_ref: Optional[str] = Field(None, description="Reference ID or filename of scanned document")
    bbox: Optional[List[int]] = Field(None, description="[x, y, w, h] bounding box in source document")


class ReportedAllergy(BaseModel):
    allergen: str = Field(..., description="Drug or substance name, or 'No known drug allergies'")
    reaction: Optional[str] = Field(None, description="Clinical manifestation: rash, anaphylaxis, etc.")
    source: str = Field("speech", description="'speech' or 'document'")
    doc_ref: Optional[str] = Field(None, description="Document reference if extracted from OCR")
    bbox: Optional[List[int]] = Field(None, description="Bounding box if from document")


class CurrentMedicationItem(BaseModel):
    name: str = Field(..., description="Brand or generic medication name")
    dose: Optional[str] = Field(None, description="Strength, e.g. '500mg'")
    frequency: Optional[str] = Field(None, description="Frequency or sig, e.g. '1-0-1'")
    source: str = Field("document", description="'speech' or 'document'")
    compliance: Optional[str] = Field("Regular", description="Patient-reported adherence")
    status: Optional[str] = Field("Active", description="'Active', 'Discontinued', 'PRN'")
    doc_ref: Optional[str] = Field(None, description="Document reference if from OCR")
    bbox: Optional[List[int]] = Field(None, description="Bounding box if from document")


class PriorInvestigationItem(BaseModel):
    test_name: str = Field(..., description="Laboratory test or imaging procedure")
    result_value: str = Field(..., description="Measured analyte value or qualitative impression")
    unit: Optional[str] = Field(None, description="Measurement unit, e.g. 'g/dL', 'mg/dL'")
    reference_range: Optional[str] = Field(None, description="Normal physiological interval")
    status: str = Field("NORMAL", description="'NORMAL', 'ABNORMAL', 'CRITICAL_PANIC'")
    doc_ref: Optional[str] = Field(None, description="Document reference")
    bbox: Optional[List[int]] = Field(None, description="Bounding box")


from typing import Union
from pydantic import model_validator


class PatientMeta(BaseModel):
    patient_id: Optional[str] = Field(None, description="Hospital queue or registration ID")
    name: str = Field("Anonymous Patient", description="Patient full name")
    age: Optional[Union[str, int]] = Field(None, description="Age in years")
    gender: Optional[str] = Field(None, description="Gender: male, female, other")
    abha_id: Optional[str] = Field(None, description="Ayushman Bharat Health Account ID")
    preferred_language: str = Field("hi", description="Language code: hi, en, bn, mr, ta, te, etc.")
    language: Optional[str] = Field(None, description="Alias for preferred_language")
    clinical_mode: str = Field("allopathy", description="'allopathy' or 'ayurveda'")

    @model_validator(mode="before")
    @classmethod
    def normalize_meta(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "language" in data and "preferred_language" not in data:
                data["preferred_language"] = data["language"]
            if "age" in data and data["age"] is not None:
                data["age"] = str(data["age"])
        return data


class PatientRecordPayload(BaseModel):
    encounter_id: Optional[str] = Field(None, description="Unique intake encounter ID")
    session_id: Optional[str] = Field(None, description="Alias for encounter ID")
    patient_meta: PatientMeta = Field(default_factory=PatientMeta)
    chief_complaint: Optional[Union[ChiefComplaint, str]] = None
    socrates_hpi: SocratesHPI = Field(default_factory=SocratesHPI)
    past_history: List[MedicalItem] = Field(default_factory=list)
    reported_allergies: List[ReportedAllergy] = Field(default_factory=list)
    current_medications: List[CurrentMedicationItem] = Field(default_factory=list)
    family_history: List[Dict[str, Any]] = Field(default_factory=list)
    personal_social: Dict[str, Any] = Field(default_factory=dict)
    review_of_systems: Dict[str, Any] = Field(default_factory=dict)
    prior_investigations: List[PriorInvestigationItem] = Field(default_factory=list)
    ayush_dashavidha: Optional[Dict[str, Any]] = Field(None, description="Raw Ayurvedic responses if available")
    spoken_history: Optional[List[Dict[str, Any]]] = Field(None, description="Raw Module A speech turns")
    extracted_entities: Optional[List[Dict[str, Any]]] = Field(None, description="Raw Module B extracted entities")

    @model_validator(mode="before")
    @classmethod
    def populate_and_normalize(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data

        # Unify encounter_id & session_id
        enc_id = data.get("encounter_id") or data.get("session_id") or "sess-intake-default"
        data["encounter_id"] = enc_id
        data["session_id"] = enc_id

        # Normalize chief_complaint if string
        cc = data.get("chief_complaint")
        if isinstance(cc, str):
            data["chief_complaint"] = {
                "verbatim": cc,
                "normalized": cc,
                "duration": "Active",
                "source": "speech",
                "confidence": 0.95
            }
        elif cc is None:
            # Try to find in spoken_history
            hist = data.get("spoken_history") or []
            cc_found = next((h.get("value") for h in hist if h.get("section") == "chief_complaint"), None)
            if cc_found:
                data["chief_complaint"] = {
                    "verbatim": cc_found,
                    "normalized": cc_found,
                    "duration": "Active",
                    "source": "speech",
                    "confidence": 0.95
                }
            else:
                data["chief_complaint"] = {
                    "verbatim": "General Health Assessment",
                    "normalized": "Outpatient Consultation",
                    "duration": "Acute",
                    "source": "speech",
                    "confidence": 0.90
                }

        # Auto-populate reported_allergies from spoken_history if empty
        if not data.get("reported_allergies") and data.get("spoken_history"):
            allergies = []
            for h in data.get("spoken_history", []):
                sec = (h.get("section") or "").lower()
                field = (h.get("field_name") or "").lower()
                val = h.get("value") or ""
                if "allerg" in sec or "allerg" in field:
                    allergies.append({"allergen": val, "source": "speech"})
            if allergies:
                data["reported_allergies"] = allergies

        # Auto-populate current_medications from speech & documents if empty
        if not data.get("current_medications"):
            meds = []
            for h in data.get("spoken_history", []):
                sec = (h.get("section") or "").lower()
                field = (h.get("field_name") or "").lower()
                val = h.get("value") or ""
                if "med" in sec or "med" in field or "drug" in field:
                    meds.append({"name": val, "source": "speech"})

            for e in data.get("extracted_entities", []):
                if e.get("entity_type") == "medication":
                    meds.append({
                        "name": e.get("name") or e.get("raw_text") or "Unknown Medication",
                        "dose": e.get("dosage") or (e.get("fields") or {}).get("dosage"),
                        "frequency": e.get("frequency") or (e.get("fields") or {}).get("frequency"),
                        "source": "document",
                        "doc_ref": e.get("source_document_id") or "DOC-01",
                        "bbox": e.get("bounding_box") or [100, 150, 200, 40]
                    })
            if meds:
                data["current_medications"] = meds

        # Auto-populate prior_investigations from extracted_entities if empty
        if not data.get("prior_investigations") and data.get("extracted_entities"):
            labs = []
            for e in data.get("extracted_entities", []):
                if e.get("entity_type") == "lab_result":
                    labs.append({
                        "test_name": e.get("name") or e.get("raw_text") or "Lab Test",
                        "result_value": str(e.get("numeric_value") or (e.get("fields") or {}).get("value") or "Normal"),
                        "unit": e.get("unit") or (e.get("fields") or {}).get("unit"),
                        "status": "NORMAL"
                    })
            if labs:
                data["prior_investigations"] = labs

        # Auto-populate past_history from spoken_history if empty
        if not data.get("past_history") and data.get("spoken_history"):
            past = []
            for h in data.get("spoken_history", []):
                sec = (h.get("section") or "").lower()
                field = (h.get("field_name") or "").lower()
                val = h.get("value") or ""
                if "past" in sec or "chronic" in field or "disease" in field:
                    past.append({"condition": val, "source": "patient"})
            if past:
                data["past_history"] = past

        return data
