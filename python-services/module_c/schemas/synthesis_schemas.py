"""
Synthesis schemas for MediKiosk Module C.
Output data contracts for 8-part clinical draft, contradictions, Dashavidha Pariksha, and dual-coding.
"""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class ContradictionItem(BaseModel):
    conflict_id: str = Field(..., description="Unique conflict identifier")
    field: str = Field(..., description="Affected clinical field: Allergies, Medications, Diagnoses, Vitals")
    severity: str = Field(default="CRITICAL", description="'CRITICAL', 'HIGH', 'WARNING', 'INFO'")
    speech_claim: str = Field(..., description="Patient verbal assertion from Module A")
    document_claim: str = Field(..., description="Conflicting documented fact from Module B scan")
    doc_ref: Optional[str] = Field(default=None, description="Source physical document ID or scan name")
    bbox: Optional[List[int]] = Field(default=None, description="[x, y, w, h] coordinates in document crop")
    action_required: str = Field(default="Physician Adjudication Required", description="Guidance banner text")
    resolution_options: List[str] = Field(
        default_factory=lambda: ["Accept Scanned Document", "Accept Patient Verbal", "Add Clinical Note"],
        description="1-click adjudication choices"
    )
    resolved: bool = Field(default=False, description="Whether adjudicated by physician")
    selected_resolution: Optional[str] = Field(default=None, description="Clinician chosen resolution")


class Standard8PartSummary(BaseModel):
    chief_complaint: str = Field(..., description="1. Chief Complaint with standardized terminology and duration")
    hpi: str = Field(..., description="2. History of Present Illness (SOCRATES structured narrative)")
    past_medical_surgical: str = Field(..., description="3. Past Medical & Surgical tagged with provenance")
    drug_allergy_history: str = Field(..., description="4. Drug & Allergy History with compliance")
    family_history: str = Field(..., description="5. Family History (first-degree relatives)")
    personal_social: str = Field(..., description="6. Personal / Social History (diet, habits, occupation)")
    review_of_systems: str = Field(..., description="7. Review of Systems (targeted 12-system review)")
    prior_investigations: str = Field(..., description="8. Prior Investigations Summary with abnormal highlights")


class DashavidhaReport(BaseModel):
    prakriti_vikriti: str = Field(..., description="1. Prakriti (Baseline constitution) & Vikriti (Active doshic vitiation)")
    agni_koshtha: str = Field(..., description="2. Agni (Digestive fire) & Koshtha (Bowel motility)")
    bala_dhatu_sarata: str = Field(..., description="3. Bala (Physical/metabolic strength) & Dhatu Sarata (Tissue excellence)")
    ahara_vihara_shakti: str = Field(..., description="4. Ahara Shakti (Food intake) & Vihara Shakti (Circadian/lifestyle)")
    desha_kala_satmya: str = Field(..., description="5. Desha (Habitat), Kala (Seasonal influence), Satmya (Habituation)")
    dosha_scores: Dict[str, float] = Field(default_factory=dict, description="Vata, Pitta, Kapha distribution scores")
    recommendations: List[str] = Field(default_factory=list, description="Classical Ayurvedic dietary & lifestyle guidance")


class DualCodingEntry(BaseModel):
    finding_text: str = Field(..., description="Clinical finding, symptom, or provisional condition")
    namaste_code: Optional[str] = Field(default=None, description="Ministry of Ayush NAMASTE code, e.g. AYU-DG-0142")
    namaste_display: Optional[str] = Field(default=None, description="NAMASTE terminology label")
    who_tm2_code: Optional[str] = Field(default=None, description="WHO ICD-11 Traditional Medicine Module 2 code, e.g. TM2-SD-8812")
    who_tm2_display: Optional[str] = Field(default=None, description="WHO TM2 Chapter 26 description")
    snomed_code: Optional[str] = Field(default=None, description="SNOMED CT Concept ID, e.g. 196727004")
    snomed_display: Optional[str] = Field(default=None, description="SNOMED CT term")
    icd11_mms_code: Optional[str] = Field(default=None, description="Modern ICD-11 MMS code, e.g. MD90.0")


class PatientAudioView(BaseModel):
    language: str = Field(default="hi-IN", description="Target regional language code")
    script: str = Field(..., description="Colloquial plain-language confirmation script for Bhashini/TTS")
    consent_token: Optional[str] = Field(default=None, description="Cryptographic SHA-256 consent token under DPDP Act 2023")


class ClinicalSynthesisResponse(BaseModel):
    success: bool = True
    encounter_id: str
    status: str = Field(default="DRAFT_UNVERIFIED", description="DRAFT_UNVERIFIED until signed off by physician")
    clinician_view: Dict[str, Any] = Field(default_factory=dict, description="Flat key-value dictionary for UI rendering")
    standard_8_part: Standard8PartSummary
    ayush_dashavidha: Optional[DashavidhaReport] = None
    contradictions: List[ContradictionItem] = Field(default_factory=list)
    dual_codings: List[DualCodingEntry] = Field(default_factory=list)
    patient_audio_view: PatientAudioView
    fhir_bundle: Optional[Dict[str, Any]] = None
