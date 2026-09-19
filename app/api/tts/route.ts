import { NextResponse } from 'next/server';

const BHASHINI_INFERENCE_KEY = process.env.BHASHINI_INFERENCE_KEY || 'JuOAHXhtOtlazGM8pev5RENsKyS6mURQXGla0UhtuhEzroclJNXJ556BM-R9oJkM';
const BHASHINI_ENDPOINT = 'https://dhruva-api.bhashini.gov.in/services/inference/pipeline';

// Mapping for 22 Indian Scheduled Languages + English to Bhashini Indic-TTS Model Service IDs
// Dravidian Models: ta, te, kn, ml
// Indo-Aryan Models: hi, bn, mr, gu, pa, or, as, ur, ne, sa, mai, doi, kok, ks, sd, brx, sat, mni
// English / Misc: en
const BHASHINI_SERVICE_MAP: Record<string, { serviceId: string; sourceLang: string }> = {
  // 1. Hindi
  hi: { serviceId: 'ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4', sourceLang: 'hi' },
  // 2. English
  en: { serviceId: 'ai4bharat/indic-tts-coqui-misc-gpu--t4', sourceLang: 'en' },
  // 3. Tamil
  ta: { serviceId: 'ai4bharat/indic-tts-coqui-dravidian-gpu--t4', sourceLang: 'ta' },
  // 4. Telugu
  te: { serviceId: 'ai4bharat/indic-tts-coqui-dravidian-gpu--t4', sourceLang: 'te' },
  // 5. Kannada
  kn: { serviceId: 'ai4bharat/indic-tts-coqui-dravidian-gpu--t4', sourceLang: 'kn' },
  // 6. Malayalam
  ml: { serviceId: 'ai4bharat/indic-tts-coqui-dravidian-gpu--t4', sourceLang: 'ml' },
  // 7. Marathi
  mr: { serviceId: 'ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4', sourceLang: 'mr' },
  // 8. Bengali
  bn: { serviceId: 'ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4', sourceLang: 'bn' },
  // 9. Gujarati
  gu: { serviceId: 'ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4', sourceLang: 'gu' },
  // 10. Punjabi
  pa: { serviceId: 'ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4', sourceLang: 'pa' },
  // 11. Odia
  or: { serviceId: 'ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4', sourceLang: 'or' },
  // 12. Assamese
  as: { serviceId: 'ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4', sourceLang: 'as' },
  // 13. Urdu
  ur: { serviceId: 'ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4', sourceLang: 'ur' },
  // 14. Nepali
  ne: { serviceId: 'ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4', sourceLang: 'ne' },
  // 15. Sanskrit
  sa: { serviceId: 'ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4', sourceLang: 'sa' },
  // 16. Maithili
  mai: { serviceId: 'ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4', sourceLang: 'mai' },
  // 17. Dogri
  doi: { serviceId: 'ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4', sourceLang: 'doi' },
  // 18. Konkani
  kok: { serviceId: 'ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4', sourceLang: 'kok' },
  // 19. Kashmiri
  ks: { serviceId: 'ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4', sourceLang: 'ks' },
  // 20. Sindhi
  sd: { serviceId: 'ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4', sourceLang: 'sd' },
  // 21. Bodo
  brx: { serviceId: 'ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4', sourceLang: 'brx' },
  // 22. Santali
  sat: { serviceId: 'ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4', sourceLang: 'sat' },
  // 23. Manipuri
  mni: { serviceId: 'ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4', sourceLang: 'mni' }
};

// In-Memory Audio Cache to speed up recurring clinical prompts and reduce Bhashini API usage
const audioCache = new Map<string, { buffer: Buffer; mime: string }>();

// Upstream Bhashini Endpoint Health Tracker & Circuit Breaker
interface CircuitStatus {
  failedCount: number;
  lastFailedAt: number;
}
const bhashiniHealthMap = new Map<string, CircuitStatus>();
const CIRCUIT_COOLDOWN_MS = 5 * 60 * 1000; // 5-minute cooldown for degraded endpoints

// Languages with known upstream worker stalls on Bhashini's cluster (returning 504 Gateway Timeout)
const KNOWN_DEGRADED_BHASHINI_LANGS = new Set(['mr', 'gu']);

function shouldAttemptBhashini(lang: string): boolean {
  const status = bhashiniHealthMap.get(lang);
  if (KNOWN_DEGRADED_BHASHINI_LANGS.has(lang)) {
    // If degraded, only attempt once every 10 minutes to test if Bhashini recovered
    if (!status || (Date.now() - status.lastFailedAt) > 10 * 60 * 1000) {
      return true;
    }
    return false;
  }
  if (!status) return true;
  if (status.failedCount >= 2 && (Date.now() - status.lastFailedAt) < CIRCUIT_COOLDOWN_MS) {
    return false;
  }
  return true;
}

