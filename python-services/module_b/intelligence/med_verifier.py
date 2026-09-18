"""
Medication Safety and Clinical Interaction Verifier for MediKiosk Module B.
Audits prescribed regimens for:
1. Gastroprotection omission (NSAID without PPI)
2. Therapeutic duplication (Multiple concurrent NSAIDs)
3. Drug-Drug Interactions (DDI) with Indian brand and generic aliases
4. Daily dose ceilings
"""
from typing import Dict, Any, List, Optional, Set, Tuple
import re

try:
    from module_b.schemas.verification_schemas import ClinicalAlert, SeverityTier
except (ImportError, ValueError):
    try:
        from ..schemas.verification_schemas import ClinicalAlert, SeverityTier
    except (ImportError, ValueError):
        from schemas.verification_schemas import ClinicalAlert, SeverityTier


# NSAID Registry (Generic names and prevalent Indian brand aliases)
NSAID_DRUGS: Set[str] = {
    "diclofenac", "ibuprofen", "aceclofenac", "naproxen", "etoricoxib",
    "indomethacin", "piroxicam", "ketorolac", "mefenamic acid",
    "ultrafen", "ultrafen plus", "voveran", "zerodol", "hifenac",
    "combiflam", "brufen", "nurofen", "dynapar", "mobizox", "dolonex"
}

# PPI and Gastroprotective Registry
PPI_DRUGS: Set[str] = {
    "pantoprazole", "omeprazole", "rabeprazole", "esomeprazole", "lansoprazole",
    "pantocid", "pan-d", "pan 40", "pan-40", "omez", "rantac", "ranitidine",
    "famotidine", "nexpro", "rabonik", "rabicip", "omez-d", "pantop"
}

# Clinically Significant Drug-Drug Interaction Rules
DRUG_INTERACTIONS = [
    {
        "pair": ("tetracycline", "calcium"),
        "aliases": {
            "tetracycline": ["tetracycline", "doxycycline", "minocycline", "doxicip", "doxy-1"],
            "calcium": ["calcium", "shelcal", "cipcal", "calcimax", "caltrate", "ostocalcium"]
        },
        "severity": SeverityTier.HIGH,
        "title": "Drug Interaction: Tetracycline / Doxycycline + Calcium",
        "mechanism": "Polyvalent cation chelation leading to complete insoluble antibiotic precipitation and clinical failure.",
        "recommendation": "Separate oral administration times by at least 2 to 3 hours."
    },
    {
        "pair": ("ciprofloxacin", "antacid"),
        "aliases": {
            "ciprofloxacin": ["ciprofloxacin", "cifran", "ciro", "levofloxacin", "ofloxacin", "norfloxacin"],
            "antacid": [
                "antacid", "gelusil", "digene", "mucaine", "sucralfate", "aluminum hydroxide",
                "magnesium trisilicate", "polycrol", "maalox"
            ]
        },
        "severity": SeverityTier.HIGH,
        "title": "Drug Interaction: Fluoroquinolone + Antacid (Multivalent Cations)",
        "mechanism": "Chelation with magnesium/aluminum antacids drastically reduces quinolone bioavailability by >70%.",
        "recommendation": "Administer quinolone 2 hours before or 4 to 6 hours after antacid ingestion."
    },
    {
        "pair": ("telmisartan", "potassium"),
        "aliases": {
            "telmisartan": [
                "telmisartan", "telma", "telmikind", "crespo", "losartan", "olmesartan",
                "valsartan", "angispan"
            ],
            "potassium": ["potassium", "potklor", "k-bind", "potrate", "syp potklor", "potassium chloride"]
        },
        "severity": SeverityTier.CRITICAL_PANIC,
        "title": "Severe Drug Interaction: ARB / ACE-I + Potassium Supplementation",
        "mechanism": "Renin-angiotensin-aldosterone blockade diminishes renal potassium excretion. Concurrent potassium risks lethal cardiac arrythmias from severe hyperkalemia.",
        "recommendation": "Hold exogenous potassium supplements; evaluate urgent serum potassium and renal panel."
    },
    {
        "pair": ("diclofenac", "aspirin"),
        "aliases": {
            "diclofenac": ["diclofenac", "voveran", "ultrafen", "aceclofenac", "zerodol", "naproxen"],
            "aspirin": ["aspirin", "ecosprin", "disprin", "asa", "acetylsalicylic acid", "delisprin"]
        },
        "severity": SeverityTier.HIGH,
        "title": "Drug Interaction: Dual NSAID / Antiplatelet Regimen",
        "mechanism": "Synergistic inhibition of cyclooxygenase-1 elevates gastrointestinal ulceration and major hemorrhage risks up to 4-fold.",
        "recommendation": "Avoid concurrent routine NSAID therapy with antiplatelet aspirin unless strictly indicated with compulsory gastroprotection."
    }
]

