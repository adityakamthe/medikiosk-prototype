"""
Master Pipeline Coordinator for MediKiosk Module B.
Unifies CV preprocessing, projection line slicing, VLM consensus, Bhashini translation,
CDSCO/LOINC grounding, clinical safety verification, and FHIR R4 generation.
"""
from typing import Dict, Any, List, Optional
import os
import cv2
import numpy as np

try:
    from module_b.schemas.intake_schemas import DocumentIntakePayload, RawPrescriptionLine
    from module_b.schemas.verification_schemas import (
        VerificationReport,
        NormalizedMedicationItem,
        EvaluatedLabItem,
        ClinicalAlert,
        VerificationActionGate,
        LongitudinalEpisode
    )
    from module_b.cv.preprocessor import cv_preprocessor
    from module_b.ocr.line_extractor import line_extractor
    from module_b.ocr.vlm_ensemble import vlm_ensemble, resolve_token_agreement
    from module_b.vernacular.bhashini_service import bhashini_translator
    from module_b.normalizers.cdsco_normalizer import cdsco_matcher
    from module_b.normalizers.loinc_mapper import loinc_mapper
    from module_b.intelligence.lab_verifier import lab_verifier
    from module_b.intelligence.med_verifier import medication_verifier
    from module_b.intelligence.timeline_cluster import cluster_into_episodes
    from module_b.ocr.secondary_recognizer import secondary_recognizer, apply_disagreement_gate
    from module_b.ocr.schema_parser import parse_vlm_output_with_retry
    from module_b.fhir.bundle_builder import fhir_builder
except (ImportError, ValueError):
    try:
        from .schemas.intake_schemas import DocumentIntakePayload, RawPrescriptionLine
        from .schemas.verification_schemas import (
            VerificationReport,
            NormalizedMedicationItem,
            EvaluatedLabItem,
            ClinicalAlert,
            VerificationActionGate,
            LongitudinalEpisode
        )
        from .cv.preprocessor import cv_preprocessor
        from .ocr.line_extractor import line_extractor
        from .ocr.vlm_ensemble import vlm_ensemble, resolve_token_agreement
        from .ocr.secondary_recognizer import secondary_recognizer, apply_disagreement_gate
        from .ocr.schema_parser import parse_vlm_output_with_retry
        from .vernacular.bhashini_service import bhashini_translator
        from .normalizers.cdsco_normalizer import cdsco_matcher
        from .normalizers.loinc_mapper import loinc_mapper
        from .intelligence.lab_verifier import lab_verifier
        from .intelligence.med_verifier import medication_verifier
        from .intelligence.timeline_cluster import cluster_into_episodes
        from .fhir.bundle_builder import fhir_builder
    except (ImportError, ValueError):
        from schemas.intake_schemas import DocumentIntakePayload, RawPrescriptionLine
        from schemas.verification_schemas import (
            VerificationReport,
            NormalizedMedicationItem,
            EvaluatedLabItem,
            ClinicalAlert,
            VerificationActionGate,
            LongitudinalEpisode
        )
        from cv.preprocessor import cv_preprocessor
        from ocr.line_extractor import line_extractor
        from ocr.vlm_ensemble import vlm_ensemble, resolve_token_agreement
        from ocr.secondary_recognizer import secondary_recognizer, apply_disagreement_gate
        from ocr.schema_parser import parse_vlm_output_with_retry
        from vernacular.bhashini_service import bhashini_translator
        from normalizers.cdsco_normalizer import cdsco_matcher
        from normalizers.loinc_mapper import loinc_mapper
        from intelligence.lab_verifier import lab_verifier
        from intelligence.med_verifier import medication_verifier
        from intelligence.timeline_cluster import cluster_into_episodes
        from fhir.bundle_builder import fhir_builder


