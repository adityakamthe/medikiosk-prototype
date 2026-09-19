"""
Bhashini ULCA Integration & Vernacular Clinical Translation Engine
Stage 4: Regional Vernacular Script & NMT Normalization

Implements:
1. Connection to Government of India Bhashini ULCA API Gateway.
2. High-speed deterministic fallback dictionary for regional sig instructions
   (Bengali, Hindi, Tamil, Telugu, Marathi, Gujarati).
3. Normalization of regional numerals ('১, ২, ৩', '१, २, ३') into standard Arabic digits ('1, 2, 3').
4. Translation of colloquial meal relationships ('খাওয়ার পর' -> 'After Meals', 'খাওয়ার আগে' -> 'Before Meals').
"""

import os
import re
import json
import unicodedata
import urllib.request
from typing import Dict, Any, Optional

# Deterministic mappings of regional Indic digits to Arabic digits
VERNACULAR_DIGITS_MAP = {
    # Bengali / Assamese
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
    # Devanagari (Hindi, Marathi)
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
    '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
    # Gujarati
    '૦': '0', '૧': '1', '૨': '2', '૩': '3', '૪': '4',
    '૫': '5', '૬': '6', '૭': '7', '૮': '8', '૯': '9'
}

# Clinical Sig terms mapping for offline deterministic resolution
VERNACULAR_SIG_DICTIONARY = {
    # Bengali terms (both canonical U+09DF and combined U+09AF+U+09BC)
    'খাওয়ার পর': 'After Meals (PC)',
    'খাওয়ার পর': 'After Meals (PC)',
    'খাওয়ার আগে': 'Before Meals (AC)',
    'খাওয়ার আগে': 'Before Meals (AC)',
    'রাতে শোয়ার আগে': 'At Bedtime (HS)',
    'রাতে শোওয়ার আগে': 'At Bedtime (HS)',
    'দিনে একবার': 'Once Daily (OD)',
    'দিনে দুইবার': 'Twice Daily (BD)',
    'দিনে তিনবার': 'Three Times Daily (TDS)',
    'খালি পেটে': 'On Empty Stomach',
    'ভরা পেটে': 'After Meals (PC)',
    'ব্যথা হলে': 'As Needed for Pain (PRN)',
    'জ্বর আসলে': 'As Needed for Fever (PRN)',

    # Hindi terms
    'खाने के बाद': 'After Meals (PC)',
    'खाने से पहले': 'Before Meals (AC)',
    'रात को सोते समय': 'At Bedtime (HS)',
    'दिन में एक बार': 'Once Daily (OD)',
    'दिन में दो बार': 'Twice Daily (BD)',
    'दिन में तीन बार': 'Three Times Daily (TDS)',
    'खाली पेट': 'On Empty Stomach',
    'दर्द होने पर': 'As Needed for Pain (PRN)',
    'बुखार आने पर': 'As Needed for Fever (PRN)',

    # Tamil terms
    'சாப்பாட்டுக்கு பின்': 'After Meals (PC)',
    'சாப்பாட்டுக்கு முன்': 'Before Meals (AC)',
    'ஒரு நாளைக்கு ஒரு முறை': 'Once Daily (OD)',
    'ஒரு நாளைக்கு இரு முறை': 'Twice Daily (BD)',

    # Telugu terms
    'భోజనం తర్వాత': 'After Meals (PC)',
    'భోజనానికి ముందు': 'Before Meals (AC)',
    'రోజుకు ఒకసారి': 'Once Daily (OD)',
    'రోజుకు రెండుసార్లు': 'Twice Daily (BD)',

    # Marathi terms
    'जेवणानंतर': 'After Meals (PC)',
    'जेवणापूर्वी': 'Before Meals (AC)',
    'रात्री झोपताना': 'At Bedtime (HS)',
    'दिवसातून एकदा': 'Once Daily (OD)',
    'दिवसातून दोनदा': 'Twice Daily (BD)',
    'दिवसातून तीनदा': 'Three Times Daily (TDS)',
    'उपाशी पोटी': 'On Empty Stomach',
    'वेदना झाल्यास': 'As Needed for Pain (PRN)',
    'ताप आल्यास': 'As Needed for Fever (PRN)',

    # Gujarati terms
    'જમ્યા પછી': 'After Meals (PC)',
    'જમ્યા પહેલાં': 'Before Meals (AC)',
    'રાત્રે સૂતી વખતે': 'At Bedtime (HS)',
    'દિવસમાં એક વાર': 'Once Daily (OD)',
    'દિવસમાં બે વાર': 'Twice Daily (BD)',
    'ભૂખ્યા પેટે': 'On Empty Stomach'
}


