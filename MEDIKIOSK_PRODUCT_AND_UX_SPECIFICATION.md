# MediKiosk: Product, Clinical Philosophy & Complete UX/UI Specification
**Multilingual Voice AI Outpatient Department (OPD) Triage, Intake, and Clinical Review System**
*Aligned with the Digital Personal Data Protection Act (DPDP 2023), Ayushman Bharat Digital Mission (ABDM FHIR R4), and Ministry of AYUSH Clinical Frameworks.*

---

## 1. Executive Summary & Problem Statement

### 1.1 The Outpatient Crisis in Indian Healthcare
In public and private Indian healthcare institutions, Outpatient Departments (OPDs) face staggering patient volume. A single medical officer or specialist in an Indian district hospital, community health center (CHC), or high-volume private clinic routinely sees between **60 and 120 patients in a single 3-to-4-hour OPD shift**. This staggering volume compresses the average consultation time to **under 2 to 3 minutes per patient**.

Within this brief, high-pressure window, the physician must simultaneously:
1. **Break through acute linguistic barriers**: India has 22 officially recognized languages and hundreds of regional vernaculars. In cosmopolitan and semi-urban hospitals, doctors and patients frequently do not speak the same native tongue.
2. **Elicit a comprehensive clinical medical history**:
   - Primary Chief Complaint
   - History of Present Illness (HPI) structured via clinical frameworks like **SOCRATES** (Site, Onset, Character, Radiation, Associations, Timing, Exacerbating/Relieving factors, Severity)
   - Past medical illnesses (Diabetes, Hypertension, Tuberculosis, Asthma, Surgeries)
   - Active medications, traditional remedies, and herbal formulations
   - Drug allergies (e.g., penicillin, NSAIDs, sulfa drugs) and food allergies
   - Family hereditary medical history (Cardiovascular disease, diabetes, cancer)
3. **Decipher physical paper records**: Patients bring crumpled, faded, and illegible handwritten prescriptions, laboratory slips, diagnostic test results, and discharge summaries from multiple disparate clinics.
4. **Detect life-threatening red flags**: Identify acute coronary syndrome, stroke FAST symptoms, acute hemorrhage, respiratory distress, and sepsis in patients sitting quietly in the waiting queue.
5. **Transcribe findings into EHRs**: Enter diagnostic codes and consultation notes compliant with the **Ayushman Bharat Digital Mission (ABDM)**.

### 1.2 The Failure of Existing Solutions
- **Standard Hospital Information Systems (HIS)**: Built for billing and administrative registration, requiring trained data entry operators. They capture demographic metadata but zero clinical depth.
- **Generic Consumer Chatbots & LLMs**: Produce verbose, non-deterministic text, hallucinate medical advice, lack real-time vernacular audio streaming, cannot perform zero-disk vision OCR on Indian handwritten scripts, and violate medical liability and data privacy laws.
- **Paper Slips**: Cause critical clinical details to be lost, resulting in repeated medical errors, duplicate lab orders, and severe physician cognitive burnout.

### 1.3 The MediKiosk Solution
**MediKiosk** is a patient-facing physical/web terminal paired with an ambient physician review dashboard. Installed in the outpatient waiting area, MediKiosk intercepts patients *before* they enter the consultation room.

In **under 3 to 4 minutes of waiting time**, MediKiosk:
- Engages the patient in their native language (22 Indian vernaculars supported).
- Collects legal DPDP consent (via touch, voice, or guardian delegation).
- Captures demographics and assigns a continuous queue token (e.g. `Q-101`, `Q-102`).
- Conducts a multi-turn, adaptive clinical intake following the **SOCRATES** framework, chronic disease screening, medication intake, allergy checks, and family history.
- Immediately trips a zero-LLM deterministic emergency alarm if life-threatening symptoms (stroke, heart attack, anaphylaxis, acute hemorrhage) are detected—sounding sirens and routing the patient directly to the Emergency Room.
- Scans physical paper prescriptions and lab slips using Pixtral 12B Vision in volatile RAM (never saving images to disk).
- Identifies clinical contradictions between what the patient spoke and what their physical records state.
- Presents the attending physician with a **sub-60-second SBAR summary**, side-by-side contradiction resolution cards, low-confidence verification gates, one-click attestation, and instant ABDM FHIR R4 Bundle generation.

