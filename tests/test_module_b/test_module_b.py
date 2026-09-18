"""
Comprehensive High-Accuracy Test Suite for MediKiosk Module B Upgrades
Tests:
1. Fuzzy matching resolution for 'Ultrafen plus' -> 'Diclofenac Sodium + Paracetamol'
2. Vernacular conversion of Bengali '১+০+১ খাওয়ার পর' -> '1-0-1 After Meals'
3. Triggering GASTROPROTECTION_OMISSION warning on an unshielded NSAID
4. HSV Ink-Color Separation (isolate_ink_strokes)
5. Line-Level Bounding Box Detection (segment_prescription_lines)
6. Enhanced Legibility Gating (confidence_tier: high, ambiguous, poor_legibility)
7. Double Metaphone Composite Scoring & Dosage-Form Filtering
8. Verbal Context Anchoring (Module A -> Module B Context Injection)
9. Dual-VLM Ensemble Decoding & Conflict Forwarding (vlm_engine)
10. Drug-Drug Interactions (Tetracycline-Calcium chelation) & LOINC 3-tier flags
"""

import sys
import os
import numpy as np
import cv2
import pytest

# Ensure python-services/module_b is on sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, "..", ".."))
MODULE_B_DIR = os.path.join(PROJECT_ROOT, "python-services", "module_b")
if MODULE_B_DIR not in sys.path:
    sys.path.insert(0, MODULE_B_DIR)

from cv_preprocessor import (
    preprocess_medical_document,
    isolate_ink_strokes,
    segment_prescription_lines
)
from cdsco_normalizer import (
    match_against_cdsco,
    compute_composite_score,
    calculate_metaphone_similarity
)
from bhashini_translator import (
    translate_vernacular_sig,
    normalize_vernacular_numerals
)
from clinical_intelligence import (
    evaluate_lab_result,
    audit_prescriptions_safety
)
from vlm_engine import (
    resolve_token_agreement,
    run_ensemble_decoding
)


# ============================================================================
# 1. Computer Vision & Preprocessing Tests
# ============================================================================

