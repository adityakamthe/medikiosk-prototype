'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, ShieldCheck, ArrowRight, CheckCircle2, Lock, Sparkles, KeyRound, Stethoscope, Leaf } from 'lucide-react';

interface HospitalConfig {
  id: 'aiims' | 'aiia';
  name: string;
  fullName: string;
  type: string;
  clinicalMode: 'allopathy' | 'ayurveda' | 'integrated';
  defaultUsername: string;
  badge: string;
  icon: 'stethoscope' | 'leaf';
  accentColor: string;
  databaseName: string;
  description: string;
  specialties: string[];
}

const HOSPITALS: HospitalConfig[] = [
  {
    id: 'aiims',
    name: 'AIIMS New Delhi',
    fullName: 'All India Institute of Medical Sciences, New Delhi',
    type: 'Apex Integrated Multi-Specialty Hospital',
    clinicalMode: 'integrated',
    defaultUsername: 'aiims-delhi',
    badge: 'Integrated Multi-Specialty · DB 1',
    icon: 'stethoscope',
    accentColor: 'border-emerald-500/40 bg-emerald-500/5',
    databaseName: 'Neon DB 1 (US-West · Integrated Allopathy & AYUSH)',
    description: 'Full Multi-Specialty: General Medicine, Cardiology, Pulmonology, Gastroenterology, Neurology, Orthopedics, Pediatrics, Dermatology, ENT & AYUSH Integrative Center.',
    specialties: ['General Medicine', 'Cardiology', 'Orthopedics', 'Pediatrics', 'Pulmonology', 'Gastroenterology', 'Neurology', 'Dermatology', 'ENT', 'AYUSH Center']
  },
  {
    id: 'aiia',
    name: 'AIIA Integrated Medical Center',
    fullName: 'All India Institute of Ayurveda & Integrated Multi-Specialty Hospital, New Delhi',
    type: 'National Apex Integrated Multi-Specialty Hospital',
    clinicalMode: 'integrated',
    defaultUsername: 'aiia-delhi',
    badge: 'Integrated Multi-Specialty · DB 2',
    icon: 'leaf',
    accentColor: 'border-amber-500/40 bg-amber-500/5',
    databaseName: 'Neon DB 2 (AP-Southeast · Integrated Allopathy & AYUSH)',
    description: 'Full Multi-Specialty: AYUSH Kayachikitsa & Panchakarma, General Medicine, Cardiology, Pulmonology, Gastroenterology, Neurology, Orthopedics, Pediatrics, Dermatology & ENT.',
    specialties: ['AYUSH Center', 'General Medicine', 'Cardiology', 'Orthopedics', 'Pediatrics', 'Pulmonology', 'Gastroenterology', 'Neurology', 'Dermatology', 'ENT']
  }
];

