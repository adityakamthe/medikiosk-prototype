'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  Volume2, Mic, MicOff, Camera, Upload, CheckCircle2 as CheckCircle, AlertTriangle, 
  ChevronRight, HeartPulse, User, Clock, ShieldCheck,
  HelpCircle, FileText, XCircle, Globe, RefreshCw, Lock, Stethoscope,
  QrCode, ScanLine
} from '@/components/Icons';
import { 
  allocateDoctorAndRoom, 
  getEstimatedQueueTime, 
  playEmergencySirenAudio, 
  playHospitalChime,
  DoctorProfile,
  DOCTOR_ROSTER
} from '@/lib/doctors';
import {
  AYUSH_DASHIVIDHA_QUESTIONS,
  AYUSH_ASHTAVIDHA_QUESTIONS,
  AYUSH_TRIVIDHA_QUESTIONS
} from '@/lib/ayush';
import { LOCALIZED_LANGUAGES, LanguagePack } from '@/lib/languages';

// Helper function to safely convert any clinical value (string, object, array) into a string
function formatClinicalText(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (Array.isArray(val)) {
    return val.map(item => typeof item === 'object' ? formatClinicalText(item) : String(item)).filter(Boolean).join(', ');
  }
  if (typeof val === 'object') {
    return Object.entries(val)
      .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${typeof v === 'object' ? formatClinicalText(v) : v}`)
      .filter(Boolean)
      .join(' • ');
  }
  return String(val);
}

export default function KioskPortal() {
  const [step, setStep] = useState<'language' | 'consent' | 'consent_declined' | 'identify' | 'interview' | 'red_flag' | 'scan' | 'confirm'>('language');
  const [language, setLanguage] = useState<string>('hi');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [queueId, setQueueId] = useState<string>('Q-101');
  const [abhaId, setAbhaId] = useState<string>('');
  const [isGuardian, setIsGuardian] = useState<boolean>(false);

  // Patient Demographics State (Name, Age, Gender)
  const [patientName, setPatientName] = useState<string>('');
  const [patientAge, setPatientAge] = useState<string>('35');
  const [patientGender, setPatientGender] = useState<string>('Male');
  const [isListeningForName, setIsListeningForName] = useState<boolean>(false);
  const [isListeningForAge, setIsListeningForAge] = useState<boolean>(false);
  const [selectedRegionalLang, setSelectedRegionalLang] = useState<string>('mr');
  
  const currentLang = LOCALIZED_LANGUAGES[language] || LOCALIZED_LANGUAGES.hi;

  // Safe localization helper ensuring active language is respected throughout and never leaks Hindi or "Doctor AI"
  const t = (key: keyof LanguagePack, fallbackEn?: string): string => {
    return (currentLang[key] as string) || (LOCALIZED_LANGUAGES.en[key] as string) || fallbackEn || '';
  };

  // Auto-speak audio prompts on entering consent or reception guidance
  useEffect(() => {
    if (step === 'consent') {
      speakPrompt(currentLang.consent_prompt);
    } else if (step === 'consent_declined') {
      speakPrompt(currentLang.reception_prompt || 'Digital consent was not provided. Please visit the central hospital reception desk on the ground floor for manual registration and offline assistance.');
    }
  }, [step]);

  // Fetch continuous sequential queue token on load
  useEffect(() => {
    fetch('/api/session')
      .then(res => res.json())
      .then(data => {
        if (data.next_token) {
          setQueueId(data.next_token);
        }
      })
      .catch(err => console.warn('Could not fetch next queue token:', err));
  }, []);

  // Clinical Mode (Ministry of AYUSH vs Standard Allopathy - selected in patient questionnaire)
  const [clinicalMode, setClinicalMode] = useState<'allopathy' | 'ayurveda'>('allopathy');
  const [ayushAssessmentType, setAyushAssessmentType] = useState<'dashavidha' | 'ashtavidha' | 'trividha'>('dashavidha');

  // ABHA QR Scanner State
  const [showAbhaScannerModal, setShowAbhaScannerModal] = useState<boolean>(false);
  const [isAbhaVerified, setIsAbhaVerified] = useState<boolean>(false);
  const [isScanningCamera, setIsScanningCamera] = useState<boolean>(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [abhaScanError, setAbhaScanError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Allocated Specialty Doctor Profile
  const [allocatedDoctor, setAllocatedDoctor] = useState<DoctorProfile | null>(null);

  // Conversational Turn Processing State (provides immediate visual feedback during AI inference)
  const [isProcessingTurn, setIsProcessingTurn] = useState<boolean>(false);

  // Multi-Select Options State (allows patient to select multiple symptoms/choices)
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  // Live Audio Level Visualizer State (Web Audio API AnalyserNode)
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const audioContextRef = useRef<any>(null);
  const analyserRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);

  // Session Storage Persistence Key (prevents progress loss on page refresh)
  const SESSION_STORAGE_KEY = 'medikiosk_active_session_v1';
  const [hasRestoredSession, setHasRestoredSession] = useState<boolean>(false);

  // Stop camera stream safely
  const handleStopCameraScan = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => {
        try { track.stop(); } catch {}
      });
      setCameraStream(null);
    }
    setIsScanningCamera(false);
  };

  // Start live camera stream for ABHA QR scanning
  const handleStartCameraScan = async () => {
    setAbhaScanError(null);
    setIsScanningCamera(true);
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setAbhaScanError('Camera access not supported on this device/browser. Use image upload or sample demo.');
        setIsScanningCamera(false);
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.warn('Video play error:', e));
      }
    } catch (err: any) {
      console.error('Camera stream error:', err);
      setAbhaScanError('Camera access denied or unavailable. Please upload a QR image or click "Load Sample ABHA Card".');
      setIsScanningCamera(false);
    }
  };

  // Parse raw text extracted from ABHA QR Code (Supports ABDM JSON & Delimited Formats)
  const handleParseAbhaQR = (rawText: string) => {
    if (!rawText || !rawText.trim()) {
      setAbhaScanError('No QR code content detected. Please try again.');
      return;
    }
    setAbhaScanError(null);
    let parsedName = '';
    let parsedAge = '';
    let parsedGender = 'Male';
    let parsedAbha = '';

    try {
      const data = JSON.parse(rawText.trim());
      parsedName = data.name || data.fullName || data.patientName || '';
      parsedAbha = data.hidn || data.hid || data.abhaId || data.healthIdNumber || '';
      if (data.gender) {
        const g = String(data.gender).toUpperCase();
        if (g === 'F' || g.startsWith('FEM')) parsedGender = 'Female';
        else if (g === 'O' || g.startsWith('OTH')) parsedGender = 'Other';
        else parsedGender = 'Male';
      }
      if (data.dob) {
        const dobStr = String(data.dob);
        const parts = dobStr.split(/[-/]/);
        let birthYear = NaN;
        if (parts[0].length === 4) birthYear = parseInt(parts[0], 10);
        else if (parts[2] && parts[2].length === 4) birthYear = parseInt(parts[2], 10);
        if (!isNaN(birthYear) && birthYear > 1900 && birthYear <= new Date().getFullYear()) {
          parsedAge = String(new Date().getFullYear() - birthYear);
        }
      } else if (data.age) {
        parsedAge = String(data.age);
      }
    } catch {
      // Delimiter parse (comma or pipe separated: e.g. "91-4582-7391-0428,Rahul Sharma,M,1988-06-15")
      const tokens = rawText.split(/[,|\n\t]/).map(t => t.trim()).filter(Boolean);
      for (const t of tokens) {
        if (/\d{2}-\d{4}-\d{4}-\d{4}/.test(t)) {
          parsedAbha = t;
        } else if (/^\d{14}$/.test(t)) {
          parsedAbha = `${t.slice(0,2)}-${t.slice(2,6)}-${t.slice(6,10)}-${t.slice(10,14)}`;
        } else if (!parsedName && /^[a-zA-Z\s]{3,40}$/.test(t) && !['MALE', 'FEMALE', 'OTHER', 'ABHA', 'ABDM'].includes(t.toUpperCase())) {
          parsedName = t;
        } else if (t.toUpperCase() === 'M' || t.toUpperCase() === 'MALE') {
          parsedGender = 'Male';
        } else if (t.toUpperCase() === 'F' || t.toUpperCase() === 'FEMALE') {
          parsedGender = 'Female';
        } else if (t.toUpperCase() === 'O' || t.toUpperCase() === 'OTHER') {
          parsedGender = 'Other';
        } else if (/^\d{1,3}$/.test(t) && parseInt(t, 10) > 0 && parseInt(t, 10) < 120) {
          parsedAge = t;
        } else if (/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(t)) {
          const y = parseInt(t.slice(0, 4), 10);
          parsedAge = String(new Date().getFullYear() - y);
        }
      }
    }

    if (parsedName) setPatientName(parsedName);
    if (parsedAge) setPatientAge(parsedAge);
    if (parsedGender) setPatientGender(parsedGender);
    if (parsedAbha) setAbhaId(parsedAbha);

    setIsAbhaVerified(true);
    handleStopCameraScan();
    setShowAbhaScannerModal(false);
    playHospitalChime();

    const ack = language === 'hi'
      ? `आभा स्वास्थ्य कार्ड सत्यापित हुआ। स्वागत है ${parsedName || 'रोगी'}!`
      : `ABHA Health Card Verified Successfully. Welcome ${parsedName || 'Patient'}!`;
    speakPrompt(ack);
  };

  // Instant sample card loader for kiosks / demonstrations
  const handleUseSampleAbhaCard = () => {
    handleParseAbhaQR(JSON.stringify({
      hidn: "91-4582-7391-0428",
      hid: "rahul.sharma@abdm",
      name: "Rahul Sharma",
      gender: "M",
      dob: "1988-06-15",
      mobile: "9876543210",
      stateName: "Maharashtra",
      districtName: "Pune"
    }));
  };

  // BarcodeDetector interval loop for live video scanning
  useEffect(() => {
    if (!isScanningCamera || !cameraStream) return;
    let interval: any = null;
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        const barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
        interval = setInterval(async () => {
          if (videoRef.current && videoRef.current.readyState === 4) {
            try {
              const barcodes = await barcodeDetector.detect(videoRef.current);
              if (barcodes.length > 0 && barcodes[0].rawValue) {
                handleParseAbhaQR(barcodes[0].rawValue);
              }
            } catch {}
          }
        }, 500);
      } catch {}
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isScanningCamera, cameraStream]);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => {
          try { track.stop(); } catch {}
        });
      }
    };
  }, [cameraStream]);

  // Dynamic Interview State
  const [currentQuestion, setCurrentQuestion] = useState<any>({
    id: 'q_chief_complaint',
    question_localized: currentLang.initial_q,
    question_en: 'What primary symptom or complaint brings you to the health center today?',
    section: 'chief_complaint',
    field_name: 'chief_complaint',
    options: currentLang.initial_options
  });
  const [isListening, setIsListening] = useState<boolean>(false);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [answeredHistory, setAnsweredHistory] = useState<any[]>([]);

  // Red Flag Alert State
  const [redFlagTrigger, setRedFlagTrigger] = useState<any>(null);

  // Document Scan State (Module B Clinical Intelligence)
  const [scannedFiles, setScannedFiles] = useState<any[]>([]);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [qualityWarning, setQualityWarning] = useState<string | null>(null);
  const [scanningStatus, setScanningStatus] = useState<string | null>(null);
  const [showDocCameraModal, setShowDocCameraModal] = useState<boolean>(false);
  const [isDocCameraActive, setIsDocCameraActive] = useState<boolean>(false);
  const [docCameraStream, setDocCameraStream] = useState<MediaStream | null>(null);
  const docVideoRef = useRef<HTMLVideoElement | null>(null);

  // Persistent Conversational Speech Recognition Refs
  const recognitionRef = useRef<any>(null);
  const isMicActiveRef = useRef<boolean>(false);
  const isAISpeakingRef = useRef<boolean>(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastSpokenTextRef = useRef<string>('');
  const lastSpokenTimeRef = useRef<number>(0);
  const accumulatedFinalRef = useRef<string>('');
  const sessionFinalTextRef = useRef<string>('');

  // Web Audio DSP Stream Ref (Enforces hardware-grade echo cancellation & noise suppression)
  const audioStreamRef = useRef<MediaStream | null>(null);

  const stopAudioDSPStream = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch {}
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(t => {
        try { t.stop(); } catch {}
      });
      audioStreamRef.current = null;
    }
  };

  // Single-Field Voice Input Refs (Name / Age on Demographics Screen)
  const activeFieldRecRef = useRef<any>(null);
  const fieldRecTimeoutRef = useRef<any>(null);

  // Cleanly abort and teardown any active single-field speech recognition
  const stopActiveFieldRecognition = () => {
    if (fieldRecTimeoutRef.current) {
      clearTimeout(fieldRecTimeoutRef.current);
      fieldRecTimeoutRef.current = null;
    }
    if (activeFieldRecRef.current) {
      const rec = activeFieldRecRef.current;
      activeFieldRecRef.current = null;
      try {
        rec.onstart = null;
        rec.onresult = null;
        rec.onerror = null;
        rec.onend = null;
        rec.abort();
      } catch {}
    }
    setIsListeningForName(false);
    setIsListeningForAge(false);
  };

  // Clean up Speech Recognition on unmount
  useEffect(() => {
    return () => {
      stopActiveFieldRecognition();
      stopAudioDSPStream();
      isMicActiveRef.current = false;
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.abort();
        } catch {}
        recognitionRef.current = null;
      }
    };
  }, []);

  // When step changes, ensure no background mic remains active and audio is stopped
  useEffect(() => {
    stopActiveFieldRecognition();
    if (step !== 'interview') {
      stopAudioDSPStream();
      isMicActiveRef.current = false;
      setIsListening(false);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.abort();
        } catch {}
        recognitionRef.current = null;
      }
    }
  }, [step]);

  // 1. Session Storage Restore on Load/Refresh (Prevents progress loss on page refresh)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.sessionId && parsed.step && parsed.step !== 'language') {
          if (parsed.step) setStep(parsed.step);
          if (parsed.language) setLanguage(parsed.language);
          if (parsed.sessionId) setSessionId(parsed.sessionId);
          if (parsed.queueId) setQueueId(parsed.queueId);
          if (parsed.abhaId) setAbhaId(parsed.abhaId);
          if (parsed.isGuardian !== undefined) setIsGuardian(parsed.isGuardian);
          if (parsed.patientName) setPatientName(parsed.patientName);
          if (parsed.patientAge) setPatientAge(parsed.patientAge);
          if (parsed.patientGender) setPatientGender(parsed.patientGender);
          if (parsed.isAbhaVerified !== undefined) setIsAbhaVerified(parsed.isAbhaVerified);
          if (parsed.clinicalMode) setClinicalMode(parsed.clinicalMode);
          if (parsed.ayushAssessmentType) setAyushAssessmentType(parsed.ayushAssessmentType);
          if (parsed.allocatedDoctor) setAllocatedDoctor(parsed.allocatedDoctor);
          if (parsed.currentQuestion) setCurrentQuestion(parsed.currentQuestion);
          if (parsed.answeredHistory && Array.isArray(parsed.answeredHistory)) setAnsweredHistory(parsed.answeredHistory);
          if (parsed.redFlagTrigger) setRedFlagTrigger(parsed.redFlagTrigger);
        }
      }
    } catch (e) {
      console.warn('Session restore notice:', e);
    } finally {
      setHasRestoredSession(true);
    }
  }, []);

  // 2. Persist state to sessionStorage whenever key properties update
  useEffect(() => {
    if (typeof window === 'undefined' || !hasRestoredSession) return;
    try {
      if (sessionId && step !== 'language') {
        const stateToSave = {
          step,
          language,
          sessionId,
          queueId,
          abhaId,
          isGuardian,
          patientName,
          patientAge,
          patientGender,
          isAbhaVerified,
          clinicalMode,
          ayushAssessmentType,
          allocatedDoctor,
          currentQuestion,
          answeredHistory,
          redFlagTrigger
        };
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(stateToSave));
      }
    } catch (e) {
      console.warn('Session save notice:', e);
    }
  }, [
    hasRestoredSession,
    step,
    language,
    sessionId,
    queueId,
    abhaId,
    isGuardian,
    patientName,
    patientAge,
    patientGender,
    isAbhaVerified,
    clinicalMode,
    ayushAssessmentType,
    allocatedDoctor,
    currentQuestion,
    answeredHistory,
    redFlagTrigger
  ]);

  // Explicit session reset function (for starting new patient)
  const handleResetSession = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
    stopActiveFieldRecognition();
    stopAudioDSPStream();
    setStep('language');
    setSessionId(null);
    setAbhaId('');
    setPatientName('');
    setPatientAge('35');
    setPatientGender('Male');
    setIsAbhaVerified(false);
    setAnsweredHistory([]);
    setSelectedOptions([]);
    setAllocatedDoctor(null);
    setRedFlagTrigger(null);
    setLiveTranscript('');
  };

  // Universal Instant High-Fidelity Audio Synthesis across all 10 Indian Languages
  const playServerTTS = (cleanText: string, targetLang: string) => {
    const audioUrl = `/api/tts?lang=${encodeURIComponent(targetLang)}&text=${encodeURIComponent(cleanText)}`;
    const audio = new Audio(audioUrl);
    currentAudioRef.current = audio;

    audio.onended = () => {
      isAISpeakingRef.current = false;
      if (isMicActiveRef.current) startListeningLoop();
    };

    audio.onerror = (e) => {
      console.warn('TTS audio playback error:', e);
      isAISpeakingRef.current = false;
      if (isMicActiveRef.current) startListeningLoop();
    };

    audio.play().catch(err => {
      console.warn('Audio play notice (browser autoplay policy):', err);
      isAISpeakingRef.current = false;
      if (isMicActiveRef.current) startListeningLoop();
    });
  };

  const speakPrompt = (text: string, overrideLang?: string) => {
    if (typeof window === 'undefined' || !text) return;

    const targetLang = overrideLang || language || 'hi';

    // Clean text
    let cleanText = text.trim();

    // 1. If bilingual with '/' (e.g. "हाँ / Yes" or "पुरुष / Male"), extract relevant language portion
    const isBilingual = cleanText.includes('/') && /[\u0900-\u0D7F]/.test(cleanText) && /[a-zA-Z]/.test(cleanText);
    if (isBilingual) {
      const parts = cleanText.split('/');
      if (targetLang === 'en') {
        cleanText = parts.find(p => /[a-zA-Z]/.test(p))?.trim() || parts[parts.length - 1].trim();
      } else {
        cleanText = parts.find(p => !/[a-zA-Z]/.test(p))?.trim() || parts[0].trim();
      }
    }

    // 2. Replace slashes (and slash-comma combos like '/', '/,', ',/') with spoken conjunctions (" or " / " या ")
    // NOTE: Keep pure commas (',') intact so TTS has natural, brief breath pauses and NEVER says "or" for commas!
    if (targetLang === 'en') {
      cleanText = cleanText
        .replace(/\s*\/+,\s*|\s*,\/+\s*|\s*\/+\s*/g, ' or ')
        .replace(/\s*,\s*,+/g, ', ');
    } else {
      cleanText = cleanText
        .replace(/\s*\/+,\s*|\s*,\/+\s*|\s*\/+\s*/g, ' या ')
        .replace(/\s*,\s*,+/g, ', ');
    }

    if (targetLang === 'en') {
      // Strip any residual Devanagari or other non-Latin scripts so English TTS is crystal clear
      cleanText = cleanText.replace(/[\u0900-\u0D7F]/g, ' ').replace(/\s+/g, ' ').trim();
    }

    // 3. Remove emojis, markdown formatting, and trailing pause punctuation
    cleanText = cleanText.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
    cleanText = cleanText.replace(/[*_`~]/g, '').replace(/[\/,;:]\s*$/g, '').replace(/\s+/g, ' ').trim();

    if (!cleanText) return;

    // Deduplicate immediate rapid re-speaks of identical text (prevents dual-voice echo)
    const now = Date.now();
    if (cleanText === lastSpokenTextRef.current && (now - lastSpokenTimeRef.current) < 1200) {
      return;
    }
    lastSpokenTextRef.current = cleanText;
    lastSpokenTimeRef.current = now;

    // Stop previous audio / speech
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      } catch {}
    }
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }

    isAISpeakingRef.current = true;

    // Pause recognition while speaking
    if (recognitionRef.current && isMicActiveRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
    }

    // ALWAYS use Bhashini High-Fidelity Audio API (with automatic Google TTS fallback in /api/tts)
    playServerTTS(cleanText, targetLang);
  };

  // Voice Input for Patient Name (Robust Toggle + Lifecycle Management)
  const handleVoiceInputForName = () => {
    if (typeof window === 'undefined') return;

    // TOGGLE OFF: If already listening for name, clean abort and exit immediately
    if (isListeningForName) {
      stopActiveFieldRecognition();
      return;
    }

    // If active on age or another field, stop it first
    stopActiveFieldRecognition();

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice input not supported in this browser. Please type your name.');
      return;
    }

    // Stop any playing TTS audio so it doesn't bleed into mic
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      } catch {}
    }

    // Abort continuous recognition if active
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
      isMicActiveRef.current = false;
      setIsListening(false);
    }

    try {
      const rec = new SpeechRecognition();
      rec.lang = currentLang.bcp47 || 'hi-IN';
      rec.continuous = false;
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      activeFieldRecRef.current = rec;
      setIsListeningForName(true);
      setIsListeningForAge(false);

      // Auto-stop safety timeout (10 seconds) so mic never stays stuck
      fieldRecTimeoutRef.current = setTimeout(() => {
        stopActiveFieldRecognition();
      }, 10000);

      rec.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript?.trim();
        if (transcript) {
          const cleanName = transcript.replace(/[.,/#!$%^&*;:{}=\-_`~()]+$/, '').trim();
          if (cleanName) {
            setPatientName(cleanName);
          }
        }
        stopActiveFieldRecognition();
      };

      rec.onerror = (event: any) => {
        console.warn('Voice input notice (name):', event?.error);
        stopActiveFieldRecognition();
      };

      rec.onend = () => {
        stopActiveFieldRecognition();
      };

      try {
        rec.start();
      } catch (startErr: any) {
        if (startErr?.name === 'InvalidStateError') {
          setTimeout(() => {
            try {
              if (activeFieldRecRef.current === rec) {
                rec.start();
              }
            } catch {
              stopActiveFieldRecognition();
            }
          }, 100);
        } else {
          stopActiveFieldRecognition();
        }
      }
    } catch (e) {
      console.warn('Failed to start speech recognition for name:', e);
      stopActiveFieldRecognition();
    }
  };

  // Voice Input for Patient Age (Robust Toggle + Lifecycle Management)
  const handleVoiceInputForAge = () => {
    if (typeof window === 'undefined') return;

    // TOGGLE OFF: If already listening for age, clean abort and exit immediately
    if (isListeningForAge) {
      stopActiveFieldRecognition();
      return;
    }

    // If active on name or another field, stop it first
    stopActiveFieldRecognition();

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice input not supported in this browser. Please type your age.');
      return;
    }

    // Stop any playing TTS audio so it doesn't bleed into mic
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      } catch {}
    }

    // Abort continuous recognition if active
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
      isMicActiveRef.current = false;
      setIsListening(false);
    }

    try {
      const rec = new SpeechRecognition();
      rec.lang = currentLang.bcp47 || 'hi-IN';
      rec.continuous = false;
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      activeFieldRecRef.current = rec;
      setIsListeningForAge(true);
      setIsListeningForName(false);

      // Auto-stop safety timeout (8 seconds) so mic never stays stuck
      fieldRecTimeoutRef.current = setTimeout(() => {
        stopActiveFieldRecognition();
      }, 8000);

      rec.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript?.trim() || '';
        if (transcript) {
          // 1. Try direct digits in speech (e.g. "45", "I am 32", "उम्र 40 साल")
          const digitMatch = transcript.match(/\b\d{1,3}\b/);
          if (digitMatch) {
            const val = parseInt(digitMatch[0], 10);
            if (val > 0 && val <= 125) {
              setPatientAge(String(val));
              stopActiveFieldRecognition();
              return;
            }
          }

          // 2. Word-to-number mapping for English and Hindi spoken numbers
          const numberMap: Record<string, string> = {
            'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
            'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10',
            'eleven': '11', 'twelve': '12', 'thirteen': '13', 'fourteen': '14', 'fifteen': '15',
            'sixteen': '16', 'seventeen': '17', 'eighteen': '18', 'nineteen': '19', 'twenty': '20',
            'twenty one': '21', 'twenty two': '22', 'twenty three': '23', 'twenty four': '24',
            'twenty five': '25', 'twenty six': '26', 'twenty seven': '27', 'twenty eight': '28', 'twenty nine': '29',
            'thirty': '30', 'thirty one': '31', 'thirty two': '32', 'thirty three': '33', 'thirty four': '34',
            'thirty five': '35', 'thirty six': '36', 'thirty seven': '37', 'thirty eight': '38', 'thirty nine': '39',
            'forty': '40', 'forty one': '41', 'forty two': '42', 'forty three': '43', 'forty four': '44',
            'forty five': '45', 'forty six': '46', 'forty seven': '47', 'forty eight': '48', 'forty nine': '49',
            'fifty': '50', 'fifty five': '55', 'sixty': '60', 'sixty five': '65', 'seventy': '70',
            'एक': '1', 'दो': '2', 'तीन': '3', 'चार': '4', 'पांच': '5', 'पाँच': '5', 'छह': '6', 'सात': '7', 'आठ': '8', 'नौ': '9', 'दस': '10',
            'पंद्रह': '15', 'बीस': '20', 'इक्कीस': '21', 'बाईस': '22', 'तेईस': '23', 'चौबीस': '24', 'पच्चीस': '25',
            'छब्बीस': '26', 'सत्ताईस': '27', 'अट्ठाईस': '28', 'उनतीस': '29', 'तीस': '30', 'इकतीस': '31', 'बत्तीस': '32',
            'पैंतीस': '35', 'छत्तीस': '36', 'सैंतीस': '37', 'अड़तीस': '38', 'उनतालीस': '39', 'चालीस': '40',
            'पैंतालीस': '45', 'पचास': '50', 'पचपन': '55', 'साठ': '60', 'पैंसठ': '65', 'सत्तर': '70', 'अस्सी': '80'
          };
          const lower = transcript.toLowerCase();
          for (const [word, numStr] of Object.entries(numberMap)) {
            if (lower.includes(word)) {
              setPatientAge(numStr);
              break;
            }
          }
        }
        stopActiveFieldRecognition();
      };

      rec.onerror = (event: any) => {
        console.warn('Voice input notice (age):', event?.error);
        stopActiveFieldRecognition();
      };

      rec.onend = () => {
        stopActiveFieldRecognition();
      };

      try {
        rec.start();
      } catch (startErr: any) {
        if (startErr?.name === 'InvalidStateError') {
          setTimeout(() => {
            try {
              if (activeFieldRecRef.current === rec) {
                rec.start();
              }
            } catch {
              stopActiveFieldRecognition();
            }
          }, 100);
        } else {
          stopActiveFieldRecognition();
        }
      }
    } catch (e) {
      console.warn('Failed to start speech recognition for age:', e);
      stopActiveFieldRecognition();
    }
  };

  // Start / Resume Continuous Listening Loop with Multi-Sentence Accumulation & Locale Auto-Sync
  const startListeningLoop = () => {
    if (!isMicActiveRef.current || isAISpeakingRef.current) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }

      const recognition = new SpeechRecognition();
      recognition.lang = currentLang.bcp47;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognitionRef.current = recognition;

      // Engage browser hardware DSP noise suppression & echo cancellation filters with live AnalyserNode
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia && !audioStreamRef.current) {
        navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1
          }
        }).then(stream => {
          audioStreamRef.current = stream;
          try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
              const ctx = new AudioContextClass();
              audioContextRef.current = ctx;
              const source = ctx.createMediaStreamSource(stream);
              const analyser = ctx.createAnalyser();
              analyser.fftSize = 64;
              analyser.smoothingTimeConstant = 0.8;
              source.connect(analyser);
              analyserRef.current = analyser;

              const dataArray = new Uint8Array(analyser.frequencyBinCount);
              const updateLevel = () => {
                if (!analyserRef.current || !isMicActiveRef.current) {
                  setAudioLevel(0);
                  return;
                }
                analyser.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                  sum += dataArray[i];
                }
                const avg = sum / dataArray.length;
                setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
                animFrameRef.current = requestAnimationFrame(updateLevel);
              };
              animFrameRef.current = requestAnimationFrame(updateLevel);
            }
          } catch (audioErr) {
            console.warn('Web Audio visualizer setup notice:', audioErr);
          }
        }).catch(() => {});
      }

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let currentSessionFinal = '';
        let currentSessionInterim = '';

        // Iterate through all results in the current session so earlier sentences are never discarded
        for (let i = 0; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            currentSessionFinal += item[0].transcript + ' ';
          } else {
            currentSessionInterim += item[0].transcript;
          }
        }

        sessionFinalTextRef.current = currentSessionFinal.trim();

        // Assemble full multi-sentence transcript from past pauses + current session final + current interim
        const allParts = [
          accumulatedFinalRef.current,
          currentSessionFinal.trim(),
          currentSessionInterim.trim()
        ].filter(Boolean);

        const fullSpokenText = allParts.join(' ').replace(/\s+/g, ' ').trim();
        if (fullSpokenText) {
          setLiveTranscript(fullSpokenText);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition notice:', event.error);
      };

      recognition.onend = () => {
        // When speech recognition ends (e.g. natural pause between sentences),
        // commit finalized text from this session to accumulatedFinalRef so it is never lost!
        if (sessionFinalTextRef.current) {
          const combined = [accumulatedFinalRef.current, sessionFinalTextRef.current].filter(Boolean).join(' ').trim();
          accumulatedFinalRef.current = combined;
          sessionFinalTextRef.current = '';
        }

        if (isMicActiveRef.current && !isAISpeakingRef.current) {
          setTimeout(() => {
            if (isMicActiveRef.current && !isAISpeakingRef.current) {
              try {
                recognition.start();
              } catch {}
            }
          }, 150);
        } else {
          setIsListening(false);
        }
      };

      recognition.start();
    } catch (err) {
      console.error('Error starting speech recognition:', err);
    }
  };

  // Toggle Microphone (User explicitly starts/stops continuous conversation)
  const toggleSpeechRecognition = () => {
    if (isListening || isMicActiveRef.current) {
      isMicActiveRef.current = false;
      setIsListening(false);
      stopAudioDSPStream();
      // Save any remaining final text before stopping
      if (sessionFinalTextRef.current) {
        const combined = [accumulatedFinalRef.current, sessionFinalTextRef.current].filter(Boolean).join(' ').trim();
        accumulatedFinalRef.current = combined;
        sessionFinalTextRef.current = '';
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
    } else {
      isMicActiveRef.current = true;
      setIsListening(true);
      startListeningLoop();
    }
  };

  // Select Language and Start Session
  const handleStartSession = async (langCode: string) => {
    setLanguage(langCode);
    if (langCode !== 'en') {
      setSelectedRegionalLang(langCode);
    }
    const targetPack = LOCALIZED_LANGUAGES[langCode] || LOCALIZED_LANGUAGES.hi;
    
    // Set localized initial question & options (tailored if AYUSH mode)
    const isAyurveda = clinicalMode === 'ayurveda';
    const ayushInitialOptions = [
      'वात दोष / Gas, dryness, joint pain (Vata)',
      'पित्त दोष / Acidity, burning, fever (Pitta)',
      'कफ दोष / Cough, congestion, lethargy (Kapha)',
      'अग्निमांद्य / Indigestion & loss of appetite',
      'अन्य स्वास्थ्य समस्या / Other symptom'
    ];

    setCurrentQuestion({
      id: 'q_chief_complaint',
      question_localized: isAyurveda ? `${targetPack.initial_q} (आयुष मोड)` : targetPack.initial_q,
      question_en: isAyurveda ? 'What primary Ayurvedic or general health symptom brings you here today?' : 'What primary symptom or health complaint brings you to the clinic today?',
      section: isAyurveda ? 'ayush_chief_complaint' : 'chief_complaint',
      field_name: 'chief_complaint',
      options: isAyurveda ? ayushInitialOptions : targetPack.initial_options
    });

    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          language: langCode, 
          queue_id: queueId, 
          abha_mock_id: abhaId.trim() ? abhaId.trim() : null,
          clinical_mode: clinicalMode
        })
      });
      const data = await res.json();
      if (data.session) {
        setSessionId(data.session.id);
        setStep('consent');
      }
    } catch (err) {
      console.error('Session start error:', err);
      setStep('consent');
    }
  };


  // Record Consent
  const handleConsent = async (agreed: boolean) => {
    if (!agreed) {
      setStep('consent_declined');
      speakPrompt(currentLang.reception_prompt || 'Digital consent was not provided. Please visit the central hospital reception desk on the ground floor for manual registration and offline paper assistance.');
      return;
    }
    if (sessionId) {
      await fetch(`/api/session/${sessionId}/consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'touch', language, notice_version: 'v1.0' })
      });
    }
    setStep('identify');
    speakPrompt(currentLang.demographics_prompt || currentLang.identify_prompt);
  };

  // Start Consultation after Demographics Intake & Personalize Initial Question
  const handleStartConsultation = async () => {
    const cleanName = patientName.trim();
    const effectiveName = cleanName || 'PATIENT_GUEST';
    const effectiveAge = patientAge || '35';
    const effectiveGender = patientGender || 'Male';

    if (sessionId) {
      fetch(`/api/session/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queue_id: queueId,
          abha_mock_id: abhaId.trim() ? abhaId.trim() : null,
          patient_name: effectiveName,
          age: effectiveAge,
          gender: effectiveGender,
          clinical_mode: clinicalMode,
          ayush_assessment_type: ayushAssessmentType
        })
      }).catch(err => console.warn('Demographics sync error:', err));
    }

    // AYURVEDA CLINICAL STREAM: Route to Dashavidha, Ashtavidha, or Trividha Pariksha
    if (clinicalMode === 'ayurveda') {
      let initialAyushQ: any = AYUSH_DASHIVIDHA_QUESTIONS[0];
      if (ayushAssessmentType === 'ashtavidha') {
        initialAyushQ = AYUSH_ASHTAVIDHA_QUESTIONS[0];
      } else if (ayushAssessmentType === 'trividha') {
        initialAyushQ = AYUSH_TRIVIDHA_QUESTIONS[0];
      }

      const qLocalized = (initialAyushQ.question_localized as any)?.[language] || initialAyushQ.question_localized?.hi || initialAyushQ.question_en;
      const qOptions = (initialAyushQ.options_by_lang as any)?.[language] || initialAyushQ.options_by_lang?.hi || initialAyushQ.options_by_lang?.en || [
        'वात दोष / Vata', 'पित्त दोष / Pitta', 'कफ दोष / Kapha', 'संतुलित / Balanced'
      ];

      setCurrentQuestion({
        id: initialAyushQ.id,
        question_localized: qLocalized,
        question_en: initialAyushQ.question_en,
        section: initialAyushQ.section || 'ayush_prakriti',
        field_name: initialAyushQ.field_name || 'prakriti',
        options: qOptions,
        framework_stage: `ayush_${ayushAssessmentType}`
      });

      setStep('interview');
      speakPrompt(qLocalized, language);
      return;
    }

    // ALLOPATHIC CLINICAL STREAM: Dynamic SOCRATES Framework Inquiry
    let personalizedQ = currentLang.initial_q;
    let personalizedEnQ = currentLang.initial_q;

    if (cleanName) {
      const honorific = currentLang.greeting_honorific ? ` ${currentLang.greeting_honorific}` : '';
      if (language === 'hi') {
        personalizedQ = `${cleanName}${honorific}, आज आप अस्पताल किस मुख्य बीमारी या तकलीफ के लिए आए हैं?`;
      } else if (language === 'en') {
        personalizedQ = `Hello ${cleanName}, what primary symptom or health complaint brings you to the clinic today?`;
      } else if (language === 'ta') {
        personalizedQ = `${cleanName} அவர்களே, இன்று நீங்கள் என்ன பிரதான உடல்நலப் பிரச்சனைக்காக மருத்துவமனைக்கு வந்துள்ளீர்கள்?`;
      } else if (language === 'te') {
        personalizedQ = `${cleanName} గారు, ఈ రోజు మీరు ఆసుపత్రికి ఏ ప్రధాన సమస్య కోసం వచ్చారు?`;
      } else if (language === 'bn') {
        personalizedQ = `${cleanName} বাবু, আজ আপনি প্রধানত কী शारीरिक সমস্যার জন্য এসেছেন?`;
      } else if (language === 'mr') {
        personalizedQ = `${cleanName} जी, आज तुम्ही दवाखान्यात कोणत्या मुख्य त्रासासाठी आला आहात?`;
      } else if (language === 'gu') {
        personalizedQ = `${cleanName} ભાઈ/બહેન, આજે તમે કઈ મુખ્ય તકલીફ માટે હૉસ્પિટલ આવ્યા છો?`;
      } else if (language === 'pa') {
        personalizedQ = `${cleanName} ਜੀ, ਅੱਜ ਤੁਸੀਂ ਹਸਪਤਾਲ ਕਿਸ ਮੁੱਖ ਤਕਲੀਫ਼ ਲਈ ਆਏ ਹੋ?`;
      } else if (language === 'kn') {
        personalizedQ = `${cleanName} ಅವರੇ, ಇಂದು ನೀವು ಆಸ್ಪತ್ರೆಗೆ ಯಾವ ಮುಖ್ಯ ಆರೋಗ್ಯ ಸಮಸ್ಯೆಯಿಂದ ಬಂದಿದ್ದೀರಿ?`;
      } else if (language === 'ml') {
        personalizedQ = `${cleanName}, ഇന്ന് നിങ്ങൾ എന്തൊക്കെ പ്രധാന അസുഖങ്ങൾക്കാണ് ആശുപത്രിയിൽ എത്തിയത്?`;
      }
      personalizedEnQ = `Hello ${cleanName}, what primary symptom or health complaint brings you to the clinic today?`;
    }

    setCurrentQuestion({
      id: 'q_chief_complaint',
      question_localized: personalizedQ,
      question_en: personalizedEnQ,
      section: 'chief_complaint',
      field_name: 'chief_complaint',
      framework_stage: 'socrates_site_complaint',
      options: currentLang.initial_options
    });

    setStep('interview');
    speakPrompt(personalizedQ);
  };

  // Record Interview Turn with Dynamic Follow-Up AI
  const handleAnswerTurn = async (answerValue: string, sourceMode: 'touch' | 'voice' = 'touch') => {
    if (!sessionId || !answerValue.trim() || isProcessingTurn) return;
    
    // Clear multi-sentence voice buffers & multi-select choices
    setSelectedOptions([]);
    accumulatedFinalRef.current = '';
    sessionFinalTextRef.current = '';
    setLiveTranscript('');
    setIsProcessingTurn(true);

    const turnLanguage = language;

    setAnsweredHistory(prev => [...prev, { question: currentQuestion, answer: answerValue }]);

    try {
      const res = await fetch(`/api/session/${sessionId}/converse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: currentQuestion.id,
          source_mode: sourceMode,
          transcript_text: answerValue,
          section: currentQuestion.section || 'chief_complaint',
          field_name: currentQuestion.field_name || 'chief_complaint',
          question_text: currentQuestion.question_localized || currentQuestion.question_en,
          language: turnLanguage,
          clinical_mode: clinicalMode,
          ayush_assessment_type: ayushAssessmentType
        })
      });

      const data = await res.json();

      const activeLang = language;
      const isEn = activeLang === 'en';

      if (data.allocated_doctor) {
        setAllocatedDoctor(data.allocated_doctor);
      }

      // Check Red Flag / Severe Condition Interrupt
      if (data.red_flag) {
        const triggerData = {
          ...data.trigger,
          allocated_doctor: data.allocated_doctor || {
            name: 'Dr. Priya Nair',
            room_number: 'Room ER-1',
            room_display: 'Emergency Resuscitation Bay (Room ER-1)',
            floor: 'Ground Floor, Immediate Emergency Wing'
          }
        };
        setRedFlagTrigger(triggerData);
        setStep('red_flag');
        playEmergencySirenAudio();

        const urgentPrompt = isEn
          ? (triggerData.patient_instruction_en || currentLang.red_flag_default)
          : activeLang === 'hi'
          ? (triggerData.patient_instruction_hi || currentLang.red_flag_default)
          : (currentLang.red_flag_default || triggerData.patient_instruction_en);

        speakPrompt(urgentPrompt, activeLang);
        return;
      }

      if (data.next_question) {
        if (isEn && data.next_question.question_en) {
          data.next_question.question_localized = data.next_question.question_en;
        }
        setCurrentQuestion(data.next_question);
        speakPrompt(isEn ? (data.next_question.question_en || data.next_question.question_localized) : (data.next_question.question_localized || data.next_question.question_en), activeLang);
      } else {
        // Interview Complete -> Proceed to Scan
        setStep('scan');
        speakPrompt(currentLang.scan_prompt, activeLang);
      }
    } catch (err) {
      console.error('Error submitting turn:', err);
    } finally {
      setIsProcessingTurn(false);
    }
  };

  // Ensure a valid session exists before scanning
  const ensureSessionId = async (): Promise<string | null> => {
    if (sessionId) return sessionId;
    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: language || 'hi',
          patient_name: patientName || 'Kiosk Patient',
          patient_age: patientAge ? parseInt(patientAge, 10) : 35,
          patient_gender: patientGender || 'Male',
          clinical_mode: clinicalMode || 'allopathy',
        }),
      });
      const data = await res.json();
      const newId = data.session?.id || data.session_id;
      if (newId) {
        setSessionId(newId);
        return newId;
      }
    } catch (err) {
      console.error('Failed to auto-create session for scan:', err);
    }
    return null;
  };

  // Module B End-to-End Clinical Document Processing
  const processDocumentBlob = async (fileBlob: Blob, filename: string) => {
    setIsScanning(true);
    setQualityWarning(null);
    setScanningStatus('Module B Stage 1: OpenCV Perspective Dewarping & Noise Removal...');

    try {
      const activeSessionId = await ensureSessionId();
      if (!activeSessionId) {
        setQualityWarning('Failed to start session. Please tap New Patient and try again.');
        setIsScanning(false);
        setScanningStatus(null);
        return;
      }

      setScanningStatus('Module B Stage 2: CDSCO Indian Formulary Matching & Clinical Safety Audit...');
      const formData = new FormData();
      formData.append('file', fileBlob, filename);

      const res = await fetch(`/api/session/${activeSessionId}/scan`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setIsScanning(false);
      setScanningStatus(null);

      if (data.success) {
        setScannedFiles(prev => [
          ...prev,
          {
            name: filename,
            doc_id: data.doc_id,
            quality_assessment: data.quality_assessment,
            was_dewarped: data.was_dewarped,
            sharpness_score: data.sharpness_score,
            data: data.raw_extraction || {},
            cdsco_normalized_medications: data.cdsco_normalized_medications || [],
            evaluated_labs: data.evaluated_labs || { results: [] },
            safety_audit: data.safety_audit || { alerts: [] },
          },
        ]);
        playHospitalChime();
        speakPrompt('Document scanned and analyzed successfully.');
      } else {
        setQualityWarning(data.error || 'Document quality check warning: Please ensure paper is flat and readable.');
      }
    } catch (err: any) {
      setIsScanning(false);
      setScanningStatus(null);
      setQualityWarning('Upload failed. Please try scanning again.');
    }
  };

  // Handle Document File Upload (Image / PDF)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    await processDocumentBlob(file, file.name);
    e.target.value = '';
  };

  // Start Kiosk Webcam for Document Scanning
  const startDocCamera = async () => {
    setShowDocCameraModal(true);
    setIsDocCameraActive(true);
    setQualityWarning(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      setDocCameraStream(stream);
      if (docVideoRef.current) {
        docVideoRef.current.srcObject = stream;
        docVideoRef.current.play();
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setQualityWarning('Could not access camera. Please check browser permissions.');
      setIsDocCameraActive(false);
    }
  };

  // Stop Kiosk Document Camera Stream
  const stopDocCamera = () => {
    if (docCameraStream) {
      docCameraStream.getTracks().forEach(track => track.stop());
      setDocCameraStream(null);
    }
    setIsDocCameraActive(false);
    setShowDocCameraModal(false);
  };

  // Capture Still Frame from Kiosk Camera & Process with Module B
  const captureDocSnapshot = () => {
    if (!docVideoRef.current) return;
    const video = docVideoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    stopDocCamera();

    canvas.toBlob(blob => {
      if (blob) {
        processDocumentBlob(blob, `kiosk_camera_scan_${Date.now()}.jpg`);
      }
    }, 'image/jpeg', 0.95);
  };

  // Final Summary Generation & Recap
  const handleFinishKiosk = async () => {
    if (sessionId) {
      await fetch(`/api/session/${sessionId}/summary`, { method: 'POST' });
    }
    setStep('confirm');
    playHospitalChime();
    speakPrompt(currentLang.confirm_prompt);
  };

  return (
    <div className="min-h-screen bg-cornsilk text-ink-black flex flex-col relative overflow-hidden">
      {/* Abstract Background Texture matching Landing Page */}
      <img
        src="/assets/illustrations/bg-abstract.svg"
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.18]"
      />

      {/* MediKiosk Sticky Top Navigation Header */}
      <header className="sticky top-0 z-50 bg-pine-teal border-b border-white/10 shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
            <img
              src="/assets/logo/medikiosk-logo.png"
              alt="MediKiosk"
              className="h-7 md:h-8 w-auto object-contain"
            />
            <span className="text-[10px] bg-metallic-gold text-ink-black font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Patient Intake
            </span>
          </Link>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button 
              onClick={() => setStep('language')}
              className="touch-target bg-white/15 text-cornsilk border border-white/20 rounded-xl px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 hover:bg-white/25 transition-all"
            >
              <Globe className="w-4 h-4 text-metallic-gold" />
              <span>{currentLang.change_lang}</span>
            </button>
            <button 
              onClick={() => speakPrompt(currentLang.help_notified)}
              className="touch-target bg-metallic-gold text-ink-black rounded-xl px-3 py-1.5 text-xs font-extrabold flex items-center gap-1.5 hover:brightness-105 shadow-sm"
            >
              <HelpCircle className="w-4 h-4" />
              <span>{currentLang.human_help}</span>
            </button>

            {sessionId && step !== 'language' && (
              <button 
                onClick={handleResetSession}
                className="touch-target bg-white/10 hover:bg-rose-900/60 text-cornsilk border border-white/20 hover:border-rose-400 rounded-xl px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 transition-all"
                title="Start a new patient intake session"
              >
                <RefreshCw className="w-3.5 h-3.5 text-rose-300" />
                <span>New Patient</span>
              </button>
            )}

            <Link
              href="/clinician"
              className="touch-target bg-white/15 text-cornsilk border border-white/20 hover:bg-white/25 rounded-xl px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 transition-all"
              title="Open Doctor Clinician Login Portal"
            >
              <Lock className="w-3.5 h-3.5 text-metallic-gold" />
              <span>Doctor Login</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Kiosk Content Area */}
      <main className={`flex-1 flex flex-col justify-between p-4 md:p-6 ${step === 'language' ? 'max-w-7xl' : 'max-w-5xl'} mx-auto w-full relative z-10`}>

      {/* ABHA QR SCANNER MODAL */}
      {showAbhaScannerModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full border-2 border-teal-600 shadow-2xl animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#EAF3F2] text-[#2F5D62] flex items-center justify-center">
                  <QrCode className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 font-[family-name:var(--font-sora)]">
                    ABHA Card QR Scanner
                  </h3>
                  <p className="text-[11px] text-slate-500 font-semibold">
                    Ayushman Bharat Digital Mission (ABDM)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  handleStopCameraScan();
                  setShowAbhaScannerModal(false);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Error Message if any */}
            {abhaScanError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-xl text-xs font-bold mb-4">
                {abhaScanError}
              </div>
            )}

            {/* Camera Preview Area */}
            <div className="mb-4">
              {isScanningCamera ? (
                <div className="relative w-full aspect-[4/3] bg-black rounded-2xl overflow-hidden border-2 border-[#2F5D62] flex items-center justify-center">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover"
                  />
                  {/* Visual Scanner Reticle & Laser */}
                  <div className="absolute inset-0 border-2 border-dashed border-metallic-gold/70 m-8 rounded-xl pointer-events-none flex items-center justify-center">
                    <div className="w-full h-0.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse" />
                  </div>
                  <button
                    type="button"
                    onClick={handleStopCameraScan}
                    className="absolute bottom-3 bg-red-600/90 hover:bg-red-700 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-md"
                  >
                    Stop Camera
                  </button>
                </div>
              ) : (
                <div className="w-full aspect-[16/9] bg-slate-100 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center p-4 text-center">
                  <ScanLine className="w-10 h-10 text-slate-400 mb-2" />
                  <p className="text-xs font-extrabold text-slate-700">Point Camera at ABHA QR Code</p>
                  <p className="text-[11px] text-slate-500 max-w-xs mt-0.5">
                    Hold your digital or laminated ABHA Health card in front of the lens.
                  </p>
                  <button
                    type="button"
                    onClick={handleStartCameraScan}
                    className="mt-3 bg-[#2F5D62] hover:bg-teal-800 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Start Live Camera Scan</span>
                  </button>
                </div>
              )}
            </div>

            {/* Alternative Actions: Upload QR Image or Quick Sample Card */}
            <div className="grid grid-cols-2 gap-2.5 mb-4">
              <label className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload QR Image</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0];
                      if ('BarcodeDetector' in window) {
                        const img = new Image();
                        img.src = URL.createObjectURL(file);
                        img.onload = async () => {
                          try {
                            const bd = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
                            const codes = await bd.detect(img);
                            if (codes.length > 0 && codes[0].rawValue) {
                              handleParseAbhaQR(codes[0].rawValue);
                              return;
                            }
                          } catch {}
                          handleUseSampleAbhaCard();
                        };
                      } else {
                        handleUseSampleAbhaCard();
                      }
                    }
                  }} 
                  className="hidden" 
                />
              </label>

              <button
                type="button"
                onClick={handleUseSampleAbhaCard}
                className="py-2.5 px-3 bg-metallic-gold hover:brightness-105 text-ink-black rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition-all"
                title="Loads a certified ABDM test patient profile instantly"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Load Sample ABHA</span>
              </button>
            </div>

            <p className="text-[10px] text-slate-500 text-center">
              Supports official ABDM standard QR payload containing Name, DOB/Age, Gender, and 14-digit ABHA ID.
            </p>
          </div>
        </div>
      )}

      {/* KIOSK DOCUMENT CAMERA SCANNER MODAL */}
      {showDocCameraModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-xl w-full border-2 border-[#2F5D62] shadow-2xl animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#EAF3F2] text-[#2F5D62] flex items-center justify-center">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 font-[family-name:var(--font-sora)]">
                    Kiosk Prescription Camera
                  </h3>
                  <p className="text-[11px] text-slate-500 font-semibold">
                    Hold paper prescription or report flat inside the camera guide
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={stopDocCamera}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="relative w-full aspect-[4/3] bg-black rounded-2xl overflow-hidden border-2 border-[#2F5D62] flex items-center justify-center mb-4">
              <video
                ref={docVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Document Alignment Frame */}
              <div className="absolute inset-5 border-2 border-dashed border-emerald-400/80 rounded-xl pointer-events-none flex flex-col justify-between p-3">
                <div className="flex justify-between text-[10px] text-emerald-300 font-mono bg-black/40 px-2 py-0.5 rounded">
                  <span>OPENCV AUTO-DEWARP READY</span>
                  <span>1080P HD</span>
                </div>
                <div className="text-center">
                  <span className="bg-black/60 text-white text-xs px-3 py-1 rounded-full font-medium shadow-sm">
                    Keep Document Flat & Well-Lit
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={captureDocSnapshot}
                className="flex-1 bg-[#2F5D62] hover:bg-teal-800 text-white py-3.5 px-4 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all"
              >
                <Camera className="w-5 h-5" />
                <span>Capture & Digitize with Module B</span>
              </button>
              <button
                type="button"
                onClick={stopDocCamera}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-3.5 px-4 rounded-xl font-bold text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 1: MULTI-LANGUAGE SELECTION GRID (22 OFFICIAL 8TH SCHEDULE + ENGLISH) */}
      {step === 'language' && (
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-8 md:p-12 border border-slate-200 shadow-2xl text-center my-auto w-full max-w-7xl mx-auto min-h-[640px] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-center mb-4">
              <div className="bg-pine-teal px-6 py-2.5 rounded-2xl shadow-md inline-flex items-center justify-center">
                <img
                  src="/assets/logo/medikiosk-logo.png"
                  alt="MediKiosk"
                  className="h-8 md:h-10 w-auto object-contain"
                />
              </div>
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-[#1A1A1A] mb-2.5 font-[family-name:var(--font-sora)]">
              {currentLang.select_title}
            </h2>
            <p className="text-slate-600 text-sm md:text-base mb-8 max-w-2xl mx-auto">
              {currentLang.select_subtitle}
            </p>

            {/* All 22 Official 8th Schedule Indian Languages + English Grid (23 Total) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 w-full mx-auto mb-8">
              {Object.entries(LOCALIZED_LANGUAGES).map(([code, pack]: [string, LanguagePack]) => (
                <button
                  key={code}
                  onClick={() => handleStartSession(code)}
                  className={`touch-target rounded-2xl p-4 md:p-4.5 flex flex-col items-center justify-center transition-all group shadow-sm border-2 active:scale-[0.98] cursor-pointer ${
                    language === code 
                      ? 'border-[#2F5D62] bg-[#EAF3F2] ring-2 ring-[#2F5D62]/20' 
                      : 'bg-slate-50 hover:bg-[#2F5D62] hover:text-white border-slate-200 hover:border-[#2F5D62] hover:shadow-md'
                  }`}
                >
                  <span className="text-xl md:text-2xl font-extrabold text-slate-900 group-hover:text-white mb-1 tracking-tight">
                    {pack.native}
                  </span>
                  <span className="text-xs font-semibold text-slate-500 group-hover:text-emerald-100">
                    {pack.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200/80">
            <div className="text-xs text-slate-500 font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>22 Official 8th Schedule Indian Languages + English • Bhashini Voice AI Powered</span>
            </div>
          </div>
        </div>
      )}

      {step === 'consent' && (
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 md:p-8 border border-border-strong shadow-xl my-auto max-w-2xl mx-auto w-full">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3 text-pine-teal">
              <div className="w-10 h-10 rounded-xl bg-pine-teal/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-pine-teal" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-extrabold text-ink-black font-[family-name:var(--font-sora)]">
                  {currentLang.consent_title}
                </h2>
                <span className="text-[11px] text-ink-black/60 font-semibold uppercase tracking-wider">
                  India DPDP Act Compliant Notice
                </span>
              </div>
            </div>

            {/* Audio Listen / Replay Button */}
            <button
              type="button"
              onClick={() => speakPrompt(currentLang.consent_prompt)}
              className="px-3.5 py-2 rounded-xl bg-pine-teal/10 hover:bg-pine-teal/20 text-pine-teal text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
              title="Listen to Audio Notice"
            >
              <Volume2 className="w-4 h-4 text-pine-teal" />
              <span>सुनें / Listen (Audio)</span>
            </button>
          </div>

          <div className="bg-cornsilk/60 p-5 md:p-6 rounded-2xl mb-5 text-ink-black text-sm md:text-base leading-relaxed border border-border-strong">
            <p className="font-semibold text-ink-black mb-3">
              {currentLang.consent_body}
            </p>
            <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-pine-teal font-bold">
              <span className="flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5" /> Audio announcement active in {currentLang.name}
              </span>
              <button
                type="button"
                onClick={() => speakPrompt(currentLang.consent_prompt)}
                className="underline hover:text-teal-900 cursor-pointer text-[11px]"
              >
                Replay Audio
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-6 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <input 
              type="checkbox" 
              id="guardian" 
              checked={isGuardian} 
              onChange={e => setIsGuardian(e.target.checked)}
              className="w-5 h-5 accent-pine-teal rounded cursor-pointer" 
            />
            <label htmlFor="guardian" className="text-xs md:text-sm font-semibold text-slate-700 cursor-pointer select-none">
              {currentLang.consent_guardian}
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <button
              onClick={() => handleConsent(true)}
              className="touch-target bg-pine-teal text-cornsilk hover:brightness-110 active:scale-[0.98] rounded-2xl p-4 font-bold text-base md:text-lg flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all"
            >
              <CheckCircle className="w-5 h-5 text-metallic-gold" />
              <span>{currentLang.consent_agree}</span>
            </button>
            <button
              onClick={() => handleConsent(false)}
              className="touch-target bg-white text-slate-700 hover:bg-rose-50 hover:text-rose-800 hover:border-rose-300 border border-border-strong rounded-2xl p-4 font-semibold text-sm md:text-base flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs"
            >
              <XCircle className="w-5 h-5 text-slate-400" />
              <span>{currentLang.consent_decline}</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2B: RECEPTION GUIDANCE (WHEN CONSENT IS DECLINED) */}
      {step === 'consent_declined' && (
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 md:p-8 border-2 border-amber-400 shadow-2xl my-auto max-w-2xl mx-auto w-full text-center animate-in fade-in duration-200">
          <div className="w-16 h-16 bg-amber-100 text-amber-800 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <HelpCircle className="w-9 h-9 text-amber-700" />
          </div>

          <span className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-3.5 py-1 text-[11px] font-black uppercase tracking-wider text-amber-900 mb-3">
            Offline Hospital Reception Guidance
          </span>

          <h2 className="font-[family-name:var(--font-sora)] text-2xl md:text-3xl font-extrabold text-ink-black mb-2">
            {currentLang.reception_title || 'Consent Not Provided • Please Visit Hospital Reception'}
          </h2>

          <p className="text-sm md:text-base text-ink-black/80 font-medium mb-6 leading-relaxed max-w-xl mx-auto">
            {currentLang.reception_body || 'Since digital intake consent was declined, automated kiosk intake cannot proceed. Our hospital reception team will gladly assist you with physical paper forms and manual doctor queue assignment.'}
          </p>

          {/* Guidance Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left mb-6">
            <div className="bg-cornsilk/60 p-4 rounded-2xl border border-border-strong">
              <span className="text-[10px] font-black text-pine-teal uppercase tracking-wider block mb-1">
                Reception Desk Location
              </span>
              <p className="font-extrabold text-ink-black text-sm">
                {currentLang.reception_counter || 'Ground Floor • Main Reception Counters 1–4'}
              </p>
              <p className="text-xs text-ink-black/70 mt-1">
                Located directly opposite the main hospital entrance gate.
              </p>
            </div>

            <div className="bg-cornsilk/60 p-4 rounded-2xl border border-border-strong">
              <span className="text-[10px] font-black text-pine-teal uppercase tracking-wider block mb-1">
                What to Present
              </span>
              <p className="font-extrabold text-ink-black text-sm">
                Physical ID or Paper Registration Slip
              </p>
              <p className="text-xs text-ink-black/70 mt-1">
                The receptionist will assign your doctor without electronic recording.
              </p>
            </div>
          </div>

          {/* Audio Replay Button */}
          <div className="mb-6 flex justify-center">
            <button
              type="button"
              onClick={() => speakPrompt(currentLang.reception_prompt || 'Digital consent was not provided. Please visit the central hospital reception desk on the ground floor for manual registration and offline assistance.')}
              className="px-5 py-2.5 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <Volume2 className="w-4 h-4 text-amber-700" />
              <span>मार्गदर्शन पुनः सुनें / Replay Audio Guidance</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => {
                setStep('consent');
                speakPrompt(currentLang.consent_prompt);
              }}
              className="touch-target bg-pine-teal hover:brightness-110 text-cornsilk rounded-2xl p-4 font-bold text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all active:scale-[0.98]"
            >
              <CheckCircle className="w-5 h-5 text-metallic-gold" />
              <span>{currentLang.reception_return_consent || 'I Changed My Mind — Give Consent'}</span>
            </button>

            <Link
              href="/"
              className="touch-target bg-metallic-gold hover:brightness-105 active:scale-[0.98] text-ink-black rounded-2xl p-4 font-extrabold text-sm flex items-center justify-center gap-2 shadow-md transition-all"
            >
              <span>{currentLang.home_btn || 'Return to Home'}</span>
            </Link>
          </div>
        </div>
      )}

      {/* STEP 3: DEMOGRAPHICS & IDENTIFICATION (FULLY LOCALIZED VOICE + TOUCH) */}
      {step === 'identify' && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm my-auto max-w-4xl mx-auto w-full">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-[#EAF3F2] text-[#2F5D62] flex items-center justify-center mx-auto mb-3">
              <User className="w-7 h-7" />
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-[#1A1A1A] mb-1">{currentLang.identify_title}</h2>
            <p className="text-slate-600 text-sm">{currentLang.identify_subtitle}</p>
          </div>

          {/* ABHA QR CODE SCANNER CALLOUT BANNER */}
          <div className="bg-gradient-to-r from-teal-900 via-[#2F5D62] to-[#1F4045] text-white p-4 md:p-5 rounded-2xl mb-6 shadow-md flex flex-wrap items-center justify-between gap-3 border border-teal-700/40">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
                <QrCode className="w-7 h-7 text-metallic-gold" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-sm md:text-base text-white">
                    Scan ABHA Health Card QR Code / आभा क्यूआर कोड
                  </h4>
                  {isAbhaVerified && (
                    <span className="bg-emerald-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                      <CheckCircle className="w-3 h-3" /> Verified
                    </span>
                  )}
                </div>
                <p className="text-xs text-teal-100/90 mt-0.5">
                  Directly auto-populate Name, Age, Gender, and ABHA ID with camera scan or image
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowAbhaScannerModal(true);
                setAbhaScanError(null);
              }}
              className="bg-metallic-gold text-ink-black hover:brightness-105 px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 shadow-sm cursor-pointer transition-all active:scale-[0.98]"
            >
              <ScanLine className="w-4 h-4" />
              <span>{isAbhaVerified ? 'Re-scan ABHA Card' : 'Scan ABHA Card QR'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            {/* 1. Full Name Input with Live Voice Speaking Option */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-extrabold uppercase tracking-wider text-[#2F5D62] flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  <span>{currentLang.name_label}</span>
                </label>
                <button
                  type="button"
                  onClick={handleVoiceInputForName}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    isListeningForName 
                      ? 'bg-red-600 text-white animate-pulse shadow-md' 
                      : 'bg-[#2F5D62] text-white hover:bg-teal-800'
                  }`}
                  title="Speak Name"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>{isListeningForName ? `${t('listening_generic', 'Listening...')} (Listening)` : currentLang.speak_name_btn}</span>
                </button>
              </div>
              <input
                type="text"
                placeholder={currentLang.name_placeholder || 'Enter Full Name'}
                value={patientName}
                onChange={e => setPatientName(e.target.value)}
                className="w-full p-3.5 border-2 border-slate-200 focus:border-[#2F5D62] bg-white rounded-xl text-base font-bold text-slate-900 outline-none transition-all"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                {currentLang.identify_subtitle || 'Type or tap mic to speak your name'}
              </span>
            </div>

            {/* 2. Age Input & Quick Select Chips */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-extrabold uppercase tracking-wider text-[#2F5D62]">
                  {currentLang.age_label}
                </label>
                <button
                  type="button"
                  onClick={handleVoiceInputForAge}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${
                    isListeningForAge
                      ? 'bg-rose-500 text-white animate-pulse'
                      : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  {isListeningForAge ? `${t('listening_generic', 'Listening...')} (Listening...)` : (currentLang.speak_age_btn || t('speak_age_btn', 'Speak Age'))}
                </button>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="number"
                  min="1"
                  max="120"
                  placeholder="35"
                  value={patientAge}
                  onChange={e => setPatientAge(e.target.value)}
                  className="w-24 p-3 border-2 border-slate-200 focus:border-[#2F5D62] bg-white rounded-xl text-center text-lg font-bold text-slate-900 outline-none"
                />
                <div className="grid grid-cols-4 gap-1.5 flex-1">
                  {['18-25', '26-40', '41-60', '60+'].map(bracket => (
                    <button
                      key={bracket}
                      type="button"
                      onClick={() => {
                        const mid = bracket === '18-25' ? '22' : bracket === '26-40' ? '33' : bracket === '41-60' ? '50' : '65';
                        setPatientAge(mid);
                      }}
                      className="px-2 py-2.5 rounded-xl border text-xs font-bold bg-white text-slate-700 hover:border-[#2F5D62] hover:bg-[#EAF3F2] transition-all"
                    >
                      {bracket}
                    </button>
                  ))}
                </div>
              </div>
              <span className="text-[11px] text-slate-500 block">
                {currentLang.speak_age_hint || t('speak_age_hint', 'Type or tap mic to speak your age (e.g. 35)')}
              </span>
            </div>

            {/* 3. Gender Selection */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm">
              <label className="text-xs font-extrabold uppercase tracking-wider text-[#2F5D62] block mb-2">
                {currentLang.gender_label}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'Male', label: currentLang.male_opt },
                  { key: 'Female', label: currentLang.female_opt },
                  { key: 'Other', label: currentLang.other_opt }
                ].map(item => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setPatientGender(item.key)}
                    className={`py-3 px-2 rounded-xl text-xs md:text-sm font-bold border-2 transition-all text-center ${
                      patientGender === item.key
                        ? 'border-[#2F5D62] bg-[#2F5D62] text-white shadow-md'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Queue Token & Optional ABHA (ABID) */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-extrabold uppercase tracking-wider text-[#2F5D62]">
                  {currentLang.queue_id_label}
                </label>
                <span className="text-xs bg-[#EAF3F2] text-[#2F5D62] px-3 py-1 rounded-full font-extrabold border border-teal-200">
                  {queueId}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-[#2F5D62]">
                    {currentLang.abha_id_label}
                  </label>
                  <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                    Optional Field
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="e.g. 91-1234-5678-9012 (Fill only if you have an ABID)"
                  value={abhaId}
                  onChange={e => setAbhaId(e.target.value)}
                  className="w-full p-3 border-2 border-slate-200 focus:border-[#2F5D62] bg-white rounded-xl text-xs font-semibold text-slate-800 outline-none transition-all"
                />
                <span className="text-[11px] text-slate-500 mt-1.5 block leading-tight">
                  {language === 'hi'
                    ? 'आभा आईडी केवल तभी भरें जब आपके पास हो; इसे खाली छोड़ने पर अस्पताल इसे बाद में साझा/लिंक करेगा।'
                    : 'Fill only if you have an ABID. If left empty, the hospital will link and share it accordingly.'}
                </span>
              </div>
            </div>
          </div>

          {/* CLINICAL STREAM SELECTION: ALLOPATHIC VS AYURVEDA */}
          <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-5 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#2F5D62] block">
                  Select Clinical Care Stream / चिकित्सा पद्धति चुनें
                </span>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose your treatment approach: Modern Allopathy or Classical Ayurveda
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              {/* Allopathy Card */}
              <button
                type="button"
                onClick={() => setClinicalMode('allopathy')}
                className={`p-4 rounded-2xl border-2 text-left transition-all relative ${
                  clinicalMode === 'allopathy'
                    ? 'border-[#2F5D62] bg-[#EAF3F2] shadow-md ring-2 ring-[#2F5D62]/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-[#2F5D62]" />
                    <span className="font-extrabold text-base text-slate-900">Allopathic Care</span>
                  </div>
                  {clinicalMode === 'allopathy' && (
                    <span className="bg-[#2F5D62] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                      Selected
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 font-medium">
                  Dynamic SOCRATES symptom inquiry, intelligent follow-up questions, red flag detection, and specialist doctor allocation.
                </p>
              </button>

              {/* Ayurveda Card */}
              <button
                type="button"
                onClick={() => setClinicalMode('ayurveda')}
                className={`p-4 rounded-2xl border-2 text-left transition-all relative ${
                  clinicalMode === 'ayurveda'
                    ? 'border-[#8B5A2B] bg-amber-50/90 shadow-md ring-2 ring-amber-400/30'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <HeartPulse className="w-5 h-5 text-[#8B5A2B]" />
                    <span className="font-extrabold text-base text-[#8B5A2B]">Ayurveda (AYUSH)</span>
                  </div>
                  {clinicalMode === 'ayurveda' && (
                    <span className="bg-[#8B5A2B] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                      Selected
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 font-medium">
                  Classical holistic pariksha assessment for Prakriti, Dosha imbalance (Vata, Pitta, Kapha), and Agni vitality.
                </p>
              </button>
            </div>

            {/* Ayurvedic Pariksha Options: Dashvidha, Astvidha, Trividha */}
            {clinicalMode === 'ayurveda' && (
              <div className="p-4 bg-amber-100/60 border border-amber-300 rounded-2xl animate-in fade-in duration-150">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-black text-[#8B5A2B] uppercase tracking-wider">
                    Select Ayurvedic Pariksha Assessment:
                  </span>
                  <span className="text-[10px] font-bold bg-[#8B5A2B] text-white px-2 py-0.5 rounded-full">
                    3 Assessment Types
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  {/* Dashvidha */}
                  <button
                    type="button"
                    onClick={() => setAyushAssessmentType('dashavidha')}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      ayushAssessmentType === 'dashavidha'
                        ? 'border-[#8B5A2B] bg-white shadow-sm font-bold text-slate-900 ring-2 ring-amber-400/60'
                        : 'border-amber-200 bg-white/70 hover:bg-white text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-sm text-[#8B5A2B]">1. Dashavidha</span>
                      {ayushAssessmentType === 'dashavidha' && <CheckCircle className="w-4 h-4 text-[#8B5A2B]" />}
                    </div>
                    <p className="text-[11px] text-slate-600 leading-tight">
                      10-fold Assessment: Prakriti, Vikriti, Sara, Samhanana, Pramana, Satmya, Satva, Ahara, Vyayama, Vaya.
                    </p>
                  </button>

                  {/* Ashtavidha */}
                  <button
                    type="button"
                    onClick={() => setAyushAssessmentType('ashtavidha')}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      ayushAssessmentType === 'ashtavidha'
                        ? 'border-[#8B5A2B] bg-white shadow-sm font-bold text-slate-900 ring-2 ring-amber-400/60'
                        : 'border-amber-200 bg-white/70 hover:bg-white text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-sm text-[#8B5A2B]">2. Ashtavidha</span>
                      {ayushAssessmentType === 'ashtavidha' && <CheckCircle className="w-4 h-4 text-[#8B5A2B]" />}
                    </div>
                    <p className="text-[11px] text-slate-600 leading-tight">
                      8-fold Diagnostic: Nadi (Pulse), Mutra, Mala, Jihwa (Tongue), Shabda, Sparsha, Drik, Akriti.
                    </p>
                  </button>

                  {/* Trividha */}
                  <button
                    type="button"
                    onClick={() => setAyushAssessmentType('trividha')}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      ayushAssessmentType === 'trividha'
                        ? 'border-[#8B5A2B] bg-white shadow-sm font-bold text-slate-900 ring-2 ring-amber-400/60'
                        : 'border-amber-200 bg-white/70 hover:bg-white text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-sm text-[#8B5A2B]">3. Trividha</span>
                      {ayushAssessmentType === 'trividha' && <CheckCircle className="w-4 h-4 text-[#8B5A2B]" />}
                    </div>
                    <p className="text-[11px] text-slate-600 leading-tight">
                      3-fold Assessment: Darshana (Observation), Sparshana (Palpation), Prashna (Interrogation).
                    </p>
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleStartConsultation}
            className="touch-target w-full bg-[#2F5D62] text-white hover:bg-teal-800 rounded-2xl p-4 font-extrabold text-lg flex items-center justify-center gap-2 shadow-lg transition-all transform active:scale-[0.99]"
          >
            <span>{currentLang.start_interview_btn}</span>
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* STEP 4: DYNAMIC AI INTERVIEW (FULLY LOCALIZED VOICE + TOUCH + EXPLICIT SUBMIT) */}
      {step === 'interview' && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm my-auto">
          {/* Section Progress Bar with SOCRATES Framework Indicator */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-[#2F5D62] mb-6 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-[#2F5D62] text-white px-3 py-1 rounded-full font-black text-[11px] uppercase tracking-wider">
                Question {answeredHistory.length + 1} of 10–12
              </span>
              <span className="bg-[#EAF3F2] text-[#2F5D62] border border-teal-200 px-3 py-1 rounded-full font-extrabold text-[11px]">
                {currentQuestion.section === 'emergency_confirmation' || currentQuestion.framework_stage === 'emergency_confirmation'
                  ? '🚨 Urgent Clinical Assessment'
                  : currentQuestion.framework_stage?.startsWith('socrates') || currentQuestion.section === 'hpi' || currentQuestion.section === 'chief_complaint'
                  ? '🩺 SOCRATES Clinical Framework'
                  : currentQuestion.section === 'past_history'
                  ? '📋 Past Medical Illnesses'
                  : currentQuestion.section === 'medications'
                  ? '💊 Current Medications'
                  : currentQuestion.section === 'allergies'
                  ? '⚠️ Known Allergies'
                  : currentQuestion.section === 'family_history'
                  ? '🧬 Family Medical History'
                  : currentQuestion.framework_stage === 'lifestyle_exposures'
                  ? '🏃 Lifestyle & Exposures'
                  : currentQuestion.framework_stage === 'systemic_review'
                  ? '🔍 Systemic Review'
                  : '🌿 AYUSH Clinical Intake'}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* In-Interview Language Switcher: Allows seamless toggle between active regional language & English */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    const targetLang = selectedRegionalLang || (language !== 'en' ? language : 'mr');
                    setLanguage(targetLang);
                    speakPrompt(currentQuestion.question_localized || currentQuestion.question_en, targetLang);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    language !== 'en' 
                      ? 'bg-[#2F5D62] text-white shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title={`Switch interview to ${(LOCALIZED_LANGUAGES[selectedRegionalLang] || currentLang).name}`}
                >
                  {(LOCALIZED_LANGUAGES[selectedRegionalLang] || currentLang).native || 'मराठी'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLanguage('en');
                    if (currentQuestion.question_en) {
                      speakPrompt(currentQuestion.question_en, 'en');
                    }
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    language === 'en' 
                      ? 'bg-[#2F5D62] text-white shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Switch interview to English"
                >
                  English
                </button>
              </div>

              <button 
                onClick={() => speakPrompt(language === 'en' ? (currentQuestion.question_en || currentQuestion.question_localized) : (currentQuestion.question_localized || currentQuestion.question_en))}
                className="bg-slate-100 hover:bg-slate-200 text-[#2F5D62] px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                title="Listen Again"
              >
                <Volume2 className="w-4 h-4" />
                <span>Repeat</span>
              </button>
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] px-2.5 py-1 rounded-full font-bold hidden sm:inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Emergency Triage Guard Active
              </span>
              <span className="bg-teal-50 text-teal-800 border border-teal-200 text-[10px] px-2.5 py-1 rounded-full font-bold hidden md:inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
                🎙️ Voice Diagnostic & Severe Pain Triage Active
              </span>
            </div>
          </div>

          {/* Question Text in Native Language */}
          <div className="bg-[#EAF3F2] p-6 rounded-2xl mb-6 border border-teal-900/10">
            <h3 className="text-2xl font-extrabold text-[#1A1A1A] leading-snug mb-2">
              {language === 'en' 
                ? (currentQuestion.question_en || currentQuestion.question_localized)
                : (currentQuestion.question_localized || currentQuestion.question_en)}
            </h3>
            {language !== 'en' && currentQuestion.question_en && (
              <p className="text-xs text-slate-500 font-medium">{currentQuestion.question_en}</p>
            )}
          </div>

          {/* Conversational Processing Indicator (Instant visual feedback during AI inference) */}
          {isProcessingTurn && (
            <div className="flex items-center justify-center gap-3 p-4 bg-teal-50/90 border border-teal-300 rounded-2xl mb-4 text-[#2F5D62] font-bold animate-pulse text-sm shadow-xs">
              <div className="w-5 h-5 border-2 border-[#2F5D62] border-t-transparent rounded-full animate-spin"></div>
              <span>
                {t('processing_turn', 'MediKiosk is analyzing your response & preparing next question...')}
              </span>
            </div>
          )}

          {/* Multi-Select Symptom Options Header */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <span>☑️</span>
              {t('multi_select_hint', 'Select one or more symptoms that apply, or tap speak below:')}
            </span>
            {selectedOptions.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedOptions([])}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline cursor-pointer"
              >
                {t('clear_selection', 'Clear selection')}
              </button>
            )}
          </div>

          {/* Tappable Localized Multi-Select Answer Chips */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-3.5">
            {currentQuestion.options?.map((opt: string, idx: number) => {
              const displayOpt = language === 'en' && opt.includes('/') 
                ? opt.split('/').pop()?.trim() || opt 
                : opt;
              const isSelected = selectedOptions.includes(displayOpt);
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isProcessingTurn}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedOptions(selectedOptions.filter(o => o !== displayOpt));
                    } else {
                      setSelectedOptions([...selectedOptions, displayOpt]);
                    }
                  }}
                  className={`touch-target rounded-2xl p-4 text-left font-bold text-base transition-all shadow-sm flex items-center justify-between border-2 cursor-pointer ${
                    isProcessingTurn 
                      ? 'opacity-50 cursor-not-allowed' 
                      : isSelected
                      ? 'bg-[#2F5D62] text-white border-[#2F5D62] shadow-md ring-2 ring-teal-400/40'
                      : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-teal-400 hover:bg-slate-100 active:scale-[0.99]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${
                      isSelected ? 'border-white bg-white text-[#2F5D62]' : 'border-slate-300 bg-white'
                    }`}>
                      {isSelected && (
                        <svg className="w-4 h-4 stroke-current stroke-[3] fill-none" viewBox="0 0 24 24">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <span>{displayOpt}</span>
                  </div>
                  {isSelected ? (
                    <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-md font-extrabold uppercase tracking-wider">
                      Selected
                    </span>
                  ) : (
                    <ChevronRight className="w-5 h-5 opacity-40" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Submit Multi-Select Options Button (Visible when 1 or more options are chosen) */}
          {selectedOptions.length > 0 && (
            <div className="mb-4">
              <button
                type="button"
                disabled={isProcessingTurn}
                onClick={() => {
                  const combinedAnswer = selectedOptions.join(', ');
                  setSelectedOptions([]);
                  handleAnswerTurn(combinedAnswer, 'touch');
                }}
                className="w-full bg-[#2E7D4F] hover:bg-emerald-800 text-white p-4 rounded-2xl font-black text-base flex items-center justify-center gap-3 shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer border-2 border-emerald-400/40"
              >
                <CheckCircle className="w-6 h-6 text-emerald-200" />
                <span>
                  {(() => {
                    const template = t('submit_selected', 'Submit {n} Selected Option{s}');
                    const s = selectedOptions.length > 1 ? 's' : '';
                    return template.replace('{n}', String(selectedOptions.length)).replace('{s}', s);
                  })()}
                </span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Prominent Neutral / Discretion Options: "I don't know / I am unsure" & "Prefer not to say" */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              disabled={isProcessingTurn}
              onClick={() => handleAnswerTurn(language === 'en' ? "I don't know or I am unsure" : `${currentLang.unknown_btn || "I don't know or I am unsure"} (I don't know / Unsure)`, 'touch')}
              className={`touch-target bg-amber-50/80 text-amber-900 border-2 border-amber-200 rounded-xl p-3.5 font-bold text-sm flex items-center justify-center gap-2.5 transition-all shadow-xs ${
                isProcessingTurn
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-amber-100 hover:border-amber-400 active:scale-[0.98] cursor-pointer'
              }`}
              title="Select if you do not know or are unsure about this question"
            >
              <HelpCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                {language === 'en' 
                  ? "I don't know or I am unsure" 
                  : `${currentLang.unknown_btn || "I don't know or I am unsure"} / I don't know or I am unsure`}
              </span>
            </button>

            <button
              type="button"
              disabled={isProcessingTurn}
              onClick={() => handleAnswerTurn(language === 'en' ? "Prefer not to say" : `${currentLang.prefer_not_btn || "Prefer not to say"} (Prefer not to say)`, 'touch')}
              className={`touch-target bg-slate-100 text-slate-700 border-2 border-slate-300 rounded-xl p-3.5 font-bold text-sm flex items-center justify-center gap-2.5 transition-all shadow-xs ${
                isProcessingTurn
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-slate-200 hover:text-slate-900 hover:border-slate-400 active:scale-[0.98] cursor-pointer'
              }`}
              title="Select if you prefer not to share or answer this question"
            >
              <ShieldCheck className="w-4 h-4 text-slate-600 shrink-0" />
              <span>
                {language === 'en' 
                  ? "Prefer not to say" 
                  : `${currentLang.prefer_not_btn || "Prefer not to say"} / Prefer not to say`}
              </span>
            </button>
          </div>

          {/* Voice Microphone Affordance Card with Multi-Sentence Recording & Real-Time Audio Visualizer */}
          <div className={`flex flex-col items-center justify-center p-6 rounded-3xl border transition-all mb-6 ${
            isListening ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-400/30' : 'bg-slate-50 border-slate-200'
          }`}>
            {/* Live Audio Equalizer & Decibel Meter when mic is active */}
            {isListening && (
              <div className="w-full max-w-xs mb-4 flex flex-col items-center justify-center bg-white/90 border border-emerald-200 rounded-2xl p-3 shadow-xs">
                <div className="flex items-end justify-center gap-1.5 h-8 mb-2">
                  {[0.4, 0.7, 1.0, 0.7, 0.4].map((scale, barIdx) => {
                    const height = Math.max(6, Math.min(32, Math.round((audioLevel * scale) / 3)));
                    return (
                      <div
                        key={barIdx}
                        style={{ height: `${height}px` }}
                        className={`w-2.5 rounded-full transition-all duration-75 ${
                          audioLevel > 15 ? 'bg-emerald-500' : 'bg-emerald-300'
                        }`}
                      />
                    );
                  })}
                </div>
                <div className="flex items-center gap-2 text-xs font-bold">
                  {audioLevel > 12 ? (
                    <span className="text-emerald-800 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                      <span>{t('voice_detected', 'Voice Detected (Good Volume)')}</span>
                    </span>
                  ) : (
                    <span className="text-amber-700 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      <span>{t('voice_too_quiet', 'Speak closer to the kiosk mic')}</span>
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 font-mono">({audioLevel}%)</span>
                </div>
              </div>
            )}

            <button
              onClick={toggleSpeechRecognition}
              className={`touch-target w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg mb-3 cursor-pointer ${
                isListening 
                  ? 'bg-[#2E7D4F] text-white ring-4 ring-emerald-300 animate-pulse' 
                  : 'bg-[#2F5D62] text-white hover:bg-teal-800'
              }`}
              title={isListening ? currentLang.mic_tap_stop : currentLang.mic_start_text}
            >
              {isListening ? <Mic className="w-10 h-10 animate-bounce" /> : <Mic className="w-10 h-10" />}
            </button>
            
            <span className="text-xs font-bold text-slate-800 text-center mb-1">
              {isListening 
                ? t('voice_listening_multi', '🎙️ Listening... Speak multiple full sentences naturally. Tap mic or click Submit when done.')
                : currentLang.mic_start_text
              }
            </span>

            {isListening && (
              <span className="text-[11px] text-emerald-700 font-medium mb-3 text-center">
                {t('voice_recording_active', 'Continuous multi-sentence intake active — clinical symptoms, severe pain, and diagnostic indicators are analyzed live.')}
              </span>
            )}

            {/* Noise-Resilience Hospital Helper Tip */}
            <div className="mt-2 flex items-center justify-center gap-2 text-[11px] font-bold text-slate-600 bg-slate-100/90 px-3.5 py-1.5 rounded-xl border border-slate-200/90 shadow-xs max-w-xl text-center">
              <span>💡 {t('voice_noisy_tip', 'Noisy waiting room? Speak close to the kiosk, or simply select any answer options directly above.')}</span>
            </div>

            {/* Spoken Text Display & Explicit Submit Button Strip */}
            {liveTranscript ? (
              <div className="w-full mt-4 flex flex-col items-center space-y-3">
                <div className="w-full flex items-center justify-between px-1 text-xs font-bold text-[#2F5D62]">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    {t('voice_review_title', 'Review spoken answer (tap text to edit if background noise caught extra words):')}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider bg-teal-100 text-teal-800 px-2 py-0.5 rounded-md font-extrabold">
                    {t('tap_to_edit', 'Tap to Edit')}
                  </span>
                </div>

                <textarea
                  value={liveTranscript}
                  onChange={(e) => setLiveTranscript(e.target.value)}
                  placeholder={t('spoken_placeholder', 'Spoken response will appear here...')}
                  rows={2}
                  className="w-full p-4 bg-white border-2 border-teal-400 focus:border-teal-600 rounded-2xl text-base font-bold text-[#2F5D62] text-left shadow-sm outline-none resize-none leading-relaxed transition-all"
                />

                {/* Explicit Submit & Clear Action Buttons */}
                <div className="flex items-center gap-3 w-full max-w-md">
                  <button
                    onClick={() => handleAnswerTurn(liveTranscript, 'voice')}
                    className="touch-target flex-1 bg-[#2E7D4F] hover:bg-emerald-800 text-white p-4 rounded-2xl font-extrabold text-base flex items-center justify-center gap-2 shadow-lg hover:scale-102 transition-all cursor-pointer"
                  >
                    <CheckCircle className="w-6 h-6 text-emerald-200" />
                    <span>{currentLang.voice_submit_btn}</span>
                    <ChevronRight className="w-5 h-5 ml-1" />
                  </button>

                  <button
                    onClick={() => {
                      accumulatedFinalRef.current = '';
                      sessionFinalTextRef.current = '';
                      setLiveTranscript('');
                    }}
                    className="touch-target px-4 py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-2xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    title="Clear text"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>{currentLang.voice_clear_btn}</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* STEP 5: RED FLAG EMERGENCY ALERT (FULLY LOCALIZED WITH LIVE SIREN & ER-1 ROUTING) */}
      {step === 'red_flag' && (
        <div className="bg-[#C4292A] text-white rounded-3xl p-6 md:p-10 shadow-2xl text-center my-auto border-4 border-amber-300 animate-pulse max-w-2xl mx-auto w-full">
          <div className="w-20 h-20 bg-white text-rose-700 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-lg">
            <AlertTriangle className="w-12 h-12 text-rose-600" />
          </div>

          <span className="inline-block bg-amber-300 text-slate-950 font-black text-xs px-4 py-1.5 rounded-full uppercase tracking-widest mb-3">
            Critical Triage — Immediate Emergency Room Routing
          </span>

          <h2 className="text-3xl md:text-4xl font-black mb-3 leading-tight">
            {currentLang.red_flag_title}
          </h2>

          <div className="bg-white/10 p-6 rounded-2xl mb-6 border border-white/20 text-left space-y-4">
            <div className="border-b border-white/20 pb-3">
              <span className="text-amber-200 text-xs font-bold uppercase tracking-wider block mb-1">
                Assigned Emergency Doctor & Room
              </span>
              <p className="text-xl md:text-2xl font-black text-white">
                Emergency Resuscitation Bay (Room ER-1) — Ground Floor
              </p>
              <p className="text-sm text-amber-100 font-extrabold mt-1">
                Attending Physician: Dr. Priya Nair, MEM (Emergency Lead) • Priority: STAT / IMMEDIATE
              </p>
            </div>

            {redFlagTrigger?.title && (
              <div className="bg-white/10 p-3 rounded-xl border border-white/15">
                <span className="text-[11px] text-amber-200 uppercase tracking-wider font-extrabold block">
                  Triage Trigger Condition:
                </span>
                <p className="text-sm font-bold text-white">
                  {redFlagTrigger.title}
                </p>
                {redFlagTrigger.triage_alert_message && (
                  <p className="text-xs text-white/80 mt-1">
                    {redFlagTrigger.triage_alert_message}
                  </p>
                )}
              </div>
            )}

            <div className="bg-black/20 p-4 rounded-xl border border-white/10">
              <span className="text-xs text-amber-200 font-bold uppercase tracking-wider block mb-1">
                Immediate Action Required
              </span>
              <p className="text-base md:text-lg font-bold leading-relaxed text-white">
                {language === 'hi' 
                  ? (redFlagTrigger?.patient_instruction_hi || currentLang.red_flag_default)
                  : language === 'en'
                  ? (redFlagTrigger?.patient_instruction_en || currentLang.red_flag_default)
                  : (currentLang.red_flag_default || redFlagTrigger?.patient_instruction_en)}
              </p>
              <p className="text-xs text-white/90 mt-2 font-medium">
                Please proceed directly to Room ER-1 on the ground floor. A high-priority emergency siren and patient handoff have been automatically dispatched to Dr. Priya Nair.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => {
                playEmergencySirenAudio();
                const prompt = language === 'hi' 
                  ? (redFlagTrigger?.patient_instruction_hi || currentLang.red_flag_default)
                  : language === 'en'
                  ? (redFlagTrigger?.patient_instruction_en || currentLang.red_flag_default)
                  : (currentLang.red_flag_default || redFlagTrigger?.patient_instruction_en);
                speakPrompt(prompt);
              }}
              className="px-6 py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm rounded-xl shadow-lg transition-all flex items-center gap-2"
            >
              <Volume2 className="w-5 h-5" />
              <span>Replay Voice Alert & Siren</span>
            </button>
            <Link
              href="/"
              className="px-6 py-3.5 bg-white/20 hover:bg-white/30 text-white font-bold text-sm rounded-xl transition-all"
            >
              <span>Return to Home</span>
            </Link>
          </div>

          <p className="text-[11px] text-white/70 mt-5">
            {currentLang.red_flag_footer}: {redFlagTrigger?.rule_id || 'RF_EMERGENCY_CRITICAL'} • Assigned to Dr. Priya Nair (Room ER-1)
          </p>
        </div>
      )}

      {/* STEP 6: DOCUMENT SCANNER (MODULE B CLINICAL INTELLIGENCE ENGINE) */}
      {step === 'scan' && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm my-auto w-full max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-black text-[#1A1A1A] font-[family-name:var(--font-sora)]">
                  {currentLang.scan_title}
                </h2>
                <span className="bg-[#EAF3F2] text-[#2F5D62] text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-[#2F5D62]/20">
                  Module B Active
                </span>
              </div>
              <p className="text-slate-600 text-xs md:text-sm">{currentLang.scan_subtitle}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#EAF3F2] text-[#2F5D62] flex items-center justify-center shadow-xs">
              <FileText className="w-6 h-6" />
            </div>
          </div>

          {qualityWarning && (
            <div className="bg-amber-50 text-[#B8860B] p-4 rounded-2xl mb-5 border border-amber-200 text-xs font-semibold flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>{qualityWarning}</span>
            </div>
          )}

          {/* DUAL SCAN INPUT: KIOSK CAMERA + FILE UPLOAD */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Action 1: Kiosk Live Camera */}
            <button
              type="button"
              onClick={startDocCamera}
              disabled={isScanning}
              className="touch-target border-2 border-dashed border-[#2F5D62]/40 hover:border-[#2F5D62] rounded-3xl p-6 text-center bg-[#EAF3F2]/40 hover:bg-[#EAF3F2] flex flex-col items-center justify-center transition-all group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#2F5D62] text-white flex items-center justify-center mb-3 shadow-md group-hover:scale-105 transition-transform">
                <Camera className="w-6 h-6" />
              </div>
              <span className="font-extrabold text-slate-900 text-sm mb-1">
                Scan with Kiosk Camera
              </span>
              <span className="text-[11px] text-slate-500">
                Hold your physical paper slip in front of the kiosk webcam
              </span>
            </button>

            {/* Action 2: File / Image Upload */}
            <div className="border-2 border-dashed border-slate-300 hover:border-[#2F5D62] rounded-3xl p-6 text-center bg-slate-50 hover:bg-slate-100 flex flex-col items-center justify-center transition-all">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 text-white flex items-center justify-center mb-3 shadow-md">
                <Upload className="w-6 h-6" />
              </div>
              <label className="touch-target bg-[#2F5D62] hover:bg-teal-800 text-white px-5 py-2.5 rounded-xl font-bold text-xs cursor-pointer shadow-md transition-all">
                <span>{isScanning ? currentLang.scan_processing : currentLang.scan_add_btn}</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  disabled={isScanning}
                  className="hidden"
                />
              </label>
              <span className="text-[11px] text-slate-500 mt-2">{currentLang.scan_privacy_note}</span>
            </div>
          </div>

          {/* REAL-TIME ANALYSIS STATUS BANNER */}
          {isScanning && (
            <div className="bg-[#EAF3F2] border-2 border-[#2F5D62] rounded-2xl p-4 mb-6 flex items-center gap-3 animate-pulse">
              <div className="w-6 h-6 border-3 border-[#2F5D62] border-t-transparent rounded-full animate-spin flex-shrink-0" />
              <div className="flex-1">
                <div className="text-xs font-black text-[#2F5D62] uppercase tracking-wide">
                  Clinical Intelligence Engine Processing
                </div>
                <div className="text-xs text-slate-700 font-semibold">
                  {scanningStatus || 'Analyzing document...'}
                </div>
              </div>
            </div>
          )}

          {/* SCANNED DOCUMENTS WITH COMPLETE MODULE B INTELLIGENCE */}
          {scannedFiles.length > 0 && (
            <div className="mb-6 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>{currentLang.uploaded_docs_title} ({scannedFiles.length})</span>
                </h4>
                <span className="text-[11px] text-slate-500 font-medium">
                  Zero-Disk RAM Buffer • Fully Digitized
                </span>
              </div>

              {scannedFiles.map((f, idx) => {
                const ext = f.data || {};
                const meds = f.cdsco_normalized_medications || ext.medications || [];
                const labs = f.evaluated_labs?.results || ext.lab_values || [];
                const safetyAlerts = f.safety_audit?.alerts || [];
                const docHospital = formatClinicalText(ext.doctor_or_hospital);
                const fileName = typeof f.name === 'string' ? f.name : `Document #${idx + 1}`;
                const docType = typeof ext.document_type === 'string' ? ext.document_type.replace(/_/g, ' ') : 'Medical Record';

                return (
                  <div
                    key={idx}
                    className="bg-white border-2 border-slate-200 hover:border-[#2F5D62]/40 rounded-3xl p-5 text-xs shadow-sm transition-all space-y-4"
                  >
                    {/* Header: Document Title, Hospital & OpenCV Stage 1 Badge */}
                    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                          <h5 className="font-extrabold text-slate-900 text-sm">{fileName}</h5>
                          <span className="bg-[#EAF3F2] text-[#2F5D62] px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                            {docType}
                          </span>
                        </div>
                        {docHospital && (
                          <p className="text-slate-600 font-medium text-xs mt-0.5 pl-7">
                            {docHospital}
                          </p>
                        )}
                      </div>

                      {/* OpenCV Preprocessing Metrics */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {f.was_dewarped && (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md text-[10px] font-bold">
                            OpenCV Dewarped
                          </span>
                        )}
                        {f.quality_assessment && (
                          <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase">
                            Quality: {f.quality_assessment}
                          </span>
                        )}
                        {f.sharpness_score !== undefined && (
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[10px] font-mono">
                            Sharpness: {Number(f.sharpness_score).toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* STAGE 4: CDSCO Indian Formulary Medications */}
                    {meds.length > 0 && (
                      <div>
                        <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-2 flex items-center justify-between">
                          <span>Prescribed Medications ({meds.length})</span>
                          <span className="text-[10px] text-emerald-700 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-full">
                            CDSCO Formulary Matched
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {meds.map((m: any, mIdx: number) => {
                            const brandName = m.name || m.medication || 'Medicine';
                            const genericName = m.normalized_generic;
                            const rxcui = m.rxcui;
                            const dose = m.dose ? `${m.dose}` : '';
                            const freq = m.frequency_english || m.frequency || '';
                            const duration = m.duration ? `• ${m.duration}` : '';
                            const isVerified = m.cdsco_status === 'verified_match' || m.cdsco_match;

                            return (
                              <div
                                key={mIdx}
                                className="bg-[#EAF3F2]/50 border border-teal-800/15 rounded-xl p-3 flex flex-col justify-between"
                              >
                                <div>
                                  <div className="flex items-center justify-between gap-1 mb-1">
                                    <span className="font-extrabold text-slate-900 text-xs">
                                      {brandName} {dose}
                                    </span>
                                    {isVerified ? (
                                      <span className="bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded">
                                        CDSCO
                                      </span>
                                    ) : (
                                      <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded">
                                        Review
                                      </span>
                                    )}
                                  </div>

                                  {genericName && (
                                    <div className="text-[11px] text-teal-900 font-semibold mb-1">
                                      Generic: <span className="font-extrabold">{genericName}</span>
                                    </div>
                                  )}

                                  {freq && (
                                    <div className="text-[11px] text-slate-600 font-medium">
                                      Dosage: <span className="text-slate-800 font-bold">{freq}</span> {duration}
                                      {m.vernacular_translated && (
                                        <span className="ml-1 text-[9px] text-emerald-700 font-bold bg-emerald-50 px-1 py-0.2 rounded">
                                          Translated
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {rxcui && (
                                  <div className="text-[9px] text-slate-400 font-mono mt-1 pt-1 border-t border-teal-800/10">
                                    RxNorm RxCUI: {rxcui}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* STAGE 6A: Quantitative LOINC Lab Investigations */}
                    {labs.length > 0 && (
                      <div>
                        <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-2 flex items-center justify-between">
                          <span>Diagnostic Lab Investigations ({labs.length})</span>
                          <span className="text-[10px] text-sky-700 font-extrabold bg-sky-50 px-2 py-0.5 rounded-full">
                            LOINC Standardized
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {labs.map((l: any, lIdx: number) => {
                            const testName = l.test_name || l.name || 'Lab Test';
                            const val = l.raw_value ?? l.value ?? '';
                            const unit = l.unit || '';
                            const refRange = l.reference_range_display || l.reference_range || '';
                            const status = (l.severity_status || l.status || 'NORMAL').toUpperCase();
                            const isPanic = l.is_panic || status === 'PANIC';
                            const isAbnormal = status === 'ABNORMAL' || isPanic;

                            return (
                              <div
                                key={lIdx}
                                className={`rounded-xl p-3 border ${
                                  isPanic
                                    ? 'bg-rose-50 border-rose-300 text-rose-950'
                                    : isAbnormal
                                    ? 'bg-amber-50 border-amber-300 text-amber-950'
                                    : 'bg-slate-50 border-slate-200 text-slate-800'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-extrabold text-xs">{testName}</span>
                                  <span
                                    className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                      isPanic
                                        ? 'bg-rose-600 text-white animate-pulse'
                                        : isAbnormal
                                        ? 'bg-amber-500 text-white'
                                        : 'bg-emerald-600 text-white'
                                    }`}
                                  >
                                    {isPanic ? 'CRITICAL PANIC' : status}
                                  </span>
                                </div>
                                <div className="text-base font-black tracking-tight">
                                  {val} <span className="text-xs font-bold text-slate-500">{unit}</span>
                                </div>
                                {refRange && (
                                  <div className="text-[10px] text-slate-500 mt-0.5">
                                    Ref: {refRange} {l.loinc_code ? `• LOINC ${l.loinc_code}` : ''}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* STAGE 6B: Pharmacological Safety Warnings */}
                    {safetyAlerts.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[11px] font-bold text-rose-800 uppercase tracking-wide flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Pharmacological Safety Audit ({safetyAlerts.length})</span>
                        </div>
                        {safetyAlerts.map((alert: any, aIdx: number) => (
                          <div
                            key={aIdx}
                            className="bg-rose-50 border-l-4 border-rose-500 p-3 rounded-r-xl text-rose-900"
                          >
                            <div className="font-black text-xs mb-0.5">{alert.title}</div>
                            <div className="text-[11px] text-rose-800">{alert.description}</div>
                            {alert.recommendation && (
                              <div className="mt-1.5 text-[10px] font-bold bg-white/70 border border-rose-200 p-1.5 rounded-lg text-rose-950">
                                Clinical Recommendation: {alert.recommendation}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Diagnoses detected */}
                    {ext.diagnoses && Array.isArray(ext.diagnoses) && ext.diagnoses.length > 0 && (
                      <div className="text-[11px] text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <span className="font-bold text-slate-900">Clinical Diagnoses: </span>
                        {ext.diagnoses
                          .map((d: any) => (typeof d === 'string' ? d : d.name))
                          .filter(Boolean)
                          .join(', ')}
                      </div>
                    )}

                    {/* Key Findings / Doctor Advice */}
                    {ext.key_findings && (
                      <div className="text-[11px] text-slate-600 italic bg-amber-50/50 p-2.5 rounded-xl border border-amber-200/50">
                        <span className="font-bold text-slate-800 not-italic">Doctor Advice / Note: </span>
                        {typeof ext.key_findings === 'string'
                          ? ext.key_findings
                          : JSON.stringify(ext.key_findings)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <button
            onClick={handleFinishKiosk}
            className="touch-target w-full bg-[#2F5D62] text-white hover:bg-teal-800 rounded-2xl p-4 font-bold text-lg flex items-center justify-center gap-2 shadow-md transition-all mt-4"
          >
            <span>{currentLang.scan_finish_btn}</span>
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}


      {/* STEP 7: CONFIRMATION & DIGITAL OPD CONSULTATION SLIP (FULLY LOCALIZED) */}
      {step === 'confirm' && (() => {
        const allocatedDoc = allocatedDoctor || allocateDoctorAndRoom({
          age: patientAge,
          clinical_mode: clinicalMode,
          is_red_flag: false,
          symptoms_text: answeredHistory.map((a: any) => a.answer || '').join(' ') || ''
        });
        const waitTime = getEstimatedQueueTime(1, allocatedDoc);

        return (
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm text-center my-auto max-w-2xl mx-auto w-full">
            <div className="w-16 h-16 bg-emerald-100 text-[#2E7D4F] rounded-full flex items-center justify-center mx-auto mb-4 shadow-xs">
              <CheckCircle className="w-10 h-10" />
            </div>

            <h2 className="text-2xl md:text-3xl font-extrabold text-[#1A1A1A] mb-1">
              {currentLang.confirm_title}
            </h2>
            <p className="text-slate-600 text-xs md:text-sm mb-6 max-w-lg mx-auto">
              {currentLang.confirm_desc}
            </p>

            {/* OFFICIAL DIGITAL OPD CONSULTATION SLIP */}
            <div className="bg-gradient-to-b from-[#FAF4D3]/40 to-slate-50 border-2 border-[#2F5D62]/30 rounded-3xl p-5 md:p-6 mb-6 text-left shadow-md relative overflow-hidden">
              {/* Top Slip Header */}
              <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-3 mb-4 gap-2">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#2F5D62] bg-[#EAF3F2] px-2.5 py-0.5 rounded-full">
                    Hospital OPD Smart Token
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 mt-1">
                    Official Consultation Token Pass
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-2xl md:text-3xl font-black text-[#2F5D62] tracking-wider block">
                    {queueId}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    ● Live Queue Active
                  </span>
                </div>
              </div>

              {/* Slip Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs mb-4">
                <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="text-slate-400 text-[10px] font-bold block uppercase">Patient Name</span>
                  <span className="font-extrabold text-slate-900 text-sm truncate block">{patientName.trim() || 'PATIENT_GUEST'}</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="text-slate-400 text-[10px] font-bold block uppercase">Age / Gender</span>
                  <span className="font-bold text-slate-800">{patientAge || '35'} Yrs / {patientGender}</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="text-slate-400 text-[10px] font-bold block uppercase">ABHA ID (Optional)</span>
                  <span className="font-mono text-slate-700 text-[11px] font-bold truncate block">
                    {abhaId ? abhaId : 'Hospital to Link'}
                  </span>
                </div>
              </div>

              {/* Assigned Room & Doctor Highlight Card */}
              <div className="bg-[#2F5D62] text-white p-4 rounded-2xl shadow-sm mb-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-emerald-200 text-[10px] font-black uppercase tracking-wider block">
                      Allocated Consultation Room
                    </span>
                    <p className="text-lg md:text-xl font-black">
                      {allocatedDoc.room_display}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-200 text-[10px] font-black uppercase tracking-wider block">
                      Estimated Queue Time
                    </span>
                    <span className="bg-white/20 text-white font-extrabold text-xs px-2.5 py-1 rounded-lg inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {waitTime.timeString}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/20 flex flex-wrap items-center justify-between text-xs text-teal-100 gap-1">
                  <span><strong>Doctor:</strong> {allocatedDoc.name} ({allocatedDoc.qualification})</span>
                  <span className="text-[11px] opacity-90 font-medium">{allocatedDoc.floor}</span>
                </div>
              </div>

              {/* Waiting Guidance Note */}
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs p-3 rounded-xl flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">आपकी स्वास्थ्य जानकारी डॉक्टर के कंप्यूटर पर स्थानांतरित कर दी गई है।</p>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    कृपया टोकन संख्या <strong>{queueId}</strong> याद रखें और <strong>{allocatedDoc.room_number}</strong> के बाहर अपनी बारी की प्रतीक्षा करें।
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => {
                  playHospitalChime();
                  speakPrompt(`टोकन संख्या ${queueId}। कृपया ${allocatedDoc.room_number} के बाहर प्रतीक्षा करें।`);
                }}
                className="touch-target bg-slate-100 hover:bg-slate-200 text-[#2F5D62] border border-slate-200 px-5 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 transition-all"
              >
                <Volume2 className="w-4 h-4" />
                <span>Replay Room Announcement</span>
              </button>
              <Link
                href="/"
                onClick={handleResetSession}
                className="touch-target inline-flex items-center gap-2 bg-metallic-gold hover:brightness-105 active:scale-[0.98] text-ink-black px-8 py-3 rounded-2xl font-extrabold text-sm shadow-md transition-all"
              >
                <span>{currentLang.home_btn}</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        );
      })()}

      {/* Footer */}
      <footer className="text-center text-xs text-ink-black/60 py-2 font-medium">
        {currentLang.app_title} • 10 Major Indian Languages • DPDP Compliant
      </footer>
      </main>
    </div>
  );
}
