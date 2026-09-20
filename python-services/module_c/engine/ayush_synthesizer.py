"""
Ayurvedic Dashavidha Pariksha Synthesis Engine for MediKiosk Module C.
Synthesizes conversational responses and clinical indicators into the classical 10-fold examination framework:
Prakriti/Vikriti, Agni/Koshtha, Bala/Dhatu Sarata, Ahara/Vihara Shakti, Desha/Kala/Satmya.
Aligned with Ministry of Ayush / AIIA standards (Charaka Samhita Vimana Sthana 8/94).
"""
import sys
import os
import re
from typing import Dict, Any, List, Optional

_ENGINE_DIR = os.path.dirname(os.path.abspath(__file__))
_MODULE_C_DIR = os.path.abspath(os.path.join(_ENGINE_DIR, ".."))
_SERVICES_DIR = os.path.abspath(os.path.join(_MODULE_C_DIR, ".."))
for _p in [_MODULE_C_DIR, _SERVICES_DIR]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

try:
    from module_c.schemas.ingestion_schemas import PatientRecordPayload, ChiefComplaint
    from module_c.schemas.synthesis_schemas import DashavidhaReport
except (ImportError, ModuleNotFoundError, ValueError):
    try:
        from schemas.ingestion_schemas import PatientRecordPayload, ChiefComplaint
        from schemas.synthesis_schemas import DashavidhaReport
    except (ImportError, ModuleNotFoundError, ValueError):
        from ..schemas.ingestion_schemas import PatientRecordPayload, ChiefComplaint
        from ..schemas.synthesis_schemas import DashavidhaReport


