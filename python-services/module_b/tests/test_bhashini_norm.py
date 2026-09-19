"""
Unit tests for Bhashini Vernacular Translation and Sig Normalization Service.
"""
import pytest
from vernacular.bhashini_service import (
    bhashini_translator,
    normalize_vernacular_numerals,
    translate_vernacular_sig
)


def test_bengali_numeral_and_sig_translation():
    raw_bengali = "১+০+১ খাওয়ার পর"
    res = bhashini_translator.translate_vernacular_sig(raw_bengali)
    assert res["was_translated"] is True
    assert res["detected_language"] == "Bengali"
    assert res["standardized_sig"] == "1-0-1 After Meals"
    assert res["frequency_category"] == "BID"


def test_hindi_sig_translation_food_timing():
    raw_hindi = "दिन में दो बार भोजन के बाद"
    res = bhashini_translator.translate_vernacular_sig(raw_hindi)
    assert res["was_translated"] is True
    assert res["detected_language"] == "Hindi"
    assert "1-0-1" in res["standardized_sig"]
    assert "After Meals" in res["standardized_sig"]


def test_hindi_morning_evening_sig():
    raw_hindi = "सुबह और शाम खाने के बाद"
    res = bhashini_translator.translate_vernacular_sig(raw_hindi)
    assert res["was_translated"] is True
    assert "1-0-1" in res["standardized_sig"]
    assert "After Meals" in res["standardized_sig"]


def test_tamil_sig_translation():
    raw_tamil = "சாப்பாட்டுக்கு பின்"
    res = bhashini_translator.translate_vernacular_sig(raw_tamil)
    assert res["was_translated"] is True
    assert "After Meals" in res["standardized_sig"]


def test_indic_numerals_normalization():
    bengali_num = "১-০-১"
    devanagari_num = "१-०-२"
    assert normalize_vernacular_numerals(bengali_num) == "1-0-1"
    assert normalize_vernacular_numerals(devanagari_num) == "1-0-2"


def test_commonwealth_shorthand_lexicon_decoding():
    from vlm_engine import decode_shorthand_sig
    assert "Twice daily" in decode_shorthand_sig("1+0+1")
    assert "Twice daily" in decode_shorthand_sig("BD")
    assert "Once daily" in decode_shorthand_sig("OD")
    assert "At bedtime" in decode_shorthand_sig("HS")
    assert "1 week" in decode_shorthand_sig("1/52")
    assert "3 days" in decode_shorthand_sig("3/7")
    assert "After meals" in decode_shorthand_sig("খাওয়ার পর")
    assert "Before meals" in decode_shorthand_sig("खाने से पहले")


def test_bhashini_ocr_hook_graceful_routing():
    from vernacular.bhashini_service import route_indic_crop_to_bhashini, call_bhashini_ocr_api
    # Synthetic byte crop
    dummy_crop = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
    # When no external API key is configured, gracefully returns fallback without crashing
    res = route_indic_crop_to_bhashini(dummy_crop, detected_script="hi")
    assert isinstance(res, dict)
    assert "ocr_success" in res
    assert res["ocr_success"] is False

