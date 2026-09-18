"""
Unit tests for Clinical Verification, Lab Panic Highlighting, and DDI Engine.
"""
import pytest
try:
    from module_b.intelligence.lab_verifier import lab_verifier
    from module_b.intelligence.med_verifier import medication_verifier
    from module_b.intelligence.timeline_cluster import cluster_into_episodes, parse_indian_date
    from module_b.schemas.verification_schemas import SeverityTier
except ImportError:
    from intelligence.lab_verifier import lab_verifier
    from intelligence.med_verifier import medication_verifier
    from intelligence.timeline_cluster import cluster_into_episodes, parse_indian_date
    from schemas.verification_schemas import SeverityTier


def test_loinc_lab_3_tier_and_panic_flags():
    # Normal Hb
    norm_hb = lab_verifier.evaluate_item("Hemoglobin", "14.2", "g/dL")
    assert norm_hb.flag == SeverityTier.NORMAL
    assert not norm_hb.is_panic
    assert norm_hb.loinc_code == "718-7"

    # Abnormal Hb
    abn_hb = lab_verifier.evaluate_item("Hb", "10.5", "g/dL")
    assert abn_hb.flag == SeverityTier.ABNORMAL
    assert not abn_hb.is_panic

    # Panic Low Hb < 7.0
    panic_hb = lab_verifier.evaluate_item("Haemoglobin", "5.8", "g/dL")
    assert panic_hb.flag == SeverityTier.CRITICAL_PANIC
    assert panic_hb.is_panic is True
    assert "CRITICAL PANIC LOW" in panic_hb.alert_message

    # Panic High Creatinine > 4.0
    panic_creat = lab_verifier.evaluate_item("S. Creatinine", "4.8", "mg/dL")
    assert panic_creat.flag == SeverityTier.CRITICAL_PANIC
    assert panic_creat.is_panic is True

    # Panic High Potassium > 6.0
    panic_k = lab_verifier.evaluate_item("Serum Potassium", "6.5", "mEq/L")
    assert panic_k.flag == SeverityTier.CRITICAL_PANIC
    assert panic_k.is_panic is True


def test_gastroprotection_omission_warning():
    # Unshielded NSAID
    meds_unshielded = [{"name": "Tab Ultrafen Plus", "dose": "500mg", "frequency": "1-0-1"}]
    alerts, status, has_crit = medication_verifier.audit_medications(meds_unshielded)
    assert status == "AT_RISK"
    assert any(a.type == "GASTROPROTECTION_OMISSION" for a in alerts)

    # Shielded NSAID with PPI
    meds_shielded = [
        {"name": "Tab Ultrafen Plus", "dose": "500mg", "frequency": "1-0-1"},
        {"name": "Tab Pantocid 40", "dose": "40mg", "frequency": "1-0-0"}
    ]
    alerts_shielded, status_shielded, _ = medication_verifier.audit_medications(meds_shielded)
    assert status_shielded == "PROTECTED"
    assert not any(a.type == "GASTROPROTECTION_OMISSION" for a in alerts_shielded)


def test_therapeutic_duplication_nsaids():
    meds_dual_nsaid = [
        {"name": "Tab Ultrafen Plus"},
        {"name": "Tab Zerodol SP"}
    ]
    alerts, _, _ = medication_verifier.audit_medications(meds_dual_nsaid)
    assert any(a.type == "THERAPEUTIC_DUPLICATION" for a in alerts)


def test_drug_drug_interaction_chelation():
    meds_chelation = [
        {"name": "Cap Doxycycline 100mg"},
        {"name": "Tab Shelcal 500mg"}
    ]
    alerts, _, has_crit = medication_verifier.audit_medications(meds_chelation)
    assert any(a.type == "DRUG_INTERACTION" and "Tetracycline" in a.title for a in alerts)


def test_drug_drug_interaction_hyperkalemia():
    meds_hyperkalemia = [
        {"name": "Tab Telma 40mg"},
        {"name": "Syp Potklor"}
    ]
    alerts, _, has_crit = medication_verifier.audit_medications(meds_hyperkalemia)
    assert any(a.type == "DRUG_INTERACTION" and a.severity == SeverityTier.CRITICAL_PANIC for a in alerts)
    assert has_crit is True


def test_dose_ceiling_exceeded():
    # Over 4000mg Paracetamol / day (e.g. 1500mg TID = 4500mg)
    meds_overdose = [
        {"name": "Tab Paracetamol", "dose": "1500mg", "frequency": "1-1-1"}
    ]
    alerts, _, _ = medication_verifier.audit_medications(meds_overdose)
    assert any(a.type == "DOSE_CEILING" for a in alerts)


def test_timeline_episodic_clustering():
    records = [
        {"document_date": "10/01/2023", "title": "Visit 1"},
        {"document_date": "25/01/2023", "title": "Follow up 1"},  # 15 days later -> Episode 1
        {"document_date": "15/06/2023", "title": "Visit 2"}       # > 45 days later -> Episode 2
    ]
    episodes = cluster_into_episodes(records, day_threshold=45)
    assert len(episodes) == 2
    assert len(episodes[0].records) == 2
    assert len(episodes[1].records) == 1
