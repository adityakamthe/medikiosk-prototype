"""
Unit tests for Module B Evaluation Harness and Calibration
"""
from eval_harness.run_eval import load_benchmark_dataset, run_evaluation
from eval_harness.threshold_calibration import calculate_cer


def test_benchmark_dataset_integrity():
    dataset = load_benchmark_dataset()
    assert len(dataset) >= 50
    for item in dataset:
        assert "raw_ocr_or_transcription" in item
        assert "expected_brand" in item
        assert "expected_sig" in item


def test_cer_calculation():
    # Exact match -> 0.0 CER
    assert calculate_cer("Augmentin", "Augmentin") == 0.0

    # 1 substitution error: "Augmentin" vs "Augmentim"
    cer_1 = calculate_cer("Augmentin", "Augmentim")
    assert 0.0 < cer_1 <= 0.20

    # Completely different
    cer_diff = calculate_cer("Dolo", "Xyz12345")
    assert cer_diff > 0.50


def test_eval_harness_execution_metrics():
    report = run_evaluation(profile="standard")
    summary = report["evaluation_summary"]

    assert summary["total_benchmark_records"] >= 50
    assert summary["top_1_drug_accuracy"] >= 0.85  # Expect >= 85% Top-1
    assert summary["top_3_drug_accuracy"] >= 0.90  # Expect >= 90% Top-3
    assert summary["vernacular_sig_accuracy"] >= 0.90  # Expect >= 90% vernacular
    assert summary["auto_approved_precision"] >= 0.95  # Zero/near-zero false positives
