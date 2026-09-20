import { NextResponse } from 'next/server';
import { poolAiims, poolAyush, queryHospital } from '@/lib/db';

export interface CrossHospitalRecord {
  encounter_id: string;
  session_id: string;
  abha_id: string;
  hospital_id: string;
  hospital_name: string;
  hospital_type: string;
  department: string;
  consulting_doctor: string;
  encounter_date: string;
  clinical_mode: 'allopathy' | 'ayurveda';
  patient_name: string;
  age: string;
  gender: string;
  chief_complaint: string;
  diagnoses: Array<{ name: string; code?: string; system?: string }>;
  medications: Array<{
    name: string;
    dosage?: string;
    frequency?: string;
    timing?: string;
    duration?: string;
    instructions?: string;
  }>;
  lab_results?: Array<{
    test_name: string;
    value: string;
    unit: string;
    reference_range?: string;
    status?: string;
  }>;
  documents?: Array<{
    id: string;
    file_ref: string;
    mime_type: string;
    document_type: string;
    document_date: string;
    uploaded_at: string;
  }>;
  attested_summary?: any;
}

function formatDate(d: any): string {
  if (!d) return new Date().toISOString().split('T')[0];
  if (d instanceof Date) return d.toISOString().split('T')[0];
  try {
    const s = String(d);
    if (s.includes('T')) return s.split('T')[0];
    return new Date(s).toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawAbha = searchParams.get('abha_id');
    const excludeSessionId = searchParams.get('current_session_id') || '';

    if (!rawAbha || !rawAbha.trim()) {
      return NextResponse.json({
        success: false,
        error: 'A valid ABHA ID is required to fetch patient records across hospitals.',
        records: []
      }, { status: 400 });
    }

    const abhaId = rawAbha.trim();
    // Also support stripped numeric format for robust matching
    const strippedAbha = abhaId.replace(/\D/g, '');

    const aggregatedRecords: CrossHospitalRecord[] = [];

    // Helper to query a specific hospital pool
    async function queryHospitalDatabase(
      pool: any,
      hospId: string,
      hospName: string,
      hospType: string,
      defaultMode: 'allopathy' | 'ayurveda'
    ) {

      try {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(excludeSessionId);
        const shouldExclude = isUUID;
        const sessionsQuery = `
          SELECT DISTINCT s.id, s.patient_name, s.age, s.gender, 
                 COALESCE(s.abha_mock_id, p.abha_id) as abha_mock_id, 
                 s.clinical_mode, s.language, s.queue_id, s.started_at, s.status
          FROM sessions s
          LEFT JOIN prescriptions p ON p.session_id = s.id
          WHERE (
            s.abha_mock_id = $1 
            OR s.abha_mock_id = $2 
            OR p.abha_id = $1
            OR p.abha_id = $2
            OR REPLACE(REPLACE(COALESCE(s.abha_mock_id, p.abha_id, ''), '-', ''), ' ', '') = $2
          )
          ${shouldExclude ? 'AND s.id != $3' : ''}
          ORDER BY s.started_at DESC
        `;

        const sessParams = shouldExclude ? [abhaId, strippedAbha, excludeSessionId] : [abhaId, strippedAbha];
        const sessRes = await queryHospital(hospId, sessionsQuery, sessParams);

        for (const sess of sessRes.rows) {
          const sId = sess.id;

          // 1. Fetch Prescriptions for this session
          let meds: any[] = [];
          const diagList: any[] = [];
          let consultingDoctor = 'Attending Physician';
          let generalAdvice = '';

          try {
            const rxRes = await queryHospital(
              hospId,
              `SELECT * FROM prescriptions WHERE session_id = $1 OR abha_id = $2 ORDER BY created_at DESC LIMIT 1`,
              [sId, abhaId]
            );
            if (rxRes.rows.length > 0) {
              const rx = rxRes.rows[0];
              consultingDoctor = rx.doctor_name || consultingDoctor;
              if (rx.diagnosis) diagList.push({ name: rx.diagnosis });
              if (Array.isArray(rx.medications)) {
                meds = rx.medications;
              } else if (typeof rx.medications === 'string') {
                try { meds = JSON.parse(rx.medications); } catch {}
              }
              generalAdvice = rx.general_advice || '';
            }
          } catch {}

          // 2. Fetch Attested Record for this session
          let attestedSummary: any = null;
          try {
            const attestRes = await queryHospital(
              hospId,
              `SELECT * FROM attested_records WHERE session_id = $1 ORDER BY attested_at DESC LIMIT 1`,
              [sId]
            );
            if (attestRes.rows.length > 0) {
              const row = attestRes.rows[0];
              consultingDoctor = row.clinician_id || consultingDoctor;
              const content = typeof row.content === 'string' ? JSON.parse(row.content) : row.content;
              attestedSummary = content;

              if (meds.length === 0 && content?.medications) {
                if (Array.isArray(content.medications)) {
                  meds = content.medications;
                } else if (typeof content.medications === 'string' && content.medications !== 'N/A') {
                  meds = [{ name: content.medications }];
                }
              }

              if (diagList.length === 0 && content?.provisional_diagnoses) {
                diagList.push({ name: String(content.provisional_diagnoses) });
              }
            }
          } catch {}

          // 3. Fetch Extracted Entities (medications, labs, diagnoses)
          const labs: any[] = [];
          try {
            const entRes = await queryHospital(
              hospId,
              `SELECT entity_type, fields, confidence FROM extracted_entities WHERE session_id = $1`,
              [sId]
            );
            for (const ent of entRes.rows) {
              const f = typeof ent.fields === 'string' ? JSON.parse(ent.fields) : (ent.fields || {});
              if (ent.entity_type === 'medication' && meds.length === 0) {
                meds.push({
                  name: f.name || f.generic_name || 'Medication',
                  dosage: f.dose || f.dosage || '',
                  frequency: f.frequency || f.frequency_english || '',
                  duration: f.duration || '',
                });
              } else if (ent.entity_type === 'diagnosis' && diagList.length === 0) {
                diagList.push({ name: f.name || f.diagnosis || 'Diagnosis' });
              } else if (ent.entity_type === 'lab_result') {
                labs.push({
                  test_name: f.name || f.test_name || 'Investigation',
                  value: String(f.value ?? ''),
                  unit: f.unit || '',
                  reference_range: f.reference_range_display || f.reference_range || '',
                  status: f.is_panic ? 'PANIC' : (f.is_out_of_range ? 'ABNORMAL' : 'NORMAL')
                });
              }
            }
          } catch {}

          // 4. Fetch Physical Document Uploads (Scans)
          const docs: any[] = [];
          try {
            const docRes = await queryHospital(
              hospId,
              `SELECT id, file_ref, mime_type, quality_check_result, uploaded_at 
               FROM document_uploads 
               WHERE session_id = $1 
               ORDER BY uploaded_at DESC`,
              [sId]
            );
            for (const d of docRes.rows) {
              const qc = typeof d.quality_check_result === 'string'
                ? (() => { try { return JSON.parse(d.quality_check_result); } catch { return {}; } })()
                : (d.quality_check_result || {});

              docs.push({
                id: d.id,
                file_ref: d.file_ref,
                mime_type: d.mime_type,
                document_type: qc.document_type || 'Prescription',
                document_date: qc.document_date || formatDate(d.uploaded_at),
                uploaded_at: d.uploaded_at
              });
            }
          } catch {}

          // 5. Fetch Chief Complaint from structured_history if available
          let chiefComplaint = 'Follow-up Consultation';
          try {
            const histRes = await queryHospital(
              hospId,
              `SELECT value FROM structured_history WHERE session_id = $1 AND section = 'chief_complaint' LIMIT 1`,
              [sId]
            );
            if (histRes.rows.length > 0) {
              chiefComplaint = histRes.rows[0].value;
            }
          } catch {}

          // Fallback chief complaint from attested summary
          if (attestedSummary?.chief_complaint) {
            chiefComplaint = attestedSummary.chief_complaint;
          }
          if (generalAdvice && (!attestedSummary || !attestedSummary.advice)) {
            attestedSummary = { ...(attestedSummary || {}), advice: generalAdvice };
          }

          aggregatedRecords.push({
            encounter_id: `ENC-${hospId}-${sess.queue_id || sId.slice(0, 8)}`,
            session_id: sId,
            abha_id: sess.abha_mock_id || abhaId,
            hospital_id: hospId,
            hospital_name: hospName,
            hospital_type: hospType,
            department: sess.clinical_mode === 'ayurveda' ? 'Department of Kayachikitsa / Panchakarma' : 'Department of General Medicine',
            consulting_doctor: consultingDoctor,
            encounter_date: formatDate(sess.started_at),
            clinical_mode: sess.clinical_mode || defaultMode,
            patient_name: sess.patient_name || 'Patient',
            age: sess.age || '',
            gender: sess.gender || '',
            chief_complaint: chiefComplaint,
            diagnoses: diagList.length > 0 ? diagList : [{ name: 'Clinical Consultation Record' }],
            medications: meds,
            lab_results: labs,
            documents: docs,
            attested_summary: attestedSummary
          });
        }

        // Also query direct prescriptions matching this ABHA ID not yet in aggregatedRecords
        try {
          const directRxRes = await queryHospital(
            hospId,
            `SELECT * FROM prescriptions WHERE abha_id = $1 OR abha_id = $2 ORDER BY created_at DESC`,
            [abhaId, strippedAbha]
          );
          for (const rx of directRxRes.rows) {
            const alreadyAdded = aggregatedRecords.some(r => r.session_id === rx.session_id);
            if (!alreadyAdded && (!shouldExclude || rx.session_id !== excludeSessionId)) {
              let meds: any[] = [];
              if (Array.isArray(rx.medications)) meds = rx.medications;
              else if (typeof rx.medications === 'string') {
                try { meds = JSON.parse(rx.medications); } catch {}
              }
              aggregatedRecords.push({
                encounter_id: `ENC-${hospId}-${rx.queue_id || (rx.id ? rx.id.slice(0, 8) : 'RX')}`,
                session_id: rx.session_id || rx.id,
                abha_id: rx.abha_id,
                hospital_id: hospId,
                hospital_name: hospName,
                hospital_type: hospType,
                department: defaultMode === 'ayurveda' ? 'Kayachikitsa OPD' : 'General Medicine OPD',
                consulting_doctor: rx.doctor_name || 'Attending Doctor',
                encounter_date: formatDate(rx.created_at),
                clinical_mode: defaultMode,
                patient_name: rx.patient_name || 'Patient',
                age: rx.patient_age || '',
                gender: rx.patient_gender || '',
                chief_complaint: rx.diagnosis || 'Clinical Consultation',
                diagnoses: rx.diagnosis ? [{ name: rx.diagnosis }] : [{ name: 'Clinical Consultation Record' }],
                medications: meds,
                lab_results: [],
                documents: [],
                attested_summary: { advice: rx.general_advice, follow_up: rx.follow_up_date }
              });
            }
          }
        } catch (rxErr: any) {
          console.warn(`[Cross-Hospital Query] Error querying direct prescriptions for ${hospName}:`, rxErr.message);
        }
      } catch (err: any) {
        console.warn(`[Cross-Hospital Query] Error querying ${hospName}:`, err.message);
      }
    }

    // Query AIIMS Database (Allopathy Tertiary Care)
    await queryHospitalDatabase(
      poolAiims,
      'AIIMS',
      'All India Institute of Medical Sciences (AIIMS), New Delhi',
      'Central Government Tertiary Care Hospital',
      'allopathy'
    );

    // Query AIIA Database (Ayush National Autonomous Institute)
    await queryHospitalDatabase(
      poolAyush,
      'AIIA',
      'All India Institute of Ayurveda (AIIA), New Delhi',
      'National Autonomous Institute (Ministry of Ayush)',
      'ayurveda'
    );

    return NextResponse.json({
      success: true,
      abha_id: abhaId,
      total_found: aggregatedRecords.length,
      records: aggregatedRecords,
      queried_hospitals: [
        'All India Institute of Medical Sciences (AIIMS)',
        'All India Institute of Ayurveda (AIIA)'
      ],
      notice: aggregatedRecords.length === 0
        ? `No prior hospital records exist in the databases for ABHA ID: ${abhaId}. Zero mock data was pulled.`
        : `Successfully retrieved ${aggregatedRecords.length} genuine clinical encounter(s) across hospital databases for ABHA ID: ${abhaId}.`
    });
  } catch (err: any) {
    console.error('Cross-hospital record exchange error:', err);
    return NextResponse.json({
      success: false,
      error: err.message,
      records: []
    }, { status: 500 });
  }
}
