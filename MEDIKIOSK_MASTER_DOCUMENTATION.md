# MediKiosk: Comprehensive Master Project Documentation & Architecture Blueprint
**Multilingual Voice AI Outpatient Department (OPD) Triage, Intake, and Clinical Review System**
*Aligned with the Digital Personal Data Protection Act (DPDP 2023), Ayushman Bharat Digital Mission (ABDM FHIR R4), and Ministry of AYUSH Clinical Frameworks.*

---

## 1. Executive Summary & Problem Statement

### 1.1 The Outpatient Crisis in Indian Healthcare
In public and private Indian healthcare facilities, Outpatient Departments (OPDs) face staggering patient loads. A single physician in an Indian government or high-volume private hospital often sees between **60 and 120 patients per OPD shift**. This compresses average consultation time to **under 2 to 3 minutes per patient**.

Within this brief window, clinicians must:
1. Break through linguistic barriers across regional vernaculars.
2. Elicit a comprehensive medical history (Chief Complaint, History of Present Illness via SOCRATES, past medical conditions, allergies, and family history).
3. Decipher illegible, handwritten previous prescriptions, laboratory slips, and diagnostic reports.
4. Detect high-risk red flags (e.g., acute coronary syndrome, stroke, severe respiratory distress).
5. Transcribe findings into electronic health records (EHR) compliant with the Ayushman Bharat Digital Mission (ABDM).

As a direct consequence, critical medical history is routinely missed, clinical documentation is fragmented or omitted, and doctors face severe cognitive burnout.

### 1.2 The MediKiosk Solution
**MediKiosk** is a patient-facing hardware/web terminal paired with an ambient clinician dashboard. Placed in the outpatient waiting area, MediKiosk intercepts patients *before* they enter the consultation room.

Key capabilities:
- **Vernacular Voice & Touch Intake**: Patients converse naturally using their native language (10 Indian languages supported) or interact via high-contrast touch screens.
- **Dynamic Clinical Questioning**: Using Mistral AI (`mistral-small-latest`), the system conducts an empathetic, context-aware interview following clinical frameworks (SOCRATES, chronic disease screening, family history, and classical Ayurvedic Dashavidha Pariksha).
- **Deterministic Red-Flag Safety Net**: Hard-coded, zero-LLM safety algorithms immediately flag emergency symptoms (stroke, heart attack, anaphylaxis) and redirect the patient with high-decibel audio alerts and staff notifications.
- **Zero-Disk Multimodal Document Extraction**: High-speed OCR and clinical entity extraction using Pixtral 12B Vision (`pixtral-12b-2409`) processes prescriptions, lab reports, and discharge summaries in volatile RAM—never persisting patient document images to disk.
- **Contradiction Detection Engine**: Automatically detects discrepancies between what the patient spoke and what their physical documents state (e.g., patient claims "no allergies" while their discharge summary records severe penicillin anaphylaxis).
- **Sub-60-Second Clinician Review Dashboard**: Provides doctors with an SBAR (Situation, Background, Assessment, Recommendation) summary, side-by-side contradiction resolution cards, low-confidence verification gates, and one-click attestation.
- **ABDM FHIR R4 Bundle & NRCeS Text Note Generator**: Automatically generates validated HL7 FHIR R4 JSON document bundles and standardized text consultation notes for seamless ABDM EHR integration.
- **Specialized Ministry of AYUSH Mode**: Password-protected toggle to switch the intake engine into classical Ayurvedic assessment based on *Charaka Samhita* Dashavidha Pariksha (दशविध परीक्षा) and Tridosha profiling.

---

## 2. Core Architecture & Philosophy

```
+-----------------------------------------------------------------------------------------+
|                                    PATIENT KIOSK PORTAL                                  |
|  - 10 Indian Languages (Voice STT + Server-Streamed Regional TTS)                         |
|  - DPDP Consent Recording (Touch/Voice/Guardian) & ABHA Token Identification             |
|  - Adaptive SOCRATES / Dashavidha Conversational Intake (Mistral AI)                     |
|  - Zero-Disk Document Scanner (Pixtral 12B Vision via RAM Buffers)                       |
+--------------------------------------------+--------------------------------------------+
                                             |
                                   REST / JSON Payloads
                                             v
+-----------------------------------------------------------------------------------------+
|                                  NEXT.JS API BACKEND                                    |
|  +---------------------------+  +---------------------------+  +---------------------+  |
|  | Deterministic Red-Flag    |  | Mistral Conversational &  |  | Rule-Based          |  |
|  | Engine (Zero LLM, 100%   |  | Summary Synthesis Agents  |  | Contradiction       |  |
|  | Hardcoded Safety Rules)   |  | (mistral-small-latest)    |  | Detection Engine    |  |
|  +---------------------------+  +---------------------------+  +---------------------+  |
|  +---------------------------+  +---------------------------+  +---------------------+  |
|  | Server-Streamed Regional  |  | Zero-Disk OCR & Clinical  |  | ABDM FHIR R4 &      |  |
|  | Audio TTS Streamer        |  | Extraction (Pixtral 12B)  |  | NRCeS Generator     |  |
|  +---------------------------+  +---------------------------+  +---------------------+  |
+--------------------------------------------+--------------------------------------------+
                                             |
                                  SQL Transactions (Neon)
                                             v
+-----------------------------------------------------------------------------------------+
|                         NEON SERVERLESS POSTGRESQL DATABASE                             |
|  [Layer 1: Patient Evidence] -> [Layer 2: Intake Draft] -> [Layer 3: Clinician-Attested] |
|  (sessions, consent, raw_answers, structured_history, extracted_entities, fhir_bundles)  |
+--------------------------------------------+--------------------------------------------+
                                             ^
                                             | Polling (4s) & Real-Time Sync
                                             |
+--------------------------------------------+--------------------------------------------+
|                             CLINICIAN REVIEW DASHBOARD                                  |
|  - Real-Time Priority Queue (Triage Badges: RED, YELLOW, GREEN)                          |
|  - Sub-60-Second SBAR Intake & Classical Dashavidha Pariksha Layout                      |
|  - Side-by-Side Contradiction Resolution Cards & Source Drilldown                        |
|  - Low-Confidence (<70%) Extraction Verification Gate                                    |
|  - 1-Click Attestation Sign-Off & Instant ABDM FHIR / Plaintext Consultation Export     |
+--------------------------------------------+--------------------------------------------+
```

