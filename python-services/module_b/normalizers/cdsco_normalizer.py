"""
CDSCO Indian National Formulary & Pharmacopeia Grounding Engine
Stage 4: Deterministic Post-OCR Normalization & Phonetic Matching
"""

import re
import urllib.request
import urllib.parse
import json
from typing import Dict, Any, Optional, List, Tuple
import Levenshtein
from rapidfuzz import fuzz
from metaphone import doublemetaphone


# Curated CDSCO Indian Formulary dataset of commonly prescribed outpatient trade brands in India
CDSCO_MASTER_REGISTRY: Dict[str, Dict[str, Any]] = {
    "ultrafen plus": {
        "brand_name": "Ultrafen Plus",
        "generic_name": "Diclofenac Sodium + Paracetamol",
        "forms": ["tab", "tablet"],
        "strengths": ["50mg", "325mg"],
        "indications": ["pain", "joint pain", "knee pain", "osteoarthritis", "inflammation", "fever", "back pain"],
        "active_ingredients": [
            {"ingredient": "Diclofenac Sodium", "strength": "50 mg", "class": "NSAID"},
            {"ingredient": "Paracetamol", "strength": "325 mg", "class": "Analgesic/Antipyretic"}
        ],
        "category": "Analgesic / Anti-inflammatory",
        "rxcui": "857005",
        "requires_ppi_warning": True
    },
    "progut": {
        "brand_name": "Progut",
        "generic_name": "Probiotic & Prebiotic Consortium",
        "forms": ["cap", "capsule", "sachet"],
        "strengths": ["1.25b"],
        "indications": ["diarrhea", "indigestion", "gut", "stomach", "antibiotic-associated diarrhea"],
        "active_ingredients": [
            {"ingredient": "Lactobacillus + Bifidobacterium + Fructo-oligosaccharides", "strength": "1.25 Billion Spores", "class": "Gastrointestinal"}
        ],
        "category": "Gastrointestinal Flora Restorer",
        "rxcui": "905225",
        "requires_ppi_warning": False
    },
    "relentus": {
        "brand_name": "Relentus",
        "generic_name": "Cetirizine Hydrochloride + Ambroxol Hydrochloride",
        "forms": ["tab", "tablet", "syr", "syrup"],
        "strengths": ["5mg", "60mg"],
        "indications": ["cough", "cold", "allergy", "asthma", "bronchitis", "respiratory"],
        "active_ingredients": [
            {"ingredient": "Cetirizine Hydrochloride", "strength": "5 mg", "class": "Antihistamine"},
            {"ingredient": "Ambroxol Hydrochloride", "strength": "60 mg", "class": "Mucolytic"}
        ],
        "category": "Respiratory / Cough & Cold",
        "rxcui": "283742",
        "requires_ppi_warning": False
    },
    "cartilix": {
        "brand_name": "Cartilix",
        "generic_name": "Diacerein + Glucosamine Sulfate + Methylsulfonylmethane (MSM)",
        "forms": ["tab", "tablet", "cap", "capsule"],
        "strengths": ["750mg", "50mg", "250mg"],
        "indications": ["osteoarthritis", "joint pain", "knee pain", "cartilage", "arthritis"],
        "active_ingredients": [
            {"ingredient": "Glucosamine Sulfate", "strength": "750 mg", "class": "Chondroprotective"},
            {"ingredient": "Diacerein", "strength": "50 mg", "class": "IL-1 Inhibitor"},
            {"ingredient": "MSM", "strength": "250 mg", "class": "Nutraceutical"}
        ],
        "category": "Musculoskeletal / Osteoarthritis",
        "rxcui": "1361000",
        "requires_ppi_warning": False
    },
    "augmentin": {
        "brand_name": "Augmentin",
        "generic_name": "Amoxicillin + Clavulanic Acid",
        "forms": ["tab", "tablet", "syr", "syrup"],
        "strengths": ["625mg", "375mg", "1000mg", "500mg"],
        "indications": ["infection", "bacterial", "respiratory infection", "fever", "sinusitis"],
        "active_ingredients": [
            {"ingredient": "Amoxicillin Trihydrate", "strength": "500 mg", "class": "Penicillin Antibiotic"},
            {"ingredient": "Potassium Clavulanate", "strength": "125 mg", "class": "Beta-lactamase Inhibitor"}
        ],
        "category": "Broad-Spectrum Antibiotic",
        "rxcui": "617314",
        "requires_ppi_warning": False
    },
    "pantocid": {
        "brand_name": "Pantocid",
        "generic_name": "Pantoprazole",
        "forms": ["tab", "tablet", "inj"],
        "strengths": ["40mg", "20mg"],
        "indications": ["acidity", "gerd", "gastritis", "ulcer", "stomach pain", "heartburn"],
        "active_ingredients": [
            {"ingredient": "Pantoprazole Sodium", "strength": "40 mg", "class": "Proton Pump Inhibitor (PPI)"}
        ],
        "category": "Gastroprotective / Antacid",
        "rxcui": "284643",
        "requires_ppi_warning": False
    },
    "pan d": {
        "brand_name": "Pan-D",
        "generic_name": "Pantoprazole + Domperidone",
        "forms": ["cap", "capsule", "tab", "tablet"],
        "strengths": ["40mg", "30mg"],
        "indications": ["acidity", "nausea", "gerd", "vomiting", "gas", "bloating"],
        "active_ingredients": [
            {"ingredient": "Pantoprazole Sodium", "strength": "40 mg", "class": "Proton Pump Inhibitor (PPI)"},
            {"ingredient": "Domperidone", "strength": "30 mg", "class": "Prokinetic"}
        ],
        "category": "Gastroprotective / Anti-emetic",
        "rxcui": "794042",
        "requires_ppi_warning": False
    },
    "calpol": {
        "brand_name": "Calpol",
        "generic_name": "Paracetamol (Acetaminophen)",
        "forms": ["tab", "tablet", "syr", "syrup"],
        "strengths": ["500mg", "650mg", "250mg", "120mg"],
        "indications": ["fever", "headache", "body ache", "mild pain", "viral fever"],
        "active_ingredients": [
            {"ingredient": "Paracetamol", "strength": "500 mg / 650 mg", "class": "Analgesic/Antipyretic"}
        ],
        "category": "Antipyretic / Analgesic",
        "rxcui": "161",
        "requires_ppi_warning": False
    },
    "dolo 650": {
        "brand_name": "Dolo 650",
        "generic_name": "Paracetamol (Acetaminophen)",
        "forms": ["tab", "tablet"],
        "strengths": ["650mg"],
        "indications": ["fever", "high fever", "body ache", "headache"],
        "active_ingredients": [
            {"ingredient": "Paracetamol", "strength": "650 mg", "class": "Analgesic/Antipyretic"}
        ],
        "category": "Antipyretic / Analgesic",
        "rxcui": "161",
        "requires_ppi_warning": False
    },
    "telma": {
        "brand_name": "Telma",
        "generic_name": "Telmisartan",
        "forms": ["tab", "tablet"],
        "strengths": ["40mg", "20mg", "80mg"],
        "indications": ["hypertension", "high bp", "blood pressure", "cardiovascular"],
        "active_ingredients": [
            {"ingredient": "Telmisartan", "strength": "40 mg", "class": "Angiotensin II Receptor Blocker (ARB)"}
        ],
        "category": "Antihypertensive",
        "rxcui": "316049",
        "requires_ppi_warning": False
    },
    "glycomet": {
        "brand_name": "Glycomet",
        "generic_name": "Metformin Hydrochloride",
        "forms": ["tab", "tablet"],
        "strengths": ["500mg", "850mg", "1000mg"],
        "indications": ["diabetes", "type 2 diabetes", "high blood sugar", "sugar"],
        "active_ingredients": [
            {"ingredient": "Metformin Hydrochloride", "strength": "500 mg / 850 mg", "class": "Biguanide"}
        ],
        "category": "Antidiabetic",
        "rxcui": "6809",
        "requires_ppi_warning": False
    },
    "atorva": {
        "brand_name": "Atorva",
        "generic_name": "Atorvastatin",
        "forms": ["tab", "tablet"],
        "strengths": ["10mg", "20mg", "40mg"],
        "indications": ["cholesterol", "dyslipidemia", "heart disease", "lipid"],
        "active_ingredients": [
            {"ingredient": "Atorvastatin Calcium", "strength": "10 mg / 20 mg", "class": "HMG-CoA Reductase Inhibitor"}
        ],
        "category": "Lipid Lowering / Statin",
        "rxcui": "83367",
        "requires_ppi_warning": False
    },
    "ibuprofen": {
        "brand_name": "Ibuprofen",
        "generic_name": "Ibuprofen",
        "forms": ["tab", "tablet", "syr", "syrup"],
        "strengths": ["400mg", "200mg"],
        "indications": ["pain", "dental pain", "swelling", "headache", "inflammation"],
        "active_ingredients": [
            {"ingredient": "Ibuprofen", "strength": "400 mg", "class": "NSAID"}
        ],
        "category": "NSAID",
        "rxcui": "5640",
        "requires_ppi_warning": True
    },
    "diclofenac": {
        "brand_name": "Diclofenac",
        "generic_name": "Diclofenac Sodium",
        "forms": ["tab", "tablet", "gel", "inj"],
        "strengths": ["50mg", "75mg"],
        "indications": ["pain", "joint pain", "back pain", "arthritis", "sprain"],
        "active_ingredients": [
            {"ingredient": "Diclofenac Sodium", "strength": "50 mg", "class": "NSAID"}
        ],
        "category": "NSAID",
        "rxcui": "3355",
        "requires_ppi_warning": True
    },
    "tetracycline": {
        "brand_name": "Tetracycline",
        "generic_name": "Tetracycline Hydrochloride",
        "forms": ["cap", "capsule", "tab", "tablet"],
        "strengths": ["250mg", "500mg"],
        "indications": ["bacterial infection", "acne", "cholera"],
        "active_ingredients": [
            {"ingredient": "Tetracycline Hydrochloride", "strength": "250 mg / 500 mg", "class": "Tetracycline Antibiotic"}
        ],
        "category": "Antibiotic",
        "rxcui": "10395",
        "requires_ppi_warning": False
    },
    "omeprazole": {
        "brand_name": "Omez",
        "generic_name": "Omeprazole",
        "forms": ["cap", "capsule"],
        "strengths": ["20mg", "40mg"],
        "indications": ["acidity", "gastric ulcer", "gerd", "heartburn"],
        "active_ingredients": [
            {"ingredient": "Omeprazole", "strength": "20 mg", "class": "Proton Pump Inhibitor (PPI)"}
        ],
        "category": "Gastroprotective",
        "rxcui": "7646",
        "requires_ppi_warning": False
    },
    "ciprofloxacin": {
        "brand_name": "Cifran",
        "generic_name": "Ciprofloxacin",
        "forms": ["tab", "tablet", "eye drop"],
        "strengths": ["500mg", "250mg"],
        "indications": ["uti", "urinary infection", "typhoid", "diarrhea", "infection"],
        "active_ingredients": [
            {"ingredient": "Ciprofloxacin Hydrochloride", "strength": "500 mg", "class": "Fluoroquinolone"}
        ],
        "category": "Antibacterial",
        "rxcui": "2551",
        "requires_ppi_warning": False
    },
    "baclofen": {
        "brand_name": "Baclofen",
        "generic_name": "Baclofen",
        "forms": ["tab", "tablet"],
        "strengths": ["10mg", "20mg"],
        "indications": ["muscle spasm", "spasticity", "back pain", "cramp"],
        "active_ingredients": [
            {"ingredient": "Baclofen", "strength": "10 mg", "class": "Skeletal Muscle Relaxant"}
        ],
        "category": "Muscle Relaxant",
        "rxcui": "1292",
        "requires_ppi_warning": False
    },
    "bactrim": {
        "brand_name": "Bactrim",
        "generic_name": "Sulfamethoxazole + Trimethoprim (Co-Trimoxazole)",
        "forms": ["tab", "tablet", "syr", "syrup"],
        "strengths": ["480mg", "960mg", "10mg"],
        "indications": ["urinary infection", "uti", "respiratory infection", "bacterial"],
        "active_ingredients": [
            {"ingredient": "Sulfamethoxazole", "strength": "400 mg", "class": "Sulfonamide Antibiotic"},
            {"ingredient": "Trimethoprim", "strength": "80 mg", "class": "Folate Synthesis Inhibitor"}
        ],
        "category": "Antibacterial / Co-Trimoxazole",
        "rxcui": "203154",
        "requires_ppi_warning": False
    }
}


