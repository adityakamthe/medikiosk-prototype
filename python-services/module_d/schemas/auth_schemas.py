"""
ABHA M1 Verification & Authentication Schemas for MediKiosk Module D.
"""

from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
import uuid


class AbhaDemographics(BaseModel):
    abha_number: str = Field(..., description="14-digit ABHA Number e.g. 91-1234-5678-9012")
    abha_id: Optional[str] = None
    abha_address: str = Field(..., description="ABHA handle e.g. rahul.sharma@abdm")
    name: str
    gender: str  # M, F, O or Male, Female, Other
    dob: str  # YYYY-MM-DD
    year_of_birth: int
    mobile: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    is_verified: bool = True
    auth_methods: List[str] = ["OTP", "DEMOGRAPHICS", "QR_CODE"]

    def __init__(self, **data):
        if "abha_number" in data and "abha_id" not in data:
            data["abha_id"] = data["abha_number"]
        super().__init__(**data)


class AbhaQRScanRequest(BaseModel):
    raw_payload: str = Field(..., description="Scanned string from ABHA card QR code (JSON or delimiter)")


class AbhaQRScanResponse(BaseModel):
    success: bool
    demographics: Optional[AbhaDemographics] = None
    raw_parsed_data: Dict[str, Any] = {}
    error: Optional[str] = None


class OTPGenerateRequest(BaseModel):
    auth_mode: str = Field(default="MOBILE_OTP", description="MOBILE_OTP or AADHAAR_OTP")
    identifier: str = Field(..., description="14-digit ABHA number or 10-digit mobile number")


class OTPGenerateResponse(BaseModel):
    success: bool
    txn_id: str
    transaction_id: Optional[str] = None
    auth_mode: str
    masked_target: str
    message: str = "OTP successfully dispatched (Use '123456' for instant demo validation)"

    def __init__(self, **data):
        if "txn_id" in data and "transaction_id" not in data:
            data["transaction_id"] = data["txn_id"]
        super().__init__(**data)


class OTPVerifyRequest(BaseModel):
    txn_id: Optional[str] = None
    transaction_id: Optional[str] = None
    otp: str = Field(default="123456", description="6-digit OTP code")
    abha_id: Optional[str] = None

    @property
    def effective_txn_id(self) -> str:
        return self.txn_id or self.transaction_id or ""


class AuthTokenResponse(BaseModel):
    success: bool
    token_type: str = "Bearer"
    access_token: str
    expires_in: int = 3600
    scope: str = "abdm:m1:patient_share abdm:m2:care_context"
    patient: AbhaDemographics
