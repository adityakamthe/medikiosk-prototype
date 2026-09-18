/**
 * Centralized Cross-Hospital Health Data Exchange (HIE-CM)
 * Implements federated longitudinal EHR retrieval across ABDM-connected hospitals.
 * Standard: ABDM M3 HIU Health Record Exchange with ABHA ID indexing.
 */

export interface CentralClinicalEncounter {
  encounter_id: string;
  hospital_id: string;
  hospital_name: string;
  facility_type: string;
  department: string;
  consulting_doctor: string;
  encounter_date: string;
  clinical_mode: 'allopathy' | 'ayurveda';
  chief_complaint: string;
  diagnoses: Array<{
    code: string;
    system: string;
    display: string;
  }>;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
  }>;
  lab_investigations?: Array<{
    test_name: string;
    value: string;
    unit: string;
    reference_range: string;
    status: 'NORMAL' | 'ABNORMAL' | 'PANIC';
  }>;
  ayush_assessment?: {
    prakriti: string;
    vikriti: string;
    agni: string;
    kostha: string;
  };
  discharge_summary_excerpt?: string;
}

export interface LongitudinalHealthRecord {
  abha_id: string;
  patient_name: string;
  gender: string;
  dob: string;
  total_encounters: number;
  participating_hospitals: string[];
  encounters: CentralClinicalEncounter[];
  last_updated: string;
}

