'use client';

import React, { useState } from 'react';
import { 
  Calendar, 
  FileText, 
  Activity, 
  AlertTriangle, 
  ChevronRight, 
  Clock, 
  Stethoscope, 
  Pill,
  Sparkles,
  CheckCircle2
} from '@/components/Icons';

export interface TimelineEpisode {
  episode_id: string;
  title: string;
  start_date: string;
  end_date: string;
  records: Array<{
    id: string;
    title: string;
    date: string;
    document_type?: string;
    quality?: string;
    diagnoses?: string[];
    medications?: string[];
    labs?: string[];
    clinical_notes?: string[];
  }>;
}

interface MedicalTimelineProps {
  episodes: TimelineEpisode[];
  onSelectRecord?: (record: any) => void;
}

export function MedicalTimeline({ episodes, onSelectRecord }: MedicalTimelineProps) {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [expandedEpisode, setExpandedEpisode] = useState<string | null>(
    episodes[0]?.episode_id || null
  );

  if (!episodes || episodes.length === 0) {
    return (
      <div className="p-8 bg-slate-900/90 border border-slate-800 rounded-3xl text-center space-y-2">
        <Calendar className="w-8 h-8 text-teal-400 mx-auto mb-2 opacity-80" />
        <h5 className="text-sm font-bold text-slate-200">No Longitudinal Patient Records Clustered Yet</h5>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Module B vision OCR automatically clusters historical prescriptions and diagnostic episodes here chronologically.
        </p>
      </div>
    );
  }

  const filteredEpisodes = episodes.filter(ep => {
    if (selectedFilter === 'all') return true;
    return ep.records.some(r => 
      (r.document_type || '').toLowerCase().includes(selectedFilter.toLowerCase()) ||
      (r.title || '').toLowerCase().includes(selectedFilter.toLowerCase())
    );
  });

  return (
    <div className="space-y-4">
      {/* Header & Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <span className="p-1.5 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30">
            <Calendar className="w-4 h-4" />
          </span>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
              <span>Chronological Longitudinal Care Journey</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                {episodes.length} Episode{episodes.length === 1 ? '' : 's'}
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">ABDM Longitudinal Health Record Timeline (Module B Vision Clustered)</p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5">
          {['all', 'Prescription', 'Diagnostic'].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setSelectedFilter(f)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedFilter === f
                  ? 'bg-[#004643] text-white shadow-sm border border-teal-500/40'
                  : 'bg-slate-800/90 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              {f === 'all' ? 'All Episodes' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Stream */}
      <div className="relative pl-7 space-y-6 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-teal-400 before:via-indigo-500 before:to-slate-800">
        {filteredEpisodes.map((ep) => {
          const isExpanded = expandedEpisode === ep.episode_id;

          return (
            <div key={ep.episode_id} className="relative group">
              {/* Dot Icon on Timeline Bar */}
              <div
                className={`absolute -left-7 top-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer shadow-md ${
                  isExpanded
                    ? 'bg-teal-500 border-white text-slate-950 ring-4 ring-teal-500/20'
                    : 'bg-slate-900 border-teal-400/60 text-teal-300 hover:border-teal-300 hover:scale-110'
                }`}
                onClick={() => setExpandedEpisode(isExpanded ? null : ep.episode_id)}
              >
                <div className={`w-2 h-2 rounded-full ${isExpanded ? 'bg-slate-950' : 'bg-teal-300'}`} />
              </div>

              {/* Episode Box */}
              <div className="bg-slate-900 border border-slate-800 hover:border-teal-500/30 rounded-2xl p-4 transition-all shadow-md">
                {/* Header */}
                <div
                  className="flex items-center justify-between cursor-pointer select-none"
                  onClick={() => setExpandedEpisode(isExpanded ? null : ep.episode_id)}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h5 className="text-sm font-extrabold text-white">{ep.title}</h5>
                      <span className="text-[10px] font-mono bg-slate-800 text-teal-300 px-2.5 py-0.5 rounded-lg border border-slate-700 font-bold">
                        {ep.start_date} {ep.end_date !== ep.start_date ? `➔ ${ep.end_date}` : ''}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {ep.records.length} clinical record{ep.records.length > 1 ? 's' : ''} in this episode
                    </p>
                  </div>

                  <ChevronRight
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                      isExpanded ? 'rotate-90 text-teal-400' : ''
                    }`}
                  />
                </div>

                {/* Expanded Records List */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
                    {ep.records.map((rec, rIdx) => (
                      <div
                        key={rec.id || rIdx}
                        onClick={() => onSelectRecord?.(rec)}
                        className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-teal-500/50 cursor-pointer transition-all hover:bg-slate-900/90 shadow-sm"
                      >
                        <div className="flex items-center justify-between text-xs mb-2">
                          <span className="font-bold text-white flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5 text-teal-400" />
                            <span>{rec.title}</span>
                          </span>
                          <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                            {rec.date}
                          </span>
                        </div>

                        {/* Diagnoses */}
                        {rec.diagnoses && rec.diagnoses.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {rec.diagnoses.map((d, dIdx) => (
                              <span
                                key={dIdx}
                                className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              >
                                {d}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Medications */}
                        {rec.medications && rec.medications.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {rec.medications.map((m, mIdx) => (
                              <span
                                key={mIdx}
                                className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1"
                              >
                                <Pill className="w-3 h-3" />
                                <span>{m}</span>
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Clinical notes snippet */}
                        {rec.clinical_notes && rec.clinical_notes.length > 0 && (
                          <p className="text-xs text-slate-300 mt-1 line-clamp-2 italic bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
                            "{rec.clinical_notes[0]}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