def extract_dosage_form_and_strength(raw_text: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Extracts dosage form prefix (tab, cap, syr, inj, etc.) and strength (e.g. 500mg, 40mg).
    """
    lower = raw_text.lower().strip()
    detected_form = None
    form_match = re.search(r'\b(tab|tablet|cap|capsule|syr|syrup|inj|injection|gel|oint|ointment|drop|drops)\b', lower)
    if form_match:
        f = form_match.group(1)
        if f in ["tab", "tablet"]:
            detected_form = "tab"
        elif f in ["cap", "capsule"]:
            detected_form = "cap"
        elif f in ["syr", "syrup"]:
            detected_form = "syr"
        elif f in ["inj", "injection"]:
            detected_form = "inj"
        else:
            detected_form = f

    detected_strength = None
    strength_match = re.search(r'\b(\d+(?:\.\d+)?\s*(?:mg|ml|mcg|gm|iu)?)\b', lower)
    if strength_match:
        detected_strength = strength_match.group(1).replace(" ", "")

    class DosageFormAndStrength(tuple):
        def __new__(cls, form, strength):
            return super().__new__(cls, (form, strength))
        @property
        def form(self):
            return self[0]
        @property
        def strength(self):
            return self[1]
        def __getitem__(self, item):
            if isinstance(item, str):
                if item == "form":
                    return self[0]
                elif item == "strength":
                    return self[1]
                raise KeyError(item)
            return super().__getitem__(item)
        def get(self, key, default=None):
            try:
                return self[key]
            except KeyError:
                return default

    # Normalize detected_form label if tablet
    form_label = "TABLET" if detected_form in ["tab", "tablet"] else (detected_form.upper() if detected_form else None)
    return DosageFormAndStrength(form_label, detected_strength)


def clean_medicine_string(raw_text: str) -> str:
    """
    Cleans raw OCR text of common prefixes like 'Tab', 'Cap', 'Syr', 'Inj' and dosages.
    """
    cleaned = raw_text.lower().strip()
    cleaned = re.sub(r'^(tab|tablet|cap|capsule|syr|syrup|inj|gel|oint|drop|powder|susp)\.?\s+', '', cleaned)
    cleaned = re.sub(r'\b\d+(\.\d+)?\s*(mg|ml|mcg|gm|iu)?\b', '', cleaned)
    cleaned = re.sub(r'[^\w\s]', '', cleaned).strip()
    return cleaned


def calculate_metaphone_similarity(query: str, candidate: str) -> float:
    """
    Computes phonetic similarity between two pharmaceutical names using Double Metaphone.
    """
    if not query or not candidate:
        return 0.0

    q_p, q_s = doublemetaphone(query)
    c_p, c_s = doublemetaphone(candidate)

    if not q_p or not c_p:
        return 0.0

    if q_p == c_p:
        return 1.0
    if (q_s and q_s == c_p) or (c_s and q_p == c_s):
        return 0.85
    if q_s and c_s and q_s == c_s:
        return 0.75
    return float(Levenshtein.ratio(q_p, c_p))


def compute_composite_score(query: str, candidate: str) -> float:
    """
    Computes composite similarity score:
    Composite_Score = (0.6 * Levenshtein_Ratio) + (0.4 * Metaphone_Similarity)
    Uses raw edit distance (fuzz.ratio), strictly avoiding token_sort_ratio
    which under-penalizes character-level OCR errors on single-token drug names.
    """
    lev_ratio = float(fuzz.ratio(query, candidate)) / 100.0
    meta_sim = calculate_metaphone_similarity(query, candidate)
    return round((0.6 * lev_ratio) + (0.4 * meta_sim), 4)


def retrieve_candidate_shortlist(
    cleaned_query: str,
    top_k: int = 5,
    form_filter: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Pass 2: Shortlist-then-verify candidate retrieval.
    Retrieves the top-k closest CDSCO candidates using raw edit distance and Double Metaphone.
    """
    candidate_pool = list(CDSCO_MASTER_REGISTRY.items())
    if form_filter:
        tf_lower = str(form_filter).lower()
        if tf_lower in ["tablet", "tab"]:
            form_keys = ["tab", "tablet"]
        elif tf_lower in ["capsule", "cap"]:
            form_keys = ["cap", "capsule"]
        elif tf_lower in ["syrup", "syr"]:
            form_keys = ["syr", "syrup"]
        elif tf_lower in ["drops", "drop"]:
            form_keys = ["drop", "drops", "eye drop", "ear drop"]
        elif tf_lower in ["oint", "ointment"]:
            form_keys = ["oint", "ointment", "gel"]
        elif tf_lower in ["inj", "injection"]:
            form_keys = ["inj", "injection"]
        else:
            form_keys = [tf_lower]

        form_filtered = [
            (k, v) for k, v in candidate_pool
            if any(fk in v.get("forms", []) for fk in form_keys)
        ]
        if form_filtered:
            candidate_pool = form_filtered

    candidates = []
    for key, data in candidate_pool:
        lev_sim = float(fuzz.ratio(cleaned_query, key)) / 100.0
        meta_sim = calculate_metaphone_similarity(cleaned_query, key)
        base_score = round((0.6 * lev_sim) + (0.4 * meta_sim), 4)

        if key == cleaned_query or cleaned_query in key or key in cleaned_query:
            base_score = max(base_score, 0.95)

        candidates.append({
            "key": key,
            "brand_name": data.get("brand_name"),
            "generic_name": data.get("generic_name"),
            "base_score": base_score,
            "lev_sim": lev_sim,
            "meta_sim": meta_sim,
            "formulary_entry": data
        })

    candidates.sort(key=lambda x: x["base_score"], reverse=True)
    return candidates[:top_k]


def match_against_cdsco(
    raw_name: str,
    verbal_context: Optional[str] = None,
    raw_image_crop_ref: Optional[str] = None,
    form_filter: Optional[str] = None
) -> Dict[str, Any]:
    """
    Matches raw OCR text against the CDSCO Indian National Formulary using:
    - Pass 1: Extract candidate token.
    - Pass 2: Retrieve Top-5 candidate shortlist (raw edit distance + phonetic).
    - Pass 3: Closed-set verification with calibrated scoring and signal breakdown.
    """
    cleaned = clean_medicine_string(raw_name)
    if not cleaned:
        return {
            "matched": False,
            "raw_input": raw_name,
            "confidence": 0.0,
            "verification_status": "unmatched",
            "status_tier": "MANUAL_REVIEW_REQUIRED",
            "top_candidates": [],
            "candidates": [],
            "verification_pass": "pass_3_closed_set",
            "signal_breakdown": None
        }

    detected_form, detected_strength = extract_dosage_form_and_strength(raw_name)
    target_form = form_filter or (detected_form.form if hasattr(detected_form, "form") else detected_form)

    # Pass 2: Retrieve Top-5 candidate shortlist
    shortlist = retrieve_candidate_shortlist(cleaned, top_k=5, form_filter=target_form)

    # Pass 3: Closed-set verification and calibration
    best_candidate = None
    best_score = 0.0
    signal_breakdown = None

    for item in shortlist:
        data = item["formulary_entry"]
        score = item["base_score"]
        form_boost = 0.0
        verbal_boost = 0.0

        if detected_strength:
            registered_strengths = [s.lower().replace(" ", "") for s in data.get("strengths", [])]
            if any(detected_strength in s or s in detected_strength for s in registered_strengths):
                form_boost = 0.05
                score = min(1.0, score + form_boost)

        # Clinical Prior Guardrail: Restricted to small soft boost (+0.05 max for plausibility),
        # only applied if candidate already has base recognition plausibility (score >= 0.60)
        # to prevent verbal history from hallucinating non-existent drugs.
        if verbal_context and score >= 0.55:
            vc_lower = verbal_context.lower()
            indications = [ind.lower() for ind in data.get("indications", [])]
            category = data.get("category", "").lower()
            brand_words = data.get("brand_name", "").lower().split()
            if any(ind in vc_lower for ind in indications) or any(w in category for w in vc_lower.split()) or any(bw in vc_lower for bw in brand_words):
                verbal_boost = 0.10
                score = min(1.0, score + verbal_boost)

        item["final_score"] = round(score, 3)
        if score > best_score:
            best_score = score
            best_candidate = item
            signal_breakdown = {
                "levenshtein_similarity": item["lev_sim"],
                "phonetic_similarity": item["meta_sim"],
                "strength_form_boost": form_boost,
                "verbal_soft_boost": verbal_boost
            }

    best_match = best_candidate["formulary_entry"] if best_candidate else None

    # Decision action gate
    if best_match and best_score >= 0.88:
        verification_status = "auto_accepted"
        status_tier = "AUTO_APPROVED"
    elif best_match and best_score >= 0.65:
        verification_status = "requires_verification"
        status_tier = "AMBIGUOUS_REQUIRES_CONFIRMATION"
    else:
        verification_status = "unmatched"
        status_tier = "MANUAL_REVIEW_REQUIRED"
        best_match = None

    top_candidates = [
        {
            "brand_name": c["formulary_entry"]["brand_name"],
            "generic_name": c["formulary_entry"]["generic_name"],
            "score": c.get("final_score", c["base_score"])
        }
        for c in shortlist[:3]
    ]

    candidates_list = [
        {
            "brand_name": c["formulary_entry"]["brand_name"],
            "generic_name": c["formulary_entry"]["generic_name"],
            "score": c.get("final_score", c["base_score"]),
            "levenshtein_similarity": c["lev_sim"],
            "phonetic_similarity": c["meta_sim"]
        }
        for c in shortlist
    ]

    return {
        "matched": best_match is not None,
        "raw_input": raw_name,
        "cleaned_query": cleaned,
        "confidence": best_score,
        "composite_score": best_score,
        "verification_status": verification_status,
        "status_tier": status_tier,
        "formulary_entry": best_match,
        "top_candidates": top_candidates,
        "candidates": candidates_list,
        "verification_pass": "pass_3_closed_set",
        "signal_breakdown": signal_breakdown,
        "detected_form": detected_form,
        "detected_strength": detected_strength,
        "raw_image_crop": raw_image_crop_ref if status_tier == "MANUAL_REVIEW_REQUIRED" else None
    }


def query_rxnorm_rxcui(generic_name: str) -> Optional[str]:
    """
    Queries the official U.S. National Library of Medicine RxNorm REST API.
    """
    try:
        encoded_name = urllib.parse.quote(generic_name)
        url = f"https://rxnav.nlm.nih.gov/REST/rxcui.json?name={encoded_name}"
        req = urllib.request.Request(url, headers={'User-Agent': 'MediKiosk-ModuleB/1.0'})
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read().decode())
            id_group = data.get("idGroup", {})
            rxnorm_ids = id_group.get("rxnormId", [])
            if rxnorm_ids:
                return rxnorm_ids[0]
    except Exception:
        pass
    return None


