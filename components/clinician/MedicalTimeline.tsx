'use client';

import React, { useState } from 'react';
import { Calendar, FileText, Activity, AlertTriangle, ChevronRight, Clock, Stethoscope } from '@/components/Icons';

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
      <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl text-center">
        <Calendar className="w-8 h-8 text-slate-500 mx-auto mb-2" />
        <p className="text-xs text-slate-400">No longitudinal patient records clustered yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header & Filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-sky-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Chronological Medical Journey (Module B)
          </h4>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
            {episodes.length} Episodes
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1">
          {['all', 'Prescription', 'Diagnostic'].map((f) => (
            <button
              key={f}
              onClick={() => setSelectedFilter(f)}
              className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                selectedFilter === f
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              {f === 'all' ? 'All Records' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Stream */}
      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-sky-500 before:via-indigo-500 before:to-slate-800">
        {episodes.map((ep, epIdx) => {
          const isExpanded = expandedEpisode === ep.episode_id;

          return (
            <div key={ep.episode_id} className="relative group">
              {/* Dot Icon on Timeline Bar */}
              <div
                className={`absolute -left-6 top-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${
                  isExpanded
                    ? 'bg-sky-500 border-sky-300 shadow-md shadow-sky-500/40 ring-4 ring-sky-500/20'
                    : 'bg-slate-900 border-slate-600 hover:border-sky-400'
                }`}
                onClick={() => setExpandedEpisode(isExpanded ? null : ep.episode_id)}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${isExpanded ? 'bg-white' : 'bg-slate-400'}`} />
              </div>

              {/* Episode Box */}
              <div className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-xl p-3 transition-all">
                {/* Header */}
                <div
                  className="flex items-center justify-between cursor-pointer select-none"
                  onClick={() => setExpandedEpisode(isExpanded ? null : ep.episode_id)}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="text-sm font-semibold text-slate-100">{ep.title}</h5>
                      <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                        {ep.start_date} {ep.end_date !== ep.start_date ? `➔ ${ep.end_date}` : ''}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {ep.records.length} clinical record{ep.records.length > 1 ? 's' : ''} in this care episode
                    </p>
                  </div>

                  <ChevronRight
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                      isExpanded ? 'rotate-90 text-sky-400' : ''
                    }`}
                  />
                </div>

                {/* Expanded Records List */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2.5">
                    {ep.records.map((rec, rIdx) => (
                      <div
                        key={rec.id || rIdx}
                        onClick={() => onSelectRecord?.(rec)}
                        className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-sky-500/40 cursor-pointer transition-all hover:bg-slate-950"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-200 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-sky-400" />
                            {rec.title}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">{rec.date}</span>
                        </div>

                        {/* Medications in this document */}
                        {rec.medications && rec.medications.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {rec.medications.map((m, mIdx) => (
                              <span
                                key={mIdx}
                                className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950/40 text-emerald-300 border border-emerald-800/40"
                              >
                                {m}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Clinical notes snippet */}
                        {rec.clinical_notes && rec.clinical_notes.length > 0 && (
                          <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-2 italic">
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