---

## 2. Why MediKiosk Does What It Does (Clinical & Legal Justification)

| Feature | Why It Exists (Clinical & Practical Rationale) |
| :--- | :--- |
| **Vernacular Voice STT + Server TTS** | Over 60% of outpatient attendees in Indian public hospitals have limited written literacy. Spoken audio in regional vernaculars enables independent patient self-intake without requiring hospital staff assistance. |
| **8–9 Question SOCRATES Intake** | Prevents premature 2–3 question drop-offs. Clinicians need structured symptom dimensions (Site, Onset, Character, Radiation, Associations, Timing, Exacerbating/Relieving, Severity) plus past illnesses, current drugs, allergies, and family history to make safe diagnostic decisions. |
| **Deterministic Red-Flag Safety Net** | LLMs are inherently non-deterministic and can miss critical symptoms or hallucinate. Emergency triage MUST be 100% deterministic, immediate, and hard-coded to trigger hospital sirens and immediate rerouting to Emergency Resuscitation Bay (Room ER-1) under Dr. Priya Nair. |
| **Zero-Disk RAM Vision Extraction** | Under the Digital Personal Data Protection Act (DPDP 2023), storing unencrypted patient document scans on hospital kiosk hard drives creates severe data breach liability. Processing images in volatile RAM buffers and discarding them immediately eliminates physical disk exposure. |
| **Contradiction Detection Engine** | Patients routinely forget or misstate their medical history (e.g., claiming "no allergies" while their previous discharge summary explicitly warns of "Severe Penicillin Anaphylaxis"). Detecting discrepancies automatically prevents lethal prescription errors. |
| **Attestation Verification Gates** | To preserve physician autonomy and legal accountability, AI drafts must NEVER automatically commit to an official Electronic Health Record. Physicians must explicitly verify low-confidence extractions (<70%) and resolve contradictions before signing off. |
| **Ministry of AYUSH Mode** | India has an integrated healthcare system where millions seek classical Ayurvedic treatment. Ayush doctors evaluate patients based on *Charaka Samhita* Dashavidha Pariksha (10 diagnostic dimensions), Tridosha balance (Vata, Pitta, Kapha), and Agni profiling—frameworks completely unserved by Western EHRs. |

---

## 3. Complete Patient Journey & Kiosk User Experience

```
[Attractor Screen: Multilingual Indian Vernacular Welcome]
                         │
                         ▼
[Screen 1: Language Selection (22 Indian Languages with Audio Greetings)]
                         │
                         ▼
[Screen 2: DPDP Digital Health Consent (Patient / Guardian / Paper Decline)]
                         │
                         ▼
[Screen 3: Patient Identity & Demographics (Voice Name, Age, Gender, Token Q-ID, ABHA QR)]
                         │
                         ▼
[Screen 4: Adaptive SOCRATES Clinical Interview (Voice STT + Touch Chips + Progress Gauge)]
         │                                                        │
         ├──────────────────[EMERGENCY RED FLAG DETECTED?]────────┤
         │                                                        │
         ▼ (Yes: Emergency Symptoms)                              ▼ (No: Normal Flow)
[Screen 5: Critical Emergency Siren Modal]              [Screen 6: Zero-Disk Document Scanner]
- High-Decibel Siren Audio                              - Pixtral 12B Vision in RAM
- Dr. Priya Nair (Room ER-1) Assigned                  - Prescription & Lab Slips OCR
- Localized Emergency Voice Instructions                - Document Quality Check
                         │                                        │
                         ▼                                        ▼
[Direct Patient Handoff to Emergency Bay]              [Screen 7: Confirmation & Queue Pass]
                                                       - Hospital Chime Sound
                                                       - Assigned Doctor Room & Wait Time
                                                       - Smooth Return to Attractor
```

