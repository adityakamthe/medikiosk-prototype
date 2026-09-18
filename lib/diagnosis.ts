/**
 * MediKiosk Clinical Voice Diagnosis & Symptom Extraction Engine
 * Analyzes patient-spoken responses for clinical diagnostic impressions,
 * symptom entities, anatomical system involvement, and clinical acuity.
 */

export interface VoiceDiagnosisAnalysis {
  provisional_diagnoses: Array<{
    name: string;
    confidence: number;
    acuity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'ROUTINE';
    rationale: string;
    system: string;
    icd10_hint?: string;
  }>;
  detected_symptoms: Array<{
    name: string;
    severity: 'mild' | 'moderate' | 'severe' | 'excruciating';
    anatomical_site: string;
    duration?: string;
  }>;
  overall_acuity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'ROUTINE';
  primary_system: string;
  clinical_impression_summary: string;
  suggested_investigations: string[];
}

// Deterministic Clinical Symptom & Diagnosis Knowledge Base
const CLINICAL_DIAGNOSTIC_CLUSTERS = [
  {
    system: 'Cardiovascular',
    ayush_system: 'Hridaya / Rasavaha Srotas (Cardiovascular)',
    keywords: ['chest pain', 'chest pressure', 'tightness', 'crushing', 'radiating to arm', 'heart attack', 'cardiac', 'angina', 'palpitations', 'छाती में दर्द', 'सीना दर्द', 'हार्ट', 'छातीत दुखणे', 'நெஞ்சு வலி', 'గుండె నొప్పి', 'ह्रदयशूल'],
    primary_diagnosis: 'Suspected Acute Coronary Syndrome / Angina Pectoris',
    ayush_primary_diagnosis: 'Hridshula (Vata-Kapha / Pittaja Hridroga)',
    differential: ['Musculoskeletal Chest Wall Pain', 'Gastroesophageal Reflux Disease (GERD)'],
    tests: ['12-Lead ECG', 'Serum Troponin-I', '2D Echocardiography', 'Lipid Profile']
  },
  {
    system: 'Respiratory',
    ayush_system: 'Pranavaha Srotas (Respiratory)',
    keywords: ['cough', 'breathless', 'shortness of breath', 'wheezing', 'phlegm', 'gasping', 'asthma', 'सांस', 'खांसी', 'दमा', 'खोकला', 'இருமல்', 'దగ్గు', 'कास', 'श्वास', 'कफ', 'तकलीफ'],
    primary_diagnosis: 'Acute Bronchial Asthma / Acute Respiratory Infection',
    ayush_primary_diagnosis: 'Tamaka Shwasa / Kasa Roga (Kapha-Vataja)',
    differential: ['Acute Bronchitis', 'Upper Respiratory Tract Infection (URTI)', 'Pneumonia'],
    tests: ['Chest X-Ray (PA View)', 'Pulse Oximetry (SpO2)', 'Peak Expiratory Flow Rate (PEFR)', 'CBC & ESR']
  },
  {
    system: 'Gastrointestinal',
    ayush_system: 'Annavaha Srotas (Gastrointestinal / Digestion)',
    keywords: ['stomach pain', 'abdominal pain', 'acidity', 'gas', 'burning sensation', 'vomiting', 'nausea', 'loose motion', 'diarrhea', 'constipation', 'पेट दर्द', 'गैस', 'एसिडिटी', 'उल्टी', 'पोटदुखी', 'अम्लपित्त', 'जलन', 'खट्टी डकार', 'डकार', 'अजीर्ण', 'വയറുവേദന', 'വയറിളക്കം'],
    primary_diagnosis: 'Acute Gastritis / Peptic Ulcer Disease',
    ayush_primary_diagnosis: 'Amlapitta (Pitta Prakopa) / Vidagdha Ajirna',
    differential: ['Gastroenteritis', 'Gastroesophageal Reflux Disease (GERD)', 'Irritable Bowel Syndrome (IBS)'],
    tests: ['Abdominal Ultrasound (USG)', 'Serum Amylase & Lipase', 'Complete Blood Count (CBC)', 'Stool Examination']
  },
  {
    system: 'Neurological',
    ayush_system: 'Majjavaha / Shiroroga Srotas (Neurological)',
    keywords: ['headache', 'migraine', 'dizziness', 'giddiness', 'vertigo', 'blackout', 'seizure', 'fainting', 'माथा दर्द', 'सिरदर्द', 'चक्कर', 'डोकेदुखी', 'தலைவலி', 'తలనెప్పి', 'शिरःशूल'],
    primary_diagnosis: 'Migraine Cephalea / Vascular Headache',
    ayush_primary_diagnosis: 'Vatika / Pittaja Shirashula (Ardhavabhedaka)',
    differential: ['Tension-Type Headache', 'Benign Paroxysmal Positional Vertigo (BPPV)', 'Cervicogenic Headache'],
    tests: ['Non-Contrast CT Brain (if severe/thunderclap)', 'Blood Pressure Monitoring', 'Ophthalmic Fundoscopy', 'Serum Electrolytes']
  },
  {
    system: 'Musculoskeletal',
    ayush_system: 'Asthi-Majjavaha Srotas (Musculoskeletal)',
    keywords: ['back pain', 'joint pain', 'knee pain', 'sciatica', 'stiffness', 'swelling in joint', 'neck pain', 'कमर दर्द', 'जोड़ों का दर्द', 'घुटने में दर्द', 'पाठदुखी', 'மூட்டு வலி', 'కీళ్ల నొప్పులు', 'संधिशूल', 'कटिशूल', 'आमवात'],
    primary_diagnosis: 'Lumbar Spondylosis / Musculoskeletal Strain',
    ayush_primary_diagnosis: 'Sandhigata Vata / Katishula (Vata Prakopa)',
    differential: ['Osteoarthritis (Early Stage)', 'Lumbar Radiculopathy / Sciatica', 'Myofascial Pain Syndrome'],
    tests: ['Lumbosacral / Affected Joint X-Ray', 'Serum Uric Acid', 'Rheumatoid Factor (RA Factor)', 'Serum Vitamin D3 & Calcium']
  },
  {
    system: 'Infectious / Febrile',
    ayush_system: 'Swedavaha / Rasavaha Srotas (Febrile)',
    keywords: ['fever', 'chills', 'shivering', 'sweating', 'viral', 'malaria', 'dengue', 'typhoid', 'बुखार', 'कंपकंपी', 'ताप', 'காய்ச்சல்', 'జ్వరం', 'ज्वर'],
    primary_diagnosis: 'Acute Febrile Illness / Viral Pyrexia',
    ayush_primary_diagnosis: 'Nava Jwara (Amapradhana Jwara)',
    differential: ['Bacterial Infection / Enteric Fever', 'Vector-Borne Infection (Malaria/Dengue)', 'Upper Respiratory Infection'],
    tests: ['Complete Blood Count (CBC) with Platelets', 'Peripheral Smear for Malarial Parasite', 'Dengue NS1 Antigen & IgM', 'Widal / Typhoid Screen']
  },
  {
    system: 'Endocrine & Metabolic',
    ayush_system: 'Medovaha Srotas (Metabolic)',
    keywords: ['sugar', 'diabetes', 'excessive thirst', 'frequent urination', 'fatigue', 'weight loss', 'blood pressure', 'bp', 'मधुमेह', 'शुगर', 'बीपी', 'రక్తపోటు', 'சர்க்கரை நோய்', 'प्रमेह'],
    primary_diagnosis: 'Uncontrolled Type 2 Diabetes Mellitus / Essential Hypertension',
    ayush_primary_diagnosis: 'Prameha / Madhumeha (Kaphaja / Vataja)',
    differential: ['Impaired Glucose Tolerance', 'Metabolic Syndrome', 'Hypertensive Urgency'],
    tests: ['Fasting & Postprandial Blood Glucose', 'HbA1c Glycated Hemoglobin', 'Kidney Function Test (Serum Creatinine & Urea)', 'Urine Microalbumin']
  }
];

