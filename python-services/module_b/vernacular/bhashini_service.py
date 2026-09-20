"""
Bhashini ULCA Integration & Vernacular Clinical Translation Engine
Stage 4: Regional Vernacular Script & NMT Normalization.
"""

import json
import os
import re
import urllib.request
from pathlib import Path
from typing import Any

# Fallback in-memory mappings if YAML is absent
FALLBACK_DIGITS_MAP = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
    '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
    '૦': '0', '૧': '1', '૨': '2', '૩': '3', '૪': '4',
    '૫': '5', '૬': '6', '૭': '7', '૮': '8', '૯': '9'
}

FALLBACK_SIG_DICTIONARY = {
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
    'खाने के बाद': 'After Meals (PC)',
    'खाने से पहले': 'Before Meals (AC)',
    'रात को सोते समय': 'At Bedtime (HS)',
    'दिन में एक बार': 'Once Daily (OD)',
    'दिन में दो बार': 'Twice Daily (BD)',
    'दिन में तीन बार': 'Three Times Daily (TDS)',
    'खाली पेट': 'On Empty Stomach',
    'दर्द होने पर': 'As Needed for Pain (PRN)',
    'बुखार आने पर': 'As Needed for Fever (PRN)',
    'சாப்பாட்டுக்கு பின்': 'After Meals (PC)',
    'சாப்பாட்டுக்கு முன்': 'Before Meals (AC)',
    'ஒரு நாளைக்கு ஒரு முறை': 'Once Daily (OD)',
    'ஒரு நாளைக்கு இரு முறை': 'Twice Daily (BD)',
    'భోజనం తర్వాత': 'After Meals (PC)',
    'భోజనానికి ముందు': 'Before Meals (AC)',
    'రోజుకు ఒకసారి': 'Once Daily (OD)',
    'రోజుకు రెండుసార్లు': 'Twice Daily (BD)'
}