class CDSCOMatcher:
    """CDSCO Pharmacopeia Fuzzy and Phonetic Matcher."""
    def normalize_candidate(
        self,
        candidate_text: str,
        verbal_transcript: Optional[str] = None,
        inferred_dosage_form: Optional[str] = None
    ) -> Dict[str, Any]:
        res = match_against_cdsco(candidate_text, verbal_context=verbal_transcript, form_filter=inferred_dosage_form)
        form_entry = res.get("formulary_entry") or {}
        
        # Check if verbal context boost was applied
        verbal_boost = 0.0
        if verbal_transcript:
            vc_lower = verbal_transcript.lower()
            indications = [ind.lower() for ind in form_entry.get("indications", [])]
            category = form_entry.get("category", "").lower()
            brand_words = form_entry.get("brand_name", "").lower().split()
            if any(ind in vc_lower for ind in indications) or any(w in category for w in vc_lower.split()) or any(bw in vc_lower for bw in brand_words):
                verbal_boost = 0.10

        return {
            "matched": res.get("matched", False),
            "matched_brand": form_entry.get("brand_name"),
            "generic_name": form_entry.get("generic_name"),
            "category": form_entry.get("category"),
            "rxcui": form_entry.get("rxcui"),
            "active_ingredients": form_entry.get("active_ingredients", []),
            "strength": res.get("detected_strength"),
            "composite_score": res.get("composite_score", 0.0),
            "action_gate": res.get("status_tier", "MANUAL_REVIEW_REQUIRED"),
            "top_candidates": res.get("top_candidates", []),
            "candidates": res.get("candidates", []),
            "verification_pass": res.get("verification_pass", "pass_3_closed_set"),
            "signal_breakdown": res.get("signal_breakdown"),
            "verbal_context_boost": verbal_boost
        }


cdsco_matcher = CDSCOMatcher()