### 2.1 The Three-Tier Data Separation Model
To comply with medical liability laws and data privacy standards (DPDP 2023), MediKiosk enforces strict architectural separation between three tiers of data:

1. **Patient Evidence Layer (Immutable)**:
   - Stores raw patient transcripts, verbatim audio options, raw touch selections, and upload metadata.
   - *Tables*: `sessions`, `consent_records`, `raw_answers`, `document_uploads`.
   - *Rule*: Never modified or overwritten once recorded. Serves as legal evidence of what the patient provided.

2. **Intake Draft Layer (AI-Generated & Mutable)**:
   - Stores AI-extracted entities, structured questionnaire slots, normalized symptom profiles, and draft clinical summaries.
   - *Tables*: `structured_history`, `extracted_entities`, `draft_summaries`, `contradictions`.
   - *Rule*: Explicitly flagged as `UNVERIFIED / DRAFT`. Must never be used for automated medical decision-making without physician review.

3. **Clinician-Attested Layer (Legally Binding)**:
   - Stores clinician edits, resolution reasons, verified fields, signed attestation records, and generated FHIR R4 bundles.
   - *Tables*: `review_actions`, `attested_records`, `fhir_bundles`, `audit_log`.
   - *Rule*: Only data in this tier is exported to hospital EHRs and ABDM repositories.

### 2.2 Deterministic Safety vs. LLM Non-Determinism
LLMs hallucinate and can fail unpredictably. MediKiosk enforces a **zero-trust safety boundary**:
- **Critical Red Flags**: Evaluated by a **100% deterministic, regex and string-matching rule engine** in TypeScript (`lib/redflag.ts`). No LLM is involved in detecting life-threatening emergencies.
- **Contradiction Detection**: Cross-referenced using deterministic rule logic between normalized structured history keys and extracted entity lists.
- **Non-Diagnostic Guarantee**: Prompts are constrained with explicit negative constraints: *"You must NEVER diagnose the patient or prescribe medication. Keep tone respectful, comforting, and clear."*

---

## 3. Complete Technology Stack

| Component | Technology | Version | Purpose / Detail |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js (App Router) | 15.5+ | Server components, route handlers, dynamic edge API endpoints. |
| **UI Library** | React | 19.0.0 | Concurrent rendering, declarative UI, hooks, and responsive DOM. |
| **Styling** | Tailwind CSS | v4.0.0 | Custom healthcare color palette, responsive kiosk layout, dark/light contrast. |
| **Icons** | Custom React SVG Icons | In-house | Accessible, high-performance Lucide-style icons in `components/Icons.tsx`. |
| **Database** | Neon Serverless PostgreSQL | `@neondatabase/serverless` | Connection-pooled serverless PostgreSQL database with query audit logging. |
| **AI LLM Engine** | Mistral AI SDK | `@mistralai/mistralai` 1.5.0 | `mistral-small-latest` for adaptive conversational interview & draft summaries. |
| **Vision OCR Engine**| Mistral Pixtral Vision | `pixtral-12b-2409` | Multimodal vision model for deciphering cursive handwriting & lab values in RAM. |
| **Speech-to-Text** | Web Speech API | Native Browser | Continuous `webkitSpeechRecognition` with locale switching (`hi-IN`, `mr-IN`, etc.). |
| **Text-to-Speech** | Server TTS Streamer | `/api/tts` (Google TTS) | Regional audio streaming with bilingual slash parsing and browser fallback. |
| **Health Standard** | HL7 FHIR Release 4 | Custom Validator | Synthetic FHIR R4 JSON document bundle generator (`NRCeS` sandbox aligned). |
| **Data Privacy** | DPDP Act 2023 Compliance| In-house | Granular digital consent logging, guardian consent capture, and revocation routes. |

---

## 4. Multilingual Engine (10 Indian Languages)

MediKiosk provides end-to-end voice and touch support across 10 official Indian languages:

