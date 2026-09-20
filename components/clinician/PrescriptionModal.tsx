'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Pill, 
  Plus, 
  Trash2, 
  Mic, 
  CheckCircle2, 
  AlertTriangle, 
  Printer, 
  Save, 
  X, 
  FileText,
  ShieldCheck,
  RotateCw
} from '@/components/Icons';

export interface PrescriptionMedicineItem {
  id: string;
  name: string;
  dosage: string;
  morning: number;    // 0, 1, 2
  afternoon: number;  // 0, 1, 2
  night: number;      // 0, 1, 2
  frequency_display: string; // e.g. "1 - 0 - 1"
  timing: string;     // 'After Meals (PC)', 'Before Meals (AC)', 'Empty Stomach', 'At Bedtime (HS)'
  duration: string;   // '3 Days', '5 Days', '7 Days', '14 Days', '1 Month'
  instructions?: string;
}

interface PrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  patientName?: string;
  patientAge?: string | number;
  patientGender?: string;
  patientAbhaId?: string;
  queueId?: string;
  clinicalMode?: string;
  hospitalId?: string;
  hospitalName?: string;
  doctorName?: string;
  doctorQualification?: string;
  provisionalDiagnosis?: string;
  initialMedications?: any[];
  onPrescriptionSaved?: (prescription: any) => void;
}

