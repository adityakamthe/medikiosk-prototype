import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { allocateDoctorAndRoom } from '@/lib/doctors';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const patientRef = searchParams.get('patient_ref') || '';
    const abhaId = searchParams.get('abha_id') || '';
    const queueId = searchParams.get('queue_id') || '';

    // Fetch all sessions matching this patient
    const sessionsRes = await query(
      `SELECT s.*,
              (SELECT count(*) FROM document_uploads d WHERE d.session_id = s.id) as document_count,
              (SELECT count(*) FROM red_flag_events r WHERE r.session_id = s.id) as red_flag_count,
              (SELECT content FROM draft_summaries ds WHERE ds.session_id = s.id ORDER BY ds.generated_at DESC LIMIT 1) as draft_summary,
              (SELECT content FROM attested_records ar WHERE ar.session_id = s.id ORDER BY ar.attested_at DESC LIMIT 1) as attested_content,
              (SELECT clinician_id FROM attested_records ar WHERE ar.session_id = s.id ORDER BY ar.attested_at DESC LIMIT 1) as attested_by,
              (SELECT attested_at FROM attested_records ar WHERE ar.session_id = s.id ORDER BY ar.attested_at DESC LIMIT 1) as attested_at
       FROM sessions s
       WHERE s.patient_ref = $1 OR s.queue_id = $2 OR (s.abha_mock_id IS NOT NULL AND s.abha_mock_id = $3)
       ORDER BY s.started_at DESC`,
      [patientRef || 'PATIENT_GUEST', queueId || 'Q-101', abhaId || 'NONE']
    );

    // If no sessions found for guest, return recent mock-friendly sessions
    let sessions = sessionsRes.rows;
    if (sessions.length === 0) {
      const fallbackRes = await query(
        `SELECT s.*,
                (SELECT count(*) FROM document_uploads d WHERE d.session_id = s.id) as document_count,
                (SELECT count(*) FROM red_flag_events r WHERE r.session_id = s.id) as red_flag_count,
                (SELECT content FROM draft_summaries ds WHERE ds.session_id = s.id ORDER BY ds.generated_at DESC LIMIT 1) as draft_summary,
                (SELECT content FROM attested_records ar WHERE ar.session_id = s.id ORDER BY ar.attested_at DESC LIMIT 1) as attested_content,
                (SELECT clinician_id FROM attested_records ar WHERE ar.session_id = s.id ORDER BY ar.attested_at DESC LIMIT 1) as attested_by,
                (SELECT attested_at FROM attested_records ar WHERE ar.session_id = s.id ORDER BY ar.attested_at DESC LIMIT 1) as attested_at
         FROM sessions s
         ORDER BY s.started_at DESC LIMIT 5`
      );
      sessions = fallbackRes.rows;
    }

    // Enrich sessions with doctor and room allocations
    const enrichedSessions = sessions.map(sess => {
      let draft = sess.draft_summary;
      if (typeof draft === 'string') {
        try { draft = JSON.parse(draft); } catch {}
      }
      let attested = sess.attested_content;
      if (typeof attested === 'string') {
        try { attested = JSON.parse(attested); } catch {}
      }

      const doctor = allocateDoctorAndRoom({
        clinical_mode: sess.clinical_mode || 'allopathy',
        symptoms_text: draft?.chief_complaint || 'Consultation Intake',
        age: sess.age
      });

      return {
        ...sess,
        draft_summary: draft,
        attested_content: attested,
        allocated_doctor: doctor
      };
    });

    // Fetch all document uploads across these sessions
    const sessionIds = sessions.map(s => s.id);
    let documents: any[] = [];
    if (sessionIds.length > 0) {
      const docsRes = await query(
        `SELECT d.*, s.queue_id, s.started_at as visit_date
         FROM document_uploads d
         JOIN sessions s ON s.id = d.session_id
         WHERE d.session_id = ANY($1::uuid[])
         ORDER BY d.uploaded_at DESC`,
        [sessionIds]
      );
      documents = docsRes.rows;
    }

    // Fetch active consent record
    let consentRecord = null;
    if (sessionIds.length > 0) {
      const consentRes = await query(
        `SELECT * FROM consent_records 
         WHERE session_id = ANY($1::uuid[]) 
         ORDER BY consented_at DESC LIMIT 1`,
        [sessionIds]
      );
      if (consentRes.rows.length > 0) {
        consentRecord = consentRes.rows[0];
      }
    }

    return NextResponse.json({
      success: true,
      sessions: enrichedSessions,
      documents,
      consent: consentRecord || {
        notice_version: 'v1.0',
        language: 'en',
        consented_at: new Date().toISOString(),
        method: 'patient_portal_optin',
        revoked_at: null,
        purpose: 'Digital OPD history structuring, clinical intelligence audit, and ABDM PHR synchronization under DPDP Act 2023.'
      }
    });
  } catch (error: any) {
    console.error('Patient Records Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch patient records' }, { status: 500 });
  }
}
