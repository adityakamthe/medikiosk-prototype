"""
LOINC Code and Canonical Diagnostic Lab Mapper.
Maps raw lab test names from Indian clinical and diagnostic reports to standardized LOINC codes,
canonical units, reference intervals, and panic value boundaries.
"""
import re
from typing import Any

from rapidfuzz import fuzz, process

# Comprehensive Lab Dictionary with LOINC Codes, Canonical Units, Standard Ranges, and Panic Limits
LOINC_DATABASE: dict[str, dict[str, Any]] = {
    "HEMOGLOBIN": {
        "loinc_code": "718-7",
        "display_name": "Hemoglobin [Mass/volume] in Blood",
        "canonical_name": "Hemoglobin",
        "panel": "Complete Blood Count (CBC)",
        "canonical_unit": "g/dL",
        "unit_aliases": ["g/dl", "gm/dl", "gm%", "g%", "grams/dl", "g/l"],
        "unit_conversion": {"g/l": 0.1},
        "reference_min": 12.0,
        "reference_max": 17.5,
        "panic_low": 7.0,
        "panic_high": 20.0,
        "aliases": [
            "hb", "hgb", "haemoglobin", "hemoglobin", "blood hb",
            "total hemoglobin", "hb level"
        ]
    },
    "SERUM_CREATININE": {
        "loinc_code": "2160-0",
        "display_name": "Creatinine [Mass/volume] in Serum or Plasma",
        "canonical_name": "Serum Creatinine",
        "panel": "Renal Function Test (RFT)",
        "canonical_unit": "mg/dL",
        "unit_aliases": ["mg/dl", "mg%", "milligram/dl", "umol/l", "µmol/l"],
        "unit_conversion": {"umol/l": 0.0113, "µmol/l": 0.0113},
        "reference_min": 0.6,
        "reference_max": 1.2,
        "panic_low": None,
        "panic_high": 4.0,
        "aliases": [
            "s. creatinine", "serum creatinine", "sr. creatinine", "sr creatinine",
            "s creatinine", "creatinine", "creat", "serum creat"
        ]
    },
    "POTASSIUM": {
        "loinc_code": "2823-3",
        "display_name": "Potassium [Moles/volume] in Serum or Plasma",
        "canonical_name": "Potassium",
        "panel": "Electrolytes",
        "canonical_unit": "mEq/L",
        "unit_aliases": ["meq/l", "mmol/l", "meq/litre", "mmol/litre"],
        "unit_conversion": {"mmol/l": 1.0},
        "reference_min": 3.5,
        "reference_max": 5.1,
        "panic_low": 2.5,
        "panic_high": 6.0,
        "aliases": [
            "s. potassium", "serum potassium", "sr. potassium", "potassium",
            "k+", "serum k+", "s. k+", "k level"
        ]
    },
    "SODIUM": {
        "loinc_code": "2951-2",
        "display_name": "Sodium [Moles/volume] in Serum or Plasma",
        "canonical_name": "Sodium",
        "panel": "Electrolytes",
        "canonical_unit": "mEq/L",
        "unit_aliases": ["meq/l", "mmol/l", "meq/litre"],
        "unit_conversion": {"mmol/l": 1.0},
        "reference_min": 135.0,
        "reference_max": 145.0,
        "panic_low": 120.0,
        "panic_high": 160.0,
        "aliases": [
            "s. sodium", "serum sodium", "sr. sodium", "sodium", "na+", "serum na+", "s. na+"
        ]
    },
    "FASTING_BLOOD_SUGAR": {
        "loinc_code": "1558-6",
        "display_name": "Fasting glucose [Mass/volume] in Serum or Plasma",
        "canonical_name": "Fasting Blood Sugar",
        "panel": "Diabetic Profile",
        "canonical_unit": "mg/dL",
        "unit_aliases": ["mg/dl", "mg%", "milligram/dl", "mmol/l"],
        "unit_conversion": {"mmol/l": 18.0182},
        "reference_min": 70.0,
        "reference_max": 99.0,
        "panic_low": 50.0,
        "panic_high": 400.0,
        "aliases": [
            "fbs", "fasting blood sugar", "fasting blood glucose", "fasting glucose",
            "sugar fasting", "glucose fasting", "fbg"
        ]
    },
    "RANDOM_BLOOD_SUGAR": {
        "loinc_code": "2345-7",
        "display_name": "Glucose [Mass/volume] in Serum or Plasma",
        "canonical_name": "Random Blood Sugar",
        "panel": "Diabetic Profile",
        "canonical_unit": "mg/dL",
        "unit_aliases": ["mg/dl", "mg%", "mmol/l"],
        "unit_conversion": {"mmol/l": 18.0182},
        "reference_min": 70.0,
        "reference_max": 140.0,
        "panic_low": 50.0,
        "panic_high": 400.0,
        "aliases": [
            "rbs", "random blood sugar", "random glucose", "blood sugar random",
            "blood sugar", "glucose random", "grbs"
        ]
    },
    "HBA1C": {
        "loinc_code": "4548-4",
        "display_name": "Hemoglobin A1c/Hemoglobin.total in Blood",
        "canonical_name": "HbA1c",
        "panel": "Diabetic Profile",
        "canonical_unit": "%",
        "unit_aliases": ["%", "percent"],
        "unit_conversion": {},
        "reference_min": 4.0,
        "reference_max": 5.6,
        "panic_low": None,
        "panic_high": 12.0,
        "aliases": [
            "hba1c", "glycated hemoglobin", "glycosylated hemoglobin", "a1c",
            "hba1-c", "glyco hb"
        ]
    },
    "PLATELET_COUNT": {
        "loinc_code": "777-3",
        "display_name": "Platelets [#/volume] in Blood",
        "canonical_name": "Platelet Count",
        "panel": "Complete Blood Count (CBC)",
        "canonical_unit": "10^3/uL",
        "unit_aliases": ["10^3/ul", "k/ul", "thou/ul", "/ul", "cells/cumm", "lakhs/cumm", "lac/cumm"],
        "unit_conversion": {
            "cells/cumm": 0.001,
            "/ul": 0.001,
            "lakhs/cumm": 100.0,
            "lac/cumm": 100.0
        },
        "reference_min": 150.0,
        "reference_max": 450.0,
        "panic_low": 20.0,
        "panic_high": 1000.0,
        "aliases": [
            "platelet count", "platelets", "plt", "platelet", "thrombocytes",
            "total platelet count"
        ]
    },
    "TOTAL_BILIRUBIN": {
        "loinc_code": "1975-2",
        "display_name": "Bilirubin.total [Mass/volume] in Serum or Plasma",
        "canonical_name": "Total Bilirubin",
        "panel": "Liver Function Test (LFT)",
        "canonical_unit": "mg/dL",
        "unit_aliases": ["mg/dl", "mg%", "umol/l"],
        "unit_conversion": {"umol/l": 0.0585},
        "reference_min": 0.2,
        "reference_max": 1.2,
        "panic_low": None,
        "panic_high": 15.0,
        "aliases": [
            "total bilirubin", "s. bilirubin total", "serum bilirubin", "s bilirubin",
            "t. bilirubin", "t bilirubin", "bili total"
        ]
    },
    "SGPT_ALT": {
        "loinc_code": "1742-6",
        "display_name": "Alanine aminotransferase [Enzymatic activity/volume] in Serum or Plasma",
        "canonical_name": "SGPT (ALT)",
        "panel": "Liver Function Test (LFT)",
        "canonical_unit": "U/L",
        "unit_aliases": ["u/l", "iu/l", "u/litre"],
        "unit_conversion": {},
        "reference_min": 7.0,
        "reference_max": 56.0,
        "panic_low": None,
        "panic_high": 500.0,
        "aliases": [
            "sgpt", "alt", "alanine aminotransferase", "sgpt (alt)", "serum alt",
            "s. alt", "s. sgpt"
        ]
    },
    "SGOT_AST": {
        "loinc_code": "1920-8",
        "display_name": "Aspartate aminotransferase [Enzymatic activity/volume] in Serum or Plasma",
        "canonical_name": "SGOT (AST)",
        "panel": "Liver Function Test (LFT)",
        "canonical_unit": "U/L",
        "unit_aliases": ["u/l", "iu/l", "u/litre"],
        "unit_conversion": {},
        "reference_min": 10.0,
        "reference_max": 40.0,
        "panic_low": None,
        "panic_high": 500.0,
        "aliases": [
            "sgot", "ast", "aspartate aminotransferase", "sgot (ast)", "serum ast",
            "s. ast", "s. sgot"
        ]
    },
    "BLOOD_UREA": {
        "loinc_code": "3094-0",
        "display_name": "Urea nitrogen [Mass/volume] in Serum or Plasma",
        "canonical_name": "Blood Urea Nitrogen (BUN)",
        "panel": "Renal Function Test (RFT)",
        "canonical_unit": "mg/dL",
        "unit_aliases": ["mg/dl", "mg%", "mmol/l"],
        "unit_conversion": {"mmol/l": 2.8},
        "reference_min": 7.0,
        "reference_max": 20.0,
        "panic_low": None,
        "panic_high": 100.0,
        "aliases": [
            "blood urea", "bun", "blood urea nitrogen", "s. urea", "serum urea",
            "urea"
        ]
    },
    "SERUM_CALCIUM": {
        "loinc_code": "17861-6",
        "display_name": "Calcium [Mass/volume] in Serum or Plasma",
        "canonical_name": "Serum Calcium",
        "panel": "Electrolytes",
        "canonical_unit": "mg/dL",
        "unit_aliases": ["mg/dl", "mg%", "mmol/l"],
        "unit_conversion": {"mmol/l": 4.0},
        "reference_min": 8.5,
        "reference_max": 10.5,
        "panic_low": 6.5,
        "panic_high": 13.0,
        "aliases": [
            "serum calcium", "s. calcium", "calcium", "ca++", "total calcium",
            "s calcium", "ca level"
        ]
    },
    "TSH": {
        "loinc_code": "3016-3",
        "display_name": "Thyrotropin [Units/volume] in Serum or Plasma",
        "canonical_name": "Thyroid Stimulating Hormone (TSH)",
        "panel": "Thyroid Profile",
        "canonical_unit": "uIU/mL",
        "unit_aliases": ["uiu/ml", "miu/l", "µiu/ml", "u/l"],
        "unit_conversion": {},
        "reference_min": 0.4,
        "reference_max": 4.5,
        "panic_low": 0.01,
        "panic_high": 20.0,
        "aliases": [
            "tsh", "thyroid stimulating hormone", "s. tsh", "serum tsh",
            "thyrotropin", "ultrasensitive tsh"
        ]
    },
    "TOTAL_CHOLESTEROL": {
        "loinc_code": "2093-3",
        "display_name": "Cholesterol [Mass/volume] in Serum or Plasma",
        "canonical_name": "Total Cholesterol",
        "panel": "Lipid Profile",
        "canonical_unit": "mg/dL",
        "unit_aliases": ["mg/dl", "mmol/l"],
        "unit_conversion": {"mmol/l": 38.67},
        "reference_min": 0.0,
        "reference_max": 200.0,
        "panic_low": None,
        "panic_high": 300.0,
        "aliases": [
            "total cholesterol", "s. cholesterol", "serum cholesterol", "cholesterol",
            "t. cholesterol"
        ]
    }
}


