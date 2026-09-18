"""
Vernacular Voice Notice Generator for MediKiosk Module D (DPDP Act 2023).
Provides spoken audio notice hooks in Hindi, English, Marathi, Tamil, Telugu, etc.
"""

from typing import Dict, Optional
import httpx
from ..config import settings


# Pre-formulated spoken notices across key Indian languages
SPOKEN_NOTICES: Dict[str, str] = {
    "hi": (
        "नमस्ते। आपकी चिकित्सा जानकारी केवल डॉक्टर के परामर्श और पूर्व-जांच सारांश तैयार करने के लिए ली जा रही है। "
        "यह डेटा पूरी तरह गोपनीय है और डॉक्टर के सत्यापन के बाद कियोस्क से स्वतः हटा दिया जाएगा। "
        "आप किसी भी समय अपनी सहमति वापस ले सकते हैं। आगे बढ़ने के लिए कृपया स्क्रीन पर सहमति दें।"
    ),
    "en": (
        "Hello. Your health information is collected solely for clinical consultation and intake summary preparation under DPDP rules. "
        "Your data remains strictly confidential and is automatically purged from the kiosk memory once submitted to the doctor. "
        "You have the right to withdraw your consent at any time. Please tap Agree on screen to proceed."
    ),
    "mr": (
        "नमस्कार. आपली वैद्यकीय माहिती केवळ डॉक्टरांच्या सल्लामसलतीसाठी आणि पूर्व-तपासणी सारांशासाठी घेतली जात आहे. "
        "ही माहिती पूर्णपणे गोपनीय असून तपासणीनंतर किओस्कवरून नष्ट केली जाईल. "
        "आपण आपली संमती कधीही मागे घेऊ शकता. पुढे जाण्यासाठी कृपया स्क्रीनवर संमती द्या."
    ),
    "ta": (
        "வணக்கம். உங்கள் மருத்துவத் தகவல் மருத்துவரின் ஆலோசனை மற்றும் முந்தைய பரிசோதனை சுருக்கத்திற்காக மட்டுமே சேகரிக்கப்படுகிறது. "
        "இது முற்றிலும் ரகசியமானது மற்றும் சரிபார்ப்பிற்குப் பிறகு கியோஸ்க்கிலிருந்து அழிக்கப்படும். "
        "நீங்கள் எந்த நேரத்திலும் உங்கள் ஒப்புதலைத் திரும்பப் பெறலாம்."
    ),
    "te": (
        "నమస్కారం. మీ ఆరోగ్య సమాచారం కేవలం వైద్యుల సంప్రదింపుల కొరకు మరియు సారాంశం కొరకు మాత్రమే సేకరించబడుతోంది. "
        "ఈ డేటా అత్యంత గోప్యంగా ఉంచబడుతుంది మరియు పరిశీలన తర్వాత కియోస్క్ నుండి తొలగించబడుతుంది. "
        "మీరు ఎప్పుడైనా మీ సమ్మతిని ఉపసంహరించుకోవచ్చు."
    ),
    "bn": (
        "নমস্কার। আপনার স্বাস্থ্য তথ্য শুধুমাত্র চিকিৎসকের পরামর্শ ও প্রাথমিক সারসংক্ষেপ তৈরির জন্য নেওয়া হচ্ছে। "
        "এই তথ্য সম্পূর্ণ গোপনীয় এবং পরিদর্শনের পর কিয়স্ক থেকে মুছে ফেলা হবে। "
        "আপনি যেকোনো সময় আপনার সম্মতি প্রত্যাহার করতে পারেন।"
    ),
    "gu": (
        "નમસ્તે. તમારી તબીબી માહિતી માત્ર ડૉક્ટરની સલાહ અને પૂર્વ-તપાસ સારાંશ તૈયાર કરવા માટે લેવામાં આવી રહી છે. "
        "આ માહિતી સંપૂર્ણપણે ગોપનીય છે અને તપાસ પછી કિઓસ્કમાંથી ભૂંસી નાખવામાં આવશે. "
        "તમે કોઈપણ સમયે તમારી સંમતિ પાછી ખેંચી શકો છો."
    ),
    "kn": (
        "ನಮಸ್ಕಾರ. ನಿಮ್ಮ ವೈದ್ಯಕೀಯ ಮಾಹಿತಿಯನ್ನು ವೈದ್ಯರ ಸಮಾಲೋಚನೆಗಾಗಿ ಮಾತ್ರ ಸಂಗ್ರಹಿಸಲಾಗುತ್ತಿದೆ. "
        "ಈ ಡೇಟಾ ಸಂಪೂರ್ಣ ಗೌಪ್ಯವಾಗಿದ್ದು, ತಪಾಸಣೆಯ ನಂತರ ಕಿಯೋಸ್ಕ್‌ನಿಂದ ಅಳಿಸಲಾಗುತ್ತದೆ. "
        "ನೀವು ಯಾವುದೇ ಸಮಯದಲ್ಲಿ ನಿಮ್ಮ ಒಪ್ಪಿಗೆಯನ್ನು ಹಿಂಪಡೆಯಬಹುದು."
    ),
    "ml": (
        "നമസ്കാരം. നിങ്ങളുടെ ആരോഗ്യ വിവരങ്ങൾ ഡോക്ടറുടെ പരിശോധനയ്ക്കായി മാത്രമാണ് ശേഖരിക്കുന്നത്. "
        "ഇത് തികച്ചും രഹസ്യമായിരിക്കും, പരിശോധനയ്ക്ക് ശേഷം കിയോസ്കിൽ നിന്ന് നീക്കം ചെയ്യും. "
        "നിങ്ങൾക്ക് എപ്പോൾ വേണമെങ്കിലും സമ്മതം പിൻവലിക്കാം."
    ),
    "pa": (
        "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ। ਤੁਹਾਡੀ ਸਿਹਤ ਜਾਣਕਾਰੀ ਸਿਰਫ਼ ਡਾਕਟਰੀ ਸਲਾਹ ਅਤੇ ਸੰਖੇਪ ਤਿਆਰ ਕਰਨ ਲਈ ਲਈ ਜਾ ਰਹੀ ਹੈ। "
        "ਇਹ ਪੂਰੀ ਤਰ੍ਹਾਂ ਗੁਪਤ ਹੈ ਅਤੇ ਜਾਂਚ ਤੋਂ ਬਾਅਦ ਕਿਓਸਕ ਤੋਂ ਹਟਾ ਦਿੱਤੀ ਜਾਵੇਗੀ। "
        "ਤੁਸੀਂ ਕਿਸੇ ਵੀ ਸਮੇਂ ਆਪਣੀ ਸਹਿਮਤੀ ਵਾਪਸ ਲੈ ਸਕਦੇ ਹੋ।"
    )
}


