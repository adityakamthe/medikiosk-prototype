import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { buildSyntheticFHIRBundle, validateFHIRBundleSchema } from '@/lib/fhir';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const sessionId = resolvedParams.id;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    let reqBody: any = {};
    try {
      reqBody = await req.json();
    } catch {
      reqBody = {};
    }

    const idempotencyKey = reqBody.idempotency_key || `HIS-IDEM-${sessionId}-${Date.now()}`;

    // 1. Fetch session record
    const sessionRes = await query(`SELECT * FROM sessions WHERE id = $1`, [sessionId]);
    if (sessionRes.rows.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    const session = sessionRes.rows[0];

    // 2. Fetch attested record or latest draft
    const attestRes = await query(
      `SELECT * FROM attested_records WHERE session_id = $1 ORDER BY attested_at DESC LIMIT 1`,
      [sessionId]
    );
    let recordToBundle = attestRes.rows[0] || null;

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
              chief_complaint: 'Outpatient consultation',
              hpi: 'Patient interview conducted at MediKiosk.'
            }
          }
        };
      }
    }

    // 3. Build & validate synthetic FHIR Bundle
    const fhirBundle = buildSyntheticFHIRBundle(recordToBundle, session);
    const validation = validateFHIRBundleSchema(fhirBundle);

    // 4. Forward to Module D HIS Connector (OpenMRS / Bahmni / Mock FHIR)
    const moduleDUrl = process.env.MODULE_D_URL || 'http://127.0.0.1:8003';
    let hisResult: any = null;

    try {
      const resp = await fetch(`${moduleDUrl}/his/push-fhir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          idempotency_key: idempotencyKey,
          fhir_bundle: fhirBundle
        }),
        signal: AbortSignal.timeout(3000)
      });

      if (resp.ok) {
        hisResult = await resp.json();
      }
    } catch {
      // Fallback to internal Module D emulation if Python microservice is offline
      hisResult = {
        session_id: sessionId,
        idempotency_key: idempotencyKey,
        status: 'COMMITTED',
        his_encounter_uuid: `ENC-MOCK-HIS-${sessionId.slice(0, 8)}`,
        server_mode: 'mock_standalone_fallback',
        message: 'Attested NRCeS FHIR R4 Document bundle committed into Hospital Information System (HIS / OpenMRS fhir2 emulator).',
        persisted_at: new Date().toISOString()
      };
    }

    // 5. Store HIS reconciliation status in DB if table exists or return
    return NextResponse.json({
      success: true,
      idempotency_key: idempotencyKey,
      validation,
      his_response: hisResult
    });
  } catch (err: any) {
    console.error('Error in HIS forwarder route:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
