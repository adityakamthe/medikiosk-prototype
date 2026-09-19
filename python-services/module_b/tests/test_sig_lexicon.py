"""
Tests for Externalized Vernacular Sig Lexicon and Regex Pre-Processing
"""
import pytest
from vernacular.bhashini_service import (
    load_sig_lexicon,
    regex_preprocess_sig,
    translate_vernacular_sig,
    normalize_vernacular_numerals,
    SIG_LEXICON
)


def test_lexicon_loads_successfully():
    data = load_sig_lexicon()
    assert "numeral_mappings" in data
    assert "frequency" in data
    assert "duration" in data
    assert "timing_hi_bn" in data
    assert len(data["frequency"]) > 0
    assert len(data["duration"]["patterns"]) > 0


def test_regex_duration_preprocessing():
    # 3/7 -> 3 days
    res = regex_preprocess_sig("Paracetamol 650 1-0-1 x 3/7")
    assert res["detected_duration"] == "3 days"
    assert "3 days" in res["preprocessed_text"]

    # 1/52 -> 1 weeks
    res2 = regex_preprocess_sig("Amoxicillin 500mg TDS for 1/52")
    assert "1 weeks" in res2["preprocessed_text"] or res2["detected_duration"] == "1 weeks"

    # 1/12 -> 1 months
    res3 = regex_preprocess_sig("Thyronorm 50mcg 1-0-0 x 1/12")
    assert "1 months" in res3["preprocessed_text"] or res3["detected_duration"] == "1 months"


def test_regex_frequency_shorthand():
    # Plus notation
    res = regex_preprocess_sig("Tab Pantocid 40 1+0+1")
    assert res["standardized_code"] == "1-0-1"
    assert "1-0-1" in res["preprocessed_text"]

    # Slash notation
    res2 = regex_preprocess_sig("Tab Metformin 500 1/0/1")
    assert res2["standardized_code"] == "1-0-1"


def test_dual_source_tagging():
    # Primary VLM tag
    res_vlm = translate_vernacular_sig("খাওয়ার পর 1-0-1", source="primary_vlm")
    assert res_vlm["source"] == "primary_vlm"
    assert "After Meals" in res_vlm["translated_text"]

    # Bhashini OCR tag
    res_bhashini = translate_vernacular_sig("खाने के बाद", source="bhashini_ocr")
    assert res_bhashini["source"] == "bhashini_ocr"
    assert "After Meals" in res_bhashini["translated_text"]


def test_indic_numeral_normalization():
    # Bengali numerals: ১+০+১ -> 1+0+1
    norm_bn = normalize_vernacular_numerals("১+০+১")
    assert norm_bn == "1+0+1"

    # Hindi/Devanagari numerals: १-०-१ -> 1-0-1
    norm_hi = normalize_vernacular_numerals("१-०-१")
    assert norm_hi == "1-0-1"


def test_full_vernacular_sig_translation():
    # Bengali with timing and frequency
    bn_res = translate_vernacular_sig("দিনে দুইবার খাওয়ার পর")
    assert "1-0-1" in bn_res["standardized_sig"]
    assert "After Meals" in bn_res["standardized_sig"]
    assert bn_res["frequency_category"] == "BID"

    # Hindi with timing and frequency
    hi_res = translate_vernacular_sig("दिन में तीन बार खाने से पहले")
    assert "1-1-1" in hi_res["standardized_sig"]
    assert "Before Meals" in hi_res["standardized_sig"]
    assert hi_res["frequency_category"] == "TDS"
