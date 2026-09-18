import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const sessionId = resolvedParams.id;
    const body = await req.json();
    const { method = 'touch', notice_version = 'v1.0', language = 'hi', revoke = false } = body;

    if (revoke) {
      // Record consent revocation
      const res = await query(
        `UPDATE consent_records 
         SET revoked_at = NOW() 
         WHERE session_id = $1 AND revoked_at IS NULL
         RETURNING *`,
        [sessionId]
      );
      return NextResponse.json({ success: true, revoked: true, record: res.rows[0] });
    }

    // Insert new consent record (DPDP Compliant)
    const res = await query(
      `INSERT INTO consent_records (session_id, notice_version, language, method)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [sessionId, notice_version, language, method]
    );

    return NextResponse.json({ success: true, consent: res.rows[0] });
  } catch (err: any) {
    console.error('Error recording consent:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
