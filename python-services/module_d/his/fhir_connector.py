"""
NRCeS FHIR R4 Bundle Validator & HIS Connector for MediKiosk Module D.
Pushes attested clinical consultation drafts into OpenMRS fhir2 or HAPI-FHIR with idempotency.
"""

from datetime import datetime, timezone
from typing import Any

import httpx

try:
    from ..config import settings
    from ..schemas.his_schemas import FHIRBundlePushRequest, FHIRBundlePushResponse
    from ..simulator.mock_his_server import mock_his_server
    from .idempotency import idempotency_manager
except (ImportError, ValueError):
    import sys
    from pathlib import Path
    _services_root = Path(__file__).resolve().parent.parent.parent
    if str(_services_root) not in sys.path:
        sys.path.insert(0, str(_services_root))
    from module_d.config import settings
    from module_d.his.idempotency import idempotency_manager
    from module_d.schemas.his_schemas import (
        FHIRBundlePushRequest,
        FHIRBundlePushResponse,
    )
    from module_d.simulator.mock_his_server import mock_his_server


class FHIRConnector:
    """Validates and pushes NRCeS FHIR R4 Bundles to institutional HIS."""

    def __init__(self):
        self.openmrs_fhir_url = getattr(settings, "OPENMRS_FHIR2_URL", "http://localhost:8080/openmrs/ws/fhir2/R4")
        self.hapi_fhir_url = getattr(settings, "HAPI_FHIR_URL", "http://localhost:8090/fhir")
        self.use_mock = getattr(settings, "USE_MOCK_HIS", True)
        self.timeout = getattr(settings, "HIS_REQUEST_TIMEOUT_SECONDS", 15)

    def validate_nrces_bundle(self, bundle: Any) -> tuple[bool, list[str]]:
        """
        Validates NRCeS requirements for an OPD Consultation Document Bundle:
        1. resourceType == "Bundle"
        2. type == "document"
        3. First entry must be a Composition resource
        4. Must contain at least one Patient resource
        """
        errors = []
        if not isinstance(bundle, dict):
            return False, ["Invalid bundle payload: must be a JSON object"]

        if bundle.get("resourceType") != "Bundle":
            errors.append("Invalid resourceType: must be 'Bundle'")

        if bundle.get("type") != "document":
            errors.append("Invalid Bundle.type: must be 'document'")

        entries = bundle.get("entry", [])
        if not isinstance(entries, list) or not entries:
            errors.append("Bundle has no entries")
            return False, errors

        first_entry = entries[0] if isinstance(entries[0], dict) else {}
        first_resource = first_entry.get("resource", {}) if isinstance(first_entry, dict) else {}
        if not isinstance(first_resource, dict) or first_resource.get("resourceType") != "Composition":
            errors.append("NRCeS specification: First entry in a document bundle must be a 'Composition'")

        has_patient = any(
            isinstance(e, dict)
            and isinstance(e.get("resource"), dict)
            and e["resource"].get("resourceType") == "Patient"
            for e in entries
        )
        if not has_patient:
            errors.append("NRCeS specification: Bundle must contain a 'Patient' resource")

        is_valid = len(errors) == 0
        return is_valid, errors

    async def push_bundle(self, req: FHIRBundlePushRequest) -> FHIRBundlePushResponse:
        """
        Idempotently push validated FHIR bundle to HIS / OpenMRS.
        """
        # 1. Idempotency Check
        is_dup, cached_rec, conflict_err = idempotency_manager.check_transaction(
            req.idempotency_key,
            req.bundle
        )

        if conflict_err:
            return FHIRBundlePushResponse(
                status="CONFLICT",
                message=conflict_err,
                idempotency_key=req.idempotency_key,
                is_duplicate=True,
                validation_passed=False,
                http_status=409,
                target_endpoint="N/A",
                timestamp=datetime.now(timezone.utc).isoformat()
            )

        if is_dup and cached_rec:
            res_dict = cached_rec.response_data if isinstance(cached_rec.response_data, dict) else {}
            return FHIRBundlePushResponse(
                status="DUPLICATE_SUBMISSION",
                message="Transaction already processed; returning recorded response.",
                idempotency_key=req.idempotency_key,
                is_duplicate=True,
                validation_passed=res_dict.get("validation_passed", True),
                validation_issues=res_dict.get("validation_issues", []),
                remote_fhir_id=res_dict.get("remote_fhir_id"),
                http_status=cached_rec.status_code,
                target_endpoint=res_dict.get("target_endpoint", "CACHED"),
                timestamp=datetime.now(timezone.utc).isoformat()
            )

        # 2. NRCeS Bundle Validation
        is_valid, val_issues = self.validate_nrces_bundle(req.bundle)
        if not is_valid:
            resp = FHIRBundlePushResponse(
                status="VALIDATION_FAILED",
                message=f"NRCeS FHIR R4 Bundle validation failed: {'; '.join(val_issues)}",
                idempotency_key=req.idempotency_key,
                is_duplicate=False,
                validation_passed=False,
                validation_issues=val_issues,
                http_status=422,
                target_endpoint=self.openmrs_fhir_url,
                timestamp=datetime.now(timezone.utc).isoformat()
            )
            return resp

        # 3. Transmission (Target: OpenMRS fhir2, HAPI-FHIR, or Mock)
        target_endpoint = self.hapi_fhir_url if req.target_system == "HAPI_FHIR" else self.openmrs_fhir_url
        remote_id = None
        http_status = 201

        if self.use_mock or req.target_system == "EMULATOR":
            mock_res = mock_his_server.ingest_fhir_bundle(req.bundle)
            remote_id = mock_res["bundle_id"]
            status_text = "SUCCESS"
            msg = f"Bundle successfully ingested into MediKiosk HIS/FHIR emulator (ID: {remote_id})"
        else:
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    target_url = f"{target_endpoint}/Bundle"
                    http_resp = await client.post(
                        target_url,
                        json=req.bundle,
                        headers={
                            "Content-Type": "application/fhir+json",
                            "X-MediKiosk-Idempotency-Key": req.idempotency_key
                        }
                    )
                    if http_resp.status_code in [200, 201]:
                        try:
                            body = http_resp.json()
                            remote_id = body.get("id") if isinstance(body, dict) else None
                        except Exception:
                            remote_id = None
                        if not remote_id and isinstance(req.bundle, dict):
                            remote_id = req.bundle.get("id")
                        status_text = "SUCCESS"
                        msg = f"Bundle accepted by remote FHIR server: {http_resp.status_code}"
                        http_status = http_resp.status_code
                    else:
                        # Fallback to emulator with notice
                        mock_res = mock_his_server.ingest_fhir_bundle(req.bundle)
                        remote_id = mock_res["bundle_id"]
                        status_text = "SUCCESS_FALLBACK"
                        msg = f"Remote returned {http_resp.status_code}; safely buffered into local HIS emulator (ID: {remote_id})"
            except Exception as e:
                # Network fallback to local emulator
                mock_res = mock_his_server.ingest_fhir_bundle(req.bundle)
                remote_id = mock_res["bundle_id"]
                status_text = "SUCCESS_FALLBACK"
                msg = f"Remote unreachable ({str(e)[:40]}...); safely routed to local HIS emulator (ID: {remote_id})"

        final_response = FHIRBundlePushResponse(
            status=status_text,
            message=msg,
            idempotency_key=req.idempotency_key,
            is_duplicate=False,
            validation_passed=True,
            remote_fhir_id=remote_id,
            http_status=http_status,
            target_endpoint=target_endpoint,
            timestamp=datetime.now(timezone.utc).isoformat()
        )

        # 4. Record transaction in Idempotency Manager
        idempotency_manager.record_transaction(
            req.idempotency_key,
            req.bundle,
            http_status,
            final_response.model_dump()
        )

        return final_response


fhir_connector = FHIRConnector()

