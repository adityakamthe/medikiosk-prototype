"""
Dual-VLM Ensemble Consensus Engine for MediKiosk Module B
Implements parallel deciphering agreement logic between Pixtral 12B and Qwen2.5-VL.
"""

import re
from typing import Dict, Any, List, Optional
from rapidfuzz import fuzz


def normalize_token_name(token: str) -> str:
    """
    Strips dosage forms and punctuation to compare core drug names.
    """
    clean = token.lower().strip()
    clean = re.sub(r'^(tab|tablet|cap|capsule|syr|syrup|inj)\.?\s+', '', clean)
    clean = re.sub(r'\b\d+(\.\d+)?\s*(mg|ml|mcg|gm|iu)?\b', '', clean)
    clean = re.sub(r'[^\w\s]', '', clean).strip()
    return clean


def resolve_token_agreement(
    vlm1_meds: List[Dict[str, Any]],
    vlm2_meds: List[Dict[str, Any]],
    verbal_context: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Ensemble Agreement Logic:
    1. If both models yield matching drug tokens (similarity >= 0.85), auto-confirm.
    2. If tokens conflict (e.g. Baclofen 10mg vs Bactrim 10mg), bypass hard consensus
       and forward both candidate strings to CDSCO normalizer for candidate ranking.
    """
    try:
        from module_b.normalizers.cdsco_normalizer import match_against_cdsco
    except (ImportError, ValueError):
        try:
            from ..normalizers.cdsco_normalizer import match_against_cdsco
        except (ImportError, ValueError):
            from cdsco_normalizer import match_against_cdsco

    resolved_medications: List[Dict[str, Any]] = []
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

        # Case B: Conflicting tokens (sim between 0.30 and 0.85)
        elif best_match_idx is not None and best_sim >= 0.30:
            used_vlm2_indices.add(best_match_idx)
            med2 = vlm2_meds[best_match_idx]
            name2 = str(med2.get("name", "")).strip()

            cdsco1 = match_against_cdsco(name1, verbal_context=verbal_context)
            cdsco2 = match_against_cdsco(name2, verbal_context=verbal_context)

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
            cdsco = match_against_cdsco(name1, verbal_context=verbal_context)
            resolved_medications.append({
                "name": name1,
                "dose": med1.get("dose", ""),
                "frequency": med1.get("frequency", ""),
                "consensus_status": "SINGLE_VLM_CANDIDATE",
                "vlm1_raw": name1,
                "cdsco_grounding": cdsco
            })

    # Remaining VLM2 candidates
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
    vlm1_output: Dict[str, Any],
    vlm2_output: Dict[str, Any],
    verbal_context: Optional[str] = None
) -> Dict[str, Any]:
    """
    Ensembles Pixtral 12B and Qwen2.5-VL outputs and applies token agreement logic.
    """
    meds1 = vlm1_output.get("medications", [])
    meds2 = vlm2_output.get("medications", [])

    resolved_medications = resolve_token_agreement(meds1, meds2, verbal_context=verbal_context)

    labs1 = vlm1_output.get("lab_values", [])
    labs2 = vlm2_output.get("lab_values", [])
    combined_labs = []
    seen_lab_names = set()

    for l in labs1 + labs2:
        lname = str(l.get("name", "")).lower().strip()
        if lname and lname not in seen_lab_names:
            seen_lab_names.add(lname)
            combined_labs.append(l)

    return {
        "ensemble_engine": "Pixtral-12B + Qwen2.5-VL-7B",
        "verbal_context_anchored": bool(verbal_context),
        "medications": resolved_medications,
        "lab_values": combined_labs,
        "diagnoses": vlm1_output.get("diagnoses", []) or vlm2_output.get("diagnoses", [])
    }


class VLMEnsemble:
    """VLM Ensemble consensus wrapper."""
    def resolve_tokens(self, vlm1_meds: List[Dict[str, Any]], vlm2_meds: List[Dict[str, Any]], verbal_context: Optional[str] = None) -> List[Dict[str, Any]]:
        return resolve_token_agreement(vlm1_meds, vlm2_meds, verbal_context=verbal_context)

    def run_ensemble(self, vlm1_output: Dict[str, Any], vlm2_output: Dict[str, Any], verbal_context: Optional[str] = None) -> Dict[str, Any]:
        return run_ensemble_decoding(vlm1_output, vlm2_output, verbal_context=verbal_context)


vlm_ensemble = VLMEnsemble()