function recordBhashiniResult(lang: string, success: boolean) {
  if (success) {
    bhashiniHealthMap.delete(lang);
  } else {
    const prev = bhashiniHealthMap.get(lang) || { failedCount: 0, lastFailedAt: 0 };
    bhashiniHealthMap.set(lang, {
      failedCount: prev.failedCount + 1,
      lastFailedAt: Date.now()
    });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawText = searchParams.get('text');
    const rawLang = (searchParams.get('lang') || 'hi').toLowerCase().trim();

    if (!rawText) {
      return NextResponse.json({ error: 'Text parameter is required' }, { status: 400 });
    }

    // 1. Text Sanitization & Locale Alignment
    let cleanText = rawText.trim();

    // Check if the text is a bilingual option pair (e.g. "हाँ / Yes", "पुरुष / Male", "नहीं / No")
    const isBilingualSlash = cleanText.includes('/') && /[\u0900-\u0D7F]/.test(cleanText) && /[a-zA-Z]/.test(cleanText);
    if (isBilingualSlash) {
      const parts = cleanText.split('/');
      if (rawLang === 'en') {
        cleanText = parts.find(p => /[a-zA-Z]/.test(p))?.trim() || parts[parts.length - 1].trim();
      } else {
        cleanText = parts.find(p => !/[a-zA-Z]/.test(p))?.trim() || parts[0].trim();
      }
    }

    // Replace slashes (and slash-comma combos like '/', '/,', ',/') with natural spoken conjunctions (" or " or " या ")
    if (rawLang === 'en') {
      cleanText = cleanText
        .replace(/\s*\/+,\s*|\s*,\/+\s*|\s*\/+\s*/g, ' or ')
        .replace(/\s*,\s*,+/g, ', ');
    } else {
      cleanText = cleanText
        .replace(/\s*\/+,\s*|\s*,\/+\s*|\s*\/+\s*/g, ' या ')
        .replace(/\s*,\s*,+/g, ', ');
    }

    // Strip emojis, markdown, and unwanted symbols
    cleanText = cleanText.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
    cleanText = cleanText.replace(/[*_#`~]/g, '').trim();

    // Remove all exclamation marks and replace with a gentle pause '.'
    // Crucial: TTS models (Google TTS & Bhashini) interpret '!' as mathematical "factorial" after names/words
    cleanText = cleanText.replace(/!+/g, '. ');

    // Convert ALL-CAPS words to Title Case (e.g., "RAHUL SHARMA" -> "Rahul Sharma")
    // Prevents TTS from spelling capitalized names letter-by-letter as acronyms
    cleanText = cleanText.replace(/\b([A-Z]{2,})\b/g, (match) => {
      const medicalAcronyms = ['ECG', 'BP', 'OPD', 'ABHA', 'ABDM', 'USG', 'CBC', 'ICD', 'SOS', 'OD', 'BD', 'TDS'];
      if (medicalAcronyms.includes(match)) return match;
      return match.charAt(0).toUpperCase() + match.slice(1).toLowerCase();
    });

    if (rawLang === 'en') {
      cleanText = cleanText.replace(/[\u0900-\u0D7F]/g, ' ').replace(/\s+/g, ' ').trim();
    }

    // Remove any trailing slashes, commas, or semicolons that cause pauses
    cleanText = cleanText.replace(/[\/,;:]\s*$/g, '').replace(/\s+/g, ' ').trim();

    if (!cleanText) {
      cleanText = rawText.substring(0, 150);
    }

    // Instant Cache Retrieval (0ms response time for recurring prompts)
    const cacheKey = `${rawLang}:${cleanText.substring(0, 250)}`;
    if (audioCache.has(cacheKey)) {
      const cached = audioCache.get(cacheKey)!;
      return new Response(new Uint8Array(cached.buffer), {
        status: 200,
        headers: {
          'Content-Type': cached.mime,
          'Content-Length': String(cached.buffer.length),
          'X-TTS-Engine': 'AudioCache-Instant-0ms',
          'Cache-Control': 'public, max-age=86400'
        }
      });
    }

    // 2. Determine Bhashini Service & Target Language
    const bhashiniConfig = BHASHINI_SERVICE_MAP[rawLang] || BHASHINI_SERVICE_MAP.hi;
    const targetSourceLang = bhashiniConfig.sourceLang;
    const targetServiceId = bhashiniConfig.serviceId;

    // Truncate to reasonable sentence chunk for low-latency synthesis
    const inputChunk = cleanText.substring(0, 300);

    // 3. Primary: Attempt Bhashini Indic-TTS Inference Pipeline (if endpoint is healthy)
    const canTryBhashini = shouldAttemptBhashini(rawLang);
    // Healthy Indic languages (like Bengali, Hindi, Tamil) require ~3-4s under load; use 6500ms so they never abort prematurely
    // Stalled upstream workers (like Marathi/mr) use 1200ms to immediately fall back to Google TTS without freezing the Kiosk
    const bhashiniTimeoutMs = KNOWN_DEGRADED_BHASHINI_LANGS.has(rawLang) ? 1200 : 6500;

    if (canTryBhashini) {
      try {
        const bhashiniPayload = {
          pipelineTasks: [
            {
              taskType: 'tts',
              config: {
                language: {
                  sourceLanguage: targetSourceLang
                },
                serviceId: targetServiceId,
                gender: 'female'
              }
            }
          ],
          inputData: {
            input: [
              {
                source: inputChunk
              }
            ]
          }
        };

        const bhashiniRes = await fetch(BHASHINI_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': BHASHINI_INFERENCE_KEY
          },
          body: JSON.stringify(bhashiniPayload),
          signal: AbortSignal.timeout(bhashiniTimeoutMs)
        });

        if (bhashiniRes.ok) {
          const bhashiniData = await bhashiniRes.json();
          const base64Audio = bhashiniData?.pipelineResponse?.[0]?.audio?.[0]?.audioContent;

          if (base64Audio) {
            recordBhashiniResult(rawLang, true);
            const audioBuffer = Buffer.from(base64Audio, 'base64');
            
            if (audioCache.size > 250) {
              const firstKey = audioCache.keys().next().value;
              if (firstKey) audioCache.delete(firstKey);
            }
            audioCache.set(cacheKey, { buffer: audioBuffer, mime: 'audio/wav' });

            return new Response(new Uint8Array(audioBuffer), {
              status: 200,
              headers: {
                'Content-Type': 'audio/wav',
                'Content-Length': String(audioBuffer.length),
                'X-TTS-Engine': 'Bhashini-IndicTTS-22Lang',
                'X-TTS-Engine-Status': 'Bhashini-Native-Success',
                'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200'
              }
            });
          }
        } else {
          recordBhashiniResult(rawLang, false);
          console.warn(`Bhashini TTS returned status ${bhashiniRes.status} for ${rawLang}. Fast-falling back.`);
        }
      } catch (bhashiniErr: any) {
        recordBhashiniResult(rawLang, false);
        console.warn(`Bhashini TTS notice for ${rawLang} (fast circuit breaker active):`, bhashiniErr?.message || bhashiniErr);
      }
    }

    // 4. Secondary Fallback: High-Speed Google Translate TTS Stream
    const googleLangMap: Record<string, string> = {
      hi: 'hi',
      en: 'en-IN',
      bn: 'bn',
      mr: 'mr',
      te: 'te',
      ta: 'ta',
      gu: 'gu',
      kn: 'kn',
      ml: 'ml',
      pa: 'pa',
      or: 'or',
      as: 'as',
      ur: 'ur',
      ne: 'ne',
      sa: 'hi',  // Sanskrit -> Indic Devanagari fallback
      mai: 'hi', // Maithili -> Indic Devanagari fallback
      doi: 'hi', // Dogri -> Indic Devanagari fallback
      kok: 'mr', // Konkani -> Marathi fallback
      ks: 'ur',  // Kashmiri -> Urdu phonetic fallback
      sd: 'sd',  // Sindhi
      brx: 'hi', // Bodo -> Devanagari fallback
      sat: 'hi', // Santali -> Devanagari fallback
      mni: 'bn'  // Manipuri -> Bengali script fallback
    };
    const fallbackLang = googleLangMap[rawLang] || 'hi';
    const fallbackUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${fallbackLang}&q=${encodeURIComponent(cleanText.substring(0, 180))}`;

    const fallbackRes = await fetch(fallbackUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://translate.google.com/'
      },
      signal: AbortSignal.timeout(4000)
    });

    if (fallbackRes.ok) {
      const audioBuffer = Buffer.from(await fallbackRes.arrayBuffer());

      // Cache fallback audio buffer so recurring regional prompts return in 0ms!
      if (audioCache.size > 250) {
        const firstKey = audioCache.keys().next().value;
        if (firstKey) audioCache.delete(firstKey);
      }
      audioCache.set(cacheKey, { buffer: audioBuffer, mime: 'audio/mpeg' });

      return new Response(new Uint8Array(audioBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': String(audioBuffer.length),
          'X-TTS-Engine': 'Fast-Indic-Fallback-Cached',
          'Cache-Control': 'public, max-age=86400'
        }
      });
    }

    return NextResponse.json({ error: 'TTS audio synthesis unavailable' }, { status: 502 });
  } catch (err: any) {
    console.error('TTS API fatal error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
