"""
Tests for Secondary Independent Recognizer & Cross-Model Disagreement Gate
"""
import pytest
from ocr.secondary_recognizer import (
    evaluate_cross_model_agreement,
    apply_disagreement_gate,
    normalize_drug_token
)
from schemas.verification_schemas import VerificationActionGate


def test_token_normalization():
    assert normalize_drug_token("Tab Augmentin 625mg") == "augmentin"
    assert normalize_drug_token("Cap Omeprazole 20mg") == "omeprazole"
    assert normalize_drug_token("Syr Glycodin") == "glycodin"


def test_cross_model_agreement_exact():
    is_agreed, score, status = evaluate_cross_model_agreement(
        "Tab Paracetamol 650mg",
        "Paracetamol 650"
    )
    assert is_agreed is True
    assert score == 1.0
    assert status == "AGREED_EXACT"


def test_cross_model_agreement_high_similarity():
    # Minor character difference due to cursive artifact
    is_agreed, score, status = evaluate_cross_model_agreement(
        "Augmentin 625",
        "Augmentin 625mg"
    )
    assert is_agreed is True
    assert score >= 0.85


def test_cross_model_disagreement_clamps_to_manual_review():
    # Primary model says "Augmentin", secondary says "Azithral"
    is_agreed, score, status = evaluate_cross_model_agreement(
        "Tab Augmentin 625mg",
        "Tab Azithral 500mg"
    )
    assert is_agreed is False
    assert status == "DISAGREED"
    assert score < 0.85

    # Test gate application
    med_item = {
        "name": "Augmentin 625",
        "action_gate": VerificationActionGate.AUTO_APPROVED.value
    }

    gated_item = apply_disagreement_gate(
        medication_item=med_item,
        primary_candidate="Augmentin 625",
        secondary_candidate="Azithral 500",
        current_action_gate=med_item["action_gate"]
    )

    # Must be unconditionally clamped to MANUAL_REVIEW_REQUIRED
    assert gated_item["action_gate"] == VerificationActionGate.MANUAL_REVIEW_REQUIRED.value
    assert gated_item["recognizer_outputs"]["is_agreed"] is False
    assert gated_item["recognizer_outputs"]["primary_vlm"] == "Augmentin 625"
    assert gated_item["recognizer_outputs"]["secondary_recognizer"] == "Azithral 500"


def test_agreement_retains_auto_approval():
    med_item = {
        "name": "Pan 40",
        "action_gate": VerificationActionGate.AUTO_APPROVED.value
    }

    gated_item = apply_disagreement_gate(
        medication_item=med_item,
        primary_candidate="Tab Pan 40",
        secondary_candidate="Pan 40mg",
        current_action_gate=med_item["action_gate"]
    )

    assert gated_item["action_gate"] == VerificationActionGate.AUTO_APPROVED.value
    assert gated_item["recognizer_outputs"]["is_agreed"] is True
