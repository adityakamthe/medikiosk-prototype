"""
FastAPI Microservice for MediKiosk Module B
Medical Document Digitization & Clinical Intelligence Engine

Endpoints:
- POST /api/v1/preprocess: OpenCV boundary dewarp, illumination division, and quality check
- POST /api/v1/cdsco/match: Pharmacopeia brand-to-generic matching with Levenshtein & RxNorm
- POST /api/v1/vernacular/translate: Vernacular dosage instruction and sig translation
- POST /api/v1/clinical/evaluate-labs: LOINC lab out-of-range 3-tier evaluation
- POST /api/v1/clinical/check-safety: NSAID gastroprotection & DDI checker
- POST /api/v1/timeline/cluster: Longitudinal multi-year episode clustering
- POST /api/v1/full-pipeline: Complete end-to-end processing
"""

import base64
import os
import sys
from typing import Any

# Ensure module_b directory and python-services are on sys.path
_CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if _CURRENT_DIR not in sys.path:
    sys.path.insert(0, _CURRENT_DIR)
_PARENT_DIR = os.path.abspath(os.path.join(_CURRENT_DIR, ".."))
if _PARENT_DIR not in sys.path:
    sys.path.insert(0, _PARENT_DIR)

from bhashini_translator import translate_vernacular_sig
from cdsco_normalizer import match_against_cdsco, query_rxnorm_rxcui
from clinical_intelligence import audit_prescriptions_safety, evaluate_lab_result
from cv_preprocessor import preprocess_medical_document
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from timeline_reconstruct import cluster_into_episodes

app = FastAPI(
    title="MediKiosk Module B Engine",
    description="Medical Document Digitization, Multi-Agent Clinical NLP, & Clinical Intelligence Engine",
    version="1.0.0"
)

# Enable CORS for Next.js web application
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic Schemas
class PreprocessRequest(BaseModel):
    image_base64: str
    apply_dewarp: bool = True
    apply_shadow_removal: bool = True
    apply_binary_mask: bool = False
    apply_ink_isolation: bool = False
    extract_lines: bool = False

class CDSCOMatchRequest(BaseModel):
    query: str
    verbal_context: str | None = None

class VernacularTranslateRequest(BaseModel):
    text: str

class LabItem(BaseModel):
    name: str
    value: Any
    unit: str | None = None

class EvaluateLabsRequest(BaseModel):
    labs: list[LabItem]

class PrescriptionItem(BaseModel):
    name: str
    dose: str | None = None
    frequency: str | None = None
    duration: str | None = None
    raw_text: str | None = None

class CheckSafetyRequest(BaseModel):
    medications: list[PrescriptionItem]

class TimelineClusterRequest(BaseModel):
    records: list[dict[str, Any]]
    day_threshold: int = 45

class EnsembleResolveRequest(BaseModel):
    vlm1_medications: list[dict[str, Any]]
    vlm2_medications: list[dict[str, Any]]
    verbal_context: str | None = None


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "MediKiosk Module B AI Microservice",
        "version": "1.0.0"
    }


@app.post("/api/v1/preprocess")
def preprocess_image(req: PreprocessRequest):
    try:
        raw_b64 = req.image_base64
        if "," in raw_b64:
            raw_b64 = raw_b64.split(",", 1)[1]
        img_bytes = base64.b64decode(raw_b64)
        result = preprocess_medical_document(
            img_bytes,
            apply_dewarp=req.apply_dewarp,
            apply_shadow_removal=req.apply_shadow_removal,
            apply_binary_mask=req.apply_binary_mask,
            apply_ink_isolation=req.apply_ink_isolation,
            extract_lines=req.extract_lines
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/v1/cdsco/match")
def cdsco_match(req: CDSCOMatchRequest):
    res = match_against_cdsco(req.query, verbal_context=req.verbal_context)
    # Check if generic name can get RxCUI
    if res.get("matched") and res.get("formulary_entry"):
        generic = res["formulary_entry"].get("generic_name", "")
        if not res["formulary_entry"].get("rxcui"):
            rxcui = query_rxnorm_rxcui(generic)
            res["formulary_entry"]["rxcui"] = rxcui
    return res


@app.post("/api/v1/ensemble/resolve")
def ensemble_resolve(req: EnsembleResolveRequest):
    from vlm_engine import resolve_token_agreement
    resolved = resolve_token_agreement(
        req.vlm1_medications,
        req.vlm2_medications,
        verbal_context=req.verbal_context
    )
    return {
        "total_medications": len(resolved),
        "medications": resolved
    }


@app.post("/api/v1/vernacular/translate")
def vernacular_translate(req: VernacularTranslateRequest):
    return translate_vernacular_sig(req.text)


@app.post("/api/v1/clinical/evaluate-labs")
def evaluate_labs(req: EvaluateLabsRequest):
    evaluated = []
    has_panic = False
    for lab in req.labs:
        eval_res = evaluate_lab_result(lab.name, lab.value, lab.unit)
        if eval_res.get("is_panic"):
            has_panic = True
        evaluated.append(eval_res)
    return {
        "total_evaluated": len(evaluated),
        "has_panic_values": has_panic,
        "results": evaluated
    }


@app.post("/api/v1/clinical/check-safety")
def check_safety(req: CheckSafetyRequest):
    meds_dict = [m.model_dump() for m in req.medications]
    return audit_prescriptions_safety(meds_dict)


@app.post("/api/v1/timeline/cluster")
def timeline_cluster(req: TimelineClusterRequest):
    episodes = cluster_into_episodes(req.records, req.day_threshold)
    return {
        "total_records": len(req.records),
        "total_episodes": len(episodes),
        "episodes": episodes
    }


class FullPipelineRequest(BaseModel):
    image_base64: str | None = None
    session_id: str | None = None
    verbal_context: str | None = None
    intake_payload: dict[str, Any] | None = None
    mock_predictions: list[dict[str, Any]] | None = None


@app.post("/api/v1/full-pipeline")
def full_pipeline(req: FullPipelineRequest):
    """
    Complete end-to-end processing pipeline orchestrating CV, OCR, Bhashini,
    CDSCO, LOINC, safety audits, and FHIR generation.
    """
    from coordinator import pipeline_coordinator
    from schemas.intake_schemas import DocumentIntakePayload

    img_bytes = None
    if req.image_base64:
        raw_b64 = req.image_base64
        if "," in raw_b64:
            raw_b64 = raw_b64.split(",", 1)[1]
        try:
            img_bytes = base64.b64decode(raw_b64)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid base64 image: {e!s}")

    intake_obj = None
    if req.intake_payload:
        try:
            intake_obj = DocumentIntakePayload(**req.intake_payload)
        except Exception:
            pass

    report = pipeline_coordinator.run_pipeline(
        image_bytes=img_bytes,
        intake_payload=intake_obj,
        session_id=req.session_id,
        verbal_context=req.verbal_context,
        mock_vlm_predictions=req.mock_predictions
    )
    return report.model_dump()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)
