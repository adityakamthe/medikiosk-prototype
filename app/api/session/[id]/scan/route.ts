import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { extractDocumentEntitiesFromBase64, generateBilingualSummary } from '@/lib/mistral';
import {
  preprocessDocumentImage,
  matchCDSCO,
  translateVernacularSigText,
  evaluateLabResults,
  auditMedicationSafety,
} from '@/lib/module_b_client';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const rawSessionId = resolvedParams.id;
    const formData = await req.formData();
    const file = formData.get('file') as Blob | null;

    if (!file) {
      return NextResponse.json({ error: 'No document file uploaded' }, { status: 400 });
    }

    const mimeType = file.type || 'image/jpeg';
    const buffer = Buffer.from(await file.arrayBuffer());
    const origBase64 = buffer.toString('base64');

    // Resolve or create a valid UUID session
    let sessionId = rawSessionId;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawSessionId);
    try {
      if (!isUUID) {
        const findSession = await query(`SELECT id FROM sessions WHERE queue_id = $1 LIMIT 1`, [rawSessionId]);
        if (findSession.rows.length > 0) {
          sessionId = findSession.rows[0].id;
        } else {
          const newSession = await query(
            `INSERT INTO sessions (language, queue_id, patient_ref, status)
             VALUES ('hi', $1, 'PATIENT_SCAN', 'in_progress')
             RETURNING id`,
            [rawSessionId]
          );
          sessionId = newSession.rows[0].id;
        }
      } else {
        const check = await query(`SELECT id FROM sessions WHERE id = $1`, [sessionId]);
        if (check.rows.length === 0) {
          await query(
            `INSERT INTO sessions (id, language, queue_id, patient_ref, status)
             VALUES ($1, 'hi', 'Q-SCAN', 'PATIENT_SCAN', 'in_progress')
             ON CONFLICT (id) DO NOTHING`,
            [sessionId]
          );
        }
      }
    } catch (sessionErr: any) {
      console.warn('Session verification notice in scan route:', sessionErr.message);
    }

    // -------------------------------------------------------------
    // STAGE 1: OpenCV Perspective Correction & Shadow Normalization
    // -------------------------------------------------------------
    const preprocessRes = await preprocessDocumentImage(origBase64, true, true, true);
    let effectiveMime = mimeType;
    let imageForVision = origBase64;
    if (preprocessRes.success && preprocessRes.base64_jpeg) {
      imageForVision = preprocessRes.base64_jpeg;
      effectiveMime = 'image/jpeg';
    }

    // 1. Fetch patient's prior interview context from structured_history
    let patientContext: any[] = [];
    try {
      const historyRes = await query(
        `SELECT section, field_name, value FROM structured_history WHERE session_id = $1 ORDER BY id ASC`,
        [sessionId]
      );
      patientContext = historyRes.rows;
    } catch {}

    const lineCrops = preprocessRes.line_strips || [];

    // -------------------------------------------------------------
    // STAGE 2 & 3: Vision-Language Entity Extraction
    // -------------------------------------------------------------
    let extractedData = await extractDocumentEntitiesFromBase64(imageForVision, effectiveMime, patientContext, lineCrops);

    // If preprocessed image yielded no medications/labs, fallback to pristine original image buffer
    const hasEntities = (extractedData.medications && extractedData.medications.length > 0) ||
                        (extractedData.lab_values && extractedData.lab_values.length > 0) ||
                        (extractedData.diagnoses && extractedData.diagnoses.length > 0);
    if (!hasEntities && imageForVision !== origBase64) {
      try {
        const retryData = await extractDocumentEntitiesFromBase64(origBase64, mimeType, patientContext, lineCrops);
        if ((retryData.medications && retryData.medications.length > 0) ||
            (retryData.lab_values && retryData.lab_values.length > 0) ||
            (retryData.diagnoses && retryData.diagnoses.length > 0)) {
          extractedData = retryData;
        }
      } catch (retryErr) {
        console.warn('Fallback vision extraction notice:', retryErr);
      }
    }

    const isReadable = extractedData.is_readable !== false;
    const qualityResult = isReadable ? 'PASSED' : 'FAILED_UNREADABLE';

    // Record document upload entry in Patient Evidence Layer
    let docUploadId = null;
    try {
      const docRes = await query(
        `INSERT INTO document_uploads (session_id, file_ref, mime_type, quality_check_result)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [sessionId, `ram_buffer_${Date.now()}`, effectiveMime, JSON.stringify({ status: qualityResult, quality: preprocessRes.quality_assessment })]
      );
      docUploadId = docRes.rows[0]?.id;
    } catch {
      try {
        const docRes = await query(
          `INSERT INTO document_uploads (session_id, file_ref, mime_type, quality_check_result)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [sessionId, `ram_buffer_${Date.now()}`, effectiveMime, JSON.stringify({ status: qualityResult })]
        );
        docUploadId = docRes.rows[0]?.id;
      } catch (e: any) {
        console.warn('document_uploads insert notice:', e.message);
      }
    }

    const entityInserts = [];

    // Save diagnoses
    if (extractedData.diagnoses && Array.isArray(extractedData.diagnoses)) {
      for (const diag of extractedData.diagnoses) {
        const diagName = typeof diag === 'string' ? diag : (diag.name || JSON.stringify(diag));
        const confidence = typeof diag?.confidence === 'number' ? diag.confidence : 0.90;
        const needsVerification = confidence < 0.70;
        const fieldsObj = typeof diag === 'object' && diag !== null ? diag : { name: diagName };

        try {
          const res = await query(
            `INSERT INTO extracted_entities (session_id, document_upload_id, entity_type, confidence, needs_verification, fields)
             VALUES ($1, $2, 'diagnosis', $3, $4, $5::jsonb)
             RETURNING *`,
            [sessionId, docUploadId, confidence, needsVerification, JSON.stringify(fieldsObj)]
          );
          entityInserts.push(res.rows[0]);
        } catch (e: any) {
          console.warn('Diagnosis entity insert notice:', e.message);
        }
      }
    }

    // -------------------------------------------------------------
    // STAGE 4: CDSCO Formulary & Vernacular Translation Normalization
    // -------------------------------------------------------------
    const normalizedMedications: any[] = [];
    const medsSource = extractedData.medications || extractedData.prescriptions || extractedData.drugs || [];
    const medsList = Array.isArray(medsSource) 
      ? medsSource 
      : (typeof medsSource === 'object' && medsSource !== null ? Object.values(medsSource) : []);

    if (medsList.length > 0) {
      for (const med of medsList) {
        const medName = typeof med === 'string' ? med : (med.name || med.medication || JSON.stringify(med));
        const rawFrequency = typeof med === 'object' && med?.frequency ? med.frequency : '';

        const verbalContextText = patientContext
          .map((c) => `${c.section || ''} ${c.field_name || ''} ${typeof c.value === 'string' ? c.value : JSON.stringify(c.value || '')}`)
          .join(' ');

        // Match against CDSCO Master Formulary with verbal context anchoring
        const cdscoMatch = await matchCDSCO(medName, verbalContextText);
        // Translate any vernacular instruction
        const sigTrans = await translateVernacularSigText(rawFrequency);

        const confidence = typeof med?.confidence === 'number' ? med.confidence : 0.90;
        const needsVerification = cdscoMatch.verification_status === 'requires_verification' || confidence < 0.70;

        const enrichedFields = {
          ...(typeof med === 'object' && med !== null ? med : { name: medName }),
          name: medName,
          normalized_generic: cdscoMatch.formulary_entry?.generic_name || null,
          rxcui: cdscoMatch.formulary_entry?.rxcui || null,
          cdsco_match: cdscoMatch.matched,
          cdsco_status: cdscoMatch.verification_status,
          cdsco_category: cdscoMatch.formulary_entry?.category || null,
          active_ingredients: cdscoMatch.formulary_entry?.active_ingredients || [],
          frequency_english: sigTrans.translated_text,
          vernacular_translated: sigTrans.was_translated,
        };

        normalizedMedications.push(enrichedFields);

        try {
          const res = await query(
            `INSERT INTO extracted_entities (session_id, document_upload_id, entity_type, confidence, needs_verification, fields)
             VALUES ($1, $2, 'medication', $3, $4, $5::jsonb)
             RETURNING *`,
            [sessionId, docUploadId, confidence, needsVerification, JSON.stringify(enrichedFields)]
          );
          entityInserts.push(res.rows[0]);
        } catch (e: any) {
          console.warn('Medication entity insert notice:', e.message);
        }
      }
    }

    // -------------------------------------------------------------
    // STAGE 6A: Quantitative Lab Out-of-Range & LOINC Evaluation
    // -------------------------------------------------------------
    const rawLabs: Array<{ name: string; value: any; unit?: string }> = [];
    const labsSource = extractedData.lab_values || extractedData.investigations || extractedData.labs;

    if (Array.isArray(labsSource)) {
      labsSource.forEach((l: any) => {
        rawLabs.push({
          name: typeof l === 'string' ? l : (l.name || l.test || 'Lab Test'),
          value: typeof l === 'object' ? (l.value ?? '') : '',
          unit: typeof l === 'object' ? (l.unit ?? '') : '',
        });
      });
    } else if (typeof labsSource === 'object' && labsSource !== null) {
      Object.entries(labsSource).forEach(([k, v]: [string, any]) => {
        rawLabs.push({
          name: k.replace(/_/g, ' '),
          value: typeof v === 'object' && v !== null ? (v.value ?? '') : v,
          unit: typeof v === 'object' && v !== null ? (v.unit ?? '') : '',
        });
      });
    }

    const labEvaluation = await evaluateLabResults(rawLabs);

    if (labEvaluation.results && labEvaluation.results.length > 0) {
      for (const labRes of labEvaluation.results) {
        const confidence = 0.95;
        const needsVerification = labRes.is_panic;

        try {
          const res = await query(
            `INSERT INTO extracted_entities (session_id, document_upload_id, entity_type, confidence, needs_verification, fields)
             VALUES ($1, $2, 'lab_result', $3, $4, $5::jsonb)
             RETURNING *`,
            [sessionId, docUploadId, confidence, needsVerification, JSON.stringify(labRes)]
          );
          entityInserts.push(res.rows[0]);
        } catch (e: any) {
          console.warn('Lab value entity insert notice:', e.message);
        }
      }
    }

    // -------------------------------------------------------------
    // STAGE 6B: Pharmacological Safety & DDI Engine
    // -------------------------------------------------------------
    const safetyAudit = await auditMedicationSafety(normalizedMedications);

    if (safetyAudit.alerts && safetyAudit.alerts.length > 0) {
      for (const alert of safetyAudit.alerts) {
        try {
          await query(
            `INSERT INTO extracted_entities (session_id, document_upload_id, entity_type, confidence, needs_verification, fields)
             VALUES ($1, $2, 'safety_alert', 1.0, true, $3::jsonb)`,
            [sessionId, docUploadId, JSON.stringify(alert)]
          );
        } catch (e: any) {
          console.warn('Safety alert entity insert notice:', e.message);
        }
      }
    }

    // Save key findings or clinical notes
    if (extractedData.key_findings) {
      const noteStr = typeof extractedData.key_findings === 'string' ? extractedData.key_findings : JSON.stringify(extractedData.key_findings);
      try {
        await query(
          `INSERT INTO extracted_entities (session_id, document_upload_id, entity_type, confidence, needs_verification, fields)
           VALUES ($1, $2, 'clinical_note', 0.95, false, $3::jsonb)`,
          [sessionId, docUploadId, JSON.stringify({ note: noteStr, doctor: extractedData.doctor_or_hospital || 'Doctor' })]
        );
      } catch (e: any) {
        console.warn('Clinical note entity insert notice:', e.message);
      }
    }

    // Save AYUSH remedies or traditional formulations
    if (extractedData.ayush_remedies && Array.isArray(extractedData.ayush_remedies)) {
      for (const remedy of extractedData.ayush_remedies) {
        const remName = typeof remedy === 'string' ? remedy : (remedy.name || JSON.stringify(remedy));
        const confidence = typeof remedy?.confidence === 'number' ? remedy.confidence : 0.90;
        const fieldsObj = typeof remedy === 'object' && remedy !== null ? remedy : { name: remName };

        try {
          const res = await query(
            `INSERT INTO extracted_entities (session_id, document_upload_id, entity_type, confidence, needs_verification, fields)
             VALUES ($1, $2, 'ayush_remedy', $3, false, $4::jsonb)
             RETURNING *`,
            [sessionId, docUploadId, confidence, JSON.stringify(fieldsObj)]
          );
          entityInserts.push(res.rows[0]);
        } catch (e: any) {
          console.warn('AYUSH remedy entity insert notice:', e.message);
        }
      }
    }

    // 5. Automatically refresh the bilingual clinical summary with the newly extracted evidence
    try {
      const allEntitiesRes = await query(`SELECT * FROM extracted_entities WHERE session_id = $1`, [sessionId]);
      const sessionInfo = await query(`SELECT language, clinical_mode FROM sessions WHERE id = $1`, [sessionId]);
      const lang = sessionInfo.rows[0]?.language || 'hi';
      const clinicalMode = sessionInfo.rows[0]?.clinical_mode || 'allopathy';

      const summaryJSON = await generateBilingualSummary(patientContext, allEntitiesRes.rows, lang, clinicalMode);
      const inputHash = `hash_${Date.now()}_scan`;

      await query(
        `INSERT INTO draft_summaries (session_id, model_name, model_version, prompt_version, content, input_hash)
         VALUES ($1, 'mistral-small-latest', 'v1.0', 'p1.0', $2, $3)`,
        [sessionId, JSON.stringify(summaryJSON), inputHash]
      );
    } catch (sumErr: any) {
      console.warn('Summary auto-refresh notice after scan:', sumErr.message);
    }

    return NextResponse.json({
      success: true,
      quality_assessment: preprocessRes.quality_assessment,
      was_dewarped: preprocessRes.was_dewarped,
      sharpness_score: preprocessRes.sharpness_score,
      doc_id: docUploadId,
      raw_extraction: extractedData,
      saved_entities: entityInserts,
      cdsco_normalized_medications: normalizedMedications,
      evaluated_labs: labEvaluation,
      safety_audit: safetyAudit,
    });
  } catch (err: any) {
    console.error('Error during document scanning:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