| Code | Language | Native Script | BCP-47 Code | Honorific | TTS Support |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `hi` | Hindi | हिन्दी | `hi-IN` | जी (Ji) | Full Server Audio |
| `en` | English | English | `en-IN` | - | Full Server Audio |
| `mr` | Marathi | मराठी | `mr-IN` | जी (Ji) | Full Server Audio |
| `bn` | Bengali | বাংলা | `bn-IN` | বাবু (Babu) | Full Server Audio |
| `te` | Telugu | తెలుగు | `te-IN` | గారు (Garu) | Full Server Audio |
| `ta` | Tamil | தமிழ் | `ta-IN` | அவர்களே (Avargale) | Full Server Audio |
| `gu` | Gujarati | ગુજરાતી | `gu-IN` | ભાઈ/બહેન | Full Server Audio |
| `kn` | Kannada | ಕನ್ನಡ | `kn-IN` | ಅವರು (Avaru) | Full Server Audio |
| `ml` | Malayalam | മലയാളം | `ml-IN` | അവർകൾ | Full Server Audio |
| `pa` | Punjabi | ਪੰਜਾਬੀ | `pa-IN` | ਜੀ (Ji) | Full Server Audio |

### 4.1 Speech Processing Architecture
1. **Continuous Voice Input**: The browser's speech recognition engine is initialized with the active language's BCP-47 code.
2. **Audio Collision Prevention**: An internal state machine prevents feedback loops:
   - When the AI speaks via TTS (`isAISpeakingRef.current = true`), the microphone listening loop is automatically muted.
   - When audio playback finishes (`audio.onended`), the microphone is safely unmuted.
3. **Bilingual Audio Normalization**: When options are displayed in bilingual format (e.g. `मधुमेह / Diabetes`), the `/api/tts` service automatically isolates the native language prefix for regional playback.

---

## 5. Clinical Frameworks & Intake Domains

### 5.1 Standard Allopathy Intake
The conversational intake agent (`lib/mistral.ts`) methodically covers:
1. **Chief Complaint (CC)**: Initial symptom, duration, onset, and chief trigger.
2. **History of Present Illness (HPI)**: Structured according to the **SOCRATES** pain assessment framework:
   - **S**ite (location)
   - **O**nset (gradual vs sudden)
   - **C**haracter (stabbing, dull, burning, aching)
   - **R**adiation (radiates to arm, jaw, back)
   - **A**ssociated symptoms (nausea, fever, sweating)
   - **T**iming (continuous, intermittent, diurnal)
   - **E**xacerbating / Relieving factors
   - **S**everity (scale of 1-10)
3. **Patient's History of Diseases (पूर्व व्याधि वृत्त)**: Proactive screening for chronic conditions:
   - Diabetes Mellitus (मधुमेह)
   - Hypertension (उच्च रक्तचाप)
   - Thyroid Disorders (थायराइड)
   - Asthma & COPD (दमा)
   - Ischemic Heart Disease
   - Previous surgical operations
4. **Family History (कुलज वृत्त)**: Hereditary risk factors in parents and siblings.
5. **Allergies & Contraindications (असात्म्यता)**: Drug allergies (penicillin, NSAIDs, sulfa drugs), food allergies, and seasonal triggers.
6. **Current Medications**: Ongoing prescription drugs, over-the-counter formulations, or herbal remedies.
7. **Review of Systems (ROS)**: Systemic review of gastrointestinal, respiratory, cardiovascular, and musculoskeletal symptoms.

### 5.2 Ministry of AYUSH Framework (Ayurvedic Intake)
When unlocked using the password `Ayurveda`, the intake engine incorporates classical Ayurvedic clinical diagnostic methodology based on **Charaka Samhita** (*Vimana Sthana 8/94*):

$$\text{दूष्यं देशं बलं कालं अनलं प्रकृतिं वयः। सत्त्वं सात्म्यं तथाऽऽहारं अवस्थाश्च पृथग्विधाः॥}$$

The 10 dimensions of **Dashavidha Pariksha (दशविध परीक्षा)**:
1. **Dushya (दूष्य)**: Afflicted bodily tissues (*Dhatus*: Rasa, Rakta, Mamsa, Meda, Asthi, Majja, Shukra) and bodily wastes (*Malas*).
2. **Desha (देश)**: Geographic terrain and climatic habitat (*Anupa* - humid/marshy, *Jangala* - arid/dry, *Sadharana* - moderate).
3. **Bala (बल)**: Immunity and constitutional stamina (*Pravara* - high, *Madhyama* - moderate, *Avara* - low).
4. **Kala (काल)**: Chronobiological influences (*Ritu* / season, diurnal variation, stage of pathology).
5. **Anala / Agni (अनल / अग्नि)**: Digestive metabolic fire:
   - *Samagni* (Balanced digestion)
   - *Vishamagni* (Irregular, fluctuating digestion / Vata)
   - *Tikshnagni* (Hyperactive, intense hunger, acidity / Pitta)
   - *Mandagni* (Sluggish, slow metabolism / Kapha)
6. **Prakriti (प्रकृति)**: Baseline constitutional bio-energy profile (Vata, Pitta, Kapha, or dual *Dwandvaja*).
7. **Vayas (वयस्)**: Life stage (*Balya* <16 yrs, *Madhyama* 16–60 yrs, *Vriddha* >60 yrs).
8. **Sattva (सत्त्व)**: Psychological tolerance and stress fortitude (*Pravara*, *Madhyama*, *Avara*).
9. **Satmya (सात्म्य)**: Dietary habituation and food compatibility (*Oka-satmya*).
10. **Ahara-Shakti (आहार शक्ति)**: Capacity for food ingestion (*Abhyavaharana Shakti*) and digestion (*Jarana Shakti*).