### Screen-by-Screen Deep Dive

#### Step 0: Ambient Waiting Room Attractor
- **Visual Design**: Warm, calming Indian healthcare palette featuring rich pine teal (`#004D47`), earthy cornsilk (`#FBF8F1`), and metallic gold accents. Subtle geometric and floral Indian mandala silhouettes pulse softly in the background.
- **Audio Affordance**: Plays a welcoming bilingual audio chime periodically, inviting patients waiting in the hall to step up and register.
- **Touch Target**: An oversized, high-contrast button reading: **"यहाँ स्पर्श करें / Touch to Start"** with pulsing ripples.

#### Step 1: Language Selection (`select_language`)
- **Supported Languages**:
  1. **हिन्दी (Hindi)** — `hi-IN`
  2. **English** — `en-IN`
  3. **मराठी (Marathi)** — `mr-IN`
  4. **বাংলা (Bengali)** — `bn-IN`
  5. **తెలుగు (Telugu)** — `te-IN`
  6. **தமிழ் (Tamil)** — `ta-IN`
  7. **ગુજરાતી (Gujarati)** — `gu-IN`
  8. **ಕನ್ನಡ (Kannada)** — `kn-IN`
  9. **മലയാളം (Malayalam)** — `ml-IN`
  10. **ਪੰਜਾਬੀ (Punjabi)** — `pa-IN`
- **Interactive Behavior**:
  - Each language card displays the script in its authentic native typography (e.g., Bengali script, Gurmukhi script, Devanagari, Dravidian scripts) alongside its English transliteration.
  - Tapping a language instantly switches the entire portal's strings and triggers an instant auditory greeting in that language (e.g. *"मेडीकियोस्क में आपका स्वागत है। कृपया आगे बढ़ने के लिए अपनी भाषा चुनें।"*).
  - High-visibility "Human Help / सहायक कर्मचारी" button is present at all times in the header.

#### Step 2: Digital Health Data Consent (`consent` & DPDP 2023 Compliance)
- **Clinical & Legal Purpose**: Complies with Section 6 of the Digital Personal Data Protection Act (DPDP 2023).
- **Clear Plain-Language Notice**:
  - *"आपकी चिकित्सा जानकारी केवल आपके डॉक्टर के परामर्श और पूर्व-जांच सारांश तैयार करने के लिए सुरक्षित रूप से ली जा रही है। यह डेटा पूरी तरह गोपनीय है।"*
  - *"Your medical information is collected solely for clinical consultation and preliminary intake summary preparation. Your data is protected under India DPDP rules and never shared with third parties."*
- **Three Clear Interactive Actions**:
  1. **Agree & Continue (सहमति दें और आगे बढ़ें)**: Green high-contrast primary button.
  2. **Consent as Guardian / Caregiver (अभिभावक/केयरगिवर के रूप में सहमति)**: Specialized toggle for parents of pediatric patients or caregivers assisting geriatric/disabled relatives.
  3. **Decline / Visit Reception (अस्वीकार करें - रिसेप्शन पर जाएं)**: Amber secondary button.
- **Decline Handling (`consent_declined`)**:
  - If declined, MediKiosk **never forces the patient**.
  - It seamlessly transitions to an informative screen directing the patient: *"डिजिटल सहमति प्रदान नहीं की गई है। कृपया भौतिक पर्ची और पंजीकरण के लिए मुख्य अस्पताल रिसेप्शन काउंटर (Counters 1-4, Ground Floor) पर जाएं।"*
  - Localized voice announcement repeats this guidance so non-literate patients know exactly where to walk.

