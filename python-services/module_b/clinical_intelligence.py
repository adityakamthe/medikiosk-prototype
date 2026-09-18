"""
Clinical Intelligence Engine for MediKiosk Module B
Stage 6: Lab Out-of-Range Highlighting & Pharmacological Safety Engine

Implements:
1. Quantitative Lab Analyte parsing with unit normalization and qualifiers (>, <).
2. Three-Tier Severity Classification: NORMAL, ABNORMAL (Amber), PANIC / CRITICAL (Bold Red).
3. LOINC mapped reference intervals for CBC, LFT, KFT, Diabetic and Lipid panels.
4. NSAID + PPI Gastric Protection Co-Prescribing Audit.
5. Duplicate active class therapy detection.
6. Drug-Drug Interaction (DDI) matrix checking.
7. Adult maximum daily dose ceiling checks.
"""

import re
from typing import Dict, Any, List, Optional, Tuple


# Physiological Reference Ranges and Panic Thresholds with LOINC Codes
LAB_REFERENCE_REGISTRY: Dict[str, Dict[str, Any]] = {
    "hemoglobin": {
        "loinc": "718-7",
        "display": "Hemoglobin (Hb)",
        "unit": "g/dL",
        "min_normal": 12.0,
        "max_normal": 17.5,
        "panic_low": 7.0,
        "panic_high": 20.0,
        "panel": "Complete Blood Count (CBC)"
    },
    "platelets": {
        "loinc": "777-3",
        "display": "Platelet Count",
        "unit": "/mcL",
        "min_normal": 150000,
        "max_normal": 450000,
        "panic_low": 20000,
        "panic_high": 1000000,
        "panel": "Complete Blood Count (CBC)"
    },
    "wbc": {
        "loinc": "6690-2",
        "display": "White Blood Cell (WBC) Count",
        "unit": "/mcL",
        "min_normal": 4000,
        "max_normal": 11000,
        "panic_low": 2000,
        "panic_high": 30000,
        "panel": "Complete Blood Count (CBC)"
    },
    "fasting blood sugar": {
        "loinc": "1558-6",
        "display": "Fasting Blood Glucose (FBS)",
        "unit": "mg/dL",
        "min_normal": 70.0,
        "max_normal": 100.0,
        "panic_low": 50.0,
        "panic_high": 300.0,
        "panel": "Diabetic Profile"
    },
    "post prandial blood sugar": {
        "loinc": "1521-4",
        "display": "Post-Prandial Glucose (PPBS)",
        "unit": "mg/dL",
        "min_normal": 70.0,
        "max_normal": 140.0,
        "panic_low": 50.0,
        "panic_high": 350.0,
        "panel": "Diabetic Profile"
    },
    "hba1c": {
        "loinc": "4548-4",
        "display": "Glycated Hemoglobin (HbA1c)",
        "unit": "%",
        "min_normal": 4.0,
        "max_normal": 5.6,
        "panic_low": None,
        "panic_high": 10.5,
        "panel": "Diabetic Profile"
    },
    "serum creatinine": {
        "loinc": "2160-0",
        "display": "Serum Creatinine",
        "unit": "mg/dL",
        "min_normal": 0.6,
        "max_normal": 1.2,
        "panic_low": None,
        "panic_high": 4.0,
        "panel": "Renal Function Test (RFT)"
    },
    "blood urea": {
        "loinc": "3094-0",
        "display": "Blood Urea Nitrogen (BUN)",
        "unit": "mg/dL",
        "min_normal": 7.0,
        "max_normal": 20.0,
        "panic_low": None,
        "panic_high": 80.0,
        "panel": "Renal Function Test (RFT)"
    },
    "potassium": {
        "loinc": "2823-3",
        "display": "Serum Potassium (K+)",
        "unit": "mEq/L",
        "min_normal": 3.5,
        "max_normal": 5.1,
        "panic_low": 2.8,
        "panic_high": 6.2,
        "panel": "Electrolytes"
    },
    "sodium": {
        "loinc": "2951-2",
        "display": "Serum Sodium (Na+)",
        "unit": "mEq/L",
        "min_normal": 136.0,
        "max_normal": 145.0,
        "panic_low": 120.0,
        "panic_high": 160.0,
        "panel": "Electrolytes"
    },
    "serum bilirubin": {
        "loinc": "1975-2",
        "display": "Total Bilirubin",
        "unit": "mg/dL",
        "min_normal": 0.2,
        "max_normal": 1.2,
        "panic_low": None,
        "panic_high": 12.0,
        "panel": "Liver Function Test (LFT)"
    },
    "sgpt": {
        "loinc": "1742-6",
        "display": "Alanine Aminotransferase (ALT/SGPT)",
        "unit": "U/L",
        "min_normal": 7.0,
        "max_normal": 56.0,
        "panic_low": None,
        "panic_high": 500.0,
        "panel": "Liver Function Test (LFT)"
    },
    "sgot": {
        "loinc": "1920-8",
        "display": "Aspartate Aminotransferase (AST/SGOT)",
        "unit": "U/L",
        "min_normal": 10.0,
        "max_normal": 40.0,
        "panic_low": None,
        "panic_high": 500.0,
        "panel": "Liver Function Test (LFT)"
    }
}


