import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { allocateDoctorAndRoom, getEstimatedQueueTime } from '@/lib/doctors';

export async function GET() {
  try {
    const res = await query(`
      SELECT 
        s.id,
        s.queue_id,
        s.patient_ref,
        s.patient_name,
        s.age,
        s.gender,
        s.clinical_mode,
        s.abha_mock_id,
        s.language,
        s.status,
        s.started_at,
        (SELECT COUNT(*) FROM red_flag_events rf WHERE rf.session_id = s.id) AS red_flag_count,
        (SELECT rule_id FROM red_flag_events rf WHERE rf.session_id = s.id ORDER BY rf.triggered_at DESC LIMIT 1) AS latest_red_flag_rule,
        (SELECT COUNT(*) FROM contradictions c WHERE c.session_id = s.id AND c.resolved_at IS NULL) AS contradiction_count,
        (SELECT COUNT(*) FROM extracted_entities ee WHERE ee.session_id = s.id AND ee.needs_verification = TRUE) AS verification_count,
        (SELECT value FROM structured_history sh WHERE sh.session_id = s.id AND (sh.section = 'chief_complaint' OR sh.field_name = 'chief_complaint') ORDER BY sh.id ASC LIMIT 1) AS chief_complaint,
        (SELECT content FROM draft_summaries ds WHERE ds.session_id = s.id ORDER BY ds.generated_at DESC LIMIT 1) AS latest_draft
      FROM sessions s
      ORDER BY 
        (CASE WHEN s.status = 'emergency_triaged' THEN 1 ELSE 0 END) DESC,
        red_flag_count DESC, 
        contradiction_count DESC, 
        s.started_at DESC
    `);

    // Track queue counts per doctor department for accurate wait time calculation
    const doctorQueueCounts: Record<string, number> = {};

    const queue = res.rows.map(row => {
      let draft = row.latest_draft;
      if (typeof draft === 'string') {
        try {
          draft = JSON.parse(draft);
        } catch {
          draft = null;
        }
      }

      const allocatedDoctor = allocateDoctorAndRoom({
        age: row.age,
        clinical_mode: row.clinical_mode,
        is_red_flag: row.status === 'emergency_triaged' || Number(row.red_flag_count) > 0,
        red_flag_count: row.red_flag_count,
        symptoms_text: row.chief_complaint || ''
      });

      const currentCount = doctorQueueCounts[allocatedDoctor.id] || 0;
      doctorQueueCounts[allocatedDoctor.id] = currentCount + 1;

      const waitTimeInfo = getEstimatedQueueTime(currentCount, allocatedDoctor);

      return {
        ...row,
        latest_draft: draft,
        allocated_doctor: allocatedDoctor,
        queue_position: currentCount + 1,
        estimated_wait_time: waitTimeInfo.timeString
      };
    });

    return NextResponse.json({ success: true, queue });
  } catch (err: any) {
    console.error('Error fetching clinician queue:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