#### Step 3: Patient Identity & Demographics Intake (`identify`)
- **Patient Name Input**:
  - **Voice Input**: Tap **"बोलकर नाम बताएं / Speak Name"** to dictate full name via speech recognition.
  - **Touch/Virtual Keyboard**: Standard on-screen keyboard for manual entry or editing.
  - Name is used to personalize all subsequent doctor questions respectfully (e.g., *"अमित जी"*, *"रमेश बाबू"*, *"സുരേഷ്"*).
- **Age & Gender Selectors**:
  - Age input with rapid increment touch buttons.
  - Three distinct gender touch chips: **पुरुष / Male**, **महिला / Female**, **अन्य / Other**.
- **Continuous Queue Token ID**:
  - Automatically calculates the continuous sequential hospital queue token (e.g., `Q-101`, `Q-102`, `Q-105`) queried atomically from the database.
- **Optional ABHA Health ID & Camera QR Scanner**:
  - Patients with an Ayushman Bharat Health Account (ABHA) card can present their QR code to the kiosk webcam.
  - Instant decoding fills their ABHA address without typing.

#### Step 4: Adaptive SOCRATES Clinical Interview (`interview`)
- **Progress Gauge & Clinical Framework Indicator**:
  - Header displays dynamic progress badge: `Question X of 8–9`.
  - Framework indicator pill displays current clinical phase:
    - `🩺 SOCRATES Clinical Framework` (Turns 1–5: Onset, Character, Radiation, Associations, Timing, Severity)
    - `📋 Past Medical Illnesses` (Turn 6: Chronic disease screen)
    - `💊 Current Medications` (Turn 7: Active prescription & herbal remedies)
    - `⚠️ Known Allergies` (Turn 8: Drug, food, environmental hypersensitivities)
    - `🧬 Family Medical History` (Turn 9: Hereditary cardiovascular/diabetes/asthma)
    - `🌿 AYUSH Clinical Intake` (If Ayurvedic mode is active)
- **Question Presentation**:
  - Spoken aloud in high-fidelity native vernacular audio via server TTS.
  - Displayed in large, high-contrast typography (24px font) with English subtitle.
  - Dedicated **"पुनः सुनें / Repeat"** button allows listening multiple times.
- **Dual-Mode Response Affordances**:
  1. **Quick-Tap Options Grid**: 4 to 6 culturally and clinically tailored option chips (e.g., *"छाती में दर्द या भारीपन"*, *"नाभि के पास पेट में दर्द"*, *"दवा से एलर्जी"*).
  2. **Voice Dictation Card**: A large glowing microphone button (`64px`). When tapped, the microphone pulses with an animated emerald ring. Patient speaks freely. The live transcript appears in real time, with explicit **"उत्तर सबमिट करें / Submit Answer"** and **"पुनः बोलें / Clear"** buttons to ensure patient verification before submission.
- **Non-Severe Completion Guard**:
  - Normal conditions methodically advance through 8 to 9 clinical turns to ensure zero missing medical data.

#### Step 5: Critical Red-Flag Emergency Siren Modal (`red_flag`)
- **Trigger**: Activates immediately (within milliseconds) if severe keywords or clinical distress are reported (e.g., crushing chest pain radiating to arm, stroke FAST signs, vomiting blood, syncope, pain 10/10, poisoning).
- **Visual Alert**:
  - Screen flashes to high-visibility emergency crimson (`#DC2626`) with a thick border and pulsing warning badge.
  - Prominent banner: **"Critical Triage — Immediate Emergency Room Routing / आपातकालीन सूचना"**.
- **Audio Siren**:
  - Synthesizes and plays a dual-frequency hospital emergency siren (`800Hz / 600Hz`) through the kiosk speakers.
- **Voice Announcement**:
  - Speaks immediate life-saving directions in the patient's language: *"आपकी तकलीफ गंभीर प्रतीत हो रही है। कृपया तुरंत भूतल पर आपातकालीन कक्ष रूम ER-1 में जाएं। आपको आपातकालीन विशेषज्ञ डॉ. प्रिया नायर को सौंप दिया गया है।"*