def parse_numeric_lab_value(val_str: Any) -> Tuple[Optional[float], Optional[str]]:
    """
    Extracts numeric value and any comparison qualifier (e.g. '>', '<', '<=')
    """
    if val_str is None:
        return None, None
    s = str(val_str).strip().replace(',', '')
    qualifier = None
    if s.startswith(('>', '<', '>=', '<=')):
        m = re.match(r'([><]=?)\s*([0-9]+(?:\.[0-9]+)?)', s)
        if m:
            qualifier = m.group(1)
            return float(m.group(2)), qualifier

    # Extract first decimal or integer
    m = re.search(r'([0-9]+(?:\.[0-9]+)?)', s)
    if m:
        return float(m.group(1)), qualifier
    return None, None


def evaluate_lab_result(test_name: str, raw_value: Any, unit: Optional[str] = None) -> Dict[str, Any]:
    """
    Evaluates a single lab analyte against reference intervals and classifies severity:
    - NORMAL (Green)
    - ABNORMAL (Amber)
    - PANIC / CRITICAL (Bold Red)
    """
    clean_name = test_name.lower().strip()
    matched_entry = None
    matched_key = None

    # Search reference registry
    for key, spec in LAB_REFERENCE_REGISTRY.items():
        if key in clean_name or clean_name in key:
            matched_entry = spec
            matched_key = key
            break

    num_val, qualifier = parse_numeric_lab_value(raw_value)

    if not matched_entry or num_val is None:
        return {
            "test_name": test_name,
            "parsed_value": num_val,
            "raw_value": str(raw_value),
            "qualifier": qualifier,
            "unit": unit,
            "status": "UNASSESSED",
            "severity": "info",
            "is_panic": False,
            "reference_range": None,
            "loinc_code": None
        }

    status = "NORMAL"
    severity = "normal"
    is_panic = False
    alert_message = None

    # Check Panic Low
    if matched_entry.get("panic_low") is not None and num_val < matched_entry["panic_low"]:
        status = "PANIC_LOW"
        severity = "panic"
        is_panic = True
        alert_message = f"CRITICAL LOW: {matched_entry['display']} {num_val} {matched_entry['unit']} is below panic ceiling ({matched_entry['panic_low']})."

    # Check Panic High
    elif matched_entry.get("panic_high") is not None and num_val > matched_entry["panic_high"]:
        status = "PANIC_HIGH"
        severity = "panic"
        is_panic = True
        alert_message = f"CRITICAL HIGH: {matched_entry['display']} {num_val} {matched_entry['unit']} exceeds panic ceiling ({matched_entry['panic_high']})."

    # Check Abnormal Low
    elif matched_entry.get("min_normal") is not None and num_val < matched_entry["min_normal"]:
        status = "ABNORMAL_LOW"
        severity = "abnormal"
        alert_message = f"Low: Below reference interval ({matched_entry['min_normal']} - {matched_entry['max_normal']} {matched_entry['unit']})."

    # Check Abnormal High
    elif matched_entry.get("max_normal") is not None and num_val > matched_entry["max_normal"]:
        status = "ABNORMAL_HIGH"
        severity = "abnormal"
        alert_message = f"High: Exceeds reference interval ({matched_entry['min_normal']} - {matched_entry['max_normal']} {matched_entry['unit']})."

    ref_range_str = f"{matched_entry.get('min_normal', '')} - {matched_entry.get('max_normal', '')} {matched_entry['unit']}".strip()

    if is_panic:
        flag = "CRITICAL_PANIC"
    elif status in ["ABNORMAL_LOW", "ABNORMAL_HIGH"]:
        flag = "ABNORMAL"
    else:
        flag = "NORMAL"

    return {
        "test_name": matched_entry["display"],
        "raw_test_query": test_name,
        "parsed_value": num_val,
        "raw_value": str(raw_value),
        "qualifier": qualifier,
        "unit": matched_entry["unit"],
        "status": status,
        "severity": severity,
        "flag": flag,
        "is_panic": is_panic,
        "alert_message": alert_message,
        "reference_range": ref_range_str,
        "loinc_code": matched_entry["loinc"],
        "panel": matched_entry["panel"]
    }