export default function HospitalLoginPage() {
  const router = useRouter();
  const [selectedHospitalId, setSelectedHospitalId] = useState<'aiims' | 'aiia'>('aiims');
  const [hospitalCode, setHospitalCode] = useState<string>('aiims-delhi');
  const [password, setPassword] = useState<string>('aiims@2026');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [activeHospital, setActiveHospital] = useState<any>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('medikiosk_hospital');
      if (stored) {
        setActiveHospital(JSON.parse(stored));
      }
    } catch {}
  }, []);

  const handleSelectHospital = (h: HospitalConfig) => {
    setSelectedHospitalId(h.id);
    setHospitalCode(h.defaultUsername);
    setPassword(h.id === 'aiims' ? 'aiims@2026' : 'ayush@2026');
    setErrorMsg(null);
  };

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    const hospital = HOSPITALS.find(h => h.id === selectedHospitalId);
    if (!hospital) return;

    if (!hospitalCode.trim() || !password.trim()) {
      setErrorMsg('Please enter both hospital identifier and authorized security password.');
      return;
    }

    setIsLoggingIn(true);
    setTimeout(() => {
      const hospitalSession = {
        id: hospital.id,
        name: hospital.name,
        fullName: hospital.fullName,
        clinicalMode: hospital.clinicalMode,
        databaseName: hospital.databaseName,
        loggedInAt: new Date().toISOString()
      };

      try {
        localStorage.setItem('medikiosk_hospital', JSON.stringify(hospitalSession));
        // Also set a browser cookie for server routes if needed
        document.cookie = `medikiosk_hospital=${hospital.id}; path=/; max-age=86400; SameSite=Lax`;
      } catch {}

      setIsLoggingIn(false);
      // Redirect back to home where Kiosk and Clinician are now unlocked
      router.push('/');
    }, 400);
  };

  const handleDirectDemoLogin = (hospitalId: 'aiims' | 'aiia') => {
    const hospital = HOSPITALS.find(h => h.id === hospitalId);
    if (!hospital) return;

    const hospitalSession = {
      id: hospital.id,
      name: hospital.name,
      fullName: hospital.fullName,
      clinicalMode: hospital.clinicalMode,
      databaseName: hospital.databaseName,
      loggedInAt: new Date().toISOString()
    };

    try {
      localStorage.setItem('medikiosk_hospital', JSON.stringify(hospitalSession));
      document.cookie = `medikiosk_hospital=${hospital.id}; path=/; max-age=86400; SameSite=Lax`;
    } catch {}

    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#FBF7EE] text-[#1B1B1B] flex flex-col justify-between selection:bg-[#F2A900]/30 font-sans">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-[#004643] text-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 md:px-6">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-90">
            <img
              src="/assets/logo/medikiosk-logo.png"
              alt="MediKiosk Logo"
              className="h-8 md:h-9 w-auto object-contain"
            />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs md:text-sm font-medium text-[#FBF7EE]/80 hover:text-white transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-4xl bg-white border border-slate-200/80 rounded-3xl shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          
          {/* Left Hero Column */}
          <div className="lg:col-span-5 bg-gradient-to-br from-[#004643] via-[#003B38] to-[#012A28] p-6 md:p-8 text-white flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#F2A900]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
            
            <div className="relative z-10 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-semibold text-[#F2A900]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Hospital Facility Gateway</span>
              </div>

              <h1 className="text-2xl md:text-3xl font-black tracking-tight font-serif text-[#FBF7EE]">
                Hospital Identity & OPD Unlock
              </h1>

              <p className="text-xs md:text-sm text-white/80 leading-relaxed">
                MediKiosk operates in strict isolation per hospital facility. Authenticating your hospital unlocks the on-site kiosk, clinician consultation terminal, and routes patient data to that hospital's database.
              </p>

              <div className="pt-2 space-y-2.5">
                <div className="flex items-start gap-2.5 text-xs text-white/90 bg-white/5 p-3 rounded-2xl border border-white/10">
                  <CheckCircle2 className="w-4 h-4 text-[#F2A900] shrink-0 mt-0.5" />
                  <span>Dual Neon Database segregation across Integrated Multi-Specialty Healthcare Centers.</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-white/90 bg-white/5 p-3 rounded-2xl border border-white/10">
                  <CheckCircle2 className="w-4 h-4 text-[#F2A900] shrink-0 mt-0.5" />
                  <span>All specialized departments (Modern Allopathy & AYUSH Integrative Care) available at both hospitals.</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-white/90 bg-white/5 p-3 rounded-2xl border border-white/10">
                  <CheckCircle2 className="w-4 h-4 text-[#F2A900] shrink-0 mt-0.5" />
                  <span>Longitudinal ABDM health data exchange to retrieve prior appointments across hospitals.</span>
                </div>
              </div>
            </div>

            {activeHospital && (
              <div className="mt-6 p-3 bg-white/10 rounded-2xl border border-white/15 text-xs">
                <p className="text-white/60 text-[10px] uppercase font-bold tracking-wider">Currently Connected</p>
                <p className="font-bold text-[#F2A900] mt-0.5">{activeHospital.name}</p>
                <p className="text-[11px] text-white/70">Mode: Integrated Multi-Specialty</p>
              </div>
            )}
          </div>

          {/* Right Selection & Form Column */}
          <div className="lg:col-span-7 p-6 md:p-8 flex flex-col justify-between">
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-black text-slate-900">Select Hospital Facility</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Choose which hospital environment you want to unlock for OPD intake & clinician review. Both facilities provide full multi-specialty care.
                </p>
              </div>

              {/* Hospital Selection Cards */}
              <div className="space-y-3 mb-6">
                {HOSPITALS.map((h) => {
                  const isSelected = selectedHospitalId === h.id;
                  return (
                    <div
                      key={h.id}
                      onClick={() => handleSelectHospital(h)}
                      className={`cursor-pointer p-4 rounded-2xl border transition-all text-left relative ${
                        isSelected
                          ? 'border-[#004643] bg-[#004643]/5 shadow-sm ring-1 ring-[#004643]'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            h.id === 'aiims' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {h.id === 'aiims' ? <Stethoscope className="w-5 h-5" /> : <Leaf className="w-5 h-5" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-extrabold text-sm text-slate-900">{h.name}</h3>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                {h.badge}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">{h.type}</p>
                          </div>
                        </div>

                        <input
                          type="radio"
                          name="hospital_selection"
                          checked={isSelected}
                          onChange={() => handleSelectHospital(h)}
                          className="mt-1.5 h-4 w-4 text-[#004643] focus:ring-[#004643]"
                        />
                      </div>

                      <p className="text-[11px] text-slate-600 mt-2.5 border-t border-slate-100 pt-2">
                        {h.description}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-1">
                        {h.specialties.map((spec) => (
                          <span
                            key={spec}
                            className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200"
                          >
                            {spec}
                          </span>
                        ))}
                      </div>

                      <div className="mt-2.5 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]">
                          Target: {h.databaseName}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDirectDemoLogin(h.id);
                          }}
                          className="text-[11px] font-bold text-[#004643] hover:text-[#003B38] bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3 text-[#F2A900]" />
                          1-Click Demo Login
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-4 border-t border-slate-100 pt-4">
                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                    {errorMsg}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Hospital Facility ID
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={hospitalCode}
                        onChange={(e) => setHospitalCode(e.target.value)}
                        placeholder="e.g. aiims-delhi or aiia-ayush"
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#004643] font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Security Password
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#004643]"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-3 bg-[#004643] hover:bg-[#003B38] text-white rounded-xl text-xs md:text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] cursor-pointer"
                >
                  {isLoggingIn ? (
                    <span>Authenticating Facility...</span>
                  ) : (
                    <>
                      <span>Unlock {selectedHospitalId === 'aiims' ? 'AIIMS New Delhi' : 'AIIA AYUSH'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                ABDM & HIS Multi-Tenant Protocol
              </span>
              <Link href="/patient" className="text-[#004643] font-bold hover:underline">
                Go to Patient Portal →
              </Link>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
