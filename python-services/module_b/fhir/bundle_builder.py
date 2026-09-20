"""
ABDM FHIR R4 Bundle Builder for MediKiosk Module B.
Constructs valid Ayushman Bharat Digital Mission (ABDM) compliant FHIR R4 document bundles
containing Patient, Encounter, Composition, MedicationRequest, and Observation resources.
"""
import uuid
from datetime import datetime, timezone
from typing import Any

try:
    from module_b.schemas.verification_schemas import (
        EvaluatedLabItem,
        NormalizedMedicationItem,
    )
except (ImportError, ValueError):
    try:
        from ..schemas.verification_schemas import (  # type: ignore[no-redef]
            EvaluatedLabItem,
            NormalizedMedicationItem,
        )
    except (ImportError, ValueError):
        from schemas.verification_schemas import (  # type: ignore[no-redef]
            EvaluatedLabItem,
            NormalizedMedicationItem,
        )


class FHIRBundleBuilder:
    """
    Constructs NRCeS / ABDM aligned FHIR R4 Document Bundles from verified Module B clinical outputs.
    """

    def build_bundle(
        self,
        session_id: str | None = None,
        patient_name: str = "Anonymous Patient",
        abha_id: str | None = None,
        gender: str = "unknown",
        medications: list[NormalizedMedicationItem] | None = None,
        labs: list[EvaluatedLabItem] | None = None,
        organization_name: str = "MediKiosk Primary Health Centre"
    ) -> dict[str, Any]:
        """
        Builds a compliant FHIR R4 Document Bundle.
        """
        medications = medications or []
        labs = labs or []

        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        bundle_uuid = str(uuid.uuid4())
        patient_uuid = f"urn:uuid:{uuid.uuid4()}"
        encounter_uuid = f"urn:uuid:{uuid.uuid4()}"
        composition_uuid = f"urn:uuid:{uuid.uuid4()}"

        entries: list[dict[str, Any]] = []

        # 1. Patient Resource
        patient_identifiers = []
        if abha_id:
            patient_identifiers.append({
                "system": "https://healthid.ndhm.gov.in",
                "value": abha_id
            })
        patient_identifiers.append({
            "system": "https://medikiosk.local/patient-id",
            "value": session_id or f"P-{uuid.uuid4().hex[:8].upper()}"
        })

        patient_resource = {
            "resourceType": "Patient",
            "id": patient_uuid.replace("urn:uuid:", ""),
            "meta": {
                "profile": ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/Patient"]
            },
            "identifier": patient_identifiers,
            "name": [{"text": patient_name}],
            "gender": gender.lower() if gender in ["male", "female", "other"] else "unknown"
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
            "status": "finished",
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

        # Section references for Composition
        section_entries = []

        # 3. MedicationRequest Resources
        for idx, med in enumerate(medications):
            med_uuid = f"urn:uuid:{uuid.uuid4()}"
            section_entries.append({"reference": med_uuid})

            coding_list = []
            if med.rxcui:
                coding_list.append({
                    "system": "http://www.nlm.nih.gov/research/umls/rxnorm",
                    "code": str(med.rxcui),
                    "display": med.generic_name or med.brand_name or med.name
                })
            else:
                coding_list.append({
                    "system": "https://cdsco.gov.in/registry",
                    "code": f"CDSCO-{uuid.uuid4().hex[:6].upper()}",
                    "display": med.brand_name or med.name
                })

            med_request_resource = {
                "resourceType": "MedicationRequest",
                "id": med_uuid.replace("urn:uuid:", ""),
                "meta": {
                    "profile": ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/MedicationRequest"]
                },
                "status": "active",
                "intent": "order",
                "subject": {"reference": patient_uuid},
                "encounter": {"reference": encounter_uuid},
                "authoredOn": timestamp,
                "medicationCodeableConcept": {
                    "coding": coding_list,
                    "text": f"{med.name} {med.dose or ''}".strip()
                },
                "dosageInstruction": [
                    {
                        "text": med.standardized_sig or med.frequency or "As directed by physician",
                        "timing": {
                            "code": {
                                "text": med.frequency or "Daily"
                            }
                        }
                    }
                ]
            }

            entries.append({
                "fullUrl": med_uuid,
                "resource": med_request_resource
            })

        # 4. Observation Resources (Lab Analytes)
        for idx, lab in enumerate(labs):
            obs_uuid = f"urn:uuid:{uuid.uuid4()}"
            section_entries.append({"reference": obs_uuid})

            loinc_code = lab.loinc_code or "30954-2"
            obs_resource: dict[str, Any] = {
                "resourceType": "Observation",
                "id": obs_uuid.replace("urn:uuid:", ""),
                "meta": {
                    "profile": ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/Observation"]
                },
                "status": "final",
                "code": {
                    "coding": [
                        {
                            "system": "http://loinc.org",
                            "code": loinc_code,
                            "display": lab.test_name
                        }
                    ],
                    "text": lab.test_name
                },
                "subject": {"reference": patient_uuid},
                "encounter": {"reference": encounter_uuid},
                "effectiveDateTime": timestamp
            }

            if lab.parsed_value is not None:
                obs_resource["valueQuantity"] = {
                    "value": float(lab.parsed_value),
                    "unit": lab.unit or "",
                    "system": "http://unitsofmeasure.org"
                }
            else:
                obs_resource["valueString"] = str(lab.raw_value)

            # Interpretation
            interpretation_code = "N"
            interpretation_display = "Normal"
            if lab.is_panic:
                interpretation_code = "AA"
                interpretation_display = "Critical abnormal"
            elif lab.flag and lab.flag.value == "ABNORMAL":
                interpretation_code = "A"
                interpretation_display = "Abnormal"

            obs_resource["interpretation"] = [
                {
                    "coding": [
                        {
                            "system": "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
                            "code": interpretation_code,
                            "display": interpretation_display
                        }
                    ],
                    "text": lab.status
                }
            ]

            if lab.reference_range:
                obs_resource["referenceRange"] = [
                    {"text": lab.reference_range}
                ]

            entries.append({
                "fullUrl": obs_uuid,
                "resource": obs_resource
            })

        # 5. Composition Resource (Document Header)
        composition_resource = {
            "resourceType": "Composition",
            "id": composition_uuid.replace("urn:uuid:", ""),
            "meta": {
                "profile": ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/PrescriptionRecord"]
            },
            "status": "final",
            "type": {
                "coding": [
                    {
                        "system": "http://snomed.info/sct",
                        "code": "440545006",
                        "display": "Prescription record"
                    }
                ],
                "text": "Prescription and Diagnostic Record"
            },
            "subject": {"reference": patient_uuid},
            "encounter": {"reference": encounter_uuid},
            "date": timestamp,
            "author": [
                {
                    "display": f"MediKiosk Automated Diagnostic Agent ({organization_name})"
                }
            ],
            "title": "Prescription & Lab Investigation Record",
            "section": [
                {
                    "title": "Verified Clinical Record Components",
                    "code": {
                        "coding": [
                            {
                                "system": "http://snomed.info/sct",
                                "code": "422037009",
                                "display": "Provider orders"
                            }
                        ]
                    },
                    "entry": section_entries
                }
            ]
        }

        # Put Composition at entry[0] as per FHIR Document standard
        entries.insert(0, {
            "fullUrl": composition_uuid,
            "resource": composition_resource
        })

        # Assemble Master Bundle
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
                "value": f"MKB-{session_id or bundle_uuid[:8].upper()}"
            },
            "type": "document",
            "timestamp": timestamp,
            "entry": entries
        }


# Singleton instance
fhir_builder = FHIRBundleBuilder()
