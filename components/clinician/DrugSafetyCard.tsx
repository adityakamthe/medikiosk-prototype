'use client';

import React from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle, Pill, Plus } from '@/components/Icons';

export interface SafetyAlert {
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'WARNING' | 'INFO';
  title: string;
  description: string;
  recommendation: string;
}

export interface MedicationItem {
  name: string;
  dose?: string;
  frequency?: string;
  generic?: string | null;
  rxcui?: string | null;
  requires_ppi_warning?: boolean;
}

interface DrugSafetyCardProps {
  alerts: SafetyAlert[];
  medications: MedicationItem[];
  gastroprotectionStatus?: 'PROTECTED' | 'AT_RISK' | 'NOT_APPLICABLE';
  onAddGastroprotection?: () => void;
}

export function DrugSafetyCard({
  alerts,
  medications,
  gastroprotectionStatus = 'NOT_APPLICABLE',
  onAddGastroprotection,
}: DrugSafetyCardProps) {
  const hasAlerts = alerts && alerts.length > 0;
  const isAtRisk = gastroprotectionStatus === 'AT_RISK';

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {hasAlerts ? (
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          ) : (
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          )}
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Pharmacological Safety & DDI Audit (Module B)
          </h4>
        </div>

        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
            isAtRisk
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
          }`}
        >
          {isAtRisk ? 'Gastroprotection Required' : 'Safety Verified'}
        </span>
      </div>

      {/* Safety Alerts Banners */}
      {hasAlerts && (
        <div className="space-y-2">
          {alerts.map((alert, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-xl border ${
                alert.severity === 'CRITICAL' || alert.severity === 'HIGH'
                  ? 'bg-rose-950/40 border-rose-500/40'
                  : 'bg-amber-950/30 border-amber-500/40'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle
                    className={`w-4 h-4 shrink-0 ${
                      alert.severity === 'CRITICAL' || alert.severity === 'HIGH'
                        ? 'text-rose-400'
                        : 'text-amber-400'
                    }`}
                  />
                  <h5 className="text-xs font-bold text-slate-100">{alert.title}</h5>
                </div>
                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-900 text-slate-300">
                  {alert.severity}
                </span>
              </div>

              <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
                {alert.description}
              </p>

              {alert.recommendation && (
                <div className="mt-2 p-2 rounded bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-sky-300">
                    💡 <span className="font-semibold">Recommendation:</span> {alert.recommendation}
                  </span>
                  {alert.type === 'GASTROPROTECTION_OMISSION' && onAddGastroprotection && (
                    <button
                      onClick={onAddGastroprotection}
                      className="ml-2 px-2 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-[10px] font-medium flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Add Pantoprazole 40mg
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Medications List with CDSCO Generic Normalization & RxNorm */}
      {medications && medications.length > 0 && (
        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">
            Extracted Prescriptions & CDSCO Generic Normalization ({medications.length})
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {medications.map((med, idx) => (
              <div
                key={idx}
                className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <Pill className="w-3.5 h-3.5 text-indigo-400" />
                      {med.name}
                    </span>
                    {med.rxcui && (
                      <span className="text-[9px] font-mono text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded">
                        RxCUI: {med.rxcui}
                      </span>
                    )}
                  </div>

                  {med.generic && (
                    <p className="text-[10px] text-indigo-300 mt-1">
                      Generic: <span className="font-medium">{med.generic}</span>
                    </p>
                  )}
                </div>

                {(med.dose || med.frequency) && (
                  <div className="mt-1.5 text-[10px] text-slate-400 border-t border-slate-800/60 pt-1 flex items-center justify-between">
                    <span>{med.dose}</span>
                    <span className="font-mono text-slate-300">{med.frequency}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