# Daily Dose Ceilings (Adult)
MAX_DAILY_DOSAGES = {
    "paracetamol": {"max_daily_mg": 4000.0, "display": "Paracetamol / Acetaminophen"},
    "acetaminophen": {"max_daily_mg": 4000.0, "display": "Paracetamol / Acetaminophen"},
    "ibuprofen": {"max_daily_mg": 2400.0, "display": "Ibuprofen"},
    "diclofenac": {"max_daily_mg": 150.0, "display": "Diclofenac"},
    "aceclofenac": {"max_daily_mg": 200.0, "display": "Aceclofenac"},
    "pantoprazole": {"max_daily_mg": 80.0, "display": "Pantoprazole"}
}


class MedicationVerifier:
    """
    Evaluates clinical safety, DDI, and contraindications for medication orders.
    """

    def audit_medications(
        self,
        medications: List[Dict[str, Any]]
    ) -> Tuple[List[ClinicalAlert], str, bool]:
        """
        Audits a list of prescribed medications.
        Returns:
            - alerts: List of ClinicalAlert objects
            - gastroprotection_status: 'PROTECTED', 'AT_RISK', or 'NOT_APPLICABLE'
            - has_critical_alerts: True if any alert is CRITICAL_PANIC or HIGH
        """
        alerts: List[ClinicalAlert] = []
        identified_drugs: List[str] = []
        nsaid_identified: List[str] = []
        ppi_identified: List[str] = []

        for med in medications:
            name = str(med.get("name") or med.get("brand_name") or med.get("generic_name") or "").lower()
            generic = str(med.get("generic_name") or "").lower()
            combined_text = f"{name} {generic}".strip()
            identified_drugs.append(combined_text)

            # Detect NSAIDs
            for n in NSAID_DRUGS:
                if re.search(r'\b' + re.escape(n) + r'\b', combined_text):
                    nsaid_identified.append(med.get("name") or n.capitalize())
                    break

            # Detect PPIs / gastroprotectives
            for p in PPI_DRUGS:
                if re.search(r'\b' + re.escape(p) + r'\b', combined_text):
                    ppi_identified.append(med.get("name") or p.capitalize())
                    break

        # 1. NSAID Co-Prescribing Gastroprotection Audit
        has_nsaid = len(nsaid_identified) > 0
        has_ppi = len(ppi_identified) > 0

        if has_nsaid and not has_ppi:
            alerts.append(ClinicalAlert(
                type="GASTROPROTECTION_OMISSION",
                severity=SeverityTier.WARNING,
                title="NSAID Prescribed Without Gastric Protection (PPI)",
                description=(
                    f"Systemic NSAID ({', '.join(sorted(set(nsaid_identified)))}) detected without concurrent "
                    "Proton Pump Inhibitor (PPI, e.g. Pantoprazole 40mg). Heightens risk of acute peptic mucosal ulceration."
                ),
                recommendation="Consider co-prescribing Pantoprazole 40mg OD or equivalent gastroprotective agent."
            ))

        # 2. Duplicate NSAID Active Therapy Audit
        unique_nsaids = list(set(nsaid_identified))
        if len(unique_nsaids) > 1:
            alerts.append(ClinicalAlert(
                type="THERAPEUTIC_DUPLICATION",
                severity=SeverityTier.HIGH,
                title="Duplicate NSAID Therapy Detected",
                description=(
                    f"Multiple concurrent non-steroidal anti-inflammatory agents ({', '.join(unique_nsaids)}) "
                    "identified. Increases nephrotoxicity, hepatotoxicity, and bleeding risk without clinical gain."
                ),
                recommendation="Consolidate into a single analgesic regimen."
            ))

        # 3. Drug-Drug Interactions
        for rule in DRUG_INTERACTIONS:
            d1, d2 = rule["pair"]
            aliases_map = rule.get("aliases", {})
            d1_terms = aliases_map.get(d1, [d1])
            d2_terms = aliases_map.get(d2, [d2])

            d1_match = any(
                any(re.search(r'\b' + re.escape(t) + r'\b', drug) for t in d1_terms)
                for drug in identified_drugs
            )
            d2_match = any(
                any(re.search(r'\b' + re.escape(t) + r'\b', drug) for t in d2_terms)
                for drug in identified_drugs
            )

            if d1_match and d2_match:
                alerts.append(ClinicalAlert(
                    type="DRUG_INTERACTION",
                    severity=rule["severity"],
                    title=rule["title"],
                    description=rule["mechanism"],
                    recommendation=rule["recommendation"]
                ))

        # 4. Check Dose Ceilings if dose strength and frequency are provided
        for med in medications:
            med_name = str(med.get("name") or med.get("generic_name") or "").lower()
            dose_str = str(med.get("dose") or "")
            freq_str = str(med.get("frequency") or med.get("standardized_sig") or "")

            # Match drug in MAX_DAILY_DOSAGES
            matched_ceiling = None
            for d_key, spec in MAX_DAILY_DOSAGES.items():
                if d_key in med_name:
                    matched_ceiling = spec
                    break

            if matched_ceiling:
                # Parse single dose mg
                dose_mg_match = re.search(r'([0-9]+(?:\.[0-9]+)?)\s*(?:mg)?', dose_str)
                if dose_mg_match:
                    try:
                        single_mg = float(dose_mg_match.group(1))
                        # Estimate daily frequency
                        freq_multiplier = 1
                        if "1-0-1" in freq_str or "bid" in freq_str.lower() or "bd" in freq_str.lower():
                            freq_multiplier = 2
                        elif "1-1-1" in freq_str or "tid" in freq_str.lower() or "tds" in freq_str.lower():
                            freq_multiplier = 3
                        elif "1-1-1-1" in freq_str or "qid" in freq_str.lower():
                            freq_multiplier = 4

                        total_daily_mg = single_mg * freq_multiplier
                        max_allowed = matched_ceiling["max_daily_mg"]

                        if total_daily_mg > max_allowed:
                            alerts.append(ClinicalAlert(
                                type="DOSE_CEILING",
                                severity=SeverityTier.HIGH,
                                title=f"Exceeded Daily Dose Ceiling: {matched_ceiling['display']}",
                                description=(
                                    f"Estimated daily dose of {total_daily_mg}mg exceeds the maximum recommended "
                                    f"adult limit of {max_allowed}mg per 24 hours."
                                ),
                                recommendation="Reduce single dose strength or frequency to avoid hepatic/renal toxicity."
                            ))
                    except Exception:
                        pass

        # Determine gastroprotection status
        if has_ppi:
            gastroprotection_status = "PROTECTED"
        elif has_nsaid:
            gastroprotection_status = "AT_RISK"
        else:
            gastroprotection_status = "NOT_APPLICABLE"

        has_critical = any(
            a.severity in [SeverityTier.CRITICAL_PANIC, SeverityTier.HIGH] for a in alerts
        )

        return alerts, gastroprotection_status, has_critical


# Singleton instance
medication_verifier = MedicationVerifier()
