"""
Dual-VLM Ensemble Decoding Engine for MediKiosk Module B
Implements:
1. Parallel Deciphering pass using Pixtral 12B and Qwen2.5-VL-7B (or Groq/Mistral).
2. Ensemble Agreement Logic:
   - Matching tokens (similarity >= 0.85): automatically confirmed.
   - Conflicting tokens (e.g. 'Baclofen 10mg' vs 'Bactrim 10mg'): bypass hard consensus
     and forward both candidate strings as alternatives to cdsco_normalizer for candidate ranking.
3. Integration with CDSCO formulary and verbal context anchoring.
"""

import re
from typing import Any

from cdsco_normalizer import match_against_cdsco
from rapidfuzz import fuzz

COMMONWEALTH_SHORTHAND_LEXICON: dict[str, str] = {
    "1+0+1": "Twice daily (1-0-1)",
    "bd": "Twice daily",
    "bid": "Twice daily",
    "1+0+0": "Once daily (1-0-0)",
    "od": "Once daily",
    "0+0+1": "At bedtime (0-0-1)",
    "hs": "At bedtime",
    "sos": "As needed (PRN)",
    "1+1+1": "Three times daily (1-1-1)",
    "tds": "Three times daily",
    "tid": "Three times daily",
    "1/52": "1 week",
    "2/52": "2 weeks",
    "3/7": "3 days",
    "5/7": "5 days",
    "খাওয়ার পর": "After meals (PC)",
    "খাওয়ার পর": "After meals (PC)",
    "खाने के बाद": "After meals (PC)",
    "খাওয়ার আগে": "Before meals (AC)",
    "খাওয়ার আগে": "Before meals (AC)",
    "खाने से पहले": "Before meals (AC)",
    "খালি পেটে": "On empty stomach",
    "खाली पेट": "On empty stomach"
}


def decode_shorthand_sig(sig: str) -> str:
    """
    Decodes Commonwealth and South Asian medical prescription abbreviations.
    """
    if not sig:
        return sig
    result = sig.strip()
    for short, expanded in COMMONWEALTH_SHORTHAND_LEXICON.items():
        pattern = r'(?i)\b' + re.escape(short) + r'\b' if short.isalnum() else re.escape(short)
        if re.search(pattern, result):
            result = re.sub(pattern, expanded, result)
    return result


def build_vlm_clinical_prompt(
    verbal_context: str | None = None,
    line_strips_count: int = 0
) -> str:
    """
    Builds the VLM system/transcription prompt with Medical Prior Injection
    from Module A verbal intake and Commonwealth/South Asian Shorthand instructions.
    """
    prior_clause = (
        f"CLINICAL PRIOR FROM VERBAL INTAKE (Module A Symptoms & History):\n{verbal_context}\n"
        "Anchor ambiguous cursive trade brands and diagnoses against this patient context."
        if verbal_context else
        "No prior verbal intake recorded."
    )

    line_crop_clause = (
        f"\nNOTE: {line_strips_count} high-resolution line crop strips are provided alongside the full image. "
        "Transcribe line-by-line using both views to eliminate line skipping and column misassociations."
        if line_strips_count > 0 else ""
    )

    return f"""You are an expert clinical transcription system specializing in Indian handwritten prescriptions and medical reports.

{prior_clause}{line_crop_clause}

COMMONWEALTH & SOUTH ASIAN SHORTHAND LEXICON:
• '1+0+1', 'BD', 'BID' -> Twice daily (1-0-1)
• '1+0+0', 'OD' -> Once daily (1-0-0)
• '0+0+1', 'HS' -> At bedtime (0-0-1)
• '1/52' -> 1 week; '3/7' -> 3 days
• 'খাওয়ার পর' / 'खाने के बाद' -> After meals (PC)
• 'খাওয়ার আগে' / 'खाने से पहले' -> Before meals (AC)

INSTRUCTIONS:
1. Extract medications (brand/generic name, form, strength, frequency, duration).
2. Extract lab investigations (name, value, unit, reference range).
3. Extract diagnoses and clinical findings.
4. Output valid JSON.
"""


def normalize_token_name(token: str) -> str:
    """
    Strips forms and punctuation to compare core drug names.
    """
    clean = token.lower().strip()
    clean = re.sub(r'^(tab|tablet|cap|capsule|syr|syrup|inj)\.?\s+', '', clean)
    clean = re.sub(r'\b\d+(\.\d+)?\s*(mg|ml|mcg|gm|iu)?\b', '', clean)
    clean = re.sub(r'[^\w\s]', '', clean).strip()
    return clean


