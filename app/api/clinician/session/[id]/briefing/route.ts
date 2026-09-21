import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import {
  generateDoctorAudioBriefingAI,
  DoctorAudioBriefingInput,
  DoctorAudioBriefingOutput
} from '@/lib/mistral';

// In-Memory Briefing Cache (session_id -> Briefing Output)
const briefingCache = new Map<string, { data: DoctorAudioBriefingOutput; cachedAt: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes TTL

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const sessionId = resolvedParams.id;
    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    // 1. Check in-memory cache if not forcing refresh
    if (!forceRefresh && briefingCache.has(sessionId)) {
      const cached = briefingCache.get(sessionId)!;
      if (Date.now() - cached.cachedAt < CACHE_TTL_MS) {
        return NextResponse.json({
          success: true,
          ...cached.data,
          cached: true
        });
      }
    }

    // 2. Fetch Session Master Record
    const sessionRes = await query(`SELECT * FROM sessions WHERE id = $1`, [sessionId]);
    if (sessionRes.rows.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    const session = sessionRes.rows[0];

    // 3. Fetch Structured History
    const historyRes = await query(
      `SELECT * FROM structured_history WHERE session_id = $1 ORDER BY id ASC`,
      [sessionId]
    );
    const history = historyRes.rows;

    // 4. Fetch Extracted Entities (Labs, Meds, Safety Alerts)
    const entitiesRes = await query(
      `SELECT * FROM extracted_entities WHERE session_id = $1 ORDER BY id ASC`,
      [sessionId]
    );
    const entities = entitiesRes.rows;

    // 5. Fetch Latest Draft Summary
    const draftRes = await query(
      `SELECT * FROM draft_summaries WHERE session_id = $1 ORDER BY generated_at DESC LIMIT 1`,
      [sessionId]
    );
    let draftContent: any = null;
    let existingPrecomputedBriefing = '';
    if (draftRes.rows.length > 0) {
      const raw = draftRes.rows[0].content;
      draftContent = typeof raw === 'string' ? JSON.parse(raw) : raw;
      existingPrecomputedBriefing =
        draftContent?.clinical_audio_briefing ||
        draftContent?.clinician_summary?.clinical_audio_briefing ||
        '';
    }

    // 6. Fetch Contradictions
    const contradictionsRes = await query(
      `SELECT * FROM contradictions WHERE session_id = $1 ORDER BY id ASC`,
      [sessionId]
    );
    const contradictions = contradictionsRes.rows;

    // 7. Extract Abnormal Labs
    const abnormalLabs = entities
      .filter((e) => e.entity_type === 'lab_result')
      .map((e) => {
        const f = typeof e.fields === 'object' && e.fields !== null ? e.fields : {};
        return {
          name: f.test_name || f.name || 'Lab Test',
          value: String(f.raw_value ?? f.value ?? ''),
          unit: f.unit || '',
          severity: f.severity_status || f.severity || 'normal',
          status: String(f.severity_status || f.status || 'NORMAL').toUpperCase(),
          is_panic: Boolean(f.is_panic || f.severity === 'panic' || f.status === 'PANIC')
        };
      })
      .filter((l) => l.is_panic || l.status === 'HIGH' || l.status === 'LOW' || l.severity !== 'normal');

    // 8. Extract Safety Alerts
    const safetyAlerts = entities
      .filter((e) => e.entity_type === 'safety_alert')
      .map((e) => {
        const f = typeof e.fields === 'object' && e.fields !== null ? e.fields : {};
        return f.title || f.warning || 'Clinical Alert';
      });

    // 9. Build Briefing Input
    const draftSummary = draftContent?.clinician_summary || {};
    const input: DoctorAudioBriefingInput = {
      patient: {
        name: session.patient_name || session.patient_ref || 'Patient',
        age: session.age,
        gender: session.gender,
        queue_id: session.queue_id,
        token: session.queue_id ? `Token ${session.queue_id}` : undefined
      },
      chief_complaint:
        draftSummary.chief_complaint ||
        history.find((h) => h.section === 'chief_complaint')?.value ||
        'Outpatient consultation',
      hpi: draftSummary.hpi,
      allergies:
        draftSummary.allergies ||
        history.find((h) => h.section === 'allergies')?.value ||
        'No known drug allergies',
      medications: draftSummary.medications,
      past_medical: draftSummary.past_medical_surgical,
      family_history: draftSummary.family_history,
      abnormal_labs: abnormalLabs,
      contradictions: contradictions.map((c) => ({
        concept: c.concept,
        conflict_summary: c.spoken_value_ref || c.document_value_ref
      })),
      safety_alerts: safetyAlerts,
      clinical_mode: session.clinical_mode || 'allopathy'
    };

    // 10. Generate AI-Powered High-Yield Audio Briefing
    const briefingResult = await generateDoctorAudioBriefingAI(input);

    // 11. Cache result in memory
    briefingCache.set(sessionId, { data: briefingResult, cachedAt: Date.now() });

    // 12. Persist back to draft_summaries if present and wasn't already stored
    if (draftRes.rows.length > 0 && draftContent) {
      try {
        if (!existingPrecomputedBriefing || forceRefresh) {
          draftContent.clinical_audio_briefing = briefingResult.briefing_text;
          if (draftContent.clinician_summary) {
            draftContent.clinician_summary.clinical_audio_briefing = briefingResult.briefing_text;
          }
          await query(
            `UPDATE draft_summaries SET content = $1 WHERE id = $2`,
            [JSON.stringify(draftContent), draftRes.rows[0].id]
          );
        }
      } catch (dbErr) {
        console.warn('Failed to persist clinical_audio_briefing to draft_summaries:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      ...briefingResult,
      cached: false
    });
  } catch (err: any) {
    console.error('Clinical Doctor Briefing API Error:', err);
    return NextResponse.json({ error: err.message || 'Briefing generation failed' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const sessionId = resolvedParams.id;
    const body = await req.json().catch(() => ({}));

    // If client provided custom clinician_summary or edits:
    const sessionRes = await query(`SELECT * FROM sessions WHERE id = $1`, [sessionId]);
    if (sessionRes.rows.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    const session = sessionRes.rows[0];

    const input: DoctorAudioBriefingInput = {
      patient: {
        name: body.patient_name || session.patient_name || session.patient_ref || 'Patient',
        age: body.age ?? session.age,
        gender: body.gender || session.gender,
        queue_id: session.queue_id,
        token: session.queue_id ? `Token ${session.queue_id}` : undefined
      },
      chief_complaint: body.chief_complaint || 'Outpatient consultation',
      hpi: body.hpi,
      allergies: body.allergies || 'No known drug allergies',
      medications: body.medications,
      past_medical: body.past_medical_surgical,
      family_history: body.family_history,
      abnormal_labs: body.abnormal_labs || [],
      contradictions: body.contradictions || [],
      safety_alerts: body.safety_alerts || [],
      clinical_mode: session.clinical_mode || 'allopathy'
    };

    const briefingResult = await generateDoctorAudioBriefingAI(input);

    // Update in-memory cache
    briefingCache.set(sessionId, { data: briefingResult, cachedAt: Date.now() });

    return NextResponse.json({
      success: true,
      ...briefingResult,
      cached: false
    });
  } catch (err: any) {
    console.error('Clinical Doctor Briefing POST Error:', err);
    return NextResponse.json({ error: err.message || 'Briefing generation failed' }, { status: 500 });
  }
}
