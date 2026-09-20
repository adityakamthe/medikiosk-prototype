"""
Unit tests for Ayurvedic Dashavidha Pariksha Synthesis Engine.
"""
try:
    from engine.ayush_synthesizer import ayush_synthesizer
    from schemas.ingestion_schemas import (
        ChiefComplaint,
        PatientMeta,
        PatientRecordPayload,
        SocratesHPI,
    )
except (ImportError, ModuleNotFoundError):
    from module_c.engine.ayush_synthesizer import ayush_synthesizer
    from module_c.schemas.ingestion_schemas import (
        ChiefComplaint,
        PatientMeta,
        PatientRecordPayload,
        SocratesHPI,
    )


def test_dashavidha_pitta_burning_dyspepsia():
    payload = PatientRecordPayload(
        encounter_id="ENC-AYU-001",
        patient_meta=PatientMeta(
            name="Anil Joshi",
            clinical_mode="ayurveda",
            age="42"
        ),
        chief_complaint=ChiefComplaint(
            verbatim="pet me jalan aur khatti dakar aati hai",
            normalized="Amlapitta / Hyperacidity",
            duration="1 month"
        ),
        socrates_hpi=SocratesHPI(
            site="Kostha / Epigastrium",
            character="Burning sensation (Daha)",
            associations=["Acid reflux", "Nausea (Utklesha)"],
            timing="Tikshnagni post meals"
        ),
        personal_social={
            "diet": "Spicy, oily food habits",
            "bowel_bladder": "Loose stools, burning micturition"
        }
    )

    report = ayush_synthesizer.synthesize_dashavidha(payload)
    assert "Pitta" in report.prakriti_vikriti
    assert "Tikshnagni" in report.agni_koshtha
    assert "Mridu Koshtha" in report.agni_koshtha
    assert len(report.recommendations) >= 1
    assert any("Pitta Shamaka" in r or "cooling" in r.lower() for r in report.recommendations)


def test_dashavidha_vata_joint_pain():
    payload = PatientRecordPayload(
        encounter_id="ENC-AYU-002",
        patient_meta=PatientMeta(
            name="Kamala Bai",
            clinical_mode="ayurveda",
            age="68"
        ),
        chief_complaint=ChiefComplaint(
            verbatim="ghutne me bahut dard aur kadkad awaz aati hai",
            normalized="Sandhivata (Osteoarthritis)",
            duration="6 months"
        ),
        socrates_hpi=SocratesHPI(
            site="Janu Sandhi (Bilateral Knees)",
            character="Sharp throbbing pain (Shoola)",
            timing="Variable, worse in cold weather",
            exacerbating_relieving="Aggravated by movement, relieved by warm fomentation"
        ),
        personal_social={
            "bowel_bladder": "Severe constipation (Krura Koshtha)"
        }
    )

    report = ayush_synthesizer.synthesize_dashavidha(payload)
    assert "Vata" in report.prakriti_vikriti
    assert "Krura Koshtha" in report.agni_koshtha
    assert "Sandhi" in report.bala_dhatu_sarata
    assert any("Vata Shamaka" in r or "warm" in r.lower() for r in report.recommendations)
