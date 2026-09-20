"""
Evaluation Harness for MediKiosk Module B
Runs automated benchmark evaluations across Indian prescription dataset, measuring:
- Character Error Rate (CER)
- Top-1 and Top-3 Drug Match Accuracy
- Vernacular Sig Translation Accuracy
- Disagreement Gate Safety Gating
"""

import json
import sys
from pathlib import Path
from typing import Any

# Ensure module_b path is importable
current_dir = Path(__file__).resolve().parent
module_b_dir = current_dir.parent
if str(module_b_dir) not in sys.path:
    sys.path.insert(0, str(module_b_dir))

from eval_harness.threshold_calibration import calculate_cer, calibrate_predictions
from normalizers.cdsco_normalizer import cdsco_matcher
from vernacular.bhashini_service import bhashini_translator


def load_benchmark_dataset() -> list[dict[str, Any]]:
    dataset_path = current_dir / "dataset" / "indian_prescriptions_benchmark.json"
    if not dataset_path.exists():
        raise FileNotFoundError(f"Benchmark dataset not found at {dataset_path}")
    with open(dataset_path, "r", encoding="utf-8") as f:
        return json.load(f)


def run_evaluation(profile: str = "standard") -> dict[str, Any]:
    dataset = load_benchmark_dataset()
    results = []
    total = len(dataset)

    top_1_hits = 0
    top_3_hits = 0
    sig_translation_hits = 0
    cer_list = []

    for item in dataset:
        raw_text = item["raw_ocr_or_transcription"]
        expected_brand = item["expected_brand"]
        expected_sig = item["expected_sig"]
        expected_form = item.get("expected_form")

        # 1. Normalization Pass (CDSCO)
        norm_result = cdsco_matcher.normalize_candidate(
            candidate_text=raw_text,
            inferred_dosage_form=expected_form
        )
        matched_brand = norm_result.get("matched_brand")

        # CER computation against expected brand
        cer = calculate_cer(expected_brand, matched_brand or "")
        cer_list.append(cer)

        # Top-1 Check
        is_top_1 = (matched_brand and matched_brand.lower() == expected_brand.lower())
        if is_top_1:
            top_1_hits += 1

        # Top-3 Check
        top_candidates = norm_result.get("top_candidates", [])
        top_3_brands = [c.get("brand_name", "").lower() for c in top_candidates[:3]]
        is_top_3 = is_top_1 or (expected_brand.lower() in top_3_brands)
        if is_top_3:
            top_3_hits += 1

        # 2. Vernacular Sig Translation
        sig_res = bhashini_translator.translate_vernacular_sig(raw_text)
        std_sig = sig_res.get("standardized_sig", "")
        # Check if expected sig code or meaning is in the standardized sig
        sig_matched = False
        for part in expected_sig.split():
            if part.lower() in std_sig.lower() or part.lower() in sig_res.get("translated_text", "").lower():
                sig_matched = True
                break
        if sig_matched:
            sig_translation_hits += 1

        results.append({
            "id": item.get("id"),
            "raw_text": raw_text,
            "expected_brand": expected_brand,
            "matched_brand": matched_brand,
            "is_top_1": is_top_1,
            "is_top_3": is_top_3,
            "cer": cer,
            "composite_score": norm_result.get("composite_score", 0.0),
            "action_gate": norm_result.get("action_gate"),
            "signal_breakdown": norm_result.get("signal_breakdown"),
            "candidates": norm_result.get("candidates", [])
        })

    # Summary metrics
    top_1_accuracy = round(top_1_hits / total, 4)
    top_3_accuracy = round(top_3_hits / total, 4)
    sig_accuracy = round(sig_translation_hits / total, 4)
    avg_cer = round(sum(cer_list) / len(cer_list), 4) if cer_list else 0.0

    # Calibration profiling
    calib = calibrate_predictions(results, dataset, profile_name=profile)

    report = {
        "evaluation_summary": {
            "total_benchmark_records": total,
            "top_1_drug_accuracy": top_1_accuracy,
            "top_3_drug_accuracy": top_3_accuracy,
            "average_cer": avg_cer,
            "vernacular_sig_accuracy": sig_accuracy,
            "auto_approved_count": calib.get("auto_approved_count", 0),
            "auto_approved_precision": calib.get("auto_approved_precision", 1.0),
            "manual_review_count": calib.get("manual_review_count", 0)
        },
        "calibration_profile": calib,
        "sample_item_evaluations": results[:10]
    }

    # Save report to results directory
    results_dir = current_dir / "results"
    results_dir.mkdir(parents=True, exist_ok=True)
    report_file = results_dir / "eval_report.json"
    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    return report


if __name__ == "__main__":
    rep = run_evaluation()
    print("================ MEDIKIOSK MODULE B EVALUATION ================")
    print(f"Total Benchmark Records: {rep['evaluation_summary']['total_benchmark_records']}")
    print(f"Top-1 Drug Match Accuracy: {rep['evaluation_summary']['top_1_drug_accuracy'] * 100:.1f}%")
    print(f"Top-3 Drug Match Accuracy: {rep['evaluation_summary']['top_3_drug_accuracy'] * 100:.1f}%")
    print(f"Average Character Error Rate (CER): {rep['evaluation_summary']['average_cer'] * 100:.2f}%")
    print(f"Vernacular Sig Accuracy: {rep['evaluation_summary']['vernacular_sig_accuracy'] * 100:.1f}%")
    print(f"Auto-Approved Precision: {rep['evaluation_summary']['auto_approved_precision'] * 100:.1f}%")
    print("==============================================================")
