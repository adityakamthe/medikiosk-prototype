"""
Unit tests for CDSCO Pharmacopeia Fuzzy Normalizer and Grounding Engine.
"""
import pytest
try:
    from module_b.normalizers.cdsco_normalizer import (
        cdsco_matcher,
        compute_composite_score,
        calculate_metaphone_similarity,
        extract_dosage_form_and_strength
    )
    from module_b.schemas.verification_schemas import VerificationActionGate
except ImportError:
    from normalizers.cdsco_normalizer import (
        cdsco_matcher,
        compute_composite_score,
        calculate_metaphone_similarity,
        extract_dosage_form_and_strength
    )
    from schemas.verification_schemas import VerificationActionGate


def test_metaphone_and_composite_score():
    s1 = "Ultrafen"
    s2 = "Ultraphen"
    meta_sim = calculate_metaphone_similarity(s1, s2)
    assert meta_sim == 1.0  # Phonetically identical in Double Metaphone ('ALTRFN' == 'ALTRFN')

    comp = compute_composite_score(s1, s2)
    assert comp >= 0.85


def test_cdsco_match_ultrafen_plus():
    match = cdsco_matcher.normalize_candidate("Ultrafen plus")
    assert match["matched"] is True
    assert match["matched_brand"] == "Ultrafen Plus"
    assert "Diclofenac" in match["generic_name"]
    assert "Paracetamol" in match["generic_name"]
    assert match["composite_score"] >= 0.88
    assert match["action_gate"] == VerificationActionGate.AUTO_APPROVED.value


def test_dosage_form_and_strength_parsing():
    parsed = extract_dosage_form_and_strength("Tab Cartilix 500mg")
    assert parsed["form"] == "TABLET"
    assert parsed["strength"] == "500mg"


def test_verbal_context_anchoring_boost():
    # Matching an ambiguous snippet with and without verbal audio context
    query = "pan"
    without_ctx = cdsco_matcher.normalize_candidate(query, verbal_transcript="")
    with_ctx = cdsco_matcher.normalize_candidate(
        query,
        verbal_transcript="Doctor recommended Pantocid 40mg for acid reflux"
    )
    assert with_ctx["matched_brand"] in ["Pantocid", "Pan-D"]
    assert with_ctx["verbal_context_boost"] == 0.10
    assert with_ctx["composite_score"] > without_ctx["composite_score"]


def test_action_gate_thresholds():
    # Exact known
    high_match = cdsco_matcher.normalize_candidate("Telma 40")
    assert high_match["action_gate"] == VerificationActionGate.AUTO_APPROVED.value

    # Heavily distorted
    distorted_match = cdsco_matcher.normalize_candidate("XyzRandomNonsense123")
    assert distorted_match["action_gate"] in [
        VerificationActionGate.MANUAL_REVIEW_REQUIRED.value,
        VerificationActionGate.AMBIGUOUS_REQUIRES_CONFIRMATION.value
    ]
