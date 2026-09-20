"""
Native FHIR R4 Dual-Coding Engine for MediKiosk Module C.
Provides simultaneous semantic mapping between:
1. Ministry of Ayush NAMASTE (National AYUSH Morbidity and Standardized Terminologies Electronic Portal)
2. WHO ICD-11 TM2 (Chapter 26: Traditional Medicine conditions - Module 2)
3. Modern Biomedicine: SNOMED CT and ICD-11 MMS.
"""
import sys
import os
import re
from typing import Dict, Any, List, Optional
from rapidfuzz import fuzz, process

_ENGINE_DIR = os.path.dirname(os.path.abspath(__file__))
_MODULE_C_DIR = os.path.abspath(os.path.join(_ENGINE_DIR, ".."))
_SERVICES_DIR = os.path.abspath(os.path.join(_MODULE_C_DIR, ".."))
for _p in [_MODULE_C_DIR, _SERVICES_DIR]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

try:
    from module_c.schemas.synthesis_schemas import DualCodingEntry
except (ImportError, ModuleNotFoundError, ValueError):
    try:
        from schemas.synthesis_schemas import DualCodingEntry
    except (ImportError, ModuleNotFoundError, ValueError):
        from ..schemas.synthesis_schemas import DualCodingEntry


DUAL_CODING_REGISTRY: Dict[str, Dict[str, Any]] = {
    "amlapitta": {
        "canonical_name": "Amlapitta (Hyperacidity / Dyspepsia)",
        "namaste_code": "AYU-DG-0142",
        "namaste_display": "Amlapitta (Vidagdha Pitta / Hyperacidity)",
        "who_tm2_code": "TM2-SD-8812",
        "who_tm2_display": "Disorder of Agni with Pitta Vitiation (WHO TM2 Chapter 26)",
        "snomed_code": "196727004",
        "snomed_display": "Functional Dyspepsia / Hyperacidity (Modern Biomedicine)",
        "icd11_mms_code": "MD90.0",
        "aliases": [
            "acid reflux", "hyperacidity", "amlapitta", "acidity", "heartburn",
            "gerd", "gastritis", "indigestion", "pet me jalan", "khatti dakar"
        ]
    },
    "sandhivata": {
        "canonical_name": "Sandhivata (Osteoarthritis / Joint Pain)",
        "namaste_code": "AYU-DG-0381",
        "namaste_display": "Sandhivata (Degenerative Joint Affliction / Vata in Sandhi)",
        "who_tm2_code": "TM2-SD-4102",
        "who_tm2_display": "Joint Disorder with Vata Dominance (WHO TM2 Chapter 26)",
        "snomed_code": "399269003",
        "snomed_display": "Osteoarthritis of joint (Modern Biomedicine)",
        "icd11_mms_code": "FA00",
        "aliases": [
            "osteoarthritis", "joint pain", "knee pain", "sandhivata", "arthritis",
            "ghutne me dard", "jodo me dard", "sandhi shoola", "knee osteoarthritis"
        ]
    },
    "kasa": {
        "canonical_name": "Kasa (Cough / Bronchitis)",
        "namaste_code": "AYU-DG-0210",
        "namaste_display": "Kasa (Vataja/Kaphaja Respiratory Impairment)",
        "who_tm2_code": "TM2-SD-1934",
        "who_tm2_display": "Pranavaha Srotas Disorder with Kapha-Vata Vitiation",
        "snomed_code": "49727002",
        "snomed_display": "Cough (Modern Biomedicine)",
        "icd11_mms_code": "MD10",
        "aliases": [
            "cough", "bronchitis", "kasa", "khasi", "balgham", "dry cough", "productive cough"
        ]
    },
    "madhumeha": {
        "canonical_name": "Madhumeha / Prameha (Type 2 Diabetes Mellitus)",
        "namaste_code": "AYU-DG-0415",
        "namaste_display": "Madhumeha / Vataja Prameha (Metabolic Glycemia)",
        "who_tm2_code": "TM2-SD-7719",
        "who_tm2_display": "Metabolic Disorder with Meda-Kleda Vitiation (WHO TM2)",
        "snomed_code": "44054006",
        "snomed_display": "Type 2 diabetes mellitus (Modern Biomedicine)",
        "icd11_mms_code": "5A11",
        "aliases": [
            "diabetes", "type 2 diabetes", "madhumeha", "prameha", "sugar", "high blood sugar", "t2dm"
        ]
    },
    "raktachapa": {
        "canonical_name": "Uchharaktachapa (Hypertension)",
        "namaste_code": "AYU-DG-0518",
        "namaste_display": "Uchharaktachapa (Raktavaha Srotas Pressure Elevation)",
        "who_tm2_code": "TM2-SD-5520",
        "who_tm2_display": "Rakta Dhatu and Vata Disorder (WHO TM2)",
        "snomed_code": "38341003",
        "snomed_display": "Essential hypertension (Modern Biomedicine)",
        "icd11_mms_code": "BA00",
        "aliases": [
            "hypertension", "high blood pressure", "high bp", "uchharaktachapa", "raktachapa"
        ]
    },
    "vibandha": {
        "canonical_name": "Vibandha (Constipation / Slow Motility)",
        "namaste_code": "AYU-DG-0128",
        "namaste_display": "Vibandha / Krura Koshtha (Apana Vata Impairment)",
        "who_tm2_code": "TM2-SD-3341",
        "who_tm2_display": "Disorder of Intestinal Transit with Vata Dominance (WHO TM2)",
        "snomed_code": "14760008",
        "snomed_display": "Constipation (Modern Biomedicine)",
        "icd11_mms_code": "DB11",
        "aliases": [
            "constipation", "vibandha", "kabz", "hard stools", "irregular bowel", "krura koshtha"
        ]
    },
    "jwara": {
        "canonical_name": "Jwara (Fever / Pyrexia)",
        "namaste_code": "AYU-DG-0001",
        "namaste_display": "Jwara (Sannipataja/Pittaja Pyrexia)",
        "who_tm2_code": "TM2-SD-1001",
        "who_tm2_display": "Disorder with Disturbed Thermal Homeostasis (WHO TM2)",
        "snomed_code": "386661006",
        "snomed_display": "Fever (Modern Biomedicine)",
        "icd11_mms_code": "MG26",
        "aliases": [
            "fever", "pyrexia", "jwara", "bukhar", "high temperature", "febrile illness"
        ]
    },
    "shirashoola": {
        "canonical_name": "Shirashoola (Headache / Cephalalgia)",
        "namaste_code": "AYU-DG-0622",
        "namaste_display": "Shirashoola / Suryavarta (Cephalalgia)",
        "who_tm2_code": "TM2-SD-6110",
        "who_tm2_display": "Cranial Pain Disorder with Vata-Pitta Influence (WHO TM2)",
        "snomed_code": "37796000",
        "snomed_display": "Migraine / Headache (Modern Biomedicine)",
        "icd11_mms_code": "8A80",
        "aliases": [
            "headache", "migraine", "shirashoola", "sar dard", "cephalalgia"
        ]
    },
    "atisara": {
        "canonical_name": "Atisara (Diarrhea / Gastroenteritis)",
        "namaste_code": "AYU-DG-0112",
        "namaste_display": "Atisara (Pitta/Ama induced Loose Stools)",
        "who_tm2_code": "TM2-SD-3305",
        "who_tm2_display": "Disorder of Fluid Excretion in Annavaha Srotas (WHO TM2)",
        "snomed_code": "62315008",
        "snomed_display": "Diarrhea (Modern Biomedicine)",
        "icd11_mms_code": "ME05",
        "aliases": [
            "diarrhea", "loose stools", "atisara", "dast", "gastroenteritis"
        ]
    },
    "vicharchika": {
        "canonical_name": "Vicharchika / Kushtha (Dermatitis / Eczema)",
        "namaste_code": "AYU-DG-0730",
        "namaste_display": "Kushtha / Vicharchika (Kaphapittaja Skin Lesion)",
        "who_tm2_code": "TM2-SD-8120",
        "who_tm2_display": "Skin Affliction with Rakta-Pitta Vitiation (WHO TM2)",
        "snomed_code": "43116000",
        "snomed_display": "Eczema / Dermatitis (Modern Biomedicine)",
        "icd11_mms_code": "EA80",
        "aliases": [
            "eczema", "dermatitis", "vicharchika", "skin allergy", "itching", "khujli", "rash"
        ]
    }
}