def load_sig_lexicon() -> dict[str, Any]:
    """Loads externalized sig lexicon YAML file with fallback to in-memory dictionaries."""
    lexicon_path = Path(__file__).resolve().parent / "sig_lexicon.yaml"
    if lexicon_path.exists():
        try:
            import yaml
            with open(lexicon_path, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
                if isinstance(data, dict):
                    return data
        except Exception:
            pass
    return {
        "numeral_mappings": FALLBACK_DIGITS_MAP,
        "frequency": {},
        "duration": {"patterns": []},
        "timing_hi_bn": FALLBACK_SIG_DICTIONARY
    }

SIG_LEXICON = load_sig_lexicon()

# Expose backward-compatible global mappings
VERNACULAR_DIGITS_MAP = SIG_LEXICON.get("numeral_mappings", FALLBACK_DIGITS_MAP)
_timing_raw = SIG_LEXICON.get("timing_hi_bn", FALLBACK_SIG_DICTIONARY)
VERNACULAR_SIG_DICTIONARY = {}
for k, v in _timing_raw.items():
    if isinstance(v, dict):
        VERNACULAR_SIG_DICTIONARY[k] = v.get("english", str(v))
    else:
        VERNACULAR_SIG_DICTIONARY[k] = str(v)


def normalize_vernacular_numerals(text: str) -> str:
    """
    Replaces regional numeral characters with standard Arabic numerals.
    e.g. '১+০+১' -> '1+0+1'
    """
    result = []
    for char in text:
        result.append(VERNACULAR_DIGITS_MAP.get(char, char))
    return ''.join(result)


def detect_script_language(text: str) -> str:
    """Detects script language from Unicode ranges."""
    for ch in text:
        cp = ord(ch)
        if 0x0980 <= cp <= 0x09FF:
            return "Bengali"
        if 0x0900 <= cp <= 0x097F:
            return "Hindi"
        if 0x0B80 <= cp <= 0x0BFF:
            return "Tamil"
        if 0x0C00 <= cp <= 0x0C7F:
            return "Telugu"
    return "English"


def regex_preprocess_sig(text: str) -> dict[str, Any]:
    """
    Pre-processes raw sig strings using compiled regex patterns for standard clinical shorthand:
    - Normalizes Indic numerals
    - Resolves duration patterns (e.g., 3/7 -> 3 days, 1/52 -> 1 week)
    - Resolves frequency patterns (e.g., 1+0+1 -> 1-0-1, BD -> Twice Daily)
    """
    normalized = normalize_vernacular_numerals(text)
    detected_duration = None
    standardized_duration = None

    # Check duration patterns from lexicon
    duration_patterns = SIG_LEXICON.get("duration", {}).get("patterns", [])
    for pat in duration_patterns:
        rgx = pat.get("regex")
        unit = pat.get("unit", "")
        if rgx:
            m = re.search(rgx, normalized)
            if m:
                val = m.group(1)
                detected_duration = m.group(0)
                standardized_duration = f"{val} {unit}"
                # Replace notation in text with standardized phrase
                normalized = re.sub(rgx, standardized_duration, normalized)
                break

    # Standardize plus/slash notation: 1+0+1, 1/0/1, 1-0-1
    shorthand_match = re.search(r'([0-9])\s*[\+\-\/]\s*([0-9])\s*[\+\-\/]\s*([0-9])', normalized)
    standardized_code = None
    if shorthand_match:
        m_morning, a_afternoon, n_night = shorthand_match.groups()
        standardized_code = f"{m_morning}-{a_afternoon}-{n_night}"
        normalized = re.sub(r'([0-9])\s*[\+\-\/]\s*([0-9])\s*[\+\-\/]\s*([0-9])', standardized_code, normalized)

    # Check frequency regex patterns
    freq_entries = SIG_LEXICON.get("frequency", {})
    detected_freq = None
    for f_data in freq_entries.values():
        rgx = f_data.get("regex")
        if rgx and re.search(rgx, normalized):
            detected_freq = f_data
            if not standardized_code and f_data.get("code"):
                standardized_code = f_data.get("code")
            break

    return {
        "preprocessed_text": normalized,
        "standardized_code": standardized_code,
        "detected_duration": standardized_duration or detected_duration,
        "detected_frequency": detected_freq
    }


def translate_vernacular_sig(text: str, source: str = "primary_vlm") -> dict[str, Any]:
    """
    Translates vernacular clinical instructions and sig codes into standardized
    English clinical syntax, including 'standardized_sig' in hyphenated format (e.g. '1-0-1 After Meals').
    Includes source attribution ("primary_vlm" or "bhashini_ocr").
    """
    detected_lang = detect_script_language(text)
    preproc = regex_preprocess_sig(text)
    translated_text = preproc["preprocessed_text"]
    matches_found = []

    # Map colloquial timing phrases to standard sigs
    phrase_substitutions = [
        (r'(?i)(सुबह और शाम|दिन में दो बार|দিনে দুইবার)', '1-0-1'),
        (r'(?i)(दिन में तीन बार|দিনে তিনবার)', '1-1-1'),
        (r'(?i)(दिन में एक बार|দিনে একবার)', '1-0-0'),
        (r'(?i)(भोजन के बाद|खाने के बाद|খাওয়ার পর|খাওয়ার পর)', 'After Meals')
    ]
    for pattern, repl in phrase_substitutions:
        if re.search(pattern, translated_text):
            translated_text = re.sub(pattern, repl, translated_text)

    # Direct phrase replacement from dictionary
    for vernacular, english in VERNACULAR_SIG_DICTIONARY.items():
        if vernacular in translated_text:
            translated_text = translated_text.replace(vernacular, english)
            matches_found.append({"vernacular": vernacular, "english": english})

    # Shorthand explanation
    shorthand_match = re.search(r'([0-9])\s*[\+\-\/]\s*([0-9])\s*[\+\-\/]\s*([0-9])', translated_text)
    if shorthand_match:
        m, a, n = shorthand_match.groups()
        sig_explanation = f"Morning: {m}, Afternoon: {a}, Night: {n}"
        translated_text = f"{translated_text} [{sig_explanation}]"

    was_translated = len(matches_found) > 0 or translated_text != text or detected_lang != "English"

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
    elif preproc.get("standardized_code"):
        remainder = clean_base_clean.replace(preproc["standardized_code"], "").strip()
        standardized_hyphen = f"{preproc['standardized_code']} {remainder}".strip()

    # Determine frequency category
    freq_cat = "UNKNOWN"
    if "1-0-1" in standardized_hyphen or "Twice Daily" in translated_text:
        freq_cat = "BID"
    elif "1-1-1" in standardized_hyphen or "Three Times Daily" in translated_text:
        freq_cat = "TDS"
    elif "1-0-0" in standardized_hyphen or "0-0-1" in standardized_hyphen or "Once Daily" in translated_text:
        freq_cat = "OD"
    elif "1-1-1-1" in standardized_hyphen or "Four Times Daily" in translated_text:
        freq_cat = "QID"
    elif preproc.get("detected_frequency"):
        freq_cat = preproc["detected_frequency"].get("category", "UNKNOWN")

    return {
        "original_text": text,
        "translated_text": translated_text.strip(),
        "standardized_sig": standardized_hyphen,
        "detected_language": detected_lang,
        "frequency_category": freq_cat,
        "duration": preproc.get("detected_duration"),
        "was_translated": was_translated,
        "vernacular_terms_resolved": matches_found,
        "source": source
    }


def call_bhashini_ocr_api(
    image_bytes_or_b64: Any,
    source_lang: str = "hi"
) -> str | None:
    """
    Calls the official Government of India Bhashini ULCA OCR API.
    Sends cropped prescription line strips with Indic script to extract vernacular text.
    """
    user_id = os.environ.get("BHASHINI_USER_ID")
    api_key = os.environ.get("BHASHINI_API_KEY")

    if not (user_id and api_key):
        return None

    try:
        import base64
        if isinstance(image_bytes_or_b64, bytes):
            b64_str = base64.b64encode(image_bytes_or_b64).decode('utf-8')
        elif isinstance(image_bytes_or_b64, str):
            b64_str = image_bytes_or_b64.split(",", 1)[1] if "," in image_bytes_or_b64 else image_bytes_or_b64
        else:
            return None

        endpoint = os.environ.get("BHASHINI_OCR_ENDPOINT", "https://ocr-api.bhashini.gov.in/v1/ocr")
        payload = {
            "pipelineTasks": [
                {
                    "taskType": "ocr",
                    "config": {
                        "language": {
                            "sourceLanguage": source_lang
                        }
                    }
                }
            ],
            "inputData": {
                "image": [{"imageContent": b64_str}]
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
        with urllib.request.urlopen(req, timeout=6) as resp:
            data = json.loads(resp.read().decode())
            output = data.get("pipelineResponse", [{}])[0].get("output", [{}])[0].get("source")
            return output
    except Exception:
        return None


def route_indic_crop_to_bhashini(
    crop_image: Any,
    detected_script: str = "hi"
) -> dict[str, Any]:
    """
    Routes an Indic line crop directly to the Bhashini Indic-OCR endpoint,
    followed by the clinical vernacular sig normalizer.
    """
    ocr_text = call_bhashini_ocr_api(crop_image, source_lang=detected_script)
    if not ocr_text:
        return {
            "ocr_success": False,
            "raw_transcription": "",
            "sig_result": None
        }

    sig_res = translate_vernacular_sig(ocr_text, source="bhashini_ocr")
    return {
        "ocr_success": True,
        "raw_transcription": ocr_text,
        "sig_result": sig_res
    }


def call_bhashini_nmt_api(
    source_text: str,
    source_lang: str = "bn",
    target_lang: str = "en"
) -> str | None:
    """
    Calls the official Government of India Bhashini ULCA NMT API if credentials are set.
    """
    user_id = os.environ.get("BHASHINI_USER_ID")
    api_key = os.environ.get("BHASHINI_API_KEY")
    pipeline_id = os.environ.get("BHASHINI_PIPELINE_ID")

    if not (user_id and api_key and pipeline_id):
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
    except Exception:
        return None


class BhashiniTranslator:
    """Vernacular and Indic Sig Translation Service with OCR Hook."""
    def translate_vernacular_sig(self, text: str) -> dict[str, Any]:
        return translate_vernacular_sig(text)

    def normalize_numerals(self, text: str) -> str:
        return normalize_vernacular_numerals(text)

    def call_ocr_api(self, image_data: Any, source_lang: str = "hi") -> str | None:
        return call_bhashini_ocr_api(image_data, source_lang=source_lang)

    def route_crop_to_ocr(self, crop_image: Any, detected_script: str = "hi") -> dict[str, Any]:
        return route_indic_crop_to_bhashini(crop_image, detected_script=detected_script)


bhashini_translator = BhashiniTranslator()

