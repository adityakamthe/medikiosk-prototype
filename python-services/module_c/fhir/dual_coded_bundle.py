"""
ABDM FHIR R4 Dual-Coded Document Bundle Builder for MediKiosk Module C.
Constructs valid Ayushman Bharat Digital Mission (ABDM) compliant FHIR R4 Document Bundles
incorporating dual-coded AYUSH + Modern Condition resources with full provenance.
"""
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import uuid

try:
    from ..schemas.synthesis_schemas import DualCodingEntry, Standard8PartSummary
    from ..schemas.ingestion_schemas import PatientMeta
except (ImportError, ValueError):
    from schemas.synthesis_schemas import DualCodingEntry, Standard8PartSummary
    from schemas.ingestion_schemas import PatientMeta


class DualCodedFHIRBuilder:
    """
    Constructs NRCeS / ABDM aligned FHIR R4 Document Bundles with dual-coded clinical conditions.
    """

    def build_bundle(
        self,
        encounter_id: str,
        patient_meta: PatientMeta,
        summary_8_part: Standard8PartSummary,
        dual_codings: List[DualCodingEntry],
        is_attested: bool = False,
        clinician_id: str = "Dr. Rajesh Verma (OPD-Physician)"
    ) -> Dict[str, Any]:
        """
        Builds a compliant FHIR R4 Document Bundle.
        """
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        bundle_uuid = str(uuid.uuid4())
        patient_uuid = f"urn:uuid:{uuid.uuid4()}"
        encounter_uuid = f"urn:uuid:{uuid.uuid4()}"
        composition_uuid = f"urn:uuid:{uuid.uuid4()}"

        entries: List[Dict[str, Any]] = []

        # 1. Patient Resource
        patient_identifiers = []
        if patient_meta.abha_id:
            patient_identifiers.append({
                "system": "https://healthid.ndhm.gov.in",
                "value": patient_meta.abha_id
            })
        patient_identifiers.append({
            "system": "https://medikiosk.local/queue-id",
            "value": patient_meta.patient_id or f"Q-{uuid.uuid4().hex[:6].upper()}"
        })

        gender_val = (patient_meta.gender or "other").lower()
        if gender_val not in ["male", "female", "other"]:
            gender_val = "other"

        patient_resource = {
            "resourceType": "Patient",
            "id": patient_uuid.replace("urn:uuid:", ""),
            "meta": {
                "profile": ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/Patient"]
            },
            "identifier": patient_identifiers,
            "name": [{"text": patient_meta.name or "Anonymous Patient"}],
            "gender": gender_val
        }
        entries.append({
            "fullUrl": patient_uuid,
            "resource": patient_resource
        })

        # 2. Encounter Resource
        encounter_resource = {
            "resourceType": "Encounter",
            "id": encounter_uuid.replace("urn:uuid:", ""),
            "meta": {
                "profile": ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/Encounter"]
            },
            "status": "finished" if is_attested else "in-progress",
            "class": {
                "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
                "code": "AMB",
                "display": "ambulatory"
            },
            "subject": {"reference": patient_uuid},
            "period": {"start": timestamp, "end": timestamp}
        }
        entries.append({
            "fullUrl": encounter_uuid,
            "resource": encounter_resource
        })

        # Section entries list for Composition
        section_entries: List[Dict[str, Any]] = []

        # 3. Dual-Coded Condition Resources
        for idx, dc in enumerate(dual_codings):
            cond_uuid = f"urn:uuid:{uuid.uuid4()}"
            section_entries.append({"reference": cond_uuid})

            codings = []
            # 3.1 NAMASTE Coding
            if dc.namaste_code:
                codings.append({
                    "system": "http://namstp.ayush.gov.in/fhir/CodeSystem/namaste",
                    "code": dc.namaste_code,
                    "display": dc.namaste_display or dc.finding_text
                })

            # 3.2 WHO ICD-11 TM2 Coding
            if dc.who_tm2_code:
                codings.append({
                    "system": "http://id.who.int/icd/release/11/mms",
                    "code": dc.who_tm2_code,
                    "display": dc.who_tm2_display or "WHO TM2 Chapter 26"
                })

            # 3.3 Modern Biomedicine SNOMED CT
            if dc.snomed_code:
                codings.append({
                    "system": "http://snomed.info/sct",
                    "code": dc.snomed_code,
                    "display": dc.snomed_display or dc.finding_text
                })

            condition_resource = {
                "resourceType": "Condition",
                "id": cond_uuid.replace("urn:uuid:", ""),
                "meta": {
                    "profile": ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/Condition"]
                },
                "clinicalStatus": {
                    "coding": [{
                        "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
                        "code": "active",
                        "display": "Active"
                    }]
                },
                "verificationStatus": {
                    "coding": [{
                        "system": "http://terminology.hl7.org/CodeSystem/condition-ver-status",
                        "code": "confirmed" if is_attested else "provisional",
                        "display": "Confirmed / Attested" if is_attested else "Provisional / Intake Draft"
                    }]
                },
                "category": [{
                    "coding": [{
                        "system": "http://terminology.hl7.org/CodeSystem/condition-category",
                        "code": "encounter-diagnosis",
                        "display": "Encounter Diagnosis"
                    }]
                }],
                "code": {
                    "coding": codings,
                    "text": dc.finding_text
                },
                "subject": {"reference": patient_uuid},
                "encounter": {"reference": encounter_uuid},
                "recordedDate": timestamp
            }
            entries.append({
                "fullUrl": cond_uuid,
                "resource": condition_resource
            })

        # 4. Composition Resource (Document Header)
        composition_resource = {
            "resourceType": "Composition",
            "id": composition_uuid.replace("urn:uuid:", ""),
            "meta": {
                "profile": ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/PrescriptionRecord"]
            },
            "status": "final" if is_attested else "preliminary",
            "type": {
                "coding": [
                    {
                        "system": "http://snomed.info/sct",
                        "code": "440545006",
                        "display": "Prescription and intake clinical note"
                    }
                ],
                "text": "MediKiosk Intake Case-Taking & Synthesis Record"
            },
            "subject": {"reference": patient_uuid},
            "encounter": {"reference": encounter_uuid},
            "date": timestamp,
            "author": [
                {
                    "display": f"{clinician_id} {'(Clinician Attested)' if is_attested else '(Draft / Unverified)'}"
                }
            ],
            "title": "MediKiosk Synthesized Intake & Clinical Summary",
            "section": [
                {
                    "title": "1. Chief Complaint",
                    "text": {"status": "generated", "div": f"<div xmlns=\"http://www.w3.org/1999/xhtml\">{summary_8_part.chief_complaint}</div>"}
                },
                {
                    "title": "2. History of Present Illness (HPI)",
                    "text": {"status": "generated", "div": f"<div xmlns=\"http://www.w3.org/1999/xhtml\">{summary_8_part.hpi}</div>"}
                },
                {
                    "title": "3. Past Medical & Surgical History",
                    "text": {"status": "generated", "div": f"<div xmlns=\"http://www.w3.org/1999/xhtml\">{summary_8_part.past_medical_surgical}</div>"}
                },
                {
                    "title": "4. Drug & Allergy History",
                    "text": {"status": "generated", "div": f"<div xmlns=\"http://www.w3.org/1999/xhtml\">{summary_8_part.drug_allergy_history}</div>"}
                },
                {
                    "title": "5. Family History",
                    "text": {"status": "generated", "div": f"<div xmlns=\"http://www.w3.org/1999/xhtml\">{summary_8_part.family_history}</div>"}
                },
                {
                    "title": "6. Personal & Social History",
                    "text": {"status": "generated", "div": f"<div xmlns=\"http://www.w3.org/1999/xhtml\">{summary_8_part.personal_social}</div>"}
                },
                {
                    "title": "7. Review of Systems",
                    "text": {"status": "generated", "div": f"<div xmlns=\"http://www.w3.org/1999/xhtml\">{summary_8_part.review_of_systems}</div>"}
                },
                {
                    "title": "8. Prior Investigations Summary",
                    "text": {"status": "generated", "div": f"<div xmlns=\"http://www.w3.org/1999/xhtml\">{summary_8_part.prior_investigations}</div>"}
                },
                {
                    "title": "Dual-Coded Diagnostic Formulations (NAMASTE + WHO TM2)",
                    "entry": section_entries
                }
            ]
        }

        # Put Composition at index 0 as per FHIR Document specification
        entries.insert(0, {
            "fullUrl": composition_uuid,
            "resource": composition_resource
        })

        return {
            "resourceType": "Bundle",
            "id": f"bundle-{bundle_uuid}",
            "meta": {
                "versionId": "1",
                "lastUpdated": timestamp,
                "profile": ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/DocumentBundle"]
            },
            "identifier": {
                "system": "https://medikiosk.in/fhir/bundles",
                "value": f"MKC-{encounter_id or bundle_uuid[:8].upper()}"
            },
            "type": "document",
            "timestamp": timestamp,
            "entry": entries
        }


# Singleton instance
dual_coded_fhir_builder = DualCodedFHIRBuilder()
