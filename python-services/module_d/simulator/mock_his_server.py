"""
Embedded Mock HIS & FHIR R4 Server for MediKiosk Module D.
Provides zero-docker local emulation of OpenMRS / Bahmni REST & HAPI-FHIR endpoints.
"""

import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from ..schemas.his_schemas import OpenMRSPatientPayload, OpenMRSVisitPayload, OpenMRSEncounterPayload


class MockHISServer:
    """In-memory OpenMRS REST & FHIR R4 repository."""

    def __init__(self):
        self.patients: Dict[str, Dict[str, Any]] = {}
        self.visits: Dict[str, Dict[str, Any]] = {}
        self.encounters: Dict[str, Dict[str, Any]] = {}
        self.fhir_bundles: Dict[str, Dict[str, Any]] = {}
        self._seed_default_patients()

    def _seed_default_patients(self):
        """Seed initial realistic patients for instant testing."""
        default_patient = {
            "uuid": "8d793bee-c2cc-11de-8d13-0010c6dffd0f",
            "identifier": "91-4582-7391-0428",
            "given_name": "Rahul",
            "family_name": "Sharma",
            "gender": "M",
            "birthdate": "1988-06-15",
            "age": 36,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        self.patients[default_patient["identifier"]] = default_patient

    def lookup_patient(self, identifier: str) -> Optional[Dict[str, Any]]:
        """Find patient by ABHA number, national ID, or queue token."""
        # Direct identifier match
        if identifier in self.patients:
            return self.patients[identifier]
        # Partial match on identifier or name
        for p in self.patients.values():
            if p.get("identifier") == identifier or p.get("uuid") == identifier:
                return p
        return None

    def create_patient(self, payload: OpenMRSPatientPayload) -> Dict[str, Any]:
        """Register a new patient into the mock OpenMRS database."""
        existing = self.lookup_patient(payload.identifier)
        if existing:
            return existing

        patient_uuid = str(uuid.uuid4())
        record = {
            "uuid": patient_uuid,
            "identifier": payload.identifier,
            "given_name": payload.given_name,
            "family_name": payload.family_name or "Patient",
            "gender": payload.gender.upper()[:1],
            "birthdate": payload.birthdate,
            "age": payload.age,
            "address": payload.address or {},
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        self.patients[payload.identifier] = record
        return record

    def create_visit(self, payload: OpenMRSVisitPayload) -> Dict[str, Any]:
        """Create an active OPD Visit record for a patient."""
        visit_uuid = str(uuid.uuid4())
        record = {
            "uuid": visit_uuid,
            "patient_uuid": payload.patient_uuid,
            "visit_type_uuid": payload.visit_type_uuid,
            "location_uuid": payload.location_uuid,
            "start_datetime": payload.start_datetime or datetime.now(timezone.utc).isoformat(),
            "stop_datetime": None,
            "status": "ACTIVE"
        }
        self.visits[visit_uuid] = record
        return record

    def create_encounter(self, payload: OpenMRSEncounterPayload) -> Dict[str, Any]:
        """Create an OPD Consultation Encounter linked to a patient visit."""
        encounter_uuid = str(uuid.uuid4())
        record = {
            "uuid": encounter_uuid,
            "patient_uuid": payload.patient_uuid,
            "visit_uuid": payload.visit_uuid,
            "encounter_type_uuid": payload.encounter_type_uuid,
            "encounter_datetime": payload.encounter_datetime or datetime.now(timezone.utc).isoformat(),
            "provider_uuid": payload.provider_uuid,
            "observations": payload.observations,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        self.encounters[encounter_uuid] = record
        return record

    def ingest_fhir_bundle(self, bundle: Dict[str, Any]) -> Dict[str, Any]:
        """Store an attested FHIR R4 Document Bundle."""
        bundle_id = bundle.get("id") or str(uuid.uuid4())
        record = {
            "id": bundle_id,
            "resourceType": "Bundle",
            "type": bundle.get("type", "document"),
            "entry_count": len(bundle.get("entry", [])),
            "bundle": bundle,
            "received_at": datetime.now(timezone.utc).isoformat(),
            "status": "ACCEPTED"
        }
        self.fhir_bundles[bundle_id] = record
        return {
            "status": "SUCCESS",
            "bundle_id": bundle_id,
            "resource_count": record["entry_count"],
            "server": "MediKiosk-Embedded-FHIR-Emulator/v4.0.1"
        }

    def reset(self):
        """Reset mock store to initial seeded state."""
        self.patients.clear()
        self.visits.clear()
        self.encounters.clear()
        self.fhir_bundles.clear()
        self._seed_default_patients()


mock_his_server = MockHISServer()