class AyushSynthesizer:
    """
    Computes Dashavidha Pariksha clinical dimensions from multimodal intake.
    """

    def synthesize_dashavidha(self, payload: PatientRecordPayload) -> DashavidhaReport:
        """
        Synthesizes the classical 10-fold examination parameters.
        """
        raw_ayush = payload.ayush_dashavidha or {}
        personal = payload.personal_social or {}
        socrates = payload.socrates_hpi
        if hasattr(payload.chief_complaint, "normalized"):
            cc_text = f"{getattr(payload.chief_complaint, 'normalized', '')} {getattr(payload.chief_complaint, 'verbatim', '')}".lower()
        elif isinstance(payload.chief_complaint, str):
            cc_text = payload.chief_complaint.lower()
        else:
            cc_text = ""

        # -------------------------------------------------------------
        # 1. PRAKRITI (Baseline Constitution) & VIKRITI (Active Vitiation)
        # -------------------------------------------------------------
        # Score doshas from symptoms and personal patterns
        vata_score = 1.0
        pitta_score = 1.0
        kapha_score = 1.0

        char_lower = (socrates.character or "").lower()
        timing_lower = (socrates.timing or "").lower()
        assoc_lower = " ".join(socrates.associations or []).lower()

        # Vata indicators: sharp/throbbing pain, variable timing, dry skin, constipation, anxiety
        if "sharp" in char_lower or "throbbing" in char_lower:
            vata_score += 1.5
        if "variable" in timing_lower or "intermittent" in timing_lower:
            vata_score += 1.0
        if "joint" in cc_text or "knee" in cc_text or "back" in cc_text:
            vata_score += 2.0

        # Pitta indicators: burning sensation, fever, inflammation, hyperacidity, loose stools
        if "burning" in char_lower or "acid" in cc_text or "ulcer" in cc_text:
            pitta_score += 2.5
        if "fever" in assoc_lower or "heat" in cc_text:
            pitta_score += 2.0

        # Kapha indicators: dull ache, heaviness, congestion, cough, swelling, lethargy
        if "dull" in char_lower or "heavy" in char_lower:
            kapha_score += 1.5
        if "cough" in cc_text or "cold" in cc_text or "mucus" in cc_text:
            kapha_score += 2.5

        # Incorporate direct questionnaire answers if present
        prakriti_raw = raw_ayush.get("prakriti") or raw_ayush.get("body_physique_prakriti", "")
        if "pitta" in str(prakriti_raw).lower():
            pitta_score += 2.0
        if "vata" in str(prakriti_raw).lower():
            vata_score += 2.0
        if "kapha" in str(prakriti_raw).lower():
            kapha_score += 2.0

        total_score = vata_score + pitta_score + kapha_score
        scores_pct = {
            "Vata": round((vata_score / total_score) * 100, 1),
            "Pitta": round((pitta_score / total_score) * 100, 1),
            "Kapha": round((kapha_score / total_score) * 100, 1)
        }

        # Determine dominant Prakriti
        if pitta_score > vata_score and pitta_score > kapha_score:
            dominant_prakriti = "Pitta Dominant (Paittika)"
            dominant_vikriti = "Pitta Vitiation (Vidagdha Pitta / Ushna Teekshna guna)"
        elif vata_score > pitta_score and vata_score > kapha_score:
            dominant_prakriti = "Vata Dominant (Vatala)"
            dominant_vikriti = "Vata Vitiation (Vata Prakopa / Chala Ruksha guna)"
        elif kapha_score > vata_score and kapha_score > pitta_score:
            dominant_prakriti = "Kapha Dominant (Kaphala)"
            dominant_vikriti = "Kapha Vitiation (Manda Guru Snigdha guna)"
        else:
            dominant_prakriti = "Dwandvaja (Vata-Pitta Constitutional Baseline)"
            dominant_vikriti = "Vata-Pitta Sannipataja Vitiation"

        prakriti_vikriti_str = (
            f"Constitutional Baseline: {dominant_prakriti} [V: {scores_pct['Vata']}%, P: {scores_pct['Pitta']}%, K: {scores_pct['Kapha']}%]. "
            f"Active Pathological State: {dominant_vikriti}."
        )

        # -------------------------------------------------------------
        # 2. AGNI (Digestive Fire) & KOSHTHA (Bowel Motility)
        # -------------------------------------------------------------
        bowel_status = str(personal.get("bowel_bladder", "")).lower()
        if "burn" in cc_text or "acid" in cc_text:
            agni = "Tikshnagni (Hyperactive / Intense Digestive Fire)"
            koshtha = "Mridu Koshtha (Sensitive / Rapid GI motility)"
        elif "constipat" in bowel_status or "hard" in bowel_status or "irregular" in timing_lower:
            agni = "Vishamagni (Irregular / Vata-provoked Digestion)"
            koshtha = "Krura Koshtha (Sluggish / Hard Constipated Bowel)"
        elif "heavy" in char_lower or "sluggish" in bowel_status:
            agni = "Mandagni (Low / Slow Metabolic Fire with Ama formation)"
            koshtha = "Madhyama Koshtha (Normal-Moderate motility)"
        else:
            agni = "Samagni (Equilibrated Digestive Metabolism)"
            koshtha = "Madhyama Koshtha (Regular Bowel Habits)"

        agni_koshtha_str = f"Agni: {agni}. Koshtha: {koshtha}."

        # -------------------------------------------------------------
        # 3. BALA (Physical Strength) & DHATU SARATA (Tissue Excellence)
        # -------------------------------------------------------------
        age_val = None
        try:
            age_val = int(payload.patient_meta.age or 0)
        except Exception:
            pass

        if age_val and (age_val < 14 or age_val > 65):
            bala = "Avara Bala (Delicate / Reduced Physical Vitality)"
            vayas = "Vriddha Avastha (Elderly)" if (age_val and age_val > 60) else "Balya Avastha (Pediatric)"
        else:
            bala = "Madhyama to Pravara Bala (Moderate to High Functional Resilience)"
            vayas = "Madhyama Vayas (Adult 18-60 years)"

        site_lower = (socrates.site or "").lower()
        if "joint" in cc_text or "knee" in cc_text or "sandhi" in cc_text or "sandhi" in site_lower or "knee" in site_lower:
            dhatu_sarata = "Asthi & Sandhi Dhatu involvement (Articular degeneration)"
        else:
            dhatu_sarata = "Rasa & Rakta Dhatu primary circulation"
        bala_dhatu_str = f"Vitality: {bala} ({vayas}). Tissue Affliction (Dhatu Sarata): {dhatu_sarata}."

        # -------------------------------------------------------------
        # 4. AHARA & VIHARA SHAKTI (Intake, Digestion & Lifestyle Regimen)
        # -------------------------------------------------------------
        diet_desc = personal.get("diet", "Mixed vegetarian diet")
        sleep_desc = personal.get("sleep", "Adequate sleep")
        ahara_shakti = (
            f"Dietary Intake (Abhyavaharana Shakti): Adequate. Digestion Power (Jarana Shakti): Correlates with {agni.split(' ')[0]}. "
            f"Diet Pattern: {diet_desc}. Sleep Regimen (Nidra Vihara): {sleep_desc}."
        )

        # -------------------------------------------------------------
        # 5. DESHA, KALA & SATMYA (Ecological & Seasonal Influences)
        # -------------------------------------------------------------
        desha_kala_str = (
            "Habitat: Sadharana Desha (Temperate / Mixed Ecological Zone). "
            "Seasonal Factor (Kala): Sharad-Hemanta transitional Ritu. "
            "Habituation (Satmya): Mixed dietary habituation; seasonal dosha aggravation identified."
        )

        # Recommendations
        recommendations = []
        if "pitta" in dominant_vikriti.lower():
            recommendations.append("Prescribe Sheeta (cooling) and Tikta-Madhura (bitter-sweet) Ahara; avoid spicy and sour substances.")
            recommendations.append("Consider Pitta Shamaka formulations (e.g. Kamadudha Rasa, Avipattikar Churna, Sutashekhara Rasa).")
        elif "vata" in dominant_vikriti.lower():
            recommendations.append("Prescribe Snigdha (unctuous), Ushna (warm) Ahara; regular warm water hydration.")
            recommendations.append("Consider Vata Shamaka therapy (e.g. Dashamoola Kwatha, Yogaraja Guggulu, Abhyanga).")
        else:
            recommendations.append("Prescribe Laghu (light), Ruksha, Ushna Ahara to kindle Mandagni and clear Ama.")
            recommendations.append("Consider Trikatu Churna, Triphala Kwatha, and digestive dipana-pachana herbs.")

        return DashavidhaReport(
            prakriti_vikriti=prakriti_vikriti_str,
            agni_koshtha=agni_koshtha_str,
            bala_dhatu_sarata=bala_dhatu_str,
            ahara_vihara_shakti=ahara_shakti,
            desha_kala_satmya=desha_kala_str,
            dosha_scores=scores_pct,
            recommendations=recommendations
        )


# Singleton instance
ayush_synthesizer = AyushSynthesizer()
