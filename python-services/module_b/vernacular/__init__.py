"""
Vernacular Translation and Indic Script Normalization for MediKiosk Module B
"""
from .bhashini_service import (
    normalize_vernacular_numerals,
    translate_vernacular_sig,
    call_bhashini_nmt_api,
    VERNACULAR_DIGITS_MAP,
    VERNACULAR_SIG_DICTIONARY
)

__all__ = [
    "normalize_vernacular_numerals",
    "translate_vernacular_sig",
    "call_bhashini_nmt_api",
    "VERNACULAR_DIGITS_MAP",
    "VERNACULAR_SIG_DICTIONARY"
]