export const PrescriptionModal: React.FC<PrescriptionModalProps> = ({
  isOpen,
  onClose,
  sessionId,
  patientName = 'Patient',
  patientAge = '42',
  patientGender = 'Male',
  patientAbhaId,
  queueId = 'Q-101',
  clinicalMode = 'allopathy',
  hospitalId,
  hospitalName,
  doctorName = 'Dr. Vikram Sharma',
  doctorQualification = 'MBBS, MD (General Medicine)',
  provisionalDiagnosis = '',
  initialMedications = [],
  onPrescriptionSaved
}) => {
  // Determine hospital title and credentials
  const isAyurveda = clinicalMode === 'ayurveda' || (hospitalId && hospitalId.toLowerCase().includes('ayush'));
  const effectiveHospitalId = hospitalId || (isAyurveda ? 'AIIA' : 'AIIMS');
  const effectiveHospitalName = hospitalName || (isAyurveda
    ? 'ALL INDIA INSTITUTE OF AYURVEDA (AIIA), NEW DELHI'
    : 'ALL INDIA INSTITUTE OF MEDICAL SCIENCES (AIIMS), NEW DELHI');
  const hospitalSubtitle = isAyurveda
    ? 'National Autonomous Apex Institute • Ministry of Ayush, Government of India'
    : 'Autonomous Institute of National Importance • Ministry of Health & Family Welfare, Govt. of India';

  // Diagnosis & Prescriptions state
  const [diagnosis, setDiagnosis] = useState<string>(provisionalDiagnosis || 'Acute Clinical Assessment');
  const [medications, setMedications] = useState<PrescriptionMedicineItem[]>([]);
  const [generalAdvice, setGeneralAdvice] = useState<string>(
    isAyurveda
      ? 'Pathya: Take warm freshly prepared meals. Avoid spicy, heavy, deep-fried food. Drink lukewarm water.'
      : 'Maintain hydration, take prescribed medications strictly after meals, rest adequately, and monitor temperature/BP.'
  );
  const [followUpDate, setFollowUpDate] = useState<string>('After 5 Days (or SOS if symptoms worsen)');

  // Form input state for adding a medicine
  const [medNameInput, setMedNameInput] = useState<string>('');
  const [medDoseInput, setMedDoseInput] = useState<string>('500 mg');
  const [morningCount, setMorningCount] = useState<number>(1);
  const [afternoonCount, setAfternoonCount] = useState<number>(0);
  const [nightCount, setNightCount] = useState<number>(1);
  const [timingInput, setTimingInput] = useState<string>('After Meals (PC)');
  const [durationInput, setDurationInput] = useState<string>('5 Days');
  const [instructionsInput, setInstructionsInput] = useState<string>('');

  // Voice recording & Speech recognition state
  const [isListening, setIsListening] = useState<boolean>(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Submission & Save state
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Initialize medications from existing summary/entities if available
  useEffect(() => {
    if (!isOpen) return;

    if (Array.isArray(initialMedications) && initialMedications.length > 0) {
      const items: PrescriptionMedicineItem[] = initialMedications.map((m: any, idx: number) => {
        const rawName = typeof m === 'string' ? m : (m.name || m.drug_name || `Medicine ${idx + 1}`);
        const rawDose = typeof m === 'object' ? (m.dosage || m.dose || '500 mg') : '500 mg';
        const rawFreq = typeof m === 'object' ? (m.frequency || m.sig || '1-0-1') : '1-0-1';

        // Parse morning, afternoon, night from frequency string
        let mCount = 1, aCount = 0, nCount = 1;
        const freqParts = rawFreq.match(/\b(\d)\s*[-+]\s*(\d)\s*[-+]\s*(\d)\b/);
        if (freqParts) {
          mCount = parseInt(freqParts[1], 10) || 0;
          aCount = parseInt(freqParts[2], 10) || 0;
          nCount = parseInt(freqParts[3], 10) || 0;
        } else if (/OD|once daily/i.test(rawFreq)) {
          mCount = 1; aCount = 0; nCount = 0;
        } else if (/BD|twice daily/i.test(rawFreq)) {
          mCount = 1; aCount = 0; nCount = 1;
        } else if (/TDS|thrice daily/i.test(rawFreq)) {
          mCount = 1; aCount = 1; nCount = 1;
        }

        return {
          id: `med-${Date.now()}-${idx}`,
          name: rawName,
          dosage: rawDose,
          morning: mCount,
          afternoon: aCount,
          night: nCount,
          frequency_display: `${mCount} - ${aCount} - ${nCount}`,
          timing: typeof m === 'object' && m.timing ? m.timing : 'After Meals (PC)',
          duration: typeof m === 'object' && m.duration ? m.duration : '5 Days',
          instructions: typeof m === 'object' && m.instructions ? m.instructions : ''
        };
      });
      setMedications(items);
    } else if (medications.length === 0) {
      // Default common starter item
      setMedications([
        {
          id: `med-default-${Date.now()}`,
          name: isAyurveda ? 'Trikatu Churna' : 'Paracetamol (Dolo 650)',
          dosage: isAyurveda ? '3 grams' : '650 mg',
          morning: 1,
          afternoon: 0,
          night: 1,
          frequency_display: '1 - 0 - 1',
          timing: isAyurveda ? 'Before Meals with Warm Water' : 'After Meals (PC)',
          duration: '5 Days',
          instructions: isAyurveda ? 'Take with lukewarm water' : 'For fever or generalized pain'
        }
      ]);
    }

    if (provisionalDiagnosis) {
      setDiagnosis(provisionalDiagnosis);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, provisionalDiagnosis]);

  // Web Speech API Voice Recognition setup
  const toggleVoiceRecording = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    setVoiceNotice(null);
    setVoiceTranscript('');

    const windowObj = window as any;
    const SpeechRecognition = windowObj.SpeechRecognition || windowObj.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceNotice('Voice input is not supported in this browser. Please type or use Chrome / Edge.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN'; // Indian English, also accepts medical terminology

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceNotice('Listening... Speak medication name, dosage, timing, or clinical advice.');
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setVoiceTranscript(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        setVoiceNotice(`Speech recognition notice: ${event.error}`);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.warn('Voice recognition initialization error:', err.message);
      setIsListening(false);
      setVoiceNotice('Could not access microphone for voice dictation.');
    }
  };

  // Parse voice text into structured medication item or append to advice
  const handleApplyVoiceTranscript = () => {
    if (!voiceTranscript.trim()) return;
    const text = voiceTranscript.trim();

    // Check if voice text sounds like a prescription instruction
    let parsedDose = '500 mg';
    const doseMatch = text.match(/\b\d+(\.\d+)?\s*(mg|mcg|g|grams|ml|iu|tablet|tab)\b/i);
    if (doseMatch) parsedDose = doseMatch[0];

    let m = 1, a = 0, n = 1;
    if (/morning and night|morning night|twice daily|bd/i.test(text)) {
      m = 1; a = 0; n = 1;
    } else if (/thrice daily|three times|tds/i.test(text)) {
      m = 1; a = 1; n = 1;
    } else if (/once daily|only morning|od/i.test(text)) {
      m = 1; a = 0; n = 0;
    } else if (/night only|bedtime|hs/i.test(text)) {
      m = 0; a = 0; n = 1;
    }

    let timing = 'After Meals (PC)';
    if (/before meal|empty stomach|ac/i.test(text)) timing = 'Before Meals (AC)';
    else if (/bedtime/i.test(text)) timing = 'At Bedtime (HS)';

    let duration = '5 Days';
    const durMatch = text.match(/\b\d+\s*(days|weeks|months)\b/i);
    if (durMatch) duration = durMatch[0];

    // Extract potential drug name (first 1-3 words)
    const cleanedWords = text.replace(/give|prescribe|take|patient|tablet|tab|capsule|cap/gi, '').trim().split(/\s+/);
    const candidateName = cleanedWords.slice(0, 3).join(' ') || 'Prescribed Medicine';

    // Add as new medication
    const newItem: PrescriptionMedicineItem = {
      id: `med-${Date.now()}`,
      name: candidateName,
      dosage: parsedDose,
      morning: m,
      afternoon: a,
      night: n,
      frequency_display: `${m} - ${a} - ${n}`,
      timing,
      duration,
      instructions: `Voice dictated: "${text}"`
    };

    setMedications(prev => [...prev, newItem]);
    setVoiceNotice(`Added "${candidateName}" from voice dictation!`);
    setVoiceTranscript('');
  };

  // Add typed medicine
  const handleAddMedicine = () => {
    if (!medNameInput.trim()) return;

    const newItem: PrescriptionMedicineItem = {
      id: `med-${Date.now()}`,
      name: medNameInput.trim(),
      dosage: medDoseInput.trim() || '500 mg',
      morning: morningCount,
      afternoon: afternoonCount,
      night: nightCount,
      frequency_display: `${morningCount} - ${afternoonCount} - ${nightCount}`,
      timing: timingInput,
      duration: durationInput,
      instructions: instructionsInput.trim()
    };

    setMedications(prev => [...prev, newItem]);
    setMedNameInput('');
    setInstructionsInput('');
  };

  // Remove medicine
  const handleRemoveMedicine = (id: string) => {
    setMedications(prev => prev.filter(m => m.id !== id));
  };

  // Push prescription to hospital database
  const handlePushToHospitalDb = async () => {
    if (medications.length === 0) {
      setSaveError('Please add at least one medication before pushing to hospital database.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    const payload = {
      hospital_id: effectiveHospitalId,
      hospital_name: effectiveHospitalName,
      doctor_name: doctorName,
      doctor_qualification: doctorQualification,
      patient_name: patientName,
      patient_age: String(patientAge),
      patient_gender: patientGender,
      queue_id: queueId,
      abha_id: patientAbhaId || null,
      diagnosis: diagnosis,
      medications: medications,
      general_advice: generalAdvice,
      follow_up_date: followUpDate
    };

    try {
      const res = await fetch(`/api/clinician/session/${sessionId}/prescription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSaveSuccess(`Prescription officially signed and pushed to ${effectiveHospitalName} Database!`);
        if (onPrescriptionSaved) {
          onPrescriptionSaved(data.prescription || payload);
        }
        setTimeout(() => {
          onClose();
        }, 1800);
      } else {
        setSaveError(data.error || 'Failed to push prescription to hospital database.');
      }
    } catch (err: any) {
      setSaveError(err.message || 'Network error saving prescription.');
    } finally {
      setIsSaving(false);
    }
  };

  // Print prescription
  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        
        {/* ============================================================== */}
        {/* OFFICIAL HOSPITAL TITLE & BANNER (Dynamic to respective hospital) */}
        {/* ============================================================== */}
        <div className={`p-6 border-b text-white relative ${
          isAyurveda 
            ? 'bg-gradient-to-r from-[#2B4C3F] via-[#1E3A2F] to-[#152B23] border-emerald-800'
            : 'bg-gradient-to-r from-[#003835] via-[#004643] to-[#08534F] border-teal-800'
        }`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-white/20 text-white border border-white/30 backdrop-blur-xs">
                  {effectiveHospitalId} Outpatient Department (OPD)
                </span>
                <span className="text-xs text-white/60">•</span>
                <span className="text-xs font-semibold text-emerald-200 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Official Attested Digital Prescription
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
                {effectiveHospitalName}
              </h2>
              <p className="text-xs text-white/80 font-medium mt-0.5">
                {hospitalSubtitle}
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Close Prescription Editor"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Patient Demographics Strip */}
          <div className="mt-4 pt-3 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-white/60 text-[11px] block">Patient Name & Demographics</span>
              <span className="font-bold text-white text-sm">{patientName}</span>
              <span className="text-white/80 ml-1.5">({patientAge}y, {patientGender})</span>
            </div>
            <div>
              <span className="text-white/60 text-[11px] block">Queue & OPD ID</span>
              <span className="font-bold text-amber-300 font-mono text-sm">{queueId}</span>
            </div>
            <div>
              <span className="text-white/60 text-[11px] block">ABHA ID (Ayushman Bharat)</span>
              <span className="font-bold text-white font-mono text-xs">
                {patientAbhaId || 'ABHA Not Linked'}
              </span>
            </div>
            <div>
              <span className="text-white/60 text-[11px] block">Consulting Doctor</span>
              <span className="font-bold text-white text-xs">{doctorName}</span>
              <span className="text-[10px] text-white/70 block">{doctorQualification}</span>
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50">

          {/* Alerts & Toasts */}
          {saveSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span className="text-xs font-bold">{saveSuccess}</span>
            </div>
          )}
          {saveError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
              <span className="text-xs font-bold">{saveError}</span>
            </div>
          )}

          {/* 1. Provisional Diagnosis Input */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-700" /> Clinical Diagnosis / Assessment
            </label>
            <input
              type="text"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="e.g. Acute Febrile Illness / Suspected Viral Pharyngitis"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600 bg-slate-50/50"
            />
          </div>

          {/* 2. DUAL-INPUT SECTION: VOICE DICTATION & TYPING */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            
            {/* Top row: Voice Dictation Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-2xl border border-teal-200/80">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold transition-all ${
                  isListening ? 'bg-rose-500 text-white animate-pulse' : 'bg-teal-700 text-white'
                }`}>
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                    Voice Prescription Dictation
                  </h4>
                  <p className="text-[11px] text-slate-600">
                    Dictate medicines, dosage, and timing (morning/afternoon/night) directly by speech.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleVoiceRecording}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs ${
                    isListening
                      ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                      : 'bg-teal-700 hover:bg-teal-800 text-white'
                  }`}
                >
                  <Mic className="w-4 h-4" />
                  <span>{isListening ? 'Stop Listening' : 'Start Voice Dictation'}</span>
                </button>
              </div>
            </div>

            {/* Voice Transcript Preview & Action */}
            {(isListening || voiceTranscript || voiceNotice) && (
              <div className="p-3.5 rounded-xl bg-slate-900 text-white text-xs space-y-2 border border-slate-800">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5 text-teal-400 font-bold">
                    <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" /> Live Speech Transcription
                  </span>
                  {voiceTranscript && (
                    <button
                      onClick={handleApplyVoiceTranscript}
                      className="px-2.5 py-1 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg text-[10px] transition-all cursor-pointer"
                    >
                      + Insert into Prescription
                    </button>
                  )}
                </div>
                <p className="font-mono text-slate-200 min-h-[28px] italic">
                  {voiceTranscript || (isListening ? 'Listening for speech...' : voiceNotice)}
                </p>
                {voiceNotice && <p className="text-amber-400 text-[10px]">{voiceNotice}</p>}
              </div>
            )}

            {/* Manual Typing Form with Explicit Dosage Frequency & Timing */}
            <div className="pt-2 border-t border-slate-100">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-3 block">
                Add Medication via Form
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                {/* Medicine Name */}
                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Medicine / Formulation Name *
                  </label>
                  <input
                    type="text"
                    value={medNameInput}
                    onChange={(e) => setMedNameInput(e.target.value)}
                    placeholder="e.g. Paracetamol 650mg, Amoxicillin"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-teal-600 bg-white"
                  />
                </div>

                {/* Dosage Strength */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Dosage / Strength
                  </label>
                  <input
                    type="text"
                    value={medDoseInput}
                    onChange={(e) => setMedDoseInput(e.target.value)}
                    placeholder="e.g. 650 mg"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-teal-600 bg-white"
                  />
                </div>

                {/* TIME OF DOSAGE: Morning, Afternoon, Night Breakdown */}
                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Dosage Time & Frequency (Morning - Afternoon - Night) *
                  </label>
                  <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                    {/* Morning */}
                    <div className="flex-1 flex flex-col items-center">
                      <span className="text-[10px] font-extrabold text-amber-700 flex items-center gap-0.5">
                        ☀️ Morn
                      </span>
                      <select
                        value={morningCount}
                        onChange={(e) => setMorningCount(Number(e.target.value))}
                        className="w-full mt-0.5 py-1 px-1 rounded-lg text-xs font-bold text-center bg-white border border-slate-300"
                      >
                        <option value={0}>0</option>
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                      </select>
                    </div>

                    <span className="text-slate-400 font-bold">-</span>

                    {/* Afternoon */}
                    <div className="flex-1 flex flex-col items-center">
                      <span className="text-[10px] font-extrabold text-orange-700 flex items-center gap-0.5">
                        ⛅ Noon
                      </span>
                      <select
                        value={afternoonCount}
                        onChange={(e) => setAfternoonCount(Number(e.target.value))}
                        className="w-full mt-0.5 py-1 px-1 rounded-lg text-xs font-bold text-center bg-white border border-slate-300"
                      >
                        <option value={0}>0</option>
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                      </select>
                    </div>

                    <span className="text-slate-400 font-bold">-</span>

                    {/* Night */}
                    <div className="flex-1 flex flex-col items-center">
                      <span className="text-[10px] font-extrabold text-indigo-700 flex items-center gap-0.5">
                        🌙 Night
                      </span>
                      <select
                        value={nightCount}
                        onChange={(e) => setNightCount(Number(e.target.value))}
                        className="w-full mt-0.5 py-1 px-1 rounded-lg text-xs font-bold text-center bg-white border border-slate-300"
                      >
                        <option value={0}>0</option>
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                      </select>
                    </div>

                    {/* Frequency summary badge */}
                    <span className="px-2 py-1 bg-teal-100 text-teal-900 rounded-lg text-xs font-black">
                      {morningCount}-{afternoonCount}-{nightCount}
                    </span>
                  </div>
                </div>

                {/* Add button */}
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={handleAddMedicine}
                    className="w-full py-2 px-3 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                {/* Secondary row: Timing relative to food, duration, notes */}
                <div className="sm:col-span-4">
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                    Relation to Meals
                  </label>
                  <select
                    value={timingInput}
                    onChange={(e) => setTimingInput(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-medium bg-white"
                  >
                    <option value="After Meals (PC)">After Meals (PC / खाने के बाद)</option>
                    <option value="Before Meals (AC)">Before Meals (AC / खाली पेट)</option>
                    <option value="With Food">With Food (भोजन के साथ)</option>
                    <option value="At Bedtime (HS)">At Bedtime (HS / सोते समय)</option>
                    <option value="As Needed (SOS)">As Needed (SOS / आवश्यकतानुसार)</option>
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                    Duration
                  </label>
                  <select
                    value={durationInput}
                    onChange={(e) => setDurationInput(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-medium bg-white"
                  >
                    <option value="3 Days">3 Days</option>
                    <option value="5 Days">5 Days</option>
                    <option value="7 Days">7 Days</option>
                    <option value="10 Days">10 Days</option>
                    <option value="14 Days">14 Days</option>
                    <option value="1 Month">1 Month</option>
                    <option value="Continuous">Continuous / Long Term</option>
                  </select>
                </div>

                <div className="sm:col-span-5">
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                    Special Instructions (Optional)
                  </label>
                  <input
                    type="text"
                    value={instructionsInput}
                    onChange={(e) => setInstructionsInput(e.target.value)}
                    placeholder="e.g. Sip with warm water, avoid dairy"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-medium bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3. STRUCTURED PRESCRIPTION TABLE (STANDARD FORMAT) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pill className="w-4 h-4 text-teal-700" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                  Prescription Medication List ({medications.length} Prescribed)
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Standard Dosage Frequency: Morning - Afternoon - Night (M-A-N)
              </span>
            </div>

            {medications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-medium">
                No medications added yet. Use Voice Dictation or form above to add medicines.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/70 text-slate-700 text-[11px] uppercase font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4">#</th>
                      <th className="py-2.5 px-4">Medicine Name & Strength</th>
                      <th className="py-2.5 px-4 text-center">Dosage Frequency (M - A - N)</th>
                      <th className="py-2.5 px-4">Timing</th>
                      <th className="py-2.5 px-4">Duration</th>
                      <th className="py-2.5 px-4">Instructions</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {medications.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 text-sm block">{item.name}</span>
                          <span className="text-[11px] font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200 inline-block mt-0.5">
                            {item.dosage}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 font-mono font-black text-slate-800">
                            <span className={item.morning > 0 ? 'text-amber-600' : 'text-slate-300'}>{item.morning}</span>
                            <span className="text-slate-300">•</span>
                            <span className={item.afternoon > 0 ? 'text-orange-600' : 'text-slate-300'}>{item.afternoon}</span>
                            <span className="text-slate-300">•</span>
                            <span className={item.night > 0 ? 'text-indigo-600' : 'text-slate-300'}>{item.night}</span>
                          </div>
                          <span className="block text-[10px] text-slate-400 mt-0.5">
                            {item.morning > 0 ? 'Morn ' : ''}
                            {item.afternoon > 0 ? 'Noon ' : ''}
                            {item.night > 0 ? 'Night' : ''}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-700">
                          {item.timing}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {item.duration}
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {item.instructions || '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveMedicine(item.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Remove Medication"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 4. CLINICAL ADVICE & FOLLOW-UP DATE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                Doctor's General Advice / Diet / Warnings
              </label>
              <textarea
                rows={3}
                value={generalAdvice}
                onChange={(e) => setGeneralAdvice(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-teal-600 bg-slate-50/50"
              />
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                Recommended Follow-Up Date & Investigation Orders
              </label>
              <textarea
                rows={3}
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-teal-600 bg-slate-50/50"
              />
            </div>
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>Print Prescription</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel / Close
            </button>

            <button
              type="button"
              onClick={handlePushToHospitalDb}
              disabled={isSaving || medications.length === 0}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 text-white shadow-md transition-all cursor-pointer ${
                isSaving 
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-[#004643] hover:bg-[#003835] active:scale-[0.98]'
              }`}
            >
              {isSaving ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Pushing to Hospital Database...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Confirm & Push to {effectiveHospitalId} Database</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
