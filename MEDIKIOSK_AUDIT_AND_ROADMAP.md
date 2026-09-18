# MediKiosk: Software Architecture Blueprint, Function Inventory, Gap Analysis & 1–2 Week Implementation Roadmap

> **System Designation**: MediKiosk AI Clinical Intake, Appointment & Centralized Health Interoperability Platform  
> **Platform Paradigm**: 100% Cloud-Native Software Platform (Web, Mobile PWA, Tablet & Consultation Desk)  
> **Regulatory & Healthcare Standards**: Digital Personal Data Protection Act (DPDP 2023), Ayushman Bharat Digital Mission (ABDM FHIR R4), National Resource Center for EHR Standards (NRCeS), and Ministry of AYUSH Clinical Frameworks (*Charaka Samhita*).

---

## 1. Executive Summary & Software-First Vision

### 1.1 The Outpatient Bottleneck & Fragmentation Problem
In Indian government tertiary hospitals, district healthcare centers, and high-volume private hospitals, Outpatient Departments (OPDs) process between **4,000 and 10,000 patients per day**. With doctor-patient consultations compressed to **just over 2 minutes (120–180 seconds)**, physicians face a critical cognitive bottleneck:
1. Eliciting clinical history (Chief Complaint, SOCRATES HPI, past medical illnesses, allergies, medications, and family history).
2. Deciphering fragmented, handwritten paper slips, lab results, and discharge summaries from prior visits across multiple disjointed hospitals.
3. Screening for life-threatening emergency red flags (cardiac arrest, FAST stroke, acute respiratory failure, anaphylaxis).
4. For Ministry of AYUSH clinics, conducting comprehensive *Trividha, Ashtavidha, and Dashavidha Pariksha* (*Charaka Samhita*), *Prakriti*, *Agni*, and *Ahara-Vihara* assessments.

### 1.2 The MediKiosk Software Solution
MediKiosk is designed **strictly as a software platform**—not restricted to or dependent on physical kiosk hardware. It functions across the entire patient-to-hospital lifecycle through responsive web applications, mobile browser access, tablet check-in terminals, and clinician consultation dashboards.

```
+--------------------------------------------------------------------------------------------------------+
|                                    MEDIKIOSK SOFTWARE PLATFORM                                         |
|                                                                                                        |
|   [Patient Smartphone / Web PWA]        [OPD Tablet / Reception Desk]     [Clinician Consultation Desk]|
|   - Online OPD Appointment Booking      - On-Arrival Token Check-in       - Priority Triage Queue View |
|   - Pre-Visit Voice & Touch Intake      - Walk-in Multilingual Intake     - Sub-60s SBAR Clinical Card |
|   - Personal Demographic Ingestion      - Zero-Disk RAM Document Scan     - Discrepancy Reconciliation |
|   - Prescription & Lab Report Upload    - Real-Time Red-Flag Alarms       - 1-Click Attestation & Edit |
+----------------------------------------------------+---------------------------------------------------+
                                                     |
                                   ABDM FHIR R4 / HTTPS API Gateway
                                                     v
+--------------------------------------------------------------------------------------------------------+
|                              CENTRALIZED INTEROPERABLE HEALTH SYSTEM                                   |
|                                                                                                        |
|   +---------------------------------------+         +-----------------------------------------------+  |
|   | ABDM Gateway (M1, M2, M3 Integration) |         | Centralized Health Data Exchange (HIE-CM)     |  |
|   | - ABHA ID & Aadhaar OTP Verification  |         | - Cross-Hospital Longitudinal EHR Repository   |  |
|   | - HIP: Health Data Bundle Publisher   | <=====> | - Patient Diagnosis & Medication Transfer     |  |
|   | - HIU: Cross-Hospital Record Fetching |         | - Universal Patient Timeline across Hospitals |  |
|   +---------------------------------------+         +-----------------------------------------------+  |
|                                                     |                                                  |
|                                                     v                                                  |
|                           +-----------------------------------------------+                            |
|                           | Hospital Information System (HIS) Integration |                            |
|                           | - e-Hospital, Bahmni, OpenEMR, HMIS Connectors|                            |
|                           | - HL7 v2 / FHIR REST APIs / Webhooks          |                            |
|                           +-----------------------------------------------+                            |
+--------------------------------------------------------------------------------------------------------+
```

Key capabilities:
1. **OPD Appointment Booking Engine**: Enables patients to select hospitals, clinical departments, doctors, and time slots online, assigning verified queue tokens.
2. **Multi-Stream Personal & Clinical Data Ingestion**: Seamlessly ingests demographic data (ABHA ID, Aadhaar, insurance, contacts), patient-spoken symptoms, and physical medical documents (zero-disk RAM OCR via Pixtral 12B Vision).
3. **Centralized Health Data Transfer**: Standardizes attested diagnoses, prescriptions, and lab data into validated **HL7 FHIR R4 document bundles** linked to the patient's ABHA ID so that **any hospital in the network can query, view, and update the patient's longitudinal record** with patient consent.
4. **ABDM & HIS Integration**: Connects bidirectionally with the Ayushman Bharat Digital Mission (M1, M2, M3) and hospital information systems (e-Hospital, Bahmni, OpenEMR).

