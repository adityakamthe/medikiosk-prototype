"""
Master Coordinator for MediKiosk Module C.
Orchestrates multimodal ingestion, cross-modal contradiction interception, 8-part clinical synthesis,
Ayurvedic Dashavidha Pariksha, and native FHIR R4 dual-coding into a unified ClinicalSynthesisResponse.
"""
import sys
import os
from typing import Dict, Any, List, Optional

_MODULE_C_DIR = os.path.dirname(os.path.abspath(__file__))
_SERVICES_DIR = os.path.abspath(os.path.join(_MODULE_C_DIR, ".."))
for _p in [_MODULE_C_DIR, _SERVICES_DIR]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

try:
    from .schemas.ingestion_schemas import PatientRecordPayload
    from .schemas.synthesis_schemas import (
        ClinicalSynthesisResponse,
        Standard8PartSummary,
        DashavidhaReport,
        DualCodingEntry,
        ContradictionItem
    )
    from .engine.contradiction_engine import contradiction_engine
    from .engine.sbar_synthesizer import sbar_synthesizer
    from .engine.ayush_synthesizer import ayush_synthesizer
    from .engine.dual_coder import dual_coder
    from .fhir.dual_coded_bundle import dual_coded_fhir_builder
except (ImportError, ValueError):
    try:
        from module_c.schemas.ingestion_schemas import PatientRecordPayload
        from module_c.schemas.synthesis_schemas import (
            ClinicalSynthesisResponse,
            Standard8PartSummary,
            DashavidhaReport,
            DualCodingEntry,
            ContradictionItem
        )
        from module_c.engine.contradiction_engine import contradiction_engine
        from module_c.engine.sbar_synthesizer import sbar_synthesizer
        from module_c.engine.ayush_synthesizer import ayush_synthesizer
        from module_c.engine.dual_coder import dual_coder
        from module_c.fhir.dual_coded_bundle import dual_coded_fhir_builder
    except (ImportError, ValueError):
        from schemas.ingestion_schemas import PatientRecordPayload
        from schemas.synthesis_schemas import (
            ClinicalSynthesisResponse,
            Standard8PartSummary,
            DashavidhaReport,
            DualCodingEntry,
            ContradictionItem
        )
        from engine.contradiction_engine import contradiction_engine
        from engine.sbar_synthesizer import sbar_synthesizer
        from engine.ayush_synthesizer import ayush_synthesizer
        from engine.dual_coder import dual_coder
        from fhir.dual_coded_bundle import dual_coded_fhir_builder


class ModuleCCoordinator:
    """
    Master Synthesis Pipeline Coordinator for Module C.
    """

    def __init__(self):
        self.contradiction_engine = contradiction_engine
        self.sbar_synthesizer = sbar_synthesizer
        self.ayush_synthesizer = ayush_synthesizer
        self.dual_coder = dual_coder
        self.fhir_builder = dual_coded_fhir_builder

    def process_intake(
        self,
        payload: PatientRecordPayload,
        is_attested: bool = False,
        clinician_id: str = "Dr. Rajesh Verma (OPD-Physician)"
    ) -> ClinicalSynthesisResponse:
        """
        Executes the complete Module C synthesis pipeline.
        """
        # Step 1: Detect cross-modal contradictions
        conflicts: List[ContradictionItem] = self.contradiction_engine.detect_contradictions(payload)

        # Step 2: Synthesize 8-Part Standard Clinical Summary
        summary_8_part: Standard8PartSummary = self.sbar_synthesizer.generate_8_part_summary(payload)

        # Step 3: Ayurvedic Dashavidha Pariksha Synthesis
        dashavidha_report: Optional[DashavidhaReport] = None
        dashavidha_summary_str = None
        if payload.patient_meta.clinical_mode == "ayurveda" or payload.ayush_dashavidha:
            dashavidha_report = self.ayush_synthesizer.synthesize_dashavidha(payload)
            dashavidha_summary_str = (
                f"{dashavidha_report.prakriti_vikriti} | {dashavidha_report.agni_koshtha} | {dashavidha_report.bala_dhatu_sarata}"
            )

        # Step 4: Simultaneous Dual-Coding (NAMASTE + WHO ICD-11 TM2 + SNOMED CT)
        findings_to_code = []
        if hasattr(payload.chief_complaint, "normalized") and getattr(payload.chief_complaint, "normalized"):
            findings_to_code.append(getattr(payload.chief_complaint, "normalized"))
            if getattr(payload.chief_complaint, "verbatim", None):
                findings_to_code.append(getattr(payload.chief_complaint, "verbatim"))
        elif isinstance(payload.chief_complaint, str) and payload.chief_complaint:
            findings_to_code.append(payload.chief_complaint)
        for h in payload.past_history:
            findings_to_code.append(h.condition)

        dual_codings: List[DualCodingEntry] = self.dual_coder.code_multiple(findings_to_code)

        # Step 5: Patient Audio Confirmation View & DPDP Consent Token
        patient_audio = self.sbar_synthesizer.generate_patient_audio_view(payload)

        # Step 6: Clinician Flat View for Seamless Next.js UI Integration
        clinician_flat = self.sbar_synthesizer.generate_clinician_flat_view(
            summary_8_part=summary_8_part,
            payload=payload,
            dashavidha_summary=dashavidha_summary_str
        )

        # Add dual coding summary into flat view provisional diagnoses
        if dual_codings:
            coded_strs = []
            for dc in dual_codings:
                entry_txt = f"{dc.finding_text}"
                if dc.namaste_code:
                    entry_txt += f" [NAMASTE: {dc.namaste_code}]"
                if dc.who_tm2_code:
                    entry_txt += f" [WHO TM2: {dc.who_tm2_code}]"
                if dc.snomed_code:
                    entry_txt += f" [SNOMED: {dc.snomed_code}]"
                coded_strs.append(entry_txt)
            clinician_flat["provisional_diagnoses"] = "; ".join(coded_strs)

        # Step 7: ABDM FHIR R4 Dual-Coded Document Bundle
        enc_id = payload.encounter_id or payload.session_id or "sess-intake-default"
        fhir_bundle = self.fhir_builder.build_bundle(
            encounter_id=enc_id,
            patient_meta=payload.patient_meta,
            summary_8_part=summary_8_part,
            dual_codings=dual_codings,
            is_attested=is_attested,
            clinician_id=clinician_id
        )

        return ClinicalSynthesisResponse(
            success=True,
            encounter_id=enc_id,
            status="DRAFT_UNVERIFIED" if not is_attested else "ATTESTED_COMMITTED",
            clinician_view=clinician_flat,
            standard_8_part=summary_8_part,
            ayush_dashavidha=dashavidha_report,
            contradictions=conflicts,
            dual_codings=dual_codings,
            patient_audio_view=patient_audio,
            fhir_bundle=fhir_bundle
        )


# Singleton instance
module_c_coordinator = ModuleCCoordinator()
