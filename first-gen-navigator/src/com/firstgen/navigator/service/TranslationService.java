package com.firstgen.navigator.service;

import java.util.*;

/**
 * Provides simple, humanized explanations of complex Indian admission and
 * scholarship jargon in multiple languages (English, Hindi, Bengali, Assamese).
 */
public class TranslationService {

    private final Map<String, Map<String, String>> dictionary = new HashMap<>();

    public TranslationService() {
        initDictionary();
    }

    private void initDictionary() {
        // Common key phrases mapped to simple explanations in English, Hindi, Bengali, Assamese
        Map<String, String> en = new HashMap<>();
        en.put("tagline", "Your path to college, simplified.");
        en.put("subtagline", "AI-powered college & scholarship guidance designed for first-generation scholars.");
        en.put("income_cert_simple", "Proof of annual family income issued by your local revenue officer (Tehsildar / SDO / CO) to receive fee discounts.");
        en.put("domicile_cert_simple", "Proof that you live in this state, which qualifies you for reserved state-quota seats with lower cutoff marks.");
        en.put("tfw_simple", "Tuition Fee Waiver: 100% government relief on tuition fees for students from families earning under ₹8 Lakh/year.");
        en.put("josaa_simple", "JoSAA is the single official website where you choose and lock your seat preferences for NITs, IIITs, and IITs.");
        en.put("affordability_tip", "Real cost = Tuition + Hostel - Scholarship. Always calculate hostel and mess costs before deciding!");
        en.put("dream_tip", "Dream colleges are aspirational goals where you might get a seat during later rounds or special CSAB counseling.");
        en.put("realistic_tip", "Realistic colleges are your prime target matches where your rank has a very strong admission probability.");
        en.put("safe_tip", "Safe colleges are your guaranteed backup safety net where your marks are well above past closing cutoffs.");
        dictionary.put("en", en);

        Map<String, String> hi = new HashMap<>();
        hi.put("tagline", "कॉलेज तक आपकी राह, अब बिल्कुल आसान।");
        hi.put("subtagline", "पहली पीढ़ी के विद्यार्थियों के लिए कॉलेज और छात्रवृत्ति का सरल मार्गदर्शन।");
        hi.put("income_cert_simple", "कम आय वाले परिवारों के छात्रों को फीस छूट पाने के लिए तहसीलदार या ब्लॉक से आय प्रमाण पत्र बनवाना होता है।");
        hi.put("domicile_cert_simple", "निवास प्रमाण पत्र यह साबित करता है कि आप इस राज्य के निवासी हैं, जिससे कम अंकों पर भी राज्य कोटे की सीट मिल जाती है।");
        hi.put("tfw_simple", "ट्यूशन फीस माफी (TFW): ₹8 लाख से कम पारिवारिक आय वाले छात्रों के लिए कॉलेज की पूरी ट्यूशन फीस माफ हो जाती है।");
        hi.put("josaa_simple", "जोसा (JoSAA) वह सरकारी पोर्टल है जहां आप एनआईटी (NIT) और सरकारी कॉलेजों की अपनी पसंद की सीटें भरते हैं।");
        hi.put("affordability_tip", "असली खर्च = ट्यूशन फीस + हॉस्टल और खाना - स्कॉलरशिप। केवल कॉलेज फीस ही नहीं, हॉस्टल का खर्च भी जरूर जोड़ें!");
        hi.put("dream_tip", "सपना (Dream) कॉलेज: यहां एडमिशन मिलना थोड़ा कठिन है, लेकिन बाद के राउंड या स्पेशल राउंड में सीट मिल सकती है।");
        hi.put("realistic_tip", "यथार्थवादी (Realistic) कॉलेज: आपके रैंक के अनुसार इन कॉलेजों में आपका चयन होने की बहुत अच्छी संभावना है।");
        hi.put("safe_tip", "सुरक्षित (Safe) कॉलेज: यह आपका मजबूत बैकअप है जहां पिछले कटऑफ से आपके अंक काफी आगे हैं।");
        dictionary.put("hi", hi);

        Map<String, String> bn = new HashMap<>();
        bn.put("tagline", "কলেজে পড়ার স্বপ্ন, এবার আরও সহজ।");
        bn.put("subtagline", "প্রথম প্রজন্মের কলেজ পড়ুয়াদের জন্য সঠিক কলেজ ও স্কলারশিপের সহজ পথপ্রদর্শক।");
        bn.put("income_cert_simple", "কম আয়ের পরিবারের ছাত্রছাত্রীদের ফি ছাড় পাওয়ার জন্য বিডিও বা তহশিলদার থেকে আয়ের প্রমাণপত্র নিতে হবে।");
        bn.put("domicile_cert_simple", "আবাসিক প্রমাণপত্র (Domicile) প্রমাণ করে আপনি এই রাজ্যের বাসিন্দা, যা রাজ্য কোটায় কম নম্বরেও সুযোগ এনে দেয়।");
        bn.put("tfw_simple", "টিউশন ফি মকুব (TFW): যে পরিবারের আয় বছরে ৮ লক্ষ টাকার কম, তাদের পুরো টিউশন ফি সরকার থেকে মকুব করা হয়।");
        bn.put("josaa_simple", "JoSAA হলো কেন্দ্রীয় পোর্টাল যেখানে এনআইটি এবং অন্যান্য সরকারি কলেজের পছন্দের তালিকা জমা দেওয়া হয়।");
        bn.put("affordability_tip", "আসল খরচ = টিউশন ফি + হোস্টেল ও খাবার - স্কলারশিপ। কেবল ফি নয়, হোস্টেল খরচও হিসেব করে সিদ্ধান্ত নিন!");
        bn.put("dream_tip", "স্বপ্নিল কলেজ (Dream): এখানে সুযোগ পাওয়া একটু কঠিন, তবে পরবর্তী বিশেষ রাউন্ডে চেষ্টা করা যায়।");
        bn.put("realistic_tip", "বাস্তবসম্মত কলেজ (Realistic): আপনার নম্বরে এই কলেজগুলিতে ভর্তির সুযোগ সবচেয়ে বেশি ও নিশ্চিত।");
        bn.put("safe_tip", "সুরক্ষিত কলেজ (Safe): এটি আপনার বিকল্প ভরসা, যেখানে আপনার নম্বর গত বছরের কাটঅফের থেকে অনেকটাই বেশি।");
        dictionary.put("bn", bn);

        Map<String, String> as = new HashMap<>();
        as.put("tagline", "মহাবিদ্যালয়লৈ আপোনাৰ বাট, এতিয়া অতি সহজ।");
        as.put("subtagline", "প্ৰথম প্ৰজন্মৰ শিক্ষাৰ্থীসকলৰ বাবে উচ্চ শিক্ষা আৰু বৃত্তিৰ বিশ্বাসযোগ্য সহায়ক।");
        as.put("income_cert_simple", "কম আয়ৰ পৰিয়ালৰ ছাত্ৰ-ছাত্ৰীসকলে মাচুল ৰেহাই পাবলৈ ৰাজহ বিষয়া বা পঞ্চায়তৰ পৰা আয়ৰ প্ৰমাণপত্ৰ লব লাগিব।");
        as.put("domicile_cert_simple", "স্থায়ী বাসিন্দাৰ প্ৰমাণপত্ৰই দেখুৱায় যে আপুনি এই ৰাজ্যৰ, যাৰ জৰিয়তে ৰাজ্যিক কোটাত কম নম্বৰতো নামভৰ্তি সম্ভৱ।");
        as.put("tfw_simple", "শিক্ষাদান মাচুল ৰেহাই (TFW): বছৰি ৮ লাখৰ কম আয়ৰ পৰিয়ালৰ ছাত্ৰ-ছাত্ৰীৰ বাবে সমগ্ৰ টিউশ্যন মাচুল মাফ হয়।");
        as.put("josaa_simple", "JoSAA হৈছে কেন্দ্ৰীয় ৱেবচাইট য'ত NIT আৰু কেন্দ্ৰীয় প্ৰতিষ্ঠানৰ বাবে পচন্দৰ তালিকা দাখিল কৰা হয়।");
        as.put("affordability_tip", "প্ৰকৃত খৰচ = মাচুল + হোষ্টেল আৰু খোৱা - বৃত্তি। কলেজ নিৰ্বাচনৰ আগতে হোষ্টেলৰ খৰচ যোগ কৰিবলৈ নাপাহৰিব!");
        as.put("dream_tip", "সপোনৰ কলেজ (Dream): ইয়াত পোৱাটো কঠিন হ'লেও বিশেষ কাউন্সেলিং ৰাউণ্ডত চেষ্টা কৰিব পাৰি।");
        as.put("realistic_tip", "বাস্তৱিক কলেজ (Realistic): আপোনাৰ নম্বৰৰ লগত এইখন একেবাৰে খাপ খায় আৰু নামভৰ্তিৰ সুযোগ বেছি।");
        as.put("safe_tip", "সুৰক্ষিত কলেজ (Safe): ই আপোনাৰ নিশ্চিত বিকল্প, য'ত আপোনাৰ নম্বৰ কাটঅফতকৈ যথেষ্ট বেছি।");
        dictionary.put("as", as);
    }

    public String getText(String key, String lang) {
        if (lang == null || !dictionary.containsKey(lang)) {
            lang = "en";
        }
        Map<String, String> map = dictionary.get(lang);
        if (map != null && map.containsKey(key)) {
            return map.get(key);
        }
        // Fallback to English
        return dictionary.get("en").getOrDefault(key, key);
    }

    public Map<String, String> getAllStringsForLang(String lang) {
        if (lang == null || !dictionary.containsKey(lang)) {
            lang = "en";
        }
        return dictionary.get(lang);
    }
}
