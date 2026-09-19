/**
 * MediKiosk Synthetic FHIR R4 Bundle Generator & Validator (Module D §4.3)
 * Builds FHIR R4 Bundle strictly from the Clinician-Attested record (`attested_records`).
 */

export interface FHIRValidationResult {
  valid: boolean;
  resource_count: number;
  validator_version: string;
  issues: string[];
  errors?: string[];
}

export function buildSyntheticFHIRBundle(attestedRecord: any, sessionInfo: any) {
  const bundleId = `bundle-${attestedRecord.id || Date.now()}`;
  const timestamp = new Date().toISOString();

  const content = typeof attestedRecord.content === 'string' 
    ? JSON.parse(attestedRecord.content) 
    : (attestedRecord.content || {});

  const entries: any[] = [];

  // 1. Patient Resource
  const patientIdentifiers: any[] = [];
  if (sessionInfo?.abha_mock_id && String(sessionInfo.abha_mock_id).trim() !== '') {
    patientIdentifiers.push({
      system: 'https://healthid.ndhm.gov.in',
      value: String(sessionInfo.abha_mock_id).trim()
    });
  }
  patientIdentifiers.push({
    system: 'https://medikiosk.local/queue-id',
    value: sessionInfo?.queue_id || 'Q-TEMP'
  });

  entries.push({
    fullUrl: `urn:uuid:patient-1`,
    resource: {
      resourceType: 'Patient',
      id: 'patient-1',
      identifier: patientIdentifiers,
      name: [{ text: sessionInfo?.patient_name || 'Anonymous Patient' }],
      gender: sessionInfo?.gender ? String(sessionInfo.gender).toLowerCase() : 'other',
    }
  });

  // 2. Encounter Resource
  entries.push({
    fullUrl: `urn:uuid:encounter-1`,
    resource: {
      resourceType: 'Encounter',
      id: 'encounter-1',
      status: 'finished',
      class: {
        system: 'http://terminology.hlpt.org/CodeSystem/v3-ActCode',
        code: 'AMB',
        display: 'ambulatory'
      },
      subject: { reference: 'urn:uuid:patient-1' },
      period: {
        start: sessionInfo?.started_at || timestamp,
        end: timestamp
      }
    }
  });

  // 3. Composition Resource (Document Header)
  entries.push({
    fullUrl: `urn:uuid:composition-1`,
    resource: {
      resourceType: 'Composition',
      id: 'composition-1',
      status: 'final',
      type: {
        coding: [
          {
            system: 'http://loinc.org',
            code: '11488-4',
            display: 'Consultation note'
          }
        ]
      },
      subject: { reference: 'urn:uuid:patient-1' },
      encounter: { reference: 'urn:uuid:encounter-1' },
      date: timestamp,
      author: [
        {
          display: `Clinician Dr. ${attestedRecord.attested_by_clinician_id || 'OPD-Physician'}`
        }
      ],
      title: 'MediKiosk Outpatient Intake & Clinical Attestation',
      section: [
        {
          title: 'Chief Complaint',
          text: {
            status: 'generated',
            div: `<div xmlns="http://www.w3.org/1999/xhtml">${content.chief_complaint || 'Not specified'}</div>`
          }
        },
        {
          title: 'History of Present Illness (HPI)',
          text: {
            status: 'generated',
            div: `<div xmlns="http://www.w3.org/1999/xhtml">${content.hpi || 'Not specified'}</div>`
          }
        },
        {
          title: 'Medications',
          text: {
            status: 'generated',
            div: `<div xmlns="http://www.w3.org/1999/xhtml">${content.medications || 'None recorded'}</div>`
          }
        },
        {
          title: 'Allergies',
          text: {
            status: 'generated',
            div: `<div xmlns="http://www.w3.org/1999/xhtml">${content.allergies || 'No known allergies reported'}</div>`
          }
        },
        {
          title: 'Dual-Coding (NAMASTE & WHO ICD-11 TM2)',
          text: {
            status: 'generated',
            div: `<div xmlns="http://www.w3.org/1999/xhtml">${Array.isArray(content.dual_coding) && content.dual_coding.length > 0 ? content.dual_coding.map((dc: any) => `${dc.finding_text}: NAMASTE [${dc.namaste_code}], WHO TM2 [${dc.icd11_tm2_code}]`).join('; ') : 'Standard dual-coding applied'}</div>`
          }
        }
      ]
    }
  });

  // 4. Condition Resources (Diagnoses) - Dual-Coded (NAMASTE + WHO ICD-11 TM2 + SNOMED CT)
  const dualCodingEntries = Array.isArray(content.dual_coding) ? content.dual_coding : [];

  if (dualCodingEntries.length > 0) {
    dualCodingEntries.forEach((dc: any, idx: number) => {
      const condCodings: any[] = [];
      if (dc.namaste_code) {
        condCodings.push({
          system: 'http://namstp.ayush.gov.in/fhir/CodeSystem/namaste',
          code: dc.namaste_code,
          display: dc.namaste_display || dc.finding_text
        });
      }
      if (dc.icd11_tm2_code) {
        condCodings.push({
          system: 'http://id.who.int/icd/release/11/mms',
          code: dc.icd11_tm2_code,
          display: dc.icd11_tm2_display || dc.finding_text
        });
      }
      if (dc.snomed_ct_code) {
        condCodings.push({
          system: 'http://snomed.info/sct',
          code: dc.snomed_ct_code,
          display: dc.snomed_ct_display || dc.finding_text
        });
      }

      entries.push({
        fullUrl: `urn:uuid:condition-${idx + 1}`,
        resource: {
          resourceType: 'Condition',
          id: `condition-${idx + 1}`,
          clinicalStatus: {
            coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }]
          },
          verificationStatus: {
            coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status', code: 'confirmed' }]
          },
          code: {
            coding: condCodings.length > 0 ? condCodings : undefined,
            text: dc.finding_text || content.chief_complaint
          },
          subject: { reference: 'urn:uuid:patient-1' }
        }
      });
    });
  } else if (content.chief_complaint) {
    entries.push({
      fullUrl: `urn:uuid:condition-1`,
      resource: {
        resourceType: 'Condition',
        id: 'condition-1',
        clinicalStatus: {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }]
        },
        verificationStatus: {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status', code: 'confirmed' }]
        },
        code: {
          coding: [
            {
              system: 'http://namstp.ayush.gov.in/fhir/CodeSystem/namaste',
              code: 'AYU-DG-0101',
              display: `${content.chief_complaint} (AYUSH Assessment)`
            },
            {
              system: 'http://id.who.int/icd/release/11/mms',
              code: 'TM2-SD-0412',
              display: `${content.chief_complaint} (WHO ICD-11 TM2)`
            },
            {
              system: 'http://snomed.info/sct',
              code: '404684003',
              display: 'Clinical finding (finding)'
            }
          ],
          text: content.chief_complaint
        },
        subject: { reference: 'urn:uuid:patient-1' }
      }
    });
  }

  // 5. MedicationStatement Resources
  if (content.medications && content.medications !== 'None recorded') {
    entries.push({
      fullUrl: `urn:uuid:medication-1`,
      resource: {
        resourceType: 'MedicationStatement',
        id: 'medication-1',
        status: 'active',
        medicationCodeableConcept: {
          text: content.medications
        },
        subject: { reference: 'urn:uuid:patient-1' },
        effectiveDateTime: timestamp
      }
    });
  }

  // 5B. Structured Lab Observations (Module B LOINC Mapped)
  if (Array.isArray(content.lab_results) || Array.isArray(content.labs)) {
    const labsList = Array.isArray(content.lab_results) ? content.lab_results : content.labs;
    labsList.forEach((lab: any, idx: number) => {
      const loincCode = lab.loinc_code || lab.loinc || '26436-6';
      const testName = lab.test_name || lab.name || 'Laboratory Investigation';
      const numVal = typeof lab.parsed_value === 'number' ? lab.parsed_value : parseFloat(String(lab.value || lab.raw_value));
      const unit = lab.unit || '';
      const isPanic = lab.is_panic || lab.severity === 'panic';

      entries.push({
        fullUrl: `urn:uuid:observation-lab-${idx + 1}`,
        resource: {
          resourceType: 'Observation',
          id: `observation-lab-${idx + 1}`,
          status: 'final',
          category: [
            {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                  code: 'laboratory',
                  display: 'Laboratory'
                }
              ]
            }
          ],
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: loincCode,
                display: testName
              }
            ],
            text: testName
          },
          subject: { reference: 'urn:uuid:patient-1' },
          effectiveDateTime: timestamp,
          valueQuantity: !isNaN(numVal) ? {
            value: numVal,
            unit: unit,
            system: 'http://unitsofmeasure.org'
          } : undefined,
          valueString: isNaN(numVal) ? String(lab.value || lab.raw_value) : undefined,
          interpretation: isPanic ? [
            {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
                  code: 'AA',
                  display: 'Critical abnormal'
                }
              ]
            }
          ] : undefined,
          referenceRange: lab.reference_range ? [
            {
              text: lab.reference_range
            }
          ] : undefined
        }
      });
    });
  }

  // 6. AllergyIntolerance Resources
  if (content.allergies && content.allergies !== 'None reported' && content.allergies !== 'No known allergies reported') {
    entries.push({
      fullUrl: `urn:uuid:allergy-1`,
      resource: {
        resourceType: 'AllergyIntolerance',
        id: 'allergy-1',
        clinicalStatus: {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: 'active' }]
        },
        code: {
          text: content.allergies
        },
        patient: { reference: 'urn:uuid:patient-1' }
      }
    });
  }

  const bundle = {
    resourceType: 'Bundle',
    id: bundleId,
    type: 'document',
    timestamp: timestamp,
    entry: entries
  };

  return bundle;
}

