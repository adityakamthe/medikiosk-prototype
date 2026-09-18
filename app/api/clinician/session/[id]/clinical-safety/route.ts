import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { auditMedicationSafety } from '@/lib/module_b_client';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const sessionId = resolvedParams.id;

    const entitiesRes = await query(
      `SELECT id, entity_type, fields, confidence, needs_verification FROM extracted_entities WHERE session_id = $1 ORDER BY id ASC`,
      [sessionId]
    );

    const rawMeds = entitiesRes.rows
      .filter((e) => e.entity_type === 'medication')
      .map((e) => {
        const f = typeof e.fields === 'object' && e.fields !== null ? e.fields : {};
        return {
          name: f.name || f.medication || 'Medicine',
          dose: f.dose || '',
          frequency: f.frequency_english || f.frequency || '',
          generic: f.normalized_generic || null,
          rxcui: f.rxcui || null,
          requires_ppi_warning: f.cdsco_match?.requires_ppi_warning || false,
        };
      });

    const rawLabs = entitiesRes.rows
      .filter((e) => e.entity_type === 'lab_result')
      .map((e) => {
        const f = typeof e.fields === 'object' && e.fields !== null ? e.fields : {};
        return {
          name: f.test_name || f.name || 'Lab Test',
          value: f.raw_value ?? f.value ?? '',
          unit: f.unit || '',
          loinc: f.loinc_code || null,
          severity: f.severity_status || f.severity || 'normal',
          status: (f.severity_status || f.status || 'NORMAL').toUpperCase(),
          is_panic: f.is_panic || false,
          reference_range: f.reference_range_display || f.reference_range || null,
        };
      });

    const safetyAlertsFromDB = entitiesRes.rows
      .filter((e) => e.entity_type === 'safety_alert')
      .map((e) => (typeof e.fields === 'object' && e.fields !== null ? e.fields : { title: 'Safety Alert' }));

    // Re-evaluate safety audit on all active medications
    const safetyAudit = await auditMedicationSafety(rawMeds);

    return NextResponse.json({
      success: true,
      medications: rawMeds,
      labs: rawLabs,
      safety_audit: safetyAudit,
      stored_safety_alerts: safetyAlertsFromDB,
      has_panic_labs: rawLabs.some((l: any) => l.is_panic),
      panic_labs: rawLabs.filter((l: any) => l.is_panic),
    });
  } catch (err: any) {
    console.error('Error fetching clinical safety data:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