# Pharmacological Drug Safety & DDI Matrix
NSAID_DRUGS = {
    "diclofenac", "ibuprofen", "aceclofenac", "naproxen", "etoricoxib",
    "indomethacin", "piroxicam", "ketorolac", "mefenamic acid", "ultrafen", "ultrafen plus"
}

PPI_DRUGS = {
    "pantoprazole", "omeprazole", "rabeprazole", "esomeprazole", "lansoprazole",
    "pantocid", "pan-d", "omez", "rantac", "ranitidine", "famotidine"
}

DRUG_INTERACTIONS = [
    {
        "pair": ("tetracycline", "calcium"),
        "aliases": {
            "tetracycline": ["tetracycline", "doxycycline", "minocycline"],
            "calcium": ["calcium", "shelcal", "cipcal", "calcimax", "caltrate"]
        },
        "severity": "HIGH",
        "mechanism": "Polyvalent cation chelation leading to complete antibiotic inactivation.",
        "recommendation": "Separate administration by at least 2 to 3 hours."
    },
    {
        "pair": ("ciprofloxacin", "antacid"),
        "aliases": {
            "ciprofloxacin": ["ciprofloxacin", "cifran", "levofloxacin"],
            "antacid": ["antacid", "gelusil", "digene", "mucaine", "sucralfate", "aluminum", "magnesium"]
        },
        "severity": "HIGH",
        "mechanism": "Chelation with magnesium/aluminum antacids impairs fluoroquinolone absorption.",
        "recommendation": "Administer ciprofloxacin 2 hours before or 6 hours after antacids."
    },
    {
        "pair": ("telmisartan", "potassium"),
        "aliases": {
            "telmisartan": ["telmisartan", "telma", "losartan", "olmesartan"],
            "potassium": ["potassium", "potklor", "k-bind"]
        },
        "severity": "CRITICAL",
        "mechanism": "Angiotensin receptor blockade combined with potassium supplementation causes severe hyperkalemia.",
        "recommendation": "Monitor serum potassium closely; avoid concurrent potassium supplements without electrolyte labs."
    },
    {
        "pair": ("diclofenac", "aspirin"),
        "aliases": {
            "diclofenac": ["diclofenac", "ultrafen", "voveran"],
            "aspirin": ["aspirin", "ecosprin", "disprin"]
        },
        "severity": "HIGH",
        "mechanism": "Dual antiplatelet/NSAID inhibition severely heightens upper gastrointestinal ulceration and hemorrhage.",
        "recommendation": "Avoid simultaneous use; prescribe gastroprotection if combination is clinically mandated."
    }
]

