"""
Threshold Calibration Engine for MediKiosk Module B
Calibrates confidence tiers, composite weights, and action gates across benchmark datasets.
"""
from typing import Dict, Any, List, Tuple
from rapidfuzz import fuzz


CALIBRATION_PROFILES = {
    "standard": {
        "auto_approval_threshold": 0.88,
        "confirmation_threshold": 0.65,
        "levenshtein_weight": 0.60,
        "metaphone_weight": 0.40,
        "max_verbal_boost": 0.05
    },
    "strict_safety": {
        "auto_approval_threshold": 0.92,
        "confirmation_threshold": 0.70,
        "levenshtein_weight": 0.65,
        "metaphone_weight": 0.35,
        "max_verbal_boost": 0.02
    },
    "high_automation": {
        "auto_approval_threshold": 0.84,
        "confirmation_threshold": 0.60,
        "levenshtein_weight": 0.55,
        "metaphone_weight": 0.45,
        "max_verbal_boost": 0.08
    }
}


def calculate_cer(reference: str, hypothesis: str) -> float:
    """
    Computes Character Error Rate (CER) using Levenshtein distance:
    CER = Levenshtein(reference, hypothesis) / len(reference)
    """
    ref = reference.strip().lower()
    hyp = hypothesis.strip().lower()
    if not ref:
        return 0.0 if not hyp else 1.0
    import Levenshtein
    dist = Levenshtein.distance(ref, hyp)
    return round(float(dist) / float(len(ref)), 4)


def calibrate_predictions(
    predictions: List[Dict[str, Any]],
    ground_truth: List[Dict[str, Any]],
    profile_name: str = "standard"
) -> Dict[str, Any]:
    """
    Computes performance metrics (Top-1, Top-3, CER, Precision, Recall)
    under the specified calibration profile.
    """
    profile = CALIBRATION_PROFILES.get(profile_name, CALIBRATION_PROFILES["standard"])
    threshold = profile["auto_approval_threshold"]

    total = len(ground_truth)
    if total == 0:
        return {"total_items": 0}

    top_1_hits = 0
    top_3_hits = 0
    auto_approved_correct = 0
    auto_approved_total = 0
    manual_review_correct = 0
    manual_review_total = 0
    cer_scores = []

    for pred, truth in zip(predictions, ground_truth):
        expected_brand = truth.get("expected_brand", "").lower().strip()
        matched_brand = (pred.get("matched_brand") or pred.get("brand_name") or "").lower().strip()
        raw_text = pred.get("raw_text") or pred.get("name") or ""
        expected_raw = truth.get("raw_ocr_or_transcription") or expected_brand

        # CER computation
        cer = calculate_cer(expected_raw, raw_text)
        cer_scores.append(cer)

        # Top-1 Check
        if matched_brand and matched_brand == expected_brand:
            top_1_hits += 1

        # Top-3 Check
        top_candidates = pred.get("top_candidates", [])
        top_3_names = [c.get("brand_name", "").lower().strip() for c in top_candidates[:3]]
        if expected_brand in top_3_names or matched_brand == expected_brand:
            top_3_hits += 1

        # Gating evaluation
        gate = pred.get("action_gate")
        score = pred.get("composite_score", 0.0)

        if score >= threshold or gate == "AUTO_APPROVED":
            auto_approved_total += 1
            if matched_brand == expected_brand:
                auto_approved_correct += 1
        else:
            manual_review_total += 1
            if matched_brand != expected_brand:
                manual_review_correct += 1

    top_1_accuracy = round(top_1_hits / total, 4)
    top_3_accuracy = round(top_3_hits / total, 4)
    avg_cer = round(sum(cer_scores) / len(cer_scores), 4) if cer_scores else 0.0
    auto_precision = round(auto_approved_correct / auto_approved_total, 4) if auto_approved_total > 0 else 1.0

    return {
        "profile": profile_name,
        "auto_approval_threshold": threshold,
        "total_samples": total,
        "top_1_accuracy": top_1_accuracy,
        "top_3_accuracy": top_3_accuracy,
        "average_cer": avg_cer,
        "auto_approved_count": auto_approved_total,
        "auto_approved_precision": auto_precision,
        "manual_review_count": manual_review_total
    }