def normalize_vernacular_numerals(text: str) -> str:
    """
    Replaces regional numeral characters with standard Arabic numerals.
    e.g. '১+০+১' -> '1+0+1'
    """
    result = []
    for char in text:
        result.append(VERNACULAR_DIGITS_MAP.get(char, char))
    return ''.join(result)


def translate_vernacular_sig(text: str) -> Dict[str, Any]:
    """
    Translates vernacular clinical instructions and sig codes into standardized
    English clinical syntax.
    """
    normalized_digits = normalize_vernacular_numerals(text)
    translated_text = normalized_digits
    matches_found = []

    # Check for direct phrase matches
    for vernacular, english in VERNACULAR_SIG_DICTIONARY.items():
        if vernacular in translated_text:
            translated_text = translated_text.replace(vernacular, english)
            matches_found.append({"vernacular": vernacular, "english": english})

    # Standardize common shorthand patterns like '1+0+1' or '1-0-1'
    shorthand_match = re.search(r'([0-9])\s*[\+\-\/]\s*([0-9])\s*[\+\-\/]\s*([0-9])', translated_text)
    if shorthand_match:
        m, a, n = shorthand_match.groups()
        sig_explanation = f"Morning: {m}, Afternoon: {a}, Night: {n}"
        translated_text = f"{translated_text} [{sig_explanation}]"

    was_translated = len(matches_found) > 0 or normalized_digits != text

    # Compute standardized hyphenated code (e.g. '1-0-1 After Meals')
    clean_base = translated_text.split(" [")[0].strip()
    clean_base_clean = clean_base.replace("(PC)", "").replace("(AC)", "").replace("(OD)", "").replace("(BD)", "").replace("(TDS)", "").strip()
    clean_base_clean = re.sub(r'\s+', ' ', clean_base_clean)
    standardized_hyphen = clean_base_clean
    shorthand_norm = re.search(r'([0-9])\s*[\+\-\/]\s*([0-9])\s*[\+\-\/]\s*([0-9])', clean_base_clean)
    if shorthand_norm:
        m, a, n = shorthand_norm.groups()
        remainder = clean_base_clean.replace(shorthand_norm.group(0), "").strip()
        standardized_hyphen = f"{m}-{a}-{n} {remainder}".strip()

    return {
        "original_text": text,
        "translated_text": translated_text.strip(),
        "standardized_sig": standardized_hyphen,
        "was_translated": was_translated,
        "vernacular_terms_resolved": matches_found
    }


def call_bhashini_nmt_api(
    source_text: str,
    source_lang: str = "bn",
    target_lang: str = "en"
) -> Optional[str]:
    """
    Calls the official Government of India Bhashini ULCA NMT API if credentials are set.
    """
    user_id = os.environ.get("BHASHINI_USER_ID") or os.environ.get("BHASHINI_UDYAT_KEY")
    api_key = os.environ.get("BHASHINI_API_KEY") or os.environ.get("BHASHINI_INFERENCE_KEY")
    pipeline_id = os.environ.get("BHASHINI_PIPELINE_ID") or "64332142daac500bd5c70325"

    if not (user_id and api_key):
        # Fall back directly to deterministic dictionary
        return None

    try:
        endpoint = "https://nmt-api.bhashini.gov.in/v1/translate"
        payload = {
            "pipelineTasks": [
                {
                    "taskType": "translation",
                    "config": {
                        "language": {
                            "sourceLanguage": source_lang,
                            "targetLanguage": target_lang
                        }
                    }
                }
            ],
            "inputData": {
                "input": [{"source": source_text}]
            }
        }
        headers = {
            "Content-Type": "application/json",
            "userID": user_id,
            "ulcaApiKey": api_key
        }
        req = urllib.request.Request(
            endpoint,
            data=json.dumps(payload).encode('utf-8'),
            headers=headers
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
            output = data.get("pipelineResponse", [{}])[0].get("output", [{}])[0].get("target")
            return output
    except Exception as e:
        # Fallback to local dictionary
        return None