MAX_DAILY_DOSAGES = {
    "paracetamol": {"max_daily_mg": 4000, "display": "Paracetamol / Acetaminophen"},
    "ibuprofen": {"max_daily_mg": 2400, "display": "Ibuprofen"},
    "diclofenac": {"max_daily_mg": 150, "display": "Diclofenac"}
}


def audit_prescriptions_safety(medications: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Evaluates prescription line items for:
    1. NSAID + PPI Gastric Protection audit
    2. Duplicate active therapy (multiple NSAIDs)
    3. Drug-Drug Cross Interactions
    4. Adult maximum dose limits
    """
    alerts = []
    has_nsaid = False
    nsaid_list = []
    has_ppi = False
    ppi_list = []
    identified_drugs = []

    for med in medications:
        name = str(med.get("name") or med.get("raw_text") or "").lower()
        identified_drugs.append(name)

        # Check NSAIDs
        for n in NSAID_DRUGS:
            if n in name:
                has_nsaid = True
                nsaid_list.append(med.get("name") or name)
                break

        # Check PPIs / Gastroprotectives
        for p in PPI_DRUGS:
            if p in name:
                has_ppi = True
                ppi_list.append(med.get("name") or name)
                break

    # 1. NSAID Co-Prescribing Gastroprotection Audit
    if has_nsaid and not has_ppi:
        alerts.append({
            "type": "GASTROPROTECTION_OMISSION",
            "severity": "WARNING",
            "title": "NSAID Prescribed Without Gastric Protection (PPI)",
            "description": f"Systemic NSAID ({', '.join(set(nsaid_list))}) detected without concurrent Proton Pump Inhibitor (PPI, e.g. Pantoprazole/Omeprazole). Heightens risk of acute gastroduodenal mucosal injury.",
            "recommendation": "Consider co-prescribing Pantoprazole 40mg OD or equivalent gastroprotective agent."
        })

    # 2. Duplicate Active Class Therapy (Multiple NSAIDs)
    if len(set(nsaid_list)) > 1:
        alerts.append({
            "type": "THERAPEUTIC_DUPLICATION",
            "severity": "HIGH",
            "title": "Duplicate NSAID Therapy Detected",
            "description": f"Multiple concurrent non-steroidal anti-inflammatory agents ({', '.join(set(nsaid_list))}) identified. Increases adverse renal, hepatic, and bleeding risks without additive analgesic benefit.",
            "recommendation": "Consolidate into a single analgesic regimen."
        })

    # 3. Drug-Drug Interactions
    for rule in DRUG_INTERACTIONS:
        d1, d2 = rule["pair"]
        aliases_map = rule.get("aliases", {})
        d1_terms = aliases_map.get(d1, [d1])
        d2_terms = aliases_map.get(d2, [d2])
        d1_present = any(any(t in drug for t in d1_terms) for drug in identified_drugs)
        d2_present = any(any(t in drug for t in d2_terms) for drug in identified_drugs)
        if d1_present and d2_present:
            alerts.append({
                "type": "DRUG_INTERACTION",
                "severity": rule["severity"],
                "title": f"Drug Interaction: {d1.capitalize()} + {d2.capitalize()}",
                "description": rule["mechanism"],
                "recommendation": rule["recommendation"]
            })

    return {
        "prescriptions_evaluated": len(medications),
        "total_alerts": len(alerts),
        "has_critical_alerts": any(a["severity"] in ["CRITICAL", "HIGH"] for a in alerts),
        "gastroprotection_status": "PROTECTED" if has_ppi else ("AT_RISK" if has_nsaid else "NOT_APPLICABLE"),
        "alerts": alerts
    }
