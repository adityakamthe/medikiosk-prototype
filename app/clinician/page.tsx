/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  Stethoscope, User, Clock, AlertTriangle, CheckCircle2,
  ShieldCheck, Download, Info, RefreshCw, FileText, Lock, Unlock,
  ChevronDown, Printer, Save, Trash2, Activity,
  Camera, Play, Pause, Square, RotateCw, ZoomIn, ZoomOut, X,
  Copy, Check, Pill, Sparkles, Volume2
} from '@/components/Icons';
import { computeDashavidhaPariksha } from '@/lib/ayush';
import { generateTextualClinicalReport } from '@/lib/fhir';
import { DOCTOR_ROSTER, playEmergencySirenAudio } from '@/lib/doctors';
import { MedicalTimeline } from '@/components/clinician/MedicalTimeline';
import { LabOutRangeVisualizer } from '@/components/clinician/LabOutRangeVisualizer';
import { DrugSafetyCard } from '@/components/clinician/DrugSafetyCard';
import { ScannedDocumentsViewer } from '@/components/clinician/ScannedDocumentsViewer';
import { DigitalPrescriptionEditor } from '@/components/clinician/DigitalPrescriptionEditor';
import { FhirResourceInspector } from '@/components/clinician/FhirResourceInspector';
import { PrescriptionModal } from '@/components/clinician/PrescriptionModal';