Additionally, the engine evaluates **Koshta** (bowel habits: *Mrudu*, *Madhyama*, *Krura*) and recognizes traditional Ayurvedic pharmacopoeia categories: *Kwath* (decoction), *Churna* (powder), *Taila* (oil), *Vati* (tablet), *Bhasma* (calcined mineral), and *Asava/Arishta* (fermented tonic).

---

## 6. Safety Guardrails & Deterministic Red-Flag Engine

The file `lib/redflag.ts` implements an uncompromising, deterministic safety protocol that inspects every spoken phrase and option selection against high-risk clinical conditions.

```
Spoken Input / Option Selection
               |
               v
+------------------------------+
| checkRedFlagRules() Engine   |
+------------------------------+
        |               |
   Match Found     No Match
        |               |
        v               v
 [EMERGENCY ALERT]  [Normal Conversational Flow]
 - Stop Interview
 - Full-Screen Red Flashing Alert
 - Loud Multi-lingual Audio Siren
 - Log red_flag_events in Neon DB
 - Priority Triage in Doctor Queue
```

### 6.1 Defined Red-Flag Rules

#### 1. Acute Crushing Chest Pain / Cardiac Warning (`RF_CARDIAC_ACUTE`)
- **Severity**: `CRITICAL`
- **Triggers**: Symptoms mentioning chest pain / "छाती में दर्द" / "सीना दर्द" combined with terms like "crushing", "radiat", "arm", "sweat", "breathless", "सांस फूलना", or "बांह".
- **Patient Instruction (Hindi)**: *"कृपया तुरंत आपातकालीन (Emergency) काउंटर पर जाएं — एक नर्स को सूचित कर दिया गया है।"*
- **Patient Instruction (English)**: *"Please proceed directly to the Emergency desk now — a nurse has been notified."*

#### 2. FAST Stroke Protocol (`RF_STROKE_FAST`)
- **Severity**: `CRITICAL`
- **Triggers**: Sudden facial droop, slurred speech, acute unilateral weakness, "बोलने में तकलीफ", "मुंह टेढ़ा", or "लकवा".
- **Patient Instruction**: *"Please proceed to the Emergency desk immediately."*

#### 3. Severe Respiratory Distress (`RF_RESPIRATORY_DISTRESS`)
- **Severity**: `CRITICAL`
- **Triggers**: Breathlessness at rest, gasping, "सांस नहीं आ रही" combined with "severe", "at rest", or "बहुत तेज".
- **Patient Instruction**: *"Please proceed to the Emergency desk immediately — medical staff is alerted."*

#### 4. Anaphylactic Airway Warning (`RF_ANAPHYLAXIS`)
- **Severity**: `HIGH`
- **Triggers**: Allergy / "एलर्जी" combined with facial/airway swelling, throat tightness, or lip edema.
- **Patient Instruction**: *"Please step to the Triage help desk immediately."*

---

## 7. Zero-Disk Document OCR & Extraction Engine

MediKiosk allows patients to scan physical documents (handwritten doctor prescriptions, diagnostic lab panels, discharge summaries).

### 7.1 Data Protection & DPDP 2023 Compliance
Under the Digital Personal Data Protection Act (DPDP 2023), raw patient health documents must not sit unprotected on local kiosk storage.
- **Zero-Disk Processing**: Uploaded image buffers are streamed into memory (`Buffer.from(await file.arrayBuffer())`), converted to base64, evaluated by Mistral Pixtral Vision, and **immediately garbage collected**.
- No image files are ever written to the kiosk's hard drive or persistent disk.

### 7.2 Context-Infused Document Extraction
A major breakthrough in MediKiosk's document reading capability is **Patient Context Infusion**:
- Handwritten prescriptions in Indian healthcare are notoriously difficult to decipher.
- Before calling `pixtral-12b-2409`, MediKiosk fetches the patient's prior spoken interview history from `structured_history`.
- The prompt provides the patient's reported symptoms to the vision model:
  > *"Leverage the patient's spoken intake context above to help disambiguate doctor handwriting, abbreviations, or partial medicine names (e.g. Rx abbreviations like 'Tab PCM 650mg TDS', 'Cap Amox-Clav 625', 'Tab Pantocid 40 OD', 'HbA1c', 'LFT/KFT', 'CBC')."*
- If a patient states they have acid reflux and fever, the vision model can easily decipher a scribbled `"Tab Pan-D"` or `"Tab Dolo 650"`.

### 7.3 Extracted Entity Classification
Entities are classified and assigned confidence scores (0.0 to 1.0):
- **Diagnoses**: Clinical impressions, ICD indicators.
- **Medications**: Name, dosage (e.g., 500mg), route (Oral), frequency (BD/OD/TDS), duration.
- **Lab Values**: Test name, numerical value, unit, reference interval.
- **Clinical Notes**: Dietary instructions, follow-up dates.
- **Verification Flag**: Any entity extracted with confidence **< 0.70** is automatically marked with `needs_verification = TRUE`.

---

## 8. Database Schema & Data Models

MediKiosk uses **Neon Serverless PostgreSQL**. Below is the complete relational architecture consisting of 13 interconnected tables:

```mermaid
erDiagram
    sessions ||--o{ consent_records : "has"
    sessions ||--o{ raw_answers : "records"
    sessions ||--o{ structured_history : "structures"
    sessions ||--o{ red_flag_events : "triggers"
    sessions ||--o{ document_uploads : "receives"
    sessions ||--o{ extracted_entities : "contains"
    sessions ||--o{ draft_summaries : "generates"
    sessions ||--o{ contradictions : "detects"
    sessions ||--o{ review_actions : "tracks"
    sessions ||--o{ attested_records : "finalizes"
    sessions ||--o{ fhir_bundles : "exports"
    sessions ||--o{ audit_log : "audits"

    raw_answers ||--o{ structured_history : "evidences"
    document_uploads ||--o{ extracted_entities : "sources"
    attested_records ||--o{ fhir_bundles : "certifies"
```

### Table 1: `sessions`
The master record tracking a patient's interaction at the kiosk.
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id VARCHAR(50) NOT NULL UNIQUE,     -- Sequential token (e.g., Q-101, Q-102)
  abha_mock_id VARCHAR(50),                  -- ABHA ID (e.g., 91-1234-5678-9012)
  patient_ref VARCHAR(100) DEFAULT 'PATIENT_GUEST',
  patient_name VARCHAR(255),                 -- Self-reported name
  age INTEGER,                               -- Age in years
  gender VARCHAR(20),                        -- Male / Female / Other
  language VARCHAR(10) DEFAULT 'hi',         -- Selected language code
  clinical_mode VARCHAR(50) DEFAULT 'allopathy', -- 'allopathy' | 'ayurveda'
  status VARCHAR(50) DEFAULT 'in_progress',  -- 'in_progress' | 'completed' | 'attested'
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE
);
```

### Table 2: `consent_records`
DPDP Act 2023 compliant consent audit logging.
```sql
CREATE TABLE consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  notice_version VARCHAR(20) DEFAULT 'v1.0',
  language VARCHAR(10) DEFAULT 'hi',
  method VARCHAR(20) DEFAULT 'touch',        -- 'touch' | 'voice' | 'guardian'
  consented_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  revoked_at TIMESTAMP WITH TIME ZONE        -- Populated if consent is withdrawn
);
```

### Table 3: `raw_answers`
Immutable verbatim record of patient speech transcripts or button taps.
```sql
CREATE TABLE raw_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  question_id VARCHAR(100) NOT NULL,
  source_mode VARCHAR(20) NOT NULL,          -- 'voice' | 'touch'
  transcript_text TEXT NOT NULL,
  confidence NUMERIC(4, 3) DEFAULT 0.95,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Table 4: `structured_history`
Normalized clinical questionnaire slots extracted from raw answers.
```sql
CREATE TABLE structured_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  section VARCHAR(50) NOT NULL,              -- 'chief_complaint' | 'hpi' | 'past_history' | 'allergies' | 'ayush_agni' etc.
  field_name VARCHAR(100) NOT NULL,
  value TEXT NOT NULL,
  source_raw_answer_id UUID REFERENCES raw_answers(id),
  confidence NUMERIC(4, 3) DEFAULT 0.95,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Table 5: `red_flag_events`
Audit log of deterministic emergency safety rule triggers.
```sql
CREATE TABLE red_flag_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  rule_id VARCHAR(100) NOT NULL,             -- e.g., 'RF_CARDIAC_ACUTE'
  session_state_at_trigger JSONB NOT NULL,
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Table 6: `document_uploads`
Zero-disk document processing metadata.
```sql
CREATE TABLE document_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  file_ref VARCHAR(255) NOT NULL,            -- e.g., 'ram_buffer_1740920000000'
  mime_type VARCHAR(50) NOT NULL,
  quality_check_result VARCHAR(50),          -- 'PASSED' | 'FAILED_UNREADABLE'
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Table 7: `extracted_entities`
Medical entities extracted from documents via Pixtral 12B Vision.
```sql
CREATE TABLE extracted_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  source_doc_id UUID REFERENCES document_uploads(id),
  entity_type VARCHAR(50) NOT NULL,          -- 'diagnosis' | 'medication' | 'lab_result' | 'clinical_note' | 'ayush_remedy'
  raw_text TEXT NOT NULL,
  confidence NUMERIC(4, 3) NOT NULL,
  needs_verification BOOLEAN DEFAULT FALSE,  -- True if confidence < 0.70
  fields JSONB,                              -- Detailed breakdown (name, dose, unit, range)
  extracted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Table 8: `draft_summaries`
Synthesized clinical summaries generated by Mistral AI.
```sql
CREATE TABLE draft_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  model_name VARCHAR(100) NOT NULL,          -- 'mistral-small-latest'
  model_version VARCHAR(20) NOT NULL,
  prompt_version VARCHAR(20) NOT NULL,
  content JSONB NOT NULL,                    -- Bilingual recap + Clinician SBAR JSON
  input_hash VARCHAR(64) NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Table 9: `contradictions`
Discrepancies identified between spoken intake and scanned records.
```sql
CREATE TABLE contradictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  concept VARCHAR(100) NOT NULL,             -- e.g., 'allergy_vs_medication'
  spoken_value_ref TEXT NOT NULL,
  document_value_ref TEXT NOT NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_note TEXT,
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Table 10: `review_actions`
Audit log of every doctor edit, acceptance, or rejection.
```sql
CREATE TABLE review_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  clinician_id VARCHAR(100) NOT NULL,
  field_ref VARCHAR(100) NOT NULL,
  action VARCHAR(20) NOT NULL,               -- 'accepted' | 'edited' | 'rejected'
  previous_value TEXT,
  new_value TEXT,
  reason TEXT,                               -- Mandatory reason for edits/rejections
  acted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Table 11: `attested_records`
Clinician-signed immutable consultation intake record.
```sql
CREATE TABLE attested_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  clinician_id VARCHAR(100) NOT NULL,
  content JSONB NOT NULL,
  attested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Table 12: `fhir_bundles`
