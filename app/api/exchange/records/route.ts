import { NextResponse } from 'next/server';
import { queryCentralHealthExchange, publishRecordToCentralExchange } from '@/lib/centralExchange';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const abhaId = searchParams.get('abha_id');

    if (!abhaId) {
      return NextResponse.json({ error: 'ABHA ID is required for cross-hospital query' }, { status: 400 });
    }

    const record = await queryCentralHealthExchange(abhaId);

    if (!record) {
      return NextResponse.json({
        success: false,
        message: `No longitudinal records found in National Central Exchange for ABHA: ${abhaId}. Patient may be first-time visitor.`,
        abha_id: abhaId
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: record,
      exchange_node: 'HIE-CM-NATIONAL-BRIDGE-V5'
    });
  } catch (err: any) {
    console.error('Error querying Central Exchange:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { abha_id, encounter, patient_name, gender, dob } = body;

    if (!abha_id || !encounter) {
      return NextResponse.json({ error: 'abha_id and encounter payload are required' }, { status: 400 });
    }

    const updatedRecord = await publishRecordToCentralExchange(abha_id, encounter, patient_name, gender, dob);

    return NextResponse.json({
      success: true,
      message: 'Attested encounter published to Central Cross-Hospital Exchange',
      record: updatedRecord
    });
  } catch (err: any) {
    console.error('Error publishing to Central Exchange:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
