'use client';

import React, { useState, useEffect } from 'react';
import { 
  Pill, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  ShieldAlert, 
  ChevronRight,
  TrendingUp,
  TrendingDown
} from '@/components/Icons';

export interface PrescribedMedicine {
  id: string;
  name: string;
  dosage: string;
  frequency: string; // e.g. '1-0-1', '1-0-0', '0-0-1', 'TDS', 'SOS'
  timing: string;    // e.g. 'After Meals (PC)', 'Before Meals (AC)', 'At Bedtime (HS)'
  duration: string;  // e.g. '5 days', '10 days', '1 month'
  instructions?: string;
  is_high_risk?: boolean;
  allergy_warning?: string | null;
}

export interface OutOfRangeLabItem {
  id: string;
  test_name: string;
  value: string;
  unit: string;
  reference_range: string;
  loinc?: string;
  severity: 'abnormal' | 'panic';
  clinical_flag: 'HIGH' | 'LOW' | 'CRITICAL';
  doctor_note?: string;
}

interface DigitalPrescriptionEditorProps {
  initialMedicationsText?: string;
  extractedMedications?: any[];
  safetyAlerts?: any[];
  patientAllergiesText?: string;
  extractedLabs?: any[];
  onUpdateMedications: (medsList: PrescribedMedicine[], formattedText: string) => void;
  onUpdateLabs?: (labsList: OutOfRangeLabItem[]) => void;
  onOpenDocCrossCheck?: () => void;
}