// In-Memory Federated Repository (Pre-populated for Demo Patients across Indian Tertiary Hospitals)
const CENTRAL_HIE_STORE: Record<string, LongitudinalHealthRecord> = {
  '91-8822-1144-5566': {
    abha_id: '91-8822-1144-5566',
    patient_name: 'Ravi Kumar',
    gender: 'Male',
    dob: '1982-04-12',
    total_encounters: 3,
    participating_hospitals: [
      'All India Institute of Medical Sciences (AIIMS), New Delhi',
      'Civil Hospital, Pune',
      'All India Institute of Ayurveda (AIIA), New Delhi'
    ],
    last_updated: new Date(Date.now() - 86400000 * 5).toISOString(),
    encounters: [
      {
        encounter_id: 'ENC-AIIMS-2025-0891',
        hospital_id: 'HOSP-AIIMS-DELHI',
        hospital_name: 'All India Institute of Medical Sciences (AIIMS), New Delhi',
        facility_type: 'Central Government Tertiary Care Hospital',
        department: 'Department of Cardiology',
        consulting_doctor: 'Dr. Vivek Mehra (MD, DM Cardiology)',
        encounter_date: '2025-11-14',
        clinical_mode: 'allopathy',
        chief_complaint: 'Exertional shortness of breath and elevated blood pressure',
        diagnoses: [
          { code: 'I10', system: 'http://hl7.org/fhir/sid/icd-10', display: 'Essential (primary) hypertension' },
          { code: 'R06.02', system: 'http://hl7.org/fhir/sid/icd-10', display: 'Shortness of breath on exertion' }
        ],
        medications: [
          { name: 'Telmisartan', dosage: '40 mg', frequency: 'OD (Once Daily)', duration: '90 Days' },
          { name: 'Amlodipine', dosage: '5 mg', frequency: 'OD (Morning)', duration: '90 Days' }
        ],
        lab_investigations: [
          { test_name: 'Serum Creatinine', value: '1.02', unit: 'mg/dL', reference_range: '0.70 - 1.20', status: 'NORMAL' },
          { test_name: 'Lipid Panel - LDL', value: '142', unit: 'mg/dL', reference_range: '< 100', status: 'ABNORMAL' }
        ],
        discharge_summary_excerpt: 'Advised strict low-sodium dietary regimen, daily 30-min walking, and quarterly BP monitoring.'
      },
      {
        encounter_id: 'ENC-PUNE-2026-0142',
        hospital_id: 'HOSP-CIVIL-PUNE',
        hospital_name: 'District Civil Hospital, Pune',
        facility_type: 'State Government District Hospital',
        department: 'Department of Orthopedics',
        consulting_doctor: 'Dr. Rajesh Patil (MS Ortho)',
        encounter_date: '2026-01-20',
        clinical_mode: 'allopathy',
        chief_complaint: 'Bilateral knee stiffness and difficulty climbing stairs',
        diagnoses: [
          { code: 'M17.0', system: 'http://hl7.org/fhir/sid/icd-10', display: 'Primary osteoarthritis of knee' }
        ],
        medications: [
          { name: 'Paracetamol', dosage: '650 mg', frequency: 'SOS (When Needed)', duration: '14 Days' },
          { name: 'Diclofenac Sodium Gel 1%', dosage: 'Topical', frequency: 'BD (Twice Daily)', duration: '30 Days' }
        ],
        discharge_summary_excerpt: 'Quadriceps strengthening exercises demonstrated. Avoid prolonged squatting.'
      },
      {
        encounter_id: 'ENC-AIIA-2026-0309',
        hospital_id: 'HOSP-AIIA-DELHI',
        hospital_name: 'All India Institute of Ayurveda (AIIA), New Delhi',
        facility_type: 'National Autonomous Institute (Ministry of Ayush)',
        department: 'Department of Kayachikitsa (Internal Medicine)',
        consulting_doctor: 'Dr. Ananya Sen (MD Ayur)',
        encounter_date: '2026-02-18',
        clinical_mode: 'ayurveda',
        chief_complaint: 'Amlapitta (Hyperacidity) and burning sensation in epigastrium',
        diagnoses: [
          { code: 'AAM-042', system: 'http://ayush.gov.in/namaste', display: 'Amlapitta (Hyperacidity / Acid Dyspepsia)' },
          { code: 'K21.9', system: 'http://hl7.org/fhir/sid/icd-10', display: 'Gastro-esophageal reflux disease without esophagitis' }
        ],
        medications: [
          { name: 'Avipattikar Churna', dosage: '3 grams with lukewarm water', frequency: 'BD before meals', duration: '21 Days' },
          { name: 'Kamdudha Ras (Moti Yukta)', dosage: '250 mg', frequency: 'BD', duration: '21 Days' }
        ],
        ayush_assessment: {
          prakriti: 'Pitta-Vata',
          vikriti: 'Pitta Vriddhi with Ushna Guna Prakopa',
          agni: 'Tikshnagni with Vidagdha Ajeerna',
          kostha: 'Mrudu'
        },
        discharge_summary_excerpt: 'Pathya: Avoid fermented, sour, deep-fried food. Take cooling fluids (coconut water, coriander infusion).'
      }
    ]
  },
  '91-4433-2211-7788': {
    abha_id: '91-4433-2211-7788',
    patient_name: 'Priya Sharma',
    gender: 'Female',
    dob: '1988-09-24',
    total_encounters: 2,
    participating_hospitals: [
      'All India Institute of Ayurveda (AIIA), New Delhi',
      'Safdarjung Hospital, New Delhi'
    ],
    last_updated: new Date(Date.now() - 86400000 * 12).toISOString(),
    encounters: [
      {
        encounter_id: 'ENC-AIIA-2026-0112',
        hospital_id: 'HOSP-AIIA-DELHI',
        hospital_name: 'All India Institute of Ayurveda (AIIA), New Delhi',
        facility_type: 'National Autonomous Institute (Ministry of Ayush)',
        department: 'Department of Panchakarma',
        consulting_doctor: 'Dr. Suresh Varma (MD Ayur)',
        encounter_date: '2026-02-04',
        clinical_mode: 'ayurveda',
        chief_complaint: 'Sandhivata (Osteoarthritis) in right knee with Vata aggravation',
        diagnoses: [
          { code: 'AAM-091', system: 'http://ayush.gov.in/namaste', display: 'Sandhivata (Degenerative Joint Disorder)' }
        ],
        medications: [
          { name: 'Yograj Guggulu', dosage: '2 tablets (500mg)', frequency: 'BD with lukewarm water', duration: '30 Days' },
          { name: 'Mahanarayan Taila', dosage: 'Local Abhyanga', frequency: 'OD Morning', duration: '30 Days' }
        ],
        ayush_assessment: {
          prakriti: 'Vata-Kapha',
          vikriti: 'Vata Prakopa in Asthi-Majja Dhatu',
          agni: 'Vishamagni',
          kostha: 'Krura'
        },
        discharge_summary_excerpt: 'Janu Basti scheduled for next Panchakarma cycle.'
      }
    ]
  },
  '91-4582-7391-0428': {
    abha_id: '91-4582-7391-0428',
    patient_name: 'Rahul Sharma',
    gender: 'Male',
    dob: '1988-06-15',
    total_encounters: 1,
    participating_hospitals: [
      'King Edward Memorial (KEM) Hospital, Mumbai'
    ],
    last_updated: new Date(Date.now() - 86400000 * 30).toISOString(),
    encounters: [
      {
        encounter_id: 'ENC-KEM-2025-9921',
        hospital_id: 'HOSP-KEM-MUMBAI',
        hospital_name: 'King Edward Memorial (KEM) Hospital, Mumbai',
        facility_type: 'Municipal Tertiary Hospital',
        department: 'Department of Pulmonology',
        consulting_doctor: 'Dr. Farhan Merchant (MD Pulm)',
        encounter_date: '2025-10-18',
        clinical_mode: 'allopathy',
        chief_complaint: 'Allergic rhinitis and intermittent dry nocturnal cough',
        diagnoses: [
          { code: 'J30.9', system: 'http://hl7.org/fhir/sid/icd-10', display: 'Allergic rhinitis, unspecified' }
        ],
        medications: [
          { name: 'Levocetirizine', dosage: '5 mg', frequency: 'OD (Bedtime)', duration: '15 Days' },
          { name: 'Fluticasone Propionate Nasal Spray', dosage: '50 mcg/spray', frequency: '2 sprays per nostril OD', duration: '30 Days' }
        ]
      }
    ]
  }
};

