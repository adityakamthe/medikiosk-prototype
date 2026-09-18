import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { buildSyntheticFHIRBundle, validateFHIRBundleSchema, generateTextualClinicalReport } from '@/lib/fhir';

async function handleFHIRGeneration(sessionId: string) {
  // 1. Fetch session record
  const sessionRes = await query(`SELECT * FROM sessions WHERE id = $1`, [sessionId]);
  if (sessionRes.rows.length === 0) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }
  const session = sessionRes.rows[0];

  // 2. Fetch attested record if available
  const attestRes = await query(
    `SELECT * FROM attested_records WHERE session_id = $1 ORDER BY attested_at DESC LIMIT 1`,
    [sessionId]
  );
  const attestedRecord = attestRes.rows[0] || null;

  // 3. If not attested, get latest draft summary for preview
  let recordToBundle = attestedRecord;
  if (!recordToBundle) {
    const draftRes = await query(
      `SELECT * FROM draft_summaries WHERE session_id = $1 ORDER BY generated_at DESC LIMIT 1`,
      [sessionId]
    );
    if (draftRes.rows.length > 0) {
      recordToBundle = {
        id: `draft_${sessionId}`,
        session_id: sessionId,
        attested_by_clinician_id: 'Draft (Pending Physician Attestation)',
        content: draftRes.rows[0].content
      };
    } else {
      recordToBundle = {
        id: `draft_${sessionId}`,
        session_id: sessionId,
        attested_by_clinician_id: 'Draft',
        content: {
          clinician_summary: {
            chief_complaint: 'Intake in progress',
            hpi: 'Patient interview conducted at MediKiosk.'
          }
        }
      };
    }
  }

  // 4. Generate synthetic FHIR R4 Bundle with correct argument order: (record, session)
  const fhirBundle = buildSyntheticFHIRBundle(recordToBundle, session);

  // 5. Generate human-readable Textual Clinical Report
  const textReport = generateTextualClinicalReport(session, recordToBundle);

  // 6. Validate FHIR Bundle Schema
  const validation = validateFHIRBundleSchema(fhirBundle);

  // 7. If attested, persist into fhir_bundles table
  let bundleDbId = null;
  if (attestedRecord) {
    try {
      const bundleRes = await query(
        `INSERT INTO fhir_bundles (session_id, attested_record_id, bundle_type, bundle_json, validation_status)
         VALUES ($1, $2, 'document', $3, $4)
         RETURNING *`,
        [sessionId, attestedRecord.id, JSON.stringify(fhirBundle), validation.valid ? 'valid' : 'invalid']
      );
      bundleDbId = bundleRes.rows[0]?.id;
    } catch (e: any) {
      console.warn('fhir_bundles insert notice:', e.message);
    }
  }

  return NextResponse.json({
    success: true,
    is_attested: Boolean(attestedRecord),
    bundle: fhirBundle,
    text_report: textReport,
    validation,
    record_id: bundleDbId
  });
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    return await handleFHIRGeneration(resolvedParams.id);
  } catch (err: any) {
    console.error('Error generating FHIR bundle (GET):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    return await handleFHIRGeneration(resolvedParams.id);
  } catch (err: any) {
    console.error('Error generating FHIR bundle (POST):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
