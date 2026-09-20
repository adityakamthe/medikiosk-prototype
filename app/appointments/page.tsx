'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  User,
  CheckCircle2,
  AlertTriangle,
  Stethoscope,
  ChevronRight,
  Printer,
  QrCode,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  HeartPulse,
  Sparkles,
  Phone,
  FileText
} from '@/components/Icons';

export default function AppointmentBookingPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/patient?tab=book_opd');
  }, [router]);

  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDeptCode, setSelectedDeptCode] = useState<string>('general_medicine');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedSlot, setSelectedSlot] = useState<string>('10:00 AM - 11:00 AM');
  const [clinicalMode, setClinicalMode] = useState<'allopathy' | 'ayurveda'>('allopathy');

  // Patient Ingestion Form State
  const [patientName, setPatientName] = useState<string>('');
  const [patientAge, setPatientAge] = useState<string>('35');
  const [patientGender, setPatientGender] = useState<string>('Male');
  const [patientPhone, setPatientPhone] = useState<string>('');
  const [abhaId, setAbhaId] = useState<string>('');
  const [insuranceId, setInsuranceId] = useState<string>('');
  const [emergencyContact, setEmergencyContact] = useState<string>('');

  // Submission & Result State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [confirmedAppointment, setConfirmedAppointment] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch departments & quotas
  const fetchDepartments = async () => {
    try {
      const res = await fetch(`/api/appointments?date=${selectedDate}`);
      const data = await res.json();
      if (data.departments) {
        setDepartments(data.departments);
      }
    } catch (e) {
      console.warn('Could not fetch appointments metadata:', e);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, [selectedDate]);

  // Current selected department object
  const activeDept = departments.find((d) => d.code === selectedDeptCode) || departments[0];

  // Quick fill demo profile
  const handleLoadDemoPatient = (type: 'allopathy' | 'ayush') => {
    if (type === 'ayush') {
      setPatientName('Sunil Verma');
      setPatientAge('48');
      setPatientGender('Male');
      setPatientPhone('9822019283');
      setAbhaId('91-8822-1144-5566');
      setInsuranceId('PMJAY-MH-829104');
      setEmergencyContact('Kavita Verma (Wife) - 9822019284');
      setSelectedDeptCode('ayush');
      setClinicalMode('ayurveda');
    } else {
      setPatientName('Rahul Sharma');
      setPatientAge('36');
      setPatientGender('Male');
      setPatientPhone('9876543210');
      setAbhaId('91-4582-7391-0428');
      setInsuranceId('PMJAY-DL-192837');
      setEmergencyContact('Anita Sharma (Sister) - 9876543211');
      setSelectedDeptCode('general_medicine');
      setClinicalMode('allopathy');
    }
  };

  // Submit appointment booking
  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!patientName.trim()) {
      setErrorMessage('Please enter the patient name.');
      return;
    }
    if (!patientPhone.trim() || patientPhone.trim().length < 10) {
      setErrorMessage('Please provide a valid 10-digit mobile number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_name: patientName.trim(),
          age: patientAge,
          gender: patientGender,
          phone: patientPhone.trim(),
          abha_id: abhaId.trim() || undefined,
          pmjay_insurance_id: insuranceId.trim() || undefined,
          emergency_contact: emergencyContact.trim() || undefined,
          department_code: selectedDeptCode,
          appointment_date: selectedDate,
          time_slot: selectedSlot,
          clinical_mode: selectedDeptCode === 'ayush' ? 'ayurveda' : clinicalMode
        })
      });

      const data = await res.json();
      if (res.ok && data.appointment) {
        setConfirmedAppointment(data.appointment);
      } else {
        setErrorMessage(data.error || 'Failed to book appointment');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error while booking appointment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-ink-black flex flex-col relative overflow-hidden">
      {/* Background Texture */}
      <img
        src="/assets/illustrations/bg-abstract.svg"
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.14] no-print"
      />

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-pine-teal no-print shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <Link href="/" className="flex items-center gap-2 hover:opacity-95 transition-opacity">
            <img
              src="/assets/logo/medikiosk-logo.png"
              alt="MediKiosk"
              className="h-7 md:h-8 w-auto object-contain"
            />
          </Link>
          <div className="flex items-center gap-2 md:gap-3">
            <span className="hidden text-xs text-cornsilk/80 md:inline font-medium">
              OPD Appointment & Health Ingestion Portal
            </span>
            <Link
              href="/patient"
              className="rounded-full border border-cornsilk/40 px-3.5 py-1.5 text-xs font-semibold text-cornsilk hover:bg-white/10 transition-colors"
            >
              Patient Portal
            </Link>
            <Link
              href="/kiosk"
              className="rounded-full bg-metallic-gold px-3.5 py-1.5 text-xs font-bold text-ink-black hover:brightness-105 transition-all"
            >
              Walk-in Kiosk
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 max-w-5xl mx-auto w-full p-4 md:p-6 my-auto">
        {/* VIEW 1: BOOKING FORM */}
        {!confirmedAppointment ? (
          <div className="space-y-6">
            {/* Page Header */}
            <div className="text-center max-w-2xl mx-auto mb-6">
              <span className="text-[11px] font-black uppercase tracking-widest text-[#004643] bg-white/70 border border-teal-200 px-3 py-1 rounded-full inline-flex items-center gap-1.5 shadow-xs">
                <Calendar className="w-3.5 h-3.5 text-[#004643]" />
                Online OPD Appointment Scheduling
              </span>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 mt-2">
                Book Hospital Consultation & Pre-Intake
              </h1>
              <p className="text-xs md:text-sm text-slate-600 mt-1">
                Select your clinical department, preferred date, and consulting doctor. Complete your history intake from home before hospital arrival.
              </p>

              {/* Quick Demo Pre-Fillers */}
              <div className="flex flex-wrap items-center justify-center gap-2 mt-3 text-xs font-bold">
                <span className="text-slate-500 font-semibold text-[11px]">Quick Demo Fill:</span>
                <button
                  type="button"
                  onClick={() => handleLoadDemoPatient('allopathy')}
                  className="px-2.5 py-1 bg-white border border-teal-300 rounded-lg text-[#004643] hover:bg-teal-50 text-[11px] cursor-pointer"
                >
                  General Medicine (Rahul)
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadDemoPatient('ayush')}
                  className="px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-amber-900 hover:bg-amber-50 text-[11px] cursor-pointer"
                >
                  AYUSH / Panchakarma (Sunil)
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className="bg-rose-50 border border-rose-300 text-rose-900 p-4 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleBookAppointment} className="space-y-6">
              {/* STEP 1: Department Selection Grid */}
              <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-black text-[#004643] uppercase tracking-wider">
                    1. Select Clinical Specialty
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">Step 1 of 3</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {departments.map((dept) => {
                    const isSelected = selectedDeptCode === dept.code;
                    return (
                      <button
                        key={dept.code}
                        type="button"
                        onClick={() => {
                          setSelectedDeptCode(dept.code);
                          setClinicalMode(dept.code === 'ayush' ? 'ayurveda' : 'allopathy');
                        }}
                        className={`text-left p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-[#004643] bg-teal-50/50 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-extrabold text-xs text-slate-900">{dept.name}</span>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-[#004643]" />}
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                            {dept.description}
                          </p>
                        </div>
                        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold">
                          <span className="text-slate-400">{dept.doctor?.room_number}</span>
                          <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            {dept.remaining_quota || 30} slots open
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* STEP 2: Date & Slot Picker */}
              <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-black text-[#004643] uppercase tracking-wider">
                    2. Select Consultation Date & Time Slot
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">Step 2 of 3</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Date Input */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Consultation Date
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#004643]"
                    />
                  </div>

                  {/* Doctor Details */}
                  <div className="sm:col-span-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-100 text-[#004643] flex items-center justify-center font-black">
                      <Stethoscope className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Consulting Physician</span>
                      <p className="text-xs font-extrabold text-slate-900">
                        {activeDept?.doctor?.name} ({activeDept?.doctor?.qualification})
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {activeDept?.doctor?.room_display} • {activeDept?.doctor?.floor}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Slots Chips */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-2">
                    Available OPD Time Slots ({selectedDate})
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(activeDept?.available_slots || [
                      '09:00 AM - 10:00 AM',
                      '10:00 AM - 11:00 AM',
                      '11:30 AM - 12:30 PM',
                      '02:00 PM - 03:00 PM',
                      '03:30 PM - 04:30 PM'
                    ]).map((slot: string) => {
                      const isSlotSelected = selectedSlot === slot;
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer flex items-center gap-1.5 ${
                            isSlotSelected
                              ? 'bg-[#004643] text-white border-[#004643] shadow-xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          <span>{slot}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* STEP 3: Patient Demographics & Health ID Ingestion */}
              <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-black text-[#004643] uppercase tracking-wider">
                    3. Patient Personal Details & Insurance Ingestion
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">Step 3 of 3</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Sharma"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#004643]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Age (Years) *</label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={patientAge}
                      onChange={(e) => setPatientAge(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#004643]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Gender *</label>
                    <select
                      value={patientGender}
                      onChange={(e) => setPatientGender(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#004643]"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">10-Digit Mobile Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9876543210"
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#004643]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      ABHA ID / Health Number (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="91-XXXX-XXXX-XXXX"
                      value={abhaId}
                      onChange={(e) => setAbhaId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:border-[#004643]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Ayushman Bharat PM-JAY / TPA Card (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. PMJAY-DL-82910"
                      value={insuranceId}
                      onChange={(e) => setInsuranceId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#004643]"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Emergency Contact Person & Phone (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Sunita Sharma (Wife) - 9876543212"
                      value={emergencyContact}
                      onChange={(e) => setEmergencyContact(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#004643]"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="touch-target px-8 py-3.5 bg-[#004643] hover:bg-teal-900 text-white rounded-2xl font-black text-sm flex items-center gap-2 shadow-md transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  <Calendar className="w-4 h-4" />
                  <span>{isSubmitting ? 'Confirming Appointment...' : 'Confirm Appointment & Generate Token Pass'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* VIEW 2: CONFIRMED APPOINTMENT PASS (PRINTABLE DATA-ONLY AREA) */
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="no-print text-center mb-4">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-2 shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-slate-900">OPD Appointment Confirmed!</h2>
              <p className="text-xs text-slate-600">
                Your hospital consultation pass is generated. You can print this slip or save it on your phone.
              </p>
            </div>

            {/* THE OFFICIAL PRINTABLE CONSULTATION PASS */}
            <div className="printable-area bg-white border-2 border-[#004643] rounded-3xl p-6 shadow-md relative overflow-hidden space-y-5">
              {/* Print-Only Medical Header */}
              <div className="border-b-2 border-slate-900 pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#004643] bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                      Official Hospital OPD Token Pass
                    </span>
                    <h3 className="text-lg font-black text-slate-900 mt-1">
                      {confirmedAppointment.hospital_name}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      National Ayushman Bharat Digital Mission (ABDM) Healthcare Node
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl md:text-3xl font-black text-[#004643] tracking-wider block font-mono">
                      {confirmedAppointment.appointment_token}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      ● Status: Confirmed
                    </span>
                  </div>
                </div>
              </div>

              {/* Patient Demographics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-400 text-[10px] font-bold block uppercase">Patient Name</span>
                  <span className="font-extrabold text-slate-900 text-sm truncate block">{confirmedAppointment.patient_name}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-400 text-[10px] font-bold block uppercase">Age / Gender</span>
                  <span className="font-bold text-slate-800">{confirmedAppointment.age} Yrs / {confirmedAppointment.gender}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-400 text-[10px] font-bold block uppercase">Mobile Phone</span>
                  <span className="font-mono font-bold text-slate-800">{confirmedAppointment.phone}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-400 text-[10px] font-bold block uppercase">ABHA ID</span>
                  <span className="font-mono font-bold text-slate-700 text-[11px] truncate block">
                    {confirmedAppointment.abha_id || 'Not Provided'}
                  </span>
                </div>
              </div>

              {/* Doctor & Room Allocation Banner */}
              <div className="bg-[#004643] text-white p-4 rounded-2xl shadow-sm space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-teal-200 text-[10px] font-black uppercase tracking-wider block">
                      Allocated Consultation Room
                    </span>
                    <p className="text-base md:text-lg font-black">
                      {confirmedAppointment.doctor?.room_display}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-teal-200 text-[10px] font-black uppercase tracking-wider block">
                      Date & Time Slot
                    </span>
                    <span className="bg-white/20 text-white font-extrabold text-xs px-2.5 py-1 rounded-lg inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {confirmedAppointment.appointment_date} • {confirmedAppointment.time_slot}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/20 flex flex-wrap items-center justify-between text-xs text-teal-100">
                  <span><strong>Physician:</strong> {confirmedAppointment.doctor?.name} ({confirmedAppointment.doctor?.qualification})</span>
                  <span>{confirmedAppointment.doctor?.floor}</span>
                </div>
              </div>

              {/* Fast On-Arrival Check-in Guidance */}
              <div className="bg-amber-50 border border-amber-200 text-amber-950 p-3.5 rounded-xl text-xs flex items-start gap-2.5">
                <QrCode className="w-6 h-6 text-amber-700 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-extrabold">Hospital Arrival Instructions:</p>
                  <p className="text-[11px] text-amber-900 mt-0.5">
                    Upon reaching the hospital, scan this pass at the MediKiosk entrance terminal or show your Token <strong>{confirmedAppointment.appointment_token}</strong> at Room <strong>{confirmedAppointment.doctor?.room_number}</strong>.
                  </p>
                </div>
              </div>

              {/* Print-Only Attestation Footer */}
              <div className="print-only pt-3 border-t border-slate-300 flex justify-between items-end text-[10px] text-slate-500">
                <span>Pass Issued: {new Date().toLocaleString('en-IN')}</span>
                <span>MediKiosk Digital OPD Platform • Valid on Appointment Date</span>
              </div>
            </div>

            {/* ACTION BUTTONS (HIDDEN IN PRINT) */}
            <div className="no-print flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-slate-100 text-[#004643] border border-[#004643] rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Appointment Pass</span>
              </button>

              <Link
                href={confirmedAppointment.pre_intake_link}
                className="w-full sm:w-auto px-6 py-3 bg-metallic-gold hover:brightness-105 text-ink-black rounded-2xl font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Complete Clinical Intake from Home (Voice/Touch)</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </main>

      <footer className="text-center text-xs text-ink-black/60 py-3 font-medium no-print">
        MediKiosk Centralized OPD Network • All India Institute of Ayurveda & ABDM Integrated
      </footer>
    </div>
  );
}
