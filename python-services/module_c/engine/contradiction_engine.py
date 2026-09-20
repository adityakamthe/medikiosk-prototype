"""
Deterministic Cross-Modal Contradiction Interception Engine for MediKiosk Module C.
Compares patient spoken assertions (Module A) against document-grounded OCR records (Module B).
Enforces Non-Resolution by Default: preserves both sources and presents 1-click clinician adjudication cards.
"""
import os
import re
import sys
import uuid

_ENGINE_DIR = os.path.dirname(os.path.abspath(__file__))
_MODULE_C_DIR = os.path.abspath(os.path.join(_ENGINE_DIR, ".."))
_SERVICES_DIR = os.path.abspath(os.path.join(_MODULE_C_DIR, ".."))
for _p in [_MODULE_C_DIR, _SERVICES_DIR]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

try:
    from module_c.schemas.ingestion_schemas import PatientRecordPayload
    from module_c.schemas.synthesis_schemas import ContradictionItem
except (ImportError, ModuleNotFoundError, ValueError):
    try:
        from schemas.ingestion_schemas import PatientRecordPayload  # type: ignore[no-redef]
        from schemas.synthesis_schemas import ContradictionItem  # type: ignore[no-redef]
    except (ImportError, ModuleNotFoundError, ValueError):
        from ..schemas.ingestion_schemas import PatientRecordPayload  # type: ignore[no-redef]
        from ..schemas.synthesis_schemas import ContradictionItem  # type: ignore[no-redef]


