import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { allocateDoctorAndRoom } from '@/lib/doctors';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { identifier, password: _password, is_demo, demo_profile } = body;

    let patientName = 'Ravi Kumar';
    let abhaId = '91-8822-1144-5566';
    let age = '42';
    let gender = 'Male';
    let queueId = 'Q-101';
    let patientRef = 'PATIENT_GUEST';

    if (is_demo) {
      if (demo_profile === 'ayush') {
        patientName = 'Priya Sharma';
        abhaId = '91-4433-2211-7788';
        age = '36';
        gender = 'Female';
        queueId = 'Q-105';
        patientRef = 'PATIENT_AYUSH_DEMO';
      } else if (demo_profile === 'emergency') {
        patientName = 'Sunil Verma';
        abhaId = '91-9988-7766-5544';
        age = '58';
        gender = 'Male';
        queueId = 'Q-ER-1';
        patientRef = 'PATIENT_EMERGENCY_DEMO';
      } else {
        patientName = 'Ravi Kumar';
        abhaId = '91-8822-1144-5566';
        age = '42';
        gender = 'Male';
        queueId = 'Q-101';
        patientRef = 'PATIENT_GUEST';
      }
    } else if (identifier) {
      const cleanId = String(identifier).trim();
      // Look up existing session by queue_id, abha_mock_id, or patient_name
      const existing = await query(
        `SELECT * FROM sessions 
         WHERE queue_id = $1 OR abha_mock_id = $1 OR patient_ref = $1 OR LOWER(patient_name) LIKE LOWER($2)
         ORDER BY started_at DESC LIMIT 1`,
        [cleanId, `%${cleanId}%`]
      );

      if (existing.rows.length > 0) {
        const row = existing.rows[0];
        patientName = row.patient_name || cleanId;
        abhaId = row.abha_mock_id || '91-' + Math.floor(1000 + Math.random() * 9000) + '-' + Math.floor(1000 + Math.random() * 9000);
        age = row.age || '40';
        gender = row.gender || 'Other';
        queueId = row.queue_id || 'Q-101';
        patientRef = row.patient_ref || 'PATIENT_' + queueId;
      } else {
        // Create new demo/guest entry with provided identifier
        patientName = cleanId.includes('@') ? cleanId.split('@')[0] : cleanId;
        abhaId = cleanId.includes('@') || cleanId.includes('-') ? cleanId : '91-7700-1122-3344';
        queueId = 'Q-' + Math.floor(100 + Math.random() * 900);
        patientRef = 'PATIENT_' + queueId;
      }
    }

    // Find all sessions linked to this patient
    const sessionsRes = await query(
      `SELECT s.*, 
              (SELECT count(*) FROM document_uploads d WHERE d.session_id = s.id) as document_count,
              (SELECT count(*) FROM red_flag_events r WHERE r.session_id = s.id) as red_flag_count,
              (SELECT content FROM draft_summaries ds WHERE ds.session_id = s.id ORDER BY ds.generated_at DESC LIMIT 1) as draft_summary,
              (SELECT content FROM attested_records ar WHERE ar.session_id = s.id ORDER BY ar.attested_at DESC LIMIT 1) as attested_content,
              (SELECT clinician_id FROM attested_records ar WHERE ar.session_id = s.id ORDER BY ar.attested_at DESC LIMIT 1) as attested_by,
              (SELECT attested_at FROM attested_records ar WHERE ar.session_id = s.id ORDER BY ar.attested_at DESC LIMIT 1) as attested_at
       FROM sessions s
       WHERE s.patient_ref = $1 OR s.queue_id = $2 OR s.abha_mock_id = $3
       ORDER BY s.started_at DESC`,
      [patientRef, queueId, abhaId]
    );

    let activeSession = sessionsRes.rows.find(s => s.status !== 'attested' && s.status !== 'completed');
    if (!activeSession && sessionsRes.rows.length > 0) {
      activeSession = sessionsRes.rows[0];
    }

    // If still no session exists in DB, ensure an initial session exists for immediate dashboard interaction
    if (!activeSession) {
      const newSession = await query(
        `INSERT INTO sessions (patient_ref, language, queue_id, abha_mock_id, status, patient_name, age, gender, clinical_mode)
         VALUES ($1, 'en', $2, $3, 'in_progress', $4, $5, $6, 'allopathy')
         RETURNING *`,
        [patientRef, queueId, abhaId, patientName, age, gender]
      );
      activeSession = newSession.rows[0];
    }

    // Attach allocated doctor and department metadata
    const doctor = allocateDoctorAndRoom({
      clinical_mode: activeSession.clinical_mode || 'allopathy',
      symptoms_text: 'Outpatient consultation intake',
      age: activeSession.age
    });

    return NextResponse.json({
      success: true,
      patient: {
        patient_ref: patientRef,
        name: patientName,
        abha_id: abhaId,
        age,
        gender,
        queue_id: queueId,
        blood_group: 'B+',
        phone: '+91 98765 43210',
        abha_status: 'Active & Verified',
        allocated_doctor: doctor
      },
      active_session: {
        ...activeSession,
        allocated_doctor: doctor
      }
    });
  } catch (error: any) {
    console.error('Patient Auth Error:', error);
    return NextResponse.json({ error: error.message || 'Authentication failed' }, { status: 500 });
  }
}
