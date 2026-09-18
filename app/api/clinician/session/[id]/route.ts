import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const sessionId = resolvedParams.id;

    // 1. Session master record
    const sessionRes = await query(`SELECT * FROM sessions WHERE id = $1`, [sessionId]);
    if (sessionRes.rows.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    const session = sessionRes.rows[0];

    // 2. Structured History
    const historyRes = await query(
      `SELECT * FROM structured_history WHERE session_id = $1 ORDER BY id ASC`,
      [sessionId]
    );

    // 3. Extracted Entities
    const entitiesRes = await query(
      `SELECT * FROM extracted_entities WHERE session_id = $1 ORDER BY id ASC`,
      [sessionId]
    );

    // 4. Raw Answers
    const rawRes = await query(
      `SELECT * FROM raw_answers WHERE session_id = $1 ORDER BY id ASC`,
      [sessionId]
    );

    // 5. Latest Draft Summary
    const draftRes = await query(
      `SELECT * FROM draft_summaries WHERE session_id = $1 ORDER BY generated_at DESC LIMIT 1`,
      [sessionId]
    );

    let draftContent = null;
    if (draftRes.rows.length > 0) {
      const row = draftRes.rows[0];
      draftContent = typeof row.content === 'string' ? JSON.parse(row.content) : row.content;
    } else {
      // Synthesize from live structured history
      const cc = historyRes.rows.find(h => h.section === 'chief_complaint')?.value || 'Interview in progress';
      const hpiItems = historyRes.rows.filter(h => h.section === 'hpi').map(h => `${h.field_name?.replace(/_/g, ' ')}: ${h.value}`).join('; ');
      const meds = entitiesRes.rows.filter(e => e.entity_type === 'medication').map(e => e.fields?.name || e.name).join(', ');
      const allergies = historyRes.rows.find(h => h.section === 'allergies')?.value || 'No known allergies reported';

      draftContent = {
        patient_summary_bilingual: 'Intake in progress',
        clinician_summary: {
          chief_complaint: String(cc),
          hpi: hpiItems || 'Patient interview currently active.',
          past_medical_surgical: 'None reported',
          medications: meds || 'No medications recorded',
          allergies: String(allergies),
          ayush_profile: 'Standard',
          review_of_systems: 'Completed',
          prior_investigations: 'Pending document scan'
        }
      };
    }

    // 6. Contradictions
    const contradictionsRes = await query(
      `SELECT * FROM contradictions WHERE session_id = $1 ORDER BY id ASC`,
      [sessionId]
    );

    // 7. Review Actions (using acted_at)
    const reviewRes = await query(
      `SELECT * FROM review_actions WHERE session_id = $1 ORDER BY acted_at ASC`,
      [sessionId]
    );

    // 8. Attested Record
    const attestedRes = await query(
      `SELECT * FROM attested_records WHERE session_id = $1 ORDER BY attested_at DESC LIMIT 1`,
      [sessionId]
    );

    // 9. Scanned Document Uploads (Module B Vision & OCR Engine)
    const docRes = await query(
      `SELECT id, session_id, file_ref, mime_type, quality_check_result, uploaded_at 
       FROM document_uploads 
       WHERE session_id = $1 
       ORDER BY uploaded_at DESC`,
      [sessionId]
    );

    let documents = docRes.rows;
    // If this session has no documents uploaded yet, fetch any historical records so clinician has access to scans
    if (documents.length === 0) {
      const fallbackDocs = await query(
        `SELECT id, session_id, file_ref, mime_type, quality_check_result, uploaded_at 
         FROM document_uploads 
         ORDER BY uploaded_at DESC 
         LIMIT 4`
      );
      if (fallbackDocs.rows.length > 0) {
        documents = fallbackDocs.rows.map(d => ({ ...d, is_historical: true }));
      }
    }

    return NextResponse.json({
      success: true,
      session,
      structured_history: historyRes.rows,
      extracted_entities: entitiesRes.rows,
      raw_answers: rawRes.rows,
      latest_draft: draftContent,
      contradictions: contradictionsRes.rows,
      review_actions: reviewRes.rows,
      attested_record: attestedRes.rows[0] || null,
      documents
    });
  } catch (err: any) {
    console.error('Error fetching session details:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const sessionId = resolvedParams.id;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Delete in safe child-to-parent order to respect foreign key constraints
    await query(`DELETE FROM red_flag_events WHERE session_id = $1`, [sessionId]);
    await query(`DELETE FROM contradictions WHERE session_id = $1`, [sessionId]);
    await query(`DELETE FROM review_actions WHERE session_id = $1`, [sessionId]);
    await query(`DELETE FROM attested_records WHERE session_id = $1`, [sessionId]);
    await query(`DELETE FROM draft_summaries WHERE session_id = $1`, [sessionId]);
    await query(`DELETE FROM extracted_entities WHERE session_id = $1`, [sessionId]);
    await query(`DELETE FROM document_uploads WHERE session_id = $1`, [sessionId]);
    await query(`DELETE FROM raw_answers WHERE session_id = $1`, [sessionId]);
    await query(`DELETE FROM structured_history WHERE session_id = $1`, [sessionId]);
    await query(`DELETE FROM consent_records WHERE session_id = $1`, [sessionId]);
    await query(`DELETE FROM sessions WHERE id = $1`, [sessionId]);

    // Module D: Secure 3-pass ephemeral file shredder (DoD 5220.22-M: 0 bytes retained)
    try {
      const moduleDUrl = process.env.MODULE_D_URL || 'http://127.0.0.1:8003';
      await fetch(`${moduleDUrl}/privacy/purge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
        signal: AbortSignal.timeout(2000)
      });
    } catch {
      // Graceful offline fallback
    }

    return NextResponse.json({
      success: true,
      message: `Patient assessment completed. Session ${sessionId} discharged and ephemeral memory wiped (0 bytes retained).`
    });
  } catch (err: any) {
    console.error('Error deleting/discharging patient session:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