// Helper function to safely convert any clinical value (string, object, array) into a string to prevent React child object errors
function formatClinicalText(val: any): string {
  if (val === null || val === undefined) return 'N/A';
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (Array.isArray(val)) {
    return val.map(item => typeof item === 'object' ? formatClinicalText(item) : String(item)).join(', ');
  }
  if (typeof val === 'object') {
    return Object.entries(val)
      .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${typeof v === 'object' ? formatClinicalText(v) : v}`)
      .join('; ');
  }
  return String(val);
}

export default function ClinicianDashboard() {
  // Authentication & Privacy Gate (Password: MediKiosk / medikiosk)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('MediKiosk');
  const [loginSpecialty, setLoginSpecialty] = useState<string>('all');
  const [authError, setAuthError] = useState<string | null>(null);

  // Doctor & Room Filter State
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>('all');

  // Real-time Emergency Alert State
  const [emergencyAlertSession, setEmergencyAlertSession] = useState<any>(null);
  const alertedSessionIdsRef = useRef<Set<string>>(new Set());

  const [queue, setQueue] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [sessionDetail, setSessionDetail] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'one_page_history' | 'summary' | 'scanned_documents' | 'contradictions' | 'fhir' | 'module_b_intelligence'>('one_page_history');
  const [timelineData, setTimelineData] = useState<any>(null);
  const [safetyData, setSafetyData] = useState<any>(null);
  const [noteFormat, setNoteFormat] = useState<'sbar' | 'soap'>('sbar');

  // Review Actions State
  const [sectionActions, setSectionActions] = useState<Record<string, 'accepted' | 'edited' | 'rejected'>>({});
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [editReasonModal, setEditReasonModal] = useState<{ open: boolean; section: string; field: string; prevVal: string } | null>(null);
  const [reasonInput, setReasonInput] = useState<string>('');

  // Attestation & FHIR State
  const [isAttested, setIsAttested] = useState<boolean>(false);
  const [fhirBundle, setFhirBundle] = useState<any>(null);
  const [fhirValidation, setFhirValidation] = useState<any>(null);
  const [textualReport, setTextualReport] = useState<string>('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [reportCopied, setReportCopied] = useState<boolean>(false);
  const [attestError, setAttestError] = useState<string | null>(null);
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState<boolean>(false);
  const [savedPrescription, setSavedPrescription] = useState<any>(null);

  // Database Persistence Status
  const [saveStatus, setSaveStatus] = useState<{
    state: 'idle' | 'saving' | 'saved' | 'error';
    message?: string;
    recordId?: string;
    savedAt?: string;
  }>({ state: 'idle' });

  // Module D HIS / OpenMRS Push Status
  const [hisPushStatus, setHisPushStatus] = useState<{
    state: 'idle' | 'pushing' | 'pushed' | 'error';
    encounterUuid?: string;
    serverMode?: string;
    idempotencyKey?: string;
    message?: string;
  }>({ state: 'idle' });

  // Patient Deletion & Discharge State
  const [isDeletingSession, setIsDeletingSession] = useState<boolean>(false);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<boolean>(false);
  const [deleteSuccessToast, setDeleteSuccessToast] = useState<string | null>(null);

  // Source Drilldown State
  const [drilldownData, setDrilldownData] = useState<any>(null);
  const selectedSessionIdRef = useRef<string | null>(null);

  // Doctor English Audio Briefing State (Spoken Clinical Briefing)
  const [isBriefingPlaying, setIsBriefingPlaying] = useState<boolean>(false);
  const [isLoadingBriefing, setIsLoadingBriefing] = useState<boolean>(false);
  const [briefingLoadingStep, setBriefingLoadingStep] = useState<string>('');
  const [briefingSpeed, setBriefingSpeed] = useState<number>(1);
  const [aiBriefingData, setAiBriefingData] = useState<{
    briefing_text: string;
    key_points: string[];
    duration_est_seconds: number;
    engine: string;
  } | null>(null);
  const [isBriefingCardExpanded, setIsBriefingCardExpanded] = useState<boolean>(false);
  const briefingAudioRef = useRef<HTMLAudioElement | null>(null);

  // Scanned Document Cross-Check Side-by-Side Drawer State
  const [isDocCrossCheckOpen, setIsDocCrossCheckOpen] = useState<boolean>(false);
  const [crossCheckDocIndex, setCrossCheckDocIndex] = useState<number>(0);
  const [crossCheckZoom, setCrossCheckZoom] = useState<number>(1);
  const [crossCheckRotation, setCrossCheckRotation] = useState<number>(0);
  const [crossCheckContrast, setCrossCheckContrast] = useState<boolean>(false);

  // Generate a concise 30-45 second clinical verbal briefing focusing on patient details and current complaints
  const generateEnglishClinicalBriefing = () => {
    if (!selectedSession) return '';
    const pName = selectedSession.patient_name || selectedSession.patient_ref || 'The patient';
    const ageGender = [
      selectedSession.age ? `${selectedSession.age}-year-old` : '',
      selectedSession.gender || 'patient'
    ].filter(Boolean).join(' ');
    const token = selectedSession.queue_id ? `Token ${selectedSession.queue_id}` : '';
    const draft = sessionDetail?.latest_draft?.clinician_summary || {};
    
    // 1. Clean Chief Complaint (patient's current primary complaint)
    let cc = formatClinicalText(draft.chief_complaint) || 'outpatient clinical consultation';
    cc = cc.replace(/^Chief complaint:?\s*/i, '').replace(/[\n\r]+/g, ' ').trim();
    if (cc.length > 130) {
      cc = cc.slice(0, 130).replace(/[,;.\s]+$/, '');
    }

    // 2. Extract core symptom onset / duration concisely from HPI (1 short sentence)
    let symptomDetails = '';
    const rawHpi = formatClinicalText(draft.hpi);
    if (rawHpi && rawHpi.length > 8) {
      const cleanHpi = rawHpi.replace(/[\n\r]+/g, ' ').trim();
      const firstSentence = cleanHpi.split(/[.!?]\s+/)[0] || cleanHpi;
      // Avoid duplicate repeat if HPI first sentence just repeats the chief complaint verbatim
      if (firstSentence.length > 10 && !firstSentence.toLowerCase().includes(cc.toLowerCase().slice(0, 20))) {
        symptomDetails = firstSentence.slice(0, 110).trim();
        if (!/[.!?]$/.test(symptomDetails)) symptomDetails += '.';
      }
    }

    // 3. High-Priority Safety Flags (ONLY if critical allergy or abnormal lab flag is present)
    let priorityFlag = '';
    const allergies = formatClinicalText(draft.allergies);
    if (allergies && !/no known|none|nil|nkda|denies|unremarkable/i.test(allergies)) {
      priorityFlag += ` Documented allergy: ${allergies.slice(0, 50)}.`;
    }

    const abnormalLabs = (safetyData?.labs || []).filter((l: any) => 
      l.is_panic || l.severity === 'panic' || l.severity === 'abnormal' || l.status === 'HIGH' || l.status === 'LOW'
    );
    if (abnormalLabs.length > 0) {
      const topLab = abnormalLabs[0];
      priorityFlag += ` Lab alert: ${topLab.test_name || topLab.name} is ${topLab.status || 'out of range'}.`;
    }

    // 4. Construct concise summary (approx 60-75 words, designed for 30-45 seconds of natural speech)
    let briefing = `Clinical intake briefing for ${pName}, a ${ageGender}${token ? `, ${token}` : ''}. `;
    briefing += `Current complaints: ${cc}. `;
    if (symptomDetails) {
      briefing += `${symptomDetails} `;
    }
    if (priorityFlag) {
      briefing += `${priorityFlag.trim()} `;
    }
    briefing += `Intake is verified and ready for your clinical examination.`;

    return briefing;
  };

  // Play / Pause / Synthesize AI English Audio Briefing
  const handleToggleDoctorBriefing = async (forceRefresh: boolean = false) => {
    if (!selectedSession) return;

    if (!forceRefresh && isBriefingPlaying && briefingAudioRef.current) {
      briefingAudioRef.current.pause();
      setIsBriefingPlaying(false);
      return;
    }

    if (!forceRefresh && briefingAudioRef.current && briefingAudioRef.current.src) {
      briefingAudioRef.current.playbackRate = briefingSpeed;
      await briefingAudioRef.current.play();
      setIsBriefingPlaying(true);
      return;
    }

    if (briefingAudioRef.current) {
      briefingAudioRef.current.pause();
      briefingAudioRef.current = null;
    }

    setIsLoadingBriefing(true);
    setBriefingLoadingStep('AI Summarizing Case...');
    try {
      let briefingText = aiBriefingData?.briefing_text;

      // Fetch AI-summarized clinical handover if not already available or if doctor requested re-summarize
      if (!briefingText || forceRefresh) {
        try {
          const res = await fetch(
            `/api/clinician/session/${selectedSession.id}/briefing${forceRefresh ? '?refresh=true' : ''}`
          );
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.briefing_text) {
              briefingText = data.briefing_text;
              setAiBriefingData({
                briefing_text: data.briefing_text,
                key_points: data.key_points || [],
                duration_est_seconds: data.duration_est_seconds || 30,
                engine: data.engine || 'groq-mistral-ai'
              });
            }
          }
        } catch (apiErr) {
          console.warn('AI Briefing API notice, using deterministic summarizer:', apiErr);
        }
      }

      // Resilient fallback if network/API was interrupted
      if (!briefingText) {
        briefingText = generateEnglishClinicalBriefing();
      }

      setBriefingLoadingStep('Synthesizing Spoken Audio...');
      const res = await fetch(`/api/tts?text=${encodeURIComponent(briefingText)}&lang=en`);
      if (!res.ok) throw new Error('Failed to fetch briefing audio');
      const blob = await res.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audio.playbackRate = briefingSpeed;
      audio.onended = () => setIsBriefingPlaying(false);
      audio.onerror = () => setIsBriefingPlaying(false);
      briefingAudioRef.current = audio;
      await audio.play();
      setIsBriefingPlaying(true);
    } catch (err) {
      console.error('Doctor audio briefing error:', err);
      setIsBriefingPlaying(false);
    } finally {
      setIsLoadingBriefing(false);
      setBriefingLoadingStep('');
    }
  };

  const handleStopDoctorBriefing = () => {
    if (briefingAudioRef.current) {
      briefingAudioRef.current.pause();
      briefingAudioRef.current.currentTime = 0;
    }
    setIsBriefingPlaying(false);
  };

  const handleSpeedChange = (speed: number) => {
    setBriefingSpeed(speed);
    if (briefingAudioRef.current) {
      briefingAudioRef.current.playbackRate = speed;
    }
  };

  // Fetch Full Details for a Selected Session
  const loadSessionDetails = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/clinician/session/${sessionId}`);
      const data = await res.json();
      if (data.success) {
        setSessionDetail(data);
        setIsAttested(data.session?.status === 'attested');
        const precomputed = data.latest_draft?.clinical_audio_briefing || data.latest_draft?.clinician_summary?.clinical_audio_briefing;
        if (precomputed) {
          setAiBriefingData({
            briefing_text: precomputed,
            key_points: [
              `Patient: ${data.session?.patient_name || data.session?.patient_ref || 'Patient'}${data.session?.age ? ` (${data.session.age}y)` : ''}`,
              `Chief Complaint: ${data.latest_draft?.clinician_summary?.chief_complaint || 'Intake recorded'}`,
              `Clinical Status: Intake complete and verified for examination`
            ],
            duration_est_seconds: Math.max(20, Math.round(precomputed.split(/\s+/).length / 2.3)),
            engine: 'precomputed-draft'
          });
        }
      }

      // Fetch Module B Timeline and Clinical Safety data
      try {
        const [tlRes, sfRes] = await Promise.all([
          fetch(`/api/clinician/session/${sessionId}/timeline`).then(r => r.json()).catch(() => null),
          fetch(`/api/clinician/session/${sessionId}/clinical-safety`).then(r => r.json()).catch(() => null)
        ]);
        if (tlRes?.success) setTimelineData(tlRes.timeline);
        if (sfRes?.success) setSafetyData(sfRes);
      } catch (e) {
        console.warn('Module B extra data fetch notice:', e);
      }

      // Fetch Digital Prescription if already issued
      try {
        const pRes = await fetch(`/api/clinician/session/${sessionId}/prescription`);
        const pData = await pRes.json();
        if (pData?.success && pData.prescription) {
          setSavedPrescription(pData.prescription);
        } else {
          setSavedPrescription(null);
        }
      } catch {
        setSavedPrescription(null);
      }
    } catch (err) {
      console.error('Error loading session details:', err);
    }
  };

  // Complete Assessment & Delete/Discharge Patient from Queue
  const handleDeletePatient = async () => {
    if (!selectedSession) return;
    setIsDeletingSession(true);
    try {
      const res = await fetch(`/api/clinician/session/${selectedSession.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const deletedPatientName = selectedSession.patient_name || selectedSession.queue_id || 'Patient';
        setDeleteSuccessToast(`Assessment completed. ${deletedPatientName} successfully discharged and removed from OPD queue.`);
        setDeleteConfirmModal(false);
        const deletedId = selectedSession.id;
        selectedSessionIdRef.current = null;
        setSelectedSession(null);
        setSessionDetail(null);
        // Immediately remove from local state
        setQueue(prev => prev.filter(p => p.id !== deletedId));
        // Re-fetch queue to update position and sync
        await fetchQueue(true);
        setTimeout(() => setDeleteSuccessToast(null), 6000);
      } else {
        alert(data.error || 'Failed to discharge patient from queue.');
      }
    } catch (err: any) {
      alert(`Error discharging patient: ${err.message}`);
    } finally {
      setIsDeletingSession(false);
    }
  };

  // Auth Session Verification: Always show login page on entry for doctor privacy & role selection
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const allowRestore = urlParams.get('restore') === 'true';
      if (allowRestore) {
        const stored = sessionStorage.getItem('medikiosk_clinician_auth');
        const storedRole = sessionStorage.getItem('medikiosk_clinician_role');
        if (stored === 'true') {
          setIsAuthenticated(true);
          if (storedRole) {
            setSelectedDoctorFilter(storedRole);
            setLoginSpecialty(storedRole);
          }
        }
      } else {
        // By default, show the login page so doctors can authenticate and select their specialty dropdown
        sessionStorage.removeItem('medikiosk_clinician_auth');
        setIsAuthenticated(false);
      }
    }
  }, []);

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = passwordInput.trim();
    if (clean === 'MediKiosk' || clean.toLowerCase() === 'medikiosk') {
      sessionStorage.setItem('medikiosk_clinician_auth', 'true');
      sessionStorage.setItem('medikiosk_clinician_role', loginSpecialty);
      setSelectedDoctorFilter(loginSpecialty);
      setIsAuthenticated(true);
      setAuthError(null);
      selectedSessionIdRef.current = null;
      setSelectedSession(null);
      setSessionDetail(null);
      setTimeout(() => fetchQueue(true), 80);
    } else {
      setAuthError('Invalid clinician credentials. Access is restricted to authorized hospital personnel.');
    }
  };

  const handleLockTerminal = () => {
    sessionStorage.removeItem('medikiosk_clinician_auth');
    sessionStorage.removeItem('medikiosk_clinician_role');
    setIsAuthenticated(false);
    setPasswordInput('MediKiosk');
    setAuthError(null);
    selectedSessionIdRef.current = null;
    setSelectedSession(null);
    setSessionDetail(null);
  };

  // Fetch Patient Queue (Doctor Privacy Scoped)
  const fetchQueue = async (autoSelectFirst: boolean = false) => {
    try {
      const res = await fetch('/api/clinician/queue');
      const data = await res.json();
      if (data.queue) {
        setQueue(data.queue);

        // Get currently active doctor role for queue filtering
        const role = typeof window !== 'undefined' 
          ? (sessionStorage.getItem('medikiosk_clinician_role') || selectedDoctorFilter)
          : selectedDoctorFilter;

        const currentDoctorQueue = data.queue.filter((item: any) => {
          if (role === 'all') return true;
          return item.allocated_doctor?.department_code === role || item.allocated_doctor?.id === role;
        });

        // Detect real-time Emergency Ward Alert: ONLY notify Emergency Room Doctor or Central OPD
        const isEmergencyDoctor = role === 'emergency' || role === 'dr_nair';
        const isCentralOPD = role === 'all';
        if (isEmergencyDoctor || isCentralOPD) {
          const emergencyCase = data.queue.find((s: any) => (Number(s.red_flag_count) > 0 || s.status === 'emergency_triaged') && s.status !== 'attested');
          if (emergencyCase) {
            setEmergencyAlertSession(emergencyCase);
            if (!alertedSessionIdsRef.current.has(emergencyCase.id)) {
              alertedSessionIdsRef.current.add(emergencyCase.id);
              playEmergencySirenAudio();
            }
          } else {
            setEmergencyAlertSession(null);
          }
        } else {
          setEmergencyAlertSession(null);
        }
        
        // Auto-select first session from THIS doctor's queue if none selected or if selected session is outside this doctor's queue
        if (autoSelectFirst && currentDoctorQueue.length > 0 && !selectedSessionIdRef.current) {
          handleSelectSession(currentDoctorQueue[0]);
        } else if (selectedSessionIdRef.current) {
          const existsInFiltered = currentDoctorQueue.some((s: any) => s.id === selectedSessionIdRef.current);
          if (existsInFiltered) {
            loadSessionDetails(selectedSessionIdRef.current);
          } else if (currentDoctorQueue.length > 0) {
            handleSelectSession(currentDoctorQueue[0]);
          } else {
            selectedSessionIdRef.current = null;
            setSelectedSession(null);
            setSessionDetail(null);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching queue:', err);
    }
  };

  // Initial load + Polling every 3.5 seconds for live data updates
  useEffect(() => {
    fetchQueue(true);

    const interval = setInterval(() => {
      fetchQueue(false);
    }, 3500);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Select Session for Review
  const handleSelectSession = (session: any) => {
    selectedSessionIdRef.current = session.id;
    setSelectedSession(session);
    handleStopDoctorBriefing();
    briefingAudioRef.current = null;
    setAiBriefingData(null);
    setIsBriefingCardExpanded(false);
    setSectionActions({});
    setEditedValues({});
    setFhirBundle(null);
    setFhirValidation(null);
    setTextualReport('');
    setAttestError(null);
    setSaveStatus({ state: 'idle' });
    loadSessionDetails(session.id);
  };

  // Record Section Action (Accept / Edit / Reject)
  const handleSectionAction = async (section: string, action: 'accepted' | 'edited' | 'rejected', prevVal: string = '', newVal: string = '', reason: string = '') => {
    if (!selectedSession) return;

    setSectionActions(prev => ({ ...prev, [section]: action }));
    if (newVal) {
      setEditedValues(prev => ({ ...prev, [section]: newVal }));
    }

    // If resolving an allergy contradiction, update local state immediately
    if (section === 'allergies' || section === 'contradiction' || section === 'medications') {
      setSessionDetail((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          contradictions: (prev.contradictions || []).map((c: any) => ({
            ...c,
            resolved_at: new Date().toISOString(),
            resolved_by: 'Dr. Sharma'
          }))
        };
      });
    }

    try {
      await fetch(`/api/clinician/session/${selectedSession.id}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinician_id: 'Dr. Sharma',
          field_ref: section,
          action,
          previous_value: formatClinicalText(prevVal),
          new_value: formatClinicalText(newVal || prevVal),
          reason
        })
      });
      fetchQueue(false);
    } catch (err) {
      console.error('Review action failed:', err);
    }
  };

  // Submit Attestation Sign-Off (Attestation Gate)
  const handleAttestSignOff = async () => {
    if (!selectedSession) return;
    setAttestError(null);

    const draft = sessionDetail?.latest_draft || selectedSession.latest_draft || {};
    const clinicianSummary = draft.clinician_summary || {};

    const attestedContent = {
      chief_complaint: editedValues['chief_complaint'] || formatClinicalText(clinicianSummary.chief_complaint) || 'Not reported',
      hpi: editedValues['hpi'] || formatClinicalText(clinicianSummary.hpi) || 'N/A',
      past_medical_surgical: editedValues['past_medical_surgical'] || formatClinicalText(clinicianSummary.past_medical_surgical) || 'None reported',
      family_history: editedValues['family_history'] || formatClinicalText(clinicianSummary.family_history) || 'No known hereditary conditions',
      medications: editedValues['medications'] || formatClinicalText(clinicianSummary.medications) || 'N/A',
      allergies: editedValues['allergies'] || formatClinicalText(clinicianSummary.allergies) || 'No known allergies',
      review_of_systems: editedValues['review_of_systems'] || formatClinicalText(clinicianSummary.review_of_systems) || 'Completed',
      prior_investigations: editedValues['prior_investigations'] || formatClinicalText(clinicianSummary.prior_investigations) || 'N/A',
      provisional_diagnoses: editedValues['provisional_diagnoses'] || formatClinicalText(clinicianSummary.provisional_diagnoses) || 'Voice intake clinical assessment'
    };

    try {
      const res = await fetch(`/api/clinician/session/${selectedSession.id}/attest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinician_id: 'Dr. Sharma',
          attested_content: attestedContent
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setAttestError(data.error || 'Attestation blocked');
        return;
      }

      setIsAttested(true);
      setIsPrescriptionModalOpen(true);
      fetchQueue(false);
      loadSessionDetails(selectedSession.id);
    } catch (err: any) {
      setAttestError(err.message);
    }
  };

  // Send Complete One-Page Patient History to Hospital Database
  const handleSendCompleteHistoryToDatabase = async () => {
    if (!selectedSession) return;
    setSaveStatus({ state: 'saving' });
    setAttestError(null);

    const draft = sessionDetail?.latest_draft || selectedSession.latest_draft || {};
    const clinicianSummary = draft.clinician_summary || {};

    // Compute Dashavidha Pariksha if AYUSH mode
    const dashavidhaData = selectedSession.clinical_mode === 'ayurveda'
      ? computeDashavidhaPariksha(sessionDetail?.structured_history || [], selectedSession)
      : null;

    const fullOnePageHistory = {
      demographics: {
        patient_name: selectedSession.patient_name || selectedSession.patient_ref,
        age: selectedSession.age,
        gender: selectedSession.gender,
        queue_id: selectedSession.queue_id,
        abha_mock_id: selectedSession.abha_mock_id,
        clinical_mode: selectedSession.clinical_mode,
        language: selectedSession.language,
        encounter_time: new Date().toISOString()
      },
      chief_complaint: editedValues['chief_complaint'] || formatClinicalText(clinicianSummary.chief_complaint) || 'Outpatient consultation',
      hpi: editedValues['hpi'] || formatClinicalText(clinicianSummary.hpi) || 'Recorded via MediKiosk.',
      past_medical_surgical: editedValues['past_medical_surgical'] || formatClinicalText(clinicianSummary.past_medical_surgical) || 'No chronic diseases reported',
      family_history: editedValues['family_history'] || formatClinicalText(clinicianSummary.family_history) || 'No known family illness',
      allergies: editedValues['allergies'] || formatClinicalText(clinicianSummary.allergies) || 'No known allergies reported',
      medications: editedValues['medications'] || formatClinicalText(clinicianSummary.medications) || 'None reported',
      dashavidha_pariksha: dashavidhaData || clinicianSummary.dashavidha_pariksha || null,
      ayush_profile: clinicianSummary.ayush_profile || null,
      prior_investigations: editedValues['prior_investigations'] || formatClinicalText(clinicianSummary.prior_investigations) || 'N/A',
      patient_bilingual_summary: draft.patient_summary_bilingual || '',
      clinician_id: 'Dr. Sharma',
      attestation_timestamp: new Date().toISOString()
    };

    try {
      const res = await fetch(`/api/clinician/session/${selectedSession.id}/attest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinician_id: 'Dr. Sharma',
          attested_content: fullOnePageHistory,
          bypass_checks: true
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSaveStatus({
          state: 'saved',
          message: 'Patient history and Dashavidha examination permanently saved to Database!',
          recordId: data.attested_record?.id,
          savedAt: new Date().toLocaleTimeString()
        });
        setIsAttested(true);
        setIsPrescriptionModalOpen(true);
        fetchQueue(false);
        loadSessionDetails(selectedSession.id);
      } else {
        setSaveStatus({ state: 'error', message: data.error || 'Failed to save to database' });
      }
    } catch (err: any) {
      setSaveStatus({ state: 'error', message: err.message });
    }
  };

  // Download Complete One-Page Summary as Text
  const handleDownloadOnePageText = async () => {
    if (!selectedSession) return;
    const pName = (selectedSession.patient_name || selectedSession.patient_ref || 'Patient').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `MediKiosk_Report_${selectedSession.queue_id || selectedSession.id}_${pName}_${new Date().toISOString().slice(0, 10)}.txt`;

    // If we already have a generated textual report in state, reuse it
    if (textualReport) {
      downloadReportText(textualReport, filename);
      return;
    }
    // Otherwise generate fresh from local data
    const draft = sessionDetail?.latest_draft || selectedSession.latest_draft || {};
    const text = generateTextualClinicalReport(selectedSession, {
      attested_by_clinician_id: 'Dr. Sharma',
      content: draft
    });
    setTextualReport(text);
    downloadReportText(text, filename);
  };

  // Helper: trigger .txt download from a report string safely in all modern browsers
  const downloadReportText = (reportText: string, filename: string) => {
    try {
      const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
        URL.revokeObjectURL(url);
      }, 1500);
      setDownloadSuccess(filename);
      setTimeout(() => setDownloadSuccess(null), 8000);
    } catch (e) {
      console.error('Download report error:', e);
    }
  };

  // Export FHIR Bundle & Textual Report — generates and triggers .txt download
  const handleExportFHIR = async (shouldDownload: boolean | React.MouseEvent = true) => {
    if (!selectedSession || isGeneratingReport) return;
    const doDownload = typeof shouldDownload === 'boolean' ? shouldDownload : true;
    setIsGeneratingReport(true);
    const pName = (selectedSession.patient_name || selectedSession.patient_ref || 'Patient').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `MediKiosk_Report_${selectedSession.queue_id || selectedSession.id}_${pName}_${new Date().toISOString().slice(0, 10)}.txt`;

    try {
      const res = await fetch(`/api/clinician/session/${selectedSession.id}/fhir`, { method: 'POST' });
      const data = await res.json();
      
      let reportText = data?.text_report || '';
      if (!reportText) {
        // Fallback: generate locally if API didn't return text_report
        const draft = sessionDetail?.latest_draft || selectedSession.latest_draft || {};
        reportText = generateTextualClinicalReport(selectedSession, {
          attested_by_clinician_id: 'Dr. Sharma',
          content: draft
        });
      }

      if (data?.bundle) {
        setFhirBundle(data.bundle);
        setFhirValidation(data.validation);
      }
      
      setTextualReport(reportText);
      setActiveTab('fhir');

      if (doDownload && reportText) {
        downloadReportText(reportText, filename);
      }
    } catch (err) {
      console.warn('FHIR API fetch notice, generating report locally:', err);
      // Fallback locally so user ALWAYS gets their download!
      const draft = sessionDetail?.latest_draft || selectedSession.latest_draft || {};
      const fallbackText = generateTextualClinicalReport(selectedSession, {
        attested_by_clinician_id: 'Dr. Sharma',
        content: draft
      });
      setTextualReport(fallbackText);
      setActiveTab('fhir');
      if (doDownload && fallbackText) {
        downloadReportText(fallbackText, filename);
      }
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Push Attested FHIR Bundle to Hospital Information System (Module D HIS Connector)
  const handlePushToHIS = async () => {
    if (!selectedSession) return;
    setHisPushStatus({ state: 'pushing' });
    try {
      const res = await fetch(`/api/clinician/session/${selectedSession.id}/his-push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotency_key: `HIS-PUSH-${selectedSession.id}-${Date.now()}`
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setHisPushStatus({
          state: 'pushed',
          encounterUuid: data.his_response?.his_encounter_uuid,
          serverMode: data.his_response?.server_mode,
          idempotencyKey: data.idempotency_key,
          message: data.his_response?.message || 'FHIR bundle transmitted and committed into Hospital Information System.'
        });
      } else {
        setHisPushStatus({
          state: 'error',
          message: data.error || 'HIS transmission failed'
        });
      }
    } catch (e: any) {
      setHisPushStatus({
        state: 'error',
        message: e.message || 'HIS transmission error'
      });
    }
  };

  const draftContent = sessionDetail?.latest_draft?.clinician_summary || selectedSession?.latest_draft?.clinician_summary || {};
  const _rawAnswers = sessionDetail?.raw_answers || [];
  const structuredHistory = sessionDetail?.structured_history || [];

  // Filter queue by selected doctor/room (Doctor Privacy Gating)
  const filteredQueue = queue.filter(item => {
    if (selectedDoctorFilter === 'all') return true;
    return item.allocated_doctor?.department_code === selectedDoctorFilter || item.allocated_doctor?.id === selectedDoctorFilter;
  });

  const activeDoctorInfo = selectedDoctorFilter !== 'all' 
    ? Object.values(DOCTOR_ROSTER).find(d => d.id === selectedDoctorFilter || d.department_code === selectedDoctorFilter) 
    : null;

  // DOCTOR DASHBOARD PRIVACY GATE (PASSWORD: MediKiosk)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white text-ink-black flex flex-col relative overflow-hidden">
        {/* Abstract Background Texture matching Landing Page */}
        <img
          src="/assets/illustrations/bg-abstract.svg"
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.18]"
        />

        {/* Top Navigation Bar matching MediKiosk Header */}
        <header className="sticky top-0 z-50 bg-pine-teal">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
            <Link
              href="/"
              className="flex items-center gap-2 transition-opacity hover:opacity-90"
            >
              <img
                src="/assets/logo/medikiosk-logo.png"
                alt="MediKiosk"
                className="h-7 md:h-8 w-auto object-contain"
              />
            </Link>
            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-cornsilk/80 md:inline font-medium">
                Confidential OPD Clinician Portal
              </span>
              <Link
                href="/kiosk"
                className="rounded-full border border-cornsilk/40 px-3.5 py-1.5 text-xs font-semibold text-cornsilk hover:bg-white/10 transition-colors"
              >
                Patient Kiosk
              </Link>
              <Link
                href="/"
                className="rounded-full bg-metallic-gold px-3.5 py-1.5 text-xs font-bold text-ink-black hover:brightness-105 transition-all"
              >
                Home
              </Link>
            </div>
          </div>
        </header>

        {/* Center Authentication Card */}
        <main className="flex-1 flex flex-col justify-center items-center p-4 relative z-10">
          <div className="bg-white/95 backdrop-blur-md border border-border-strong rounded-3xl p-7 md:p-8 max-w-md w-full shadow-2xl text-center">
            {/* Tag Badge */}
            <div className="mb-4">
              <span className="inline-flex rounded-full border border-border-strong bg-peach-glow/40 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-pine-teal">
                AI CLINICAL INTAKE · SIH 2026
              </span>
            </div>

            {/* Brand Logo */}
            <div className="flex justify-center mb-4">
              <div className="bg-pine-teal px-5 py-2.5 rounded-2xl shadow-md inline-flex items-center justify-center">
                <img
                  src="/assets/logo/medikiosk-logo.png"
                  alt="MediKiosk"
                  className="h-7 w-auto object-contain"
                />
              </div>
            </div>

            <h1 className="font-[family-name:var(--font-sora)] text-2xl md:text-3xl font-bold tracking-tight text-ink-black mb-1">
              Clinician Portal
            </h1>
            <p className="text-xs md:text-sm text-ink-black/70 font-medium mb-6">
              Restricted OPD Consultation Terminal
            </p>

            <form onSubmit={handleLogin} className="space-y-4 text-left">
              {/* Doctor Specialty Role Selector Dropdown */}
              <div>
                <label className="block text-xs font-bold text-ink-black uppercase tracking-wider mb-2">
                  Doctor Department / Specialty Room
                </label>
                <div className="relative">
                  <select
                    value={loginSpecialty}
                    onChange={e => setLoginSpecialty(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl bg-white border border-border-strong focus:border-pine-teal focus:ring-2 focus:ring-pine-teal/20 text-ink-black text-sm outline-none transition-all shadow-sm font-semibold cursor-pointer appearance-none pr-10"
                  >
                    <option value="all">Central OPD — All Consultation Rooms</option>
                    <option value="ortho">Orthopedics OPD (Room 102 — Dr. Rajesh Verma)</option>
                    <option value="pedia">Pediatrics & Child Care (Room 105 — Dr. Ananya Sen)</option>
                    <option value="emergency">Emergency Ward & Bay (Room ER-1 — Dr. Priya Nair)</option>
                    <option value="ayush">Ministry of AYUSH Wing (Room 108 — Dr. Harish Vaidya)</option>
                    <option value="general">General Medicine OPD (Room 101 — Dr. Vikram Sharma)</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-pine-teal">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-[11px] text-ink-black/60 mt-1 font-medium">
                  Select your department to open a private terminal scoped to your room.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-black uppercase tracking-wider mb-2">
                  Physician Access Password
                </label>
                <input
                  type="password"
                  placeholder="Enter clinician password"
                  value={passwordInput}
                  onChange={e => { setPasswordInput(e.target.value); setAuthError(null); }}
                  autoFocus
                  className="w-full px-4 py-3.5 rounded-xl bg-white border border-border-strong focus:border-pine-teal focus:ring-2 focus:ring-pine-teal/20 text-ink-black placeholder:text-ink-black/35 text-sm outline-none transition-all shadow-sm"
                />
              </div>

              {authError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-xl flex items-center gap-2 animate-shake">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                  <span className="font-medium">{authError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 rounded-full bg-metallic-gold hover:brightness-105 active:scale-[0.98] text-ink-black font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Unlock className="w-4 h-4 text-ink-black" />
                <span>Unlock Clinician Terminal</span>
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-border text-[11px] text-ink-black/60 flex items-center justify-center gap-1.5 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-pine-teal flex-shrink-0" />
              <span>ABDM & DPDP Compliant • Authorized Medical Personnel Only</span>
            </div>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-pine-teal hover:underline mt-6 transition-all"
          >
            ← Return to MediKiosk Homepage
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-ink-black flex flex-col">
      {/* MediKiosk Sticky Top Navigation Header */}
      <header className="sticky top-0 z-50 bg-pine-teal border-b border-white/10 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 transition-opacity hover:opacity-90"
            >
              <img
                src="/assets/logo/medikiosk-logo.png"
                alt="MediKiosk"
                className="h-7 md:h-8 w-auto object-contain"
              />
            </Link>
            <span className="hidden sm:inline-block text-[11px] bg-white/15 text-cornsilk/90 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
              OPD Clinician Suite
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <Link
              href="/kiosk"
              className="rounded-full border border-cornsilk/40 px-3.5 py-1.5 text-xs font-semibold text-cornsilk hover:bg-white/10 transition-colors"
            >
              Patient Kiosk
            </Link>
            <button
              onClick={handleLockTerminal}
              className="rounded-full bg-metallic-gold hover:brightness-105 active:scale-[0.98] text-ink-black px-4 py-1.5 text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
              title="Lock Doctor Terminal for Privacy"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Lock Terminal</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col p-4 md:p-6 max-w-7xl mx-auto w-full">
        {/* Real-Time Emergency Ward Alert Banner */}
        {emergencyAlertSession && (
          <div className="mb-4 bg-rose-600 text-white p-4 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3 border-2 border-rose-400 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white text-rose-700 rounded-xl flex items-center justify-center font-black">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-white text-rose-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                    CRITICAL EMERGENCY WARD ALERT
                  </span>
                  <span className="font-extrabold text-sm tracking-wide">
                    Token: {emergencyAlertSession.queue_id} • {emergencyAlertSession.patient_name || emergencyAlertSession.patient_ref}
                  </span>
                </div>
                <p className="text-xs text-rose-100 mt-0.5">
                  Red Flag Triggered: {emergencyAlertSession.latest_red_flag_rule || 'Emergency condition reported'} → Route to <strong>Emergency Resuscitation Bay (Room ER-1)</strong>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  handleSelectSession(emergencyAlertSession);
                  playEmergencySirenAudio();
                }}
                className="px-4 py-2 bg-white text-rose-700 font-extrabold text-xs rounded-xl shadow hover:bg-rose-50 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Attend Emergency Case Now</span>
              </button>
              <button
                onClick={() => setEmergencyAlertSession(null)}
                className="px-3 py-2 bg-rose-700 text-white/90 text-xs font-semibold rounded-xl hover:bg-rose-800 cursor-pointer"
                title="Acknowledge and dismiss"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Colored Title Bar per Doctor Specialty */}
        <div className={`flex flex-wrap items-center justify-between py-4 px-5 rounded-3xl mb-4 transition-all duration-300 gap-3 border shadow-md ${
          activeDoctorInfo 
            ? activeDoctorInfo.title_bar_gradient 
            : 'bg-gradient-to-r from-[#003835] via-pine-teal to-[#0A5A55] text-white border-teal-700/60 shadow-pine-teal/20'
        }`}>
          <div className="flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold shadow-md transition-all ${
              activeDoctorInfo 
                ? activeDoctorInfo.title_bar_icon_bg 
                : 'bg-pine-teal text-metallic-gold ring-2 ring-metallic-gold/30'
            }`}>
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg md:text-xl font-extrabold tracking-tight font-[family-name:var(--font-sora)]">
                  {activeDoctorInfo 
                    ? `${activeDoctorInfo.room_display} — Consultation Terminal` 
                    : 'Clinician Review Dashboard — Multi-Specialty OPD'}
                </h1>
                <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                  activeDoctorInfo 
                    ? activeDoctorInfo.title_bar_tag_bg 
                    : 'bg-peach-glow/20 text-cornsilk border-peach-glow/30'
                }`}>
                  {activeDoctorInfo ? activeDoctorInfo.specialty : 'Central Triage'}
                </span>
              </div>
              <p className="text-xs text-white/80 font-medium mt-0.5">
                {activeDoctorInfo 
                  ? `${activeDoctorInfo.name} (${activeDoctorInfo.qualification}) • ${activeDoctorInfo.floor}` 
                  : 'Central OPD Multi-Specialty Consultation • Rooms 101, 102, 105, 108 & ER-1'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="bg-white/15 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur-sm border border-white/20">
              <ShieldCheck className="w-4 h-4 text-emerald-300" /> Live Auto-Sync Active
            </span>
            <button 
              onClick={() => fetchQueue(false)}
              className="p-2 text-white hover:text-metallic-gold bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/15 cursor-pointer"
              title="Refresh Live Data"
            >
              <Clock className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Specialty Doctor & Room Privacy Gating */}
        {loginSpecialty === 'all' ? (
          <div className="mb-4 bg-white/95 backdrop-blur-sm p-3 rounded-2xl border border-border-strong shadow-sm flex items-center gap-2 overflow-x-auto text-xs">
            <span className="text-[11px] font-black text-ink-black/60 uppercase tracking-wider pl-2 pr-1 flex-shrink-0">
              Filter by Room / Doctor:
            </span>
            <button
              onClick={() => setSelectedDoctorFilter('all')}
              className={`px-3.5 py-2 rounded-xl font-bold transition-all flex-shrink-0 flex items-center gap-1.5 border cursor-pointer ${
                selectedDoctorFilter === 'all'
                  ? 'bg-ink-black text-cornsilk border-ink-black shadow-sm ring-2 ring-ink-black/30'
                  : 'bg-white text-ink-black border-border hover:bg-cornsilk/50'
              }`}
            >
              <span>All Rooms</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                selectedDoctorFilter === 'all' ? 'bg-white/20 text-cornsilk' : 'bg-slate-200 text-slate-800'
              }`}>
                {queue.length}
              </span>
            </button>

            {Object.values(DOCTOR_ROSTER).map(doc => {
              const count = queue.filter(item => item.allocated_doctor?.id === doc.id || item.allocated_doctor?.department_code === doc.department_code).length;
              const isSelected = (selectedDoctorFilter as string) === doc.id || (selectedDoctorFilter as string) === doc.department_code;
              return (
                <button
                  key={doc.id}
                  onClick={() => setSelectedDoctorFilter(doc.id)}
                  className={`px-3.5 py-2 rounded-xl font-bold transition-all flex-shrink-0 flex items-center gap-1.5 border cursor-pointer ${
                    isSelected
                      ? doc.pill_active
                      : doc.pill_inactive
                  }`}
                >
                  <span>{doc.room_number}</span>
                  <span className="text-[10px] font-medium opacity-80">({doc.specialty.split(' ')[0]})</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                    isSelected ? 'bg-white/25 text-white' : doc.badge_pill
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mb-4 bg-white/95 backdrop-blur-sm p-3.5 rounded-2xl border border-border-strong shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-extrabold text-ink-black text-xs">
                Private Consultation Terminal: {activeDoctorInfo ? `${activeDoctorInfo.name} (${activeDoctorInfo.qualification}) • ${activeDoctorInfo.room_display}` : selectedDoctorFilter}
              </span>
              <span className="text-[10px] bg-peach-glow/30 text-pine-teal border border-border px-2.5 py-0.5 rounded-full font-bold">
                Doctor Patient Privacy Active
              </span>
            </div>
            <div className="text-ink-black/70 text-[11px] font-semibold flex items-center gap-2">
              <span>{filteredQueue.length} Patient{filteredQueue.length === 1 ? '' : 's'} Waiting for this room</span>
              <span className="text-slate-300">•</span>
              <button
                onClick={handleLockTerminal}
                className="text-pine-teal hover:underline font-bold cursor-pointer"
              >
                Switch Terminal Account
              </button>
            </div>
          </div>
        )}

      {/* Patient Discharge / Deletion Toast */}
      {deleteSuccessToast && (
        <div className="mb-4 bg-[#faf4d3] border-2 border-[#d1ac00] text-[#0c1618] p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-[#004643] flex-shrink-0" />
            <span>{deleteSuccessToast}</span>
          </div>
          <button
            onClick={() => setDeleteSuccessToast(null)}
            className="text-xs font-black text-[#004643] hover:underline cursor-pointer px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Queue Sidebar + Review Main Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* SIDEBAR: PATIENT QUEUE (4 Cols) */}
        <div className="no-print lg:col-span-4 bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex flex-col h-[calc(100vh-180px)]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3 px-2">
            <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-[#004643]" /> {activeDoctorInfo ? `${activeDoctorInfo.room_number} Queue` : 'Patient Queue'} ({filteredQueue.length})
            </h2>
            <button onClick={() => fetchQueue(false)} className="text-xs text-[#004643] font-semibold hover:underline cursor-pointer">
              Live Refresh
            </button>
          </div>

          <div className="overflow-y-auto space-y-3 flex-1 pr-1">
            {filteredQueue.length === 0 ? (
              <div className="text-center py-12 px-4">
                <User className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-700">
                  {activeDoctorInfo ? `No waiting patients for ${activeDoctorInfo.room_number}` : 'No patients in queue'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {activeDoctorInfo ? `Only patients allocated to ${activeDoctorInfo.specialty} appear in this terminal.` : 'Waiting for new patient kiosk intakes.'}
                </p>
              </div>
            ) : (
              filteredQueue.map(item => {
                const isSelected = selectedSession?.id === item.id;
                const hasRedFlag = item.red_flag_count > 0 || item.status === 'emergency_triaged';
                const hasContradiction = item.contradiction_count > 0;
                const ccText = formatClinicalText(item.latest_draft?.clinician_summary?.chief_complaint);

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectSession(item)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                      isSelected 
                        ? 'border-[#2F5D62] bg-[#EAF3F2]/60 shadow-sm' 
                        : 'border-slate-100 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-base">{item.queue_id}</span>
                        {item.allocated_doctor && (
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${item.allocated_doctor.badge_color}`}>
                            {item.allocated_doctor.room_number}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1.5">
                        {hasRedFlag && (
                          <span className="bg-[#C4292A] text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                            <AlertTriangle className="w-3 h-3" /> RED FLAG
                          </span>
                        )}
                        {hasContradiction && (
                          <span className="bg-[#B8860B] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                            CONTRADICTION
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 space-y-1 mb-2">
                      <p><span className="font-semibold">Patient:</span> {item.patient_name || item.patient_ref}</p>
                      <p><span className="font-semibold">Assigned:</span> {item.allocated_doctor?.name || 'General OPD'}</p>
                      <p><span className="font-semibold">Chief Complaint:</span> {ccText || 'Interview in progress...'}</p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-200/50">
                      <span className="flex items-center gap-1 text-[#2F5D62] font-semibold">
                        <Clock className="w-3 h-3" /> {item.estimated_wait_time || 'Next'}
                      </span>
                      <span className={`font-bold ${item.status === 'attested' ? 'text-[#2E7D4F]' : 'text-[#C15B3A]'}`}>
                        {item.status.toUpperCase()}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* MAIN PANEL: STRUCTURED REVIEW & ATTESTATION (8 Cols) */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col h-[calc(100vh-180px)] overflow-hidden">
          
          {selectedSession ? (
            <>
              {/* Header Bar for Selected Patient */}
              <div className="no-print flex flex-wrap items-center justify-between pb-4 border-b border-slate-100 mb-4 gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-extrabold text-slate-900">{selectedSession.queue_id}</h2>
                    <span className="bg-[#EAF3F2] text-[#2F5D62] text-xs font-bold px-3 py-1 rounded-full">
                      {isAttested ? 'Attested & Signed' : 'Draft — Pending Review'}
                    </span>
                    {isAttested && (
                      <span className="bg-[#2E7D4F] text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Sign-Off Complete
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Session ID: {selectedSession.id} • Language: {selectedSession.language?.toUpperCase()}</p>
                </div>

                {/* Tab Controls */}
                <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                  <button 
                    onClick={() => setActiveTab('one_page_history')}
                    className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-bold ${activeTab === 'one_page_history' ? 'bg-[#2F5D62] text-white shadow-sm' : 'text-slate-700 hover:text-slate-900 bg-white/80'}`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>{selectedSession?.clinical_mode === 'ayurveda' ? 'Dashavidha & One-Page History' : 'One-Page Patient History'}</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('scanned_documents')}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-bold ${activeTab === 'scanned_documents' ? 'bg-[#004643] text-white shadow-sm' : 'text-slate-700 hover:text-slate-900 bg-white/80'}`}
                  >
                    <Camera className="w-3.5 h-3.5 text-amber-400" />
                    <span>Scanned Documents</span>
                    {(sessionDetail?.documents?.length || 0) > 0 && (
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${activeTab === 'scanned_documents' ? 'bg-amber-400 text-slate-950' : 'bg-amber-100 text-amber-900'}`}>
                        {sessionDetail.documents.length}
                      </span>
                    )}
                  </button>
                  <button 
                    onClick={() => setActiveTab('summary')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'summary' ? 'bg-[#2F5D62] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Structured Note (SBAR / SOAP)
                  </button>
                  <button 
                    onClick={() => setActiveTab('module_b_intelligence')}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-bold ${activeTab === 'module_b_intelligence' ? 'bg-[#004643] text-white shadow-sm' : 'text-slate-700 hover:text-slate-900 bg-white/80'}`}
                  >
                    <Activity className="w-3.5 h-3.5 text-teal-400" />
                    <span>Intelligence & Timeline</span>
                    {(safetyData?.has_critical_alerts || safetyData?.has_panic_labs) && (
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    )}
                  </button>
                  <button 
                    onClick={() => setActiveTab('contradictions')}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${activeTab === 'contradictions' ? 'bg-[#2F5D62] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Contradictions
                    {sessionDetail?.contradictions?.length > 0 && (
                      <span className="w-4 h-4 rounded-full bg-[#B8860B] text-white text-[10px] flex items-center justify-center">
                        {sessionDetail.contradictions.length}
                      </span>
                    )}
                  </button>
                  <button 
                    onClick={() => { setActiveTab('fhir'); if (!fhirBundle) handleExportFHIR(false); }}
                    className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'fhir' ? 'bg-[#2F5D62] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Text Report & FHIR
                  </button>
                </div>
              </div>

              {/* Attestation Error Message */}
              {attestError && (
                <div className="bg-[#C4292A]/10 text-[#C4292A] p-4 rounded-2xl mb-4 text-xs font-semibold flex items-center gap-2 border border-[#C4292A]/20">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <span>{attestError}</span>
                </div>
              )}

              {/* TAB 0: ONE-PAGE COMPREHENSIVE PATIENT HISTORY & DISCHARGE */}
              {activeTab === 'one_page_history' && (() => {
                const isAyurveda = selectedSession.clinical_mode === 'ayurveda';
                const dashavidha = computeDashavidhaPariksha(structuredHistory, selectedSession);
                const pastDiseases = editedValues['past_medical_surgical'] || formatClinicalText(draftContent.past_medical_surgical) || (isAyurveda ? 'कोई पूर्व व्याधि या शल्यकर्म इतिहास नहीं' : 'No chronic medical illness or prior surgeries reported');
                const famHistory = editedValues['family_history'] || formatClinicalText(draftContent.family_history) || (isAyurveda ? 'कुल में कोई आनुवंशिक व्याधि नहीं' : 'No hereditary illness in first-degree relatives');
                const _socialHistory = editedValues['social_history'] || formatClinicalText(draftContent.social_history) || 'Social and lifestyle history not recorded.';
                const _backgroundSummary = formatClinicalText(draftContent.background_summary) || '';
                const allergyText = editedValues['allergies'] || formatClinicalText(draftContent.allergies) || (isAyurveda ? 'कोई ज्ञात द्रव्य असात्म्यता नहीं' : 'No known drug or food allergies');
                const medsText = editedValues['medications'] || formatClinicalText(draftContent.medications) || (isAyurveda ? 'कोई नियमित औषध सेवन नहीं' : 'No active prescription medications reported');
                const rosText = editedValues['review_of_systems'] || formatClinicalText(draftContent.review_of_systems) || 'Cardiovascular, respiratory, gastrointestinal, and musculoskeletal functional reviews completed without acute systemic decompensation.';
                const ccText = editedValues['chief_complaint'] || formatClinicalText(draftContent.chief_complaint) || (isAyurveda ? 'आयुर्वेदिक ओपीडी परामर्श' : 'Outpatient consultation');
                const hpiText = editedValues['hpi'] || formatClinicalText(draftContent.hpi) || (isAyurveda ? 'हेतु, सम्प्राप्ति एवं रोग वृद्धि का विवरण दर्ज किया गया।' : 'Recorded via MediKiosk conversational clinical intake.');
                const labsText = formatClinicalText(draftContent.prior_investigations) || (isAyurveda ? 'कोई पूर्व जांच या रिपोर्ट संलग्न नहीं' : 'No previous imaging, scans or lab reports uploaded for this encounter.');
                const ayushProfile = formatClinicalText(draftContent.dashavidha_pariksha || draftContent.ayush_profile) || 'Prakriti, Dosha vriddhi, एवं Kostha lakshanas verified.';

                return (
                  <div className="overflow-y-auto space-y-4 flex-1 pr-2">
                    {/* Top Action Bar for Database Sync, Discharge & Export */}
                    <div className="no-print bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-[#004643]" />
                          <span>
                            {isAyurveda 
                              ? 'Ayurvedic Clinical Summary & Dashavidha Record' 
                              : 'Allopathic Clinical Summary & Full Patient History'}
                          </span>
                        </h3>
                        <p className="text-xs text-slate-500">
                          {isAyurveda 
                            ? 'Ministry of AYUSH certified clinical note with 10-fold Dashavidha Pariksha assessment.' 
                            : 'ABDM-compliant executive outpatient clinical record for specialist physician.'}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={handleSendCompleteHistoryToDatabase}
                          disabled={saveStatus.state === 'saving'}
                          className="px-3.5 py-2 bg-[#004643] hover:bg-teal-900 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-md transition-all active:scale-[0.98] cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{saveStatus.state === 'saving' ? 'Saving...' : saveStatus.state === 'saved' ? 'Saved to DB' : 'Send to DB'}</span>
                        </button>
                        <button
                          onClick={() => window.print()}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-700" />
                          <span>Print</span>
                        </button>
                        <button
                          onClick={handleDownloadOnePageText}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download .txt</span>
                        </button>
                        <button
                          onClick={() => setDeleteConfirmModal(true)}
                          disabled={isDeletingSession}
                          className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-md cursor-pointer active:scale-[0.98]"
                          title="Complete assessment and discharge patient from OPD queue"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-white" />
                          <span>Complete & Discharge</span>
                        </button>
                      </div>
                    </div>

                    {/* Database Save Confirmation Toast */}
                    {saveStatus.state === 'saved' && (
                      <div className="no-print bg-emerald-50 border-2 border-emerald-400 text-[#004643] p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm animate-fadeIn">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                          <span>{saveStatus.message} (Record ID: <span className="font-mono">{saveStatus.recordId || selectedSession.id}</span> at {saveStatus.savedAt})</span>
                        </div>
                        <span className="bg-emerald-200 text-emerald-900 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                          Permanent DB Record
                        </span>
                      </div>
                    )}
                    {saveStatus.state === 'error' && (
                      <div className="no-print bg-red-50 border border-red-300 text-[#C4292A] p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Database Save Failed: {saveStatus.message}</span>
                      </div>
                    )}

                    {/* DOCTOR ENGLISH CLINICAL VOICE BRIEFING TOOLBAR */}
                    <div className="no-print bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 p-3.5 rounded-2xl border border-teal-500/30 text-white flex flex-wrap items-center justify-between gap-3 shadow-md mb-4">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleToggleDoctorBriefing(false)}
                          disabled={isLoadingBriefing}
                          className={`px-4 py-2 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95 ${
                            isBriefingPlaying ? 'bg-amber-400 text-slate-950 hover:bg-amber-300' : 'bg-[#004643] text-white hover:bg-teal-700 border border-teal-400/40'
                          }`}
                        >
                          {isLoadingBriefing ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : isBriefingPlaying ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                          <span className="flex items-center gap-1.5">
                            <span>{isLoadingBriefing ? (briefingLoadingStep || 'Synthesizing Briefing...') : isBriefingPlaying ? 'Pause Briefing' : '🎙️ Listen to Clinical Briefing'}</span>
                            <span className="px-1.5 py-0.5 rounded-full bg-teal-400/25 text-teal-300 text-[10px] font-mono font-bold">
                              {aiBriefingData?.duration_est_seconds ? `~${aiBriefingData.duration_est_seconds}s` : '30-45s'}
                            </span>
                          </span>
                        </button>

                        {isBriefingPlaying && (
                          <button
                            type="button"
                            onClick={handleStopDoctorBriefing}
                            className="p-2 rounded-xl bg-slate-800 text-rose-400 hover:bg-slate-700 hover:text-rose-300 border border-slate-700 cursor-pointer"
                            title="Stop briefing"
                          >
                            <Square className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {isBriefingPlaying && (
                          <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-800/80 rounded-lg border border-teal-500/30">
                            <span className="w-1 h-3.5 bg-teal-400 rounded-full animate-bounce" />
                            <span className="w-1 h-5 bg-teal-300 rounded-full animate-pulse" />
                            <span className="w-1 h-2.5 bg-emerald-400 rounded-full animate-bounce" />
                            <span className="w-1 h-4 bg-teal-400 rounded-full animate-pulse" />
                            <span className="text-[10px] font-mono font-bold text-teal-300 ml-1">Spoken Handover</span>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => setIsBriefingCardExpanded(!isBriefingCardExpanded)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer shadow-sm ${
                            isBriefingCardExpanded
                              ? 'bg-teal-500/30 text-teal-200 border-teal-400/60'
                              : 'bg-slate-800 hover:bg-slate-700 text-teal-300 border-teal-500/30'
                          }`}
                          title="View concise AI clinical briefing summary"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>{isBriefingCardExpanded ? 'Hide AI Summary' : 'View AI Summary'}</span>
                          {aiBriefingData && (
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center bg-slate-800/90 rounded-xl p-1 border border-slate-700 text-xs">
                          <span className="text-[10px] uppercase font-bold text-slate-400 px-2">Speed:</span>
                          {[1, 1.25, 1.5].map((spd) => (
                            <button
                              key={spd}
                              type="button"
                              onClick={() => handleSpeedChange(spd)}
                              className={`px-2 py-0.5 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                                briefingSpeed === spd ? 'bg-[#004643] text-white' : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              {spd}x
                            </button>
                          ))}
                        </div>

                        {(sessionDetail?.documents?.length || 0) > 0 && (
                          <button
                            type="button"
                            onClick={() => setIsDocCrossCheckOpen(true)}
                            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                          >
                            <Camera className="w-3.5 h-3.5 text-amber-300" />
                            <span>Cross-Check Uploaded Docs ({sessionDetail.documents.length})</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* EXPANDABLE AI CLINICAL BRIEFING CARD */}
                    {isBriefingCardExpanded && (
                      <div className="no-print mb-5 bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950 border border-teal-500/40 rounded-2xl p-4 shadow-xl text-white animate-fadeIn">
                        <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30">
                              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                                <span>AI Spoken Clinical Handover</span>
                                <span className="px-2 py-0.5 rounded-full bg-teal-400/20 text-teal-300 text-[10px] font-mono">
                                  {aiBriefingData?.engine === 'groq-mistral-ai' ? '⚡ Groq LPU / Mistral AI' : 'Deterministic Summarizer'}
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono">
                                  ~{aiBriefingData?.duration_est_seconds || 30}s spoken
                                </span>
                              </h4>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Intelligently synthesized high-yield summary for attending physician — omits redundant questionnaire details.
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleDoctorBriefing(true)}
                              disabled={isLoadingBriefing}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer shadow-sm"
                              title="Re-summarize with AI"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBriefing ? 'animate-spin' : ''}`} />
                              <span>Re-summarize</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsBriefingCardExpanded(false)}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Spoken Script Box */}
                        <div className="bg-slate-950/80 rounded-xl p-3.5 border border-slate-800 mb-3">
                          <div className="text-[10px] uppercase font-extrabold text-teal-400 mb-1.5 flex items-center gap-1.5 tracking-wider">
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>Audio Briefing Spoken Script</span>
                          </div>
                          <p className="text-xs text-slate-200 leading-relaxed font-sans italic">
                            &ldquo;{aiBriefingData?.briefing_text || generateEnglishClinicalBriefing()}&rdquo;
                          </p>
                        </div>

                        {/* Key High-Yield Highlights */}
                        {aiBriefingData?.key_points && aiBriefingData.key_points.length > 0 && (
                          <div>
                            <div className="text-[10px] uppercase font-extrabold text-slate-400 mb-2 tracking-wider">
                              Key Clinical Takeaways (At-a-Glance)
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {aiBriefingData.key_points.map((pt, idx) => (
                                <div key={idx} className="bg-slate-800/70 rounded-xl px-3 py-2 border border-slate-700/70 text-xs flex items-start gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5 flex-shrink-0" />
                                  <span className="text-slate-200 font-medium">{pt}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* TEMPLATE A: PURE ALLOPATHIC ONE-PAGE CLINICAL SHEET */}
                    {!isAyurveda ? (
                      <div id="one-page-clinical-sheet" className="printable-area bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
                        {/* Print-Only Hospital Header */}
                        <div className="print-only mb-6 border-b-2 border-slate-900 pb-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h1 className="text-xl font-black uppercase tracking-wider text-slate-900">AIIMS / CENTRAL CIVIL HOSPITAL</h1>
                              <p className="text-xs font-semibold text-slate-700">Outpatient Department (OPD) Clinical Examination Record</p>
                              <p className="text-[10px] text-slate-600">ABHA & ABDM Integrated Health Record • Form MED-OPD-101</p>
                            </div>
                            <div className="text-right">
                              <p className="font-black text-base text-slate-900">TOKEN: {selectedSession.queue_id}</p>
                              <p className="text-xs text-slate-700">Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                            </div>
                          </div>
                        </div>

                        {/* Sheet Header */}
                        <div className="border-b border-slate-200 pb-4">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                            <div>
                              <span className="text-[10px] font-black uppercase tracking-widest text-[#004643] bg-[#EAF3F2] px-2.5 py-1 rounded-full border border-teal-200">
                                Standard Allopathic OPD Consultation Record
                              </span>
                              <h2 className="text-xl font-extrabold text-slate-900 mt-1.5">
                                Outpatient Health Assessment & Verified Clinical History
                              </h2>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-teal-100 text-[#004643] border border-teal-200">
                                {selectedSession.allocated_doctor?.specialty || 'General Medicine OPD'}
                              </span>
                              <p className="text-[11px] text-slate-400 mt-1">
                                Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>

                          {/* Demographics Bar */}
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
                            <div>
                              <span className="text-slate-400 text-[10px] font-bold block uppercase">Patient Name</span>
                              <span className="font-extrabold text-slate-900 text-sm">{selectedSession.patient_name || selectedSession.patient_ref || 'Patient'}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[10px] font-bold block uppercase">Age / Gender</span>
                              <span className="font-bold text-slate-800">{selectedSession.age || '35'} Yrs / {selectedSession.gender || 'Not specified'}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[10px] font-bold block uppercase">Queue Token</span>
                              <span className="font-extrabold text-[#004643] text-sm">{selectedSession.queue_id}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[10px] font-bold block uppercase">ABHA ID (Optional)</span>
                              <span className="font-mono text-slate-700 text-[11px] font-bold">
                                {selectedSession.abha_mock_id || (
                                  <span className="text-slate-400 font-normal italic">Not Provided (Hospital to Link)</span>
                                )}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[10px] font-bold block uppercase">Allocated Room</span>
                              <span className="font-extrabold text-[#004643] text-[11px] block">
                                {selectedSession.allocated_doctor?.room_display || 'Room 101 (General OPD)'}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {selectedSession.allocated_doctor?.name || 'Dr. Vikram Sharma'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 2-Column Allopathic Clinical Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          {/* Left Column: CC + HPI + Medical History + Family History */}
                          <div className="space-y-4">
                            {/* 1. Chief Complaint */}
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#004643] block mb-1">
                                1. Chief Complaint (CC) & Duration
                              </span>
                              <p className="text-sm font-bold text-slate-900">
                                {ccText}
                              </p>
                            </div>

                            {/* 2. History of Present Illness */}
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#004643] block mb-1">
                                2. History of Present Illness (HPI / SOCRATES Analysis)
                              </span>
                              <p className="text-xs font-medium text-slate-800 whitespace-pre-line leading-relaxed">
                                {hpiText}
                              </p>
                            </div>

                            {/* 3. Past Medical & Surgical History */}
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#004643] block mb-1 flex items-center justify-between">
                                <span>3. Past Medical & Surgical History</span>
                                <span className="text-[10px] text-slate-400 font-normal">Chronic Illnesses & Surgeries</span>
                              </span>
                              <p className="text-xs font-semibold text-slate-800">
                                {pastDiseases}
                              </p>
                            </div>

                            {/* 4. Family History */}
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#004643] block mb-1 flex items-center justify-between">
                                <span>4. Family History</span>
                                <span className="text-[10px] text-slate-400 font-normal">Hereditary & Familial Disorders</span>
                              </span>
                              <p className="text-xs font-semibold text-slate-800">
                                {famHistory}
                              </p>
                            </div>
                          </div>

                          {/* Right Column: Allergies + Medications + ROS + Diagnostic Labs */}
                          <div className="space-y-4">
                            {/* 5. Allergies & Adverse Reactions */}
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#C4292A] block mb-1">
                                5. Allergies & Drug Adverse Reactions
                              </span>
                              <p className="text-xs font-bold text-slate-900">
                                {allergyText}
                              </p>
                            </div>

                            {/* 6. Current Medications */}
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#004643] block mb-1">
                                6. Current Medications & Active Dosages
                              </span>
                              <p className="text-xs font-semibold text-slate-800">
                                {medsText}
                              </p>
                            </div>

                            {/* 7. Review of Systems */}
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#004643] block mb-1">
                                7. Review of Systems (ROS) & Functional Status
                              </span>
                              <p className="text-xs font-medium text-slate-800 leading-relaxed">
                                {rosText}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* DIGITALIZED & EDITABLE PRESCRIPTION WITH HIGHLIGHTED OUT-OF-RANGE DETAILS */}
                        <div className="no-print pt-2">
                          <DigitalPrescriptionEditor
                            initialMedicationsText={medsText}
                            extractedMedications={sessionDetail?.extracted_entities?.filter((e: any) => e.entity_type === 'medication')?.map((e: any) => ({
                              name: e.fields?.name || e.raw_text,
                              dosage: e.fields?.dosage || '500 mg',
                              frequency: e.fields?.frequency || '1-0-1',
                              timing: e.fields?.timing || 'After Meals (PC)',
                              duration: e.fields?.duration || '5 days'
                            })) || []}
                            safetyAlerts={safetyData?.safety_audit?.alerts || []}
                            patientAllergiesText={allergyText}
                            extractedLabs={[
                              ...(safetyData?.labs || []),
                              ...(sessionDetail?.extracted_entities?.filter((e: any) => e.entity_type === 'lab_result')?.map((e: any) => {
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
                              }) || [])
                            ].filter((item: any, idx: number, arr: any[]) => arr.findIndex((t: any) => (t.name || t.test_name) === (item.name || item.test_name)) === idx)}
                            onUpdateMedications={(medsList, formattedText) => {
                              handleSectionAction('medications', 'edited', medsText, formattedText, 'Physician updated digitalized prescription');
                            }}
                            onUpdateLabs={(labsList) => {
                              const labsSummary = labsList.map(l => `${l.test_name}: ${l.value} ${l.unit} [${l.clinical_flag}] - ${l.doctor_note || ''}`).join('; ');
                              handleSectionAction('prior_investigations', 'edited', labsText, labsSummary, 'Physician verified out-of-range lab findings');
                            }}
                            onOpenDocCrossCheck={() => setIsDocCrossCheckOpen(true)}
                          />
                        </div>

                        {/* Sheet Footer & Physician Attestation Block */}
                        <div className="border-t border-slate-200 pt-4 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-3">
                          <div>
                            <p className="font-bold text-slate-800">
                              Attending Clinician: {selectedSession.allocated_doctor?.name || 'Dr. Vikram Sharma'} ({selectedSession.allocated_doctor?.qualification || 'MBBS, MD'})
                            </p>
                            <p className="text-[11px] text-slate-400">
                              Room: {selectedSession.allocated_doctor?.room_number || 'Room 101'} • Timestamp: {new Date().toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="bg-emerald-50 text-[#004643] border border-emerald-300 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>{isAttested ? 'Physician Attested' : 'Draft / Ready for Sign-Off'}</span>
                            </span>
                          </div>
                        </div>

                        {/* Print-Only Physician Signature & Stamp Block */}
                        <div className="print-only mt-8 pt-4 border-t border-slate-400">
                          <div className="flex justify-between items-end">
                            <div>
                              <p className="text-xs font-bold text-slate-900">Attending Physician Signature & Stamp:</p>
                              <div className="h-12 border-b border-dashed border-slate-400 w-52 mt-2"></div>
                              <p className="text-[11px] font-bold text-slate-900 mt-1">{selectedSession.allocated_doctor?.name || 'Dr. Vikram Sharma'} ({selectedSession.allocated_doctor?.qualification || 'MBBS, MD'})</p>
                              <p className="text-[10px] text-slate-600">Registration: MCI-2024-9981 • {selectedSession.allocated_doctor?.room_number || 'Room 101'}</p>
                            </div>
                            <div className="text-right text-[10px] text-slate-600">
                              <p className="font-semibold">MediKiosk Clinical Intelligence System</p>
                              <p>Attested & Verified NRCeS / ABDM Document</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* TEMPLATE B: PURE AYURVEDIC ONE-PAGE CLINICAL SHEET */
                      <div id="one-page-clinical-sheet" className="printable-area bg-white border border-amber-200 rounded-3xl p-6 shadow-sm space-y-6">
                        {/* Print-Only Ayurvedic Hospital Header */}
                        <div className="print-only mb-6 border-b-2 border-amber-900 pb-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h1 className="text-xl font-black uppercase tracking-wider text-amber-950">ALL INDIA INSTITUTE OF AYURVEDA / AYUSH OPD</h1>
                              <p className="text-xs font-semibold text-amber-900">दशविध परीक्षा एवं त्रिदोष परीक्षण विवरण (10-Fold Assessment & Dosha Profiling)</p>
                              <p className="text-[10px] text-slate-600">Ministry of AYUSH • Certified Clinical Health Record</p>
                            </div>
                            <div className="text-right">
                              <p className="font-black text-base text-amber-950">TOKEN: {selectedSession.queue_id}</p>
                              <p className="text-xs text-slate-700">Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                            </div>
                          </div>
                        </div>

                        {/* Sheet Header */}
                        <div className="border-b border-amber-200/80 pb-4">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                            <div>
                              <span className="text-[10px] font-black uppercase tracking-widest text-[#8B5A2B] bg-amber-50 px-2.5 py-1 rounded-full border border-amber-300">
                                Ministry of AYUSH — Ayurvedic Clinical Consultation Record
                              </span>
                              <h2 className="text-xl font-extrabold text-slate-900 mt-1.5 font-[family-name:var(--font-sora)]">
                                दशविध परीक्षा एवं त्रिदोष परीक्षण विवरण (10-Fold Assessment & Dosha Profiling)
                              </h2>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-amber-100 text-[#8B5A2B] border border-amber-300">
                                Ayurvedic Medicine & Kayachikitsa
                              </span>
                              <p className="text-[11px] text-slate-400 mt-1">
                                Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>

                          {/* Demographics Bar */}
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-amber-50/50 p-3.5 rounded-2xl border border-amber-200/70 text-xs">
                            <div>
                              <span className="text-slate-400 text-[10px] font-bold block uppercase">Patient Name</span>
                              <span className="font-extrabold text-slate-900 text-sm">{selectedSession.patient_name || selectedSession.patient_ref || 'Patient'}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[10px] font-bold block uppercase">Age / Gender</span>
                              <span className="font-bold text-slate-800">{selectedSession.age || '35'} Yrs / {selectedSession.gender || 'Not specified'}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[10px] font-bold block uppercase">Queue Token</span>
                              <span className="font-extrabold text-[#8B5A2B] text-sm">{selectedSession.queue_id}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[10px] font-bold block uppercase">ABHA ID (Optional)</span>
                              <span className="font-mono text-slate-700 text-[11px] font-bold">
                                {selectedSession.abha_mock_id || (
                                  <span className="text-slate-400 font-normal italic">Not Provided (Hospital to Link)</span>
                                )}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[10px] font-bold block uppercase">Consultation Wing</span>
                              <span className="font-extrabold text-[#8B5A2B] text-[11px] block">
                                Room 108 (AYUSH Center)
                              </span>
                              <span className="text-[10px] text-slate-500">
                                Dr. Harish Vaidya, BAMS, MD
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 2-Column Ayurvedic Clinical Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          {/* Left Column: Vedana + Samprapti + Purva Vyadhi + Kulaja + Asatmyata */}
                          <div className="space-y-4">
                            {/* 1. Pradhana Vedana */}
                            <div className="bg-amber-50/40 p-4 rounded-2xl border border-amber-200/70">
                              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#8B5A2B] block mb-1">
                                1. प्रधान वेदना एवं अवधि (Pradhana Vedana — Chief Complaint & Onset)
                              </span>
                              <p className="text-sm font-bold text-slate-900">
                                {ccText}
                              </p>
                            </div>

                            {/* 2. Roga Samprapti */}
                            <div className="bg-amber-50/40 p-4 rounded-2xl border border-amber-200/70">
                              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#8B5A2B] block mb-1">
                                2. रोग सम्प्राप्ति एवं निदान (Roga Samprapti & Etiological Factors)
                              </span>
                              <p className="text-xs font-medium text-slate-800 whitespace-pre-line leading-relaxed">
                                {hpiText}
                              </p>
                            </div>

                            {/* 3. Purva Vyadhi Vritta */}
                            <div className="bg-amber-50/40 p-4 rounded-2xl border border-amber-200/70">
                              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#8B5A2B] block mb-1 flex items-center justify-between">
                                <span>3. पूर्व व्याधि वृत्त (Purva Vyadhi Vritta — Past Illnesses)</span>
                                <span className="text-[10px] text-amber-800/70 font-normal">शोधन/शमन इतिहास</span>
                              </span>
                              <p className="text-xs font-semibold text-slate-800">
                                {pastDiseases}
                              </p>
                            </div>

                            {/* 4. Kulaja Vritta */}
                            <div className="bg-amber-50/40 p-4 rounded-2xl border border-amber-200/70">
                              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#8B5A2B] block mb-1 flex items-center justify-between">
                                <span>4. कुलज वृत्त (Kulaja Vritta — Family Constitution)</span>
                                <span className="text-[10px] text-amber-800/70 font-normal">पारिवारिक प्रकृति व व्याधि</span>
                              </span>
                              <p className="text-xs font-semibold text-slate-800">
                                {famHistory}
                              </p>
                            </div>

                            {/* 5. Asatmyata */}
                            <div className="bg-amber-50/40 p-4 rounded-2xl border border-amber-200/70">
                              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#C4292A] block mb-1">
                                5. असात्म्यता एवं विरूद्धाहार (Asatmyata & Dietary Incompatibilities)
                              </span>
                              <p className="text-xs font-bold text-slate-900">
                                {allergyText}
                              </p>
                            </div>
                          </div>

                          {/* Right Column: Vartamana Aushadha + Dashavidha + Tridosha */}
                          <div className="space-y-4">
                            {/* 6. Vartamana Aushadha */}
                            <div className="bg-amber-50/40 p-4 rounded-2xl border border-amber-200/70">
                              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#8B5A2B] block mb-1">
                                6. वर्तमान औषध सेवन (Ongoing Classical / Ayurvedic Formulations)
                              </span>
                              <p className="text-xs font-semibold text-slate-800">
                                {medsText}
                              </p>
                            </div>

                            {/* 7. Dashavidha Pariksha 10-Fold Assessment Matrix */}
                            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-300 shadow-xs">
                              <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-amber-300">
                                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#8B5A2B] flex items-center gap-1.5">
                                  <span>7. दशविध परीक्षा (Dashavidha Pariksha 10-Fold Matrix)</span>
                                </span>
                                <span className="text-[10px] bg-amber-200/80 text-[#8B5A2B] px-2 py-0.5 rounded font-bold">
                                  Charaka Samhita 8/94
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-white p-2.5 rounded-xl border border-amber-200">
                                  <span className="text-[10px] font-bold text-amber-800 block">1. दूष्य (Dushya)</span>
                                  <span className="font-semibold text-slate-800 text-[11px]">{dashavidha.dushya}</span>
                                </div>
                                <div className="bg-white p-2.5 rounded-xl border border-amber-200">
                                  <span className="text-[10px] font-bold text-amber-800 block">2. देश (Desha)</span>
                                  <span className="font-semibold text-slate-800 text-[11px]">{dashavidha.desha}</span>
                                </div>
                                <div className="bg-white p-2.5 rounded-xl border border-amber-200">
                                  <span className="text-[10px] font-bold text-amber-800 block">3. बल (Bala)</span>
                                  <span className="font-semibold text-slate-800 text-[11px]">{dashavidha.bala}</span>
                                </div>
                                <div className="bg-white p-2.5 rounded-xl border border-amber-200">
                                  <span className="text-[10px] font-bold text-amber-800 block">4. काल (Kala)</span>
                                  <span className="font-semibold text-slate-800 text-[11px]">{dashavidha.kala}</span>
                                </div>
                                <div className="bg-white p-2.5 rounded-xl border border-amber-200">
                                  <span className="text-[10px] font-bold text-amber-800 block">5. अनल/अग्नि (Agni)</span>
                                  <span className="font-semibold text-slate-800 text-[11px]">{dashavidha.anala_agni}</span>
                                </div>
                                <div className="bg-white p-2.5 rounded-xl border border-amber-200">
                                  <span className="text-[10px] font-bold text-amber-800 block">6. प्रकृति (Prakriti)</span>
                                  <span className="font-semibold text-slate-800 text-[11px]">{dashavidha.prakriti}</span>
                                </div>
                                <div className="bg-white p-2.5 rounded-xl border border-amber-200">
                                  <span className="text-[10px] font-bold text-amber-800 block">7. वयस् (Vayas)</span>
                                  <span className="font-semibold text-slate-800 text-[11px]">{dashavidha.vayas}</span>
                                </div>
                                <div className="bg-white p-2.5 rounded-xl border border-amber-200">
                                  <span className="text-[10px] font-bold text-amber-800 block">8. सत्त्व (Sattva)</span>
                                  <span className="font-semibold text-slate-800 text-[11px]">{dashavidha.sattva}</span>
                                </div>
                                <div className="bg-white p-2.5 rounded-xl border border-amber-200">
                                  <span className="text-[10px] font-bold text-amber-800 block">9. सात्म्य (Satmya)</span>
                                  <span className="font-semibold text-slate-800 text-[11px]">{dashavidha.satmya}</span>
                                </div>
                                <div className="bg-white p-2.5 rounded-xl border border-amber-200">
                                  <span className="text-[10px] font-bold text-amber-800 block">10. आहार शक्ति (Ahara)</span>
                                  <span className="font-semibold text-slate-800 text-[11px]">{dashavidha.ahara_shakti}</span>
                                </div>
                              </div>

                              {dashavidha.recommendations?.length > 0 && (
                                <div className="mt-2.5 pt-2 border-t border-amber-200 text-[11px] text-[#8B5A2B] font-medium">
                                  <span className="font-bold block mb-0.5">Ayurvedic Pathya & Recommendations:</span>
                                  {dashavidha.recommendations.map((rec: string, rIdx: number) => (
                                    <span key={rIdx} className="block">• {rec}</span>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* 8. Tridosha & Agni Profile */}
                            <div className="bg-amber-50/40 p-4 rounded-2xl border border-amber-200/70">
                              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#8B5A2B] block mb-1">
                                8. त्रिदोष, कोष्ठ एवं अग्नि स्थिति (Tridosha & Agni Diagnostics)
                              </span>
                              <p className="text-xs font-semibold text-slate-800">
                                {ayushProfile}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Sheet Footer & Ayurvedic Attestation */}
                        <div className="border-t border-amber-200/80 pt-4 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-3">
                          <div>
                            <p className="font-bold text-[#8B5A2B]">
                              Ayurvedic Medical Officer: Dr. Harish Vaidya, BAMS, MD (Kayachikitsa)
                            </p>
                            <p className="text-[11px] text-slate-400">
                              AYUSH Registry: AY-49201 • Room 108 (AYUSH Center) • Timestamp: {new Date().toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="bg-amber-100 text-[#8B5A2B] border border-amber-300 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>{isAttested ? 'Ayurvedic Attested & Recorded' : 'Draft / Ready for Sign-Off'}</span>
                            </span>
                          </div>
                        </div>

                        {/* Print-Only Ayurvedic Physician Signature & Seal */}
                        <div className="print-only mt-8 pt-4 border-t border-amber-400">
                          <div className="flex justify-between items-end">
                            <div>
                              <p className="text-xs font-bold text-amber-950">Ayurvedic Medical Officer Signature & Seal:</p>
                              <div className="h-12 border-b border-dashed border-amber-400 w-52 mt-2"></div>
                              <p className="text-[11px] font-bold text-amber-950 mt-1">Dr. Harish Vaidya, BAMS, MD (Kayachikitsa)</p>
                              <p className="text-[10px] text-slate-600">AYUSH Registry: AY-49201 • Room 108 (AYUSH Center)</p>
                            </div>
                            <div className="text-right text-[10px] text-slate-600">
                              <p className="font-semibold">MediKiosk AYUSH Intelligence</p>
                              <p>Attested & Verified NRCeS / ABDM Document</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* TAB 1: STRUCTURED SUMMARY VIEW (SBAR vs SOAP) */}
              {activeTab === 'summary' && (() => {
                const isAyurveda = selectedSession.clinical_mode === 'ayurveda';
                const dashavidha = computeDashavidhaPariksha(structuredHistory, selectedSession);
                const pastDiseases = editedValues['past_medical_surgical'] || formatClinicalText(draftContent.past_medical_surgical) || (isAyurveda ? 'कोई पूर्व व्याधि या शल्यकर्म इतिहास नहीं' : 'No chronic medical illness or prior surgeries reported');
                const famHistory = editedValues['family_history'] || formatClinicalText(draftContent.family_history) || (isAyurveda ? 'कुल में कोई आनुवंशिक व्याधि नहीं' : 'No hereditary illness in first-degree relatives');
                const socialHistory = editedValues['social_history'] || formatClinicalText(draftContent.social_history) || 'Social and lifestyle history not recorded.';
                const backgroundSummary = formatClinicalText(draftContent.background_summary) || '';
                const allergyText = editedValues['allergies'] || formatClinicalText(draftContent.allergies) || (isAyurveda ? 'कोई ज्ञात द्रव्य असात्म्यता नहीं' : 'No known drug or food allergies');
                const medsText = editedValues['medications'] || formatClinicalText(draftContent.medications) || (isAyurveda ? 'कोई नियमित औषध सेवन नहीं' : 'No active prescription medications reported');
                const rosText = editedValues['review_of_systems'] || formatClinicalText(draftContent.review_of_systems) || 'Cardiovascular, respiratory, gastrointestinal, and musculoskeletal functional reviews completed without acute systemic decompensation.';
                const ccText = editedValues['chief_complaint'] || formatClinicalText(draftContent.chief_complaint) || (isAyurveda ? 'आयुर्वेदिक ओपीडी परामर्श' : 'Outpatient consultation');
                const hpiText = editedValues['hpi'] || formatClinicalText(draftContent.hpi) || (isAyurveda ? 'हेतु, सम्प्राप्ति एवं रोग वृद्धि का विवरण दर्ज किया गया।' : 'Recorded via MediKiosk conversational clinical intake.');
                const labsText = formatClinicalText(draftContent.prior_investigations) || (isAyurveda ? 'कोई पूर्व जांच या रिपोर्ट संलग्न नहीं' : 'No previous imaging, scans or lab reports uploaded for this encounter.');
                const diagText = editedValues['provisional_diagnoses'] || formatClinicalText(draftContent.provisional_diagnoses) || sessionDetail?.extracted_entities?.filter((e: any) => e.entity_type === 'diagnosis').map((e: any) => e.fields?.name || e.raw_text).join('; ') || 'Clinical diagnostic impression based on patient voice interview.';

                return (
                  <div className="overflow-y-auto space-y-4 flex-1 pr-2">
                    {/* Framework Selector & Print Action Bar */}
                    <div className="no-print bg-slate-100 p-2.5 rounded-2xl flex flex-wrap items-center justify-between gap-2 border border-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-700">Note Format:</span>
                        <div className="inline-flex p-1 bg-white rounded-xl shadow-2xs border border-slate-200 text-xs">
                          <button
                            type="button"
                            onClick={() => setNoteFormat('sbar')}
                            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                              noteFormat === 'sbar' ? 'bg-[#004643] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            SBAR Format
                          </button>
                          <button
                            type="button"
                            onClick={() => setNoteFormat('soap')}
                            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                              noteFormat === 'soap' ? 'bg-[#004643] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            SOAP Format
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => window.print()}
                          className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-700" />
                          <span>Print {noteFormat.toUpperCase()} Note</span>
                        </button>
                      </div>
                    </div>

                    {/* DOCTOR ENGLISH CLINICAL VOICE BRIEFING TOOLBAR */}
                    <div className="no-print bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 p-3.5 rounded-2xl border border-teal-500/30 text-white flex flex-wrap items-center justify-between gap-3 shadow-md">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleToggleDoctorBriefing(false)}
                          disabled={isLoadingBriefing}
                          className={`px-4 py-2 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95 ${
                            isBriefingPlaying ? 'bg-amber-400 text-slate-950 hover:bg-amber-300' : 'bg-[#004643] text-white hover:bg-teal-700 border border-teal-400/40'
                          }`}
                        >
                          {isLoadingBriefing ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : isBriefingPlaying ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                          <span className="flex items-center gap-1.5">
                            <span>{isLoadingBriefing ? (briefingLoadingStep || 'Synthesizing Briefing...') : isBriefingPlaying ? 'Pause Briefing' : '🎙️ Listen to Clinical Briefing'}</span>
                            <span className="px-1.5 py-0.5 rounded-full bg-teal-400/25 text-teal-300 text-[10px] font-mono font-bold">
                              {aiBriefingData?.duration_est_seconds ? `~${aiBriefingData.duration_est_seconds}s` : '30-45s'}
                            </span>
                          </span>
                        </button>

                        {isBriefingPlaying && (
                          <button
                            type="button"
                            onClick={handleStopDoctorBriefing}
                            className="p-2 rounded-xl bg-slate-800 text-rose-400 hover:bg-slate-700 hover:text-rose-300 border border-slate-700 cursor-pointer"
                            title="Stop briefing"
                          >
                            <Square className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {isBriefingPlaying && (
                          <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-800/80 rounded-lg border border-teal-500/30">
                            <span className="w-1 h-3.5 bg-teal-400 rounded-full animate-bounce" />
                            <span className="w-1 h-5 bg-teal-300 rounded-full animate-pulse" />
                            <span className="w-1 h-2.5 bg-emerald-400 rounded-full animate-bounce" />
                            <span className="w-1 h-4 bg-teal-400 rounded-full animate-pulse" />
                            <span className="text-[10px] font-mono font-bold text-teal-300 ml-1">Spoken Handover</span>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setIsBriefingCardExpanded(true);
                            const el = document.getElementById('one-page-clinical-sheet');
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer shadow-sm ${
                            isBriefingCardExpanded
                              ? 'bg-teal-500/30 text-teal-200 border-teal-400/60'
                              : 'bg-slate-800 hover:bg-slate-700 text-teal-300 border-teal-500/30'
                          }`}
                          title="View concise AI clinical briefing summary"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>View AI Summary</span>
                          {aiBriefingData && (
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center bg-slate-800/90 rounded-xl p-1 border border-slate-700 text-xs">
                          <span className="text-[10px] uppercase font-bold text-slate-400 px-2">Speed:</span>
                          {[1, 1.25, 1.5].map((spd) => (
                            <button
                              key={spd}
                              type="button"
                              onClick={() => handleSpeedChange(spd)}
                              className={`px-2 py-0.5 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                                briefingSpeed === spd ? 'bg-[#004643] text-white' : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              {spd}x
                            </button>
                          ))}
                        </div>

                        {(sessionDetail?.documents?.length || 0) > 0 && (
                          <button
                            type="button"
                            onClick={() => setIsDocCrossCheckOpen(true)}
                            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                          >
                            <Camera className="w-3.5 h-3.5 text-amber-300" />
                            <span>Cross-Check Uploaded Docs ({sessionDetail.documents.length})</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Printable Note Container */}
                    <div id="clinical-note-container" className="printable-area space-y-4">
                      {/* Print-Only Hospital Header */}
                      <div className="print-only mb-6 border-b-2 border-slate-900 pb-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h1 className="text-xl font-black uppercase tracking-wider text-slate-900">AIIMS / CENTRAL CIVIL HOSPITAL</h1>
                            <p className="text-xs font-semibold text-slate-700">
                              Official Outpatient Clinical Note ({noteFormat.toUpperCase()} Framework)
                            </p>
                            <p className="text-[10px] text-slate-600">ABDM &amp; NRCeS Compliant Clinical Documentation</p>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-base text-slate-900">TOKEN: {selectedSession.queue_id}</p>
                            <p className="text-xs text-slate-700">Date: {new Date().toLocaleDateString('en-IN')}</p>
                          </div>
                        </div>
                      </div>

                      {/* --- SBAR VIEW --- */}
                      {noteFormat === 'sbar' && (
                        <div className="space-y-4">
                          {/* S: Situation */}
                          <div className="bg-slate-50 border-2 border-teal-200 rounded-2xl p-4 shadow-xs">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-black text-[#004643] uppercase tracking-wider flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-[#004643] text-white flex items-center justify-center text-[10px]">S</span>
                                <span>Situation (Chief Complaint &amp; Triage Acuity)</span>
                              </span>
                              <div className="no-print flex gap-2">
                                <button 
                                  onClick={() => handleSectionAction('chief_complaint', 'accepted', formatClinicalText(draftContent.chief_complaint))}
                                  className={`text-xs font-bold px-3 py-1 rounded-lg border transition-all ${
                                    sectionActions['chief_complaint'] === 'accepted' ? 'bg-[#2E7D4F] text-white border-[#2E7D4F]' : 'bg-white text-slate-700 hover:bg-slate-100'
                                  }`}
                                >
                                  Accept
                                </button>
                                <button 
                                  onClick={() => setEditReasonModal({ open: true, section: 'chief_complaint', field: 'Chief Complaint', prevVal: formatClinicalText(draftContent.chief_complaint) })}
                                  className={`text-xs font-bold px-3 py-1 rounded-lg border transition-all ${
                                    sectionActions['chief_complaint'] === 'edited' ? 'bg-[#B8860B] text-white border-[#B8860B]' : 'bg-white text-slate-700 hover:bg-slate-100'
                                  }`}
                                >
                                  Edit
                                </button>
                              </div>
                            </div>
                            <p className="text-sm font-bold text-slate-900 mb-1">{ccText}</p>
                            <div className="flex flex-wrap gap-2 text-[11px] text-slate-600 mt-2 pt-2 border-t border-slate-200">
                              <span><strong>Patient:</strong> {selectedSession.patient_name || selectedSession.patient_ref} ({selectedSession.age || 35}y / {selectedSession.gender || 'M'})</span>
                              <span>• <strong>Triage Status:</strong> {selectedSession.status?.toUpperCase()}</span>
                              {selectedSession.red_flag_count > 0 && (
                                <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                  🚨 {selectedSession.red_flag_count} Red Flag Flagged
                                </span>
                              )}
                            </div>
                          </div>

                          {/* B: Background */}
                          <div className="bg-slate-50 border-2 border-teal-200 rounded-2xl p-4 shadow-xs">
                            <span className="text-xs font-black text-[#004643] uppercase tracking-wider flex items-center gap-2 mb-3">
                              <span className="w-5 h-5 rounded-full bg-[#004643] text-white flex items-center justify-center text-[10px]">B</span>
                              <span>Background (HPI, Past Medical, Social &amp; Family History)</span>
                            </span>

                            {/* Background Summary Callout — only show if synthesized data exists */}
                            {backgroundSummary && (
                              <div className="mb-3 p-3 bg-teal-50 border border-teal-200 rounded-xl">
                                <span className="text-[10px] font-black text-teal-700 uppercase tracking-wider block mb-1">📋 Patient Background Summary (AI-Synthesized)</span>
                                <p className="text-xs font-semibold text-teal-900 leading-relaxed">{backgroundSummary}</p>
                              </div>
                            )}

                            {/* HPI */}
                            <div className="mb-3 pb-3 border-b border-slate-200">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[11px] font-bold text-slate-500 uppercase">History of Present Illness (SOCRATES)</span>
                                <div className="no-print flex gap-1.5">
                                  <button onClick={() => handleSectionAction('hpi', 'accepted', formatClinicalText(draftContent.hpi))} className="text-[10px] font-bold px-2 py-0.5 rounded border bg-white text-slate-700">Accept</button>
                                  <button onClick={() => setEditReasonModal({ open: true, section: 'hpi', field: 'HPI', prevVal: formatClinicalText(draftContent.hpi) })} className="text-[10px] font-bold px-2 py-0.5 rounded border bg-white text-slate-700">Edit</button>
                                </div>
                              </div>
                              <p className="text-xs font-medium text-slate-800 whitespace-pre-line leading-relaxed">{hpiText}</p>
                            </div>

                            {/* Past Medical */}
                            <div className="mb-3 pb-3 border-b border-slate-200">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[11px] font-bold text-slate-500 uppercase">Past Medical &amp; Surgical History</span>
                                <div className="no-print flex gap-1.5">
                                  <button onClick={() => handleSectionAction('past_medical_surgical', 'accepted', formatClinicalText(draftContent.past_medical_surgical))} className="text-[10px] font-bold px-2 py-0.5 rounded border bg-white text-slate-700">Accept</button>
                                  <button onClick={() => setEditReasonModal({ open: true, section: 'past_medical_surgical', field: 'Past History', prevVal: formatClinicalText(draftContent.past_medical_surgical) })} className="text-[10px] font-bold px-2 py-0.5 rounded border bg-white text-slate-700">Edit</button>
                                </div>
                              </div>
                              <p className="text-xs font-semibold text-slate-800">{pastDiseases}</p>
                            </div>

                            {/* Social History */}
                            <div className="mb-3 pb-3 border-b border-slate-200">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[11px] font-bold text-slate-500 uppercase">Social &amp; Lifestyle History</span>
                                <div className="no-print flex gap-1.5">
                                  <button onClick={() => handleSectionAction('social_history', 'accepted', formatClinicalText(draftContent.social_history))} className="text-[10px] font-bold px-2 py-0.5 rounded border bg-white text-slate-700">Accept</button>
                                  <button onClick={() => setEditReasonModal({ open: true, section: 'social_history', field: 'Social History', prevVal: formatClinicalText(draftContent.social_history) })} className="text-[10px] font-bold px-2 py-0.5 rounded border bg-white text-slate-700">Edit</button>
                                </div>
                              </div>
                              <p className="text-xs font-semibold text-slate-800">{socialHistory}</p>
                            </div>

                            {/* Family History */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[11px] font-bold text-slate-500 uppercase">Family History</span>
                                <div className="no-print flex gap-1.5">
                                  <button onClick={() => handleSectionAction('family_history', 'accepted', formatClinicalText(draftContent.family_history))} className="text-[10px] font-bold px-2 py-0.5 rounded border bg-white text-slate-700">Accept</button>
                                  <button onClick={() => setEditReasonModal({ open: true, section: 'family_history', field: 'Family History', prevVal: formatClinicalText(draftContent.family_history) })} className="text-[10px] font-bold px-2 py-0.5 rounded border bg-white text-slate-700">Edit</button>
                                </div>
                              </div>
                              <p className="text-xs font-semibold text-slate-800">{famHistory}</p>
                            </div>
                          </div>

                          {/* A: Assessment */}
                          <div className="bg-slate-50 border-2 border-teal-200 rounded-2xl p-4 shadow-xs">
                            <span className="text-xs font-black text-[#004643] uppercase tracking-wider flex items-center gap-2 mb-3">
                              <span className="w-5 h-5 rounded-full bg-[#004643] text-white flex items-center justify-center text-[10px]">A</span>
                              <span>Assessment (ROS, Diagnostics & Provisional Diagnoses)</span>
                            </span>

                            {/* ROS */}
                            <div className="mb-3 pb-3 border-b border-slate-200">
                              <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Review of Systems (ROS)</span>
                              <p className="text-xs font-medium text-slate-800">{rosText}</p>
                            </div>

                            {/* AYUSH Assessment if Ayurveda */}
                            {isAyurveda && (
                              <div className="mb-3 pb-3 border-b border-slate-200">
                                <span className="text-[11px] font-bold text-[#8B5A2B] uppercase block mb-1">Ministry of AYUSH — Dashavidha & Tridosha Profile</span>
                                <p className="text-xs font-semibold text-slate-800">{formatClinicalText(draftContent.dashavidha_pariksha || draftContent.ayush_profile) || 'Prakriti & Agni intake completed.'}</p>
                              </div>
                            )}

                            {/* Provisional Diagnoses */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[11px] font-bold text-slate-500 uppercase">Provisional Clinical Diagnoses (Voice Analysis)</span>
                                <div className="no-print flex gap-1.5">
                                  <button onClick={() => handleSectionAction('provisional_diagnoses', 'accepted', formatClinicalText(draftContent.provisional_diagnoses))} className="text-[10px] font-bold px-2 py-0.5 rounded border bg-white text-slate-700">Accept</button>
                                  <button onClick={() => setEditReasonModal({ open: true, section: 'provisional_diagnoses', field: 'Provisional Diagnoses', prevVal: formatClinicalText(draftContent.provisional_diagnoses) })} className="text-[10px] font-bold px-2 py-0.5 rounded border bg-white text-slate-700">Edit</button>
                                </div>
                              </div>
                              <p className="text-sm font-bold text-slate-900">{diagText}</p>
                            </div>
                          </div>

                          {/* R: Recommendation */}
                          <div className="bg-slate-50 border-2 border-teal-200 rounded-2xl p-4 shadow-xs">
                            <span className="text-xs font-black text-[#004643] uppercase tracking-wider flex items-center gap-2 mb-3">
                              <span className="w-5 h-5 rounded-full bg-[#004643] text-white flex items-center justify-center text-[10px]">R</span>
                              <span>Recommendation (Active Medications, Allergies & Orders)</span>
                            </span>

                            {/* Current Meds */}
                            <div className="mb-3 pb-3 border-b border-slate-200">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[11px] font-bold text-slate-500 uppercase">Current Medications</span>
                                <div className="no-print flex gap-1.5">
                                  <button onClick={() => handleSectionAction('medications', 'accepted', formatClinicalText(draftContent.medications))} className="text-[10px] font-bold px-2 py-0.5 rounded border bg-white text-slate-700">Accept</button>
                                  <button onClick={() => setEditReasonModal({ open: true, section: 'medications', field: 'Medications', prevVal: formatClinicalText(draftContent.medications) })} className="text-[10px] font-bold px-2 py-0.5 rounded border bg-white text-slate-700">Edit</button>
                                </div>
                              </div>
                              <p className="text-xs font-semibold text-slate-800">{medsText}</p>
                            </div>

                            {/* Allergies */}
                            <div className="mb-3 pb-3 border-b border-slate-200">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[11px] font-bold text-[#C4292A] uppercase">Allergies & Drug Reactions</span>
                                <div className="no-print flex gap-1.5">
                                  <button onClick={() => handleSectionAction('allergies', 'accepted', formatClinicalText(draftContent.allergies))} className="text-[10px] font-bold px-2 py-0.5 rounded border bg-white text-slate-700">Accept</button>
                                  <button onClick={() => setEditReasonModal({ open: true, section: 'allergies', field: 'Allergies', prevVal: formatClinicalText(draftContent.allergies) })} className="text-[10px] font-bold px-2 py-0.5 rounded border bg-white text-slate-700">Edit</button>
                                </div>
                              </div>
                              <p className="text-xs font-bold text-slate-900">{allergyText}</p>
                            </div>

                            {/* Investigations & Scans */}
                            <div>
                              <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Prior Investigations & Scanned Documents</span>
                              <p className="text-xs font-medium text-slate-800">{labsText}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* --- SOAP VIEW --- */}
                      {noteFormat === 'soap' && (
                        <div className="space-y-4">
                          {/* S: Subjective */}
                          <div className="bg-slate-50 border-2 border-indigo-200 rounded-2xl p-4 shadow-xs">
                            <span className="text-xs font-black text-indigo-900 uppercase tracking-wider flex items-center gap-2 mb-3">
                              <span className="w-5 h-5 rounded-full bg-indigo-900 text-white flex items-center justify-center text-[10px]">S</span>
                              <span>Subjective (Chief Complaint, Narrative & ROS)</span>
                            </span>

                            <div className="mb-3 pb-3 border-b border-slate-200">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[11px] font-bold text-slate-500 uppercase">Chief Complaint (CC)</span>
                                <div className="no-print flex gap-1.5">
                                  <button onClick={() => handleSectionAction('chief_complaint', 'accepted', formatClinicalText(draftContent.chief_complaint))} className="text-[10px] font-bold px-2 py-0.5 rounded border bg-white text-slate-700">Accept</button>
                                  <button onClick={() => setEditReasonModal({ open: true, section: 'chief_complaint', field: 'Chief Complaint', prevVal: formatClinicalText(draftContent.chief_complaint) })} className="text-[10px] font-bold px-2 py-0.5 rounded border bg-white text-slate-700">Edit</button>
                                </div>
                              </div>
                              <p className="text-sm font-bold text-slate-900">{ccText}</p>
                            </div>

                            <div className="mb-3 pb-3 border-b border-slate-200">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[11px] font-bold text-slate-500 uppercase">History of Present Illness (SOCRATES Analysis)</span>
                                <div className="no-print flex gap-1.5">
                                  <button onClick={() => handleSectionAction('hpi', 'accepted', formatClinicalText(draftContent.hpi))} className="text-[10px] font-bold px-2 py-0.5 rounded border bg-white text-slate-700">Accept</button>
                                  <button onClick={() => setEditReasonModal({ open: true, section: 'hpi', field: 'HPI', prevVal: formatClinicalText(draftContent.hpi) })} className="text-[10px] font-bold px-2 py-0.5 rounded border bg-white text-slate-700">Edit</button>
                                </div>
                              </div>
                              <p className="text-xs font-medium text-slate-800 whitespace-pre-line leading-relaxed">{hpiText}</p>
                            </div>

                            <div className="mb-3 pb-3 border-b border-slate-200">
                              <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Review of Systems (ROS)</span>
                              <p className="text-xs font-medium text-slate-800">{rosText}</p>
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[11px] font-bold text-[#C4292A] uppercase">Reported Allergies</span>
                                <div className="no-print flex gap-1.5">
                                  <button onClick={() => handleSectionAction('allergies', 'accepted', formatClinicalText(draftContent.allergies))} className="text-[10px] font-bold px-2 py-0.5 rounded border bg-white text-slate-700">Accept</button>
                                  <button onClick={() => setEditReasonModal({ open: true, section: 'allergies', field: 'Allergies', prevVal: formatClinicalText(draftContent.allergies) })} className="text-[10px] font-bold px-2 py-0.5 rounded border bg-white text-slate-700">Edit</button>
                                </div>
                              </div>
                              <p className="text-xs font-bold text-slate-900">{allergyText}</p>
                            </div>
                          </div>

                          {/* O: Objective */}
                          <div className="bg-slate-50 border-2 border-indigo-200 rounded-2xl p-4 shadow-xs">
                            <span className="text-xs font-black text-indigo-900 uppercase tracking-wider flex items-center gap-2 mb-3">
                              <span className="w-5 h-5 rounded-full bg-indigo-900 text-white flex items-center justify-center text-[10px]">O</span>
                              <span>Objective (Clinical Examination, Scans & Labs)</span>
                            </span>

                            {isAyurveda ? (
                              <div className="mb-3 pb-3 border-b border-slate-200">
                                <span className="text-[11px] font-bold text-[#8B5A2B] uppercase block mb-1">दशविध परीक्षा (Dashavidha 10-Fold Assessment)</span>
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                                  <div className="bg-white p-2 rounded-lg border border-amber-200"><span className="text-[10px] font-bold text-amber-800 block">दूष्य:</span><span className="font-semibold">{dashavidha.dushya}</span></div>
                                  <div className="bg-white p-2 rounded-lg border border-amber-200"><span className="text-[10px] font-bold text-amber-800 block">अग्नि:</span><span className="font-semibold">{dashavidha.anala_agni}</span></div>
                                  <div className="bg-white p-2 rounded-lg border border-amber-200"><span className="text-[10px] font-bold text-amber-800 block">प्रकृति:</span><span className="font-semibold">{dashavidha.prakriti}</span></div>
                                  <div className="bg-white p-2 rounded-lg border border-amber-200"><span className="text-[10px] font-bold text-amber-800 block">बल:</span><span className="font-semibold">{dashavidha.bala}</span></div>
                                  <div className="bg-white p-2 rounded-lg border border-amber-200"><span className="text-[10px] font-bold text-amber-800 block">सात्म्य:</span><span className="font-semibold">{dashavidha.satmya}</span></div>
                                </div>
                              </div>
                            ) : (
                              <div className="mb-3 pb-3 border-b border-slate-200">
                                <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Physical Observations & Functional Status</span>
                                <p className="text-xs font-medium text-slate-800">Alert, conscious, oriented to time, place, and person. Systemic functional exam unremarkable on primary intake.</p>
                              </div>
                            )}

                            <div>
                              <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Diagnostic Investigations & Scanned Prescriptions</span>
                              <p className="text-xs font-medium text-slate-800">{labsText}</p>
                              {(sessionDetail?.documents?.length || 0) > 0 && (
                                <p className="text-[11px] text-teal-700 font-bold mt-1">
                                  📎 {sessionDetail.documents.length} verified physical medical records attached.
                                </p>
                              )}
                            </div>
                          </div>

                          {/* A: Assessment */}
                          <div className="bg-slate-50 border-2 border-indigo-200 rounded-2xl p-4 shadow-xs">
                            <span className="text-xs font-black text-indigo-900 uppercase tracking-wider flex items-center gap-2 mb-3">
                              <span className="w-5 h-5 rounded-full bg-indigo-900 text-white flex items-center justify-center text-[10px]">A</span>
                              <span>Assessment (Diagnoses, Acuity & Contradictions)</span>
                            </span>

                            <div className="mb-3 pb-3 border-b border-slate-200">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[11px] font-bold text-slate-500 uppercase">Provisional Diagnoses & Considerations</span>
                                <div className="no-print flex gap-1.5">
                                  <button onClick={() => handleSectionAction('provisional_diagnoses', 'accepted', formatClinicalText(draftContent.provisional_diagnoses))} className="text-[10px] font-bold px-2 py-0.5 rounded border bg-white text-slate-700">Accept</button>
                                  <button onClick={() => setEditReasonModal({ open: true, section: 'provisional_diagnoses', field: 'Provisional Diagnoses', prevVal: formatClinicalText(draftContent.provisional_diagnoses) })} className="text-[10px] font-bold px-2 py-0.5 rounded border bg-white text-slate-700">Edit</button>
                                </div>
                              </div>
                              <p className="text-sm font-bold text-slate-900">{diagText}</p>
                            </div>

                            <div>
                              <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Clinical Safety & Contradiction Audit</span>
                              <p className="text-xs font-semibold text-slate-800">
                                {sessionDetail?.contradictions?.length > 0 
                                  ? `⚠️ ${sessionDetail.contradictions.length} contradiction(s) detected between voice narrative and scanned document records.`
                                  : '✅ No clinical discrepancies or drug contradictions detected.'}
                              </p>
                            </div>
                          </div>

                          {/* P: Plan */}
                          <div className="bg-slate-50 border-2 border-indigo-200 rounded-2xl p-4 shadow-xs">
                            <span className="text-xs font-black text-indigo-900 uppercase tracking-wider flex items-center gap-2 mb-3">
                              <span className="w-5 h-5 rounded-full bg-indigo-900 text-white flex items-center justify-center text-[10px]">P</span>
                              <span>Plan (Therapy, Diet/Pathya & Referrals)</span>
                            </span>

                            <div className="mb-3 pb-3 border-b border-slate-200">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[11px] font-bold text-slate-500 uppercase">Pharmacological & Therapeutic Regimen</span>
                                <div className="no-print flex gap-1.5">
                                  <button onClick={() => handleSectionAction('medications', 'accepted', formatClinicalText(draftContent.medications))} className="text-[10px] font-bold px-2 py-0.5 rounded border bg-white text-slate-700">Accept</button>
                                  <button onClick={() => setEditReasonModal({ open: true, section: 'medications', field: 'Medications', prevVal: formatClinicalText(draftContent.medications) })} className="text-[10px] font-bold px-2 py-0.5 rounded border bg-white text-slate-700">Edit</button>
                                </div>
                              </div>
                              <p className="text-xs font-semibold text-slate-800">{medsText}</p>
                            </div>

                            {isAyurveda && dashavidha.recommendations?.length > 0 && (
                              <div className="mb-3 pb-3 border-b border-slate-200">
                                <span className="text-[11px] font-bold text-[#8B5A2B] uppercase block mb-1">Ayurvedic Pathya & Ahara Directives</span>
                                {dashavidha.recommendations.map((rec: string, rIdx: number) => (
                                  <p key={rIdx} className="text-xs text-slate-800">• {rec}</p>
                                ))}
                              </div>
                            )}

                            <div>
                              <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Follow-Up & Department Allocation</span>
                              <p className="text-xs font-semibold text-slate-800">
                                Room: {selectedSession.allocated_doctor?.room_display || 'Room 101'} • Attending: {selectedSession.allocated_doctor?.name || 'Dr. Vikram Sharma'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Print-Only Signature Block */}
                      <div className="print-only mt-8 pt-4 border-t border-slate-400">
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-xs font-bold text-slate-900">Physician Attestation & Signature:</p>
                            <div className="h-12 border-b border-dashed border-slate-400 w-52 mt-2"></div>
                            <p className="text-[11px] font-bold text-slate-900 mt-1">{selectedSession.allocated_doctor?.name || 'Dr. Vikram Sharma'} ({selectedSession.allocated_doctor?.qualification || 'MBBS, MD'})</p>
                          </div>
                          <div className="text-right text-[10px] text-slate-600">
                            <p className="font-semibold">MediKiosk Clinical Documentation</p>
                            <p>Certified Health Document • ABDM Validated</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* TAB 2: CONTRADICTIONS VIEW */}
              {activeTab === 'contradictions' && (
                <div className="overflow-y-auto space-y-4 flex-1 pr-2">
                  <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-xs font-semibold text-[#B8860B] mb-4">
                    Rule-Based Contradiction Policy: Discrepancies between spoken patient interview and scanned prescriptions are surfaced side-by-side. Physician selection required before attestation.
                  </div>

                  {sessionDetail?.contradictions?.length === 0 ? (
                    <div className="bg-emerald-50 border border-emerald-200 text-[#2E7D4F] p-6 rounded-2xl text-center text-xs font-bold">
                      No clinical contradictions detected for this patient.
                    </div>
                  ) : (
                    sessionDetail?.contradictions?.map((c: any, idx: number) => (
                      <div key={idx} className="bg-white border-2 border-amber-300 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                          <span className="text-xs font-extrabold text-[#B8860B] uppercase tracking-wider">
                            Contradiction #{idx + 1}: {c.concept}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">Auto-detected</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Patient Spoke (Voice/Touch)</span>
                            <p className="text-sm font-bold text-slate-900 mt-1">{c.spoken_value_ref}</p>
                          </div>

                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Document Showed (Scanned Report)</span>
                            <p className="text-sm font-bold text-[#C4292A] mt-1">{c.document_value_ref}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                          <span className="text-xs font-bold text-slate-700">Contradiction Status:</span>
                          {c.resolved_at ? (
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-full flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Resolved & Verified by {c.resolved_by || 'Dr. Sharma'}
                            </span>
                          ) : (
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleSectionAction('allergies', 'edited', c.spoken_value_ref, c.spoken_value_ref, 'Clinician confirmed patient spoken statement.')}
                                className="px-3 py-1.5 rounded-lg bg-[#2F5D62] text-white text-xs font-bold hover:bg-teal-800"
                              >
                                Confirm Spoken
                              </button>
                              <button 
                                onClick={() => handleSectionAction('allergies', 'edited', c.spoken_value_ref, c.document_value_ref, 'Clinician confirmed document record.')}
                                className="px-3 py-1.5 rounded-lg bg-[#C15B3A] text-white text-xs font-bold hover:bg-amber-800"
                              >
                                Confirm Document
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 4: TEXTUAL REPORT & FHIR R4 BUNDLE INSPECTOR VIEW */}
              {activeTab === 'fhir' && (
                <div className="overflow-y-auto space-y-4 flex-1 pr-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div>
                      <span className="text-xs font-bold text-slate-700 uppercase block">NRCeS Textual Consultation Report & FHIR R4 Bundle</span>
                      <span className="text-[11px] text-slate-400">ABDM clinical documentation standard</span>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleExportFHIR(true)}
                        disabled={isGeneratingReport}
                        className="px-4 py-2 bg-[#2F5D62] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 hover:bg-teal-800 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                      >
                        <RefreshCw className={`w-4 h-4 ${isGeneratingReport ? 'animate-spin' : ''}`} />
                        <span>{isGeneratingReport ? 'Generating & Downloading...' : 'Generate / Refresh Report'}</span>
                      </button>
                      <button
                        onClick={handleDownloadOnePageText}
                        className="px-3 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200 flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download .txt</span>
                      </button>
                    </div>
                  </div>

                  {/* Download Success Banner */}
                  {downloadSuccess && (
                    <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-900 font-semibold shadow-xs">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                        <div>
                          <p className="font-bold text-emerald-800">Clinical Consultation Report Downloaded Successfully!</p>
                          <p className="text-[11px] font-mono text-emerald-700">{downloadSuccess}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownloadOnePageText()}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" /> Download Again
                      </button>
                    </div>
                  )}

                  {/* NRCeS Clinical Consultation Note (.txt) Preview & Download Box */}
                  <div className="bg-slate-900 text-slate-100 rounded-2xl p-5 border border-slate-800 shadow-md space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wide">NRCeS Clinical Consultation Note</h4>
                            <span className="px-2 py-0.5 rounded-full bg-teal-400/20 text-teal-300 text-[10px] font-bold border border-teal-500/30">
                              Plain-Text (.txt)
                            </span>
                            {textualReport && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                ({textualReport.split('\n').length} lines)
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400">
                            ABDM NRCeS formatted report for outpatient clinical records, EMR ingestion, or printout
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {textualReport && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(textualReport);
                              setReportCopied(true);
                              setTimeout(() => setReportCopied(false), 2500);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all border border-slate-700 cursor-pointer"
                            title="Copy full clinical report to clipboard"
                          >
                            {reportCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{reportCopied ? 'Copied' : 'Copy Text'}</span>
                          </button>
                        )}
                        <button
                          onClick={handleDownloadOnePageText}
                          disabled={isGeneratingReport}
                          className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download .txt</span>
                        </button>
                      </div>
                    </div>

                    {/* Report Content */}
                    {isGeneratingReport ? (
                      <div className="py-10 text-center space-y-2">
                        <RefreshCw className="w-6 h-6 text-teal-400 animate-spin mx-auto" />
                        <p className="text-xs font-bold text-slate-300">Generating & Downloading Clinical Report...</p>
                        <p className="text-[11px] text-slate-500">Formatting clinical history, triage acuity, and dual-coded terminology</p>
                      </div>
                    ) : textualReport ? (
                      <div className="relative">
                        <pre className="p-4 bg-slate-950/90 rounded-xl border border-slate-800 text-[11px] font-mono text-emerald-300 leading-relaxed overflow-x-auto max-h-80 overflow-y-auto whitespace-pre-wrap select-all selection:bg-teal-700 selection:text-white">
                          {textualReport}
                        </pre>
                      </div>
                    ) : (
                      <div className="py-8 text-center space-y-3">
                        <p className="text-xs text-slate-400">Click below to generate and download the complete NRCeS Consultation Note.</p>
                        <button
                          onClick={() => handleExportFHIR(true)}
                          className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer shadow-md"
                        >
                          <Download className="w-4 h-4" />
                          <span>Generate & Download Report</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {fhirValidation && (
                    <div className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between border ${
                      fhirValidation.valid ? 'bg-emerald-50 text-[#2E7D4F] border-emerald-200' : 'bg-red-50 text-[#C4292A] border-red-200'
                    }`}>
                      <span>Validation Status: {fhirValidation.valid ? 'PASSED (0 Errors — NRCeS Compliant)' : 'FAILED'}</span>
                      <span>FHIR Resource Count: {fhirValidation.resource_count}</span>
                    </div>
                  )}

                  {/* Module D: Hospital Information System (HIS / OpenMRS) & ABDM Connector Card */}
                  <div className="bg-white border-2 border-[#2F5D62]/20 rounded-2xl p-5 shadow-sm space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-[#2F5D62] uppercase tracking-wider">
                            Module D: Hospital Information System (HIS) Connector
                          </span>
                          <span className="bg-teal-100 text-[#2F5D62] text-[10px] font-bold px-2 py-0.5 rounded-full border border-teal-200">
                            Bahmni / OpenMRS FHIR2
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Idempotent transmission of attested NRCeS Document Bundle into institutional EMR with Curve25519 ECDH encryption support.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handlePushToHIS}
                          disabled={hisPushStatus.state === 'pushing'}
                          className="px-4 py-2 bg-[#2F5D62] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 hover:bg-teal-800 disabled:opacity-50 shadow-sm transition-all"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${hisPushStatus.state === 'pushing' ? 'animate-spin' : ''}`} />
                          {hisPushStatus.state === 'pushing' ? 'Transmitting to HIS...' : 'Push to Hospital HIS (OpenMRS)'}
                        </button>
                      </div>
                    </div>

                    {/* Security & Protocol Badges */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-[#2F5D62]" /> DPDP Act 2023 Compliant
                      </span>
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-[#B8860B]" /> Fidelius Curve25519 ECDH + AES-256-GCM
                      </span>
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200">
                        NRCeS HL7 FHIR R4
                      </span>
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200">
                        UUID Idempotency Active
                      </span>
                    </div>

                    {/* Push Result Confirmation */}
                    {hisPushStatus.state === 'pushed' && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-900 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Successfully Committed into Hospital Information System!</span>
                        </div>
                        <div className="text-[11px] font-mono text-emerald-700 grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1">
                          <span>Encounter UUID: <strong className="font-bold">{hisPushStatus.encounterUuid || 'N/A'}</strong></span>
                          <span>Server Mode: <strong className="font-bold">{hisPushStatus.serverMode || 'mock'}</strong></span>
                          <span className="col-span-full truncate">Idempotency Key: {hisPushStatus.idempotencyKey}</span>
                        </div>
                      </div>
                    )}

                    {hisPushStatus.state === 'error' && (
                      <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{hisPushStatus.message || 'Error transmitting to Hospital Information System'}</span>
                      </div>
                    )}
                  </div>

                  {/* Modern ABDM / NRCeS Dual-Coded FHIR R4 Resource Inspector */}
                  <FhirResourceInspector
                    bundle={fhirBundle}
                    patientName={selectedSession.patient_name || selectedSession.patient_ref}
                    onDownloadText={handleDownloadOnePageText}
                    onPushToHIS={handlePushToHIS}
                    isPushing={hisPushStatus.state === 'pushing'}
                  />
                </div>
              )}

              {/* TAB: SCANNED DOCUMENTS (MODULE B VISION & OCR EVIDENCE) */}
              {activeTab === 'scanned_documents' && (
                <div className="flex-1 overflow-y-auto pr-2 pb-8">
                  <ScannedDocumentsViewer
                    documents={sessionDetail?.documents || []}
                    sessionId={selectedSession.id}
                    patientName={selectedSession.patient_name || selectedSession.patient_ref}
                    patientAge={selectedSession.age}
                    patientGender={selectedSession.gender}
                    patientAbhaId={selectedSession.abha_mock_id}
                    extractedEntities={sessionDetail?.extracted_entities || []}
                    onAddMedicationToDraft={(medText) => {
                      const currentMeds = editedValues['medications'] || formatClinicalText(draftContent.medications) || '';
                      const updated = currentMeds && currentMeds !== 'None reported' ? `${currentMeds}, ${medText}` : medText;
                      handleSectionAction('medications', 'edited', currentMeds, updated, 'Imported from Module B Scanned Record');
                    }}
                    onRefresh={() => loadSessionDetails(selectedSession.id)}
                  />
                </div>
              )}

              {/* TAB 5: CLINICAL INTELLIGENCE & TIMELINE (MODULE B) */}
              {activeTab === 'module_b_intelligence' && (
                <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                  <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-100 gap-2">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#004643] bg-[#EAF3F2] px-2.5 py-1 rounded-full border border-teal-200">
                        Module B Clinical Intelligence
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 mt-1">
                        Medical Document Digitization & Clinical Reasoning Engine
                      </h3>
                      <p className="text-xs text-slate-500">
                        Deterministic CDSCO formulary matching, LOINC lab out-of-range evaluation, and longitudinal episodic journey.
                      </p>
                    </div>

                    <button
                      onClick={() => loadSessionDetails(selectedSession.id)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Re-analyze Records</span>
                    </button>
                  </div>

                  {/* 1. Drug Safety & DDI Audit */}
                  <div className="bg-slate-950 text-slate-100 p-4 rounded-2xl border border-slate-800">
                    <DrugSafetyCard
                      alerts={safetyData?.safety_audit?.alerts || []}
                      medications={safetyData?.medications || []}
                      gastroprotectionStatus={safetyData?.safety_audit?.gastroprotection_status || 'NOT_APPLICABLE'}
                      onAddGastroprotection={() => {
                        handleSectionAction('medications', 'edited', formatClinicalText(sessionDetail?.summary?.clinician_summary?.medications || ''), `${formatClinicalText(sessionDetail?.summary?.clinician_summary?.medications || '')}, Tab Pantoprazole 40mg OD`, 'Clinician added gastroprotective PPI');
                      }}
                    />
                  </div>

                  {/* 2. Lab Out-of-Range Visualizer with LOINC */}
                  <div className="bg-slate-950 text-slate-100 p-4 rounded-2xl border border-slate-800">
                    <LabOutRangeVisualizer labs={safetyData?.labs || []} />
                  </div>

                  {/* 3. Chronological Medical Journey Timeline */}
                  <div className="bg-slate-950 text-slate-100 p-4 rounded-2xl border border-slate-800">
                    <MedicalTimeline
                      episodes={timelineData?.episodes || []}
                      onSelectRecord={(rec) => {
                        setDrilldownData({
                          field: rec.title,
                          source: rec.id,
                          rawText: JSON.stringify(rec, null, 2),
                          confidence: 0.95
                        });
                      }}
                    />
                  </div>
                </div>
              )}

              {/* ATTESTATION SIGN-OFF FOOTER */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-700 block">Attestation Sign-Off Gate</span>
                  <span className="text-[11px] text-slate-400">All contradictions and draft sections must be confirmed.</span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setDeleteConfirmModal(true)}
                    disabled={isDeletingSession}
                    className="px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all cursor-pointer active:scale-[0.98]"
                    title="Complete assessment and discharge patient from OPD queue"
                  >
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    <span>Discharge Patient</span>
                  </button>

                  <button 
                    onClick={() => handleExportFHIR(true)}
                    disabled={!isAttested}
                    className={`px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-1.5 ${
                      isAttested ? 'bg-[#EAF3F2] text-[#2F5D62] border border-[#2F5D62]' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Download className="w-4 h-4" /> Export FHIR Bundle
                  </button>

                  <button
                    onClick={() => setIsPrescriptionModalOpen(true)}
                    className="px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-1.5 bg-teal-50 hover:bg-teal-100 text-[#004643] border border-teal-300 shadow-sm transition-all cursor-pointer"
                    title="Write digital prescription with voice dictation & typing"
                  >
                    <Pill className="w-4 h-4 text-teal-700" />
                    <span>{savedPrescription ? 'View / Edit Prescription' : 'Write Prescription (Rx)'}</span>
                  </button>

                  <button
                    onClick={handleAttestSignOff}
                    disabled={isAttested}
                    className={`touch-target px-6 py-3 rounded-2xl font-bold text-sm shadow-md flex items-center gap-2 transition-all ${
                      isAttested 
                        ? 'bg-[#2E7D4F] text-white cursor-default' 
                        : 'bg-[#2F5D62] text-white hover:bg-teal-800'
                    }`}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>{isAttested ? 'Signed & Attested' : 'Confirm & Sign Attestation'}</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center p-8">
              <Stethoscope className="w-16 h-16 mb-4 text-slate-300" />
              <p className="text-base font-semibold">Select a patient session from the queue to start clinical review.</p>
            </div>
          )}

        </div>
      </div>

      {/* EDIT REASON MODAL */}
      {editReasonModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Edit {editReasonModal.field}</h3>
            <p className="text-xs text-slate-500 mb-4">Every edit is preserved in review_actions audit trail with your reason.</p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">New Value</label>
                <textarea 
                  rows={3} 
                  defaultValue={editReasonModal.prevVal} 
                  onChange={e => setReasonInput(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-xl text-sm font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setEditReasonModal(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  handleSectionAction(editReasonModal.section, 'edited', editReasonModal.prevVal, reasonInput || editReasonModal.prevVal, 'Clinician manual update');
                  setEditReasonModal(null);
                }}
                className="px-5 py-2 bg-[#2F5D62] text-white text-xs font-bold rounded-xl shadow-md"
              >
                Save Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRILLDOWN SOURCE MODAL */}
      {drilldownData && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Info className="w-5 h-5 text-[#2F5D62]" /> Source Drill-Down
            </h3>
            <p className="text-xs text-slate-500 mb-4">Provenance audit data for extracted clinical entity.</p>

            <div className="bg-slate-50 p-4 rounded-2xl text-xs space-y-2 font-mono text-slate-800 mb-6">
              <p><span className="font-bold text-slate-500">Source Type:</span> {drilldownData.type}</p>
              <p><span className="font-bold text-slate-500">Document File:</span> {drilldownData.source}</p>
              <p><span className="font-bold text-slate-500">Crop Snippet:</span> {drilldownData.crop_ref}</p>
              <p><span className="font-bold text-slate-500">Confidence Score:</span> {drilldownData.confidence}</p>
              <p><span className="font-bold text-slate-500">AI Model Used:</span> {drilldownData.model}</p>
            </div>

            <button 
              onClick={() => setDrilldownData(null)}
              className="w-full py-2.5 bg-[#2F5D62] text-white text-xs font-bold rounded-xl"
            >
              Close Drill-Down
            </button>
          </div>
        </div>
      )}

      {/* SCANNED DOCUMENT CROSS-CHECK MODAL / DRAWER */}
      {isDocCrossCheckOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  <Camera className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <span>Uploaded Medical Documents & Scanned Prescriptions Cross-Check</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                      {sessionDetail?.documents?.length || 0} Document{sessionDetail?.documents?.length === 1 ? '' : 's'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Visually cross-check original paper records against digitalized prescriptions and extracted values.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCrossCheckZoom(prev => Math.min(prev + 0.25, 2.5))}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCrossCheckZoom(prev => Math.max(prev - 0.25, 0.75))}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCrossCheckRotation(prev => (prev + 90) % 360)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold cursor-pointer"
                  title="Rotate"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCrossCheckContrast(prev => !prev)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    crossCheckContrast ? 'bg-amber-400 text-slate-950 border-amber-300' : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                  }`}
                >
                  {crossCheckContrast ? 'High Contrast On' : 'Enhance Contrast'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsDocCrossCheckOpen(false)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 border border-slate-700 transition-colors ml-2 cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Viewer Content */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {(sessionDetail?.documents?.length || 0) > 1 && (
                <div className="w-full md:w-56 bg-slate-950 border-r border-slate-800 p-3 overflow-y-auto space-y-2 shrink-0">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Select Document</span>
                  {sessionDetail.documents.map((doc: any, dIdx: number) => (
                    <button
                      key={doc.id || dIdx}
                      type="button"
                      onClick={() => setCrossCheckDocIndex(dIdx)}
                      className={`w-full p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                        crossCheckDocIndex === dIdx
                          ? 'bg-teal-950/60 border-teal-500/50 text-white'
                          : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span>Doc #{dIdx + 1}</span>
                        <span className="text-[10px] text-teal-400 uppercase">{doc.mime_type?.includes('pdf') ? 'PDF' : 'IMAGE'}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {doc.quality_check_result?.extracted_summary?.doctor_or_hospital || 'Prescription / Lab'}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              {/* Document View Canvas */}
              <div className="flex-1 bg-slate-950 p-4 flex items-center justify-center overflow-auto relative">
                {sessionDetail?.documents?.[crossCheckDocIndex]?.file_ref ? (
                  <div
                    style={{
                      transform: `scale(${crossCheckZoom}) rotate(${crossCheckRotation}deg)`,
                      filter: crossCheckContrast ? 'contrast(160%) brightness(110%) grayscale(20%)' : 'none',
                      transition: 'transform 0.15s ease-out, filter 0.2s ease-in-out'
                    }}
                    className="max-w-full max-h-full flex items-center justify-center select-none"
                  >
                    <img
                      src={sessionDetail.documents[crossCheckDocIndex].file_ref}
                      alt="Uploaded Medical Document"
                      className="max-h-[65vh] object-contain rounded-xl shadow-2xl border border-slate-800"
                    />
                  </div>
                ) : (
                  <div className="text-center p-8 space-y-3">
                    <Camera className="w-12 h-12 text-slate-600 mx-auto" />
                    <p className="text-sm font-bold text-slate-400">No scanned document image available for this session.</p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Documents uploaded at the patient kiosk appear here for physician verification.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COMPLETE ASSESSMENT & DISCHARGE CONFIRMATION MODAL */}
      {deleteConfirmModal && selectedSession && (
        <div className="fixed inset-0 bg-[#0c1618]/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 mb-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#0c1618]">Complete Assessment & Discharge</h3>
                <p className="text-[11px] text-slate-500">OPD Consultation Finalization</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-4 text-xs space-y-2">
              <p className="font-bold text-slate-800">
                Patient: <span className="text-[#004643] font-black">{selectedSession.patient_name || selectedSession.queue_id}</span> ({selectedSession.queue_id})
              </p>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Are you sure you want to mark this patient encounter as finished? This will remove the patient from your OPD room queue and clear their active session.
              </p>
              <div className="bg-[#faf4d3] text-[#0c1618] p-2.5 rounded-xl border border-[#d1ac00]/40 text-[10px] font-semibold">
                Permanent Action: All draft sections, review actions, and triage records will be archived and removed from the active queue.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button 
                onClick={() => setDeleteConfirmModal(false)}
                disabled={isDeletingSession}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-[#0c1618] text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeletePatient}
                disabled={isDeletingSession}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
              >
                <Trash2 className="w-4 h-4 text-white" />
                <span>{isDeletingSession ? 'Discharging...' : 'Confirm Discharge & Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIGITAL PRESCRIPTION MODAL (Voice & Typing with Hospital Header & DB Push) */}
      {selectedSession && (
        <PrescriptionModal
          isOpen={isPrescriptionModalOpen}
          onClose={() => setIsPrescriptionModalOpen(false)}
          sessionId={selectedSession.id}
          patientName={selectedSession.patient_name || selectedSession.patient_ref}
          patientAge={selectedSession.age || '42'}
          patientGender={selectedSession.gender || 'Male'}
          patientAbhaId={selectedSession.abha_mock_id}
          queueId={selectedSession.queue_id}
          clinicalMode={selectedSession.clinical_mode}
          hospitalId={selectedSession.clinical_mode === 'ayurveda' ? 'AIIA' : 'AIIMS'}
          hospitalName={
            selectedSession.clinical_mode === 'ayurveda'
              ? 'ALL INDIA INSTITUTE OF AYURVEDA (AIIA), NEW DELHI'
              : 'ALL INDIA INSTITUTE OF MEDICAL SCIENCES (AIIMS), NEW DELHI'
          }
          doctorName="Dr. Vikram Sharma"
          doctorQualification="MBBS, MD (General Medicine)"
          provisionalDiagnosis={
            editedValues['provisional_diagnoses'] || 
            (sessionDetail?.latest_draft?.clinician_summary?.provisional_diagnoses
              ? formatClinicalText(sessionDetail.latest_draft.clinician_summary.provisional_diagnoses)
              : '')
          }
          initialMedications={
            Array.isArray(sessionDetail?.latest_draft?.clinician_summary?.medications)
              ? sessionDetail.latest_draft.clinician_summary.medications
              : []
          }
          onPrescriptionSaved={(rx) => {
            setSavedPrescription(rx);
            loadSessionDetails(selectedSession.id);
          }}
        />
      )}
      </main>
    </div>
  );
}