- **Clear Destination Card**:
  - Destination: **Emergency Resuscitation Bay (Room ER-1) — Ground Floor**
  - Attending Physician: **Dr. Priya Nair, MEM (Emergency Medicine Lead)**
  - Priority: **STAT / IMMEDIATE**
- **Action Buttons**:
  - **"Replay Voice Alert & Siren"**
  - **"I am proceeding to Room ER-1 / मैं जा रहा हूँ"**

#### Step 6: Zero-Disk Document Scanner (`scan`)
- **Purpose**: Intake of prior medical records, lab reports, and prescriptions.
- **Camera & File Uploader**:
  - Direct webcam capture button: snaps a photo of the physical prescription held up to the camera.
  - File upload button: accepts JPEG, PNG, or PDF files.
- **Document Quality Check**:
  - Automatically assesses lighting, blur, and contrast. If unreadable, alerts patient to flatten the paper and re-scan.
- **Zero-Disk Privacy Guarantee**:
  - Display badge: *"Zero-Disk Privacy: Processed securely in volatile memory (RAM) and discarded immediately."*
- **Entity Extraction Feedback**:
  - Displays tags of recognized entities (medications, previous diagnoses, lab values) as they are extracted in real time.

#### Step 7: Confirmation & Queue Pass (`confirm`)
- **Completion Chime**: Plays a harmonious two-tone hospital completion chime (`523Hz / 659Hz`).
- **Confirmation Card**:
  - Large green checkmark.
  - Confirmation text: *"धन्यवाद! आपकी जानकारी दर्ज कर ली गई है। / Thank You! Your Intake is Recorded."*
  - Assigned Doctor, Room Number, Floor, and Estimated Wait Time.
  - Guidance: *"आपकी स्वास्थ्य जानकारी सुरक्षित रूप से डॉक्टर के कंप्यूटर पर भेज दी गई है। कृपया ओपीडी कक्ष के बाहर अपने नाम की प्रतीक्षा करें।"*
- **Auto-Reset Timer**: Automatically clears session state and returns to the Attractor screen after 20 seconds of inactivity to protect patient privacy.

---

## 4. Complete Clinician Review Dashboard Experience

```
+-----------------------------------------------------------------------------------------------+
| MEDIKIOSK AMBIENT CLINICIAN DASHBOARD                      Doctor: Dr. Vikram Sharma (Room 101) |
+-----------------------------------------------------------------------------------------------+
|  PATIENT QUEUE (Left Panel - 30%)  |           SBAR CLINICAL SUMMARY (Right Panel - 70%)       |
|  Filter: [All] [General] [Ortho]...|  Patient: Rakesh Sharma (38/M) • Token: Q-102 • Room 101 |
|                                    |  Triage: YELLOW (Contradiction Flagged)                  |
|  [Q-101 | ER-1 | CRITICAL RED]    |  -------------------------------------------------------  |
|  Chest pain 10/10 • Diaphoresis    |  S (SITUATION): Severe epigastric pain radiating to back |
|                                    |  B (BACKGROUND): 5-yr Type 2 Diabetes, on Metformin 500mg |
|  [Q-102 | Room 101 | YELLOW]       |  A (ASSESSMENT): Suspected acute peptic ulcer vs gastritis |
|  Stomach pain 4/10 • Contradiction |  R (RECOMMENDATION): Upper GI endoscopy, HbA1c, LFTs     |
|                                    |  -------------------------------------------------------  |
|  [Q-103 | Room 102 | GREEN]        |  CONTRADICTION RESOLUTION CARDS:                         |
|  Knee pain • Routine Ortho         |  [Spoken: No Allergies] vs [Document: Penicillin Allergy] |
|                                    |  Action: [Confirm Patient Spoke] [Confirm Document]       |
|                                    |  -------------------------------------------------------  |
|                                    |  VERIFICATION GATE:                                      |
|                                    |  [?] Metformin 500mg (Confidence: 62%) -> [Verify]       |
|                                    |  -------------------------------------------------------  |
|                                    |  [1-CLICK ATTESTATION SIGN-OFF] [DOWNLOAD ABDM FHIR R4]   |
+-----------------------------------------------------------------------------------------------+
```