def resolve_token_agreement(
    vlm1_meds: list[dict[str, Any]],
    vlm2_meds: list[dict[str, Any]],
    verbal_context: str | None = None
) -> list[dict[str, Any]]:
    """
    Applies Ensemble Agreement Logic:
    1. If both models yield matching drug tokens, automatically confirm the token.
    2. If tokens conflict (e.g. 'Baclofen 10mg' vs 'Bactrim 10mg'), bypass hard consensus
       and forward both candidate strings to cdsco_normalizer for candidate ranking.
    """
    resolved_medications: list[dict[str, Any]] = []
    used_vlm2_indices = set()

    for idx1, med1 in enumerate(vlm1_meds):
        name1 = str(med1.get("name", "")).strip()
        core1 = normalize_token_name(name1)

        best_match_idx = None
        best_sim = 0.0

        for idx2, med2 in enumerate(vlm2_meds):
            if idx2 in used_vlm2_indices:
                continue
            name2 = str(med2.get("name", "")).strip()
            core2 = normalize_token_name(name2)
            sim = fuzz.token_sort_ratio(core1, core2) / 100.0
            if sim > best_sim:
                best_sim = sim
                best_match_idx = idx2

        # Case A: High Agreement Consensus (sim >= 0.85)
        if best_match_idx is not None and best_sim >= 0.85:
            used_vlm2_indices.add(best_match_idx)
            med2 = vlm2_meds[best_match_idx]
            dose = med1.get("dose") or med2.get("dose") or ""
            freq = med1.get("frequency") or med2.get("frequency") or ""

            cdsco = match_against_cdsco(name1, verbal_context=verbal_context)

            resolved_medications.append({
                "name": name1,
                "dose": dose,
                "frequency": freq,
                "consensus_status": "AGREED_CONSENSUS",
                "vlm_consensus_score": round(best_sim, 3),
                "vlm1_raw": name1,
                "vlm2_raw": med2.get("name"),
                "cdsco_grounding": cdsco
            })

        # Case B: Conflicting tokens or VLM1 only
        elif best_match_idx is not None and best_sim >= 0.30:
            # Conflict detected: e.g. Baclofen 10mg vs Bactrim 10mg
            used_vlm2_indices.add(best_match_idx)
            med2 = vlm2_meds[best_match_idx]
            name2 = str(med2.get("name", "")).strip()

            # Forward BOTH to CDSCO normalizer for candidate ranking
            cdsco1 = match_against_cdsco(name1, verbal_context=verbal_context)
            cdsco2 = match_against_cdsco(name2, verbal_context=verbal_context)

            # Pick the higher grounded score, but preserve both alternatives
            score1 = cdsco1.get("composite_score", cdsco1.get("confidence", 0.0))
            score2 = cdsco2.get("composite_score", cdsco2.get("confidence", 0.0))

            primary_match = cdsco1 if score1 >= score2 else cdsco2
            primary_name = name1 if score1 >= score2 else name2

            resolved_medications.append({
                "name": primary_name,
                "dose": med1.get("dose") or med2.get("dose") or "",
                "frequency": med1.get("frequency") or med2.get("frequency") or "",
                "consensus_status": "CONFLICT_FORWARDED_TO_CDSCO",
                "vlm_consensus_score": round(best_sim, 3),
                "vlm1_candidate": {"raw": name1, "cdsco_match": cdsco1},
                "vlm2_candidate": {"raw": name2, "cdsco_match": cdsco2},
                "cdsco_grounding": primary_match
            })
        else:
            # Single VLM candidate
            cdsco = match_against_cdsco(name1, verbal_context=verbal_context)
            resolved_medications.append({
                "name": name1,
                "dose": med1.get("dose", ""),
                "frequency": med1.get("frequency", ""),
                "consensus_status": "SINGLE_VLM_CANDIDATE",
                "vlm1_raw": name1,
                "cdsco_grounding": cdsco
            })

    # Any remaining VLM2 candidates
    for idx2, med2 in enumerate(vlm2_meds):
        if idx2 not in used_vlm2_indices:
            name2 = str(med2.get("name", "")).strip()
            cdsco = match_against_cdsco(name2, verbal_context=verbal_context)
            resolved_medications.append({
                "name": name2,
                "dose": med2.get("dose", ""),
                "frequency": med2.get("frequency", ""),
                "consensus_status": "SINGLE_VLM_CANDIDATE",
                "vlm2_raw": name2,
                "cdsco_grounding": cdsco
            })

    return resolved_medications


def run_ensemble_decoding(
    vlm1_output: dict[str, Any],
    vlm2_output: dict[str, Any],
    verbal_context: str | None = None
) -> dict[str, Any]:
    """
    Ensembles Pixtral 12B and Qwen2.5-VL-7B outputs, merges laboratory evaluations,
    and applies token agreement logic for medications.
    """
    meds1 = vlm1_output.get("medications", [])
    meds2 = vlm2_output.get("medications", [])

    resolved_medications = resolve_token_agreement(meds1, meds2, verbal_context=verbal_context)

    # Union lab values with deduplication
    labs1 = vlm1_output.get("lab_values", [])
    labs2 = vlm2_output.get("lab_values", [])
    combined_labs = []
    seen_lab_names = set()

    for lab_item in labs1 + labs2:
        lname = str(lab_item.get("name", "")).lower().strip()
        if lname and lname not in seen_lab_names:
            seen_lab_names.add(lname)
            combined_labs.append(lab_item)

    return {
        "ensemble_engine": "Pixtral-12B + Qwen2.5-VL-7B",
        "verbal_context_anchored": bool(verbal_context),
        "medications": resolved_medications,
        "lab_values": combined_labs,
        "diagnoses": vlm1_output.get("diagnoses", []) or vlm2_output.get("diagnoses", [])
    }