def generate_vernacular_audio_notice(
    language: str = "hi",
    data_fiduciary: str = settings.DATA_FIDUCIARY,
    purpose: str = "clinical OPD intake and consultation preparation"
) -> Dict[str, str]:
    """
    Generates localized audio notice strings in Hindi, Bengali, Marathi, and English
    describing data collected, Data Fiduciary identity, and purpose before seeking consent.
    """
    notices = {
        "en": (
            f"Notice from {data_fiduciary}. We collect your self-reported symptoms, medical history, and previous prescriptions "
            f"for the sole purpose of {purpose}. Under DPDP Act 2023, your data is never sold and is purged from kiosk memory "
            f"post-consultation. Do you agree to proceed?"
        ),
        "hi": (
            f"{data_fiduciary} द्वारा सूचना। हम आपकी मुख्य बीमारी, लक्षणों और पुराने पर्चों की जानकारी केवल {purpose} "
            f"के उद्देश्य से दर्ज कर रहे हैं। DPDP अधिनियम 2023 के तहत, यह डेटा गोपनीय है और डॉक्टर परामर्श के बाद कियोस्क से स्वतः हटा दिया जाएगा। "
            f"क्या आप आगे बढ़ने की सहमति देते हैं?"
        ),
        "bn": (
            f"{data_fiduciary} থেকে বিজ্ঞপ্তি। আমরা আপনার লক্ষণ, পূর্ববর্তী প্রেসক্রিপশন এবং চিকিৎসা তথ্য শুধুমাত্র {purpose} "
            f"উদ্দেশ্যে সংগ্রহ করছি। DPDP আইন ২০২৩ অনুযায়ী, এই তথ্য সম্পূর্ণ নিরাপদ এবং পরামর্শের পরে কিওস্ক থেকে মুছে ফেলা হবে। "
            f"আপনি কি এগিয়ে যেতে সম্মত?"
        ),
        "mr": (
            f"{data_fiduciary} कडून सूचना. आम्ही आपली लक्षणे, वैद्यकीय इतिहास आणि जुनी औषधपत्रिका केवळ {purpose} "
            f"या हेतूने नोंदवत आहोत. DPDP कायदा २०२३ अंतर्गत, ही माहिती पूर्णपणे गोपनीय असून तपासणीनंतर किओस्कवरून नष्ट केली जाईल. "
            f"आपण पुढे जाण्यास संमती देता का?"
        )
    }

    spoken_text = notices.get(language, notices["en"])
    return {
        "language": language,
        "data_fiduciary": data_fiduciary,
        "purpose": purpose,
        "audio_script": spoken_text,
        "supported_languages": ["hi", "bn", "mr", "en"]
    }


class VoiceNoticeService:
    def __init__(self):
        self.bhashini_key = settings.BHASHINI_API_KEY
        self.user_id = settings.BHASHINI_USER_ID

    def get_spoken_text(self, language: str) -> str:
        """Return the vernacular script for the spoken consent notice."""
        return SPOKEN_NOTICES.get(language, SPOKEN_NOTICES.get("hi", ""))

    def generate_notice(self, language: str = "hi", data_fiduciary: str = settings.DATA_FIDUCIARY, purpose: str = "OPD intake"):
        return generate_vernacular_audio_notice(language, data_fiduciary, purpose)

    async def generate_voice_notice_stream(self, language: str = "hi") -> Dict[str, str]:
        """
        Synthesize or retrieve audio stream descriptor for the voice notice.
        Returns text and audio source reference for client audio elements.
        """
        text = self.get_spoken_text(language)
        return {
            "language": language,
            "spoken_text": text,
            "audio_url": f"/api/tts?lang={language}&mode=consent_notice",
            "provider": "Bhashini AI / Multi-Engine TTS Fallback"
        }


voice_notice_service = VoiceNoticeService()
