const langSelect = document.getElementById("lang-select");
const langMenu = document.getElementById("lang-menu");
const langCurrent = document.getElementById("lang-current");
const langOptions = langMenu.querySelectorAll('[role="option"]');
const chevron = langSelect.querySelector(".lang-chevron");
const languageKey = "sarthix-auth-language";
const translations = new Map(Object.entries({
  "Your Voice · Your Rights · Your Opportunities": "आपकी आवाज़ · आपके अधिकार · आपके अवसर",
  "Your Voice · Your Rights · Your Opportunities.": "आपकी आवाज़ · आपके अधिकार · आपके अवसर।",
  "Empowering Rural India.": "ग्रामीण भारत को सशक्त बनाना।",
  "One trusted companion for information, opportunity and guidance.": "जानकारी, अवसर और मार्गदर्शन के लिए आपका भरोसेमंद साथी।",
  "Rooted in your community. Ready for your next step.": "आपके समुदाय से जुड़ा। आपके अगले कदम के लिए तैयार।",
  "Account access": "खाते में प्रवेश",
  "Log in": "लॉग इन",
  "Create account": "खाता बनाएँ",
  "Welcome Back!": "वापसी पर स्वागत है!",
  "Sign in securely with a one-time code sent to your mobile.": "मोबाइल पर भेजे गए वन-टाइम कोड से सुरक्षित रूप से लॉग इन करें।",
  "Mobile Number": "मोबाइल नंबर",
  "Mobile Number *": "मोबाइल नंबर *",
  "Enter 6-digit OTP": "6 अंकों का OTP दर्ज करें",
  "Enter 6-digit OTP *": "6 अंकों का OTP दर्ज करें *",
  "Send OTP": "OTP भेजें",
  "Sending OTP…": "OTP भेजा जा रहा है…",
  "Resend OTP": "OTP दोबारा भेजें",
  "Resending…": "दोबारा भेजा जा रहा है…",
  "Verify OTP": "OTP सत्यापित करें",
  "OR": "या",
  "New to SarthiX?": "SarthiX पर नए हैं?",
  "Create an account": "खाता बनाएँ",
  "Skip to form": "फ़ॉर्म पर जाएँ",
  "JOIN SARTHIX": "SARTHIX से जुड़ें",
  "Personal Details": "व्यक्तिगत जानकारी",
  "Tell us about yourself.": "अपने बारे में बताइए।",
  "Personal": "व्यक्तिगत",
  "Location": "स्थान",
  "Category": "श्रेणी",
  "Verify": "सत्यापन",
  "Full Name *": "पूरा नाम *",
  "Date of Birth *": "जन्म तिथि *",
  "Gender": "लिंग",
  "(optional)": "(वैकल्पिक)",
  "Male": "पुरुष",
  "Female": "महिला",
  "Other": "अन्य",
  "Prefer not to say": "बताना नहीं चाहते",
  "Already have an account?": "क्या आपका पहले से खाता है?",
  "Sign in": "लॉग इन करें",
  "Location Details": "पते की जानकारी",
  "Where do you live? We'll auto-fill from your PIN code.": "आप कहाँ रहते हैं? PIN कोड से जानकारी अपने-आप भर जाएगी।",
  "PIN Code *": "PIN कोड *",
  "State *": "राज्य *",
  "District *": "ज़िला *",
  "Post Office": "डाकघर",
  "Select post office": "डाकघर चुनें",
  "Tehsil / Taluka *": "तहसील / तालुका *",
  "Village / City *": "गाँव / शहर *",
  "Gram Panchayat": "ग्राम पंचायत",
  "Complete Address *": "पूरा पता *",
  "Category & Language": "श्रेणी और भाषा",
  "Help us personalize SarthiX for you.": "SarthiX को आपके लिए बेहतर बनाने में मदद करें।",
  "I am a… *": "मैं हूँ… *",
  "Select category": "श्रेणी चुनें",
  "Farmer": "किसान",
  "Student": "विद्यार्थी",
  "Rural Citizen": "ग्रामीण नागरिक",
  "ASHA Worker": "आशा कार्यकर्ता",
  "Panchayat Official": "पंचायत अधिकारी",
  "Job Seeker": "नौकरी खोजने वाले",
  "Entrepreneur / Business Owner": "उद्यमी / व्यवसाय के मालिक",
  "Homemaker": "गृहिणी",
  "Preferred Language *": "पसंदीदा भाषा *",
  "English": "अंग्रेज़ी",
  "Hindi": "हिन्दी",
  "Hinglish": "हिंग्लिश",
  "Marathi": "मराठी",
  "Tamil": "तमिल",
  "Gujarati": "गुजराती",
  "Bengali": "बंगाली",
  "Please enter your full name.": "कृपया अपना पूरा नाम दर्ज करें।",
  "Please enter your date of birth.": "कृपया अपनी जन्म तिथि दर्ज करें।",
  "Please enter a valid 10-digit Indian mobile number.": "कृपया 10 अंकों का सही भारतीय मोबाइल नंबर दर्ज करें।",
  "Please enter a valid 6-digit PIN code.": "कृपया 6 अंकों का सही PIN कोड दर्ज करें।",
  "Please enter state.": "कृपया अपना राज्य दर्ज करें।",
  "Please enter your state.": "कृपया अपना राज्य दर्ज करें।",
  "Please enter district.": "कृपया अपना ज़िला दर्ज करें।",
  "Please enter your district.": "कृपया अपना ज़िला दर्ज करें।",
  "Please enter tehsil/taluka.": "कृपया अपनी तहसील/तालुका दर्ज करें।",
  "Please enter your tehsil or taluka.": "कृपया अपनी तहसील या तालुका दर्ज करें।",
  "Please enter village/city.": "कृपया अपना गाँव/शहर दर्ज करें।",
  "Please enter your village or city.": "कृपया अपना गाँव या शहर दर्ज करें।",
  "Please enter your complete address.": "कृपया अपना पूरा पता दर्ज करें।",
  "Please select a category.": "कृपया एक श्रेणी चुनें।",
  "Please select a preferred language.": "कृपया अपनी पसंदीदा भाषा चुनें।",
  "Verify Mobile": "मोबाइल सत्यापित करें",
  "Confirm your identity with an OTP.": "OTP से अपनी पहचान की पुष्टि करें।",
  "Create Account": "खाता बनाएँ",
  "Back": "पीछे",
  "Next": "आगे",
  "Account created successfully!": "खाता सफलतापूर्वक बन गया!",
  "You can now sign in with your mobile number.": "अब आप अपने मोबाइल नंबर से लॉग इन कर सकते हैं।",
  "Go to Sign In": "लॉग इन पर जाएँ",
  "Enter a valid Indian mobile number.": "कृपया सही भारतीय मोबाइल नंबर दर्ज करें।",
  "That OTP is incorrect. Check the code and try again.": "यह OTP गलत है। कोड जाँचकर फिर कोशिश करें।",
  "That OTP has expired. Request a new code.": "इस OTP की समय-सीमा समाप्त हो गई है। नया कोड मँगाएँ।",
  "Too many attempts. Please wait before trying again.": "बहुत अधिक कोशिशें हुईं। दोबारा कोशिश करने से पहले प्रतीक्षा करें।",
  "Network error. Check your internet connection and try again.": "नेटवर्क समस्या है। इंटरनेट जाँचकर फिर कोशिश करें।",
  "OTP sent. Enter the 6-digit code from your SMS.": "OTP भेज दिया गया है। SMS में मिला 6 अंकों का कोड दर्ज करें।",
  "Test code requested. No SMS is sent in the local emulator; use the code shown in its terminal.": "टेस्ट कोड माँगा गया है। लोकल एम्युलेटर SMS नहीं भेजता; उसके टर्मिनल में दिखा कोड इस्तेमाल करें।",
  "Account access": "खाते में प्रवेश"
}));
const reverseTranslations = new Map([...translations].map(([english, hindi]) => [hindi, english]));
const originalText = new WeakMap();
const originalPlaceholders = new WeakMap();
let isOpen = false;