### 4.1 Doctor Room Theming & Privacy Isolation
The Clinician Dashboard features **Doctor Privacy Scoping**. Physicians select their specialty or enter their consultation room credentials:
- **General Medicine OPD (Room 101)** — *Dr. Vikram Sharma, MBBS, MD* (Pine Teal theme)
- **Orthopedics OPD (Room 102)** — *Dr. Rajesh Verma, MBBS, MS* (Indigo theme)
- **Pediatrics OPD (Room 105)** — *Dr. Ananya Sen, MBBS, MD, DCH* (Purple theme)
- **AYUSH Wellness Wing (Room 108)** — *Dr. Harish Vaidya, BAMS, MD* (Emerald theme)
- **Emergency Resuscitation Bay (Room ER-1)** — *Dr. Priya Nair, MBBS, MEM* (Rose / Crimson theme)
- **Central Hospital Administration (All Rooms)** — Super-user triage overview

Each doctor's terminal displays **only the patients allocated to their department**, eliminating cross-specialty clutter and protecting patient privacy.

### 4.2 Real-Time Priority Patient Queue
- **Auto-Sync Polling**: Refreshes queue state every 3.5 seconds via lightweight background queries.
- **Priority Sorting**:
  1. `CRITICAL` (Emergency red flags / `emergency_triaged`) — always pinned to the very top.
  2. `HIGH / YELLOW` (Active contradictions or low-confidence extractions).
  3. `GREEN / ROUTINE` (Standard completed intakes ordered by arrival time).
- **Audio & Visual Siren**:
  - When an emergency patient triggers a red flag at any kiosk, Dr. Priya Nair's terminal (and the central triage desk) immediately displays a pulsing emergency banner and sounds an auditory siren, enabling instant resuscitation preparation before the patient even reaches the door.

### 4.3 Sub-60-Second SBAR Clinical Review View
Doctors review patient history organized strictly according to the **SBAR** framework:
- **S — Situation**: Patient demographics, primary chief complaint, and duration.
- **B — Background**: Comprehensive SOCRATES findings (Onset, Character, Radiation, Associations, Timing, Severity), past medical conditions, current medications, and family history.
- **A — Assessment**: AI-synthesized preliminary clinical impressions and differential possibilities clearly flagged as `DRAFT / UNVERIFIED`.
- **R — Recommendation**: Suggested clinical lab investigations, examinations, and precautionary red-flag monitoring.

### 4.4 Contradiction Resolution Engine
When MediKiosk detects a discrepancy between the patient's spoken statements and their physical scanned documents:
- A highlighted **Contradiction Card** appears in amber.
- Displays side-by-side evidence:
  - **Patient Spoke (Evidence Layer)**: *"No known allergies"*
  - **Document Stated (Physical Evidence)**: *"Allergic to Amoxicillin/Penicillin - developed urticaria & dyspnea 2023"*
- **Physician Resolution Buttons**:
  - `[Accept Patient Statement]` (Patient clarifies they were mistaken or re-tested).
  - `[Accept Document Fact]` (Physician confirms the allergy is valid).
  - `[Custom Clinical Note]` (Physician types specific instruction).
- **Mandatory Gate**: The system **blocks final attestation** until all contradictions are explicitly resolved, preventing legal liability.

### 4.5 Low-Confidence (<70%) Verification Gate
- OCR extractions from handwritten doctor prescriptions that score below 70% confidence are isolated with a warning icon (`needs_verification: true`).
- The clinician reviews the extracted medication name and dosage, making any corrections directly inline before confirming.