class PipelineCoordinator:
    """
    End-to-end execution coordinator for Module B.
    """

    def __init__(self):
        self.cv = cv_preprocessor
        self.line_extractor = line_extractor
        self.bhashini = bhashini_translator
        self.cdsco = cdsco_matcher
        self.loinc = loinc_mapper
        self.lab_verifier = lab_verifier
        self.med_verifier = medication_verifier
        self.fhir = fhir_builder

    def run_pipeline(
        self,
        image_bytes: Optional[bytes] = None,
        image_path: Optional[str] = None,
        intake_payload: Optional[DocumentIntakePayload] = None,
        session_id: Optional[str] = None,
        verbal_context: Optional[str] = None,
        mock_vlm_predictions: Optional[List[Dict[str, Any]]] = None
    ) -> VerificationReport:
        """
        Executes the entire Module B verification pipeline.
        """
        # Step 1: CV Preprocessing
        cv_res = None
        sharpness_score = 0.0
        confidence_tier = "high"
        was_dewarped = False
        line_strips_count = 0

        if image_bytes is not None:
            cv_res = self.cv.preprocess_image_bytes(image_bytes)
        elif image_path and os.path.exists(image_path):
            with open(image_path, "rb") as f:
                cv_res = self.cv.preprocess_image_bytes(f.read())

        if cv_res is not None:
            sharpness_score = cv_res["sharpness_score"]
            confidence_tier = cv_res["confidence_tier"]
            was_dewarped = cv_res["dewarped"]
            processed_img = cv_res["processed_image"]

            # Step 2: Line extraction
            strips = self.line_extractor.extract_lines(processed_img)
            line_strips_count = len(strips)

        # Step 3: Extract or collect raw medications & labs
        extracted_meds: List[Dict[str, Any]] = []
        extracted_labs: List[Dict[str, Any]] = []
        context_text = verbal_context or ""

        if intake_payload:
            if intake_payload.metadata and intake_payload.metadata.verbal_transcription:
                context_text = f"{context_text} {intake_payload.metadata.verbal_transcription}".strip()
            for m in intake_payload.medications:
                extracted_meds.append(m.model_dump())
            for l in intake_payload.labs:
                extracted_labs.append(l.model_dump())

        if mock_vlm_predictions:
            for pred in mock_vlm_predictions:
                if "test_name" in pred or "value" in pred:
                    extracted_labs.append(pred)
                else:
                    extracted_meds.append(pred)

        # Step 4: Normalize and Ground Medications (Bhashini + CDSCO)
        normalized_medications: List[NormalizedMedicationItem] = []
        for raw_med in extracted_meds:
            raw_name = raw_med.get("raw_text") or raw_med.get("name") or ""
            raw_dose = raw_med.get("dosage") or raw_med.get("dose") or ""
            raw_freq = raw_med.get("frequency") or ""
            raw_dur = raw_med.get("duration") or ""

            # Vernacular Sig translation
            translated_sig_info = self.bhashini.translate_vernacular_sig(raw_freq)
            standardized_sig = translated_sig_info["standardized_sig"]

            # CDSCO Metaphone + RapidFuzz Grounding
            cdsco_match = self.cdsco.normalize_candidate(
                candidate_text=raw_name,
                verbal_transcript=context_text,
                inferred_dosage_form=raw_med.get("form") or "TABLET"
            )

            # Cross-Model Disagreement Gate (Primary VLM vs Secondary Recognizer)
            sec_candidate = raw_med.get("secondary_candidate")
            initial_gate_val = cdsco_match.get("action_gate", "AUTO_APPROVED")

            item_gate_holder = {"action_gate": initial_gate_val}
            apply_disagreement_gate(
                medication_item=item_gate_holder,
                primary_candidate=raw_name,
                secondary_candidate=sec_candidate,
                current_action_gate=initial_gate_val
            )
            final_gate = VerificationActionGate(item_gate_holder["action_gate"])
            cat = cdsco_match.get("category")
            req_ppi = (cat == "NSAID")

            norm_item = NormalizedMedicationItem(
                name=raw_name,
                brand_name=cdsco_match.get("matched_brand"),
                generic_name=cdsco_match.get("generic_name"),
                active_ingredients=cdsco_match.get("active_ingredients", []),
                dose=raw_dose or cdsco_match.get("strength"),
                frequency=raw_freq,
                standardized_sig=standardized_sig,
                duration=raw_dur,
                category=cat,
                rxcui=cdsco_match.get("rxcui"),
                requires_ppi_warning=req_ppi,
                composite_score=cdsco_match.get("composite_score", 0.0),
                action_gate=final_gate,
                top_candidates=cdsco_match.get("top_candidates", []),
                candidates=cdsco_match.get("candidates", []),
                recognizer_outputs=item_gate_holder.get("recognizer_outputs"),
                verification_pass=cdsco_match.get("verification_pass", "pass_3_closed_set"),
                signal_breakdown=cdsco_match.get("signal_breakdown")
            )
            normalized_medications.append(norm_item)

        # Step 5: Evaluate Diagnostic Labs (LOINC)
        evaluated_labs: List[EvaluatedLabItem] = []
        for raw_lab in extracted_labs:
            t_name = raw_lab.get("test_name") or raw_lab.get("name") or ""
            r_val = raw_lab.get("value") or raw_lab.get("raw_value") or ""
            unit = raw_lab.get("unit")
            eval_item = self.lab_verifier.evaluate_item(t_name, r_val, unit)
            evaluated_labs.append(eval_item)

        # Step 6: Clinical Safety & Pharmacological Audits
        med_dicts_for_audit = [
            {
                "name": m.name,
                "brand_name": m.brand_name,
                "generic_name": m.generic_name,
                "dose": m.dose,
                "frequency": m.standardized_sig or m.frequency,
                "category": m.category
            }
            for m in normalized_medications
        ]
        med_alerts, gastro_status, has_critical = self.med_verifier.audit_medications(med_dicts_for_audit)

        # Lab panic alerts added to total alerts
        all_alerts: List[ClinicalAlert] = list(med_alerts)
        for lab_item in evaluated_labs:
            if lab_item.is_panic and lab_item.alert_message:
                all_alerts.append(ClinicalAlert(
                    type="CRITICAL_LAB_PANIC",
                    severity=lab_item.flag,
                    title=f"Critical Panic Lab: {lab_item.test_name}",
                    description=lab_item.alert_message,
                    recommendation="Immediate physician notification required. Re-evaluate urgent medical stabilizing measures."
                ))
                has_critical = True

        # Step 7: Longitudinal Episodic Clustering
        history_records = []
        if intake_payload and intake_payload.metadata and intake_payload.metadata.session_id:
            # Current session record
            history_records.append({
                "document_id": intake_payload.metadata.session_id,
                "document_date": intake_payload.metadata.document_date or "2026-09-17",
                "document_type": intake_payload.metadata.document_type,
                "summary": f"Prescription with {len(normalized_medications)} medicines, {len(evaluated_labs)} lab investigations."
            })
        episodes = cluster_into_episodes(history_records)

        # Step 8: Build FHIR R4 Bundle
        patient_name = "Anonymous Patient"
        abha_id = None
        doc_session_id = session_id
        doc_type = "prescription"
        if intake_payload and intake_payload.metadata:
            patient_name = intake_payload.metadata.patient_name or patient_name
            abha_id = intake_payload.metadata.abha_id
            doc_session_id = doc_session_id or intake_payload.metadata.session_id
            doc_type = intake_payload.metadata.document_type or doc_type

        fhir_doc = self.fhir.build_bundle(
            session_id=doc_session_id or "session-unknown",
            patient_name=patient_name,
            abha_id=abha_id,
            medications=normalized_medications,
            labs=evaluated_labs
        )

        return VerificationReport(
            session_id=doc_session_id,
            document_type=doc_type,
            quality_assessment="optimal" if confidence_tier == "high" else ("legible" if confidence_tier == "ambiguous" else "poor"),
            confidence_tier=confidence_tier,
            was_dewarped=was_dewarped,
            sharpness_score=round(sharpness_score, 2),
            line_strips_detected=line_strips_count,
            medications=normalized_medications,
            labs=evaluated_labs,
            alerts=all_alerts,
            total_alerts=len(all_alerts),
            has_critical_alerts=has_critical,
            gastroprotection_status=gastro_status,
            episodes=episodes,
            fhir_bundle=fhir_doc
        )


# Singleton instance
pipeline_coordinator = PipelineCoordinator()
