'use client';

import React from 'react';
import { Activity, AlertOctagon, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown } from '@/components/Icons';

export interface LabResultItem {
  test_name: string;
  raw_value: string;
  parsed_value?: number | null;
  unit?: string;
  loinc?: string | null;
  severity: 'normal' | 'abnormal' | 'panic' | 'info';
  status: string;
  is_panic: boolean;
  reference_range?: string | null;
  alert_message?: string | null;
}

interface LabOutRangeVisualizerProps {
  labs: LabResultItem[];
}

export function LabOutRangeVisualizer({ labs }: LabOutRangeVisualizerProps) {
  if (!labs || labs.length === 0) {
    return (
      <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl text-center">
        <Activity className="w-8 h-8 text-slate-500 mx-auto mb-2" />
        <p className="text-xs text-slate-400">No laboratory investigations extracted yet.</p>
      </div>
    );
  }

  const panicCount = labs.filter((l) => l.is_panic || l.severity === 'panic').length;
  const abnormalCount = labs.filter((l) => l.severity === 'abnormal').length;

  return (
    <div className="space-y-3">
      {/* Header with Panic / Abnormal badges */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Laboratory Investigations & LOINC (Module B)
          </h4>
        </div>

        <div className="flex items-center gap-1.5">
          {panicCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1 animate-pulse">
              <AlertOctagon className="w-3 h-3" />
              {panicCount} Critical Panic
            </span>
          )}
          {abnormalCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {abnormalCount} Out-of-Range
            </span>
          )}
        </div>
      </div>

      {/* Grid of Lab Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {labs.map((lab, idx) => {
          const isPanic = lab.is_panic || lab.severity === 'panic';
          const isAbnormal = lab.severity === 'abnormal';

          return (
            <div
              key={idx}
              className={`p-3 rounded-xl border transition-all ${
                isPanic
                  ? 'bg-rose-950/40 border-rose-500/50 shadow-sm shadow-rose-950/50 ring-1 ring-rose-500/30'
                  : isAbnormal
                  ? 'bg-amber-950/30 border-amber-500/40'
                  : 'bg-slate-900/70 border-slate-800'
              }`}
            >
              {/* Card Header: Name + LOINC */}
              <div className="flex items-start justify-between">
                <div>
                  <h5 className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
                    {isPanic ? (
                      <AlertOctagon className="w-3.5 h-3.5 text-rose-400 shrink-0 animate-bounce" />
                    ) : isAbnormal ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    )}
                    {lab.test_name}
                  </h5>
                  {lab.loinc && (
                    <span className="text-[9px] font-mono text-slate-400 ml-5">
                      LOINC: {lab.loinc}
                    </span>
                  )}
                </div>

                {/* Severity Badge */}
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                    isPanic
                      ? 'bg-rose-500 text-white'
                      : isAbnormal
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {lab.status.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Value & Reference Range */}
              <div className="mt-2.5 flex items-baseline justify-between border-t border-slate-800/80 pt-2">
                <div className="flex items-baseline gap-1">
                  <span
                    className={`text-lg font-bold font-mono ${
                      isPanic
                        ? 'text-rose-400'
                        : isAbnormal
                        ? 'text-amber-300'
                        : 'text-slate-100'
                    }`}
                  >
                    {lab.raw_value}
                  </span>
                  {lab.unit && (
                    <span className="text-xs text-slate-400 font-sans">{lab.unit}</span>
                  )}
                </div>

                {lab.reference_range && (
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block">Reference Interval</span>
                    <span className="text-[11px] font-mono text-slate-300">
                      {lab.reference_range}
                    </span>
                  </div>
                )}
              </div>

              {/* Panic Alert Callout Message */}
              {lab.alert_message && (
                <p className="mt-2 text-[10px] text-rose-300 bg-rose-900/30 p-1.5 rounded border border-rose-800/40">
                  {lab.alert_message}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
