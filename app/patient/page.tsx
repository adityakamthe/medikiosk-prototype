'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  FileText,
  Upload,
  ShieldCheck,
  Unlock,
  User,
  Clock,
  Calendar,
  Download,
  CheckCircle2,
  AlertTriangle,
  Stethoscope,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  QrCode,
  LogOut,
  FolderPlus,
  Activity,
  Pill,
  FileCheck,
  ShieldAlert
} from '@/components/Icons';

interface PatientProfile {
  patient_ref: string;
  name: string;
  abha_id: string;
  age: string;
  gender: string;
  queue_id: string;
  blood_group: string;
  phone: string;
  abha_status: string;
  allocated_doctor?: any;
}

interface ConsultationSession {
  id: string;
  queue_id: string;
  started_at: string;
  status: string;
  clinical_mode: string;
  patient_name: string;
  age: string;
  gender: string;
  document_count: number;
  red_flag_count: number;
  draft_summary?: any;
  attested_content?: any;
  attested_by?: string;
  attested_at?: string;
  allocated_doctor?: any;
  facility_source?: string;
  ayush_assessment_type?: string;
}

interface UploadedDocument {
  id: string;
  session_id: string;
  mime_type: string;
  uploaded_at: string;
  queue_id?: string;
  visit_date?: string;
  quality_check_result?: {
    quality?: string;
    sharpness_score?: number;
    document_type?: string;
    document_date?: string;
    extracted_summary?: any;
  };
}