/**
 * Query Central Health Data Exchange for longitudinal patient record across Indian hospitals.
 */
export async function queryCentralHealthExchange(abhaId: string): Promise<LongitudinalHealthRecord | null> {
  const normalized = abhaId.trim();
  if (CENTRAL_HIE_STORE[normalized]) {
    return CENTRAL_HIE_STORE[normalized];
  }

  // Check matching stripped format (e.g. "91458273910428")
  const stripped = normalized.replace(/\D/g, '');
  for (const [key, record] of Object.entries(CENTRAL_HIE_STORE)) {
    if (key.replace(/\D/g, '') === stripped) {
      return record;
    }
  }

  return null;
}

/**
 * Publish newly attested clinical encounter into the Centralized Health Exchange.
 */
export async function publishRecordToCentralExchange(
  abhaId: string,
  encounter: CentralClinicalEncounter,
  patientName: string = 'Patient',
  gender: string = 'Not specified',
  dob: string = '1990-01-01'
): Promise<LongitudinalHealthRecord> {
  const cleanAbha = abhaId.trim();
  if (!CENTRAL_HIE_STORE[cleanAbha]) {
    CENTRAL_HIE_STORE[cleanAbha] = {
      abha_id: cleanAbha,
      patient_name: patientName,
      gender,
      dob,
      total_encounters: 0,
      participating_hospitals: [],
      encounters: [],
      last_updated: new Date().toISOString()
    };
  }

  const existing = CENTRAL_HIE_STORE[cleanAbha];
  existing.encounters.unshift(encounter);
  existing.total_encounters = existing.encounters.length;
  if (!existing.participating_hospitals.includes(encounter.hospital_name)) {
    existing.participating_hospitals.push(encounter.hospital_name);
  }
  existing.last_updated = new Date().toISOString();

  return existing;
}
