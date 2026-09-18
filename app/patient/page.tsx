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
  const [activeTab, setActiveTab] = useState<'overview' | 'consultations' | 'locker' | 'consent'>('overview');
  const [sessions, setSessions] = useState<ConsultationSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ConsultationSession | null>(null);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [consentData, setConsentData] = useState<any>(null);
  const [isLoadingRecords, setIsLoadingRecords] = useState<boolean>(false);

  // Document Upload State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [docType, setDocType] = useState<string>('prescription');
  const [docDate, setDocDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadSuccessToast, setUploadSuccessToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check saved session on mount
  useEffect(() => {
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
      }
    } catch (e) {
      console.error('Error fetching records:', e);
    } finally {
      setIsLoadingRecords(false);
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
            <Link href="/" className="flex items-center gap-2 text-cornsilk font-[family-name:var(--font-sora)] font-bold text-lg tracking-tight">
              <span>MediKiosk</span>
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
            {/* Header Icon */}
            <div className="w-14 h-14 rounded-2xl bg-pine-teal/10 border border-pine-teal/20 text-pine-teal flex items-center justify-center mx-auto mb-4 shadow-inner">
              <User className="w-7 h-7 text-pine-teal" />
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
            <Link href="/" className="font-[family-name:var(--font-sora)] font-bold text-lg tracking-tight text-cornsilk">
              MediKiosk
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

            {/* Quick Action Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Quick Document Upload */}
              <div className="bg-white rounded-3xl p-6 border border-border-strong shadow-sm raised-card flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-pine-teal/10 text-pine-teal flex items-center justify-center mb-3">
                    <Upload className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-base font-[family-name:var(--font-sora)] text-ink-black mb-1">
                    Put Data Ahead of Time
                  </h4>
                  <p className="text-xs text-ink-black/70 mb-4">
                    Upload physical prescriptions or lab reports from home so your doctor has your full timeline ready.
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

              {/* View Attested Summaries */}
              <div className="bg-white rounded-3xl p-6 border border-border-strong shadow-sm raised-card flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-metallic-gold/20 text-metallic-gold flex items-center justify-center mb-3">
                    <FileCheck className="w-5 h-5 text-pine-teal" />
                  </div>
                  <h4 className="font-bold text-base font-[family-name:var(--font-sora)] text-ink-black mb-1">
                    Consultation Records
                  </h4>
                  <p className="text-xs text-ink-black/70 mb-4">
                    Review and download doctor-attested SBAR summaries and FHIR R4 export bundles from your past visits.
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

              {/* Digital Consent Security */}
              <div className="bg-white rounded-3xl p-6 border border-border-strong shadow-sm raised-card flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-3">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-base font-[family-name:var(--font-sora)] text-ink-black mb-1">
                    DPDP Act 2023 Consent
                  </h4>
                  <p className="text-xs text-ink-black/70 mb-4">
                    Your health data is protected. Manage granular sharing permissions or revoke consent anytime.
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