class DualCoder:
    """
    Simultaneous Dual-Coding Resolver mapping medical complaints to NAMASTE, WHO TM2, and SNOMED.
    """

    def __init__(self):
        self.alias_map: Dict[str, str] = {}
        for key, entry in DUAL_CODING_REGISTRY.items():
            for alias in entry["aliases"]:
                self.alias_map[alias.lower().strip()] = key
        self.all_aliases = list(self.alias_map.keys())

    def code_finding(self, query: str) -> Optional[DualCodingEntry]:
        """
        Maps a symptom or diagnosis string to concurrent NAMASTE, WHO TM2, and SNOMED codes.
        """
        if not query:
            return None

        clean_query = query.lower().strip()
        clean_query = re.sub(r'[^\w\s]', ' ', clean_query)
        clean_query = re.sub(r'\s+', ' ', clean_query).strip()

        # 1. Exact alias match
        if clean_query in self.alias_map:
            key = self.alias_map[clean_query]
            data = DUAL_CODING_REGISTRY[key]
            return DualCodingEntry(
                finding_text=query,
                namaste_code=data["namaste_code"],
                namaste_display=data["namaste_display"],
                who_tm2_code=data["who_tm2_code"],
                who_tm2_display=data["who_tm2_display"],
                snomed_code=data["snomed_code"],
                snomed_display=data["snomed_display"],
                icd11_mms_code=data.get("icd11_mms_code")
            )

        # 2. Word boundary containment
        for alias, key in self.alias_map.items():
            if f" {alias} " in f" {clean_query} ":
                data = DUAL_CODING_REGISTRY[key]
                return DualCodingEntry(
                    finding_text=query,
                    namaste_code=data["namaste_code"],
                    namaste_display=data["namaste_display"],
                    who_tm2_code=data["who_tm2_code"],
                    who_tm2_display=data["who_tm2_display"],
                    snomed_code=data["snomed_code"],
                    snomed_display=data["snomed_display"],
                    icd11_mms_code=data.get("icd11_mms_code")
                )

        # 3. Fuzzy match across all aliases
        best_match = process.extractOne(clean_query, self.all_aliases, scorer=fuzz.token_set_ratio)
        if best_match and best_match[1] >= 80.0:
            key = self.alias_map[best_match[0]]
            data = DUAL_CODING_REGISTRY[key]
            return DualCodingEntry(
                finding_text=query,
                namaste_code=data["namaste_code"],
                namaste_display=data["namaste_display"],
                who_tm2_code=data["who_tm2_code"],
                who_tm2_display=data["who_tm2_display"],
                snomed_code=data["snomed_code"],
                snomed_display=data["snomed_display"],
                icd11_mms_code=data.get("icd11_mms_code")
            )

        return None

    def code_multiple(self, queries: List[str]) -> List[DualCodingEntry]:
        """Maps a list of symptom/diagnosis queries."""
        results = []
        seen = set()
        for q in queries:
            entry = self.code_finding(q)
            if entry and entry.namaste_code not in seen:
                seen.add(entry.namaste_code)
                results.append(entry)
        return results


# Singleton instance
dual_coder = DualCoder()