Validated HL7 FHIR R4 JSON document bundles.
```sql
CREATE TABLE fhir_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  attested_record_id UUID REFERENCES attested_records(id),
  bundle_type VARCHAR(50) DEFAULT 'document',
  bundle_json JSONB NOT NULL,
  validation_status VARCHAR(50),             -- 'valid' | 'invalid'
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Table 13: `audit_log`
Comprehensive immutable system access and security trail.
```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id VARCHAR(100) NOT NULL,
  actor_type VARCHAR(50) NOT NULL,           -- 'patient' | 'clinician' | 'system'
  action VARCHAR(100) NOT NULL,              -- 'CREATE_SESSION', 'SIGN_ATTESTATION', etc.
  table_ref VARCHAR(50),
  record_ref VARCHAR(100),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 9. End-to-End System Workflows

```
PATIENT FLOW                              CLINICIAN FLOW
+---------------------------+             +---------------------------+
| 1. Language Selection     |             | 1. Live Queue Polling     |
|    (10 Indian Languages)  |             |    (4s auto-refresh)      |
+-------------+-------------+             +-------------+-------------+
              |                                         |
              v                                         v
+---------------------------+             +---------------------------+
| 2. DPDP Digital Consent   |             | 2. Case Selection         |
|    (Notice, Touch/Voice)  |             |    (Priority Triage Sort) |
+-------------+-------------+             +-------------+-------------+
              |                                         |
              v                                         v
+---------------------------+             +---------------------------+
| 3. Patient Demographics   |             | 3. Sub-60s SBAR Review    |
|    (Name, Age, Gender)    |             |    (One-Page Summary)     |
+-------------+-------------+             +-------------+-------------+
              |                                         |
              v                                         v
+---------------------------+             +---------------------------+
| 4. Conversational Voice   |             | 4. Contradiction Resolver |
|    Intake Interview       |             |    (Side-by-Side Cards)   |
|    (SOCRATES / AYUSH)     |             +-------------+-------------+
+-------------+-------------+                           |
              |                                         v
     [Red-Flag Triggered?]                +---------------------------+
     /                   \                | 5. Low-Confidence Entity  |
   YES                   NO               |    Verification (<70%)    |
   /                       \              +-------------+-------------+
  v                         v                           |
[EMERGENCY SIREN]    +------------------+               v
[Direct to ER]       | 5. Zero-Disk OCR | +---------------------------+
                     |    Scan & Recap  | | 6. Attestation Gate Sign  |
                     +--------+---------+ |    (Block unverified)     |
                              |           +-------------+-------------+
                              v                         |
                     +------------------+               v
                     | 6. Routed to OPD | +---------------------------+
                     |    Waiting Room  | | 7. ABDM FHIR R4 Bundle &  |
                     +------------------+ |    Text Consultation Note |
                                          +---------------------------+
```

### 9.1 Patient Kiosk Intake Journey
1. **Screen 1: Language Selection (`language`)**:
   - The kiosk displays 10 language tiles. The patient taps their language or uses voice to select.
   - The UI immediately updates all labels, prompts, and audio to the chosen language.
2. **Screen 2: Digital Health Data Consent (`consent`)**:
   - DPDP 2023 notice plays aloud via server TTS.
   - Options: Patient Consent, Guardian/Caregiver Consent, or Decline.
   - Recorded into `consent_records`.
3. **Screen 3: Patient Demographics & Registration (`identify`)**:
   - Displays continuous sequential token (e.g., `Q-104`).
   - Patient inputs or speaks their name, selects age and gender, and can optionally link a mock ABHA Health ID.
   - Demographics are saved to `sessions` and `structured_history`.
4. **Screen 4: Adaptive Clinical Interview (`interview`)**:
   - Initial question asks for Chief Complaint.
   - Patient answers via continuous voice recognition or quick-tap bilingual suggestion chips.
   - After each turn:
     - Input is evaluated against the deterministic red-flag engine.
     - Spoken answer is recorded in `raw_answers` and `structured_history`.
     - Contextual follow-up question is generated dynamically by Mistral AI (`mistral-small-latest`).
     - Live draft summary is updated in the background.
   - The interview automatically concludes after 6 to 7 turns or when all clinical domains are explored.
5. **Screen 5: Emergency Escalation (`red_flag`)** *(Only if triggered)*:
   - Full-screen high-visibility red flashing banner with emergency siren audio.
   - Instructs patient to step immediately to the emergency desk.
6. **Screen 6: Document Scanner (`scan`)**:
   - Patient holds their previous prescription or lab report in front of the camera or uploads a document.
   - Document is evaluated in RAM by Pixtral 12B Vision with interview context infusion.
   - Extracted diagnoses, medications, and lab values are recorded into `extracted_entities`.
