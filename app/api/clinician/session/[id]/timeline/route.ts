import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { clusterMedicalTimeline } from '@/lib/module_b_client';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const sessionId = resolvedParams.id;

    // Fetch documents, clinical notes, and structured history for this session
    const docRes = await query(
      `SELECT id, file_ref, mime_type, quality_check_result, uploaded_at FROM document_uploads WHERE session_id = $1 ORDER BY uploaded_at ASC`,
      [sessionId]
    );

    const entitiesRes = await query(
      `SELECT id, document_upload_id, entity_type, fields, created_at FROM extracted_entities WHERE session_id = $1 ORDER BY id ASC`,
      [sessionId]
    );

    const records: Array<Record<string, any>> = [];

    // Map documents to records
    for (const doc of docRes.rows) {
      const relatedEntities = entitiesRes.rows.filter((e) => e.document_upload_id === doc.id);
      const diagnoses = relatedEntities
        .filter((e) => e.entity_type === 'diagnosis')
        .map((e) => e.fields?.name || JSON.stringify(e.fields));
      const medications = relatedEntities
        .filter((e) => e.entity_type === 'medication')
        .map((e) => e.fields?.name || e.fields?.normalized_generic || JSON.stringify(e.fields));
      const labs = relatedEntities
        .filter((e) => e.entity_type === 'lab_result')
        .map((e) => `${e.fields?.test_name || 'Test'}: ${e.fields?.raw_value || ''} ${e.fields?.unit || ''}`.trim());
      const notes = relatedEntities
        .filter((e) => e.entity_type === 'clinical_note')
        .map((e) => e.fields?.note || JSON.stringify(e.fields));

      records.push({
        id: `doc_${doc.id}`,
        title: diagnoses.length > 0 ? diagnoses.join(', ') : 'Medical Document Record',
        date: doc.uploaded_at ? new Date(doc.uploaded_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        document_type: 'Prescription & Diagnostic Record',
        quality: doc.quality_check_result,
        diagnoses,
        medications,
        labs,
        clinical_notes: notes,
      });
    }

    // Add baseline record if no physical documents uploaded yet
    if (records.length === 0) {
      records.push({
        id: 'rec_baseline',
        title: 'Current OPD Triage & Assessment',
        date: new Date().toISOString().split('T')[0],
        document_type: 'OPD Intake Encounter',
        quality: 'PASSED',
        diagnoses: ['Under Evaluation'],
        medications: [],
        labs: [],
        clinical_notes: ['Patient registered at MediKiosk waiting terminal.'],
      });
    }

    const timelineData = await clusterMedicalTimeline(records, 45);

    return NextResponse.json({
      success: true,
      timeline: timelineData,
    });
  } catch (err: any) {
    console.error('Error fetching clinical timeline:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