export function DigitalPrescriptionEditor({
  initialMedicationsText = '',
  extractedMedications = [],
  safetyAlerts: _safetyAlerts = [],
  patientAllergiesText = '',
  extractedLabs = [],
  onUpdateMedications,
  onUpdateLabs,
  onOpenDocCrossCheck
}: DigitalPrescriptionEditorProps) {
  // Parse medications from text or extracted array
  const [medications, setMedications] = useState<PrescribedMedicine[]>([]);
  const [editingMedId, setEditingMedId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<PrescribedMedicine>>({});
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [newMedForm, setNewMedForm] = useState<Partial<PrescribedMedicine>>({
    name: '',
    dosage: '500 mg',
    frequency: '1-0-1',
    timing: 'After Meals (PC)',
    duration: '5 days',
    instructions: ''
  });

  // Out of range lab items
  const [outOfRangeLabs, setOutOfRangeLabs] = useState<OutOfRangeLabItem[]>([]);
  const [editingLabId, setEditingLabId] = useState<string | null>(null);
  const [labNoteInput, setLabNoteInput] = useState<string>('');

  // Check for allergy conflicts (e.g. penicillin in prescription vs patient penicillin allergy)
  const allergyLower = patientAllergiesText.toLowerCase();
  const hasPenicillinAllergy = /penicillin|amoxicillin|ampicillin|augmentin|पेनिसिलिन|অ্যালার্জি/i.test(allergyLower);
  const hasSulfaAllergy = /sulfa|cotrimoxazole|सल्फा/i.test(allergyLower);
  const hasNsaidAllergy = /nsaid|ibuprofen|aspirin|diclofenac|ब्रूफेन/i.test(allergyLower);

  const checkMedAllergyConflict = (medName: string): string | null => {
    const m = medName.toLowerCase();
    if (hasPenicillinAllergy && /(penicillin|amox|ampicil|augmentin|clav)/i.test(m)) {
      return 'CRITICAL ALLERGY CONFLICT: Patient is allergic to Penicillins!';
    }
    if (hasSulfaAllergy && /(sulfa|cotrimox|bactrim)/i.test(m)) {
      return 'CRITICAL ALLERGY CONFLICT: Patient is allergic to Sulfa drugs!';
    }
    if (hasNsaidAllergy && /(aspirin|ibuprofen|diclofenac|naproxen|aceclo)/i.test(m)) {
      return 'WARNING: Patient reported NSAID hypersensitivity!';
    }
    return null;
  };

  // Initialize medications
  useEffect(() => {
    const list: PrescribedMedicine[] = [];

    if (Array.isArray(extractedMedications) && extractedMedications.length > 0) {
      extractedMedications.forEach((m: any, idx: number) => {
        const name = m.name || m.drug_name || (typeof m === 'string' ? m : `Medication ${idx + 1}`);
        list.push({
          id: `med-${idx}-${Date.now()}`,
          name,
          dosage: m.dosage || m.strength || '500 mg',
          frequency: m.frequency || m.sig || '1-0-1',
          timing: m.timing || 'After Meals (PC)',
          duration: m.duration || '5 days',
          instructions: m.instructions || '',
          allergy_warning: checkMedAllergyConflict(name)
        });
      });
    } else if (initialMedicationsText && initialMedicationsText.trim().length > 0) {
      // Parse comma or newline separated strings
      const parts = initialMedicationsText.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
      parts.forEach((p, idx) => {
        const name = p;
        let dosage = '500 mg';
        let frequency = '1-0-1';
        let timing = 'After Meals (PC)';

        // Match dosage e.g. 500mg, 40mg, 10ml
        const doseMatch = p.match(/\b\d+(\.\d+)?\s*(mg|mcg|g|ml|iu)\b/i);
        if (doseMatch) dosage = doseMatch[0];

        // Match frequency e.g. 1-0-1, 1-0-0, 0-0-1, OD, BD, TDS, SOS
        const freqMatch = p.match(/\b([0-9]-[0-9]-[0-9]|1\+0\+1|0\+0\+1|1\+1\+1|OD|BD|TDS|QID|SOS|HS)\b/i);
        if (freqMatch) frequency = freqMatch[0].toUpperCase();

        if (/before meal|खाली पेट|AC/i.test(p)) timing = 'Before Meals (AC)';
        else if (/bedtime|रात|HS/i.test(p)) timing = 'At Bedtime (HS)';

        list.push({
          id: `med-${idx}-${Date.now()}`,
          name: name.replace(dosage, '').replace(frequency, '').replace(/Tab\.?|Cap\.?|Syp\.?/i, '').trim() || name,
          dosage,
          frequency,
          timing,
          duration: '5 days',
          allergy_warning: checkMedAllergyConflict(name)
        });
      });
    }

    setMedications(list);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMedicationsText, extractedMedications, patientAllergiesText]);

  // Initialize out-of-range labs strictly from actual extracted reports
  useEffect(() => {
    const list: OutOfRangeLabItem[] = [];

    if (Array.isArray(extractedLabs) && extractedLabs.length > 0) {
      extractedLabs.forEach((lab: any, idx: number) => {
        const isPanic = Boolean(
          lab.is_panic || 
          lab.severity === 'panic' || 
          lab.severity_status === 'panic' ||
          String(lab.status || '').toUpperCase() === 'PANIC' ||
          String(lab.status || '').toUpperCase() === 'CRITICAL'
        );
        const statusUpper = String(lab.status || lab.clinical_flag || '').toUpperCase();
        const isHigh = statusUpper === 'HIGH' || statusUpper.includes('HIGH') || statusUpper === 'ELEVATED';
        const isLow = statusUpper === 'LOW' || statusUpper.includes('LOW') || statusUpper === 'REDUCED';
        const isAbnormal = Boolean(
          isPanic || 
          isHigh || 
          isLow || 
          lab.is_out_of_range ||
          lab.severity === 'abnormal' || 
          lab.severity_status === 'abnormal' ||
          (statusUpper && statusUpper !== 'NORMAL' && statusUpper !== 'WITHIN_RANGE')
        );

        if (isAbnormal) {
          list.push({
            id: lab.id || `lab-${idx}-${Date.now()}`,
            test_name: lab.name || lab.test_name || 'Investigation',
            value: String(lab.value ?? lab.raw_value ?? lab.parsed_value ?? ''),
            unit: lab.unit || '',
            reference_range: lab.reference_range_display || lab.reference_range || 'Normal range exceeded',
            loinc: lab.loinc || lab.loinc_code,
            severity: isPanic ? 'panic' : 'abnormal',
            clinical_flag: isPanic ? 'CRITICAL' : (isLow ? 'LOW' : 'HIGH'),
            doctor_note: lab.alert_message || lab.doctor_note || lab.note || ''
          });
        }
      });
    }

    setOutOfRangeLabs(list);
  }, [extractedLabs]);

  // Format medications for clinical summary sync
  const emitUpdatedMedications = (updated: PrescribedMedicine[]) => {
    const formatted = updated
      .map(m => `${m.name} ${m.dosage} (${m.frequency}, ${m.timing}) for ${m.duration}`)
      .join('; ');
    onUpdateMedications(updated, formatted);
  };

  // Add new medicine
  const handleAddNewMedicine = () => {
    if (!newMedForm.name || !newMedForm.name.trim()) return;
    const medName = newMedForm.name.trim();
    const newMed: PrescribedMedicine = {
      id: `med-${Date.now()}`,
      name: medName,
      dosage: newMedForm.dosage || '500 mg',
      frequency: newMedForm.frequency || '1-0-1',
      timing: newMedForm.timing || 'After Meals (PC)',
      duration: newMedForm.duration || '5 days',
      instructions: newMedForm.instructions || '',
      allergy_warning: checkMedAllergyConflict(medName)
    };

    const updated = [...medications, newMed];
    setMedications(updated);
    emitUpdatedMedications(updated);
    setNewMedForm({
      name: '',
      dosage: '500 mg',
      frequency: '1-0-1',
      timing: 'After Meals (PC)',
      duration: '5 days',
      instructions: ''
    });
    setIsAddingNew(false);
  };

  // Start inline editing
  const handleStartEdit = (med: PrescribedMedicine) => {
    setEditingMedId(med.id);
    setEditForm({ ...med });
  };

  // Save inline edit
  const handleSaveEdit = (medId: string) => {
    const updated = medications.map(m => {
      if (m.id === medId) {
        const medName = editForm.name || m.name;
        return {
          ...m,
          ...editForm,
          name: medName,
          allergy_warning: checkMedAllergyConflict(medName)
        };
      }
      return m;
    });

    setMedications(updated);
    emitUpdatedMedications(updated);
    setEditingMedId(null);
    setEditForm({});
  };

  // Delete medicine
  const handleDeleteMedicine = (medId: string) => {
    const updated = medications.filter(m => m.id !== medId);
    setMedications(updated);
    emitUpdatedMedications(updated);
  };

  // Save lab doctor note
  const handleSaveLabNote = (labId: string) => {
    const updated = outOfRangeLabs.map(l => {
      if (l.id === labId) {
        return { ...l, doctor_note: labNoteInput };
      }
      return l;
    });
    setOutOfRangeLabs(updated);
    if (onUpdateLabs) onUpdateLabs(updated);
    setEditingLabId(null);
    setLabNoteInput('');
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP HIGHLIGHTED SECTION: OUT-OF-RANGE CLINICAL LABS & RED FLAGS (Rendered strictly when actual out-of-range labs exist) */}
      {outOfRangeLabs.length > 0 && (
        <div className="bg-gradient-to-br from-rose-950/20 via-slate-900 to-amber-950/20 border-2 border-rose-500/40 rounded-3xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-rose-500/20 mb-4">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
                <ShieldAlert className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <span>Critical Out-of-Range Clinical Details & Lab Findings</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white uppercase tracking-wider">
                    {outOfRangeLabs.length} Abnormal Flag{outOfRangeLabs.length === 1 ? '' : 's'}
                  </span>
                </h3>
                <p className="text-xs text-slate-300">
                  Extracted from patient uploaded lab reports & digital investigations. High-priority physician review.
                </p>
              </div>
            </div>

            {onOpenDocCrossCheck && (
              <button
                type="button"
                onClick={onOpenDocCrossCheck}
                className="px-3.5 py-1.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <span>📄 Cross-Check Scanned Report</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Labs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {outOfRangeLabs.map((lab) => {
              const isCritical = lab.severity === 'panic';
              const isEditing = editingLabId === lab.id;

              return (
                <div
                  key={lab.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isCritical 
                      ? 'bg-rose-950/50 border-rose-500/60 shadow-md ring-1 ring-rose-500/30' 
                      : 'bg-amber-950/40 border-amber-500/50 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-xs font-bold text-white block">{lab.test_name}</span>
                      {lab.loinc && (
                        <span className="text-[10px] font-mono text-slate-400">LOINC: {lab.loinc}</span>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                      isCritical ? 'bg-rose-500 text-white animate-pulse' : 'bg-amber-400 text-slate-950 font-extrabold'
                    }`}>
                      {lab.clinical_flag === 'HIGH' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {lab.clinical_flag}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 mb-1.5">
                    <span className="text-xl font-black text-white font-mono">{lab.value}</span>
                    <span className="text-xs text-slate-300 font-semibold">{lab.unit}</span>
                    <span className="text-[11px] text-slate-400 ml-auto">
                      Normal: <strong className="text-slate-200">{lab.reference_range}</strong>
                    </span>
                  </div>

                  {/* Doctor Note / Clinical Annotation */}
                  <div className="mt-2.5 pt-2 border-t border-slate-700/50 flex items-center justify-between text-[11px]">
                    {isEditing ? (
                      <div className="flex items-center gap-1.5 w-full">
                        <input
                          type="text"
                          value={labNoteInput}
                          onChange={(e) => setLabNoteInput(e.target.value)}
                          placeholder="Add physician interpretation / action plan..."
                          className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-teal-400"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveLabNote(lab.id)}
                          className="p-1 rounded-lg bg-teal-500 text-white hover:bg-teal-600"
                          title="Save note"
                        >
                          <Save className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingLabId(null)}
                          className="p-1 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-slate-300 italic flex-1 pr-2 truncate">
                          {lab.doctor_note || 'No physician note added yet.'}
                        </span>
                        <button
                          onClick={() => {
                            setEditingLabId(lab.id);
                            setLabNoteInput(lab.doctor_note || '');
                          }}
                          className="text-teal-300 hover:text-teal-200 text-[10px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>{lab.doctor_note ? 'Edit Note' : '+ Note'}</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. DIGITALIZED & EDITABLE PRESCRIPTION TABLE */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-teal-50 text-[#004643] border border-teal-200">
              <Pill className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <span>Digitalized Patient Prescription & Pharmacotherapy</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-[#004643]">
                  {medications.length} Active Medicine{medications.length === 1 ? '' : 's'}
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Extracted via OCR/Vision with vernacular Sig translation. Fully editable by attending clinician.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenDocCrossCheck && (
              <button
                type="button"
                onClick={onOpenDocCrossCheck}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span>🔍 Cross-Check Paper Rx</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsAddingNew(true)}
              className="px-3.5 py-1.5 rounded-xl bg-[#004643] hover:bg-teal-900 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Medicine</span>
            </button>
          </div>
        </div>

        {/* Allergy Warning Banner if Patient has Known Allergies */}
        {patientAllergiesText && patientAllergiesText.trim().length > 0 && !/no known|none|healthy/i.test(patientAllergiesText) && (
          <div className="p-3 bg-rose-50 border border-rose-300 rounded-2xl text-xs text-rose-900 flex items-center gap-2 font-bold">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Documented Patient Allergies: <strong className="text-rose-700 underline">{patientAllergiesText}</strong>. Prescription entries are actively checked against these allergies.</span>
          </div>
        )}

        {/* ADD NEW MEDICINE INLINE FORM */}
        {isAddingNew && (
          <div className="p-4 bg-teal-50/60 border-2 border-teal-400 rounded-2xl space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#004643]">Add New Medication Entry</h4>
              <button onClick={() => setIsAddingNew(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 text-xs">
              <div className="md:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Medicine Name & Form</label>
                <input
                  type="text"
                  placeholder="e.g. Tab Amoxicillin / Syp Paracetamol"
                  value={newMedForm.name}
                  onChange={(e) => setNewMedForm({ ...newMedForm, name: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-slate-900 font-bold focus:outline-none focus:border-[#004643]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Dose / Strength</label>
                <input
                  type="text"
                  placeholder="500 mg"
                  value={newMedForm.dosage}
                  onChange={(e) => setNewMedForm({ ...newMedForm, dosage: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-slate-900 font-semibold focus:outline-none focus:border-[#004643]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Frequency (Sig)</label>
                <select
                  value={newMedForm.frequency}
                  onChange={(e) => setNewMedForm({ ...newMedForm, frequency: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-slate-900 font-semibold focus:outline-none focus:border-[#004643]"
                >
                  <option value="1-0-1">1-0-1 (Twice Daily)</option>
                  <option value="1-0-0">1-0-0 (Morning)</option>
                  <option value="0-0-1">0-0-1 (Night)</option>
                  <option value="1-1-1">1-1-1 (Three times)</option>
                  <option value="OD">Once Daily (OD)</option>
                  <option value="BD">Twice Daily (BD)</option>
                  <option value="TDS">Three Times Daily (TDS)</option>
                  <option value="SOS">As Needed (SOS / PRN)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Timing</label>
                <select
                  value={newMedForm.timing}
                  onChange={(e) => setNewMedForm({ ...newMedForm, timing: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-slate-900 font-semibold focus:outline-none focus:border-[#004643]"
                >
                  <option value="After Meals (PC)">After Meals (PC)</option>
                  <option value="Before Meals (AC)">Before Meals (AC)</option>
                  <option value="At Bedtime (HS)">At Bedtime (HS)</option>
                  <option value="On Empty Stomach">On Empty Stomach</option>
                  <option value="With Meals">With Meals</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddNewMedicine}
                className="px-4 py-1.5 rounded-xl bg-[#004643] text-white hover:bg-teal-900 text-xs font-extrabold flex items-center gap-1 shadow-sm cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Medicine to Prescription</span>
              </button>
            </div>
          </div>
        )}

        {/* PRESCRIPTIONS TABLE */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-700">
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Medication Name</th>
                <th className="py-3 px-4">Dose / Strength</th>
                <th className="py-3 px-4">Frequency (Sig)</th>
                <th className="py-3 px-4">Meal Timing</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {medications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    <Pill className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                    <span>No medications in prescription. Click "+ Add Medicine" above to prescribe.</span>
                  </td>
                </tr>
              ) : (
                medications.map((med, idx) => {
                  const isEditing = editingMedId === med.id;
                  const hasWarning = !!med.allergy_warning;

                  return (
                    <tr 
                      key={med.id} 
                      className={`hover:bg-slate-50/80 transition-colors ${
                        hasWarning ? 'bg-rose-50/50' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                      }`}
                    >
                      <td className="py-3 px-4 font-mono text-slate-400 font-bold">{idx + 1}</td>

                      {/* Name Column */}
                      <td className="py-3 px-4">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.name || ''}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-900"
                          />
                        ) : (
                          <div>
                            <span className="font-extrabold text-slate-900 block">{med.name}</span>
                            {hasWarning && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md mt-0.5 border border-rose-300 animate-pulse">
                                <AlertTriangle className="w-3 h-3" />
                                {med.allergy_warning}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Dosage Column */}
                      <td className="py-3 px-4">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.dosage || ''}
                            onChange={(e) => setEditForm({ ...editForm, dosage: e.target.value })}
                            className="w-24 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold text-slate-900"
                          />
                        ) : (
                          <span className="font-semibold text-slate-800">{med.dosage}</span>
                        )}
                      </td>

                      {/* Frequency Column */}
                      <td className="py-3 px-4">
                        {isEditing ? (
                          <select
                            value={editForm.frequency || '1-0-1'}
                            onChange={(e) => setEditForm({ ...editForm, frequency: e.target.value })}
                            className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold text-slate-900"
                          >
                            <option value="1-0-1">1-0-1</option>
                            <option value="1-0-0">1-0-0</option>
                            <option value="0-0-1">0-0-1</option>
                            <option value="1-1-1">1-1-1</option>
                            <option value="OD">OD</option>
                            <option value="BD">BD</option>
                            <option value="TDS">TDS</option>
                            <option value="SOS">SOS</option>
                          </select>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-[#004643] font-bold text-[11px] font-mono">
                            {med.frequency}
                          </span>
                        )}
                      </td>

                      {/* Timing Column */}
                      <td className="py-3 px-4">
                        {isEditing ? (
                          <select
                            value={editForm.timing || 'After Meals (PC)'}
                            onChange={(e) => setEditForm({ ...editForm, timing: e.target.value })}
                            className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold text-slate-900"
                          >
                            <option value="After Meals (PC)">After Meals (PC)</option>
                            <option value="Before Meals (AC)">Before Meals (AC)</option>
                            <option value="At Bedtime (HS)">At Bedtime (HS)</option>
                            <option value="On Empty Stomach">On Empty Stomach</option>
                          </select>
                        ) : (
                          <span className="text-slate-600 text-xs">{med.timing}</span>
                        )}
                      </td>

                      {/* Duration Column */}
                      <td className="py-3 px-4">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.duration || ''}
                            onChange={(e) => setEditForm({ ...editForm, duration: e.target.value })}
                            className="w-20 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold text-slate-900"
                          />
                        ) : (
                          <span className="text-slate-600 text-xs">{med.duration}</span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-4 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleSaveEdit(med.id)}
                              className="p-1.5 rounded-lg bg-[#004643] text-white hover:bg-teal-900 cursor-pointer"
                              title="Save changes"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingMedId(null)}
                              className="p-1.5 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 cursor-pointer"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleStartEdit(med)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                              title="Edit medicine"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteMedicine(med.id)}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                              title="Delete from prescription"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
