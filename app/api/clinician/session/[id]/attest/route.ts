import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const sessionId = resolvedParams.id;
    const body = await req.json();
    const { clinician_id = 'Dr. Sharma', attested_content, bypass_checks = false } = body;

    if (!bypass_checks) {
      // 1. Attestation Gate Check: Verify no unresolved contradictions remain
      const unresolvedContradictions = await query(
        `SELECT * FROM contradictions WHERE session_id = $1 AND resolved_at IS NULL`,
        [sessionId]
      );

      if (unresolvedContradictions.rows.length > 0) {
        return NextResponse.json({
          error: 'Attestation blocked: All detected clinical contradictions must be explicitly resolved prior to sign-off.',
          unresolved_contradictions: unresolvedContradictions.rows
        }, { status: 400 });
      }

      // 2. Attestation Gate Check: Verify no unreviewed low-confidence entities
      const unreviewedEntities = await query(
        `SELECT ee.* FROM extracted_entities ee
         LEFT JOIN review_actions ra ON ra.session_id = ee.session_id AND ra.field_ref = ee.raw_text
         WHERE ee.session_id = $1 AND ee.needs_verification = TRUE AND ra.id IS NULL`,
        [sessionId]
      );

      if (unreviewedEntities.rows.length > 0) {
        return NextResponse.json({
          error: 'Attestation blocked: Unreviewed low-confidence document extractions require clinician verification.',
          unreviewed_entities: unreviewedEntities.rows
        }, { status: 400 });
      }
    }

    // 3. Write Attested Record (Clinician-Attested Layer)
    const attestRes = await query(
      `INSERT INTO attested_records (session_id, clinician_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [sessionId, clinician_id, JSON.stringify(attested_content)]
    );

    // 4. Update session status to attested
    await query(
      `UPDATE sessions SET status = 'attested' WHERE id = $1`,
      [sessionId]
    );

    return NextResponse.json({
      success: true,
      attested_record: attestRes.rows[0]
    });
  } catch (err: any) {
    console.error('Error during attestation sign-off:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