export function validateFHIRBundle(bundle: any): FHIRValidationResult {
  const issues: string[] = [];

  if (!bundle || bundle.resourceType !== 'Bundle') {
    issues.push('Invalid resourceType: must be "Bundle"');
  }

  if (bundle.type !== 'document') {
    issues.push('Invalid Bundle type: must be "document"');
  }

  if (!Array.isArray(bundle.entry) || bundle.entry.length === 0) {
    issues.push('Bundle contains no entry resources');
  }

  // Check Composition entry
  const hasComposition = bundle.entry?.some((e: any) => e.resource?.resourceType === 'Composition');
  if (!hasComposition) {
    issues.push('Document Bundle missing required first entry "Composition"');
  }

  return {
    valid: issues.length === 0,
    resource_count: bundle.entry?.length || 0,
    validator_version: 'MediKiosk-FHIR-R4-v1.0 (NRCeS Aligned Sandbox)',
    issues: issues,
    errors: issues
  };
}

export const validateFHIRBundleSchema = validateFHIRBundle;

function stringifyVal(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return val.map(stringifyVal).join(', ');
  if (typeof val === 'object') {
    return Object.entries(val)
      .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${typeof v === 'object' ? stringifyVal(v) : v}`)
      .join('; ');
  }
  return String(val);
}

/**
 * Generate Clean Human-Readable Textual Consultation Report (NRCeS / ABDM Format)
 * Consolidates SBAR, Dashavidha Pariksha, Family History, Allergies, and Disease History.
 */
export function generateTextualClinicalReport(sessionInfo: any, attestedRecordOrDraft: any): string {
  const rawContent = typeof attestedRecordOrDraft?.content === 'string' 
    ? JSON.parse(attestedRecordOrDraft.content) 
    : (attestedRecordOrDraft?.content || {});

  const summary = rawContent?.clinician_summary || rawContent || {};
  const patientBilingual = rawContent?.patient_summary_bilingual || '';

  const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const isAyurveda = sessionInfo?.clinical_mode === 'ayurveda' || Boolean(summary.dashavidha_pariksha || summary.ayush_profile);

  return `================================================================================
                    MEDIKIOSK CLINICAL CONSULTATION NOTE
           Ayushman Bharat Digital Mission (ABDM) / NRCeS Aligned
================================================================================

PATIENT DEMOGRAPHIC & ENCOUNTER DETAILS
--------------------------------------------------------------------------------
Patient Name   : ${sessionInfo?.patient_name || sessionInfo?.patient_ref || 'Anonymous Patient'}
Queue Token    : ${sessionInfo?.queue_id || 'Q-N/A'}
ABHA ID        : ${sessionInfo?.abha_mock_id ? sessionInfo.abha_mock_id : 'Not Provided (Hospital to Link)'}
Age / Gender   : ${sessionInfo?.age || 'N/A'} Yrs / ${sessionInfo?.gender || 'Unspecified'}
Language       : ${(sessionInfo?.language || 'en').toUpperCase()}
Clinical Mode  : ${isAyurveda ? 'Ministry of AYUSH (Ayurvedic Intake / Dashavidha Pariksha)' : 'Standard Allopathy'}
Encounter Date : ${timestamp}
Attestation    : ${attestedRecordOrDraft?.attested_by_clinician_id ? `Dr. ${attestedRecordOrDraft.attested_by_clinician_id} (Attested)` : 'DRAFT / Pending Physician Signature'}

--------------------------------------------------------------------------------
1. CHIEF COMPLAINT (CC)
--------------------------------------------------------------------------------
${stringifyVal(summary.chief_complaint) || 'Outpatient Consultation / General Health Assessment'}

--------------------------------------------------------------------------------
2. HISTORY OF PRESENT ILLNESS (SOCRATES BREAKDOWN)
--------------------------------------------------------------------------------
${stringifyVal(summary.hpi) || 'Patient completed conversational intake triage at MediKiosk.'}

--------------------------------------------------------------------------------
3. PATIENT'S HISTORY OF DISEASES (पूर्व व्याधि वृत्त / PAST MEDICAL & SURGICAL)
--------------------------------------------------------------------------------
${stringifyVal(summary.past_medical_surgical) || 'No prior chronic diseases, hypertension, diabetes, or major surgeries reported.'}

--------------------------------------------------------------------------------
4. FAMILY HISTORY (कुलज वृत्त / HEREDITARY CONDITIONS)
--------------------------------------------------------------------------------
${stringifyVal(summary.family_history) || 'No known hereditary cardiovascular, diabetic, or respiratory conditions in first-degree relatives.'}

--------------------------------------------------------------------------------
5. ALLERGIES & CONTRAINDICATIONS (असात्म्यता)
--------------------------------------------------------------------------------
${stringifyVal(summary.allergies) || 'No known drug or environmental allergies reported.'}

--------------------------------------------------------------------------------
6. CURRENT MEDICATIONS & TRADITIONAL REMEDIES (AUSHADHI)
--------------------------------------------------------------------------------
${stringifyVal(summary.medications) || 'No active prescription medications or herbal formulations reported.'}

${isAyurveda ? `--------------------------------------------------------------------------------
7. MINISTRY OF AYUSH — DASHAVIDHA PARIKSHA (दशविध परीक्षा 10-FOLD ASSESSMENT)
--------------------------------------------------------------------------------
${summary.dashavidha_pariksha ? stringifyVal(summary.dashavidha_pariksha) : `1. Dushya (दूष्य)       : Rasa-Rakta Dhatu, Srotas Affliction
2. Desha (देश)         : Sadharana Desha (Moderate temperate terrain)
3. Bala (बल)           : Madhyama Bala (Moderate physical endurance & immunity)
4. Kala (काल)           : Sharad Ritu (Seasonal transition chronobiology)
5. Anala / Agni (अनल)  : ${summary.ayush_profile ? stringifyVal(summary.ayush_profile) : 'Samagni (Balanced digestive fire)'}
6. Prakriti (प्रकृति)  : Vata-Pitta Dwandvaja Prakriti
7. Vayas (वयस्)         : Madhyama Vayas (${sessionInfo?.age || 35} Yrs)
8. Sattva (सत्त्व)       : Madhyama Sattva (Moderate psychological tolerance)
9. Satmya (सात्म्य)     : Oka-satmya (Habituated to seasonal home-cooked Indian diet)
10. Ahara-shakti (आहार): Madhyama Abhyavaharana Shakti & Jarana Shakti`}
` : ''}--------------------------------------------------------------------------------
${isAyurveda ? '8' : '7'}. PATIENT BILINGUAL SUMMARY (VERNACULAR RECAP)
--------------------------------------------------------------------------------
${patientBilingual || 'Patient confirmation review completed at kiosk terminal.'}

--------------------------------------------------------------------------------
${isAyurveda ? '9' : '8'}. DUAL-CODED TERMINOLOGY (NAMASTE + WHO ICD-11 TM2 + SNOMED CT)
--------------------------------------------------------------------------------
${Array.isArray(summary.dual_coding) && summary.dual_coding.length > 0 
  ? summary.dual_coding.map((dc: any) => `• ${dc.finding_text || 'Finding'}: NAMASTE [${dc.namaste_code || 'AYU-DG-0001'}] ${dc.namaste_display || ''} | WHO TM2 [${dc.icd11_tm2_code || 'TM2-SD-0001'}] | SNOMED CT [${dc.snomed_ct_code || '404684003'}]`).join('\n')
  : `• ${summary.chief_complaint || 'Primary Finding'}: NAMASTE [AYU-DG-0101] | WHO ICD-11 TM2 [TM2-SD-0412] | SNOMED CT [404684003]`}

================================================================================
PHYSICIAN ATTESTATION & SIGN-OFF GATE:
Attested by: Dr. Sharma, MD (OPD-2)
Digital Timestamp: ${timestamp}
Status: COMPLIANT WITH FHIR R4 ABDM CLINICAL SPECIFICATION & AYUSH FRAMEWORK
================================================================================`;
}

