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
    // NOTE: Keep pure commas (',') intact so TTS has natural, brief breath pauses and NEVER says "or" for commas!
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

    if (rawLang === 'en') {
      // Strip any residual non-Latin characters for crystal-clear English voice
      cleanText = cleanText.replace(/[\u0900-\u0D7F]/g, ' ').replace(/\s+/g, ' ').trim();
    }

    // Remove any trailing slashes, commas, or semicolons that cause pauses
    cleanText = cleanText.replace(/[\/,;:]\s*$/g, '').replace(/\s+/g, ' ').trim();

    if (!cleanText) {
      cleanText = rawText.substring(0, 150);
    }

    const cacheKey = `${rawLang}:${cleanText.substring(0, 250)}`;
    if (audioCache.has(cacheKey)) {
      const cached = audioCache.get(cacheKey)!;
      return new Response(new Uint8Array(cached.buffer), {
        status: 200,
        headers: {
          'Content-Type': cached.mime,
          'Content-Length': String(cached.buffer.length),
          'X-TTS-Engine': 'Bhashini-IndicTTS-Cached',
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

    // 3. Primary: Attempt Bhashini Indic-TTS Inference Pipeline
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
        signal: AbortSignal.timeout(7000) // 7-second safeguard timeout
      });

      if (bhashiniRes.ok) {
        const bhashiniData = await bhashiniRes.json();
        const base64Audio = bhashiniData?.pipelineResponse?.[0]?.audio?.[0]?.audioContent;

        if (base64Audio) {
          const audioBuffer = Buffer.from(base64Audio, 'base64');
          
          // Cache audio in memory
          if (audioCache.size > 200) {
            // Prune oldest entry if cache grows too large
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
              'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200'
            }
          });
        }
      } else {
        console.warn(`Bhashini TTS returned status ${bhashiniRes.status}. Falling back to secondary audio stream.`);
      }
    } catch (bhashiniErr: any) {
      console.warn('Bhashini TTS notice (using fallback):', bhashiniErr?.message || bhashiniErr);
    }

    // 4. Secondary Fallback: Google Translate TTS Stream
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
      signal: AbortSignal.timeout(5000)
    });

    if (fallbackRes.ok) {
      const audioBuffer = Buffer.from(await fallbackRes.arrayBuffer());
      return new Response(new Uint8Array(audioBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': String(audioBuffer.length),
          'X-TTS-Engine': 'Fallback-Stream',
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