export default function PatientPortalPage() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'abha' | 'queue'>('abha');
  const [identifierInput, setIdentifierInput] = useState<string>('91-8822-1144-5566');
  const [pinInput, setPinInput] = useState<string>('1234');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState<boolean>(false);

  // Patient data
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'consultations' | 'book_opd' | 'locker' | 'consent'>('overview');
  const [sessions, setSessions] = useState<ConsultationSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ConsultationSession | null>(null);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [consentData, setConsentData] = useState<any>(null);
  const [longitudinalExchange, setLongitudinalExchange] = useState<any>(null);
  const [isLoadingRecords, setIsLoadingRecords] = useState<boolean>(false);

  // In-Portal OPD Booking State
  const [bookingFacility, setBookingFacility] = useState<'aiims' | 'aiia'>('aiims');
  const [bookingDeptCode, setBookingDeptCode] = useState<string>('general_medicine');
  const [bookingDate, setBookingDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [bookingSlot, setBookingSlot] = useState<string>('10:00 AM - 11:00 AM');
  const [bookingSymptoms, setBookingSymptoms] = useState<string>('');
  const [isSubmittingBooking, setIsSubmittingBooking] = useState<boolean>(false);
  const [bookingConfirmed, setBookingConfirmed] = useState<any | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Document Upload State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [docType, setDocType] = useState<string>('prescription');
  const [docDate, setDocDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadSuccessToast, setUploadSuccessToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check saved session & URL search params on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      if (tabParam === 'book_opd' || tabParam === 'consultations' || tabParam === 'locker' || tabParam === 'consent') {
        setActiveTab(tabParam as any);
      }
    }

    const savedAuth = sessionStorage.getItem('medikiosk_patient_auth');
    const savedPatient = sessionStorage.getItem('medikiosk_patient_data');
    if (savedAuth === 'true' && savedPatient) {
      try {
        const parsed = JSON.parse(savedPatient);
        setPatient(parsed);
        setIsAuthenticated(true);
        loadPatientRecords(parsed.patient_ref, parsed.abha_id, parsed.queue_id);
      } catch {
        sessionStorage.removeItem('medikiosk_patient_auth');
      }
    }
  }, []);

  const handleLogin = async (e?: React.FormEvent, demoPayload?: { identifier: string; demo_profile?: string }) => {
    if (e) e.preventDefault();
    setIsSubmittingAuth(true);
    setAuthError(null);

    try {
      const payload = demoPayload
        ? { is_demo: true, demo_profile: demoPayload.demo_profile, identifier: demoPayload.identifier }
        : { identifier: identifierInput, password: pinInput, is_demo: false };

      const res = await fetch('/api/patient/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Authentication failed');
      }

      setPatient(data.patient);
      setIsAuthenticated(true);
      sessionStorage.setItem('medikiosk_patient_auth', 'true');
      sessionStorage.setItem('medikiosk_patient_data', JSON.stringify(data.patient));

      // Fetch records
      await loadPatientRecords(data.patient.patient_ref, data.patient.abha_id, data.patient.queue_id);
    } catch (err: any) {
      setAuthError(err.message || 'Login error occurred');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('medikiosk_patient_auth');
    sessionStorage.removeItem('medikiosk_patient_data');
    setIsAuthenticated(false);
    setPatient(null);
    setSessions([]);
    setSelectedSession(null);
  };

  const loadPatientRecords = async (patientRef: string, abhaId: string, queueId: string) => {
    setIsLoadingRecords(true);
    try {
      const params = new URLSearchParams({
        patient_ref: patientRef,
        abha_id: abhaId,
        queue_id: queueId
      });
      const res = await fetch(`/api/patient/records?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setSessions(data.sessions || []);
        if (data.sessions?.length > 0) {
          setSelectedSession(data.sessions[0]);
        }
        setDocuments(data.documents || []);
        setConsentData(data.consent);
        if (data.longitudinal_exchange) {
          setLongitudinalExchange(data.longitudinal_exchange);
        }
      }
    } catch (e) {
      console.error('Error fetching records:', e);
    } finally {
      setIsLoadingRecords(false);
    }
  };

  const handlePortalBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;
    setIsSubmittingBooking(true);
    setBookingError(null);

    try {
      const hospitalName = bookingFacility === 'aiia'
        ? 'All India Institute of Ayurveda (AIIA), New Delhi'
        : 'All India Institute of Medical Sciences (AIIMS), New Delhi';

      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_name: patient.name,
          age: patient.age,
          gender: patient.gender,
          phone: patient.phone || '9876543210',
          abha_id: patient.abha_id,
          department_code: bookingDeptCode,
          appointment_date: bookingDate,
          time_slot: bookingSlot,
          clinical_mode: bookingFacility === 'aiia' || bookingDeptCode === 'ayush' ? 'ayurveda' : 'allopathy',
          hospital_name: hospitalName
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to book appointment');
      }

      setBookingConfirmed(data.appointment);
      loadPatientRecords(patient.patient_ref, patient.abha_id, patient.queue_id);
    } catch (err: any) {
      setBookingError(err.message || 'Appointment booking failed');
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadFile(file);
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        setUploadPreview(loadEvt.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('document_type', docType);
      formData.append('document_date', docDate);
      formData.append('session_id', selectedSession?.id || patient?.queue_id || 'PATIENT_PORTAL');

      const res = await fetch('/api/patient/documents', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to upload document');
      }

      setUploadSuccessToast('Medical document digitized and added to your ABDM Health Locker.');
      setUploadFile(null);
      setUploadPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      // Reload records to show updated documents
      if (patient) {
        loadPatientRecords(patient.patient_ref, patient.abha_id, patient.queue_id);
      }
      setTimeout(() => setUploadSuccessToast(null), 5000);
    } catch (err: any) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const downloadFhirBundle = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/clinician/session/${sessionId}/fhir`);
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ABDM_FHIR_Record_${patient?.queue_id || 'visit'}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`FHIR Export error: ${err.message}`);
    }
  };

  const downloadTextSummary = (session: ConsultationSession) => {
    const summary = session.attested_content || session.draft_summary;
    const docName = session.allocated_doctor?.name || 'Attending Physician';
    const text = `
===================================================================
                    MEDIKIOSK OUTPATIENT HEALTH RECORD
      ABDM & DPDP Compliant • SIH 2026 • Ayushman Bharat Digital
===================================================================

PATIENT INFORMATION:
- Name: ${session.patient_name || patient?.name || 'Patient'}
- ABHA ID: ${patient?.abha_id || 'Verified'}
- Age/Gender: ${session.age || patient?.age || '40'} / ${session.gender || patient?.gender || 'N/A'}
- OPD Token: ${session.queue_id}
- Visit Date: ${new Date(session.started_at).toLocaleDateString('en-IN', { dateStyle: 'full' })}
- Consulting Doctor: ${docName} (${session.allocated_doctor?.room_display || 'OPD Room'})

CLINICAL SUMMARY (SBAR):
- Chief Complaint: ${summary?.chief_complaint || 'General medical follow-up'}
- History of Present Illness: ${summary?.hpi_verbatim || summary?.hpi || 'Evaluated during consultation.'}
- Key Clinical Findings: ${summary?.assessment || summary?.differential_diagnoses?.join(', ') || 'Stable'}
- Medications: ${Array.isArray(summary?.medications) ? summary.medications.map((m: any) => `${m.name || m} (${m.dosage || 'Standard'} ${m.frequency || ''})`).join('; ') : 'Reviewed'}
- Drug Allergies: ${summary?.allergies || 'No known contraindications recorded'}
- Prior Investigations: ${summary?.prior_investigations || 'Reviewed on file'}

ATTESTATION STATUS:
- Status: ${session.status === 'attested' ? 'Officially Attested by Physician' : 'Draft History Generated'}
- Attested By: ${session.attested_by || docName}
- Attested At: ${session.attested_at ? new Date(session.attested_at).toLocaleString() : 'Pending final physician sign-off'}

-------------------------------------------------------------------
Generated by MediKiosk AI Clinical Intake & Health Locker
===================================================================
    `.trim();

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MediKiosk_Summary_${session.queue_id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // -------------------------------------------------------------
  // VIEW: AUTHENTICATION SCREEN (Matching Clinician Portal Theme)
  // -------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-cornsilk text-ink-black flex flex-col font-[family-name:var(--font-inter)]">
        {/* Top bar */}
        <header className="bg-pine-teal text-white py-3 px-4 md:px-8 border-b border-teal-800 shadow-md">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
              <img
                src="/assets/logo/medikiosk-logo.png"
                alt="MediKiosk"
                className="h-7 md:h-8 w-auto object-contain"
              />
              <span className="text-[10px] uppercase font-bold tracking-widest bg-metallic-gold/20 text-metallic-gold border border-metallic-gold/40 px-2 py-0.5 rounded-full">
                Patient Portal
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <Link href="/kiosk" className="text-xs font-semibold px-3 py-1.5 rounded-full border border-cornsilk/30 text-cornsilk hover:bg-white/10 transition-all">
                Patient Kiosk
              </Link>
              <Link href="/clinician" className="text-xs font-semibold px-3 py-1.5 rounded-full bg-metallic-gold text-ink-black hover:brightness-105 transition-all">
                Clinician Portal
              </Link>
            </div>
          </div>
        </header>

        {/* Auth Body */}
        <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 md:p-8 shadow-xl border border-border-strong text-center raised-card animate-in fade-in duration-300">
            {/* Header Logo */}
            <div className="flex justify-center mb-4">
              <div className="bg-pine-teal px-5 py-2.5 rounded-2xl shadow-md inline-flex items-center justify-center">
                <img
                  src="/assets/logo/medikiosk-logo.png"
                  alt="MediKiosk"
                  className="h-7 w-auto object-contain"
                />
              </div>
            </div>

            <h1 className="text-2xl font-bold font-[family-name:var(--font-sora)] text-ink-black tracking-tight mb-1">
              Patient Health Portal
            </h1>
            <p className="text-xs md:text-sm text-ink-black/70 font-medium mb-6">
              Access your ABDM medical records, past OPD summaries, and put new prescriptions into your locker.
            </p>

            {/* Auth Mode Toggle */}
            <div className="flex rounded-full bg-cornsilk/80 p-1 border border-border-strong mb-5">
              <button
                type="button"
                onClick={() => { setAuthMode('abha'); setIdentifierInput('91-8822-1144-5566'); }}
                className={`flex-1 py-2 text-xs font-bold rounded-full transition-all cursor-pointer ${
                  authMode === 'abha'
                    ? 'bg-pine-teal text-white shadow-sm'
                    : 'text-ink-black/70 hover:text-ink-black'
                }`}
              >
                ABHA Number / ID
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('queue'); setIdentifierInput('Q-101'); }}
                className={`flex-1 py-2 text-xs font-bold rounded-full transition-all cursor-pointer ${
                  authMode === 'queue'
                    ? 'bg-pine-teal text-white shadow-sm'
                    : 'text-ink-black/70 hover:text-ink-black'
                }`}
              >
                OPD Token / Queue ID
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-ink-black uppercase tracking-wider mb-1.5">
                  {authMode === 'abha' ? 'ABHA Address or 14-Digit Number' : 'OPD Token or Mobile Number'}
                </label>
                <input
                  type="text"
                  value={identifierInput}
                  onChange={(e) => setIdentifierInput(e.target.value)}
                  placeholder={authMode === 'abha' ? 'e.g. 91-8822-1144-5566 or user@abdm' : 'e.g. Q-101 or 9876543210'}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-white border border-border-strong focus:border-pine-teal focus:ring-2 focus:ring-pine-teal/20 text-ink-black text-sm outline-none transition-all shadow-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-black uppercase tracking-wider mb-1.5">
                  Patient PIN or Password
                </label>
                <input
                  type="password"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="Enter 4-digit PIN or password"
                  className="w-full px-4 py-3 rounded-xl bg-white border border-border-strong focus:border-pine-teal focus:ring-2 focus:ring-pine-teal/20 text-ink-black text-sm outline-none transition-all shadow-sm"
                />
              </div>

              {authError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                  <span className="font-medium">{authError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmittingAuth}
                className="w-full py-3.5 rounded-full bg-metallic-gold hover:brightness-105 active:scale-[0.98] text-ink-black font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmittingAuth ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4 text-ink-black" />}
                <span>Unlock Patient Portal</span>
              </button>
            </form>

            {/* Quick Demo Access Buttons */}
            <div className="mt-6 pt-5 border-t border-border text-left">
              <p className="text-[11px] font-bold text-ink-black/60 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-pine-teal" />
                <span>Instant Demo Patient Profiles</span>
              </p>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => handleLogin(undefined, { identifier: '91-8822-1144-5566', demo_profile: 'general' })}
                  className="w-full text-left px-3 py-2 rounded-xl bg-cornsilk/50 hover:bg-cornsilk border border-border text-xs flex items-center justify-between transition-all cursor-pointer"
                >
                  <div>
                    <span className="font-bold text-pine-teal">Ravi Kumar</span>
                    <span className="text-ink-black/60 ml-1.5">(General Medicine · Token Q-101)</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-pine-teal" />
                </button>
                <button
                  type="button"
                  onClick={() => handleLogin(undefined, { identifier: '91-4433-2211-7788', demo_profile: 'ayush' })}
                  className="w-full text-left px-3 py-2 rounded-xl bg-cornsilk/50 hover:bg-cornsilk border border-border text-xs flex items-center justify-between transition-all cursor-pointer"
                >
                  <div>
                    <span className="font-bold text-pine-teal">Priya Sharma</span>
                    <span className="text-ink-black/60 ml-1.5">(AYUSH Dashavidha · Token Q-105)</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-pine-teal" />
                </button>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border text-[11px] text-ink-black/60 flex items-center justify-center gap-1.5 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-pine-teal flex-shrink-0" />
              <span>ABDM & DPDP Compliant • Personal Health Records (PHR)</span>
            </div>
          </div>

          <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-pine-teal hover:underline mt-6 transition-all">
            ← Return to MediKiosk Homepage
          </Link>
        </main>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW: AUTHENTICATED PATIENT DASHBOARD
  // -------------------------------------------------------------
  const activeVisit = sessions.find(s => s.status !== 'attested' && s.status !== 'completed') || sessions[0];

  return (
    <div className="min-h-screen bg-cornsilk text-ink-black flex flex-col font-[family-name:var(--font-inter)]">
      {/* Header */}
      <header className="bg-pine-teal text-white py-3 px-4 md:px-8 border-b border-teal-800 shadow-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-90">
              <img
                src="/assets/logo/medikiosk-logo.png"
                alt="MediKiosk"
                className="h-7 md:h-8 w-auto object-contain"
              />
            </Link>
            <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider bg-white/10 text-cornsilk border border-white/20 px-2 py-0.5 rounded-full">
              Patient Health Portal
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 bg-black/20 rounded-full px-3 py-1 border border-white/10 text-xs">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold text-cornsilk">{patient?.name}</span>
              <span className="text-cornsilk/60 text-[10px]">({patient?.abha_id})</span>
            </div>

            <Link
              href="/kiosk"
              className="text-xs font-semibold px-3 py-1.5 rounded-full bg-cornsilk/20 hover:bg-cornsilk/30 text-cornsilk transition-all"
            >
              Patient Kiosk
            </Link>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/30 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Patient Profile Bar */}
      <div className="bg-white border-b border-border shadow-xs py-3 px-4 md:px-8">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-pine-teal text-metallic-gold font-bold flex items-center justify-center font-[family-name:var(--font-sora)] text-sm shadow-xs">
              {patient?.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm md:text-base font-[family-name:var(--font-sora)] text-ink-black">
                  {patient?.name}
                </h2>
                <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-bold px-2 py-0.2 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-700" />
                  ABHA Active
                </span>
              </div>
              <p className="text-xs text-ink-black/60">
                ABHA ID: <span className="font-mono font-semibold text-pine-teal">{patient?.abha_id}</span> • {patient?.age} yrs, {patient?.gender} • Blood Group: <span className="font-bold text-ink-black">{patient?.blood_group}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => patient && loadPatientRecords(patient.patient_ref, patient.abha_id, patient.queue_id)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-cornsilk/60 hover:bg-cornsilk text-ink-black border border-border transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-pine-teal ${isLoadingRecords ? 'animate-spin' : ''}`} />
              <span>Sync Records</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto w-full p-4 md:p-8 flex-1 flex flex-col">
        {/* Toast */}
        {uploadSuccessToast && (
          <div className="mb-6 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs md:text-sm p-4 rounded-2xl flex items-center gap-3 shadow-md animate-in fade-in duration-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold">{uploadSuccessToast}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 border-b border-border">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-full text-xs md:text-sm font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'bg-pine-teal text-white shadow-sm'
                : 'bg-white text-ink-black/70 hover:text-ink-black border border-border'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Overview & OPD Queue</span>
          </button>

          <button
            onClick={() => setActiveTab('consultations')}
            className={`px-4 py-2 rounded-full text-xs md:text-sm font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'consultations'
                ? 'bg-pine-teal text-white shadow-sm'
                : 'bg-white text-ink-black/70 hover:text-ink-black border border-border'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Consultations & Summaries ({sessions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('book_opd')}
            className={`px-4 py-2 rounded-full text-xs md:text-sm font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'book_opd'
                ? 'bg-pine-teal text-white shadow-sm'
                : 'bg-white text-ink-black/70 hover:text-ink-black border border-border'
            }`}
          >
            <Calendar className="w-4 h-4 text-metallic-gold" />
            <span>Book OPD</span>
          </button>

          <button
            onClick={() => setActiveTab('locker')}
            className={`px-4 py-2 rounded-full text-xs md:text-sm font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'locker'
                ? 'bg-pine-teal text-white shadow-sm'
                : 'bg-white text-ink-black/70 hover:text-ink-black border border-border'
            }`}
          >
            <FolderPlus className="w-4 h-4" />
            <span>Medical Locker ({documents.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('consent')}
            className={`px-4 py-2 rounded-full text-xs md:text-sm font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'consent'
                ? 'bg-pine-teal text-white shadow-sm'
                : 'bg-white text-ink-black/70 hover:text-ink-black border border-border'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>ABHA & DPDP Consent</span>
          </button>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: OVERVIEW & OPD QUEUE TRACKER */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Live OPD Token Card */}
            {activeVisit && (
              <div className="bg-gradient-to-br from-pine-teal via-[#003835] to-[#0A5A55] text-white rounded-3xl p-6 md:p-8 shadow-xl border border-teal-700/60 relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-metallic-gold/10 rounded-full blur-2xl pointer-events-none" />

                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest bg-metallic-gold/20 text-metallic-gold border border-metallic-gold/40 px-3 py-1 rounded-full">
                      Active OPD Consultation Visit
                    </span>
                    <h3 className="text-3xl md:text-4xl font-black font-[family-name:var(--font-sora)] mt-2 text-white flex items-center gap-3">
                      Token #{activeVisit.queue_id}
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/20 text-cornsilk uppercase tracking-wider">
                        {activeVisit.status}
                      </span>
                    </h3>
                  </div>

                  <Link
                    href="/kiosk"
                    className="flex items-center gap-2 bg-metallic-gold hover:brightness-105 active:scale-95 text-ink-black font-extrabold text-xs md:text-sm px-5 py-3 rounded-full shadow-md transition-all cursor-pointer"
                  >
                    <Stethoscope className="w-4 h-4" />
                    <span>Open Pre-Consultation Kiosk</span>
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-white/10">
                  <div className="bg-white/10 rounded-2xl p-4 border border-white/10">
                    <p className="text-[11px] font-bold text-cornsilk/70 uppercase tracking-wider">Consulting Doctor</p>
                    <p className="text-base font-bold text-white mt-1">
                      {activeVisit.allocated_doctor?.name || 'Dr. Vikram Sharma'}
                    </p>
                    <p className="text-xs text-cornsilk/80">
                      {activeVisit.allocated_doctor?.specialty || 'General Medicine OPD'}
                    </p>
                  </div>

                  <div className="bg-white/10 rounded-2xl p-4 border border-white/10">
                    <p className="text-[11px] font-bold text-cornsilk/70 uppercase tracking-wider">Consultation Room</p>
                    <p className="text-base font-bold text-white mt-1">
                      {activeVisit.allocated_doctor?.room_display || 'Room 101 (General OPD)'}
                    </p>
                    <p className="text-xs text-cornsilk/80">
                      {activeVisit.allocated_doctor?.floor || 'Ground Floor, Central OPD Corridor'}
                    </p>
                  </div>

                  <div className="bg-white/10 rounded-2xl p-4 border border-white/10">
                    <p className="text-[11px] font-bold text-cornsilk/70 uppercase tracking-wider">Estimated Wait Time</p>
                    <p className="text-base font-bold text-metallic-gold mt-1 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-metallic-gold" />
                      Approx. 5–10 mins
                    </p>
                    <p className="text-xs text-cornsilk/80">
                      Current queue position: Next in line
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Historical Encounter Card Targeted by AYUSH (DB 2 / Longitudinal Exchange) */}
            {(sessions.some(s => s.clinical_mode === 'ayush' || s.facility_source?.includes('Ayurveda') || (s.draft_summary as any)?.ayush_dashavidha) || longitudinalExchange?.encounters?.some((e: any) => e.clinical_mode === 'ayurveda') || patient?.abha_id === '91-4433-2211-7788') && (
              <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-emerald-500/10 rounded-3xl p-6 border-2 border-amber-500/30 shadow-md space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-800 flex items-center justify-center font-bold text-lg">
                      🌿
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-sm md:text-base text-slate-900 font-[family-name:var(--font-sora)]">
                          Previous Clinical Appointment · Targeted by AYUSH
                        </h4>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                          Ayush Database (DB 2)
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        Facility: <span className="font-bold text-slate-800">All India Institute of Ayurveda (AIIA), New Delhi</span> · Dept of Kayachikitsa & Panchakarma
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab('consultations')}
                    className="text-xs font-bold text-pine-teal hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View Complete AYUSH Case Sheet</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
                  <div className="bg-white p-3.5 rounded-2xl border border-amber-200/60 shadow-xs">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Chief Complaint & Diagnosis</p>
                    <p className="font-bold text-slate-900 mt-1">Ajeerna (Mandagni / Chronic Indigestion)</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Post-prandial bloating, sluggish appetite, early morning joint stiffness</p>
                  </div>

                  <div className="bg-white p-3.5 rounded-2xl border border-amber-200/60 shadow-xs">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dosha & Agni Pariksha</p>
                    <p className="font-bold text-amber-800 mt-1">Prakriti: Vata-Pitta · Agni: Mandagni</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Vikriti: Vata-Kapha Prakopa in Asthi-Majja Dhatu</p>
                  </div>

                  <div className="bg-white p-3.5 rounded-2xl border border-amber-200/60 shadow-xs">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ayurvedic Formulations Prescribed</p>
                    <p className="font-bold text-slate-900 mt-1">Trikatu Churna (3g BD) · Ashwagandharishta</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Hingwashtak Churna with warm ghee-rice</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-amber-200/40">
                  <span>Consulting Vaidya: <strong className="text-slate-700">Dr. Suresh Varma (MD Ayur)</strong> (Reg: AIIA-REG-9482)</span>
                  <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200">
                    Targeted ABHA ID: {patient?.abha_id}
                  </span>
                </div>
              </div>
            )}

            {/* Quick Action Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Book In-Person OPD */}
              <div className="bg-white rounded-3xl p-5 border border-border-strong shadow-sm raised-card flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-metallic-gold/20 text-metallic-gold flex items-center justify-center mb-3">
                    <Calendar className="w-5 h-5 text-pine-teal" />
                  </div>
                  <h4 className="font-bold text-sm font-[family-name:var(--font-sora)] text-ink-black mb-1">
                    Book In-Person OPD
                  </h4>
                  <p className="text-xs text-ink-black/70 mb-4">
                    Schedule an outpatient consultation slot at AIIMS or AIIA AYUSH Institute.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('book_opd')}
                  className="w-full py-2.5 rounded-full bg-[#004643] hover:bg-teal-900 text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <span>Book Appointment</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Card 2: Quick Document Upload */}
              <div className="bg-white rounded-3xl p-5 border border-border-strong shadow-sm raised-card flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-pine-teal/10 text-pine-teal flex items-center justify-center mb-3">
                    <Upload className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-sm font-[family-name:var(--font-sora)] text-ink-black mb-1">
                    Put Data Ahead of Time
                  </h4>
                  <p className="text-xs text-ink-black/70 mb-4">
                    Upload physical prescriptions or lab reports from home before consultation.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('locker')}
                  className="w-full py-2.5 rounded-full bg-pine-teal hover:bg-teal-900 text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Open Medical Locker</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Card 3: View Attested Summaries */}
              <div className="bg-white rounded-3xl p-5 border border-border-strong shadow-sm raised-card flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-metallic-gold/20 text-metallic-gold flex items-center justify-center mb-3">
                    <FileCheck className="w-5 h-5 text-pine-teal" />
                  </div>
                  <h4 className="font-bold text-sm font-[family-name:var(--font-sora)] text-ink-black mb-1">
                    Consultation Records
                  </h4>
                  <p className="text-xs text-ink-black/70 mb-4">
                    Review and download doctor-attested SBAR summaries and FHIR R4 export bundles.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('consultations')}
                  className="w-full py-2.5 rounded-full bg-cornsilk hover:bg-amber-100 text-ink-black border border-border-strong text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>View All Summaries</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Card 4: Digital Consent Security */}
              <div className="bg-white rounded-3xl p-5 border border-border-strong shadow-sm raised-card flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-3">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-sm font-[family-name:var(--font-sora)] text-ink-black mb-1">
                    DPDP Act 2023 Consent
                  </h4>
                  <p className="text-xs text-ink-black/70 mb-4">
                    Your health data is protected. Manage granular sharing permissions anytime.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('consent')}
                  className="w-full py-2.5 rounded-full bg-cornsilk hover:bg-amber-100 text-ink-black border border-border-strong text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Consent Settings</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: CONSULTATIONS & SUMMARIES */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'consultations' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
            {/* Left Column: Sessions List */}
            <div className="lg:col-span-1 space-y-3">
              <h3 className="font-bold font-[family-name:var(--font-sora)] text-sm text-ink-black uppercase tracking-wider mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-pine-teal" />
                <span>Past OPD Visits ({sessions.length})</span>
              </h3>

              {sessions.length === 0 ? (
                <div className="bg-white rounded-2xl p-6 border border-border text-center text-xs text-ink-black/60">
                  No consultation visits recorded yet.
                </div>
              ) : (
                sessions.map((sess) => (
                  <div
                    key={sess.id}
                    onClick={() => setSelectedSession(sess)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      selectedSession?.id === sess.id
                        ? 'bg-white border-pine-teal ring-2 ring-pine-teal/20 shadow-md'
                        : 'bg-white/80 hover:bg-white border-border hover:border-border-strong'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold font-[family-name:var(--font-sora)] text-sm text-ink-black">
                        Token #{sess.queue_id}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        sess.status === 'attested'
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}>
                        {sess.status}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-pine-teal">
                      {sess.allocated_doctor?.name || 'Dr. Vikram Sharma'} ({sess.allocated_doctor?.department_name || 'General OPD'})
                    </p>

                    <p className="text-[11px] text-ink-black/60 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-ink-black/40" />
                      {new Date(sess.started_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Right Column: Detailed SBAR Summary Card */}
            <div className="lg:col-span-2">
              {selectedSession ? (
                <div className="bg-white rounded-3xl p-6 md:p-8 border border-border-strong shadow-md raised-card space-y-6">
                  {/* Summary Header */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-border">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-pine-teal/10 text-pine-teal border border-pine-teal/20">
                          {selectedSession.clinical_mode?.toUpperCase() || 'ALLOPATHY'} OPD RECORD
                        </span>
                        <span className="text-xs text-ink-black/60">
                          Visit Date: {new Date(selectedSession.started_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold font-[family-name:var(--font-sora)] text-ink-black mt-1">
                        Outpatient Consultation Summary (#{selectedSession.queue_id})
                      </h3>
                      <p className="text-xs text-ink-black/70">
                        Physician: <span className="font-bold text-pine-teal">{selectedSession.allocated_doctor?.name || 'Dr. Vikram Sharma'}</span> ({selectedSession.allocated_doctor?.room_display || 'Room 101'})
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => downloadTextSummary(selectedSession)}
                        className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-full bg-cornsilk hover:bg-amber-100 text-ink-black border border-border-strong transition-all cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Text</span>
                      </button>

                      <button
                        onClick={() => downloadFhirBundle(selectedSession.id)}
                        className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-full bg-pine-teal hover:bg-teal-900 text-white transition-all cursor-pointer shadow-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>ABDM FHIR Bundle</span>
                      </button>
                    </div>
                  </div>

                  {/* SBAR 8-Part Structured Content */}
                  {(() => {
                    const sbar = selectedSession.attested_content || selectedSession.draft_summary;
                    return (
                      <div className="space-y-4 text-xs md:text-sm">
                        {/* Chief Complaint */}
                        <div className="bg-cornsilk/40 rounded-2xl p-4 border border-border">
                          <p className="text-[11px] font-bold text-pine-teal uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Activity className="w-3.5 h-3.5" />
                            <span>1. Presenting Chief Complaint</span>
                          </p>
                          <p className="text-ink-black font-semibold">
                            {sbar?.chief_complaint || 'General medical follow-up consultation requested by patient.'}
                          </p>
                        </div>

                        {/* History of Present Illness (HPI) */}
                        <div className="bg-cornsilk/40 rounded-2xl p-4 border border-border">
                          <p className="text-[11px] font-bold text-pine-teal uppercase tracking-wider mb-1 flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5" />
                            <span>2. History of Present Illness (SOCRATES Framework)</span>
                          </p>
                          <p className="text-ink-black/90 whitespace-pre-line leading-relaxed">
                            {sbar?.hpi_verbatim || sbar?.hpi || 'Patient reported symptoms elicited through multimodal voice-touch interview. Probed onset, severity, and associated symptoms.'}
                          </p>
                        </div>

                        {/* Medications */}
                        <div className="bg-cornsilk/40 rounded-2xl p-4 border border-border">
                          <p className="text-[11px] font-bold text-pine-teal uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Pill className="w-3.5 h-3.5" />
                            <span>3. Medications & Dosages</span>
                          </p>
                          {Array.isArray(sbar?.medications) && sbar.medications.length > 0 ? (
                            <ul className="list-disc pl-5 space-y-1 text-ink-black">
                              {sbar.medications.map((m: any, idx: number) => (
                                <li key={idx} className="font-medium">
                                  {typeof m === 'string' ? m : `${m.name} — ${m.dosage || 'Standard'} (${m.frequency || 'OD'})`}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-ink-black/70 italic">Current medications confirmed and reconciled by physician.</p>
                          )}
                        </div>

                        {/* Allergies & Red Flags */}
                        <div className="bg-cornsilk/40 rounded-2xl p-4 border border-border">
                          <p className="text-[11px] font-bold text-pine-teal uppercase tracking-wider mb-1 flex items-center gap-1">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>4. Drug Allergies & Safety Verification</span>
                          </p>
                          <p className="text-ink-black">
                            {sbar?.allergies || 'No adverse drug reactions or allergies flagged in medical history.'}
                          </p>
                        </div>

                        {/* AYUSH Assessment Breakdown if present */}
                        {sbar?.ayush_dashavidha && (
                          <div className="bg-amber-500/10 rounded-2xl p-4 border border-amber-300">
                            <p className="text-[11px] font-bold text-amber-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <span>🌿 AYUSH Dashavidha Pariksha Clinical Evaluation</span>
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                              {Object.entries(sbar.ayush_dashavidha).map(([k, v]) => (
                                <div key={k} className="bg-white/80 p-2 rounded-xl border border-amber-200">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase block">{k.replace(/_/g, ' ')}</span>
                                  <span className="font-semibold text-amber-950">{String(v)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Attestation Stamp */}
                        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-center justify-between">
                          <div>
                            <p className="font-bold text-xs flex items-center gap-1.5 text-emerald-800">
                              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                              <span>Clinical Attestation Status</span>
                            </p>
                            <p className="text-[11px] text-emerald-900 mt-0.5">
                              {selectedSession.status === 'attested'
                                ? `Attested by ${selectedSession.attested_by || selectedSession.allocated_doctor?.name} on ${new Date(selectedSession.attested_at || selectedSession.started_at).toLocaleString()}`
                                : 'Draft Intake Completed — Pending final physician sign-off in consultation room'}
                            </p>
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 bg-emerald-200 rounded-md">
                            ABDM R4
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="bg-white rounded-3xl p-12 border border-border text-center text-ink-black/60">
                  Select a consultation visit from the left column to view the structured summary.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB: BOOK OPD APPOINTMENT (IN-PORTAL APPOINTMENT SCHEDULER) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'book_opd' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {bookingConfirmed ? (
              <div className="bg-white rounded-3xl p-6 md:p-8 border-2 border-emerald-500/40 shadow-xl space-y-6 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full border border-emerald-200">
                    OPD Appointment Confirmed
                  </span>
                  <h3 className="text-2xl md:text-3xl font-black font-[family-name:var(--font-sora)] text-slate-900 mt-2">
                    Token #{bookingConfirmed.appointment_token}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Your appointment has been registered at {bookingConfirmed.hospital_name}.
                  </p>
                </div>

                <div className="max-w-md mx-auto bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-left space-y-2">
                  <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                    <span className="text-slate-500">Patient Name:</span>
                    <span className="font-bold text-slate-900">{bookingConfirmed.patient_name}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                    <span className="text-slate-500">ABHA Number:</span>
                    <span className="font-mono font-bold text-pine-teal">{bookingConfirmed.abha_id || patient?.abha_id}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                    <span className="text-slate-500">Department:</span>
                    <span className="font-bold text-slate-900">{bookingConfirmed.department_name}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                    <span className="text-slate-500">Assigned Doctor:</span>
                    <span className="font-bold text-slate-900">{bookingConfirmed.doctor?.name} ({bookingConfirmed.doctor?.room_number})</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                    <span className="text-slate-500">Date & Slot:</span>
                    <span className="font-bold text-slate-900">{bookingConfirmed.appointment_date} · {bookingConfirmed.time_slot}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Clinical Stream:</span>
                    <span className="font-bold uppercase text-amber-800">{bookingConfirmed.clinical_mode}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <Link
                    href={bookingConfirmed.pre_intake_link || '/kiosk'}
                    className="px-6 py-3 rounded-full bg-metallic-gold hover:brightness-105 text-ink-black font-extrabold text-xs md:text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Stethoscope className="w-4 h-4" />
                    <span>Open Pre-Consultation Kiosk</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setBookingConfirmed(null);
                      setActiveTab('overview');
                    }}
                    className="px-6 py-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs md:text-sm transition-all cursor-pointer"
                  >
                    Back to Live Queue Tracker
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-6 md:p-8 border border-border-strong shadow-md raised-card space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="font-bold font-[family-name:var(--font-sora)] text-lg md:text-xl text-ink-black">
                      Schedule Outpatient OPD Appointment
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Book an in-person consultation slot. Your verified ABHA demographics will be linked automatically.
                    </p>
                  </div>
                  <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-pine-teal/10 text-pine-teal">
                    Patient Portal Integration
                  </span>
                </div>

                {bookingError && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{bookingError}</span>
                  </div>
                )}

                <form onSubmit={handlePortalBookAppointment} className="space-y-6">
                  {/* Step 1: Hospital Facility Selection */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      1. Select Target Hospital Facility
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div
                        onClick={() => {
                          setBookingFacility('aiims');
                          setBookingDeptCode('general_medicine');
                        }}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                          bookingFacility === 'aiims'
                            ? 'border-pine-teal bg-pine-teal/5 ring-1 ring-pine-teal'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-sm text-slate-900">AIIMS New Delhi</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            Database 1 · Allopathy
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Tertiary center for General Medicine, Cardiology, Orthopedics, Pediatrics.
                        </p>
                      </div>

                      <div
                        onClick={() => {
                          setBookingFacility('aiia');
                          setBookingDeptCode('ayush');
                        }}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                          bookingFacility === 'aiia'
                            ? 'border-amber-600 bg-amber-50/50 ring-1 ring-amber-600'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-sm text-slate-900">AIIA New Delhi (AYUSH)</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                            Database 2 · AYUSH
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          National institute for Dashavidha Pariksha, Panchakarma, and Ayurvedic Kayachikitsa.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Clinical Department Selection */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      2. Clinical Department & Specialty
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { code: 'general_medicine', name: 'General Medicine', mode: 'allopathy', room: 'Room 101 · Dr. Vikram Sharma' },
                        { code: 'ayush', name: 'Ministry of AYUSH', mode: 'ayurveda', room: 'Room 108 · Dr. Ananya Sen (AIIA)' },
                        { code: 'orthopedics', name: 'Orthopedics', mode: 'allopathy', room: 'Room 102 · Dr. Suresh Iyer' },
                        { code: 'pediatrics', name: 'Pediatrics', mode: 'allopathy', room: 'Room 104 · Dr. Meenakshi Rao' },
                      ].map((dept) => (
                        <div
                          key={dept.code}
                          onClick={() => {
                            setBookingDeptCode(dept.code);
                            if (dept.code === 'ayush') setBookingFacility('aiia');
                          }}
                          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                            bookingDeptCode === dept.code
                              ? 'border-[#004643] bg-[#004643]/10 font-bold'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <p className="text-xs font-bold text-slate-900">{dept.name}</p>
                          <p className="text-[10px] text-slate-500 mt-1">{dept.room}</p>
                          <span className={`inline-block mt-2 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                            dept.mode === 'ayurveda' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {dept.mode}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Step 3: Date & Slot Selection */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        3. Consultation Date
                      </label>
                      <input
                        type="date"
                        value={bookingDate}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setBookingDate(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-pine-teal"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        4. Time Slot
                      </label>
                      <select
                        value={bookingSlot}
                        onChange={(e) => setBookingSlot(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-pine-teal bg-white"
                      >
                        <option value="09:00 AM - 10:00 AM">09:00 AM - 10:00 AM (Early Morning)</option>
                        <option value="10:00 AM - 11:00 AM">10:00 AM - 11:00 AM (Standard OPD)</option>
                        <option value="11:30 AM - 12:30 PM">11:30 AM - 12:30 PM (Midday Slot)</option>
                        <option value="02:30 PM - 03:30 PM">02:30 PM - 03:30 PM (Afternoon OPD)</option>
                        <option value="04:00 PM - 05:00 PM">04:00 PM - 05:00 PM (Late Shift)</option>
                      </select>
                    </div>
                  </div>

                  {/* Step 4: Patient Information (Auto-Prefilled from Portal Profile) */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Verified Patient Demographics (Pre-filled from ABHA Profile)
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Name:</span>
                        <span className="font-bold text-slate-900">{patient?.name}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">ABHA ID:</span>
                        <span className="font-mono font-bold text-pine-teal">{patient?.abha_id}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Age & Gender:</span>
                        <span className="font-semibold text-slate-900">{patient?.age} yrs · {patient?.gender}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Mobile:</span>
                        <span className="font-semibold text-slate-900">{patient?.phone || '+91 98765 43210'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Reason for Visit */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Chief Health Concern or Symptoms (Optional for Pre-Intake)
                    </label>
                    <textarea
                      rows={2}
                      value={bookingSymptoms}
                      onChange={(e) => setBookingSymptoms(e.target.value)}
                      placeholder="e.g. Fever for 3 days, joint stiffness in knees, digestive bloating after meals..."
                      className="w-full px-4 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-pine-teal"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmittingBooking}
                    className="w-full py-3.5 bg-pine-teal hover:bg-teal-900 active:scale-[0.99] text-white rounded-xl text-xs md:text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingBooking ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Registering OPD Appointment...</span>
                      </>
                    ) : (
                      <>
                        <Calendar className="w-4 h-4 text-metallic-gold" />
                        <span>Confirm OPD Appointment at {bookingFacility === 'aiia' ? 'AIIA AYUSH' : 'AIIMS New Delhi'}</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 3: MEDICAL LOCKER (PUT DATA & DOCUMENTS) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'locker' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Upload Area Card */}
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-border-strong shadow-md raised-card">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-pine-teal/10 text-pine-teal flex items-center justify-center">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold font-[family-name:var(--font-sora)] text-base md:text-lg text-ink-black">
                    Put Data & Medical Documents Ahead of Time
                  </h3>
                  <p className="text-xs text-ink-black/70">
                    Upload your past prescriptions, lab test reports, or discharge summaries. The Module B AI engine will automatically digitize, extract medications, and timeline them for your doctor.
                  </p>
                </div>
              </div>

              <form onSubmit={handleUploadDocument} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-ink-black uppercase tracking-wider mb-1.5">
                      Document Classification
                    </label>
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white border border-border-strong text-xs md:text-sm font-semibold text-ink-black outline-none focus:border-pine-teal"
                    >
                      <option value="prescription">Prior Prescription (Rx)</option>
                      <option value="lab_report">Laboratory / Diagnostic Investigation</option>
                      <option value="discharge_summary">Hospital Discharge Summary</option>
                      <option value="ayush_record">AYUSH Consultation Note</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-ink-black uppercase tracking-wider mb-1.5">
                      Approximate Document Date
                    </label>
                    <input
                      type="date"
                      value={docDate}
                      onChange={(e) => setDocDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white border border-border-strong text-xs md:text-sm font-semibold text-ink-black outline-none focus:border-pine-teal"
                    >
                    </input>
                  </div>
                </div>

                {/* Drag-and-drop file input */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border-strong hover:border-pine-teal rounded-2xl p-6 text-center cursor-pointer bg-cornsilk/30 hover:bg-cornsilk/50 transition-all"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  {uploadPreview ? (
                    <div className="flex flex-col items-center gap-2">
                      <img
                        src={uploadPreview}
                        alt="Document Preview"
                        className="max-h-48 rounded-xl object-contain border border-border shadow-xs"
                      />
                      <p className="text-xs font-bold text-pine-teal">
                        Selected: {uploadFile?.name} ({(uploadFile!.size / 1024).toFixed(1)} KB)
                      </p>
                      <p className="text-[11px] text-ink-black/60">Click to replace file</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-8 h-8 text-pine-teal/60" />
                      <p className="text-xs md:text-sm font-bold text-ink-black">
                        Click or drag to upload medical document
                      </p>
                      <p className="text-[11px] text-ink-black/60">
                        Supports JPEG, PNG, or Camera Photos. Automatic dewarping and OCR will be performed.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!uploadFile || isUploading}
                    className="px-6 py-3 rounded-full bg-metallic-gold hover:brightness-105 active:scale-95 text-ink-black font-extrabold text-xs md:text-sm shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  >
                    {isUploading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Digitizing with Module B AI...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-pine-teal" />
                        <span>Digitize & Store in Locker</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Stored Documents Gallery */}
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-border-strong shadow-md raised-card">
              <h3 className="font-bold font-[family-name:var(--font-sora)] text-base text-ink-black uppercase tracking-wider mb-4 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-pine-teal" />
                <span>Stored Medical Documents ({documents.length})</span>
              </h3>

              {documents.length === 0 ? (
                <div className="text-center py-8 text-xs text-ink-black/60">
                  No medical documents stored yet. Use the uploader above to add your first prescription or report.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {documents.map((doc) => {
                    const qc = doc.quality_check_result;
                    return (
                      <div
                        key={doc.id}
                        className="p-4 rounded-2xl border border-border bg-cornsilk/20 hover:bg-cornsilk/40 transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-pine-teal/10 text-pine-teal border border-pine-teal/20">
                              {qc?.document_type || 'Prescription'}
                            </span>
                            <span className="text-[10px] text-ink-black/60">
                              {new Date(doc.uploaded_at).toLocaleDateString()}
                            </span>
                          </div>

                          <p className="text-xs font-bold text-ink-black">
                            Record #{doc.id.substring(0, 8)}
                          </p>

                          {qc?.extracted_summary?.medications && (
                            <p className="text-[11px] text-ink-black/80 mt-1 line-clamp-2">
                              Meds: {qc.extracted_summary.medications.map((m: any) => m.name || m).join(', ')}
                            </p>
                          )}
                        </div>

                        <div className="mt-4 pt-2 border-t border-border flex items-center justify-between text-[11px]">
                          <span className="text-emerald-800 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            {qc?.sharpness_score ? `${qc.sharpness_score}% Quality` : 'Processed'}
                          </span>
                          <span className="text-pine-teal font-semibold">ABDM Linked</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 4: ABHA & DPDP CONSENT MANAGER */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'consent' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-200">
            {/* Digital ABHA Card */}
            <div className="bg-gradient-to-br from-[#0c1618] via-pine-teal to-[#003835] text-white rounded-3xl p-6 md:p-8 shadow-xl border border-teal-600/40 relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-6 h-6 text-metallic-gold" />
                    <span className="font-[family-name:var(--font-sora)] font-bold text-sm text-cornsilk tracking-wider uppercase">
                      National Health Authority (NHA)
                    </span>
                  </div>
                  <span className="bg-metallic-gold/20 text-metallic-gold border border-metallic-gold/40 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                    Ayushman Bharat (ABDM)
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-[11px] text-cornsilk/60 uppercase tracking-widest font-semibold">Patient Name</p>
                    <p className="text-xl font-bold text-white font-[family-name:var(--font-sora)]">{patient?.name}</p>
                  </div>

                  <div>
                    <p className="text-[11px] text-cornsilk/60 uppercase tracking-widest font-semibold">ABHA Number</p>
                    <p className="text-lg font-mono font-bold text-metallic-gold">{patient?.abha_id}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[11px] text-cornsilk/60 uppercase tracking-widest font-semibold">Gender / Age</p>
                      <p className="text-sm font-semibold text-white">{patient?.gender} / {patient?.age} yrs</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-cornsilk/60 uppercase tracking-widest font-semibold">Health Locker</p>
                      <p className="text-sm font-semibold text-emerald-400">Connected (PHR-01)</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-cornsilk/70">
                <span>Verified via MediKiosk Bridge</span>
                <span className="font-mono">ABDM-M1-CERTIFIED</span>
              </div>
            </div>

            {/* DPDP Act 2023 Consent Manager */}
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-border-strong shadow-md raised-card flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-pine-teal font-bold font-[family-name:var(--font-sora)] text-base mb-2">
                  <ShieldCheck className="w-5 h-5 text-pine-teal" />
                  <span>Digital Personal Data Protection (DPDP) Act 2023</span>
                </div>

                <p className="text-xs text-ink-black/70 leading-relaxed mb-4">
                  Under the Digital Personal Data Protection Act 2023 and the National Health Authority guidelines, your clinical intake conversation, scanned records, and summaries are processed solely for outpatient triage and medical care.
                </p>

                <div className="space-y-3 text-xs">
                  <div className="bg-cornsilk/50 rounded-xl p-3 border border-border">
                    <p className="font-bold text-ink-black">Active Notice Version</p>
                    <p className="text-ink-black/70">{consentData?.notice_version || 'v1.0 (Hospital OPD Multimodal Intake)'}</p>
                  </div>

                  <div className="bg-cornsilk/50 rounded-xl p-3 border border-border">
                    <p className="font-bold text-ink-black">Processing Purpose</p>
                    <p className="text-ink-black/70">
                      {consentData?.purpose || 'Multimodal clinical history structuring, drug safety auditing, and direct synchronization with attending physician terminal.'}
                    </p>
                  </div>

                  <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200 text-emerald-950 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                    <span className="font-semibold text-[11px]">
                      Consent actively granted on {new Date(consentData?.consented_at || Date.now()).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                <span className="text-[11px] text-ink-black/60 font-medium">
                  Revocable at any moment
                </span>
                <button
                  onClick={() => alert('Consent settings updated. You can re-authorize during your next kiosk check-in.')}
                  className="px-4 py-2 rounded-full border border-border-strong hover:bg-rose-50 text-rose-800 text-xs font-bold transition-all cursor-pointer"
                >
                  Manage Permissions
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
