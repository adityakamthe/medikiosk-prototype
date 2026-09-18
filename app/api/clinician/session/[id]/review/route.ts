import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const sessionId = resolvedParams.id;
    const body = await req.json();
    const { 
      clinician_id = 'Dr. Sharma', 
      field_ref, 
      action, 
      previous_value, 
      new_value, 
      reason 
    } = body;

    // Record review action in Clinician-Attested Layer audit trail
    const res = await query(
      `INSERT INTO review_actions (session_id, clinician_id, field_ref, action, previous_value, new_value, reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [sessionId, clinician_id, field_ref, action, previous_value, new_value, reason]
    );

    // If reviewing allergies, medications, or contradictions, mark matching contradictions as resolved
    if (field_ref === 'allergies' || field_ref === 'medications' || field_ref === 'contradiction') {
      await query(
        `UPDATE contradictions 
         SET resolved_at = NOW(), resolved_by = $2 
         WHERE session_id = $1 AND resolved_at IS NULL`,
        [sessionId, clinician_id]
      ).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      review_action: res.rows[0]
    });
  } catch (err: any) {
    console.error('Error logging review action:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
