import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * GET /api/session
 * Returns the continuous next sequential queue token (e.g., Q-101, Q-102, Q-105...)
 */
export async function GET() {
  try {
    const res = await query(`
      SELECT queue_id FROM sessions 
      WHERE queue_id ~ '^Q-[0-9]+$' 
      ORDER BY CAST(SUBSTRING(queue_id FROM 3) AS INTEGER) DESC 
      LIMIT 1
    `);

    let nextNum = 101;
    if (res.rows.length > 0) {
      const match = res.rows[0].queue_id.match(/^Q-(\d+)$/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }

    return NextResponse.json({ 
      success: true, 
      next_token: `Q-${nextNum}` 
    });
  } catch (err: any) {
    console.error('Error calculating next queue token:', err);
    return NextResponse.json({ success: true, next_token: 'Q-101' });
  }
}

/**
 * POST /api/session
 * Initializes a new kiosk session with a continuous sequential queue token
 */
export async function POST(req: Request) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Empty body or non-JSON body — use defaults
    }
    const { language = 'hi', queue_id, abha_mock_id, patient_ref, clinical_mode = 'allopathy' } = body;

    let assignedQueueId = queue_id;

    // If no queue_id was specified or left empty, compute next continuous token atomically
    if (!assignedQueueId || assignedQueueId.trim() === '') {
      const maxTokenRes = await query(`
        SELECT queue_id FROM sessions 
        WHERE queue_id ~ '^Q-[0-9]+$' 
        ORDER BY CAST(SUBSTRING(queue_id FROM 3) AS INTEGER) DESC 
        LIMIT 1
      `);
      let nextNum = 101;
      if (maxTokenRes.rows.length > 0) {
        const match = maxTokenRes.rows[0].queue_id.match(/^Q-(\d+)$/);
        if (match) {
          nextNum = parseInt(match[1], 10) + 1;
        }
      }
      assignedQueueId = `Q-${nextNum}`;
    }

    // Try ensuring column exists without throwing
    try {
      await query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS clinical_mode VARCHAR(50) DEFAULT 'allopathy'`);
    } catch {}

    let res;
    try {
      res = await query(
        `INSERT INTO sessions (language, queue_id, abha_mock_id, patient_ref, status, clinical_mode)
         VALUES ($1, $2, $3, $4, 'in_progress', $5)
         RETURNING *`,
        [language, assignedQueueId, abha_mock_id || null, patient_ref || 'PATIENT_GUEST', clinical_mode]
      );
    } catch {
      res = await query(
        `INSERT INTO sessions (language, queue_id, abha_mock_id, patient_ref, status)
         VALUES ($1, $2, $3, $4, 'in_progress')
         RETURNING *`,
        [language, assignedQueueId, abha_mock_id || null, patient_ref || 'PATIENT_GUEST']
      );
    }

    const session = res.rows[0];

    // If in Ayurveda mode, insert initial AYUSH tag in structured_history
    if (clinical_mode === 'ayurveda') {
      try {
        await query(
          `INSERT INTO structured_history (session_id, section, field_name, value, confidence)
           VALUES ($1, 'ayush_profile', 'clinical_intake_mode', 'Ministry of AYUSH Ayurvedic Mode Active', 1.0)`,
          [session.id]
        );
      } catch {}
    }

    // Log Audit
    await query(
      `INSERT INTO audit_log (actor_id, actor_type, action, table_ref, record_ref)
       VALUES ($1, 'patient', 'CREATE_SESSION', 'sessions', $2)`,
      [session.id, session.id]
    );

    return NextResponse.json({ success: true, session });
  } catch (err: any) {
    console.error('Error creating session:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
