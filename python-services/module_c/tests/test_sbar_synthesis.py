"""
Unit tests for SBAR and 8-Part Standard Clinical Synthesis.
"""
import pytest
from engine.sbar_synthesizer import sbar_synthesizer
from schemas.ingestion_schemas import (
    PatientRecordPayload,
    ChiefComplaint,
    SocratesHPI,
    ReportedAllergy,
    CurrentMedicationItem,
    MedicalItem,
    PriorInvestigationItem,
    PatientMeta
)


def test_8_part_clinical_synthesis_ordering_and_content():
    payload = PatientRecordPayload(
        encounter_id="ENC-SBAR-001",
        patient_meta=PatientMeta(
            name="Ramesh Kumar Sharma",
            preferred_language="hi"
        ),
        chief_complaint=ChiefComplaint(
            verbatim="pet me bahut tez jalan hoti hai",
            normalized="Severe Epigastric Burning Pain (Hyperacidity)",
            duration="2 weeks"
        ),
        socrates_hpi=SocratesHPI(
            site="Epigastrium",
            onset="Gradual after spicy meals",
            character="Burning / Sharp",
            radiation="Retrosternal chest",
            associations=["Acid regurgitation", "Nausea"],
            timing="Postprandial (30 mins after food)",
            exacerbating_relieving="Aggravated by empty stomach; temporarily relieved by milk",
            severity="7/10"
        ),
        past_history=[
            MedicalItem(
                condition="Hypertension",
                diagnosed_year=2020,
                source="document",
                doc_ref="prior_opd_card.jpg"
            ),
            MedicalItem(
                condition="Appendectomy",
                diagnosed_year=2015,
                source="patient"
            )
        ],
        reported_allergies=[
            ReportedAllergy(allergen="No known drug allergies", source="speech")
        ],
        current_medications=[
            CurrentMedicationItem(
                name="Tab Telma 40mg",
                dose="40mg",
                frequency="1-0-0",
                source="document",
                compliance="Regular"
            )
        ],
        family_history=[{"relation": "Father", "condition": "Type 2 Diabetes Mellitus"}],
        personal_social={"diet": "Vegetarian", "smoking": "Non-smoker", "alcohol": "None"},
        review_of_systems={"gastrointestinal": "Heartburn, dyspepsia", "cardiovascular": "No palpitations"}
    )

    summary = sbar_synthesizer.generate_8_part_summary(payload)

    # 1. Chief Complaint
    assert "Severe Epigastric Burning Pain" in summary.chief_complaint
    assert "2 weeks" in summary.chief_complaint
    assert "pet me bahut tez jalan" in summary.chief_complaint

    # 2. HPI SOCRATES
    assert "Epigastrium" in summary.hpi
    assert "Retrosternal chest" in summary.hpi
    assert "7/10" in summary.hpi
    assert "Acid regurgitation" in summary.hpi

    # 3. Past Medical & Surgical Provenance
    assert "[Document-Corroborated]" in summary.past_medical_surgical
    assert "[Patient-Reported]" in summary.past_medical_surgical
    assert "Hypertension" in summary.past_medical_surgical
    assert "Appendectomy" in summary.past_medical_surgical

    # 4. Drug & Allergy History
    assert "Telma 40mg" in summary.drug_allergy_history
    assert "Allergies:" in summary.drug_allergy_history

    # 5. Family History
    assert "Father" in summary.family_history
    assert "Diabetes" in summary.family_history

    # 6. Personal / Social History
    assert "Vegetarian" in summary.personal_social
    assert "Non-smoker" in summary.personal_social


def test_bilingual_patient_audio_view_and_dpdp_token():
    payload = PatientRecordPayload(
        encounter_id="ENC-DPDP-002",
        patient_meta=PatientMeta(
            name="Sunita Devi",
            preferred_language="hi"
        ),
        chief_complaint=ChiefComplaint(
            verbatim="ghutne me dard hai",
            normalized="Bilateral Knee Joint Pain",
            duration="3 months"
        )
    )

    audio_view = sbar_synthesizer.generate_patient_audio_view(payload)
    assert audio_view.language == "hi-IN"
    assert "Sunita Devi" in audio_view.script
    assert "3 months" in audio_view.script
    assert audio_view.consent_token is not None
    assert audio_view.consent_token.startswith("DPDP2023-CONSENT-")
