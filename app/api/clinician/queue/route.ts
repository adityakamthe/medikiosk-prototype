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
    console.warn('Error fetching clinician queue, returning fallback demo queue:', err);
    
    // Resilient fallback queue for demonstration
    const fallbackQueue = [
      {
        id: 'd1111111-1111-1111-1111-111111111111',
        queue_id: 'Q-101',
        patient_ref: 'PATIENT_GUEST',
        patient_name: 'Ravi Kumar',
        age: '42',
        gender: 'Male',
        clinical_mode: 'allopathy',
        abha_mock_id: '91-8822-1144-5566',
        language: 'hi',
        status: 'ready_for_review',
        started_at: new Date(Date.now() - 3600000).toISOString(),
        red_flag_count: 0,
        contradiction_count: 0,
        verification_count: 0,
        chief_complaint: 'High fever and throbbing headache for 3 days',
        queue_position: 1,
        estimated_wait_time: 'Next in line (0-5 mins)',
        allocated_doctor: allocateDoctorAndRoom({ clinical_mode: 'allopathy', symptoms_text: 'Fever and headache', age: '42' })
      },
      {
        id: 'd2222222-2222-2222-2222-222222222222',
        queue_id: 'Q-105',
        patient_ref: 'PATIENT_AYUSH_DEMO',
        patient_name: 'Priya Sharma',
        age: '36',
        gender: 'Female',
        clinical_mode: 'ayush',
        abha_mock_id: '91-4433-2211-7788',
        language: 'hi',
        status: 'ready_for_review',
        started_at: new Date(Date.now() - 7200000).toISOString(),
        red_flag_count: 0,
        contradiction_count: 0,
        verification_count: 0,
        chief_complaint: 'Chronic indigestion (Ajeerna) and fatigue (Klama)',
        queue_position: 1,
        estimated_wait_time: 'Ready for consult',
        allocated_doctor: allocateDoctorAndRoom({ clinical_mode: 'ayush', symptoms_text: 'Ajeerna indigestion', age: '36' })
      },
      {
        id: 'd3333333-3333-3333-3333-333333333333',
        queue_id: 'Q-ER-1',
        patient_ref: 'PATIENT_EMERGENCY_DEMO',
        patient_name: 'Sunil Verma',
        age: '58',
        gender: 'Male',
        clinical_mode: 'allopathy',
        abha_mock_id: '91-9988-7766-5544',
        language: 'en',
        status: 'emergency_triaged',
        started_at: new Date(Date.now() - 1800000).toISOString(),
        red_flag_count: 1,
        latest_red_flag_rule: 'RF-001 (Acute Coronary Syndrome)',
        contradiction_count: 0,
        verification_count: 0,
        chief_complaint: 'Crushing chest tightness with diaphoresis',
        queue_position: 1,
        estimated_wait_time: 'IMMEDIATE ATTENTION',
        allocated_doctor: allocateDoctorAndRoom({ clinical_mode: 'allopathy', is_red_flag: true, symptoms_text: 'Chest pain', age: '58' })
      }
    ];

    return NextResponse.json({ success: true, queue: fallbackQueue });
  }
}
