"""
OpenMRS / Bahmni REST Client for MediKiosk Module D.
Handles Patient lookup, registration, Visit initiation, and Consultation Encounter creation.
"""

from typing import Any

import httpx

from ..config import settings
from ..schemas.his_schemas import (
    OpenMRSEncounterPayload,
    OpenMRSPatientPayload,
    OpenMRSVisitPayload,
)
from ..simulator.mock_his_server import mock_his_server


class OpenMRSClient:
    """REST Client for OpenMRS / Bahmni."""

    def __init__(self):
        self.base_url = settings.OPENMRS_REST_URL
        self.username = settings.OPENMRS_USERNAME
        self.password = settings.OPENMRS_PASSWORD
        self.use_mock = settings.USE_MOCK_HIS
        self.timeout = settings.HIS_REQUEST_TIMEOUT_SECONDS

    def _get_auth(self):
        return (self.username, self.password)

    async def lookup_patient(self, identifier: str) -> dict[str, Any] | None:
        """Find patient by ABHA number or National ID in OpenMRS or Mock HIS."""
        if self.use_mock:
            return mock_his_server.lookup_patient(identifier)

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(
                    f"{self.base_url}/patient",
                    params={"q": identifier, "v": "full"},
                    auth=self._get_auth()
                )
                if resp.status_code == 200:
                    results = resp.json().get("results", [])
                    if results:
                        return results[0]
                return None
        except Exception:
            # Fallback to local emulator
            return mock_his_server.lookup_patient(identifier)

    async def register_patient(self, payload: OpenMRSPatientPayload) -> dict[str, Any]:
        """Register patient into OpenMRS or Mock HIS."""
        if self.use_mock:
            return mock_his_server.create_patient(payload)

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                body = {
                    "person": {
                        "names": [{"givenName": payload.given_name, "familyName": payload.family_name}],
                        "gender": payload.gender[:1].upper(),
                        "birthdate": payload.birthdate,
                    },
                    "identifiers": [{
                        "identifier": payload.identifier,
                        "identifierType": payload.identifier_type_uuid,
                        "location": payload.location_uuid,
                        "preferred": True
                    }]
                }
                resp = await client.post(f"{self.base_url}/patient", json=body, auth=self._get_auth())
                if resp.status_code in [200, 201]:
                    return resp.json()
                return mock_his_server.create_patient(payload)
        except Exception:
            return mock_his_server.create_patient(payload)

    async def start_visit(self, payload: OpenMRSVisitPayload) -> dict[str, Any]:
        """Initiate an OPD Visit in OpenMRS or Mock HIS."""
        if self.use_mock:
            return mock_his_server.create_visit(payload)

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                body = {
                    "patient": payload.patient_uuid,
                    "visitType": payload.visit_type_uuid,
                    "location": payload.location_uuid,
                    "startDatetime": payload.start_datetime
                }
                resp = await client.post(f"{self.base_url}/visit", json=body, auth=self._get_auth())
                if resp.status_code in [200, 201]:
                    return resp.json()
                return mock_his_server.create_visit(payload)
        except Exception:
            return mock_his_server.create_visit(payload)

    async def create_encounter(self, payload: OpenMRSEncounterPayload, idempotency_key: str | None = None) -> dict[str, Any]:
        """Create a clinical consultation encounter in OpenMRS or Mock HIS via POST /openmrs/ws/rest/v1/encounter."""
        if self.use_mock:
            return mock_his_server.create_encounter(payload)

        try:
            headers = {"Content-Type": "application/json"}
            if idempotency_key:
                headers["X-MediKiosk-Idempotency-Key"] = idempotency_key

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                body = {
                    "patient": payload.patient_uuid,
                    "visit": payload.visit_uuid,
                    "encounterType": payload.encounter_type_uuid,
                    "encounterDatetime": payload.encounter_datetime,
                    "obs": payload.observations
                }
                resp = await client.post(f"{self.base_url}/encounter", json=body, headers=headers, auth=self._get_auth())
                if resp.status_code in [200, 201]:
                    return resp.json()
                return mock_his_server.create_encounter(payload)
        except Exception:
            return mock_his_server.create_encounter(payload)

    async def forward_attested_bundle(
        self,
        fhir_bundle: dict[str, Any],
        idempotency_key: str,
        target_endpoint: str | None = None
    ) -> dict[str, Any]:
        """
        Forward attested NRCeS FHIR R4 Bundle to OpenMRS fhir2 or HAPI-FHIR
        with X-MediKiosk-Idempotency-Key header.
        """
        if self.use_mock:
            return mock_his_server.ingest_fhir_bundle(fhir_bundle)

        endpoint = target_endpoint or settings.OPENMRS_FHIR2_URL
        url = f"{endpoint}/Bundle"
        headers = {
            "Content-Type": "application/fhir+json",
            "X-MediKiosk-Idempotency-Key": idempotency_key
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(url, json=fhir_bundle, headers=headers, auth=self._get_auth())
                if resp.status_code in [200, 201]:
                    return resp.json()
                return mock_his_server.ingest_fhir_bundle(fhir_bundle)
        except Exception:
            return mock_his_server.ingest_fhir_bundle(fhir_bundle)


openmrs_client = OpenMRSClient()
