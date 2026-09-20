"""
Vernacular Translation and Indic Script Normalization for MediKiosk Module B
"""
from .bhashini_service import (
    VERNACULAR_DIGITS_MAP,
    VERNACULAR_SIG_DICTIONARY,
    call_bhashini_nmt_api,
    normalize_vernacular_numerals,
    translate_vernacular_sig,
)

__all__ = [
    "VERNACULAR_DIGITS_MAP",
    "VERNACULAR_SIG_DICTIONARY",
    "call_bhashini_nmt_api",
    "normalize_vernacular_numerals",
    "translate_vernacular_sig"
]
