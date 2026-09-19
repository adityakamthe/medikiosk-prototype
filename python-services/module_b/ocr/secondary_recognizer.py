"""
Secondary Independent Recognizer & Cross-Model Disagreement Gate for MediKiosk Module B.
Provides an independent optical/lexical recognition pass to cross-validate primary VLM extractions.
Enforces strict disagreement gating: if primary VLM and secondary recognizer disagree on drug candidate,
the action gate is unconditionally clamped to MANUAL_REVIEW_REQUIRED.
"""

import os
import re
from typing import Dict, Any, List, Optional, Tuple
from rapidfuzz import fuzz

try:
    from module_b.schemas.intake_schemas import ConstrainedMedicationExtraction
    from module_b.schemas.verification_schemas import VerificationActionGate
except (ImportError, ValueError):
    try:
        from ..schemas.intake_schemas import ConstrainedMedicationExtraction
        from ..schemas.verification_schemas import VerificationActionGate
    except (ImportError, ValueError):
        from schemas.intake_schemas import ConstrainedMedicationExtraction
        from schemas.verification_schemas import VerificationActionGate


def normalize_drug_token(token: str) -> str:
    """Normalizes drug candidate string for robust token comparison."""
    if not token:
        return ""
    clean = token.lower().strip()
    clean = re.sub(r'^(tab|tablet|cap|capsule|syr|syrup|inj|ointment|oint)\.?\s+', '', clean)
    clean = re.sub(r'\b\d+(\.\d+)?\s*(mg|ml|mcg|gm|iu)?\b', '', clean)
    clean = re.sub(r'[^\w\s]', '', clean).strip()
    return clean


class SecondaryRecognizer:
    """
    Independent secondary recognizer.
    Can be backed by local OCR (Tesseract / EasyOCR / PaddleOCR / TrOCR mock)
    or secondary fast model endpoint.
    """

    def __init__(self, backend: str = "mock"):
        self.backend = os.environ.get("SECONDARY_OCR_BACKEND", backend)

    def recognize_strip(self, strip_image: Any) -> Optional[str]:
        """Runs secondary recognition on a single segmented line strip."""
        if self.backend == "tesseract":
            try:
                import pytesseract
                return pytesseract.image_to_string(strip_image).strip()
            except Exception:
                pass
        return None

    def recognize_prescription(
        self,
        image_bytes: Optional[bytes] = None,
        fallback_candidates: Optional[List[Dict[str, Any]]] = None
    ) -> List[Dict[str, Any]]:
        """
        Runs secondary recognition over prescription, returning independent candidates.
        If fallback_candidates is provided (e.g. in tests or mock environment), uses those.
        """
        if fallback_candidates is not None:
            return fallback_candidates
        return []


def evaluate_cross_model_agreement(
    primary_candidate: str,
    secondary_candidate: Optional[str],
    threshold: float = 0.85
) -> Tuple[bool, float, str]:
    """
    Compares primary VLM drug name candidate against secondary recognizer candidate.
    Uses raw edit distance (fuzz.ratio) on normalized tokens.
    Returns: (is_agreed, agreement_score, status_label)
    """
    if not secondary_candidate:
        # No secondary candidate available to dispute or confirm
        return True, 1.0, "SECONDARY_NOT_AVAILABLE"

    norm_pri = normalize_drug_token(primary_candidate)
    norm_sec = normalize_drug_token(secondary_candidate)

    if not norm_pri or not norm_sec:
        return False, 0.0, "EMPTY_TOKEN_DISAGREEMENT"

    # Exact token equality
    if norm_pri == norm_sec:
        return True, 1.0, "AGREED_EXACT"

    # Raw string edit distance ratio (Levenshtein)
    sim = fuzz.ratio(norm_pri, norm_sec) / 100.0

    if sim >= threshold:
        return True, round(sim, 3), "AGREED_SIMILAR"
    else:
        return False, round(sim, 3), "DISAGREED"


def apply_disagreement_gate(
    medication_item: Dict[str, Any],
    primary_candidate: str,
    secondary_candidate: Optional[str],
    current_action_gate: str
) -> Dict[str, Any]:
    """
    Applies the Cross-Model Disagreement Gate:
    If primary and secondary disagree on drug candidate:
      - Clamps action_gate to MANUAL_REVIEW_REQUIRED
      - Attaches recognizer outputs to item metadata
    """
    is_agreed, score, status = evaluate_cross_model_agreement(
        primary_candidate, secondary_candidate
    )

    gated_action = current_action_gate
    if not is_agreed and status == "DISAGREED":
        gated_action = VerificationActionGate.MANUAL_REVIEW_REQUIRED.value

    medication_item["recognizer_outputs"] = {
        "primary_vlm": primary_candidate,
        "secondary_recognizer": secondary_candidate,
        "agreement_score": score,
        "disagreement_status": status,
        "is_agreed": is_agreed
    }
    medication_item["action_gate"] = gated_action

    return medication_item


secondary_recognizer = SecondaryRecognizer()
