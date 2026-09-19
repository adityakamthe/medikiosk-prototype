import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { 
  detectRedFlagSuspicion, 
  getEmergencyConfirmationQuestion, 
  evaluateConfirmationAnswer 
} from '@/lib/redflag';
import { generateConversationalFollowUp, generateBilingualSummary } from '@/lib/mistral';
import { analyzeVoiceInputForDiagnosis } from '@/lib/diagnosis';
import { allocateDoctorAndRoom } from '@/lib/doctors';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const sessionId = resolvedParams.id;
    const body = await req.json();
    const { 
      question_id = 'q_chief_complaint', 
      source_mode = 'touch', 
      transcript_text, 
      selected_option, 
      section = 'chief_complaint',
      field_name = 'chief_complaint',
      question_text = '',
      language: reqLanguage,
      ayush_assessment_type
    } = body;

    const answerValue = transcript_text || selected_option || body.answer || 'Unknown';

    // 1. Fetch current session, existing raw_answers, and all structured_history IN A SINGLE PARALLEL ROUND-TRIP
    const [sessionRes, existingRawRes, allHistoryRes] = await Promise.all([
      query(`SELECT * FROM sessions WHERE id = $1`, [sessionId]),
      query(
        `SELECT id, question_id, transcript_text, questions_list, answers_list 
         FROM raw_answers 
         WHERE session_id = $1 
         ORDER BY created_at ASC LIMIT 1`,
        [sessionId]
      ),
      query(
        `SELECT id, section, field_name, value, items, questions, answers 
         FROM structured_history 
         WHERE session_id = $1 
         ORDER BY id ASC`,
        [sessionId]
      )
    ]);

    const session = sessionRes.rows[0];
    
    // Strictly honor the session's chosen language throughout the interview
    const activeLanguage = (reqLanguage || session?.language || 'hi').toLowerCase().trim();
    const language = activeLanguage;

    // 2. Prepare in-memory history items for instant clinical inference
    const historyItems: Array<{ question: string; answer: string; section?: string; field_name?: string }> = [];
    for (const row of allHistoryRes.rows) {
      if (row.items && Array.isArray(row.items) && row.items.length > 0) {
        for (const item of row.items) {
          historyItems.push({
            question: item.question_text || item.question_id || item.field_name || 'Question',
            answer: item.value || '',
            section: row.section,
            field_name: item.field_name
          });
        }
      } else {
        historyItems.push({
          question: row.field_name || 'Question',
          answer: row.value || '',
          section: row.section,
          field_name: row.field_name
        });
      }
    }

    // Append current turn to history in memory so Mistral sees it immediately
    historyItems.push({
      question: question_text || question_id,
      answer: answerValue,
      section,
      field_name
    });

    const clinicalHistoryItems = historyItems.filter(h => h.section !== 'demographics' && h.section !== 'ayush_profile');
    const turnCount = clinicalHistoryItems.length;

    // 3. Clinical Voice Diagnosis & Symptom Extraction (In-memory, instant)
    const voiceDiagnosisAnalysis = analyzeVoiceInputForDiagnosis(
      answerValue,
      historyItems,
      session?.clinical_mode || 'allopathy'
    );

    const entitiesToInsert: Array<[string, string, string, number, boolean]> = [];
    for (const diag of voiceDiagnosisAnalysis.provisional_diagnoses) {
      entitiesToInsert.push([
        sessionId,
        'diagnosis',
        JSON.stringify({
          name: diag.name,
          acuity: diag.acuity,
          rationale: diag.rationale,
          system: diag.system,
          source: source_mode === 'voice' ? 'voice_intake' : 'touch_intake',
          provisional: true
        }),
        diag.confidence,
        false
      ]);
    }

    for (const sym of voiceDiagnosisAnalysis.detected_symptoms) {
      entitiesToInsert.push([
        sessionId,
        'symptom',
        JSON.stringify({
          symptom: sym.name,
          severity: sym.severity,
          anatomical_site: sym.anatomical_site,
          source: source_mode === 'voice' ? 'voice_intake' : 'touch_intake'
        }),
        0.90,
        false
      ]);
    }

    // 4. Background / Concurrent Database Writes Task
    const existingSectionRow = allHistoryRes.rows.find(r => r.section === section);
    const answerItem = {
      question_id,
      question_text: question_text || question_id,
      answer: answerValue,
      source_mode,
      confidence: 0.95,
      answered_at: new Date().toISOString()
    };
    const historyItem = {
      field_name,
      question_id,
      question_text: question_text || question_id,
      value: answerValue,
      confidence: 0.95,
      recorded_at: new Date().toISOString()
    };

    const dbWritesPromise = (async () => {
      try {
        const writeOps: Promise<any>[] = [];

        // A. Raw Answers write
        if (existingRawRes.rows.length > 0) {
          const row = existingRawRes.rows[0];
          const updatedQId = `${row.question_id || ''} | ${question_id}`;
          const updatedText = `${row.transcript_text || ''}\n[${question_id}]: ${answerValue}`;
          writeOps.push(query(
            `UPDATE raw_answers 
             SET question_id = $1,
                 transcript_text = $2,
                 source_mode = $3,
                 questions_list = COALESCE(questions_list, '[]'::jsonb) || $4::jsonb,
                 answers_list = COALESCE(answers_list, '[]'::jsonb) || $5::jsonb
             WHERE id = $6`,
            [
              updatedQId,
              updatedText,
              source_mode,
              JSON.stringify([question_text || question_id]),
              JSON.stringify([answerItem]),
              row.id
            ]
          ));
        } else {
          writeOps.push(query(
            `INSERT INTO raw_answers (session_id, question_id, source_mode, transcript_text, confidence, questions_list, answers_list)
             VALUES ($1, $2, $3, $4, 0.95, $5::jsonb, $6::jsonb)`,
            [
              sessionId,
              question_id,
              source_mode,
              answerValue,
              JSON.stringify([question_text || question_id]),
              JSON.stringify([answerItem])
            ]
          ));
        }

        // B. Structured History write
        if (existingSectionRow) {
          const updatedFieldName = existingSectionRow.field_name?.includes(field_name)
            ? existingSectionRow.field_name
            : `${existingSectionRow.field_name || ''}, ${field_name}`;
          const updatedValue = `${existingSectionRow.value || ''}; ${field_name}: ${answerValue}`;

          writeOps.push(query(
            `UPDATE structured_history 
             SET field_name = $1,
                 value = $2,
                 items = COALESCE(items, '[]'::jsonb) || $3::jsonb,
                 questions = COALESCE(questions, '[]'::jsonb) || $4::jsonb,
                 answers = COALESCE(answers, '[]'::jsonb) || $5::jsonb
             WHERE id = $6`,
            [
              updatedFieldName,
              updatedValue,
              JSON.stringify([historyItem]),
              JSON.stringify([question_text || question_id]),
              JSON.stringify([answerValue]),
              existingSectionRow.id
            ]
          ));
        } else {
          writeOps.push(query(
            `INSERT INTO structured_history (session_id, section, field_name, value, confidence, items, questions, answers)
             VALUES ($1, $2, $3, $4, 0.95, $5::jsonb, $6::jsonb, $7::jsonb)`,
            [
              sessionId,
              section,
              field_name,
              answerValue,
              JSON.stringify([historyItem]),
              JSON.stringify([question_text || question_id]),
              JSON.stringify([answerValue])
            ]
          ));
        }

        // C. Batch insert extracted entities
        if (entitiesToInsert.length > 0) {
          const valueClauses = entitiesToInsert.map((_, i) => {
            const offset = i * 5;
            return `($${offset + 1}, $${offset + 2}, $${offset + 3}::jsonb, $${offset + 4}, $${offset + 5})`;
          }).join(', ');

          writeOps.push(query(
            `INSERT INTO extracted_entities (session_id, entity_type, fields, confidence, needs_verification)
             VALUES ${valueClauses}`,
            entitiesToInsert.flat()
          ).catch(e => console.warn('Entities insert notice:', e)));
        }

        // D. Session language sync
        if (session && session.language !== activeLanguage) {
          writeOps.push(query(`UPDATE sessions SET language = $1 WHERE id = $2`, [activeLanguage, sessionId]).catch(() => {}));
        }

        await Promise.all(writeOps);
      } catch (writeErr) {
        console.warn('Concurrent DB write notice:', writeErr);
      }
    })();

    // 5. Track which emergency categories have already been evaluated and cleared
    const clearedCategories = new Set(
      allHistoryRes.rows
        .filter(h => h.section === 'emergency_confirmation' && (h.field_name?.includes('_cleared') || h.value?.toLowerCase().includes('clear')))
        .map(h => (h.field_name || '').replace('_emergency_cleared', '').replace('_cleared', '').trim())
    );

    // 6. Strict Multi-Turn Emergency Verification Protocol:
    // CRITICAL REQUIREMENT: On a single-question basis, emergency triage MUST NEVER be activated!
    // A single reported symptom (even severe pain or chest discomfort) must NOT halt the intake.
    // More questions MUST be asked following the SOCRATES hierarchy to verify whether an acute emergency actually exists.
    const MINIMUM_TURNS_FOR_EMERGENCY_TRIAGE = 3;
    const currentAnswerText = `${field_name} ${answerValue}`;

    // 7. Handle Emergency Confirmation Turn (Only evaluated after sufficient multi-turn clinical context)
    const isAnsweringConfirmation = 
      section === 'emergency_confirmation' || 
      question_id === 'q_emergency_confirmation' || 
      (field_name && field_name.startsWith('emergency_confirmation'));

    if (isAnsweringConfirmation) {
      const category = (field_name && field_name.replace('emergency_confirmation_', '')) || 'cardiac';
      const evalResult = evaluateConfirmationAnswer(answerValue, category);

      // ONLY allow emergency triage to trigger if at least MINIMUM_TURNS_FOR_EMERGENCY_TRIAGE (3+) questions were answered!
      if (evalResult.isConfirmed && evalResult.trigger && turnCount >= MINIMUM_TURNS_FOR_EMERGENCY_TRIAGE) {
        await dbWritesPromise;

        const rfRes = await query(
          `INSERT INTO red_flag_events (session_id, rule_id, session_state_at_trigger)
           VALUES ($1, $2, $3)
           RETURNING *`,
          [sessionId, evalResult.trigger.rule_id, JSON.stringify({ question_id, answerValue, section, field_name, category, confirmed: true, turnCount })]
        );

        await query(`UPDATE sessions SET status = 'emergency_triaged' WHERE id = $1`, [sessionId]).catch(() => {});

        return NextResponse.json({
          red_flag: true,
          trigger: evalResult.trigger,
          event_id: rfRes.rows[0].id,
          voice_diagnosis_analysis: voiceDiagnosisAnalysis,
          allocated_doctor: {
            id: 'dr_nair',
            name: 'Dr. Priya Nair',
            specialty: 'Emergency Medicine & Critical Care',
            room_number: 'Room ER-1',
            room_display: 'Emergency Resuscitation Bay (Room ER-1)',
            floor: 'Ground Floor, Immediate Emergency Wing'
          }
        });
      } else {
        clearedCategories.add(category);
      }
    } else if (turnCount >= MINIMUM_TURNS_FOR_EMERGENCY_TRIAGE) {
      // Only offer a targeted emergency confirmation question if multiple turns have already established suspicious acute red flags
      const suspectedCategory = detectRedFlagSuspicion(currentAnswerText);

      if (suspectedCategory && !clearedCategories.has(suspectedCategory)) {
        await dbWritesPromise;
        const confirmationQuestion = getEmergencyConfirmationQuestion(suspectedCategory, language);
        return NextResponse.json({
          success: true,
          language,
          answered_question_id: question_id,
          voice_diagnosis_analysis: voiceDiagnosisAnalysis,
          next_question: confirmationQuestion,
          is_completed: false,
          turn_count: turnCount,
          framework_stage: 'emergency_confirmation'
        });
      }
    }

    // 8. Generate next conversational question via Mistral AI CONCURRENTLY with DB writes!
    const effectiveAyushType = (ayush_assessment_type || session?.ayush_assessment_type || 'dashavidha') as 'dashavidha' | 'ashtavidha' | 'trividha';
    const [aiResponse] = await Promise.all([
      generateConversationalFollowUp(
        historyItems, 
        language, 
        turnCount, 
        session?.clinical_mode || 'allopathy', 
        session?.patient_name || undefined,
        effectiveAyushType
      ),
      dbWritesPromise
    ]);

    // 9. Guard AI Clinical Evaluation: Never trigger immediate red alert for unconfirmed single symptoms
    if (turnCount < MINIMUM_TURNS_FOR_EMERGENCY_TRIAGE) {
      // Strictly suppress AI emergency routing on early turns — ensure more questions are asked to verify
      aiResponse.is_severe = false;
      aiResponse.severity_level = 'mild';
      aiResponse.suggested_emergency_routing = false;
    } else if (aiResponse.is_severe || aiResponse.severity_level === 'critical' || aiResponse.severity_level === 'severe') {
      const severeText = `${aiResponse.severe_reason || ''} ${answerValue}`;
      const aiSuspectedCategory = detectRedFlagSuspicion(severeText) || 'cardiac';

      if (!clearedCategories.has(aiSuspectedCategory)) {
        // Intercept AI severe flag and ask confirming follow-on question rather than halting immediately
        const confirmationQuestion = getEmergencyConfirmationQuestion(aiSuspectedCategory, language);
        return NextResponse.json({
          success: true,
          language,
          answered_question_id: question_id,
          next_question: confirmationQuestion,
          is_completed: false,
          turn_count: turnCount,
          framework_stage: 'emergency_confirmation'
        });
      }
      // If already cleared, override AI severity
      aiResponse.is_severe = false;
      aiResponse.severity_level = 'mild';
    }

    // Strict limit of 10 to 12 questions:
    // - Never complete before turn 10 for non-severe intakes.
    // - Between turns 10 and 12, complete only if mandatory clinical domains (previous illnesses, allergies, family history) are asked.
    // - Strictly complete at turn >= 12 (hard maximum ceiling).
    const historyTextAll = historyItems.map(h => `${h.question} ${h.answer} ${h.section || ''} ${h.field_name || ''}`).join(' ').toLowerCase();
    const hasPastIllness = historyItems.some(h => (h.section || '').includes('past') || (h.field_name || '').includes('chronic') || (h.field_name || '').includes('past_illness')) ||
      /(previous medical|chronic illness|past condition|diabetes|sugar|hypertension|blood pressure|thyroid|asthma|पुरानी बीमारी|मधुमेह|रक्तदाब|दमा|आजार|ডায়াবেটিস|উচ্চ রক্তচাপ|நீரிழிவு|మధుమేహం|డయాబెటిస్|ಅಧಿಕ ರಕ್ತದೊತ್ತಡ)/i.test(historyTextAll);

    const hasAllergies = historyItems.some(h => (h.section || '').includes('allerg') || (h.field_name || '').includes('allerg')) ||
      /(known allerg|penicillin|drug reaction|food allergy|एलर्जी|ऍलर्जी|அலர்ஜி|অ্যালার্জি|అలెర్జీ|ಅಲರ್ಜಿ|ਐਲਰਜੀ)/i.test(historyTextAll);

    const hasFamilyHistory = historyItems.some(h => (h.section || '').includes('family') || (h.field_name || '').includes('family')) ||
      /(family history|parents or siblings|hereditary|परिवार|कुटुंब|குடும்ப|বংশগত|পরিবার|కుటుంబం|ವಂಶಪಾರಂಪರ್ಯ|ਪਰਿਵਾਰ)/i.test(historyTextAll);

    const mandatoryDomainsMet = hasPastIllness && hasAllergies && hasFamilyHistory;
    const isCompleted = Boolean((aiResponse.is_intake_complete && turnCount >= 10 && mandatoryDomainsMet) || turnCount >= 12);

    // 8. Auto-update live draft summary asynchronously in the background so the patient is NOT blocked!
    (async () => {
      try {
        const entitiesRes = await query(`SELECT * FROM extracted_entities WHERE session_id = $1`, [sessionId]);
        const summaryJSON = await generateBilingualSummary(
          historyItems, 
          entitiesRes.rows, 
          language, 
          session?.clinical_mode || 'allopathy'
        );
        
        const inputHash = `hash_${Date.now()}_${turnCount}`;
        await query(
          `INSERT INTO draft_summaries (session_id, model_name, model_version, prompt_version, content, input_hash)
           VALUES ($1, 'mistral-small-latest', 'v1.0', 'p1.0', $2, $3)`,
          [sessionId, JSON.stringify(summaryJSON), inputHash]
        );
      } catch (summaryErr) {
        console.warn('Live summary background generation notice:', summaryErr);
      }
    })().catch(() => {});

    if (isCompleted) {
      await query(`UPDATE sessions SET status = 'completed', ended_at = NOW() WHERE id = $1`, [sessionId]);
    }

    const isEn = language === 'en';

    // Localized Fallback Dictionaries ensuring 100% language fidelity
    const LOCALIZED_DEFAULT_OPTIONS: Record<string, string[]> = {
      en: ['Yes', 'No', 'Not sure'],
      hi: ['हाँ / Yes', 'नहीं / No', 'पता नहीं / Not sure'],
      bn: ['হ্যাঁ / Yes', 'না / No', 'নিশ্চিত নই / Not sure'],
      mr: ['होय / Yes', 'नाही / No', 'माहित नाही / Not sure'],
      ta: ['ஆம் / Yes', 'இல்லை / No', 'தெரியவில்லை / Not sure'],
      te: ['అవును / Yes', 'కాదు / No', 'తెలియదు / Not sure'],
      gu: ['હા / Yes', 'ના / No', 'ખબર નથી / Not sure'],
      kn: ['ಹೌದು / Yes', 'ಇಲ್ಲ / No', 'ಗೊತ್ತಿಲ್ಲ / Not sure'],
      ml: ['അതെ / Yes', 'അല്ല / No', 'ഉറപ്പില്ല / Not sure'],
      pa: ['ਹਾਂ / Yes', 'ਨਹੀਂ / No', 'ਪਤਾ ਨਹੀਂ / Not sure']
    };

    const LOCALIZED_DEFAULT_QUESTIONS: Record<string, string> = {
      en: 'Please describe your symptoms and when they started.',
      hi: 'कृपया अपनी समस्या और यह कब से है, विस्तार से बताएं।',
      bn: 'দয়া করে আপনার সমস্যা এবং এটি কখন শুরু হয়েছে তা জানান।',
      mr: 'कृपया तुमचा त्रास आणि तो कधीपासून आहे ते सविस्तर सांगा.',
      ta: 'தயவுசெய்து உங்கள் பிரச்சனை மற்றும் அது எப்போது தொடங்கியது என்பதை விவரிக்கவும்.',
      te: 'దయచేసి మీ సమస్య మరియు అది ఎప్పుడు ప్రారంభమైందో వివరించండి.',
      gu: 'કૃપા કરીને તમારી તકલીફ અને તે ક્યારથી શરૂ થઈ તે વિગતવાર જણાવો.',
      kn: 'ದಯವಿಟ್ಟು ನಿಮ್ಮ ಸಮಸ್ಯೆ ಮತ್ತು ಅದು ಯಾವಾಗ ಶುರುವಾಯಿತು ಎಂದು ತಿಳಿಸಿ.',
      ml: 'ദയവായി നിങ്ങളുടെ ബുദ്ധിമുട്ടുകളും അത് എപ്പോഴാണ് തുടങ്ങിയതെന്നും വ്യക്തമാക്കുക.',
      pa: 'ਕਿਰਪਾ ਕਰਕੇ ਆਪਣੀ ਤਕਲੀਫ਼ ਅਤੇ ਇਹ ਕਦੋਂ ਸ਼ੁਰੂ ਹੋਈ, ਵਿਸਥਾਰ ਨਾਲ ਦੱਸੋ।'
    };

    // Sanitize options: if English mode, ensure options are strictly English without slashes or Hindi
    let finalOptions = aiResponse.options;
    if (isEn && Array.isArray(finalOptions)) {
      finalOptions = finalOptions.map((opt: string) => {
        if (typeof opt === 'string') {
          let c = opt;
          if (c.includes('/')) {
            const parts = c.split('/');
            c = parts.find(p => /[a-zA-Z]/.test(p))?.trim() || parts[parts.length - 1].trim();
          }
          return c.replace(/[\u0900-\u097F]/g, '').trim();
        }
        return opt;
      }).filter(Boolean);
    }

    if (!finalOptions || finalOptions.length === 0) {
      finalOptions = LOCALIZED_DEFAULT_OPTIONS[language] || LOCALIZED_DEFAULT_OPTIONS.hi;
    }

    const rawLocQ = aiResponse.question_localized;
    const defaultFallbackQ = LOCALIZED_DEFAULT_QUESTIONS[language] || LOCALIZED_DEFAULT_QUESTIONS.hi;
    const cleanLocalizedQ = isEn
      ? ((aiResponse.question_en || rawLocQ || 'Please describe your symptoms and when they started.').replace(/[\u0900-\u097F]/g, '').trim())
      : (rawLocQ || aiResponse.question_en || defaultFallbackQ);

    const nextQuestion = isCompleted ? null : {
      id: `q_${aiResponse.field_name || Date.now()}`,
      question_localized: cleanLocalizedQ,
      question_en: aiResponse.question_en || cleanLocalizedQ,
      section: aiResponse.section || 'hpi',
      field_name: aiResponse.field_name || 'clinical_note',
      framework_stage: aiResponse.current_framework_stage || 'socrates',
      options: finalOptions
    };

    // Allocate appropriate specialist based on clinical mode, age, diagnosis, and symptoms
    const allocatedDoctor = allocateDoctorAndRoom({
      age: session?.age,
      clinical_mode: session?.clinical_mode || 'allopathy',
      is_red_flag: false,
      symptoms_text: answerValue,
      primary_system: voiceDiagnosisAnalysis?.primary_system,
      provisional_diagnosis: voiceDiagnosisAnalysis?.provisional_diagnoses?.[0]?.name
    });

    return NextResponse.json({
      success: true,
      language,
      answered_question_id: question_id,
      voice_diagnosis_analysis: voiceDiagnosisAnalysis,
      allocated_doctor: allocatedDoctor,
      next_question: nextQuestion,
      is_completed: isCompleted,
      turn_count: turnCount,
      framework_stage: aiResponse.current_framework_stage || 'socrates'
    });
  } catch (err: any) {
    console.error('Error in converse turn:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
