"""
FastAPI Microservice for MediKiosk Module C.
Structured Clinical History Summary Generator, Multimodal Synthesis, Ayurvedic Dashavidha Pariksha,
and Native FHIR R4 Dual-Coding (NAMASTE + WHO ICD-11 TM2).
Port: 8002
"""
import sys
import os
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Ensure current module directory is on sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from schemas.ingestion_schemas import PatientRecordPayload
from schemas.synthesis_schemas import ClinicalSynthesisResponse
from coordinator import module_c_coordinator
from engine.contradiction_engine import contradiction_engine
from engine.ayush_synthesizer import ayush_synthesizer
from engine.dual_coder import dual_coder


app = FastAPI(
    title="MediKiosk Module C Engine",
    description="Multimodal Clinical History Synthesis, Dashavidha Pariksha, and FHIR R4 Dual-Coding Microservice",
    version="2.0.0"
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "MediKiosk Module C Synthesis Microservice",
        "version": "2.0.0",
        "port": 8002
    }


@app.post("/api/v1/synthesize-intake", response_model=ClinicalSynthesisResponse)
def synthesize_intake(payload: PatientRecordPayload):
    """
    Complete multimodal synthesis pipeline:
    1. Cross-modal contradiction detection
    2. 8-Part standard clinical summary
    3. Ayurvedic Dashavidha Pariksha
    4. Simultaneous NAMASTE + WHO TM2 + SNOMED dual-coding
    5. Patient colloquial audio script with DPDP Act consent token
    6. Native ABDM FHIR R4 Document Bundle
    """
    try:
        return module_c_coordinator.process_intake(payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/contradictions/detect")
def detect_contradictions(payload: PatientRecordPayload):
    """Detects cross-modal contradictions without running full synthesis."""
    conflicts = contradiction_engine.detect_contradictions(payload)
    return {
        "total_conflicts": len(conflicts),
        "conflicts": [c.model_dump() for c in conflicts]
    }


@app.post("/api/v1/ayush/dashavidha")
def get_dashavidha(payload: PatientRecordPayload):
    """Computes Dashavidha Pariksha 10-fold clinical framework."""
    report = ayush_synthesizer.synthesize_dashavidha(payload)
    return report.model_dump()


class DualCodeRequest(BaseModel):
    findings: List[str]


@app.post("/api/v1/fhir/dual-code")
def dual_code_findings(req: DualCodeRequest):
    """Dual-codes multiple symptom/condition queries."""
    results = dual_coder.code_multiple(req.findings)
    return {
        "total_coded": len(results),
        "results": [r.model_dump() for r in results]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8002)
