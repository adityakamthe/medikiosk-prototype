import { NextResponse } from 'next/server';
import { query, queryHospital } from '@/lib/db';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const sessionId = resolvedParams.id;

    // Check if prescription exists for this session
    const res = await query(
      `SELECT * FROM prescriptions WHERE session_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [sessionId]
    );

    if (res.rows.length === 0) {
      // Also check attested_records if content contains prescription
      const attestRes = await query(
        `SELECT content FROM attested_records WHERE session_id = $1 ORDER BY attested_at DESC LIMIT 1`,
        [sessionId]
      );
      if (attestRes.rows.length > 0) {
        const c = typeof attestRes.rows[0].content === 'string'
          ? JSON.parse(attestRes.rows[0].content)
          : attestRes.rows[0].content;
        if (c?.prescription) {
          return NextResponse.json({ success: true, prescription: c.prescription });
        }
      }
      return NextResponse.json({ success: true, prescription: null });
    }

    return NextResponse.json({ success: true, prescription: res.rows[0] });
  } catch (err: any) {
    console.error('Error fetching prescription:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const sessionId = resolvedParams.id;
    const body = await req.json();

    const {
      hospital_id = 'AIIMS',
      hospital_name = 'All India Institute of Medical Sciences (AIIMS), New Delhi',
      doctor_name = 'Dr. Vikram Sharma',
      doctor_qualification = 'MBBS, MD (General Medicine)',
      patient_name = 'Patient',
      patient_age = '42',
      patient_gender = 'Male',
      queue_id = 'Q-101',
      abha_id = null,
      diagnosis = 'Clinical Assessment',
      medications = [],
      general_advice = '',
      follow_up_date = ''
    } = body;

    // 1. Persist directly into the respective hospital database
    const insertSQL = `
      INSERT INTO prescriptions (
        session_id, abha_id, hospital_id, hospital_name, doctor_name, doctor_qualification,
        patient_name, patient_age, patient_gender, queue_id, diagnosis, medications,
        general_advice, follow_up_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, $14)
      RETURNING *
    `;

    const insertParams = [
      sessionId,
      abha_id,
      hospital_id,
      hospital_name,
      doctor_name,
      doctor_qualification,
      patient_name,
      patient_age,
      patient_gender,
      queue_id,
      diagnosis,
      JSON.stringify(medications),
      general_advice,
      follow_up_date
    ];

    let savedRx: any = null;
    try {
      // Query specific hospital pool
      const rxRes = await queryHospital(hospital_id, insertSQL, insertParams);
      savedRx = rxRes.rows[0];
    } catch (e: any) {
      console.warn('Hospital-specific pool push note:', e.message);
      // Fallback to default query router
      const rxRes = await query(insertSQL, insertParams, hospital_id);
      savedRx = rxRes.rows[0];
    }

    // 2. Also record / update attested_records with this digital prescription
    try {
      const existingAttest = await query(
        `SELECT id, content FROM attested_records WHERE session_id = $1 ORDER BY attested_at DESC LIMIT 1`,
        [sessionId]
      );

      const rxPayload = {
        id: savedRx?.id,
        hospital_id,
        hospital_name,
        doctor_name,
        doctor_qualification,
        diagnosis,
        medications,
        general_advice,
        follow_up_date,
        prescribed_at: new Date().toISOString()
      };

      if (existingAttest.rows.length > 0) {
        const prevContent = typeof existingAttest.rows[0].content === 'string'
          ? JSON.parse(existingAttest.rows[0].content)
          : existingAttest.rows[0].content;
        const updatedContent = { ...prevContent, prescription: rxPayload };
        await query(
          `UPDATE attested_records SET content = $1 WHERE id = $2`,
          [JSON.stringify(updatedContent), existingAttest.rows[0].id]
        );
      } else {
        await query(
          `INSERT INTO attested_records (session_id, clinician_id, content) VALUES ($1, $2, $3)`,
          [sessionId, doctor_name, JSON.stringify({ prescription: rxPayload })]
        );
      }
    } catch (attestErr: any) {
      console.warn('Attested record sync note:', attestErr.message);
    }

    // 3. Ensure session status is marked 'attested'
    try {
      await query(`UPDATE sessions SET status = 'attested' WHERE id = $1`, [sessionId]);
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Prescription successfully generated and pushed to ${hospital_name} Database!`,
      prescription: savedRx
    });
  } catch (err: any) {
    console.error('Error saving digital prescription to hospital database:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
