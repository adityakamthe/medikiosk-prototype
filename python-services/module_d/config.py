"""
Configuration for MediKiosk Module D:
Consent, Privacy, HIS Connector & ABDM Simulator.
"""

import os
from pathlib import Path

from pydantic_settings import BaseSettings


class ModuleDConfig(BaseSettings):
    # Service Information
    MODULE_D_HOST: str = "0.0.0.0"
    MODULE_D_PORT: int = 8003
    SERVICE_NAME: str = "MediKiosk Module D: Consent, Privacy, HIS & ABDM Simulator"
    VERSION: str = "1.0.0"

    # DPDP Act 2023 Compliance
    DPDP_NOTICE_VERSION: str = "v5.0"
    DATA_FIDUCIARY: str = "MediKiosk Intelligent OPD Intake System / Partner Hospital"
    GRIEVANCE_OFFICER_NAME: str = "Dr. Aditi Rao"
    GRIEVANCE_OFFICER_CONTACT: str = "grievance@medikiosk.in | +91-11-26588500"
    CONSENT_VALIDITY_HOURS: int = 24

    # Ephemeral Storage & Secure Purge
    BASE_DIR: Path = Path(__file__).resolve().parent
    SCRATCH_DIR: Path = Path(__file__).resolve().parent / "scratch"
    EPHEMERAL_TEMP_DIR: Path = Path(__file__).resolve().parent / "scratch" / "ephemeral"
    AUDIT_LOG_FILE: Path = Path(__file__).resolve().parent / "scratch" / "consent_audit_log.jsonl"
    PURGE_SHRED_PASSES: int = 3

    # Hospital Information System (HIS / OpenMRS / Bahmni)
    USE_MOCK_HIS: bool = True  # Allows 100% testability in zero-docker environment
    OPENMRS_BASE_URL: str = "http://localhost:8080/openmrs"
    OPENMRS_REST_URL: str = "http://localhost:8080/openmrs/ws/rest/v1"
    OPENMRS_FHIR2_URL: str = "http://localhost:8080/openmrs/ws/fhir2/R4"
    OPENMRS_USERNAME: str = "admin"
    OPENMRS_PASSWORD: str = "Admin123"
    HAPI_FHIR_URL: str = "http://localhost:8090/fhir"
    HIS_REQUEST_TIMEOUT_SECONDS: float = 5.0

    # Idempotency
    IDEMPOTENCY_TTL_SECONDS: int = 86400  # 24 hours

    # ABDM Gateway Emulation
    ABDM_M1_ISSUER: str = "https://healthidsbx.abdm.gov.in"
    ABDM_MOCK_OTP: str = "123456"
    ABDM_TOKEN_EXPIRY_SECONDS: int = 3600

    # Bhashini Vernacular TTS Hook
    BHASHINI_API_KEY: str | None = None
    BHASHINI_USER_ID: str | None = None

    model_config = {
        "env_file": ".env.local",
        "env_file_encoding": "utf-8",
        "extra": "ignore"
    }


settings = ModuleDConfig()

# Ensure required scratch directories exist
os.makedirs(settings.SCRATCH_DIR, exist_ok=True)
os.makedirs(settings.EPHEMERAL_TEMP_DIR, exist_ok=True)
