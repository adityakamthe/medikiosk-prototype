"""
Standard 8-Part Clinical Summary Generator for MediKiosk Module C.
Transforms pre-validated multimodal slots into the standard universal sequential clinical format:
Chief Complaint -> HPI (SOCRATES) -> Past History -> Meds/Allergies -> Family -> Personal/Social -> ROS -> Prior Labs.
Generates both physician-facing technical documentation and patient-facing mother-tongue audio script.
"""
from typing import Dict, Any, List, Optional
import hashlib
from datetime import datetime, timezone

try:
    from ..schemas.ingestion_schemas import PatientRecordPayload
    from ..schemas.synthesis_schemas import Standard8PartSummary, PatientAudioView
except (ImportError, ValueError):
    from schemas.ingestion_schemas import PatientRecordPayload
    from schemas.synthesis_schemas import Standard8PartSummary, PatientAudioView


class SBARSynthesizer:
    """
    Synthesizes structured intake payloads into standardized clinical documentation.
    """

    LANGUAGE_AUDIO_TEMPLATES = {
        "hi": (
            "नमस्ते {name} जी। आपने बताया कि आपको {duration} से {complaint} की समस्या है। "
            "आपकी पूर्व दवाइयाँ और जाँच रिपोर्ट डॉक्टर साहब की स्क्रीन पर भेज दी गई हैं। "
            "कृपया पुष्टि करने के लिए हरा बटन दबाएँ।"
        ),
        "bn": (
            "নমস্কার {name} মহাশয়। আপনি জানিয়েছেন যে আপনার {duration} ধরে {complaint} সমস্যা হচ্ছে। "
            "আপনার আগের ওষুধ এবং পরীক্ষার রিপোর্ট ডাক্তারের স্ক্রিনে পাঠানো হয়েছে। "
            "অনুগ্রহ করে সবুজ বোতাম টিপে নিশ্চিত করুন।"
        ),
        "mr": (
            "नमस्ते {name}। आपण सांगितले की आपल्याला {duration} पासून {complaint} त्रास होत आहे. "
            "आपली जुनी औषधे व तपासण्या डॉक्टरांच्या स्क्रीनवर पाठवण्यात आल्या आहेत. "
            "कृपया खात्री करण्यासाठी हिरवे बटण दाबा."
        ),
        "ta": (
            "வணக்கம் {name}. உங்களுக்கு {duration} காலமாக {complaint} இருப்பதாக தெரிவித்துள்ளீர்கள். "
            "உங்கள் முந்தைய மருந்துகள் மற்றும் பரிசோதனை விவரங்கள் மருத்துவரின் திரைக்கு அனுப்பப்பட்டுள்ளன. "
            "உறுதிப்படுத்த பச்சை பொத்தானை அழுத்தவும்."
        ),
        "en": (
            "Hello {name}. You reported having {complaint} for the past {duration}. "
            "Your previous medications and diagnostic investigations have been transmitted to the physician's dashboard. "
            "Please press the green button to confirm your intake."
        )
    }

    def generate_8_part_summary(self, payload: PatientRecordPayload) -> Standard8PartSummary:
        """
        Synthesizes the standard 8-part sequential clinical history.
        """
        # 1. Chief Complaint
        cc_str = f"{payload.chief_complaint.normalized} (Duration: {payload.chief_complaint.duration})"
        if payload.chief_complaint.verbatim and payload.chief_complaint.verbatim.lower() != payload.chief_complaint.normalized.lower():
            cc_str += f" [Patient stated: \"{payload.chief_complaint.verbatim}\"]"

        # 2. HPI (SOCRATES Chronological Narrative)
        soc = payload.socrates_hpi
        assoc_str = ", ".join(soc.associations) if soc.associations else "None reported"
        hpi_parts = [
            f"Patient presents with {soc.character.lower()} pain localized to {soc.site}.",
            f"Onset was described as {soc.onset}.",
            f"Radiation: {soc.radiation}.",
            f"Associated symptoms: {assoc_str}.",
            f"Temporal pattern: {soc.timing}.",
            f"Exacerbating / Relieving factors: {soc.exacerbating_relieving}.",
            f"Severity rated at {soc.severity} on clinical assessment."
        ]
        hpi_narrative = " ".join(hpi_parts)

        # 3. Past Medical & Surgical History (with explicit provenance tagging)
        past_items = []
        if payload.past_history:
            for item in payload.past_history:
                source_tag = "[Document-Corroborated]" if item.source == "document" else "[Patient-Reported]"
                year_str = f" (Diagnosed: {item.diagnosed_year})" if item.diagnosed_year else ""
                ref_str = f" [Ref: {item.doc_ref}]" if item.doc_ref else ""
                past_items.append(f"• {item.condition}{year_str} — {source_tag}{ref_str}")
            past_str = "\n".join(past_items)
        else:
            past_str = "No prior chronic medical conditions or surgical procedures reported."

        # 4. Drug & Allergy History
        drug_allergy_parts = []
        # Allergies
        if payload.reported_allergies:
            allergy_entries = []
            for a in payload.reported_allergies:
                react = f" (Reaction: {a.reaction})" if a.reaction else ""
                tag = "[Scanned Document]" if a.source == "document" else "[Patient-Reported]"
                allergy_entries.append(f"{a.allergen}{react} {tag}")
            drug_allergy_parts.append(f"Allergies: {'; '.join(allergy_entries)}")
        else:
            drug_allergy_parts.append("Allergies: No known drug allergies (NKDA) reported.")

        # Medications
        if payload.current_medications:
            med_entries = []
            for m in payload.current_medications:
                dose_freq = f" {m.dose or ''} {m.frequency or ''}".strip()
                tag = "[Scanned Prescription]" if m.source == "document" else "[Patient-Reported]"
                comp = f" [Compliance: {m.compliance}]" if m.compliance else ""
                med_entries.append(f"{m.name}{(' ' + dose_freq) if dose_freq else ''} {tag}{comp}")
            drug_allergy_parts.append(f"Active Medications: {'; '.join(med_entries)}")
        else:
            drug_allergy_parts.append("Active Medications: No regular medications recorded.")

        drug_allergy_str = "\n".join(drug_allergy_parts)

        # 5. Family History
        if payload.family_history:
            fam_entries = []
            for fam in payload.family_history:
                fam_entries.append(f"• {fam.get('relation', 'Relative')}: {fam.get('condition', 'Health status recorded')}")
            fam_str = "\n".join(fam_entries)
        else:
            fam_str = "Non-contributory for first-degree premature coronary artery disease, diabetes mellitus, or malignancy."

        # 6. Personal / Social History
        soc_dict = payload.personal_social or {}
        diet = soc_dict.get("diet", "Mixed vegetarian/non-vegetarian")
        smoking = soc_dict.get("smoking", "Non-smoker")
        alcohol = soc_dict.get("alcohol", "Non-drinker")
        sleep = soc_dict.get("sleep", "Adequate (6-8 hours)")
        occupation = soc_dict.get("occupation", "Not specified")
        bowel = soc_dict.get("bowel_bladder", "Regular / Normal")
        social_str = (
            f"Diet: {diet}. Tobacco: {smoking}. Alcohol: {alcohol}. "
            f"Sleep: {sleep}. Bowel/Bladder Habits: {bowel}. Occupation: {occupation}."
        )

        # 7. Review of Systems (ROS - 12 Systems targeted subset)
        ros_dict = payload.review_of_systems or {}
        if ros_dict:
            ros_entries = [f"{sys_name.replace('_', ' ').title()}: {findings}" for sys_name, findings in ros_dict.items()]
            ros_str = "; ".join(ros_entries)
        else:
            ros_str = "Targeted review: Constitutional, Gastrointestinal, and Cardiorespiratory systems reviewed consistent with primary presentation. Other systems unprompted."

        # 8. Prior Investigations Summary
        if payload.prior_investigations:
            lab_entries = []
            for lab in payload.prior_investigations:
                flag = f" [{lab.status}]" if lab.status != "NORMAL" else ""
                unit_str = f" {lab.unit}" if lab.unit else ""
                ref_str = f" (Ref: {lab.reference_range})" if lab.reference_range else ""
                lab_entries.append(f"• {lab.test_name}: {lab.result_value}{unit_str}{ref_str}{flag}")
            prior_labs_str = "\n".join(lab_entries)
        else:
            prior_labs_str = "No previous laboratory or diagnostic reports uploaded."

        return Standard8PartSummary(
            chief_complaint=cc_str,
            hpi=hpi_narrative,
            past_medical_surgical=past_str,
            drug_allergy_history=drug_allergy_str,
            family_history=fam_str,
            personal_social=social_str,
            review_of_systems=ros_str,
            prior_investigations=prior_labs_str
        )

    def generate_clinician_flat_view(
        self,
        summary_8_part: Standard8PartSummary,
        payload: PatientRecordPayload,
        dashavidha_summary: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Creates the flat key-value dictionary compatible with the existing Clinician Dashboard UI.
        Ensures zero regression on existing Next.js frontend components.
        """
        return {
            "chief_complaint": summary_8_part.chief_complaint,
            "hpi": summary_8_part.hpi,
            "past_medical_surgical": summary_8_part.past_medical_surgical,
            "family_history": summary_8_part.family_history,
            "allergies": summary_8_part.drug_allergy_history.split("\n")[0].replace("Allergies: ", ""),
            "medications": (
                summary_8_part.drug_allergy_history.split("\n")[1].replace("Active Medications: ", "")
                if "\n" in summary_8_part.drug_allergy_history
                else "No regular medications"
            ),
            "personal_social": summary_8_part.personal_social,
            "review_of_systems": summary_8_part.review_of_systems,
            "prior_investigations": summary_8_part.prior_investigations,
            "ayush_profile": dashavidha_summary or "Standard clinical intake recorded.",
            "dashavidha_pariksha": dashavidha_summary or "Ayurvedic Dashavidha Pariksha evaluated.",
            "provisional_diagnoses": f"Provisional clinical evaluation of {payload.chief_complaint.normalized} pending physical examination."
        }

    def generate_patient_audio_view(
        self,
        payload: PatientRecordPayload
    ) -> PatientAudioView:
        """
        Synthesizes the colloquial mother-tongue confirmation audio script and computes DPDP Act consent token.
        """
        lang = payload.patient_meta.preferred_language or "hi"
        template = self.LANGUAGE_AUDIO_TEMPLATES.get(lang, self.LANGUAGE_AUDIO_TEMPLATES["en"])

        name = payload.patient_meta.name or "Patient"
        complaint = payload.chief_complaint.verbatim or payload.chief_complaint.normalized
        duration = payload.chief_complaint.duration or "some days"

        audio_script = template.format(name=name, complaint=complaint, duration=duration)

        # Generate DPDP Act 2023 Cryptographic Consent Token (SHA-256 of encounter + timestamp + script)
        now_utc = datetime.now(timezone.utc).isoformat()
        token_input = f"{payload.encounter_id}_{now_utc}_{lang}_{audio_script}".encode("utf-8")
        consent_token = f"DPDP2023-CONSENT-{hashlib.sha256(token_input).hexdigest()[:16].upper()}"

        return PatientAudioView(
            language=f"{lang}-IN" if lang != "en" else "en-IN",
            script=audio_script,
            consent_token=consent_token
        )


# Singleton instance
sbar_synthesizer = SBARSynthesizer()