7. **Screen 7: Confirmation & Waiting Queue (`confirm`)**:
   - Patient receives a bilingual spoken confirmation recap.
   - Session status transitions to `completed`.
   - Patient is directed to wait outside the doctor's room.

### 9.2 Clinician Review & Attestation Journey
1. **Live Queue Sorting**:
   - The dashboard continuously polls `/api/clinician/queue` every 4 seconds.
   - Sessions are prioritized: **Red Flag cases first (Red badge)**, **Contradiction cases second (Amber badge)**, followed by timestamp.
2. **Sub-60-Second One-Page Clinical Review**:
   - The doctor opens a patient case and views the consolidated SBAR report:
     - Patient Demographics & ABHA ID.
     - Chief Complaint & SOCRATES HPI.
     - Chronic Disease History & Family History.
     - Allergies & Current Medications.
     - Classical Dashavidha Pariksha (if AYUSH mode active).
     - Extracted Lab Results.
3. **Draft Summary Actions**:
   - Each clinical card offers **Accept**, **Edit**, or **Reject** controls.
   - Editing or rejecting requires entering a mandatory clinical rationale, logged in `review_actions`.
4. **Contradiction Resolution Cards**:
   - Highlights discrepancies (e.g., patient reported "No allergies", but uploaded prescription shows active allergy medication).
   - Doctor selects the clinically correct value, resolving the conflict.
5. **Attestation Gate Sign-Off**:
   - When the doctor clicks **"Attest & Sign Off Intake"**, the system checks two safety gates:
     - *Gate 1*: Are there any unresolved contradictions? If yes, attestation is blocked.
     - *Gate 2*: Are there any unreviewed low-confidence extractions (<70%)? If yes, attestation is blocked.
   - Once cleared, an immutable record is generated in `attested_records`, and the session status becomes `attested`.
6. **FHIR R4 Bundle & Plaintext Consultation Note**:
   - Generates an HL7 FHIR R4 document bundle (`Bundle` containing `Composition`, `Patient`, `Encounter`, `Condition`, `MedicationStatement`, `AllergyIntolerance`).
   - Generates an ABDM/NRCeS aligned plaintext consultation note available for instant copying or download as a `.txt` file.

---

## 10. Complete API Reference

### 10.1 Kiosk & Intake Endpoints

#### `GET /api/session`
Calculates the continuous next sequential queue token.
- **Response**:
  ```json
  { "success": true, "next_token": "Q-105" }
  ```

#### `POST /api/session`
Initializes a new session.
- **Request Body**:
  ```json
  {
    "language": "hi",
    "queue_id": "Q-105",
    "abha_mock_id": "91-1234-5678-9012",
    "patient_ref": "PATIENT_GUEST",
    "clinical_mode": "allopathy"
  }
  ```
- **Response**:
  ```json
  { "success": true, "session": { "id": "uuid", "queue_id": "Q-105", "status": "in_progress", ... } }
  ```

#### `PATCH /api/session/[id]`
Updates patient demographics (name, age, gender).
- **Request Body**:
  ```json
  {
    "patient_name": "Rakesh Sharma",
    "age": 42,
    "gender": "Male",
    "queue_id": "Q-105"
  }
  ```

#### `POST /api/session/[id]/consent`
Records or revokes DPDP compliant patient consent.
- **Request Body**:
  ```json
  {
    "method": "touch",
    "notice_version": "v1.0",
    "language": "hi",
    "revoke": false
  }
  ```

#### `POST /api/session/[id]/converse`
Submits a conversational turn, evaluates red flags, and returns the next dynamic question.
- **Request Body**:
  ```json
  {
    "question_id": "q_chief_complaint",
    "source_mode": "voice",
    "transcript_text": "I have severe chest pain radiating to my left arm",
    "section": "chief_complaint",
    "field_name": "chief_complaint"
  }
  ```
- **Response (If Red Flag triggered)**:
  ```json
  {
    "red_flag": true,
    "trigger": {
      "rule_id": "RF_CARDIAC_ACUTE",
      "severity": "CRITICAL",
      "title": "Acute Crushing Chest Pain Suspicion",
      "patient_instruction_hi": "कृपया तुरंत आपातकालीन (Emergency) काउंटर पर जाएं...",
      "patient_instruction_en": "Please proceed directly to the Emergency desk now..."
    },
    "event_id": "uuid"
  }
  ```
- **Response (Normal Turn)**:
  ```json
  {
    "success": true,
    "answered_question_id": "q_chief_complaint",
    "next_question": {
      "id": "q_duration",
      "question_localized": "यह दर्द कब से हो रहा है?",
      "question_en": "How long have you been experiencing this pain?",
      "section": "hpi",
      "field_name": "symptom_onset",
      "options": ["आज सुबह से / Since morning", "2-3 दिनों से / 2-3 days", "1 हफ्ते से / 1 week"]
    },
    "is_completed": false,
    "turn_count": 2
  }
  ```

#### `POST /api/session/[id]/scan`
Accepts `multipart/form-data` with an image file, runs zero-disk RAM extraction via Pixtral 12B Vision infused with interview context, stores entities, and refreshes the summary.
- **Form Data**: `file: Blob`
- **Response**:
  ```json
  {
    "success": true,
    "quality_assessment": "good",
    "raw_extraction": {
      "document_type": "prescription",
      "diagnoses": [{ "name": "Essential Hypertension", "confidence": 0.95 }],
      "medications": [{ "name": "Telmisartan", "dose": "40mg", "frequency": "OD", "confidence": 0.92 }],
      "lab_values": []
    }
  }
  ```

