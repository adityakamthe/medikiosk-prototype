import { NextResponse } from 'next/server';
import { DOCTOR_ROSTER, DoctorProfile } from '@/lib/doctors';

interface AppointmentRecord {
  id: string;
  appointment_token: string;
  patient_name: string;
  age: string;
  gender: string;
  phone: string;
  abha_id?: string;
  pmjay_insurance_id?: string;
  emergency_contact?: string;
  hospital_name: string;
  department_name: string;
  department_code: string;
  doctor: DoctorProfile;
  appointment_date: string;
  time_slot: string;
  clinical_mode: 'allopathy' | 'ayurveda';
  status: 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED';
  created_at: string;
  checkin_qr_payload: string;
  pre_intake_link: string;
}

// In-Memory Appointment Store with pre-populated active appointments
let appointmentCounter = 201;
const APPOINTMENTS_STORE: AppointmentRecord[] = [
  {
    id: 'apt-001',
    appointment_token: 'APT-201',
    patient_name: 'Sunil Verma',
    age: '48',
    gender: 'Male',
    phone: '9822019283',
    abha_id: '91-8822-1144-5566',
    pmjay_insurance_id: 'PMJAY-MH-829104',
    emergency_contact: 'Kavita Verma (Wife) - 9822019284',
    hospital_name: 'All India Institute of Ayurveda (AIIA), New Delhi',
    department_name: 'Department of Kayachikitsa (Internal Medicine)',
    department_code: 'ayush',
    doctor: DOCTOR_ROSTER['ayush'],
    appointment_date: new Date().toISOString().split('T')[0],
    time_slot: '10:00 AM - 11:00 AM',
    clinical_mode: 'ayurveda',
    status: 'CONFIRMED',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    checkin_qr_payload: JSON.stringify({ apt: 'APT-201', pat: 'Sunil Verma', room: 'Room 108' }),
    pre_intake_link: '/kiosk?token=APT-201&mode=ayurveda'
  },
  {
    id: 'apt-002',
    appointment_token: 'APT-202',
    patient_name: 'Meena Kulkarni',
    age: '54',
    gender: 'Female',
    phone: '9845112233',
    abha_id: '91-4433-2211-7788',
    hospital_name: 'All India Institute of Medical Sciences (AIIMS), New Delhi',
    department_name: 'Department of Orthopedics',
    department_code: 'orthopedics',
    doctor: DOCTOR_ROSTER['orthopedics'],
    appointment_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    time_slot: '11:30 AM - 12:30 PM',
    clinical_mode: 'allopathy',
    status: 'CONFIRMED',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    checkin_qr_payload: JSON.stringify({ apt: 'APT-202', pat: 'Meena Kulkarni', room: 'Room 102' }),
    pre_intake_link: '/kiosk?token=APT-202&mode=allopathy'
  }
];