function getLanguage() {
  try {
    return window.localStorage.getItem(languageKey) === "hi" ? "hi" : "en";
  } catch (error) {
    console.error("Could not read the authentication language preference.", error);
    return "en";
  }
}

function translate(value, language) {
  const trimmed = value.trim();
  if (!trimmed) return value;
  const hindi = translations.get(trimmed);
  const english = reverseTranslations.get(trimmed);
  const translated = language === "hi" ? hindi || trimmed : english || trimmed;
  return value.replace(trimmed, translated);
}

function applyLanguage(language) {
  const selectedLanguage = language === "hi" ? "hi" : "en";
  document.documentElement.lang = selectedLanguage;
  document.querySelectorAll(".lang-current").forEach((label) => {
    label.textContent = selectedLanguage === "hi" ? "हिन्दी" : "English";
  });
  langOptions.forEach((option) => {
    const selected = option.dataset.lang === selectedLanguage;
    option.setAttribute("aria-selected", String(selected));
  });

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (node.parentElement?.closest(".lang-option, .lang-current")) continue;
    if (!originalText.has(node)) originalText.set(node, node.nodeValue);
    node.nodeValue = translate(originalText.get(node), selectedLanguage);
  }
  document.querySelectorAll("input[placeholder], textarea[placeholder]").forEach((input) => {
    if (!originalPlaceholders.has(input)) originalPlaceholders.set(input, input.getAttribute("placeholder"));
    input.setAttribute("placeholder", translate(originalPlaceholders.get(input), selectedLanguage));
  });
}

function setLanguage(language) {
  const selectedLanguage = language === "hi" ? "hi" : "en";
  try {
    window.localStorage.setItem(languageKey, selectedLanguage);
  } catch (error) {
    console.error("Could not save the authentication language preference.", error);
  }
  applyLanguage(selectedLanguage);
}

langSelect.addEventListener("click", () => {
  isOpen = !isOpen;
  langSelect.setAttribute("aria-expanded", String(isOpen));
  langMenu.classList.toggle("is-open", isOpen);
  chevron.style.transform = isOpen ? "rotate(180deg)" : "rotate(0deg)";
});

langOptions.forEach((option) => {
  option.addEventListener("click", () => {
    setLanguage(option.dataset.lang);
    isOpen = false;
    langSelect.setAttribute("aria-expanded", "false");
    langMenu.classList.remove("is-open");
    chevron.style.transform = "rotate(0deg)";
  });
});

document.addEventListener("click", (event) => {
  if (!langSelect.contains(event.target) && !langMenu.contains(event.target)) {
    isOpen = false;
    langSelect.setAttribute("aria-expanded", "false");
    langMenu.classList.remove("is-open");
    chevron.style.transform = "rotate(0deg)";
  }
});

const signupPanel = document.getElementById("signup-panel");
if (signupPanel) {
  new MutationObserver(() => applyLanguage(getLanguage())).observe(signupPanel, {
    childList: true,
    subtree: true
  });
}

applyLanguage(getLanguage());