### 4.6 1-Click Legal Attestation & ABDM Export
- **Attestation Sign-Off**:
  - Tapping **"Attest & Sign Consultation Note"** transitions the session from Layer 2 (Draft) to Layer 3 (Clinician-Attested).
  - The record is locked, timestamped, and cryptographically hashed.
- **ABDM FHIR R4 Bundle Generator**:
  - Generates a fully validated **HL7 FHIR R4 JSON Document Bundle** (containing `Composition`, `Patient`, `Encounter`, `Condition`, `AllergyIntolerance`, `Observation`, and `MedicationStatement` resources).
  - Ready for immediate transmission to the Ayushman Bharat Digital Mission (ABDM) Health Information Exchange (HIE).
- **NRCeS Plaintext Note**:
  - Generates a clean, standardized plain-text clinical consultation note formatted according to the National Resource Centre for EHR Standards (NRCeS) guidelines.
  - Features 1-click **"Copy to Clipboard"** for pasting into legacy hospital EHR software.
- **Patient Discharge**:
  - Tapping **"Discharge Patient"** cleans up the active queue and marks the consultation as completed.

---

## 5. Specialized Ministry of AYUSH Mode (Ayurvedic Intake)

```
                       [ADMIN MODAL: AYUSH Toggle]
                                   │
                     Password Verification: "Ayurveda"
                                   │
                                   ▼
             +───────────────────────────────────────────+
             |    MINISTRY OF AYUSH SPECIALIZED MODE     |
             |  - Charaka Samhita Dashavidha Pariksha   |
             |  - Tridosha Profiling (Vata-Pitta-Kapha)  |
             |  - Agni & Koshta Digestive Assessment     |
             |  - Classical Ahara/Vihara Recommendations |
             +───────────────────────────────────────────+
```

### 5.1 Clinical Rationale & Historical Framework
India's Ministry of AYUSH oversees traditional medicine systems, primarily **Ayurveda**. In classical Ayurvedic medicine, disease pathogenesis (*Samprapti*) is diagnosed not merely by acute symptoms, but by the patient's constitutional baseline (*Prakriti*), metabolic fire (*Agni*), and the ten-fold clinical examination (*Dashavidha Pariksha*), documented in the *Charaka Samhita* (Vimana Sthana 8/94):

> *"दूष्यं देशं बलं कालं अनलं प्रकृतिं वयः। सत्त्वं सात्म्यं तथाऽऽहारं अवस्थाश्च पृथग्विधाः॥"*

Western EHRs force Ayurvedic doctors to record diagnoses using Allopathic disease names, corrupting traditional clinical records. MediKiosk solves this by offering a native, password-protected **Ministry of AYUSH Mode**.

### 5.2 Password-Protected Clinical Activation
- Activated via a lock icon in the navigation bar.
- Requires clinical authorization password: `Ayurveda`.
- Switches the intake engine into classical Ayurvedic assessment while retaining emergency red-flag safety nets.

### 5.3 Dashavidha Pariksha (दशविध परीक्षा) Diagnostic Dimensions
MediKiosk systematically captures all 10 classical Ayurvedic dimensions:
1. **Dushya (दूष्य)**: Affected tissues (*Dhatus*: Rasa, Rakta, Mamsa, Meda, Asthi, Majja, Shukra) and waste products (*Malas*).
2. **Desha (देश)**: Habitat and geographic climate (*Anupa* - humid/marshy, *Jangala* - arid/dry, *Sadharana* - temperate).
3. **Bala (बल)**: Vital immunity and physical strength (*Pravara* - superior, *Madhyama* - moderate, *Avara* - low).
4. **Kala (काल)**: Seasonal cycle (*Ritu*) and diurnal variation influencing Dosha aggravation.
5. **Anala / Agni (अग्नि)**: Status of metabolic/digestive fire:
   - *Samagni* (Balanced, optimal digestion)
   - *Vishamagni* (Irregular, Vata-aggravated, gas/bloating)
   - *Tikshnagni* (Hyperactive, Pitta-aggravated, intense burning/acidity)
   - *Mandagni* (Hypoactive, Kapha-aggravated, heaviness/sluggishness)