// Department catalog with quota limits
const DEPARTMENTS = [
  {
    code: 'general_medicine',
    name: 'General Medicine',
    description: 'Primary medical care, fever, diabetes, hypertension & acute illness',
    doctor: DOCTOR_ROSTER['general_medicine'],
    daily_quota: 40,
    available_slots: ['09:00 AM - 10:00 AM', '10:00 AM - 11:00 AM', '11:30 AM - 12:30 PM', '02:00 PM - 03:00 PM', '03:30 PM - 04:30 PM']
  },
  {
    code: 'ayush',
    name: 'Ministry of AYUSH (Panchakarma & Kayachikitsa)',
    description: 'Classical Ayurvedic medicine, Dashavidha Pariksha, Prakriti analysis & herbal therapy',
    doctor: DOCTOR_ROSTER['ayush'],
    daily_quota: 35,
    available_slots: ['09:30 AM - 10:30 AM', '10:30 AM - 11:30 AM', '12:00 PM - 01:00 PM', '02:30 PM - 03:30 PM', '04:00 PM - 05:00 PM']
  },
  {
    code: 'orthopedics',
    name: 'Orthopedics & Joint Care',
    description: 'Bone fractures, osteoarthritis, spine, sports injury & joint replacements',
    doctor: DOCTOR_ROSTER['orthopedics'],
    daily_quota: 30,
    available_slots: ['10:00 AM - 11:00 AM', '11:00 AM - 12:00 PM', '02:00 PM - 03:00 PM', '03:30 PM - 04:30 PM']
  },
  {
    code: 'pediatrics',
    name: 'Pediatrics & Child Health',
    description: 'Infant care, childhood infections, growth monitoring & vaccinations',
    doctor: DOCTOR_ROSTER['pediatrics'],
    daily_quota: 25,
    available_slots: ['09:00 AM - 10:00 AM', '10:30 AM - 11:30 AM', '02:00 PM - 03:00 PM']
  }
];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    // Compute slot availability
    const departmentsWithSlots = DEPARTMENTS.map((dept) => {
      const bookedCount = APPOINTMENTS_STORE.filter(
        (a) => a.department_code === dept.code && a.appointment_date === date && a.status !== 'CANCELLED'
      ).length;
      const remainingQuota = Math.max(0, dept.daily_quota - bookedCount);

      return {
        ...dept,
        booked_count: bookedCount,
        remaining_quota: remainingQuota,
        is_full: remainingQuota === 0
      };
    });

    return NextResponse.json({
      success: true,
      selected_date: date,
      departments: departmentsWithSlots,
      active_appointments: APPOINTMENTS_STORE
    });
  } catch (err: any) {
    console.error('Error fetching appointments info:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      patient_name,
      age = '35',
      gender = 'Male',
      phone,
      abha_id,
      pmjay_insurance_id,
      emergency_contact,
      department_code = 'general_medicine',
      appointment_date = new Date().toISOString().split('T')[0],
      time_slot = '10:00 AM - 11:00 AM',
      clinical_mode = 'allopathy',
      hospital_name = 'All India Institute of Ayurveda (AIIA), New Delhi'
    } = body;

    if (!patient_name || !phone) {
      return NextResponse.json({ error: 'Patient name and phone number are required' }, { status: 400 });
    }

    const dept = DEPARTMENTS.find((d) => d.code === department_code) || DEPARTMENTS[0];
    const assignedDoctor = dept.doctor;

    const tokenNumber = ++appointmentCounter;
    const appointmentToken = `APT-${tokenNumber}`;
    const appointmentId = `apt-${Date.now()}`;

    const checkinPayload = JSON.stringify({
      apt: appointmentToken,
      pat: patient_name,
      phone,
      dept: dept.name,
      room: assignedDoctor.room_number,
      date: appointment_date,
      time: time_slot
    });

    const preIntakeLink = `/kiosk?token=${appointmentToken}&name=${encodeURIComponent(patient_name)}&age=${age}&gender=${gender}&abha=${encodeURIComponent(abha_id || '')}&mode=${clinical_mode}`;

    const newAppointment: AppointmentRecord = {
      id: appointmentId,
      appointment_token: appointmentToken,
      patient_name,
      age: String(age),
      gender,
      phone,
      abha_id: abha_id?.trim() || undefined,
      pmjay_insurance_id: pmjay_insurance_id?.trim() || undefined,
      emergency_contact: emergency_contact?.trim() || undefined,
      hospital_name,
      department_name: dept.name,
      department_code: dept.code,
      doctor: assignedDoctor,
      appointment_date,
      time_slot,
      clinical_mode: (clinical_mode === 'ayurveda' || department_code === 'ayush') ? 'ayurveda' : 'allopathy',
      status: 'CONFIRMED',
      created_at: new Date().toISOString(),
      checkin_qr_payload: checkinPayload,
      pre_intake_link: preIntakeLink
    };

    APPOINTMENTS_STORE.unshift(newAppointment);

    return NextResponse.json({
      success: true,
      message: `Appointment confirmed successfully! Token: ${appointmentToken}`,
      appointment: newAppointment
    });
  } catch (err: any) {
    console.error('Error creating appointment:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
