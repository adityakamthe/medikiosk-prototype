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