---

## 2. Complete Inventory of Completed Functions

The MediKiosk codebase already contains substantial, fully functional production modules deployed with Next.js 15, Neon Serverless PostgreSQL, Mistral AI, and HL7 FHIR standards.

### 2.1 Module A: Multimodal Conversational History Engine

| Component / Function | Source File | Status | Technical Details |
| :--- | :--- | :--- | :--- |
| **10 Indian Languages Speech Engine** | [app/kiosk/page.tsx](file:///c:/Users/heena/Downloads/medikiosk/app/kiosk/page.tsx), [lib/mistral.ts](file:///c:/Users/heena/Downloads/medikiosk/lib/mistral.ts) | **Completed** | Native scripts, UI translation packs, BCP-47 codes, honorifics, and localized initial questions across 10 official languages: Hindi (`hi`), English (`en`), Bengali (`bn`), Marathi (`mr`), Telugu (`te`), Tamil (`ta`), Gujarati (`gu`), Kannada (`kn`), Malayalam (`ml`), and Punjabi (`pa`). |
| **Continuous Voice Recognition (STT)** | [app/kiosk/page.tsx](file:///c:/Users/heena/Downloads/medikiosk/app/kiosk/page.tsx) | **Completed** | Continuous browser `webkitSpeechRecognition` with dynamic BCP-47 locale switching (`hi-IN`, `mr-IN`, `ta-IN`, etc.), live interim transcript streaming, visual microphone pulsing states, and manual edit fallback. |
| **Server Regional TTS Streamer** | [app/api/tts/route.ts](file:///c:/Users/heena/Downloads/medikiosk/app/api/tts/route.ts), [app/kiosk/page.tsx](file:///c:/Users/heena/Downloads/medikiosk/app/kiosk/page.tsx) | **Completed** | Server endpoint `/api/tts` streaming regional `audio/mpeg`. Cleans bilingual text (splits `हिन्दी / English` to voice native script), removes markdown and emojis, and caches audio. |
| **Audio Collision Avoidance** | [app/kiosk/page.tsx](file:///c:/Users/heena/Downloads/medikiosk/app/kiosk/page.tsx) | **Completed** | State machine using `isAISpeakingRef` and `isMicActiveRef`. Mutes speech capture while audio plays; automatically unmutes upon `audio.onended` to eliminate echo loops. |
| **Spoken Script Auto-Detection** | [app/api/session/[id]/converse/route.ts](file:///c:/Users/heena/Downloads/medikiosk/app/api/session/[id]/converse/route.ts) | **Completed** | Evaluates Unicode character ratios (Latin vs. Devanagari) to maintain language consistency throughout the interview. |
| **Adaptive SOCRATES Clinical Interview** | [lib/mistral.ts:generateConversationalFollowUp](file:///c:/Users/heena/Downloads/medikiosk/lib/mistral.ts#L101) | **Completed** | Multi-turn interview powered by `mistral-small-latest`. Methodically covers Site & Onset (S/O), Character & Radiation (C/R), Associated Symptoms & Timing (A/T), Exacerbating/Relieving Factors & Severity (E/S), Chronic Illnesses, Medications, Allergies, and Family History. |
| **Hard-coded Clinical Fallback Trees** | [lib/mistral.ts](file:///c:/Users/heena/Downloads/medikiosk/lib/mistral.ts#L253) | **Completed** | Deterministic 8-turn clinical interview tree across languages that executes seamlessly if LLM connectivity is delayed or unavailable. |
| **Dual-Mode Voice & Touch Selection** | [app/kiosk/page.tsx](file:///c:/Users/heena/Downloads/medikiosk/app/kiosk/page.tsx) | **Completed** | Every clinical question renders 4 to 6 bilingual quick-tap chips alongside live microphone speech recognition. |
| **Deterministic Red-Flag Safety Engine** | [lib/redflag.ts:checkRedFlagRules](file:///c:/Users/heena/Downloads/medikiosk/lib/redflag.ts#L35) | **Completed** | **100% Zero-LLM deterministic regex/keyword rule matching** for acute cardiac symptoms, FAST stroke, acute respiratory distress, anaphylaxis, severe hemorrhage, convulsions, and shock. |
| **Emergency Confirmation Safety Gate** | [lib/redflag.ts](file:///c:/Users/heena/Downloads/medikiosk/lib/redflag.ts#L130), [app/api/session/[id]/converse/route.ts](file:///c:/Users/heena/Downloads/medikiosk/app/api/session/[id]/converse/route.ts) | **Completed** | Stage 1 detects suspicion; Stage 2 asks a targeted confirmation question (e.g., verifying if chest pain is crushing or mild muscular discomfort) to avoid false-positive hospital alerts. |
| **Emergency Alarm & Resuscitation Routing** | [app/kiosk/page.tsx](file:///c:/Users/heena/Downloads/medikiosk/app/kiosk/page.tsx), [lib/doctors.ts](file:///c:/Users/heena/Downloads/medikiosk/lib/doctors.ts) | **Completed** | Flashing red emergency alert, siren audio (`playEmergencySirenAudio()`), database logging in `red_flag_events`, and direct routing to Emergency Resuscitation Bay (Room ER-1 / Dr. Priya Nair). |
| **Clinical Symptom & Organ System Extraction** | [lib/diagnosis.ts:analyzeVoiceInputForDiagnosis](file:///c:/Users/heena/Downloads/medikiosk/lib/diagnosis.ts#L29) | **Completed** | Maps patient complaints to organ systems (Cardiovascular, Respiratory, Gastrointestinal, Neurological, Musculoskeletal, Febrile), assigning clinical acuity and ICD-10 suggestions. |
| **Doctor Roster & Room Allocation** | [lib/doctors.ts](file:///c:/Users/heena/Downloads/medikiosk/lib/doctors.ts) | **Completed** | Dynamic department and room allocation (Orthopedics / Room 102, Pediatrics / Room 105, General Medicine / Room 101, Emergency / Room ER-1, AYUSH / Room 108) with queue wait-time calculations. |

---

### 2.2 Module B: Medical Document Digitization & Zero-Disk Intelligence

| Component / Function | Source File | Status | Technical Details |
| :--- | :--- | :--- | :--- |
| **Zero-Disk Volatile RAM Processing** | [app/api/session/[id]/scan/route.ts](file:///c:/Users/heena/Downloads/medikiosk/app/api/session/[id]/scan/route.ts) | **Completed** | **DPDP 2023 compliant zero-disk architecture**. Document images from camera or file picker are converted into memory buffers (`Buffer.from(await file.arrayBuffer())`), evaluated via Pixtral Vision, and immediately garbage-collected without ever persisting to disk. |
| **Patient Context Infusion for OCR** | [app/api/session/[id]/scan/route.ts](file:///c:/Users/heena/Downloads/medikiosk/app/api/session/[id]/scan/route.ts#L20), [lib/mistral.ts](file:///c:/Users/heena/Downloads/medikiosk/lib/mistral.ts#L563) | **Completed** | Verbal intake history from `structured_history` is passed into the Pixtral 12B Vision prompt to disambiguate messy Indian doctor handwriting and medicine abbreviations (e.g. resolving "PCM 650 TDS", "Pan-D", "Amox-Clav 625"). |
| **Multimodal Entity Extraction** | [lib/mistral.ts:extractDocumentEntitiesFromBase64](file:///c:/Users/heena/Downloads/medikiosk/lib/mistral.ts#L563) | **Completed** | Extracts structured medical entities using Mistral Pixtral 12B (`pixtral-12b-2409`): diagnoses, medications (dose, route, frequency, duration), lab values (test name, numerical value, unit, reference range), and doctor advice. |
| **Low-Confidence Extraction Gate** | [app/api/session/[id]/scan/route.ts](file:///c:/Users/heena/Downloads/medikiosk/app/api/session/[id]/scan/route.ts#L55) | **Completed** | Entities with confidence `< 0.70` are flagged with `needs_verification = TRUE` in the database, blocking unverified clinician sign-off. |
| **Document Quality Assessment** | [app/api/session/[id]/scan/route.ts](file:///c:/Users/heena/Downloads/medikiosk/app/api/session/[id]/scan/route.ts#L30) | **Completed** | Evaluates document legibility as `PASSED` or `FAILED_UNREADABLE` with feedback prompts for re-uploading. |

---

### 2.3 Module C: Structured History Summary Generator & Clinician Review

| Component / Function | Source File | Status | Technical Details |
| :--- | :--- | :--- | :--- |
| **Bilingual Summary Synthesis** | [lib/mistral.ts:generateBilingualSummary](file:///c:/Users/heena/Downloads/medikiosk/lib/mistral.ts#L656), [app/api/session/[id]/summary/route.ts](file:///c:/Users/heena/Downloads/medikiosk/app/api/session/[id]/summary/route.ts) | **Completed** | Generates a plain-language confirmation recap in the patient's language + a structured SBAR (Situation, Background, Assessment, Recommendation) clinical report for the doctor. |
| **Rule-Based Contradiction Detection** | [app/api/session/[id]/summary/route.ts](file:///c:/Users/heena/Downloads/medikiosk/app/api/session/[id]/summary/route.ts#L42) | **Completed** | Cross-references verbal claims (e.g. "No allergies") against extracted document medications/diagnoses and records discrepancies in the `contradictions` table. |
| **Clinician Portal Authentication Gate** | [app/clinician/page.tsx](file:///c:/Users/heena/Downloads/medikiosk/app/clinician/page.tsx#L31) | **Completed** | Password-gated doctor dashboard (`MediKiosk`) with clinical department filtering. |
| **Real-Time Priority Queue Polling** | [app/clinician/page.tsx](file:///c:/Users/heena/Downloads/medikiosk/app/clinician/page.tsx#L44), [app/api/clinician/queue/route.ts](file:///c:/Users/heena/Downloads/medikiosk/app/api/clinician/queue/route.ts) | **Completed** | Polls queue every 4 seconds. Automatically sorts cases: Emergency Red Flags (Red badge) -> Active Contradictions (Amber badge) -> Queue Token order. |
| **Sub-60-Second SBAR Clinical View** | [app/clinician/page.tsx](file:///c:/Users/heena/Downloads/medikiosk/app/clinician/page.tsx#L47) | **Completed** | Unified intake summary: Demographics, Chief Complaint, HPI (SOCRATES breakdown), Chronic Conditions, Active Medications, Allergies, Family History, Lab Findings, and Classical AYUSH assessment. |
| **Interactive Accept / Edit / Reject Controls** | [app/clinician/page.tsx](file:///c:/Users/heena/Downloads/medikiosk/app/clinician/page.tsx), [app/api/clinician/session/[id]/review/route.ts](file:///c:/Users/heena/Downloads/medikiosk/app/api/clinician/session/[id]/review/route.ts) | **Completed** | Inline controls for every section. Modifying or rejecting requires entering a mandatory clinical rationale logged in `review_actions`. |
| **Side-by-Side Contradiction Resolution** | [app/clinician/page.tsx](file:///c:/Users/heena/Downloads/medikiosk/app/clinician/page.tsx) | **Completed** | Discrepancy resolution cards comparing patient statement against scanned document evidence with one-click doctor sign-off. |
| **Attestation Safety Gates** | [app/api/clinician/session/[id]/attest/route.ts](file:///c:/Users/heena/Downloads/medikiosk/app/api/clinician/session/[id]/attest/route.ts), [app/clinician/page.tsx](file:///c:/Users/heena/Downloads/medikiosk/app/clinician/page.tsx) | **Completed** | Blocks attestation if unresolved contradictions or unreviewed low-confidence extractions (<70%) remain. |
| **Patient Discharge & Cascade Cleanup** | [app/api/clinician/session/[id]/route.ts](file:///c:/Users/heena/Downloads/medikiosk/app/api/clinician/session/[id]/route.ts#L101) | **Completed** | Removes completed/discharged patients from active queue, executing foreign-key safe cascade deletions across all 12 dependent tables. |

---

### 2.4 Module D: Consent, Privacy, & ABDM Standards

| Component / Function | Source File | Status | Technical Details |
| :--- | :--- | :--- | :--- |
| **DPDP Act 2023 Digital Consent Engine** | [app/api/session/[id]/consent/route.ts](file:///c:/Users/heena/Downloads/medikiosk/app/api/session/[id]/consent/route.ts), [app/kiosk/page.tsx](file:///c:/Users/heena/Downloads/medikiosk/app/kiosk/page.tsx) | **Completed** | Captures explicit consent before clinical questioning. Supports Self (Touch/Voice) and Guardian consent, plays DPDP notice aloud, and logs to `consent_records`. |
| **Consent Revocation Protocol** | [app/api/session/[id]/consent/route.ts](file:///c:/Users/heena/Downloads/medikiosk/app/api/session/[id]/consent/route.ts#L11) | **Completed** | Supports digital consent withdrawal (`revoke: true`), timestamping `revoked_at` and terminating the session. |
| **Reception Fallback for Declined Consent** | [app/kiosk/page.tsx](file:///c:/Users/heena/Downloads/medikiosk/app/kiosk/page.tsx#L130) | **Completed** | If digital consent is declined, redirects patient to the ground-floor central reception desk (Counter 1–4) for paper registration. |
| **Continuous Queue Token Allocation** | [app/api/session/route.ts](file:///c:/Users/heena/Downloads/medikiosk/app/api/session/route.ts#L8) | **Completed** | Atomically computes the next continuous queue token (`Q-101`, `Q-102`...) from database records to prevent duplicate or resetting numbers. |
| **HL7 FHIR Release 4 Document Bundle Generator**| [lib/fhir.ts:buildSyntheticFHIRBundle](file:///c:/Users/heena/Downloads/medikiosk/lib/fhir.ts#L14) | **Completed** | Generates compliant HL7 FHIR R4 JSON document bundles containing: `Composition`, `Patient` (ABHA & Queue ID), `Encounter`, `Condition`, `MedicationStatement`, `AllergyIntolerance`, and `Observation`. |
| **FHIR R4 Schema Validator** | [lib/fhir.ts:validateFHIRBundleSchema](file:///c:/Users/heena/Downloads/medikiosk/lib/fhir.ts#L125) | **Completed** | Validates generated bundles against FHIR R4 requirements (identifier systems, resource types, coding structures). |
| **NRCeS Aligned Clinical Note Generator** | [lib/fhir.ts:generateTextualClinicalReport](file:///c:/Users/heena/Downloads/medikiosk/lib/fhir.ts#L173) | **Completed** | Produces plain-text consultation summaries conforming to NRCeS EHR standards, with clipboard copy and `.txt` file download. |
| **System-Wide Immutable Audit Trail** | `audit_log` Table | **Completed** | Logs actions (`CREATE_SESSION`, `SIGN_ATTESTATION`, `DELETE_SESSION`) with actor ID, table name, and timestamp. |

---

### 2.5 Specialized Ministry of AYUSH Framework

| Component / Function | Source File | Status | Technical Details |
| :--- | :--- | :--- | :--- |
| **Password-Protected AYUSH Mode** | [app/kiosk/page.tsx](file:///c:/Users/heena/Downloads/medikiosk/app/kiosk/page.tsx#L794) | **Completed** | Staff toggle (password `Ayurveda`) switching the intake engine to the classical Ayurvedic clinical framework. |
| **Classical Dashavidha Pariksha (दशविध परीक्षा)** | [lib/ayush.ts](file:///c:/Users/heena/Downloads/medikiosk/lib/ayush.ts) | **Completed** | Implements *Charaka Samhita Vimana Sthana 8/94* dimensions: Dushya, Desha, Bala, Kala, Anala/Agni, Prakriti, Vayas, Sattva, Satmya, and Ahara-Shakti. |
| **Prakriti & Tridosha Scoring Algorithm** | [lib/ayush.ts:computeDoshaAssessment](file:///c:/Users/heena/Downloads/medikiosk/lib/ayush.ts#L24) | **Completed** | Evaluates Vata, Pitta, and Kapha bio-energies, classifying dominant Prakriti (Vata, Pitta, Kapha, Dwandvaja, or Tridoshic). |
| **Agni, Koshta & Bala Profiling** | [lib/ayush.ts](file:///c:/Users/heena/Downloads/medikiosk/lib/ayush.ts#L29) | **Completed** | Assesses digestive metabolic fire (Samagni, Vishamagni, Tikshnagni, Mandagni), bowel nature (Mrudu, Madhyama, Krura), and physical strength (Pravara, Madhyama, Avara). |
| **Classical Formulation Reference** | [lib/ayush.ts](file:///c:/Users/heena/Downloads/medikiosk/lib/ayush.ts#L300) | **Completed** | Recognizes traditional Ayurvedic preparation forms: *Kwath* (decoction), *Churna* (powder), *Vati* (tablet), *Taila* (oil), *Bhasma* (calcined mineral), and *Asava/Arishta* (tonic). |
| **Ayurvedic Clinician Dashboard View** | [app/clinician/page.tsx](file:///c:/Users/heena/Downloads/medikiosk/app/clinician/page.tsx#L1250) | **Completed** | Dedicated Ayurvedic review interface displaying Dashavidha dimensions, Dosha distribution charts, and lifestyle recommendations. |

---

### 2.6 Relational Database Infrastructure (Neon PostgreSQL)

16 relational tables with strict three-tier medical data separation:
1. **Tier 1 (Patient Evidence Layer - Immutable)**: `sessions`, `consent_records`, `raw_answers`, `document_uploads`, `audio_segments`.
2. **Tier 2 (Intake Draft Layer - AI Generated)**: `structured_history`, `extracted_entities`, `draft_summaries`, `contradictions`, `red_flag_events`.
3. **Tier 3 (Clinician Attested Layer - Legally Binding)**: `review_actions`, `attested_records`, `fhir_bundles`, `terminology_versions`, `users_staff`, `audit_log`.

---

## 3. Gap Analysis: What is Remaining According to the Problem Statement

The following capabilities bridge the gap to make MediKiosk a complete, software-driven, centralized health intake platform.

```
+---------------------------------------------------------------------------------------------------------+
|                                      NEW GAP ANALYSIS AREAS                                             |
|                                                                                                         |
|  [1. Appointment Booking Engine]   [2. Multi-Stream Data Ingestion]  [3. Centralized Cross-Hospital EHR]|
|  - Web/Mobile pre-visit booking    - ABHA / Aadhaar / Phone OTP      - Centralized FHIR R4 Repository   |
|  - Department & doctor slot picker - Insurance & emergency contacts  - Cross-hospital consent queries   |
|  - Pre-consultation intake at home - Multi-page document aggregation - Universal longitudinal timeline  |
|                                                                                                         |
|  [4. Live ABDM Gateway M1/M2/M3]   [5. HIS / EMR Interoperability]   [6. Clinician Workflow Extensions] |
|  - M1: Aadhaar OTP & ABHA Address  - e-Hospital / Bahmni / OpenEMR   - Dual SBAR / SOAP note toggle     |
|  - M2: HIP Health Record Publisher - HL7 v2 ADT/ORM + FHIR REST client- Lab range & DDI visualizer      |
|  - M3: HIU Cross-Hospital Consent  - Webhook synchronization         - 1-click printable prescription   |
+---------------------------------------------------------------------------------------------------------+
```

### 3.1 Online OPD Appointment Booking Engine
* **Current State**: Generates walk-in queue tokens sequentially (`Q-101`, `Q-102`).
* **Remaining**:
  1. Patient-facing web/mobile appointment scheduling portal: select hospital, clinical department, doctor, and date/time slot.
  2. Slot management and quota limits (e.g. 30 online slots + 50 walk-in slots per OPD shift).
  3. Pre-consultation remote intake: Patients complete voice/touch history and upload documents from their smartphone *before* arriving at the hospital.
  4. Instant digital appointment slip with QR code for quick check-in upon hospital arrival.

### 3.2 Comprehensive Personal & Clinical Data Ingestion
* **Current State**: Captures name, age, gender, mock ABHA ID, verbal symptom interview, and single document upload.
* **Remaining**:
  1. **Personal Identity Ingestion**: Verified ABHA ID (`xyz@abdm`), Aadhaar OTP verification, phone number, residential address, emergency contact, and Ayushman Bharat PM-JAY / private insurance policy details.
  2. **Multi-Page Document Ingestion**: Batch upload support for multi-page discharge summaries, laboratory panels, and diagnostic imaging reports (JPEG, PNG, PDF).
  3. **Structured Review of Systems (ROS) & Lifestyle**: Structured data entry for tobacco/smoking (pack-years), alcohol use, occupational exposures, and organ-system review.

### 3.3 Centralized Interoperable System (Cross-Hospital Data Access)
* **Current State**: Stores FHIR R4 document bundles locally in the hospital's Neon PostgreSQL database.
* **Remaining**:
  1. **Centralized Health Data Repository**: A federated, cloud-hosted health data exchange where attested diagnostic summaries, prescriptions, and lab values are linked to the patient's 14-digit ABHA ID.
  2. **Cross-Hospital Query & Access**: When a patient visits Hospital B, the clinician in Hospital B can request consent via ABDM. Upon patient approval, Hospital B instantly retrieves the structured history, prior diagnoses, and lab trends created at Hospital A.
  3. **Longitudinal Health Timeline**: Cross-hospital chronological medical timeline aggregating records from all participating institutions.

### 3.4 Full ABDM & HIS Integration
* **Current State**: Generates synthetic FHIR R4 bundles and NRCeS text consultation reports.
* **Remaining**:
  1. **ABDM Milestone 1 (M1)**: Live Aadhaar OTP verification, ABHA address generation, and demographic auto-population.
  2. **ABDM Milestone 2 (M2)**: Health Information Provider (HIP) service pushing attested clinical bundles to the ABDM Health Information Exchange.
  3. **ABDM Milestone 3 (M3)**: Health Information User (HIU) service querying and fetching historical records from other hospitals via ABDM Consent Manager.
  4. **HIS / EMR Connectors**: Out-of-the-box adapters (HL7 v2 MLLP client, FHIR RESTful client, and database webhooks) for government and open-source hospital systems (e-Hospital, Bahmni, OpenEMR, Medplum).

---

## 4. Accelerated 1–2 Week Implementation Plan

The plan below organizes the remaining capabilities into a focused **1 to 2 Week (10 to 14 Business Days)** development schedule.

```
+---------------------------------------------------------------------------------------------------------------+
|                                    1–2 WEEK IMPLEMENTATION SPRINT ROADMAP                                     |
|                                                                                                               |
|  [DAYS 1–3: SPRINT 1]            [DAYS 4–7: SPRINT 2]             [DAYS 8–11: SPRINT 3]   [DAYS 12–14: SPRINT 4]  |
|  Appointments & Ingestion        Centralized System & ABDM        HIS Connectors & Doctor Pilot Validation    |
|  - Online Booking & Slot Engine  - Central FHIR Data Exchange     - e-Hospital / Bahmni   - Security Audit    |
|  - Personal Data & Insurance Ingest- ABDM M1 (ABHA / Aadhaar OTP) - Cross-Hospital Consent- High-Throughput  |
|  - Remote Pre-Intake Web Portal  - ABDM M2 (HIP Bundle Publisher) - SOAP / SBAR Toggle    - Hospital Deployment|
|  - Multi-Page Document Feeder    - ABDM M3 (HIU Record Fetching)  - Lab Ranges & DDI Check- Staff Training    |
+---------------------------------------------------------------------------------------------------------------+
```

---

### Sprint 1: Appointment Booking & Multi-Stream Data Ingestion (Days 1–3)

#### Objective
Enable patients to book OPD appointments online, complete pre-consultation intake remotely from their smartphone, and expand data ingestion to include insurance, emergency contacts, and multi-page documents.

#### Deliverables & Steps
1. **Build Appointment Booking Engine & Slot Manager**:
   - *Files*: `app/appointments/page.tsx`, `app/api/appointments/route.ts`
   - Implement hospital department selection (General Medicine, Orthopedics, Pediatrics, AYUSH, Cardiology).
   - Implement date/time slot picker with quota management.
   - Generate digital booking confirmation with appointment token and QR code.
2. **Expand Personal Data Ingestion**:
   - *Files*: `app/api/session/[id]/route.ts`, `app/kiosk/page.tsx`
   - Ingest emergency contact name and phone number.
   - Ingest PM-JAY / insurance policy details (TPA, policy number).
   - Ingest residential address and pincode.
3. **Remote Pre-Visit Intake Portal**:
   - Allow patients to open a web link on their smartphone upon booking, complete the voice/touch SOCRATES questionnaire, and upload existing prescriptions from home.
4. **Multi-Page Document Ingestion**:
   - *Files*: `app/api/session/[id]/scan/route.ts`, `components/kiosk/DocumentScanner.tsx`
   - Support batch uploads of multi-page discharge summaries and lab panels (PDF, JPEG, PNG).

---

### Sprint 2: Centralized System & ABDM Gateway Integration (Days 4–7)

#### Objective
Establish the centralized cross-hospital health data exchange and integrate with the Ayushman Bharat Digital Mission (ABDM) Gateway for Milestones M1, M2, and M3.

#### Deliverables & Steps
1. **Centralized Cross-Hospital Health Data Repository**:
   - *Files*: `lib/centralExchange.ts`, `app/api/exchange/records/route.ts`
   - Create a centralized, cloud-hosted health data exchange API.
   - Index all attested consultation records, diagnoses, and medication statements by the patient's 14-digit ABHA ID.
   - Implement token-authorized REST endpoints allowing participating hospitals to query longitudinal patient history.
2. **ABDM Milestone 1 (M1) — ABHA ID & Aadhaar OTP Verification**:
   - *Files*: `lib/abdmClient.ts`, `app/api/abdm/m1/generate-otp/route.ts`, `app/api/abdm/m1/verify-otp/route.ts`
   - Connect to ABDM Sandbox Gateway session API (`/v0.5/sessions`).
   - Implement Aadhaar OTP and Mobile OTP verification.
   - Auto-populate verified demographic profile (name, gender, DOB, address, ABHA address).
3. **ABDM Milestone 2 (M2) — HIP Health Record Publishing**:
   - *Files*: `app/api/abdm/m2/publish-bundle/route.ts`
   - Upon clinician attestation, transform the intake record into an ABDM-compliant HL7 FHIR R4 Bundle and publish it to the ABDM Health Information Provider (HIP) bridge.
   - Link the record to the patient's national Personal Health Record (PHR).
4. **ABDM Milestone 3 (M3) — HIU Cross-Hospital Consent Fetching**:
   - *Files*: `app/api/abdm/m3/consent-request/route.ts`, `app/api/abdm/m3/fetch-records/route.ts`
   - Implement Health Information User (HIU) consent request artifact.
   - Allow doctors to request historical records from other hospitals via the ABDM Consent Manager, fetching and displaying past diagnoses on screen.

---

### Sprint 3: Hospital Information System (HIS) Connectors & Doctor Workflow (Days 8–11)

#### Objective
Connect the platform directly to hospital information systems (e-Hospital, Bahmni, OpenEMR), enhance the doctor dashboard with dual SBAR/SOAP notes, abnormal lab flags, and drug interaction alerts.

#### Deliverables & Steps
1. **Hospital Information System (HIS) Adapters**:
   - *Files*: `lib/hisConnector.ts`, `app/api/his/sync/route.ts`
   - Implement HL7 v2 / FHIR REST client connectors for Indian government hospital systems (**NIC e-Hospital**, **Bahmni**, **OpenEMR**).
   - Sync appointment slots bidirectionally and push attested consultation summaries directly into the hospital's electronic medical record database.
2. **Cross-Hospital Chronological Timeline Component**:
   - *Files*: `components/clinician/MedicalTimeline.tsx`, `app/clinician/page.tsx`
   - Render an interactive timeline in the doctor dashboard displaying historical encounters, diagnoses, lab tests, and hospital admissions from across all connected hospitals.
3. **Dual SBAR / SOAP Note Layout Toggle**:
   - *Files*: `app/clinician/page.tsx`, `lib/fhir.ts`
   - Add a segmented toggle on the consultation page allowing doctors to switch between **SBAR** (Situation, Background, Assessment, Recommendation) and **SOAP** (Subjective, Objective, Assessment, Plan) formats.
4. **Abnormal Lab Visualizer & Drug-Drug Interaction (DDI) Matrix**:
   - *Files*: `lib/labRanges.ts`, `lib/pharmacology.ts`
   - Highlight out-of-range lab results with color-coded badges (`CRITICAL HIGH`, `BORDERLINE`).
   - Cross-check newly extracted medications against the patient's existing drug list, displaying warning cards for dangerous drug interactions.

---

### Sprint 4: Security Audit, End-to-End Testing & Hospital Pilot Deployment (Days 12–14)

#### Objective
Perform end-to-end clinical workflow testing, verify DPDP 2023 compliance, conduct simulated high-load testing, and package the software for live hospital deployment.

#### Deliverables & Steps
1. **End-to-End Workflow Verification**:
   - Test complete patient journey: Online Appointment Booking -> Remote Pre-Intake -> On-Arrival Token Check-in -> Clinician SBAR/SOAP Review -> Contradiction Resolution -> Attestation -> ABDM Publishing -> Cross-Hospital Retrieval in a second hospital view.
2. **DPDP Act 2023 & Security Audit**:
   - Verify zero-disk volatile RAM processing: confirm no patient images or unencrypted PII persist on local terminal storage.
   - Verify audit trail completeness in the `audit_log` table.
3. **High-Throughput Performance Testing**:
   - Validate API performance under simulated high OPD load (500+ concurrent requests) using Neon connection pooling.
4. **Hospital Staff Training & Deployment Packaging**:
   - Deploy Dockerized / Vercel cloud instance.
   - Prepare clinician quick-start guide and OPD intake reception orientation.

---

## 5. Summary of Deliverables by End of Week 2

| Module | Before Sprint (Current) | After Week 2 Sprint (Delivered) |
| :--- | :--- | :--- |
| **Platform Scope** | Kiosk-centric terminal application | **100% Cloud-Native Software Platform** (Web, Mobile PWA, Tablet, Clinician Desk) |
| **Appointments** | Walk-in queue tokens only | **Online OPD Appointment Booking Engine** with department/doctor slot selection |
| **Data Ingestion** | Demographics + Spoken Symptoms + Single Image | **Multi-Stream Ingestion**: ABHA, Aadhaar OTP, Insurance, Emergency Contacts, Multi-Page PDFs |
| **Cross-Hospital Access** | Local database storage | **Centralized Interoperable Health System**: Cross-hospital FHIR R4 query & access |
| **ABDM Integration** | Synthetic FHIR & mock IDs | **Live ABDM Gateway (M1, M2, M3)**: Real-time ABHA OTP, HIP publishing, HIU consent retrieval |
| **HIS Integration** | None | **Live HIS Adapters**: Bidirectional sync with e-Hospital, Bahmni, and OpenEMR |
| **Clinician UI** | SBAR view only | **Dual SBAR / SOAP Views**, Chronological Medical Timeline, Lab Range & DDI alerts |

---

## 6. Key Code References

- **Audit & Roadmap Document**: [MEDIKIOSK_AUDIT_AND_ROADMAP.md](file:///c:/Users/heena/Downloads/medikiosk/MEDIKIOSK_AUDIT_AND_ROADMAP.md)
- **Patient Intake Portal**: [app/kiosk/page.tsx](file:///c:/Users/heena/Downloads/medikiosk/app/kiosk/page.tsx)
- **Clinician Consultation Dashboard**: [app/clinician/page.tsx](file:///c:/Users/heena/Downloads/medikiosk/app/clinician/page.tsx)
- **Deterministic Red-Flag Safety Engine**: [lib/redflag.ts](file:///c:/Users/heena/Downloads/medikiosk/lib/redflag.ts)
- **Mistral AI & Pixtral OCR Engine**: [lib/mistral.ts](file:///c:/Users/heena/Downloads/medikiosk/lib/mistral.ts)
- **Ministry of AYUSH Engine**: [lib/ayush.ts](file:///c:/Users/heena/Downloads/medikiosk/lib/ayush.ts)
- **HL7 FHIR R4 Generator**: [lib/fhir.ts](file:///c:/Users/heena/Downloads/medikiosk/lib/fhir.ts)
- **Hospital Doctor Roster & Allocation**: [lib/doctors.ts](file:///c:/Users/heena/Downloads/medikiosk/lib/doctors.ts)
- **Neon PostgreSQL Database Client**: [lib/db.ts](file:///c:/Users/heena/Downloads/medikiosk/lib/db.ts)