6. **Prakriti (प्रकृति)**: Congenital psychophysiological constitution (Vata, Pitta, Kapha, Dwandvaja dual-dosha, or Sama/Tridoshic).
7. **Vayas (वयः)**: Life stage (*Balya* <16 years, *Madhyama* 16–60 years, *Vriddha* >60 years).
8. **Sattva (सत्त्व)**: Psychological temperament and emotional resilience (*Pravara*, *Madhyama*, *Avara*).
9. **Satmya (सात्म्य)**: Dietary habituation and food compatibility.
10. **Ahara Shakti (आहार शक्ति)**: Digestive capacity (*Abhyavaharana* - ingestion, and *Jarana* - assimilation power).

### 5.4 Automated Tridosha Profiling & Ayurvedic Clinician Summary
- Calculates individual **Vata, Pitta, and Kapha scores**.
- Identifies the patient's **Dominant Prakriti** and **Koshta** (bowel habit: *Mrudu*, *Madhyama*, *Krura*).
- Formulates classical Ahara (dietary) and Vihara (lifestyle) recommendations.
- Renders a dedicated **Dashavidha Pariksha Clinical Panel** on Dr. Harish Vaidya's AYUSH terminal (Room 108).

---

## 6. Comprehensive UI/UX Design System & Aesthetics

### 6.1 Color Palette & Tokens
The visual design reflects an earthy, soothing Indian aesthetic inspired by herbal remedies, brass instruments, and traditional stone courtyards:

| Token Name | Hex Code | Purpose & Usage |
| :--- | :--- | :--- |
| **Pine Teal** | `#004D47` / `#2F5D62` | Primary brand color, headers, primary buttons, professional clinical anchor. |
| **Cornsilk** | `#FBF8F1` | Background canvas, soft, non-sterile, soothing to anxious patients. |
| **Metallic Gold** | `#D4AF37` / `#B8860B` | Badges, patient token accents, highlights, premium healthcare feel. |
| **Peach Glow** | `#F5EBE6` | Card backgrounds, subtler container elements, secondary chips. |
| **Emerald Green** | `#2E7D4F` | Completed states, active voice listening ring, success checkmarks. |
| **Emergency Crimson** | `#DC2626` / `#C4292A` | Red flag tripwire screen, high-priority emergency queue badges, siren pulse. |
| **Amber Orange** | `#F59E0B` | Contradiction cards, caution notices, quality check warnings. |
| **Ink Black** | `#1A1A1A` | High-contrast body typography for maximum clinical legibility. |

### 6.2 Typography Hierarchy
- **Display & Headings**: `Sora` (Google Font) — friendly, contemporary, geometric sans-serif that feels modern and approachable to patients.
- **Clinical Telemetry & Body**: `Inter` (Google Font) — crisp, legible sans-serif optimized for tabular numbers, clinical terms, and multi-language scripts.
- **Vernacular Scripts**: Native system font fallbacks ensuring authentic typography rendering across Devanagari, Bengali, Gurmukhi, Tamil, Telugu, Kannada, and Malayalam.

### 6.3 Accessibility & Kiosk Ergonomics
- **Touch Targets**: Minimum `48px` on mobile, minimum `64px` on physical kiosk terminals to accommodate elderly patients with tremors or vision impairment.
- **High-Contrast Ratio**: WCAG 2.1 AAA compliant text-to-background contrast across all clinical data cards.
- **Bilingual Auditory Redundancy**: Every interactive prompt is both displayed on screen and spoken aloud through the sound system.
- **Dual Confirmation**: Critical actions (Voice answer submission, attestation sign-off, contradiction resolution) require explicit button taps to prevent accidental touches.
