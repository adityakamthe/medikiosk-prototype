"""
FastAPI Microservice Entrypoint for MediKiosk Module D:
Consent, Privacy, HIS Connector & ABDM Simulator.
Port: 8003
"""

import sys
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Ensure current module directory is on sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.dirname(CURRENT_DIR)
for p in [CURRENT_DIR, PARENT_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

from module_d.config import settings
from module_d.router import router as module_d_router

app = FastAPI(
    title="MediKiosk Module D Microservice",
    description="DPDP Act 2023 Consent, Ephemeral Privacy, OpenMRS / HIS Connector, and ABDM Simulator",
    version=settings.VERSION
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Module D Router
app.include_router(module_d_router)


@app.get("/")
def root():
    return {
        "service": settings.SERVICE_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs_url": "/docs"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.MODULE_D_HOST, port=settings.MODULE_D_PORT, reload=True)