/**
 * Analyzes patient voice input (transcript) against clinical knowledge clusters
 * and ongoing conversation history to deduce provisional diagnostic impressions.
 */
export function analyzeVoiceInputForDiagnosis(
  transcriptText: string,
  currentHistory: Array<{ question?: string; answer?: string; section?: string; field_name?: string }> = [],
  clinicalMode: string = 'allopathy'
): VoiceDiagnosisAnalysis {
  const combinedText = [
    transcriptText || '',
    ...currentHistory.map(h => `${h.field_name || ''} ${h.answer || ''}`)
  ].join(' ').toLowerCase();

  const isAyurveda = clinicalMode === 'ayurveda';

  // 1. Identify Affected System & Matching Clusters
  const matchedClusters: Array<{
    system: string;
    ayush_system?: string;
    primary_diagnosis: string;
    ayush_primary_diagnosis?: string;
    differential: string[];
    tests: string[];
    matchCount: number;
  }> = [];

  for (const cluster of CLINICAL_DIAGNOSTIC_CLUSTERS) {
    let count = 0;
    for (const kw of cluster.keywords) {
      if (combinedText.includes(kw.toLowerCase())) {
        count++;
      }
    }
    if (count > 0) {
      matchedClusters.push({
        system: cluster.system,
        ayush_system: cluster.ayush_system,
        primary_diagnosis: cluster.primary_diagnosis,
        ayush_primary_diagnosis: cluster.ayush_primary_diagnosis,
        differential: cluster.differential,
        tests: cluster.tests,
        matchCount: count
      });
    }
  }

  // Sort clusters by highest match count
  matchedClusters.sort((a, b) => b.matchCount - a.matchCount);

  // 2. Extract Discrete Symptoms
  const symptoms: Array<{
    name: string;
    severity: 'mild' | 'moderate' | 'severe' | 'excruciating';
    anatomical_site: string;
  }> = [];

  const checkSymptom = (name: string, site: string, keywords: string[]) => {
    if (keywords.some(k => combinedText.includes(k))) {
      let sev: 'mild' | 'moderate' | 'severe' | 'excruciating' = 'moderate';
      if (
        combinedText.includes('unbearable') || 
        combinedText.includes('10/10') || 
        combinedText.includes('9/10') || 
        combinedText.includes('असहनीय') || 
        combinedText.includes('excruciating')
      ) {
        sev = 'excruciating';
      } else if (
        combinedText.includes('severe') || 
        combinedText.includes('8/10') || 
        combinedText.includes('7/10') || 
        combinedText.includes('बहुत तेज') || 
        combinedText.includes('तीव्र') ||
        combinedText.includes('तेज') ||
        combinedText.includes('भारी') ||
        combinedText.includes('high')
      ) {
        sev = 'severe';
      } else if (combinedText.includes('mild') || combinedText.includes('हल्का') || combinedText.includes('slight')) {
        sev = 'mild';
      }

      symptoms.push({ name, severity: sev, anatomical_site: site });
    }
  };

  checkSymptom('Chest Pain / Angina Discomfort', 'Anterior Thorax', ['chest pain', 'chest pressure', 'crushing', 'छाती', 'सीना', 'நெஞ்சு', 'हार्ट']);
  checkSymptom('Shortness of Breath (Dyspnea)', 'Pulmonary / Airway', ['breathless', 'shortness of breath', 'सांस', 'दम']);
  checkSymptom('Abdominal Pain / Cramping', 'Abdomen', ['stomach pain', 'abdominal pain', 'पेट दर्द', 'पोटदुखी', 'पेट']);
  checkSymptom('Cephalea / Headache', 'Cranial / Head', ['headache', 'migraine', 'सिरदर्द', 'डोकेदुखी', 'தலைவலி']);
  checkSymptom('Joint & Back Pain', 'Musculoskeletal', ['back pain', 'joint pain', 'knee pain', 'कमर दर्द', 'जोड़ों का दर्द']);
  checkSymptom('Pyrexia / Fever', 'Systemic', ['fever', 'chills', 'बुखार', 'ताप', 'காய்ச்சல்']);
  checkSymptom('Nausea / Vomiting', 'Upper GI', ['vomiting', 'nausea', 'उल्टी', 'जी मिचलाना']);
  checkSymptom('Acidity / Epigastric Burning', 'Epigastrium', ['acidity', 'burning', 'heartburn', 'एसिडिटी', 'जलन', 'खट्टी डकार']);

  // 3. Determine Overall Clinical Acuity
  let overallAcuity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'ROUTINE' = 'ROUTINE';
  const isExcruciating = symptoms.some(s => s.severity === 'excruciating');
  const isSevere = symptoms.some(s => s.severity === 'severe');
  const hasCardiac = combinedText.includes('chest pain') || combinedText.includes('heart') || combinedText.includes('छाती में दर्द');
  const hasNeuroCritical = combinedText.includes('loss of consciousness') || combinedText.includes('seizure') || combinedText.includes('facial droop') || combinedText.includes('बेहोश');
  const hasBleeding = combinedText.includes('vomiting blood') || combinedText.includes('heavy bleeding') || combinedText.includes('खून की उल्टी');

  if (isExcruciating || hasNeuroCritical || hasBleeding || (hasCardiac && isSevere)) {
    overallAcuity = 'CRITICAL';
  } else if (isSevere || hasCardiac) {
    overallAcuity = 'HIGH';
  } else if (symptoms.length > 0) {
    overallAcuity = 'MODERATE';
  }

  // 4. Build Provisional Diagnoses List
  const provisionalDiagnoses: VoiceDiagnosisAnalysis['provisional_diagnoses'] = [];
  const primaryCluster = matchedClusters[0] || {
    system: isAyurveda ? 'Samanya Pariksha (General AYUSH)' : 'General Clinical Evaluation',
    ayush_system: 'Samanya Pariksha (General AYUSH)',
    primary_diagnosis: isAyurveda ? 'Anirnita Lakshana (Undifferentiated Presentation)' : 'Undifferentiated Symptomatic Presentation',
    ayush_primary_diagnosis: 'Anirnita Lakshana (Undifferentiated Presentation)',
    differential: ['Acute Self-Limiting Symptom Complex', 'Early-Stage Outpatient Illness'],
    tests: ['Routine Outpatient Physical Examination', 'Vital Signs Monitoring (BP, Pulse, SpO2, Temp)']
  };

  const effectiveSystem = isAyurveda && primaryCluster.ayush_system ? primaryCluster.ayush_system : primaryCluster.system;
  const effectivePrimaryDiagnosis = isAyurveda && primaryCluster.ayush_primary_diagnosis ? primaryCluster.ayush_primary_diagnosis : primaryCluster.primary_diagnosis;

  // Add Primary Suspicion
  provisionalDiagnoses.push({
    name: effectivePrimaryDiagnosis,
    confidence: Math.min(0.95, 0.70 + (primaryCluster.matchCount || 1) * 0.08),
    acuity: overallAcuity,
    rationale: `Derived from patient vocal intake detailing: "${(transcriptText || '').substring(0, 120)}" with key indicators in ${effectiveSystem} system.`,
    system: effectiveSystem
  });

  // Add Top Differentials
  for (const diff of primaryCluster.differential.slice(0, 2)) {
    provisionalDiagnoses.push({
      name: isAyurveda ? `सापेक्ष निदान (Differential): ${diff}` : diff,
      confidence: 0.75,
      acuity: overallAcuity === 'CRITICAL' ? 'HIGH' : 'MODERATE',
      rationale: `Clinical differential to be evaluated by attending doctor.`,
      system: effectiveSystem
    });
  }

  // Secondary Cluster if available
  if (matchedClusters[1]) {
    const secondarySystem = isAyurveda && matchedClusters[1].ayush_system ? matchedClusters[1].ayush_system : matchedClusters[1].system;
    const secondaryDiagnosis = isAyurveda && matchedClusters[1].ayush_primary_diagnosis ? matchedClusters[1].ayush_primary_diagnosis : matchedClusters[1].primary_diagnosis;
    provisionalDiagnoses.push({
      name: secondaryDiagnosis,
      confidence: 0.65,
      acuity: 'MODERATE',
      rationale: `Co-existing symptomatic presentation documented in vocal intake.`,
      system: secondarySystem
    });
  }

  // 5. Synthesize Suggested Diagnostic Investigations
  const tests = Array.from(new Set([
    ...primaryCluster.tests,
    ...(matchedClusters[1]?.tests || [])
  ])).slice(0, 5);

  const impressionSummary = `Patient self-reported voice interview indicates ${overallAcuity.toLowerCase()} acuity ${effectiveSystem.toLowerCase()} complaints. Primary clinical consideration: ${effectivePrimaryDiagnosis}. Differential diagnoses include ${primaryCluster.differential.join(' and ')}.`;

  return {
    provisional_diagnoses: provisionalDiagnoses,
    detected_symptoms: symptoms,
    overall_acuity: overallAcuity,
    primary_system: effectiveSystem,
    clinical_impression_summary: impressionSummary,
    suggested_investigations: tests
  };
}