#### `POST /api/session/[id]/summary`
Synthesizes the bilingual patient recap and clinician SBAR report over recorded history and entities.
- **Response**: Returns `draft_summary` and active `contradictions`.

#### `GET /api/tts`
Streams server-synthesized regional audio MP3s across all 10 Indian languages.
- **Parameters**: `?lang=hi&text=कृपया+ध्यान+दें`
- **Response**: `Content-Type: audio/mpeg`

---

### 10.2 Clinician Dashboard Endpoints

#### `GET /api/clinician/queue`
Retrieves all sessions sorted by clinical priority (Red Flags > Contradictions > Newest).
- **Response**:
  ```json
  {
    "success": true,
    "queue": [
      {
        "id": "uuid",
        "queue_id": "Q-104",
        "patient_name": "Rakesh Sharma",
        "age": 42,
        "gender": "Male",
        "clinical_mode": "allopathy",
        "status": "completed",
        "red_flag_count": 0,
        "contradiction_count": 1,
        "verification_count": 0,
        "latest_draft": { ... }
      }
    ]
  }
  ```

#### `GET /api/clinician/session/[id]`
Returns the complete 360-degree case file: master session, structured history, extracted entities, raw answers, draft summary, contradictions, review actions, and attested record.

#### `PATCH /api/clinician/session/[id]/review`
Logs an explicit doctor review action (**accepted**, **edited**, **rejected**) with clinical reasoning into `review_actions`.

#### `POST /api/clinician/session/[id]/attest`
Signs off the consultation record after verifying that all contradictions are resolved and low-confidence entities are reviewed.
- **Request Body**:
  ```json
  {
    "clinician_id": "Dr. Sharma, MD",
    "attested_content": { ... },
    "bypass_checks": false
  }
  ```

#### `GET & POST /api/clinician/session/[id]/fhir`
Generates a synthetic HL7 FHIR R4 Bundle and human-readable consultation report. If the session is attested, saves the bundle into `fhir_bundles`.

---

## 11. What Has Been Built vs. Stubs & Roadmap

### 11.1 What is 100% Fully Built & Functional
- **Full-Stack Next.js 15 Application**: Clean separation between patient `/kiosk` and doctor `/clinician` interfaces.
- **Live Database Connection**: Connected to a cloud Neon Serverless PostgreSQL database with all tables, constraints, and audit logging.
- **Mistral AI Integration**: Live connection using `@mistralai/mistralai` with dynamic structured JSON prompts for `mistral-small-latest` and zero-disk vision OCR with `pixtral-12b-2409`.
- **Bilingual & Multilingual Engine**: 10 Indian languages with native scripts, translated UI packs, BCP-47 speech recognition, and regional audio synthesis.
- **Deterministic Red-Flag Safety Engine**: Instant emergency alerts for acute cardiac events, FAST stroke symptoms, respiratory failure, and anaphylaxis.
- **Zero-Disk OCR & Document Parsing**: Image processing in RAM with patient-context infusion to decipher handwritten doctor notes and lab tests.
- **Live Clinician Dashboard**: Polling patient queue, priority triage badges, SBAR layout, side-by-side contradiction cards, audit-logging edit modals, and attestation gates.
- **ABDM FHIR R4 Bundle & Plaintext Note Generator**: Full schema generator producing valid FHIR R4 JSON bundles and NRCeS-compliant text consultation notes with instant download.
- **Ministry of AYUSH Integration**: Complete Ayurvedic clinical framework including Dashavidha Pariksha, Tridosha assessment, Agni evaluation, and traditional formulations.

### 11.2 Simulation & Stubs (Sandbox Testing)
- **ABHA ID Verification**: Currently accepts mock ABHA IDs (e.g., `91-1234-5678-9012`) formatted according to National Health Authority (NHA) specifications. Real-time Aadhaar OTP integration requires an official NHA sandbox gateway client ID and digital signature certificate.
- **Hospital Staff Notification**: When the "Human Help" button or emergency alert triggers, the event is logged to the database and alerts the clinician queue; physical SMS/pager integration requires Twilio or a hospital PBX webhook.

---

## 12. Local Development & Deployment Guide

### 12.1 Prerequisites
- Node.js 18.18+ or 20+
- Neon PostgreSQL Database instance
- Mistral AI API Key

### 12.2 Environment Configuration
Create a `.env.local` file in the root directory:
```env
MISTRAL_API_KEY=your_mistral_api_key_here
DATABASE_URL=postgresql://user:password@ep-your-instance.region.aws.neon.tech/neondb?sslmode=require
NEON_PROJECT_ID=your_neon_project_id
```

### 12.3 Running Locally
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```
Open your browser at **`http://localhost:3000`**:
- Home Selection Hub: [http://localhost:3000](http://localhost:3000)
- Patient Kiosk Portal: [http://localhost:3000/kiosk](http://localhost:3000/kiosk)
- Clinician Review Dashboard: [http://localhost:3000/clinician](http://localhost:3000/clinician)

### 12.4 Production Build
```bash
# Build production bundle
npm run build

# Start production server
npm run start
```
The application is fully compatible with deployment on Vercel, AWS ECS, Google Cloud Run, or on-premise hospital intranet servers.
