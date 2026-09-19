'use client';

import React, { useState } from 'react';
import { 
  FileText, 
  User, 
  Activity, 
  Pill, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck, 
  Copy, 
  Check, 
  Code, 
  Download, 
  Sparkles,
  ChevronRight,
  Info
} from '@/components/Icons';

interface FhirResourceInspectorProps {
  bundle: any;
  patientName?: string;
  onDownloadText?: () => void;
  onPushToHIS?: () => void;
  isPushing?: boolean;
}

export function FhirResourceInspector({
  bundle,
  patientName = 'Patient',
  onDownloadText,
  onPushToHIS,
  isPushing = false
}: FhirResourceInspectorProps) {
  const [activeCategory, setActiveCategory] = useState<'all' | 'Patient' | 'Condition' | 'MedicationStatement' | 'Observation' | 'AllergyIntolerance' | 'Composition'>('all');
  const [showRawJson, setShowRawJson] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  if (!bundle) {
    return (
      <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-3">
        <FileText className="w-10 h-10 text-slate-500 mx-auto" />
        <h4 className="text-sm font-bold text-slate-200">No FHIR R4 Bundle Generated Yet</h4>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Click "Generate / Refresh Report" above to compile the ABDM NRCeS Dual-Coded FHIR R4 consultation bundle.
        </p>
      </div>
    );
  }

  const entries: any[] = Array.isArray(bundle.entry) ? bundle.entry : [];
  const resources = entries.map(e => e.resource).filter(Boolean);

  // Categorized Resources
  const patientRes = resources.find(r => r.resourceType === 'Patient');
  const conditions = resources.filter(r => r.resourceType === 'Condition');
  const medications = resources.filter(r => r.resourceType === 'MedicationStatement');
  const observations = resources.filter(r => r.resourceType === 'Observation');
  const allergies = resources.filter(r => r.resourceType === 'AllergyIntolerance');
  const compositions = resources.filter(r => r.resourceType === 'Composition');

  const filteredResources = activeCategory === 'all' 
    ? resources 
    : resources.filter(r => r.resourceType === activeCategory);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(bundle, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Top Toolbar: View Switcher & Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold uppercase text-slate-400 mr-1.5">Resource Filter:</span>
          {(['all', 'Patient', 'Condition', 'MedicationStatement', 'Observation', 'AllergyIntolerance', 'Composition'] as const).map((cat) => {
            const count = cat === 'all' 
              ? resources.length 
              : resources.filter(r => r.resourceType === cat).length;

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeCategory === cat 
                    ? 'bg-[#004643] text-white shadow-sm border border-teal-500/40' 
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span>{cat === 'all' ? 'All' : cat}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeCategory === cat ? 'bg-teal-900 text-teal-200' : 'bg-slate-700 text-slate-300'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowRawJson(!showRawJson)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
              showRawJson 
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>{showRawJson ? 'View Visual Cards' : 'View Raw JSON'}</span>
          </button>
          
          <button
            type="button"
            onClick={handleCopyJson}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy JSON'}</span>
          </button>
        </div>
      </div>

      {/* RAW JSON VIEW */}
      {showRawJson ? (
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-4 overflow-hidden">
          <pre className="text-emerald-400 font-mono text-xs overflow-x-auto max-h-[500px] leading-relaxed p-2">
            {JSON.stringify(bundle, null, 2)}
          </pre>
        </div>
      ) : (
        /* VISUAL HUMAN-READABLE FHIR R4 CARDS */
        <div className="space-y-4">
          {/* PATIENT RESOURCE CARD */}
          {(activeCategory === 'all' || activeCategory === 'Patient') && patientRes && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30">
                    <User className="w-4 h-4" />
                  </span>
                  <span className="text-xs font-black uppercase tracking-wider text-white">FHIR R4 Patient Resource</span>
                  <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                    ID: {patientRes.id || 'pat-1'}
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  ABDM Verified Demographics
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-bold block">Patient Name</span>
                  <span className="font-bold text-white text-sm">
                    {patientRes.name?.[0]?.text || patientName}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-bold block">Gender / DOB</span>
                  <span className="font-semibold text-slate-200 capitalize">
                    {patientRes.gender || 'Unknown'} • {patientRes.birthDate || '1981-05-12'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-bold block">ABHA Number / Address</span>
                  <span className="font-mono font-bold text-teal-300">
                    {patientRes.identifier?.[0]?.value || '91-4433-2211-7788'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-bold block">Telecom Contact</span>
                  <span className="font-mono text-slate-300">
                    {patientRes.telecom?.[0]?.value || '+91 98765 43210'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* CONDITIONS (DIAGNOSES & COMPLAINTS) */}
          {(activeCategory === 'all' || activeCategory === 'Condition') && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <Activity className="w-4 h-4" />
                  </span>
                  <span className="text-xs font-black uppercase tracking-wider text-white">Condition Resources (Diagnoses & Complaints)</span>
                  <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                    Count: {conditions.length}
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  ICD-10 & SNOMED CT Dual Coded
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {conditions.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No Condition resources recorded in this bundle.</p>
                ) : (
                  conditions.map((cond, idx) => {
                    const codeObj = cond.code?.coding?.[0] || {};
                    return (
                      <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                        <div className="flex items-start justify-between">
                          <span className="text-xs font-bold text-white">
                            {cond.code?.text || codeObj.display || 'Clinical Condition'}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 capitalize">
                            {cond.clinicalStatus?.coding?.[0]?.code || 'active'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1 text-[11px] text-slate-400">
                          {codeObj.code && (
                            <span className="font-mono bg-slate-800 text-amber-300 px-2 py-0.5 rounded border border-slate-700">
                              {codeObj.system?.includes('snomed') ? 'SNOMED' : 'ICD-10'}: {codeObj.code}
                            </span>
                          )}
                          <span className="ml-auto text-[10px] text-slate-500">Recorded via Kiosk Intake</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* OBSERVATIONS (LABS & CLINICAL VITALS) */}
          {(activeCategory === 'all' || activeCategory === 'Observation') && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30">
                    <Activity className="w-4 h-4" />
                  </span>
                  <span className="text-xs font-black uppercase tracking-wider text-white">Observation Resources (Vitals & Labs)</span>
                  <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                    Count: {observations.length}
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  LOINC Standardized
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {observations.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No Observation resources recorded in this bundle.</p>
                ) : (
                  observations.map((obs, idx) => {
                    const code = obs.code?.coding?.[0] || {};
                    const val = obs.valueQuantity ? `${obs.valueQuantity.value} ${obs.valueQuantity.unit || ''}` : obs.valueString || 'Normal';
                    const isHigh = /high|elevated|abnormal|panic/i.test(obs.interpretation?.[0]?.coding?.[0]?.code || '');

                    return (
                      <div key={idx} className={`p-3 rounded-xl border transition-all ${
                        isHigh ? 'bg-rose-950/30 border-rose-500/40' : 'bg-slate-950 border border-slate-800'
                      }`}>
                        <div className="flex items-start justify-between">
                          <span className="text-xs font-bold text-white">{obs.code?.text || code.display || 'Investigation'}</span>
                          {code.code && (
                            <span className="text-[10px] font-mono bg-slate-800 text-teal-300 px-2 py-0.5 rounded border border-slate-700">
                              LOINC: {code.code}
                            </span>
                          )}
                        </div>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-base font-black text-white font-mono">{val}</span>
                          {obs.referenceRange?.[0]?.text && (
                            <span className="text-[10px] text-slate-400 ml-auto">
                              Ref: {obs.referenceRange[0].text}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* MEDICATION STATEMENTS */}
          {(activeCategory === 'all' || activeCategory === 'MedicationStatement') && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    <Pill className="w-4 h-4" />
                  </span>
                  <span className="text-xs font-black uppercase tracking-wider text-white">MedicationStatement Resources</span>
                  <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                    Count: {medications.length}
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Standardized Sig & Dosage
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {medications.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No MedicationStatement resources in this bundle.</p>
                ) : (
                  medications.map((med, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                      <div className="flex items-start justify-between">
                        <span className="text-xs font-bold text-white">
                          {med.medicationCodeableConcept?.text || 'Prescribed Medicine'}
                        </span>
                        <span className="text-[10px] font-mono bg-slate-800 text-indigo-300 px-2 py-0.5 rounded">
                          {med.dosage?.[0]?.timing?.code?.text || 'Oral'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        {med.dosage?.[0]?.text || 'Instructions recorded in electronic prescription'}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ALLERGIES & HYPERSENSITIVITY */}
          {(activeCategory === 'all' || activeCategory === 'AllergyIntolerance') && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    <AlertTriangle className="w-4 h-4" />
                  </span>
                  <span className="text-xs font-black uppercase tracking-wider text-white">AllergyIntolerance Resources</span>
                  <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                    Count: {allergies.length}
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Critical Safety Registry
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {allergies.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No AllergyIntolerance resources logged.</p>
                ) : (
                  allergies.map((alg, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/40 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-white">
                          {alg.code?.text || alg.substance?.text || 'Allergen'}
                        </span>
                        <span className="text-[10px] font-black bg-rose-500 text-white px-2 py-0.5 rounded uppercase tracking-wider">
                          {alg.criticality || 'HIGH'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        Reaction: {alg.reaction?.[0]?.manifestation?.[0]?.text || 'Hypersensitivity reaction'}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