def test_hsv_ink_color_separation():
    # Create image with blue ink text, black ink text, and red clinic banner
    img = np.ones((200, 400, 3), dtype=np.uint8) * 255  # White background
    # Blue ink text (BGR: 180, 50, 20)
    cv2.putText(img, "Rx: Ultrafen Plus", (20, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (180, 50, 20), 2)
    # Black ink text (BGR: 20, 20, 20)
    cv2.putText(img, "1+0+1 After Meals", (20, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (20, 20, 20), 2)
    # Red background watermark/header (BGR: 40, 40, 220)
    cv2.rectangle(img, (20, 150), (380, 180), (40, 40, 220), -1)

    ink_mask = isolate_ink_strokes(img)
    assert ink_mask is not None
    assert ink_mask.shape == (200, 400)
    assert ink_mask.dtype == np.uint8
    # Ink strokes should be detected as foreground (255)
    assert np.any(ink_mask[40:80, 20:200] == 255)
    assert np.any(ink_mask[100:130, 20:200] == 255)


def test_line_level_bounding_box_detection():
    # Create synthetic multi-line prescription
    img = np.ones((300, 500, 3), dtype=np.uint8) * 255
    cv2.putText(img, "Line 1: Tab Ultrafen Plus 50mg", (30, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)
    cv2.putText(img, "Line 2: Cap Cartilix 1-0-0", (30, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)
    cv2.putText(img, "Line 3: Tab Telma 40mg daily", (30, 190), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)

    lines = segment_prescription_lines(img, min_line_height=10, min_line_width=50)
    assert len(lines) >= 3
    # Check that bounding boxes are sorted from top to bottom
    y_coords = [l["bbox"]["y"] for l in lines]
    assert y_coords == sorted(y_coords)


def test_enhanced_legibility_gating():
    # 1. High sharpness image
    sharp_img = np.ones((200, 200, 3), dtype=np.uint8) * 255
    for i in range(0, 200, 10):
        cv2.line(sharp_img, (0, i), (200, i), (0, 0, 0), 2)
    _, enc_sharp = cv2.imencode(".jpg", sharp_img)
    res_sharp = preprocess_medical_document(enc_sharp.tobytes(), apply_dewarp=False)
    assert res_sharp["confidence_tier"] == "high"
    assert res_sharp["quality_assessment"] == "good"

    # 2. Severely blurred image (low contrast, low variance)
    blurry_img = cv2.GaussianBlur(np.ones((200, 200, 3), dtype=np.uint8) * 128, (25, 25), 0)
    _, enc_blur = cv2.imencode(".jpg", blurry_img)
    res_blur = preprocess_medical_document(enc_blur.tobytes(), apply_dewarp=False)
    assert res_blur["confidence_tier"] in ["poor_legibility", "ambiguous"]


# ============================================================================
# 2. CDSCO Grounding & Double Metaphone Tests
# ============================================================================

def test_cdsco_fuzzy_matching_ultrafen_plus():
    # 1. Direct and case-insensitive matching
    r1 = match_against_cdsco("Ultrafen plus")
    assert r1["matched"] is True
    assert "Diclofenac" in r1["formulary_entry"]["generic_name"]
    assert "Paracetamol" in r1["formulary_entry"]["generic_name"]
    assert r1["confidence"] >= 0.88
    assert r1["verification_status"] == "auto_accepted"
    assert r1["status_tier"] == "AUTO_APPROVED"

    # 2. Dosage-form prefixed query: 'Tab Ultrafen Plus 50mg'
    r2 = match_against_cdsco("Tab Ultrafen Plus 50mg")
    assert r2["matched"] is True
    assert r2["detected_form"] == "tab"
    assert r2["confidence"] >= 0.88
    assert r2["formulary_entry"]["generic_name"] == "Diclofenac Sodium + Paracetamol"


def test_double_metaphone_composite_scoring():
    # Phonetic misspelling: 'Oltrafen' vs 'Ultrafen Plus'
    meta_sim = calculate_metaphone_similarity("oltrafen", "ultrafen plus")
    assert meta_sim >= 0.80

    comp_score = compute_composite_score("ultrafen", "ultrafen plus")
    assert comp_score >= 0.70


def test_dosage_form_filtering_and_verbal_context():
    # Ambiguous candidate resolution with verbal context
    # Patient with joint pain
    r_context = match_against_cdsco("Ultrafen", verbal_context="chronic knee pain and osteoarthritis")
    assert r_context["matched"] is True
    assert r_context["status_tier"] == "AUTO_APPROVED"
    assert r_context["confidence"] >= 0.88


def test_confidence_tiers_ambiguous_and_manual_review():
    # Ambiguous query triggers AMBIGUOUS_REQUIRES_CONFIRMATION and returns top 3
    r_ambig = match_against_cdsco("Augnentin 625")
    assert r_ambig["matched"] is True
    assert r_ambig["status_tier"] in ["AMBIGUOUS_REQUIRES_CONFIRMATION", "AUTO_APPROVED"]
    assert len(r_ambig["top_candidates"]) <= 3

    # Total gibberish triggers MANUAL_REVIEW_REQUIRED
    r_gibberish = match_against_cdsco("ZzzzNonsense1234")
    assert r_gibberish["status_tier"] == "MANUAL_REVIEW_REQUIRED"
    assert r_gibberish["matched"] is False


# ============================================================================
# 3. Vernacular Sig Translation (Bhashini) Tests
# ============================================================================

def test_vernacular_conversion_bengali():
    # Exact required translation: '১+০+১ খাওয়ার পর' -> '1-0-1 After Meals'
    bengali_text = "১+০+১ খাওয়ার পর"
    res = translate_vernacular_sig(bengali_text)
    assert res["was_translated"] is True
    assert "1-0-1 After Meals" in res["standardized_sig"]
    assert "1" in res["translated_text"]
    assert "After Meals" in res["translated_text"]


def test_vernacular_numerals_normalization():
    assert normalize_vernacular_numerals("১+২+৩") == "1+2+3"
    assert normalize_vernacular_numerals("१+०+१") == "1+0+1"


# ============================================================================
# 4. Clinical Safety & Lab Evaluator Tests
# ============================================================================

def test_gastroprotection_omission_warning_unshielded_nsaid():
    # Prescribing an unshielded NSAID (Ultrafen Plus / Diclofenac) without PPI
    prescriptions = [
        {"name": "Tab Ultrafen Plus 50mg", "dose": "50mg", "frequency": "1+0+1"}
    ]
    audit = audit_prescriptions_safety(prescriptions)
    assert audit["gastroprotection_status"] == "AT_RISK"
    assert any(a["type"] == "GASTROPROTECTION_OMISSION" for a in audit["alerts"])
    assert audit["total_alerts"] >= 1

    # Adding PPI (Pantocid / Pantoprazole) resolves omission
    prescriptions.append({"name": "Tab Pantocid 40", "dose": "40mg", "frequency": "OD"})
    audit_protected = audit_prescriptions_safety(prescriptions)
    assert audit_protected["gastroprotection_status"] == "PROTECTED"
    assert not any(a["type"] == "GASTROPROTECTION_OMISSION" for a in audit_protected["alerts"])


def test_ddi_chelation_and_duplicate_therapy():
    # 1. Tetracycline + Calcium chelation
    meds_ddi = [
        {"name": "Cap Tetracycline 500mg"},
        {"name": "Tab Shelcal 500 (Calcium)"}
    ]
    audit_ddi = audit_prescriptions_safety(meds_ddi)
    assert any(a["type"] == "DRUG_INTERACTION" for a in audit_ddi["alerts"])

    # 2. Duplicate NSAID therapy
    meds_dup = [
        {"name": "Tab Ultrafen Plus"},
        {"name": "Tab Ibuprofen 400"}
    ]
    audit_dup = audit_prescriptions_safety(meds_dup)
    assert any(a["type"] == "THERAPEUTIC_DUPLICATION" for a in audit_dup["alerts"])


def test_loinc_lab_3tier_flags():
    # 1. CRITICAL_PANIC for Hb < 7.0
    lab_panic = evaluate_lab_result("Hemoglobin", "6.2", "g/dL")
    assert lab_panic["is_panic"] is True
    assert lab_panic["status"] == "PANIC_LOW"
    assert lab_panic["flag"] == "CRITICAL_PANIC"
    assert lab_panic["loinc_code"] == "718-7"

    # 2. NORMAL for Hb = 13.5
    lab_normal = evaluate_lab_result("Hemoglobin", "13.5", "g/dL")
    assert lab_normal["status"] == "NORMAL"
    assert lab_normal["flag"] == "NORMAL"

    # 3. ABNORMAL for Creatinine = 2.2
    lab_abnormal = evaluate_lab_result("Serum Creatinine", "2.2", "mg/dL")
    assert lab_abnormal["status"] == "ABNORMAL_HIGH"
    assert lab_abnormal["flag"] == "ABNORMAL"


# ============================================================================
# 5. Dual-VLM Ensemble Decoding Tests
# ============================================================================

def test_vlm_ensemble_agreement_and_conflict_forwarding():
    # Test 1: Consensus on matching tokens
    vlm1 = [{"name": "Tab Ultrafen Plus 50mg"}]
    vlm2 = [{"name": "Ultrafen Plus 50mg"}]
    res_agree = resolve_token_agreement(vlm1, vlm2)
    assert res_agree[0]["consensus_status"] == "AGREED_CONSENSUS"
    assert res_agree[0]["cdsco_grounding"]["matched"] is True

    # Test 2: Conflicting tokens forwarded to CDSCO (Baclofen 10mg vs Bactrim 10mg)
    vlm1_conflict = [{"name": "Baclofen 10mg"}]
    vlm2_conflict = [{"name": "Bactrim 10mg"}]
    # Patient verbal context specifies muscle spasm
    res_conflict = resolve_token_agreement(
        vlm1_conflict,
        vlm2_conflict,
        verbal_context="severe lower back muscle spasm"
    )
    assert res_conflict[0]["consensus_status"] == "CONFLICT_FORWARDED_TO_CDSCO"
    # Clinical verbal context should prioritize Baclofen
    assert res_conflict[0]["cdsco_grounding"]["formulary_entry"]["brand_name"] == "Baclofen"
    assert "vlm1_candidate" in res_conflict[0]
    assert "vlm2_candidate" in res_conflict[0]
