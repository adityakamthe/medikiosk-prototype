import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const sessionId = resolvedParams.id;
    const body = await req.json();
    const { queue_id, abha_mock_id, patient_name, age, gender, clinical_mode, ayush_assessment_type } = body;

    try {
      await query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS clinical_mode VARCHAR(50) DEFAULT 'allopathy'`);
      await query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ayush_assessment_type VARCHAR(50) DEFAULT 'dashavidha'`);
    } catch {}

    const res = await query(
      `UPDATE sessions
       SET queue_id = COALESCE($1, queue_id),
           abha_mock_id = $2,
           patient_name = COALESCE($3, patient_name),
           age = COALESCE($4, age),
           gender = COALESCE($5, gender),
           clinical_mode = COALESCE($6, clinical_mode),
           ayush_assessment_type = COALESCE($7, ayush_assessment_type)
       WHERE id = $8
       RETURNING *`,
      [
        queue_id || null, 
        abha_mock_id ? String(abha_mock_id).trim() : null, 
        patient_name || null, 
        age ? parseInt(String(age), 10) : null, 
        gender || null,
        clinical_mode || null,
        ayush_assessment_type || null,
        sessionId
      ]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Consolidate all demographics into a single row under section 'demographics' for this patient
    const demoItems = [];
    const fieldParts = [];
    const valParts = [];
    const qList = [];
    const aList = [];

    if (patient_name) {
      demoItems.push({ field_name: 'patient_name', value: patient_name, recorded_at: new Date().toISOString() });
      fieldParts.push('patient_name');
      valParts.push(`Name: ${patient_name}`);
      qList.push('Patient Full Name');
      aList.push(patient_name);
    }
    if (age) {
      demoItems.push({ field_name: 'age', value: String(age), recorded_at: new Date().toISOString() });
      fieldParts.push('age');
      valParts.push(`Age: ${age}`);
      qList.push('Age');
      aList.push(String(age));
    }
    if (gender) {
      demoItems.push({ field_name: 'gender', value: gender, recorded_at: new Date().toISOString() });
      fieldParts.push('gender');
      valParts.push(`Gender: ${gender}`);
      qList.push('Gender');
      aList.push(gender);
    }
    if (abha_mock_id && String(abha_mock_id).trim()) {
      demoItems.push({ field_name: 'abha_id', value: String(abha_mock_id).trim(), recorded_at: new Date().toISOString() });
      fieldParts.push('abha_id');
      valParts.push(`ABHA: ${String(abha_mock_id).trim()}`);
      qList.push('ABHA Health ID');
      aList.push(String(abha_mock_id).trim());
    }

    if (demoItems.length > 0) {
      const existingDemo = await query(
        `SELECT id FROM structured_history WHERE session_id = $1 AND section = 'demographics' LIMIT 1`,
        [sessionId]
      );

      if (existingDemo.rows.length > 0) {
        await query(
          `UPDATE structured_history 
           SET field_name = $1, value = $2, items = $3::jsonb, questions = $4::jsonb, answers = $5::jsonb
           WHERE id = $6`,
          [fieldParts.join(', '), valParts.join('; '), JSON.stringify(demoItems), JSON.stringify(qList), JSON.stringify(aList), existingDemo.rows[0].id]
        );
      } else {
        await query(
          `INSERT INTO structured_history (session_id, section, field_name, value, confidence, items, questions, answers)
           VALUES ($1, 'demographics', $2, $3, 1.0, $4::jsonb, $5::jsonb, $6::jsonb)`,
          [sessionId, fieldParts.join(', '), valParts.join('; '), JSON.stringify(demoItems), JSON.stringify(qList), JSON.stringify(aList)]
        );
      }
    }

    return NextResponse.json({ success: true, session: res.rows[0] });
  } catch (err: any) {
    console.error('Error updating session demographics:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