class LOINCMapper:
    """
    Standardizes raw diagnostic test names to official LOINC definitions and normalizes units.
    """

    def __init__(self):
        # Build lookup table of alias -> test key
        self.alias_lookup: dict[str, str] = {}
        for key, entry in LOINC_DATABASE.items():
            for alias in entry["aliases"]:
                self.alias_lookup[alias.lower().strip()] = key

        self.all_alias_strings = list(self.alias_lookup.keys())

    def clean_test_query(self, query: str) -> str:
        """Sanitize query string removing leading numbering, bullets, colons."""
        cleaned = re.sub(r"^\s*[\d\.\-\*\•]+\s*", "", query)
        cleaned = re.sub(r"[:\(\)\,\_]", " ", cleaned)
        cleaned = re.sub(r"\s+", " ", cleaned).strip().lower()
        return cleaned

    def map_test_name(self, test_name: str) -> dict[str, Any] | None:
        """
        Maps a raw test name to its corresponding LOINC entity using exact alias or fuzzy matching.
        """
        if not test_name:
            return None

        clean_name = self.clean_test_query(test_name)

        # 1. Exact alias match
        if clean_name in self.alias_lookup:
            return LOINC_DATABASE[self.alias_lookup[clean_name]]

        # Check sub-phrase match (e.g. "blood haemoglobin test" -> "haemoglobin")
        for alias, key in self.alias_lookup.items():
            if f" {alias} " in f" {clean_name} ":
                return LOINC_DATABASE[key]

        # 2. RapidFuzz matching across alias strings
        match = process.extractOne(
            clean_name,
            self.all_alias_strings,
            scorer=fuzz.token_set_ratio
        )

        if match and match[1] >= 82.0:
            best_alias = match[0]
            target_key = self.alias_lookup[best_alias]
            return LOINC_DATABASE[target_key]

        return None

    def standardize_unit_and_value(
        self,
        value: float,
        unit: str | None,
        loinc_entry: dict[str, Any]
    ) -> tuple[float, str]:
        """
        Converts the value to the canonical unit if a known conversion ratio exists.
        """
        if not unit:
            return value, loinc_entry["canonical_unit"]

        cleaned_unit = unit.strip().lower()
        canonical_unit = loinc_entry["canonical_unit"]

        # If already matching canonical or alias
        if cleaned_unit == canonical_unit.lower():
            return value, canonical_unit

        # Check conversions
        conversions = loinc_entry.get("unit_conversion", {})
        if cleaned_unit in conversions:
            factor = conversions[cleaned_unit]
            converted_value = round(value * factor, 3)
            return converted_value, canonical_unit

        # Return original with canonical unit label if in alias list
        if cleaned_unit in [a.lower() for a in loinc_entry.get("unit_aliases", [])]:
            return value, canonical_unit

        return value, unit


# Singleton instance
loinc_mapper = LOINCMapper()
LOINC_MASTER_REGISTRY = LOINC_DATABASE


def map_to_loinc(test_name: str) -> dict[str, Any] | None:
    """Convenience helper to map a test name to its LOINC database record."""
    return loinc_mapper.map_test_name(test_name)


def normalize_lab_unit(value: float, unit: str | None, test_name: str) -> tuple[float, str | None]:
    """Convenience helper to standardize value and unit for a given test."""
    entry = loinc_mapper.map_test_name(test_name)
    if entry:
        return loinc_mapper.standardize_unit_and_value(value, unit, entry)
    return value, unit
