# MediKiosk: Complete Project Guide, Feature Catalog & User Workflows

**The Master Reference Manual for MediKiosk — Architecture, Every Feature, Portals, Dashboards, and End-to-End User Journeys**  
*Compliant with India DPDP Act 2023, ABDM Standards (M1/M2/M3), HL7 FHIR Release 4, and Ministry of AYUSH Frameworks.*

---

## Table of Contents
1. [Project Overview & Core Mission](#1-project-overview--core-mission)
2. [Exhaustive Feature Catalog (Every Single Feature)](#2-exhaustive-feature-catalog-every-single-feature)
   - [2.1 Authentication & Multi-Hospital Facilities](#21-authentication--multi-hospital-facilities)
   - [2.2 On-Site Kiosk Intake Terminal (Module A & B)](#22-on-site-kiosk-intake-terminal-module-a--b)
   - [2.3 Patient Portal & Appointment System](#23-patient-portal--appointment-system)
   - [2.4 Clinician Intelligence Suite & OPD Station](#24-clinician-intelligence-suite--opd-station)
   - [2.5 Module C: Multimodal Clinical Verification Engine](#25-module-c-multimodal-clinical-verification-engine)
   - [2.6 Module D: ABDM, FHIR R4 & HIS Bridges](#26-module-d-abdm-fhir-r4--his-bridges)
3. [Portals, Logins & Dashboards In-Depth](#3-portals-logins--dashboards-in-depth)
   - [3.1 Hospital Facility Login Portal (`/hospital-login`)](#31-hospital-facility-login-portal-hospital-login)
   - [3.2 Landing Page & Master Navigation (`/`)](#32-landing-page--master-navigation-)
   - [3.3 On-Site Patient Kiosk Terminal (`/kiosk`)](#33-on-site-patient-kiosk-terminal-kiosk)
   - [3.4 Clinician OPD Dashboard & Review Station (`/clinician`)](#34-clinician-opd-dashboard--review-station-clinician)
   - [3.5 Patient Health Portal & OPD Booking (`/patient`)](#35-patient-health-portal--opd-booking-patient)
   - [3.6 OPD Appointments & Queue Management (`/appointments`)](#36-opd-appointments--queue-management-appointments)
4. [How Every Feature is Connected (System Topology & Data Flow)](#4-how-every-feature-is-connected-system-topology--data-flow)
   - [4.1 Facility-Segregated Dual-Database Pipeline](#41-facility-segregated-dual-database-pipeline)
   - [4.2 Cross-Facility Longitudinal Record Exchange](#42-cross-facility-longitudinal-record-exchange)
   - [4.3 Multi-Modal Clinical Intake & Verification Pipeline](#43-multi-modal-clinical-intake--verification-pipeline)
5. [End-to-End User Workflows (Step-by-Step Journeys)](#5-end-to-end-user-workflows-step-by-step-journeys)
   - [5.1 Workflow 1: Hospital Facility Admin Setup & Portal Unlocking](#51-workflow-1-hospital-facility-admin-setup--portal-unlocking)
   - [5.2 Workflow 2: Walk-In Patient Kiosk Registration & Voice Intake](#52-workflow-2-walk-in-patient-kiosk-registration--voice-intake)
   - [5.3 Workflow 3: Emergency Red-Flag Interception (Zero-LLM Fast Path)](#53-workflow-3-emergency-red-flag-interception-zero-llm-fast-path)
   - [5.4 Workflow 4: Patient Portal Login, Record History & OPD Booking](#54-workflow-4-patient-portal-login-record-history--opd-booking)
   - [5.5 Workflow 5: Attending Clinician Consultation, Prescription & HIS Push](#55-workflow-5-attending-clinician-consultation-prescription--his-push)
6. [Security, Privacy Architecture & DPDP Act 2023 Compliance](#6-security-privacy-architecture--dpdp-act-2023-compliance)
7. [Technology Stack & Dependency Inventory](#7-technology-stack--dependency-inventory)

---

## 1. Project Overview & Core Mission

### 1.1 The Problem in Indian Public Healthcare
In Indian Government and apex medical institutions (such as AIIMS, State Civil Hospitals, and National Institutes), Outpatient Departments (OPDs) experience staggering patient loads. A single physician frequently examines **60 to 120 patients per morning session**, affording **less than 2 to 3 minutes per consultation**. 

Under this time pressure:
- Over 60% of patients face literacy or language barriers, struggling to communicate their medical history in English or formal Hindi.
- Patients arrive with bags of crumpled paper prescriptions, faded thermal lab slips, and discharge summaries from different hospitals.
- Doctors have zero time to read paper reports, transcribe data into EHR systems, or manually cross-check for drug-drug and drug-allergy interactions.
- Longitudinal patient records across allopathic and AYUSH healthcare facilities remain completely siloed.

### 1.2 The MediKiosk Solution
MediKiosk is an edge-deployed, bilingual intelligent clinical terminal installed in the OPD waiting hall. In **3 to 4 minutes while the patient waits for their token number**, MediKiosk:
1. Gathers informed, legal DPDP 2023 consent via voice or touchscreen.
2. Identifies the patient via ABDM ABHA QR scanning or assigns a hospital queue token.
3. Conducts a strict **10 to 12 question adaptive conversational clinical interview** in any of **22 official Indian languages** using AI speech recognition and synthesized voice narration.
4. Continuously runs a zero-latency, deterministic **Red-Flag Emergency Detector** that bypasses the queue and triggers resuscitation bay sirens if life-threatening symptoms are detected.
5. Scans paper prescriptions and lab slips using **Pixtral 12B Vision in volatile RAM** (zero hard disk exposure).
6. Automatically detects out-of-range clinical lab findings without mock data and checks active medications for contraindications against patient allergies.
7. Produces a verified, dual-coded (ICD-10 / SNOMED-CT / NAMASTE) clinical intake sheet and delivers a concise **30 to 45 second English audio briefing** to the attending doctor.

---

## 2. Exhaustive Feature Catalog (Every Single Feature)

Below is an itemized breakdown of every capability built into MediKiosk:

### 2.1 Authentication & Multi-Hospital Facilities
- **Hospital Facility Authentication Gate**: Secure facility login (`/hospital-login`) that requires Hospital Facility Code and Administrator Password before unlocking the kiosk and clinical portals.
- **Facility Segregation**:
  - **Facility 1 (AIIMS New Delhi)**: Apex allopathic multi-specialty center connected to Database 1.
  - **Facility 2 (AIIA Medical Center)**: Apex integrated AYUSH and multi-specialty institute connected to Database 2.
- **Integrated Multi-Specialty Support in Both Facilities**: Both hospitals host all 10 specialized departments (Cardiology, Pulmonology, Gastroenterology, Neurology, Orthopedics, Pediatrics, Dermatology, ENT, General Medicine, and AYUSH Integrative Medicine).
- **Session Locking / Unlock State**: Protects public terminals. Until a hospital facility logs in, on-site kiosks and clinical workstations remain locked with clear administrative prompts.
- **Facility Header Indicator**: Displays active hospital facility name, badge, and DB pool connection live across the header.

### 2.2 On-Site Kiosk Intake Terminal (Module A & B)
- **DPDP Act 2023 Compliant Consent**: Multi-lingual audio and visual consent agreement explaining purpose limitation, ephemeral processing, and patient rights.
- **Guardian Delegation Consent**: Explicit consent capture for pediatric (<18 years) or incapacitated patients.
- **National ABHA QR Scanner**: High-speed camera scanner using `jsQR` with contrast-inversion to scan official ABDM ABHA QR cards and automatically pre-fill demographics.
- **Manual ABHA / Token Fallback**: Allows walk-ins without smartphones to enter their 14-digit ABHA ID or generate a standard OPD token (`A-101`, `B-202`).
- **22 Official 8th Schedule Indian Languages**: Supports Assamese, Bengali, Bodo, Dogri, Gujarati, Hindi, Kannada, Kashmiri, Konkani, Maithili, Malayalam, Manipuri, Marathi, Nepali, Odia, Punjabi, Sanskrit, Santali, Sindhi, Tamil, Telugu, and Urdu.
- **Adaptive 10–12 Question SOCRATES Questionnaire**: Strictly limits questions to 10–12 turns, preventing patient fatigue while systematically capturing:
  1. Chief Complaint & Duration.
  2. Pain / Symptom Character & Radiation (SOCRATES framework).
  3. Associated Symptoms & Aggravating/Relieving Factors.
  4. Drug & Food Allergies.
  5. Past Medical & Surgical History.
  6. Active Medications & Dosages.
  7. Family Hereditary Illness History.
- **Real-Time Speech-to-Text (STT)**: Web Speech API integration with BCP-47 regional language models and live audio amplitude visualization.
- **Bhashini & Google TTS Audio Narration**: Reads questions aloud in the patient's native tongue with automatic fallback proxy.
- **Zero-LLM Emergency Red-Flag Interception**: Deterministic, sub-10ms keyword scanner that catches acute myocardial infarction, stroke, anaphylaxis, severe respiratory distress, or active hemorrhage, immediately activating an 800Hz audio siren and dispatching the patient to emergency triage.
- **Zero-Disk Volatile Vision OCR (Module B)**:
  - Takes snapshots of physical paper prescriptions, lab reports, and doctor slips.
  - Processes images in volatile RAM via Pixtral 12B Vision (never written to physical server disks).
  - Normalizes medications against the **15,000+ CDSCO Approved Drug Database** using RapidFuzz phonetic matching.
  - Normalizes lab tests and map values to **LOINC codes**.

### 2.3 Patient Portal & Appointment System
- **Patient ABHA Authentication**: Login with 14-digit ABHA ID and demo password.
- **Cross-Facility Health Record Aggregation**:
  - Automatically queries both AIIMS New Delhi (DB 1) and AIIA Medical Center (DB 2).
  - Presents a unified chronological timeline of all previous visits, diagnoses, and prescriptions.
- **Integrated "Book OPD Appointment" Flow**: Built directly inside the patient portal (not an isolated menu item).
- **Specialty & Department Selection**: Book appointments across all 10 clinical specialties (Cardiology, Orthopedics, AYUSH, etc.).
- **Doctor & Room Allocation**: Displays assigned clinician, room number, date, and morning/afternoon time slots.
- **Live Queue Token Generation**: Automatically issues OPD tokens upon booking.
- **Self-Service Medical Document Upload**: Patients can upload prior PDF/image reports directly to their longitudinal file.

### 2.4 Clinician Intelligence Suite & OPD Station
- **Live OPD Queue Monitor**: Real-time queue view showing waiting patients, age, gender, token number, triage status, and priority badges.
- **One-Page Clinical Summary Sheet**:
  - **Allopathic Template**: Standard clinical sheet formatted with Chief Complaint, HPI, Medical History, Allergies, Medications, and Systems Review.
  - **Ayurvedic Template**: Complete AYUSH clinical assessment including **Dashavidha Pariksha** (Prakriti, Vikriti, Agni, Koshtha, Bala, Ahara-shakti) and Tridosha balance.
- **Concise 30–45 Second Doctor Audio Briefing (`🎙️ Listen to Clinical Briefing [30-45s]`)**:
  - Synthesizes a focused spoken summary in clear English.
  - Focuses strictly on patient details (name, age, token) and current presenting complaints/symptoms.
  - Avoids robotic, verbatim reading of the entire document.
  - Interactive playback controls with speed adjustment (**1x, 1.25x, 1.5x**).
- **Scanned Document Side-by-Side Cross-Checking Drawer**:
  - Slide-out drawer displaying original uploaded paper documents alongside digital extractions.
  - Inspection controls: **Zoom In/Out (up to 3x)**, **90° rotation**, and **thermal paper high-contrast filter**.
- **Digitalized & Editable Prescription Table**:
  - Structured fields: Medicine Name, Dosage, Frequency (`1-0-1`, `OD`, `BD`), Timing (`After Meals`, `Before Meals`), Duration.
  - Fully editable: Clinicians can modify, add, or delete medication rows.
- **Authentic Out-of-Range Clinical Details & Lab Findings**:
  - Zero mock data: All demo fallback cards purged.
  - Real report extraction: Genuinely reflects lab investigations scanned from patient documents.
  - Conditional rendering: If no out-of-range clinical details exist, the section is completely omitted.
- **Active Drug Allergy Conflict Detection**:
  - Real-time safety engine that cross-references prescribed medicines against documented patient allergies.
  - Displays prominent pulsing red alert badges if a contraindication (e.g., Penicillin, NSAIDs) is prescribed.
- **FHIR R4 Interactive Resource Inspector**:
  - Color-coded cards for ABDM FHIR resources: `Patient`, `Condition`, `MedicationStatement`, `Observation`, `AllergyIntolerance`.
  - Raw JSON viewer with 1-click clipboard copying.
- **Attestation & Digital Sign-Off**:
  - One-click physician attestation sealing Layer 3 immutable EHR records.
- **HIS / EMR 1-Click Push**:
  - REST/HL7 webhook pushing the attested clinical bundle directly into hospital information systems (e-Hospital, NIC Medanta).
- **Discharge & Queue Management**:
  - Ability to complete assessment and discharge patients from the active queue.

### 2.5 Module C: Multimodal Clinical Verification Engine
- **Deterministic Contradiction Detection**:
  - Cross-references what the patient *said* against what paper documents *prove*.
  - Detects contradictions (e.g., patient states "No history of diabetes", but uploaded lab report shows Fasting Glucose of 220 mg/dL).
  - Safety tier classifications: Tier-1 (Immediate Patient Safety / Red Alert), Tier-2 (Clinical Inconsistency), Tier-3 (Informational).
- **SBAR Synthesis**: Formats clinical drafts using the standard medical SBAR format (Situation, Background, Assessment, Recommendation).
- **Dual Coding Engine**: Maps clinical findings simultaneously to Western allopathic codes (ICD-10 / SNOMED-CT) and Indian traditional medicine codes (NAMASTE / AYUSH Morbidity Codes).

### 2.6 Module D: ABDM, FHIR R4 & HIS Bridges
- **Milestone 1 (M1)**: ABHA Number & Address generation and QR authentication.
- **Milestone 2 (M2)**: Health Information Provider (HIP) — generates ABDM-compliant FHIR R4 document bundles and handles consent artifacts.
- **Milestone 3 (M3)**: Health Information User (HIU) — queries ABDM gateways using Fidelius encryption (ECDH Curve25519 + AES-GCM).
- **Audit Logging**: Cryptographically signed event log tracking all data access, edits, and attestations.

---

## 3. Portals, Logins & Dashboards In-Depth

MediKiosk provides dedicated user interfaces tailored for each actor in the healthcare workflow:

```
                                  +-----------------------+
                                  |    HOSPITAL LOGIN     |
                                  |   /hospital-login     |
                                  +-----------+-----------+
                                              |
                   +--------------------------+--------------------------+
                   | Unlocks Workstation                                 | Unlocks Kiosk Terminal
                   v                                                     v
       +-----------------------+                             +-----------------------+
       |   CLINICIAN SUITE     |                             |     ON-SITE KIOSK     |
       |      /clinician       |                             |        /kiosk         |
       +-----------------------+                             +-----------------------+
                   ^                                                     ^
                   | Patient Arrives in Queue                            | Books Appointment
                   +--------------------------+--------------------------+
                                              |
                                  +-----------+-----------+
                                  |    PATIENT PORTAL     |
                                  |       /patient        |
                                  +-----------+-----------+
                                              |
                                  +-----------+-----------+
                                  |   OPD APPOINTMENTS    |
                                  |     /appointments     |
                                  +-----------------------+
```

### 3.1 Hospital Facility Login Portal (`/hospital-login`)
- **Route**: `app/hospital-login/page.tsx`
- **Purpose**: Authenticates the hospital terminal before granting access to patient kiosks or doctor workstations.
- **Facilities Supported**:
  1. **AIIMS New Delhi**: Apex Allopathic & Multi-Specialty Hospital (Database 1).
  2. **AIIA Medical Center**: Apex AYUSH & Multi-Specialty Hospital (Database 2).
- **Credentials & Security**:
  - AIIMS Facility Code: `AIIMS-DELHI` | Password: `admin`
  - AIIA Facility Code: `AIIA-AYUSH` | Password: `admin`
- **Actions on Login**: Sets secure browser storage tokens (`medikiosk_hospital_authenticated`, `medikiosk_facility_id`, `medikiosk_facility_name`) and unlocks all client features.

### 3.2 Landing Page & Master Navigation (`/`)
- **Route**: `app/page.tsx`
- **Purpose**: Welcoming entry point displaying hospital status, system readiness, and navigation cards.
- **Key Cards**:
  - **On-Site Patient Kiosk Terminal** (`/kiosk`): Marked with active lock/unlock status.
  - **Clinician Intelligence Suite** (`/clinician`): Doctor OPD dashboard (unlocked post-hospital login).
  - **Patient Health Portal & Records** (`/patient`): Patient self-service login and history.
  - **Language Bar**: Prominently highlights full support for all **22 8th Schedule Indian Languages**.

### 3.3 On-Site Patient Kiosk Terminal (`/kiosk`)
- **Route**: `app/kiosk/page.tsx`
- **User**: Walk-in patients arriving at the hospital OPD waiting area.
- **Step-by-Step Flow**:
  1. **Language Selection**: Touch cards for 22 languages with localized scripts (e.g. हिन्दी, বাংলা, मराठी, தமிழ், తెలుగు).
  2. **DPDP 2023 Consent**: Audio prompt and visual consent sheet with Accept and Refuse options.
  3. **Patient Identification**:
     - Mode A: Scan ABHA QR card via camera.
     - Mode B: Manual entry of ABHA ID or generating an instant OPD Queue Token.
  4. **Adaptive Voice Questionnaire**: 10 to 12 questions spoken aloud by TTS, with automatic voice transcription via STT and real-time audio wave visualization.
  5. **Document Scanner (Module B)**: Camera capture of paper prescription slips and lab reports.
  6. **Token Receipt & Completion**: Terminal prints or displays the final OPD token number and directs the patient to their designated consultation room.

### 3.4 Clinician OPD Dashboard & Review Station (`/clinician`)
- **Route**: `app/clinician/page.tsx`
- **User**: Attending physicians and medical residents.
- **Left Panel (OPD Queue)**:
  - List of waiting patients with token numbers, names, ages, triage status, and elapsed wait times.
  - Filter by department, search by ABHA ID or token.
- **Central Workspace (One-Page History Sheet)**:
  - Header with demographics, queue token, and assigned doctor.
  - **Spoken Audio Briefing Toolbar**: Button to play the concise 30–45 second English briefing with speed controls (`1x`, `1.25x`, `1.5x`).
  - **Allopathic / Ayurvedic Tab Toggle**: Seamlessly switches between Western SBAR structure and AYUSH Dashavidha Pariksha.
  - **Document Cross-Check Trigger**: Opens the side-by-side drawer showing the original camera scan of the patient's prescription.
  - **Digitalized Prescription Table**: Interactive rows allowing doctors to adjust dosages, frequencies, and durations.
  - **Out-of-Range Lab Highlights**: Real extracted abnormal findings with physician annotation notes.
  - **Drug Allergy Warnings**: High-visibility red alert cards if prescribed medications conflict with patient allergies.
  - **Attestation & HIS Push**: "Sign & Attest" seals the note; "Push to HIS" triggers an electronic health record webhook.
  - **Discharge Patient**: Discharges patient from active queue upon consultation completion.

### 3.5 Patient Health Portal & OPD Booking (`/patient`)
- **Route**: `app/patient/page.tsx`
- **User**: Registered patients checking their past records from home or mobile.
- **Authentication**: ABHA ID (`91-XXXX-XXXX-XXXX` or demo ID) and password.
- **Cross-Hospital Record Timeline**:
  - Automatically queries both AIIMS New Delhi and AIIA Medical Center.
  - Displays past diagnoses, previous prescriptions, uploaded lab reports, and attending doctor names.
- **Integrated "Book OPD Appointment" Section**:
  - Department selector across all 10 clinical specialties.
  - Date and slot selector (Morning / Afternoon).
  - Assigned doctor details and allocated room number.
  - Instant token generation with calendar integration.

### 3.6 OPD Appointments & Queue Management (`/appointments`)
- **Route**: `app/appointments/page.tsx`
- **User**: Hospital reception desk, triage nurses, and OPD administrative coordinators.
- **Features**: Centralized view of all scheduled appointments, token distribution, department load balancing, and patient status updates.

---

## 4. How Every Feature is Connected (System Topology & Data Flow)

### 4.1 Facility-Segregated Dual-Database Pipeline
MediKiosk maintains two isolated, high-performance PostgreSQL connection pools managed in [`lib/db.ts`](file:///c:/medikiosk-main/lib/db.ts):

```
                        [Client Request: Next.js API Routes]
                                         │
                         Is Facility AIIMS or AIIA?
                                         │
                    ┌────────────────────┴────────────────────┐
                    ▼                                         ▼
         [poolAiims (Neon DB 1)]                   [poolAyush (Neon DB 2)]
         Host: ep-spring-sunset                    Host: ep-little-tooth
         Region: US-West-2                         Region: AP-Southeast-1
         Tables: sessions, entities,               Tables: sessions, entities,
                 draft_summaries, history                  draft_summaries, history
```

### 4.2 Cross-Facility Longitudinal Record Exchange
When a patient logs into the **Patient Portal** (`/patient`) or a clinician reviews historical data:
1. The backend endpoint `/api/patient/records` receives the patient's ABHA ID.
2. It executes parallel asynchronous queries across **both** `poolAiims` and `poolAyush`.
3. The records are merged, deduplicated, and chronologically sorted.
4. The patient sees their complete healthcare journey regardless of whether previous visits were at an allopathic center or an AYUSH institute.

### 4.3 Multi-Modal Clinical Intake & Verification Pipeline

```
  [Physical Paper Report]                        [Patient's Spoken Voice]
            │                                               │
    (Camera Snapshot)                               (Web Speech API)
            ▼                                               ▼
   [Pixtral 12B Vision]                            [Bhashini STT Engine]
  (RAM Ephemeral Buffer)                         (22 Regional Languages)
            │                                               │
            ├───────────────────────┬───────────────────────┤
            ▼                                               ▼
  [Extracted Lab Entities]                       [Structured Clinical History]
  - LOINC Mapped Results                         - SOCRATES Symptoms
  - CDSCO Normalized Meds                        - Documented Allergies
            │                                               │
            └───────────────────────┬───────────────────────┘
                                    ▼
                     [Module C Verification Engine]
                     1. Contradiction Detection
                     2. Out-of-Range Lab Categorization
                     3. Drug-Allergy Conflict Detection
                                    │
                                    ▼
                     [Attending Clinician Suite]
                     - 30-45s Spoken Audio Briefing
                     - Side-by-Side Scanned Doc Drawer
                     - Editable Digital Prescription
                     - Attested FHIR R4 Bundle
```

---

## 5. End-to-End User Workflows (Step-by-Step Journeys)

### 5.1 Workflow 1: Hospital Facility Admin Setup & Portal Unlocking
1. **Initial State**: Kiosk terminals and Clinician dashboards load in a protected locked state.
2. **Admin Action**: Hospital administrator navigates to `/hospital-login`.
3. **Selection**: Selects facility (`AIIMS New Delhi` or `AIIA Medical Center`).
4. **Authentication**: Inputs facility code (`AIIMS-DELHI` / `AIIA-AYUSH`) and password (`admin`).
5. **System Response**:
   - Stores session authentication cookie and local storage tokens.
   - Binds the active database connection pool.
   - Unlocks the on-site kiosk (`/kiosk`) and clinician suite (`/clinician`).
   - Displays green "Facility Active: AIIMS New Delhi (Integrated Multi-Specialty)" in the global header.

### 5.2 Workflow 2: Walk-In Patient Kiosk Registration & Voice Intake
1. **Arrival**: Patient arrives in the OPD waiting area and touches the MediKiosk screen (`/kiosk`).
2. **Language Pick**: Patient selects their native tongue (e.g., Marathi or Bengali).
3. **DPDP Notice**: Kiosk displays and reads aloud the data privacy consent notice; patient taps "Accept & Proceed".
4. **Identification**: Patient taps "Scan ABHA QR" and holds their Ayushman Bharat card to the camera. The system extracts ABHA ID, name, age, and gender.
5. **Conversational Intake**:
   - The kiosk speaks Question 1 in the chosen language: *"What symptoms brought you to the hospital today?"*
   - Patient speaks: *"I have had high fever and severe shivering for 3 days."*
   - STT transcribes the audio; the system displays the text with live waveform animation.
   - Kiosk proceeds through 10–12 structured questions covering pain site, onset, severity, drug allergies, past medical conditions, and family history.
6. **Document Scanning**:
   - Kiosk prompts: *"Do you have any old prescriptions or blood test reports?"*
   - Patient holds their paper slip to the camera and taps "Capture".
   - Pixtral 12B extracts medicines and lab values in volatile memory.
7. **Completion & Hand-Off**:
   - Kiosk assigns queue token `A-12` and displays: *"Thank you. Please proceed to Room 101 for General Medicine."*
   - Patient record is saved into the database and immediately appears on the doctor's screen.

### 5.3 Workflow 3: Emergency Red-Flag Interception (Zero-LLM Fast Path)
1. **Intake in Progress**: Patient begins voice questionnaire.
2. **Trigger Event**: Patient states: *"I have sudden crushing chest pain radiating to my left arm and I cannot breathe."*
3. **Immediate Detection**: The deterministic regex scanner intercepts keywords (`crushing chest pain`, `radiating to left arm`) in under 10 milliseconds.
4. **Emergency Alarm Activation**:
   - The normal questionnaire instantly halts.
   - The screen flashes high-visibility red with an emergency siren icon.
   - An 800Hz emergency audio siren sounds via Web Audio API.
5. **Patient Routing**: Screen flashes bold directions: *"CRITICAL EMERGENCY DETECTED — PROCEED IMMEDIATELY TO RESUSCITATION BAY (ROOM 001) — ORDERLY DISPATCHED"*.
6. **Clinician Notification**: Doctor's dashboard immediately highlights patient token with a pulsing red `EMERGENCY_RED_FLAG` banner.

### 5.4 Workflow 4: Patient Portal Login, Record History & OPD Booking
1. **Access**: Patient opens `/patient` on their smartphone or home computer.
2. **Login**: Patient enters their ABHA ID and demo password.
3. **Cross-Facility History Review**:
   - Dashboard displays all historical visits across AIIMS and AIIA.
   - Patient reviews their past blood glucose reports, prescriptions, and physician notes.
4. **Book OPD Appointment**:
   - Patient navigates to the "Book OPD Appointment" section on their portal.
   - Selects Department: `Cardiology`.
   - Selects Date & Time: `Tomorrow, Morning Slot (09:00 - 12:00)`.
   - System assigns Doctor (`Dr. Vikram Sharma`), Room (`Room 204`), and issues Token `CARDIO-08`.
5. **Confirmation**: Token is added to their active appointments tab, ready for their hospital arrival.

### 5.5 Workflow 5: Attending Clinician Consultation, Prescription & HIS Push
1. **Session Selection**: Doctor views the live queue on `/clinician` and clicks on Patient `Ramesh Sharma (Token A-12)`.
2. **30–45s Audio Briefing**:
   - Doctor clicks `🎙️ Listen to Clinical Briefing [30-45s]`.
   - High-yield English briefing plays: *"Clinical intake briefing for Ramesh Sharma, a 45-year-old male, Token A-12. Current complaints: High fever with chills and severe headache for 3 days. Documented allergy: Penicillin. Intake is verified and ready for your clinical examination."*
3. **Clinical Review**:
   - Doctor reviews the one-page history sheet.
   - Clicks `📄 Cross-Check Scanned Report` to open the original paper report side-by-side with 2x zoom to inspect handwriting.
4. **Lab Out-of-Range Inspection**:
   - Doctor checks the highlighted lab values (only genuine out-of-range results from scanned reports appear).
   - Enters clinical note: *"Repeat CBC and peripheral smear recommended."*
5. **Prescription Editing & Allergy Safeguard**:
   - Doctor adjusts medication dosage in the digitalized prescription table.
   - Doctor attempts to add Amoxicillin; system instantly flashes a red warning: `Allergy Conflict: Patient allergic to Penicillin`. Doctor substitutes with Azithromycin.
6. **Attestation & HIS Sync**:
   - Doctor clicks `Sign & Attest` — Layer 3 immutable EHR record is generated.
   - Doctor clicks `Push to HIS` — FHIR R4 bundle is pushed to the hospital's e-Hospital server.
   - Doctor clicks `Discharge Patient` — Patient is marked completed and removed from the active OPD queue.

---

## 6. Security, Privacy Architecture & DPDP Act 2023 Compliance

MediKiosk was engineered from the ground up to adhere to India's **Digital Personal Data Protection (DPDP) Act 2023**:

### 6.1 Consent Architecture
- **Informed & Granular**: Explains exactly what data is collected and for what single purpose (clinical OPD consultation).
- **Multilingual Delivery**: Consent notice is delivered visually and via voice synthesis in the patient's selected Indian language.
- **Easy Revocation**: A "Decline" button allows patients to opt out at any time without penalty, routing them to traditional physical paperwork.

### 6.2 Ephemeral RAM Processing (Zero-Disk Storage)
- **Volatile Document Handling**: Uploaded photos of prescriptions and lab slips are buffered solely in Node.js / Python memory buffers.
- **No Disk Caching**: Images are never written to physical hard disks or persistent S3 buckets without explicit institutional consent.
- **RAM Flush**: Image buffers are garbage-collected immediately after entity extraction.

### 6.3 Three-Tier Immutable Record Structure
1. **Layer 1 (Immutable Evidence Layer)**: Raw transcripts and timestamped patient statements (INSERT only).
2. **Layer 2 (Mutable Draft Layer)**: AI-synthesized summaries, OCR extractions, marked `UNVERIFIED / DRAFT`.
3. **Layer 3 (Legally Binding Attested Layer)**: Created only upon physician sign-off, containing doctor digital signature and final prescription.

---

## 7. Technology Stack & Dependency Inventory

| Layer | Component | Version | Role in Architecture |
|---|---|---|---|
| **Framework** | Next.js (App Router) | `15.1.11` | Full-stack serverless routes, hybrid static generation, edge middleware. |
| **User Interface** | React | `19.0.0` | Concurrent rendering, reactive UI hooks, real-time status updates. |
| **Type Safety** | TypeScript | `5.7.0` | Strict typing for FHIR R4 interfaces, database models, and API contracts. |
| **Styling** | Tailwind CSS | `4.0.0` | High-contrast clinical theme (`#004643`, `#F9F6F0`, `#EAF3F2`, dark mode). |
| **Animation** | Framer Motion | `13.2.0` | Waveform pulses, slide-out cross-check drawers, alert badge animations. |
| **Database** | Neon Serverless PostgreSQL | `@neondatabase/serverless 0.10.4` | Dual-connection pool architecture with WebSocket transport and SSL channel binding. |
| **Multimodal Vision** | Pixtral 12B Vision | `pixtral-12b-2409` | High-accuracy handwritten prescription deciphering and lab table extraction. |
| **Conversational LLM** | Mistral Small | `mistral-small-latest` | Clinical multi-turn questionnaire, SBAR drafting, contradiction detection. |
| **Fast Token LLM** | Groq Cloud | `llama-3.3-70b-versatile` | Ultra-low latency fallback token generation for conversational intake. |
| **National Speech AI** | Bhashini Dhruva | MeitY / AI4Bharat | Official Indian national speech-to-text and text-to-speech across 22 languages. |
| **Audio Processing** | Web Audio API | Browser Native | Real-time audio decibel metering, emergency 800Hz siren synthesis. |
| **QR Code Engine** | jsQR | `1.4.0` | Camera-based ABHA QR card reading with contrast inversion. |
| **Drug Resolution** | RapidFuzz | `3.9.0+` | Phonetic and Levenshtein matching against 15,000+ CDSCO approved medications. |
| **Interoperability** | HL7 FHIR Release 4 | R4 JSON | National standard format for ABDM health information exchange. |

---

*MediKiosk Master Documentation — Maintained by the MediKiosk Engineering Team.*