class ContradictionEngine:
    """
    Deterministic rule engine that intercepts cross-modal factual discrepancies.
    """

    NEGATIVE_ALLERGY_PHRASES = [
        "no known", "no allergy", "no allergies", "nkda", "nil",
        "none", "koi allergy nahi", "allergy nahi", "no drug allergy"
    ]

    NEGATIVE_MED_PHRASES = [
        "no medication", "no medicines", "not taking any", "koi dawai nahi",
        "none", "nil", "no ongoing medication"
    ]

    NEGATIVE_CONDITION_PHRASES = [
        "no history", "no past illness", "koi bimari nahi", "healthy",
        "none", "nil", "never diagnosed"
    ]

    def is_negative_assertion(self, text: str, negative_phrases: list[str]) -> bool:
        """Checks if a verbal statement represents a negative/denial assertion."""
        cleaned = text.lower().strip()
        return any(phrase in cleaned for phrase in negative_phrases)

    def detect_contradictions(self, payload: PatientRecordPayload) -> list[ContradictionItem]:
        """
        Scans all patient record streams and extracts cross-modal contradictions.
        """
        conflicts: list[ContradictionItem] = []

        # -------------------------------------------------------------
        # 1. ALLERGY CONTRADICTIONS (Safety Tier: CRITICAL)
        # -------------------------------------------------------------
        speech_allergies = [a for a in payload.reported_allergies if a.source == "speech"]
        doc_allergies = [a for a in payload.reported_allergies if a.source == "document"]

        # Check verbal denial vs documented presence
        for sa in speech_allergies:
            if self.is_negative_assertion(sa.allergen, self.NEGATIVE_ALLERGY_PHRASES):
                for da in doc_allergies:
                    if not self.is_negative_assertion(da.allergen, self.NEGATIVE_ALLERGY_PHRASES):
                        conflicts.append(ContradictionItem(
                            conflict_id=f"conf_alg_{uuid.uuid4().hex[:6]}",
                            field="Allergies",
                            severity="CRITICAL",
                            speech_claim=f"Patient verbally stated: '{sa.allergen}'",
                            document_claim=f"Scanned document record: '{da.allergen}' ({da.reaction or 'Allergic hypersensitivity noted'})",
                            doc_ref=da.doc_ref or "discharge_summary_scan_2021.jpg",
                            bbox=da.bbox or [120, 340, 280, 45],
                            action_required="Physician Adjudication Required — Severe Anaphylaxis Risk",
                            resolution_options=[
                                "Accept Scanned Allergy (Flag Chart)",
                                "Accept Patient Verbal (Confirmed Tolerated)",
                                "Add Clinical Clarification Note"
                            ]
                        ))

        # Check documented penicillin/sulfa vs active prescribed medication in documents
        for da in doc_allergies:
            allergen_clean = da.allergen.lower()
            if "penicillin" in allergen_clean or "amoxicillin" in allergen_clean:
                for med in payload.current_medications:
                    med_name = med.name.lower()
                    if any(p in med_name for p in ["amox", "penicillin", "augmentin", "moxikind"]):
                        conflicts.append(ContradictionItem(
                            conflict_id=f"conf_alg_med_{uuid.uuid4().hex[:6]}",
                            field="Allergy-Medication Cross-Conflict",
                            severity="CRITICAL",
                            speech_claim=f"Reported penicillin sensitivity: '{da.allergen}'",
                            document_claim=f"Active medication scan contains penicillin derivative: '{med.name}'",
                            doc_ref=med.doc_ref or da.doc_ref,
                            bbox=med.bbox or [80, 210, 310, 40],
                            action_required="Urgent Contraindication Adjudication",
                            resolution_options=[
                                "Withhold Penicillin Regimen",
                                "Confirm Patient Tolerance Test Done",
                                "Substitute Non-Beta-Lactam Antibiotic"
                            ]
                        ))

        # -------------------------------------------------------------
        # 2. MEDICATION CONTRADICTIONS (Safety Tier: HIGH)
        # -------------------------------------------------------------
        speech_meds = [m for m in payload.current_medications if m.source == "speech"]
        doc_meds = [m for m in payload.current_medications if m.source == "document"]

        # Case A: Verbal denial of meds while document shows active chronic therapy
        for sm in speech_meds:
            if self.is_negative_assertion(sm.name, self.NEGATIVE_MED_PHRASES):
                for dm in doc_meds:
                    if not self.is_negative_assertion(dm.name, self.NEGATIVE_MED_PHRASES):
                        conflicts.append(ContradictionItem(
                            conflict_id=f"conf_med_{uuid.uuid4().hex[:6]}",
                            field="Current Medications",
                            severity="HIGH",
                            speech_claim=f"Patient verbally stated: '{sm.name}'",
                            document_claim=f"Scanned prescription shows ongoing therapy: '{dm.name}' {dm.dose or ''} {dm.frequency or ''}".strip(),
                            doc_ref=dm.doc_ref or "prescription_scan_current.jpg",
                            bbox=dm.bbox or [95, 180, 260, 38],
                            action_required="Verify Medication Adherence & Discontinuation Status",
                            resolution_options=[
                                "Patient Defaulter / Non-Compliant (Resume Therapy)",
                                "Medication Was Stopped By Doctor",
                                "Update Active Medication List"
                            ]
                        ))

        # Case B: Discontinued vs Active claim
        for sm in speech_meds:
            for dm in doc_meds:
                if dm.status == "Discontinued" and sm.status != "Discontinued":
                    # Check if same drug base
                    sm_name_lower = (sm.name or "").lower()
                    dm_words = (dm.name or "").lower().split()
                    if any(word in sm_name_lower for word in dm_words):
                        conflicts.append(ContradictionItem(
                            conflict_id=f"conf_med_disc_{uuid.uuid4().hex[:6]}",
                            field="Current Medications",
                            severity="HIGH",
                            speech_claim=f"Patient reports taking: '{sm.name}'",
                            document_claim=f"Document specifies discontinuation: '{dm.name}' (Marked Discontinued)",
                            doc_ref=dm.doc_ref,
                            bbox=dm.bbox or [110, 240, 290, 42],
                            action_required="Clarify Treatment Regime Status",
                            resolution_options=[
                                "Confirm Discontinued (Stop Patient Use)",
                                "Re-authorized by Physician",
                                "Verify Substitution Drug"
                            ]
                        ))

        # -------------------------------------------------------------
        # 3. CHRONIC CONDITION / PAST HISTORY CONTRADICTIONS (Safety Tier: WARNING)
        # -------------------------------------------------------------
        speech_hist = [h for h in payload.past_history if h.source == "patient"]
        doc_hist = [h for h in payload.past_history if h.source == "document"]

        for sh in speech_hist:
            if self.is_negative_assertion(sh.condition or "", self.NEGATIVE_CONDITION_PHRASES):
                for dh in doc_hist:
                    if not self.is_negative_assertion(dh.condition or "", self.NEGATIVE_CONDITION_PHRASES):
                        conflicts.append(ContradictionItem(
                            conflict_id=f"conf_hist_{uuid.uuid4().hex[:6]}",
                            field="Past Medical History",
                            severity="WARNING",
                            speech_claim=f"Patient verbally stated: '{sh.condition}'",
                            document_claim=f"Scanned medical record documents: '{dh.condition}' ({dh.diagnosed_year or 'Historical'})",
                            doc_ref=dh.doc_ref or "prior_discharge_summary.pdf",
                            bbox=dh.bbox or [140, 190, 320, 50],
                            action_required="Reconcile Chronic Medical Profile",
                            resolution_options=[
                                "Accept Documented Medical History",
                                "Patient Unaware / Misunderstood Question",
                                "Erroneous Prior Chart Record"
                            ]
                        ))

        # Case D: Check Prior Labs vs Verbal History (e.g. claims no diabetes but HbA1c > 8.0)
        for sh in speech_hist:
            sh_cond_lower = (sh.condition or "").lower()
            if any(term in sh_cond_lower for term in ["no diabetes", "sugar nahi hai", "sugar normal"]):
                for lab in payload.prior_investigations:
                    if "hba1c" in (lab.test_name or "").lower():
                        try:
                            m = re.search(r'([0-9]+(?:\.[0-9]+)?)', str(lab.result_value or ""))
                            if m:
                                val = float(m.group(1))
                                if val >= 6.5:
                                    conflicts.append(ContradictionItem(
                                    conflict_id=f"conf_lab_{uuid.uuid4().hex[:6]}",
                                    field="Diagnostic Investigations vs Verbal Claim",
                                    severity="HIGH",
                                    speech_claim=f"Patient verbally stated: '{sh.condition}'",
                                    document_claim=f"Prior Lab Report shows HbA1c of {val}% (Diabetic threshold >= 6.5%)",
                                    doc_ref=lab.doc_ref or "lab_report_hba1c.jpg",
                                    bbox=lab.bbox or [60, 150, 350, 45],
                                    action_required="Uncontrolled Glycemia — Evaluate for Unmanaged Diabetes",
                                    resolution_options=[
                                        "Accept Lab Evidence (Initiate Diabetic Workup)",
                                        "Repeat Fasting Blood Sugar Lab Today",
                                        "Patient In Denial of Condition"
                                    ]
                                ))
                        except Exception:
                            pass

        return conflicts


# Singleton instance
contradiction_engine = ContradictionEngine()
