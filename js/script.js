/* ══════════════════════════════════════════════════════════════════
   SarthiX — Landing page interactions
   Vanilla JavaScript only. No frameworks, no backend.

   Sections:
   01. Helpers
   02. Sticky header
   03. Mobile navigation
   04. Language selector
   05. Active navigation (scroll spy)
   06. Scroll reveal
   07. Voice assistant (Web Speech API)
   08. Scheme buttons / toast
   09. Startup
══════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  /* ── 01. Helpers ─────────────────────────────────────────────── */
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const scrollBehavior = () => (prefersReducedMotion ? "auto" : "smooth");

  /* Bilingual UI copy ------------------------------------------ */
  // Static page text lives in data-en / data-en-html attributes.
  // This object holds strings that JavaScript writes at runtime.
  const UI = {
    hi: {
      menuOpen: "मेनू खोलें",
      menuClose: "मेनू बंद करें",
      langMenuLabel: "भाषा चुनें",
      langChanged: (name) => `वेबसाइट की भाषा बदलकर ${name} कर दी गई है।`,
      voice: {
        online: "ऑनलाइन",
        listening: "सुन रहा है",
        micStart: "सवाल बोलने के लिए माइक शुरू करें",
        micStop: "सुनना बंद करें",
        hint: "माइक दबाकर अपना सवाल बोलें",
        listeningHint: "सुन रहा हूँ… बोलिए।",
        interim: "सुन रहा हूँ…",
        final: "आपने कहा",
        permissionTitle: "SarthiX से बात करें",
        permissionDescription: "अपने सवाल स्वाभाविक रूप से पूछने के लिए माइक्रोफ़ोन की अनुमति दें। भेजने से पहले आपके बोले हुए शब्द चैट में दिखाई देंगे, जहाँ आप उन्हें जाँच सकते हैं।",
        permissionQuestionDescription: "अपना जवाब बोलने के लिए माइक्रोफ़ोन की अनुमति दें। आगे बढ़ने से पहले आप जवाब जाँच या बदल सकते हैं।",
        permissionAllow: "माइक्रोफ़ोन की अनुमति दें",
        permissionCancel: "अभी नहीं",
        noSupport: "इस ब्राउज़र में आवाज़ से लिखने की सुविधा उपलब्ध नहीं है। Chrome या Edge में प्रयास करें।",
        insecure: "आवाज़ से लिखने के लिए यह पृष्ठ HTTPS या localhost पर खोलें।",
        startFail: "आवाज़ से लिखना शुरू नहीं हो सका। कृपया फिर प्रयास करें।",
        recognized: "आपका सवाल दर्ज हो गया है। जवाब पाने के लिए चैट में भेजें।",
        nothing: "आवाज़ सुनाई नहीं दी। माइक दबाकर फिर प्रयास करें।",
        stoppedWithText: "सुनना बंद हो गया। आपका सवाल लिखित रूप में तैयार है।",
        stoppedEmpty: "सुनना बंद हो गया। फिर प्रयास करने के लिए माइक दबाएँ।",
        errors: {
          "not-allowed": "माइक्रोफ़ोन की अनुमति आवश्यक है। ब्राउज़र सेटिंग में अनुमति दें।",
          "service-not-allowed": "इस ब्राउज़र में आवाज़ सेवा की अनुमति नहीं है।",
          "no-speech": "आवाज़ सुनाई नहीं दी। माइक के पास बोलकर फिर प्रयास करें।",
          network: "आवाज़ सेवा से संपर्क नहीं हो सका। इंटरनेट कनेक्शन जाँचें।",
          "audio-capture": "माइक्रोफ़ोन नहीं मिला। डिवाइस की सेटिंग जाँचें।",
          "language-not-supported": "यह ब्राउज़र चुनी गई भाषा का समर्थन नहीं करता।"
        },
        genericError: "आवाज़ से लिखने में समस्या हुई। कृपया फिर प्रयास करें।"
      },
      schemeDemo: (name) =>
        `${name} की आधिकारिक जानकारी के लिए सरकारी पोर्टल देखें।`,
      chat: {
        fab: "SarthiX चैट खोलें",
        close: "चैट बंद करें",
        send: "सवाल भेजें",
        typing: "SarthiX जवाब लिख रहा है",
        error: "संपर्क में समस्या हुई। नीचे दिए गए विषयों में से कोई चुनकर फिर पूछें।",
        linkNote: "आधिकारिक पोर्टल"
      }
    },
    en: {
      menuOpen: "Open menu",
      menuClose: "Close menu",
      langMenuLabel: "Choose language",
      langChanged: (name) => `Website language changed to ${name}.`,
      voice: {
        online: "Online",
        listening: "Listening",
        micStart: "Start the mic to ask your question",
        micStop: "Stop listening",
        hint: "Tap the mic and speak your question",
        listeningHint: "Listening... Speak now...",
        interim: "Listening...",
        final: "You said",
        permissionTitle: "Talk to SarthiX",
        permissionDescription: "Allow microphone access so you can ask your questions naturally in your own language. Your spoken words will appear in the chat box, where you can review them before sending.",
        permissionQuestionDescription: "Allow microphone access to speak your answer. You can review or change it before continuing.",
        permissionAllow: "Allow Microphone",
        permissionCancel: "Not Now",
        noSupport: "Voice input is not supported in this browser. Try Chrome or Edge.",
        insecure: "Open this page on https or localhost to use voice input.",
        startFail: "Voice input could not start. Please try again.",
        recognized: "Question captured. Ask the assistant in the chat for an answer.",
        nothing: "Nothing was heard — tap the mic and try again.",
        stoppedWithText: "Listening stopped. Your question is in the text box.",
        stoppedEmpty: "Listening stopped. Tap the mic to try again.",
        errors: {
          "not-allowed": "Microphone permission is needed. Allow it in your browser settings.",
          "service-not-allowed": "Voice service is not allowed in this browser.",
          "no-speech": "Nothing was heard. Speak closer to the mic and try again.",
          network: "Could not reach the voice service. Check your internet connection.",
          "audio-capture": "No microphone found. Check your device settings.",
          "language-not-supported": "The selected language is not supported by this browser."
        },
        genericError: "Something went wrong with voice input. Please try again."
      },
      schemeDemo: (name) =>
        `Check the official government portal for ${name} details.`,
      chat: {
        fab: "Open SarthiX chat",
        close: "Close chat",
        send: "Send question",
        typing: "SarthiX is typing a reply",
        error: "Something went wrong. Please try one of the topics below.",
        linkNote: "Official portal"
      }
    }
  };

  let uiLang = "hi";
  const copy = () => UI[uiLang];

  const header = $("#site-header");
  const mobileMenu = $("#mobile-menu");
  const navToggle = $(".nav-toggle");

  /* Toast ------------------------------------------------------ */
  const toast = $("[data-toast]");
  const toastText = $("[data-toast-text]");
  let toastTimer = null;

  function showToast(message) {
    if (!toast || !toastText) return;
    toastText.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 4200);
  }

  /* ── 02. Sticky header ───────────────────────────────────────── */
  let ticking = false;

  function updateHeader() {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 12);
    ticking = false;
  }

  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(updateHeader);
    },
    { passive: true }
  );
  updateHeader();

  /* ── 03. Mobile navigation ───────────────────────────────────── */
  function setMenu(open) {
    if (!mobileMenu || !navToggle) return;

    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? copy().menuClose : copy().menuOpen);
    mobileMenu.classList.toggle("is-open", open);
    mobileMenu.toggleAttribute("inert", !open);
    mobileMenu.setAttribute("aria-hidden", String(!open));
  }

  // The panel starts closed, so it should not be tabbable.
  setMenu(false);

  if (navToggle) {
    navToggle.addEventListener("click", () => {
      const isOpen = navToggle.getAttribute("aria-expanded") === "true";
      setMenu(!isOpen);
    });
  }

  if (mobileMenu) {
    $$("a, button", mobileMenu).forEach((el) => {
      el.addEventListener("click", () => {
        // Language chips should keep the panel open; links should close it.
        if (el.classList.contains("lang-chip")) return;
        setMenu(false);
      });
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (mobileMenu && mobileMenu.classList.contains("is-open")) {
        setMenu(false);
        navToggle.focus();
      }
      closeLangMenu();
    }
  });

  document.addEventListener("click", (event) => {
    if (!mobileMenu || !navToggle) return;
    if (!mobileMenu.classList.contains("is-open")) return;
    if (header.contains(event.target)) return;
    setMenu(false);
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 1024) setMenu(false);
  });

  /* ── 04. Language selector ───────────────────────────────────── */
  const lang = $("[data-lang]");
  const langButton = lang ? $(".lang-btn", lang) : null;
  const langLabel = lang ? $(".lang-current", lang) : null;
  const langOptions = lang ? $$(".lang-option", lang) : [];
  const langChips = $$(".lang-chip");

  const LANG_KEY = "sarthix-language";
  const supportedLanguages = ["hi-IN", "en-IN"];

  let selectedLanguage = "hi-IN";
  let speechLanguage = "hi-IN";

  function closeLangMenu() {
    if (!lang) return;
    lang.classList.remove("is-open");
    if (langButton) langButton.setAttribute("aria-expanded", "false");
  }

  // Swap every translated node. The original Hindi/Hinglish markup is
  // cached the first time so switching back is instant and lossless.
  function applyLanguage(value) {
    const isEnglish = value === "en-IN";
    uiLang = isEnglish ? "en" : "hi";
    document.documentElement.lang = isEnglish ? "en" : "hi";
    document.documentElement.dataset.lang = uiLang;

    $$("[data-en]").forEach((el) => {
      if (!el.hasAttribute("data-original")) el.dataset.original = el.innerHTML;
      el.innerHTML = isEnglish ? el.dataset.en : el.dataset.original;
    });

    $$("[data-en-html]").forEach((el) => {
      if (!el.hasAttribute("data-original-html")) el.dataset.originalHtml = el.innerHTML;
      el.innerHTML = isEnglish ? el.dataset.enHtml : el.dataset.originalHtml;
    });

    $$("[data-en-placeholder]").forEach((el) => {
      if (!el.hasAttribute("data-original-placeholder")) {
        el.dataset.originalPlaceholder = el.getAttribute("placeholder") || "";
      }
      el.setAttribute(
        "placeholder",
        isEnglish ? el.dataset.enPlaceholder : el.dataset.originalPlaceholder
      );
    });

    $$("[data-en-alt]").forEach((el) => {
      if (!el.hasAttribute("data-original-alt")) {
        el.dataset.originalAlt = el.getAttribute("alt") || "";
      }
      el.setAttribute("alt", isEnglish ? el.dataset.enAlt : el.dataset.originalAlt);
    });

    $$("[data-hi]").forEach((el) => {
      if (!el.hasAttribute("data-original-hi")) el.dataset.originalHi = el.innerHTML;
      el.innerHTML = isEnglish ? el.dataset.originalHi : el.dataset.hi;
    });

    $$("[data-hi-html]").forEach((el) => {
      if (!el.hasAttribute("data-original-hi-html")) el.dataset.originalHiHtml = el.innerHTML;
      el.innerHTML = isEnglish ? el.dataset.originalHiHtml : el.dataset.hiHtml;
    });

    const meta = $('meta[name="description"]');
    document.title = isEnglish
      ? "SarthiX — Your Rural AI Companion"
      : "SarthiX — आपका ग्रामीण एआई साथी";

    if (meta) {
      meta.setAttribute(
        "content",
        isEnglish
          ? "SarthiX is a multilingual, voice-first AI companion — government schemes, farming, health and guidance, in your own language."
          : "SarthiX आपका ग्रामीण एआई साथी है। सरकारी योजनाओं, खेती, स्वास्थ्य और मार्गदर्शन की जानकारी अपनी भाषा में पाएँ।"
      );
    }

    syncDynamicLanguage();
  }

  function setLanguage(value, name, options = {}) {
    if (!supportedLanguages.includes(value)) return;

    selectedLanguage = value;
    setVoiceLanguage();

    if (langLabel) langLabel.textContent = name;

    langOptions.forEach((option) => {
      option.setAttribute("aria-selected", String(option.dataset.value === value));
    });

    langChips.forEach((chip) => {
      chip.classList.toggle("is-selected", chip.dataset.value === value);
      chip.setAttribute("aria-pressed", String(chip.dataset.value === value));
    });

    applyLanguage(value);
    updateChatLanguageBadge(value);

    try {
      window.localStorage.setItem(LANG_KEY, value);
    } catch (error) {
      /* Storage can be blocked; the page still switches for this visit. */
    }

    if (!options.silent) showToast(copy().langChanged(name));
  }

  function initialLanguage() {
    let saved = null;

    try {
      saved = window.localStorage.getItem(LANG_KEY);
    } catch (error) {
      saved = null;
    }

    if (supportedLanguages.includes(saved)) return saved;

    const browserLang =
      (navigator.languages && navigator.languages[0]) || navigator.language || "en";

    return /^hi(-|$)/i.test(browserLang) ? "hi-IN" : "en-IN";
  }

  if (langButton) {
    langButton.addEventListener("click", () => {
      const open = lang.classList.toggle("is-open");
      langButton.setAttribute("aria-expanded", String(open));

      if (open) {
        const selected = langOptions.find((option) => option.getAttribute("aria-selected") === "true");
        if (selected) selected.focus();
      }
    });

    langOptions.forEach((option, index) => {
      option.addEventListener("click", () => {
        setLanguage(option.dataset.value, option.dataset.name);
        closeLangMenu();
        langButton.focus();
      });

      option.addEventListener("keydown", (event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          const direction = event.key === "ArrowDown" ? 1 : -1;
          let next = index;

          // Skip language options that are marked "soon".
          for (let step = 0; step < langOptions.length; step += 1) {
            next = (next + direction + langOptions.length) % langOptions.length;
            if (!langOptions[next].disabled) break;
          }

          langOptions[next].focus();
        }
      });
    });
  }

  langChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      setLanguage(chip.dataset.value, chip.dataset.name);
    });
  });

  document.addEventListener("click", (event) => {
    if (!lang || !lang.classList.contains("is-open")) return;
    if (!lang.contains(event.target)) closeLangMenu();
  });

  /* ── 05. Active navigation (scroll spy) ──────────────────────── */
  // Sections that drive the active state. Because Farming, Health and
  // Guidance all live inside the features section, they get their active
  // state from clicks; scroll position maps the section to Farming.
  const navSections = [
    { el: $("#home"), nav: "home" },
    { el: $("#schemes"), nav: "schemes" },
    { el: $("#eligibility"), nav: "eligibility" },
    { el: $("#understand-document"), nav: "understand-document" },
    { el: $("#features"), nav: "farming" },
    { el: $("#how-it-works"), nav: "guidance" },
    { el: $("#about"), nav: "about" }
  ].filter((item) => item.el);

  const allNavLinks = $$("[data-nav]");
  let clickedNav = null;
  let spyPausedUntil = 0;

  function setActiveNav(name) {
    allNavLinks.forEach((link) => {
      const active = link.dataset.nav === name;
      link.classList.toggle("is-active", active);
      if (active) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  function activateFromScroll() {
    if (Date.now() < spyPausedUntil) return;

    const marker = window.innerHeight * 0.42;
    let current = navSections[0];

    navSections.forEach((item) => {
      if (item.el.getBoundingClientRect().top <= marker) current = item;
    });

    // Do not let the spy override a link the user just chose until they
    // scroll again (handled by the wheel / touch listeners below).
    if (clickedNav) {
      setActiveNav(clickedNav);
      return;
    }

    if (current) setActiveNav(current.nav);
  }

  let scrollSpyTick = false;
  window.addEventListener(
    "scroll",
    () => {
      if (scrollSpyTick) return;
      scrollSpyTick = true;
      window.requestAnimationFrame(() => {
        activateFromScroll();
        scrollSpyTick = false;
      });
    },
    { passive: true }
  );

  function releaseClickedNav() {
    clickedNav = null;
    spyPausedUntil = Date.now() + 120;
  }

  window.addEventListener("wheel", releaseClickedNav, { passive: true });
  window.addEventListener("touchmove", releaseClickedNav, { passive: true });
  window.addEventListener("keydown", (event) => {
    if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(event.key)) {
      releaseClickedNav();
    }
  });

  // Anchor clicks: smooth scrolling, active state and optional flash.
  $$('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", () => {
      const hash = link.getAttribute("href");
      if (!hash || hash === "#") return;

      const target = document.getElementById(hash.slice(1));
      if (!target) return;

      if (link.dataset.nav) {
        clickedNav = link.dataset.nav;
        spyPausedUntil = Date.now() + 900;
        setActiveNav(clickedNav);
      }

      // Highlight feature cards when a nav link deep-links to one.
      if (target.classList.contains("feature-card")) {
        window.setTimeout(() => {
          target.classList.add("is-flash");
          window.setTimeout(() => target.classList.remove("is-flash"), 1700);
        }, prefersReducedMotion ? 0 : 550);
      }
    });
  });

  activateFromScroll();

  const eligibilitySection = $("#eligibility");
  if (eligibilitySection && "IntersectionObserver" in window) {
    const eligibilityVisibilityObserver = new IntersectionObserver(([entry]) => {
      document.body.classList.toggle("is-eligibility-active", entry.isIntersecting);
    }, { threshold: 0.08 });
    eligibilityVisibilityObserver.observe(eligibilitySection);
  }

  const documentSection = $("#understand-document");
  if (documentSection && "IntersectionObserver" in window) {
    const documentVisibilityObserver = new IntersectionObserver(([entry]) => {
      document.body.classList.toggle("is-document-active", entry.isIntersecting);
    }, { threshold: 0.08 });
    documentVisibilityObserver.observe(documentSection);
  }

  /* ── 06. Scroll reveal ───────────────────────────────────────── */
  const revealItems = $$(".reveal");

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    revealItems.forEach((item) => revealObserver.observe(item));
  }

  /* ── 07. Voice assistant (Web Speech API) ────────────────────── */
  const voiceCard = $("#voice-demo");
  const micBtn = $("#mic-btn");
  const voiceStatus = $("[data-voice-status]");
  const voiceStateText = $(".voice-state-text");
  const voiceStop = $("[data-voice-stop]");
  const voiceCancel = $("[data-voice-cancel]");
  const transcript = $("[data-transcript]");
  const transcriptLabel = $("[data-transcript-label]");
  const transcriptText = $("[data-transcript-text]");
  const permissionModal = $("#voice-permission-modal");
  const permissionTitle = $("[data-voice-permission-title]");
  const permissionDescription = $("[data-voice-permission-description]");
  const permissionAllow = $("[data-voice-permission-allow]");
  const permissionCancelBtn = $("[data-voice-permission-cancel]");
  const permissionBackdrop = $("[data-voice-permission-close]");

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  let recognition = null;
  let isListening = false;
  let finalTranscript = "";
  let permissionModalSeen = false;
  let eligibilityVoiceTarget = null;
  let documentVoiceTarget = null;

  function setVoiceLanguage() {
    const mapping = {
      "hi-IN": "hi-IN",
      "en-IN": "en-IN",
      "mr-IN": "mr-IN",
      "ta-IN": "ta-IN",
      "gu-IN": "gu-IN",
      "pa-IN": "pa-IN"
    };

    speechLanguage = mapping[selectedLanguage] || (selectedLanguage === "en-IN" ? "en-IN" : "hi-IN");

    if (recognition) recognition.lang = speechLanguage;
  }

  function populateVoiceToChatInput(value) {
    if (eligibilityVoiceTarget && eligibilityVoiceTarget.isConnected) {
      updateEligibilityVoiceAnswer(value);
      return;
    }
    if (documentVoiceTarget && documentVoiceTarget.isConnected) {
      if (documentQuestionInput) {
        documentQuestionInput.value = value || "";
        documentQuestionInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
      const documentVoiceStatus = $("[data-document-question-voice-status]");
      if (documentVoiceStatus && value) {
        documentVoiceStatus.textContent = documentResultCopy[uiLang].voiceMatched;
        documentVoiceStatus.hidden = false;
      }
      return;
    }
    if (!chatInput) return;
    if (!value || !value.trim()) {
      if (chatInput.value.trim()) chatInput.value = chatInput.value.trim();
      return;
    }
    chatInput.value = value;
    if (chatPanel && chatPanel.hidden) {
      openChat();
    }
  }

  function openPermissionModal() {
    if (!permissionModal) return;
    permissionModal.hidden = false;
    permissionModalSeen = true;
    if (permissionTitle) permissionTitle.textContent = copy().voice.permissionTitle;
    if (permissionDescription) {
      permissionDescription.textContent = eligibilityVoiceTarget || documentVoiceTarget
        ? copy().voice.permissionQuestionDescription
        : copy().voice.permissionDescription;
    }
    if (permissionAllow) permissionAllow.textContent = copy().voice.permissionAllow;
    if (permissionCancelBtn) permissionCancelBtn.textContent = copy().voice.permissionCancel;
  }

  function closePermissionModal() {
    if (!permissionModal) return;
    permissionModal.hidden = true;
  }

  function setListeningUI(active) {
    isListening = active;
    if (voiceCard && micBtn) {
      voiceCard.classList.toggle("is-listening", active);
      micBtn.setAttribute("aria-pressed", String(active));
      micBtn.setAttribute(
        "aria-label",
        active ? copy().voice.micStop : copy().voice.micStart
      );

      if (voiceStateText) {
        voiceStateText.textContent = active ? copy().voice.listening : copy().voice.online;
      }
      if (voiceStop) voiceStop.hidden = !active;
      if (voiceCancel) voiceCancel.hidden = !active;
    }

    const eligibilityButton = $("[data-eligibility-voice]");
    const eligibilityStatus = $("[data-eligibility-voice-status]");
    const eligibilityPanel = $("[data-eligibility-app]");
    if (eligibilityButton && eligibilityVoiceTarget) {
      eligibilityButton.setAttribute("aria-pressed", String(active));
      if (eligibilityStatus && active) eligibilityStatus.textContent = eligibilityQuestionCopy[uiLang].voiceListening;
    }
    if (eligibilityPanel) eligibilityPanel.classList.toggle("is-listening", active && Boolean(eligibilityVoiceTarget));

    const documentVoiceButton = $("[data-document-question-voice]");
    const documentVoiceStatus = $("[data-document-question-voice-status]");
    if (documentVoiceButton && documentVoiceTarget) {
      documentVoiceButton.setAttribute("aria-pressed", String(active));
      if (documentVoiceStatus && active) documentVoiceStatus.textContent = documentResultCopy[uiLang].voiceListening;
    }
  }

  function showTranscript(text, label, options = {}) {
    if (!transcript || !transcriptText) return;

    if (!text) {
      transcript.hidden = true;
      transcriptText.textContent = "";
      return;
    }

    transcript.hidden = false;
    transcriptText.textContent = text;
    if (transcriptLabel) transcriptLabel.textContent = label || copy().voice.final;
    if (options.suppressChat) return;

    if (eligibilityVoiceTarget || documentVoiceTarget) {
      populateVoiceToChatInput(text);
    } else if (chatInput && !chatInput.matches(":focus")) {
      populateVoiceToChatInput(text);
    }
  }

  function resetVoiceUI() {
    finalTranscript = "";
    showTranscript("", "");
    if (voiceStatus) {
      voiceStatus.classList.remove("is-error");
      voiceStatus.textContent = copy().voice.hint;
    }
  }

  function voiceError(message) {
    setListeningUI(false);
    if (voiceStatus) {
      voiceStatus.textContent = message;
      voiceStatus.classList.add("is-error");
    }
    const eligibilityStatus = $("[data-eligibility-voice-status]");
    if (eligibilityVoiceTarget && eligibilityStatus) eligibilityStatus.textContent = message;
    const documentVoiceStatus = $("[data-document-question-voice-status]");
    if (documentVoiceTarget && documentVoiceStatus) documentVoiceStatus.textContent = message;
    if (eligibilityVoiceTarget) eligibilityVoiceTarget = null;
    if (documentVoiceTarget) documentVoiceTarget = null;
    showToast(message);
  }

  function buildRecognition() {
    if (!SpeechRecognition) return null;

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.lang = speechLanguage;

    rec.onstart = function () {
      if (!isListening) setListeningUI(true);
      if (voiceStatus) {
        voiceStatus.classList.remove("is-error");
        voiceStatus.textContent = copy().voice.listeningHint;
      }
      closePermissionModal();
    };

    rec.onresult = function (event) {
      let interim = "";
      let partialFinal = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const piece = result[0] ? result[0].transcript : "";

        if (result.isFinal) {
          partialFinal += piece + " ";
        } else {
          interim += piece;
        }
      }

      const nextFinal = partialFinal.trim();
      if (nextFinal) {
        finalTranscript = `${finalTranscript} ${nextFinal}`.trim();
      }

      const combined = (finalTranscript + " " + interim).trim();
      if (!combined) return;

      if (eligibilityVoiceTarget || documentVoiceTarget || (chatInput && chatInput.value.trim() !== combined)) {
        populateVoiceToChatInput(combined);
      }

      showTranscript(combined, interim ? copy().voice.interim : copy().voice.final);
      if (voiceStatus) {
        voiceStatus.classList.remove("is-error");
        voiceStatus.textContent = copy().voice.listeningHint;
      }
    };

    rec.onerror = function (event) {
      if (event.error === "aborted") return;

      const messages = copy().voice.errors;
      setListeningUI(false);
      if (voiceStatus) {
        voiceStatus.textContent = messages[event.error] || copy().voice.genericError;
        voiceStatus.classList.add("is-error");
      }
      const eligibilityStatus = $("[data-eligibility-voice-status]");
      if (eligibilityVoiceTarget && eligibilityStatus) {
        eligibilityStatus.textContent = messages[event.error] || copy().voice.genericError;
      }
      const documentVoiceStatus = $("[data-document-question-voice-status]");
      if (documentVoiceTarget && documentVoiceStatus) {
        documentVoiceStatus.textContent = messages[event.error] || copy().voice.genericError;
      }
      if ((eligibilityVoiceTarget || documentVoiceTarget || chatInput) && finalTranscript.trim()) {
        populateVoiceToChatInput(finalTranscript.trim());
      }
    };

    rec.onend = function () {
      if (!isListening) {
        const cleanText = finalTranscript.trim();
        if (cleanText && (eligibilityVoiceTarget || documentVoiceTarget || chatInput)) {
          populateVoiceToChatInput(cleanText);
        }
        const eligibilityStatus = $("[data-eligibility-voice-status]");
        if (eligibilityVoiceTarget && eligibilityStatus && !cleanText && eligibilityStatus.textContent === eligibilityQuestionCopy[uiLang].voiceListening) {
          eligibilityStatus.textContent = eligibilityQuestionCopy[uiLang].voiceNothing;
        }
        if (eligibilityVoiceTarget) eligibilityVoiceTarget = null;
        if (documentVoiceTarget) documentVoiceTarget = null;
        return;
      }

      setListeningUI(false);
      const cleanText = finalTranscript.trim();

      if (voiceStatus) {
        if (cleanText) {
          voiceStatus.textContent = copy().voice.recognized;
        } else {
          voiceStatus.textContent = copy().voice.nothing;
        }
      }

      const featureIntentHandled = cleanText && !eligibilityVoiceTarget && !documentVoiceTarget
        ? routeAssistantFeatureIntent(cleanText, { speak: true })
        : false;
      if (cleanText && featureIntentHandled) {
        showTranscript(cleanText, copy().voice.final, { suppressChat: true });
      } else if (cleanText) {
        populateVoiceToChatInput(cleanText);
        showTranscript(cleanText, copy().voice.final);
      }
      if (eligibilityVoiceTarget) eligibilityVoiceTarget = null;
      if (documentVoiceTarget) documentVoiceTarget = null;
    };

    return rec;
  }

  function startVoiceFromUser() {
    if ((!voiceCard || !micBtn) && !eligibilityVoiceTarget && !documentVoiceTarget) return;

    if (isListening) {
      stopVoice();
      return;
    }

    if (!SpeechRecognition) {
      voiceError(copy().voice.noSupport);
      return;
    }

    if (!window.isSecureContext) {
      voiceError(copy().voice.insecure);
      return;
    }

    resetVoiceUI();
    openPermissionModal();
  }

  function startVoice() {
    if (!window.isSecureContext) {
      voiceError(copy().voice.insecure);
      return;
    }

    if (!SpeechRecognition) {
      voiceError(copy().voice.noSupport);
      return;
    }

    if (!recognition) recognition = buildRecognition();
    recognition.lang = speechLanguage;

    try {
      recognition.start();
    } catch (error) {
      if (error && error.name === "InvalidStateError") {
        if (recognition) {
          try { recognition.stop(); } catch (stopError) {}
        }
        return;
      }
      voiceError(copy().voice.startFail);
      return;
    }

    setListeningUI(true);
    if (voiceStatus) {
      voiceStatus.classList.remove("is-error");
      voiceStatus.textContent = copy().voice.listeningHint;
    }
  }

  function stopVoice() {
    if (!isListening) return;

    setListeningUI(false);

    try {
      if (recognition) recognition.stop();
    } catch (error) {
      // Recognition may already be stopped.
    }

    const cleanText = finalTranscript.trim();
    if (voiceStatus) {
      voiceStatus.classList.remove("is-error");
      voiceStatus.textContent = cleanText
        ? copy().voice.stoppedWithText
        : copy().voice.stoppedEmpty;
    }
    if (cleanText) {
      populateVoiceToChatInput(cleanText);
      showTranscript(cleanText, copy().voice.final);
    }
  }

  function cancelVoice() {
    if (recognition && isListening) {
      try { recognition.stop(); } catch (error) {}
    }
    setListeningUI(false);
    finalTranscript = "";
    showTranscript("", "");
    if (voiceStatus) {
      voiceStatus.classList.remove("is-error");
      voiceStatus.textContent = copy().voice.hint;
    }
    closePermissionModal();
    const eligibilityTarget = eligibilityVoiceTarget;
    if (eligibilityVoiceTarget) eligibilityVoiceTarget = null;
    const documentTarget = documentVoiceTarget;
    if (documentVoiceTarget) documentVoiceTarget = null;
    if (eligibilityTarget) {
      const answerControl = $("input, select", eligibilityTarget);
      if (answerControl) answerControl.focus({ preventScroll: true });
    } else if (documentTarget) {
      documentTarget.focus({ preventScroll: true });
    } else if (chatInput) {
      chatInput.focus({ preventScroll: true });
    }
  }

  if (micBtn) {
    micBtn.addEventListener("click", startVoiceFromUser);
  }

  if (voiceStop) {
    voiceStop.addEventListener("click", stopVoice);
  }

  if (voiceCancel) {
    voiceCancel.addEventListener("click", cancelVoice);
  }

  if (permissionAllow) {
    permissionAllow.addEventListener("click", () => {
      closePermissionModal();
      startVoice();
    });
  }

  if (permissionCancelBtn) {
    permissionCancelBtn.addEventListener("click", () => {
      closePermissionModal();
      if (eligibilityVoiceTarget) eligibilityVoiceTarget = null;
      if (documentVoiceTarget) documentVoiceTarget = null;
      if (voiceStatus) {
        voiceStatus.classList.remove("is-error");
        voiceStatus.textContent = copy().voice.hint;
      }
    });
  }

  if (permissionBackdrop) {
    permissionBackdrop.addEventListener("click", () => {
      closePermissionModal();
      if (eligibilityVoiceTarget) eligibilityVoiceTarget = null;
      if (documentVoiceTarget) documentVoiceTarget = null;
    });
  }

  // "Abhi Baat Karo" / "Get Started" buttons: bring the demo into view,
  // then ask for the mic. The click itself is the user gesture.
  $$("[data-start-voice]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      setMenu(false);
      resetVoiceUI();

      if (voiceCard) {
        voiceCard.scrollIntoView({ behavior: scrollBehavior(), block: "center" });
        voiceCard.classList.add("is-flash");
        window.setTimeout(() => voiceCard.classList.remove("is-flash"), 1700);
      }

      if (isListening) return;

      if (prefersReducedMotion) {
        startVoice();
      } else {
        window.setTimeout(startVoice, 420);
      }
    });
  });

  /* ── 08. Scheme buttons / toast ──────────────────────────────── */
  $$(".scheme-link").forEach((button) => {
    button.addEventListener("click", () => {
      const scheme = button.dataset.scheme || "is yojana";
      showToast(copy().schemeDemo(scheme));
    });
  });

  /* ── 09. Language-aware runtime labels ───────────────────────── */
  function syncDynamicLanguage() {
    const c = copy();
    const english = uiLang === "en";

    if (langButton) langButton.setAttribute("aria-label", c.langMenuLabel);

    if (navToggle) {
      const menuOpen = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-label", menuOpen ? c.menuClose : c.menuOpen);
    }

    if (voiceStateText) {
      voiceStateText.textContent = isListening ? c.voice.listening : c.voice.online;
    }

    if (voiceStatus && !isListening) {
      voiceStatus.classList.remove("is-error");
      voiceStatus.textContent = c.voice.hint;
    }

    if (micBtn) {
      micBtn.setAttribute("aria-label", isListening ? c.voice.micStop : c.voice.micStart);
    }

    if (chatFab) chatFab.setAttribute("aria-label", c.chat.fab);
    if (chatClose) chatClose.setAttribute("aria-label", c.chat.close);
    if (chatSend) chatSend.setAttribute("aria-label", c.chat.send);
    if (permissionTitle) permissionTitle.textContent = c.voice.permissionTitle;
    if (permissionDescription) permissionDescription.textContent = c.voice.permissionDescription;
    if (permissionAllow) permissionAllow.textContent = c.voice.permissionAllow;
    if (permissionCancelBtn) permissionCancelBtn.textContent = c.voice.permissionCancel;
    if (voiceCancel) {
      const cancelText = $("span", voiceCancel);
      if (cancelText) cancelText.textContent = c.voice.permissionCancel;
    }

    updateChatLanguageBadge(selectedLanguage);
    refreshEligibilityLanguage();
    refreshDocumentLanguage();

    // Keep the initial bot greeting in the selected language even if the
    // visitor switches language before sending a message.
    const greeting = $("[data-chat-greeting]");
    if (greeting && chatMessages && chatMessages.children.length <= 1) {
      const text = english ? greeting.dataset.en : greeting.dataset.original;
      if (text) greeting.innerHTML = text;
    }
  }

  /* ── 10. AI chat assistant ───────────────────────────────────── */
  const chatFab = $("#chat-fab");
  const chatPanel = $("#chat-panel");
  const chatClose = $("[data-chat-close]");
  const chatMessages = $("[data-chat-messages]");
  const chatForm = $("#chat-form");
  const chatInput = $("#chat-input");
  const chatSend = $(".chat-send");
  const chatLanguageBadge = $(".chat-language");

  const BOT_AVATAR =
    '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v2M5.7 5.7l1.4 1.4M3 12h2M19 12h2M17 17l1.3 1.3" /><circle cx="12" cy="12" r="4.2" /><path d="M12 16.2V21M9 21h6" /></svg>';
  const LINK_ICON =
    '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4 10 14" /><path d="M18 14v5.5H4.5V6H10" /></svg>';

  // Optional real-AI hook. Point this at a small serverless function that
  // holds your OpenAI key and forwards { message, language } to the API.
  // NEVER paste an API key into this file — anything in the browser is public.
  const AI_CONFIG = {
    endpoint: "", // e.g. "/api/chat"
    timeout: 12000
  };

  const CHAT_KB = [
    {
      id: "kisan",
      keywords: ["pm kisan", "kisan", "kist", "installment", "instalment", "farmer", "farm", "fasal", "crop", "kheti", "khet", "किसान", "किस्त", "खेती"],
      body: {
        hi:
          "<p>खेती के लिए उपयुक्त योजना आपकी भूमि, राज्य और परिवार की स्थिति पर निर्भर करती है।</p>" +
          "<p><strong>PM Kisan Samman Nidhi</strong> — पात्र किसान परिवारों के लिए आर्थिक सहायता।</p>" +
          "<p><strong>PM-KUSUM</strong> — सौर पंप और नवीकरणीय ऊर्जा से जुड़ी योजना।</p>" +
          "<p><strong>प्रधानमंत्री कृषि सिंचाई योजना</strong> — सिंचाई और पानी के बेहतर उपयोग के लिए।</p>" +
          "<p>अंतिम पात्रता और किस्त की स्थिति के लिए अपने प्रखंड कृषि कार्यालय या आधिकारिक पोर्टल पर जाँचें।</p>",
        en:
          "<p>Choosing a farming scheme depends on your land, state and family situation.</p>" +
          "<p><strong>PM Kisan Samman Nidhi</strong> — financial support for eligible farmer families.</p>" +
          "<p><strong>PM-KUSUM</strong> — a scheme linked to solar pumps and renewable energy.</p>" +
          "<p><strong>PM Krishi Sinchayee Yojana</strong> — support for irrigation and better water use.</p>" +
          "<p>For final eligibility and instalment status, check with your Block Agriculture Office or the official portal.</p>"
      },
      links: [
        { href: "https://pmkisan.gov.in/", label: { hi: "PM Kisan आधिकारिक पोर्टल", en: "PM Kisan portal" } },
        { href: "https://pmkusum.mnre.gov.in/", label: { hi: "PM-KUSUM आधिकारिक पोर्टल", en: "PM-KUSUM portal" } },
        { href: "https://pmksy.gov.in/", label: { hi: "PMKSY आधिकारिक पोर्टल", en: "PMKSY portal" } }
      ]
    },
    {
      id: "sinchai",
      keywords: ["sinchai", "sinchayee", "irrigation", "paani", "pani", "water", "borewell", "सिंचाई", "पानी"],
      body: {
        hi:
          "<p>सिंचाई के लिए <strong>प्रधानमंत्री कृषि सिंचाई योजना (PMKSY)</strong> एक प्रमुख केंद्रीय योजना है। इसका उद्देश्य खेतों तक पानी पहुँचाना और ड्रिप तथा स्प्रिंकलर जैसी विधियों को बढ़ावा देना है।</p>" +
          "<p>राज्य सरकारें अपनी सिंचाई, बोरवेल और अनुदान योजनाएँ भी चलाती हैं। आवेदन से पहले अपने ज़िले के कृषि या सिंचाई विभाग से क्षेत्र में लागू योजना की पुष्टि करें।</p>",
        en:
          "<p><strong>Pradhan Mantri Krishi Sinchayee Yojana (PMKSY)</strong> is the main central scheme for irrigation — it aims to bring water to fields and promote drip and sprinkler systems.</p>" +
          "<p>State governments also run their own irrigation and borewell/subsidy schemes. Before applying, confirm the scheme for your area with your District Agriculture or Irrigation Department.</p>"
      },
      links: [
        { href: "https://pmksy.gov.in/", label: { hi: "PMKSY आधिकारिक वेबसाइट", en: "PMKSY official site" } }
      ]
    },
    {
      id: "solar",
      keywords: ["solar", "kusum", "pump", "bijli", "renewable", "urja", "सोलर", "पंप", "ऊर्जा"],
      body: {
        hi:
          "<p><strong>PM-KUSUM योजना</strong> खेती में सौर पंप और नवीकरणीय ऊर्जा को बढ़ावा देती है। इसमें सौर पंप लगाना और कृषि पंपों को सौर ऊर्जा से जोड़ना शामिल है।</p>" +
          "<p>उपलब्ध घटक, अनुदान और आवेदन प्रक्रिया राज्य के अनुसार अलग हो सकती है। नवीनतम जानकारी के लिए अपने राज्य की नवीकरणीय ऊर्जा एजेंसी (REDA) या बिजली वितरण कंपनी (DISCOM) की आधिकारिक वेबसाइट देखें।</p>",
        en:
          "<p><strong>PM-KUSUM Yojana</strong> promotes solar pumps and renewable energy in farming. Its components include installing solar pumps and solarising agricultural pumps.</p>" +
          "<p>Available components, subsidy and the application process differ by state. Check your State Renewable Energy Agency (REDA) or DISCOM website for the latest details.</p>"
      },
      links: [
        { href: "https://pmkusum.mnre.gov.in/", label: { hi: "PM-KUSUM आधिकारिक पोर्टल", en: "PM-KUSUM portal" } }
      ]
    },
    {
      id: "awas",
      keywords: ["awas", "ghar", "house", "housing", "pmay", "makan", "chhat", "घर", "आवास"],
      body: {
        hi:
          "<p>ग्रामीण क्षेत्र में पक्का घर पाने की जानकारी के लिए <strong>प्रधानमंत्री आवास योजना — ग्रामीण (PMAY-G)</strong> देखें।</p>" +
          "<p>पात्रता, लाभार्थी सूची और किस्त की स्थिति के लिए अपनी ग्राम पंचायत से संपर्क करें या आधिकारिक पोर्टल पर अपना नाम जाँचें।</p>",
        en:
          "<p>For a pucca house in rural areas, look at <strong>Pradhan Mantri Awas Yojana — Gramin (PMAY-G)</strong>.</p>" +
          "<p>For eligibility, the beneficiary list and instalment status, contact your Gram Panchayat or check your name on the official portal.</p>"
      },
      links: [
        { href: "https://pmayg.nic.in/", label: { hi: "PMAY-G आधिकारिक पोर्टल", en: "PMAY-G portal" } }
      ]
    },
    {
      id: "swasthya",
      keywords: ["swasthya", "health", "ilaaj", "hospital", "ayushman", "pmjay", "bima", "dawa", "स्वास्थ्य", "इलाज", "अस्पताल"],
      body: {
        hi:
          "<p><strong>आयुष्मान भारत — PM-JAY</strong> पात्र परिवारों के लिए सरकारी स्वास्थ्य सुरक्षा योजना है। इसके लिए आयुष्मान कार्ड और पात्रता की जाँच आवश्यक है।</p>" +
          "<p>कार्ड और पात्रता की जानकारी के लिए नज़दीकी CSC, सरकारी अस्पताल के आयुष्मान सहायता केंद्र या आधिकारिक पोर्टल से संपर्क करें। आपात स्थिति में नज़दीकी सरकारी अस्पताल या 108 एम्बुलेंस से संपर्क करें।</p>",
        en:
          "<p><strong>Ayushman Bharat — PM-JAY</strong> is a government health cover scheme for eligible families. You need an Ayushman card and an eligibility check.</p>" +
          "<p>Get card and eligibility details at your nearest CSC, the Ayushman help desk at a government hospital, or the official portal. In an emergency, contact the nearest government hospital or the 108 ambulance service.</p>"
      },
      links: [
        { href: "https://pmjay.gov.in/", label: { hi: "PM-JAY आधिकारिक पोर्टल", en: "PM-JAY portal" } }
      ]
    },
    {
      id: "documents",
      keywords: ["document", "documents", "kagaz", "papers", "aadhaar", "aadhar", "bank", "khata", "khasra", "application", "aavedan", "apply", "registration", "दस्तावेज", "कागज", "आवेदन"],
      body: {
        hi:
          "<p>Zyada tar sarkari yojanaon ke liye ye documents aam taur par maange jaate hain:</p>" +
          "<p><strong>Aadhaar card</strong>, bank passbook, niwas praman patra, mobile number aur passport size photo.</p>" +
          "<p>Kisan yojanaon mein zameen ke records (khasra/khatauni) aur income/caste certificate bhi lag sakte hain. Exact list har yojana mein alag hoti hai — official portal ki checklist zaroor dekhein.</p>",
        en:
          "<p>Most government schemes commonly ask for these documents:</p>" +
          "<p><strong>Aadhaar card</strong>, bank passbook, residence proof, mobile number and a passport-size photo.</p>" +
          "<p>Farmer schemes may also need land records (khasra/khatauni) and an income or caste certificate. The exact list differs by scheme — always check the checklist on the official portal.</p>"
      },
      links: []
    },
    {
      id: "eligibility",
      keywords: ["patrata", "eligibility", "eligible", "kaun", "kon", "benefit", "fayda", "faayda", "labh", "which scheme", "kaunsi yojana", "पात्रता", "फायदा", "कौन सी"],
      body: {
        hi:
          "<p>Sahi yojana batane ke liye teen baatein sabse zyada matter karti hain:</p>" +
          "<p><strong>1.</strong> Aap kis rajya aur jile se hain.<br /><strong>2.</strong> Aapke paas kitni zameen hai (kisan hain ya nahi).<br /><strong>3.</strong> Parivaar ki aay aur category (general/OBC/SC/ST).</p>" +
          "<p>In teen details ke saath apne Block/Tehsil office ya CSC par jaayein — wahan aapke liye sahi yojana aur documents ki list confirm ho jayegi.</p>",
        en:
          "<p>Three details matter most when choosing the right scheme:</p>" +
          "<p><strong>1.</strong> Your state and district.<br /><strong>2.</strong> How much land you have (whether you are a farmer).<br /><strong>3.</strong> Family income and category (General/OBC/SC/ST).</p>" +
          "<p>Take these three details to your Block/Tehsil office or CSC — they will confirm the right scheme and document list for you.</p>"
      },
      links: [
        { href: "https://www.india.gov.in/", label: { hi: "india.gov.in", en: "india.gov.in" } }
      ]
    },
    {
      id: "kcc",
      keywords: ["kcc", "kisan credit card", "credit card", "loan", "karza", "kisan credit", "किसान क्रेडिट कार्ड", "लोन", "कर्ज"],
      body: {
        hi:
          "<p><strong>Kisan Credit Card (KCC)</strong> kisaano ko sasta aur aasaan karza deti hai fasal, upkaron aur personal zarooraton ke liye.</p>" +
          "<p><strong>Fayde:</strong> 3 lakh tak ka collateral-free karza, vyaj subvention aur beema suraksha.</p>" +
          "<p>Aavedan ke liye Aadhaar, land record, bank passbook aur passport size photo chahiye. Apne nazdeeki bank branch ya CSC se sampark karein.</p>",
        en:
          "<p><strong>Kisan Credit Card (KCC)</strong> provides farmers with easy and affordable credit for crops, equipment and personal needs.</p>" +
          "<p><strong>Benefits:</strong> Up to ₹3 lakh collateral-free loan, interest subvention and insurance coverage.</p>" +
          "<p>To apply, you need Aadhaar, land records, bank passbook and a passport-size photo. Contact your nearest bank branch or CSC.</p>"
      },
      links: [
        { href: "https://www.nabard.org/", label: { hi: "NABARD", en: "NABARD" } },
        { href: "https://pmkisan.gov.in/", label: { hi: "PM Kisan portal", en: "PM Kisan portal" } }
      ]
    },
    {
      id: "mandi",
      keywords: ["mandi", "bhav", "daam", "price", "rate", "market", "mandi bhav", "fasal daam", "मंडी", "भाव", "दाम"],
      body: {
        hi:
          "<p>Aap apni fasal ka latest mandi bhav <strong>e-NAM (National Agriculture Market)</strong> par dekh sakte hain.</p>" +
          "<p>e-NAM se aap online mandi, bhav aur trading ki jaankari pa sakte hain. Apne rajya ki mandi parishad ya local APMC se bhi sampark kar sakte hain.</p>" +
          "<p>Behtar daam ke liye fasal ki grade aur quality ka dhyan rakhein aur official mandi rate confirm karein.</p>",
        en:
          "<p>Check your crop's latest mandi price on <strong>e-NAM (National Agriculture Market)</strong>.</p>" +
          "<p>e-NAM gives online mandi, price and trading information. You can also contact your state mandi parishad or local APMC.</p>" +
          "<p>For better prices, focus on crop grade and quality, and always confirm official mandi rates.</p>"
      },
      links: [
        { href: "https://enam.gov.in/", label: { hi: "e-NAM portal", en: "e-NAM portal" } }
      ]
    },
    {
      id: "weather",
      keywords: ["weather", "mausam", "barish", "rain", "mausam ki jaankari", "मौसम", "बारिश", "मौसम"],
      body: {
        hi:
          "<p>Kheti ke liye mausam ki jaankari ke liye <strong>IMD (India Meteorological Department)</strong> aur <strong>Meghdoot app</strong> upyog karein.</p>" +
          "<p>Meghdoot app mein kisanon ke liye jalvayu aur fasal salah milti hai. Barish, tapmaan aur humidity ki forecast dekhein taaki fasal ki dekhbhal ache se ho sake.</p>" +
          "<p>Barish ke baad fasal mein rog lagne ka khatre ka dhyan rakhein aur zaroori precaution lein.</p>",
        en:
          "<p>For farming weather information, use <strong>IMD (India Meteorological Department)</strong> and the <strong>Meghdoot app</strong>.</p>" +
          "<p>Meghdoot app provides weather and crop advisories for farmers. Check rainfall, temperature and humidity forecasts so you can care for your crops properly.</p>" +
          "<p>After rainfall, watch for crop disease risks and take necessary precautions.</p>"
      },
      links: [
        { href: "https://mausam.imd.gov.in/", label: { hi: "IMD website", en: "IMD website" } }
      ]
    },
    {
      id: "fertilizer",
      keywords: ["fertilizer", "khaad", "urea", "dap", "npk", "organic", "jaivik", "खाद", "यूरिया", "जैविक"],
      body: {
        hi:
          "<p>Fasalon ke liye sahi khaad (fertilizer) mitti ki jaanch ke baad hi dalein. <strong>Soil Health Card</strong> se pata chalta hai ki aapki mitti mein kis nutrients ki kami hai.</p>" +
          "<p><strong>Urea, DAP, NPK</strong> chemical khaad hain, jabki <strong>compost, vermicompost, jaivik khaad</strong> mitti ke liye behtar hote hain.</p>" +
          "<p>Zyada khaad mitti ko nuksan pahuncha sakti hai — package par likhi matra ke hisaab se hi upyog karein.</p>",
        en:
          "<p>Apply fertilizer only after soil testing. The <strong>Soil Health Card</strong> shows which nutrients your soil lacks.</p>" +
          "<p><strong>Urea, DAP, NPK</strong> are chemical fertilizers, while <strong>compost, vermicompost and organic manure</strong> are better for soil health.</p>" +
          "<p>Too much fertilizer harms the soil — use only the quantity written on the package.</p>"
      },
      links: [
        { href: "https://soilhealth.dac.gov.in/", label: { hi: "Soil Health Card", en: "Soil Health Card" } }
      ]
    },
    {
      id: "greeting",
      keywords: ["hello", "hi", "hey", "namaste", "namaskar", "नमस्ते"],
      body: {
        hi:
          "<p>Namaste! Main SarthiX hoon. Aap batayein — kheti, sinchai, solar, ghar, swasthya ya documents, kis baare mein jaankari chahiye?</p>",
        en:
          "<p>Hello! I am SarthiX. Tell me what you need help with — farming, irrigation, solar, housing, health or documents.</p>"
      },
      links: []
    },
    {
      id: "thanks",
      keywords: ["thank", "thanks", "dhanyavad", "shukriya", "धन्यवाद", "शुक्रिया"],
      body: {
        hi:
          "<p>Aapka swagat hai. Agar aur koi yojana ya document ke baare mein poochhna ho to yahin likh dijiye.</p>",
        en:
          "<p>You're welcome. If you want to ask about another scheme or document, just type it here.</p>"
      },
      links: []
    }
  ];

  /* Service configuration — powers "One Saathi, Many Services" cards.
     Each service maps to a welcome message + suggested questions shown
     inside the existing chat panel when the card is clicked. */
  const SERVICE_DATA = {
    "government-schemes": {
      hi: "सरकारी योजनाएँ",
      en: "Government Schemes",
      welcome: {
        hi: "नमस्ते! सरकारी योजना सहायता में आपका स्वागत है। मैं आपकी मदद कर सकता हूँ — योजनाओं की जानकारी, पात्रता, ज़रूरी दस्तावेज़ और आवेदन प्रक्रिया के बारे में। आप क्या जानना चाहते हैं?",
        en: "Namaste! Welcome to Government Schemes Assistance. I can help you explore government schemes, understand eligibility, required documents and application procedures. What would you like to know?"
      },
      suggestions: [
        { hi: "कौन-सी योजनाएँ मेरे लिए उपलब्ध हैं?", en: "Which schemes are available for me?" },
        { hi: "क्या मैं किसी योजना के लिए पात्र हूँ?", en: "Am I eligible for a scheme?" },
        { hi: "मुझे कौन-से दस्तावेज़ चाहिए?", en: "What documents do I need?" },
        { hi: "मैं कैसे आवेदन कर सकता हूँ?", en: "How can I apply?" }
      ]
    },
    "government-jobs": {
      hi: "सरकारी नौकरियाँ",
      en: "Government Jobs",
      welcome: {
        hi: "नमस्ते! सरकारी नौकरी सहायता में आपका स्वागत है। मैं सरकारी नौकरियों की सूचनाएँ, पात्रता, आयु सीमा और आवेदन प्रक्रिया के बारे में बता सकता हूँ। आप क्या जानना चाहते हैं?",
        en: "Namaste! Welcome to Government Jobs Assistance. I can help you with government job notifications, eligibility, age limits and application process. What would you like to know?"
      },
      suggestions: [
        { hi: "कौन-सी सरकारी नौकरियाँ निकली हैं?", en: "Which government jobs are available?" },
        { hi: "क्या मैं आवेदन के लिए पात्र हूँ?", en: "Am I eligible to apply?" },
        { hi: "आवेदन कैसे करें?", en: "How to apply?" },
        { hi: "ज़रूरी दस्तावेज़ क्या हैं?", en: "What documents are required?" }
      ]
    },
    "scholarships": {
      hi: "छात्रवृत्ति",
      en: "Scholarships",
      welcome: {
        hi: "नमस्ते! छात्रवृत्ति सहायता में आपका स्वागत है। मैं आपकी मदद कर सकता हूँ — छात्रवृत्तियों की जानकारी, पात्रता मानदंड, ज़रूरी दस्तावेज़ और आवेदन प्रक्रिया के बारे में। आप क्या जानना चाहते हैं?",
        en: "Namaste! Welcome to Scholarship Assistance. I can help you explore scholarships, understand eligibility criteria, required documents and application procedures. What would you like to know?"
      },
      suggestions: [
        { hi: "मेरे लिए कौन-सी छात्रवृत्तियाँ उपलब्ध हैं?", en: "Which scholarships are available for me?" },
        { hi: "क्या मैं छात्रवृत्ति के लिए पात्र हूँ?", en: "Am I eligible for a scholarship?" },
        { hi: "मुझे कौन-से दस्तावेज़ चाहिए?", en: "What documents do I need?" },
        { hi: "मैं कैसे आवेदन कर सकता हूँ?", en: "How can I apply?" }
      ]
    },
    "hackathons": {
      hi: "हैकाथॉन",
      en: "Hackathons",
      welcome: {
        hi: "नमस्ते! हैकाथॉन सहायता में आपका स्वागत है। मैं हैकाथॉन प्रतियोगिताओं, पंजीकरण, टीम गठन और पुरस्कारों के बारे में जानकारी दे सकता हूँ। आप क्या जानना चाहते हैं?",
        en: "Namaste! Welcome to Hackathon Assistance. I can help you with hackathon competitions, registration, team formation and prizes. What would you like to know?"
      },
      suggestions: [
        { hi: "कौन-से हैकाथॉन चल रहे हैं?", en: "Which hackathons are ongoing?" },
        { hi: "मैं कैसे पंजीकरण करूँ?", en: "How do I register?" },
        { hi: "टीम कैसे बनाएँ?", en: "How to form a team?" },
        { hi: "पुरस्कार क्या हैं?", en: "What are the prizes?" }
      ]
    },
    "startup-grants": {
      hi: "स्टार्टअप अनुदान",
      en: "Startup Grants",
      welcome: {
        hi: "नमस्ते! स्टार्टअप अनुदान सहायता में आपका स्वागत है। मैं स्टार्टअप के लिए अनुदान, फंडिंग, पात्रता और आवेदन प्रक्रिया के बारे में बता सकता हूँ। आप क्या जानना चाहते हैं?",
        en: "Namaste! Welcome to Startup Grants Assistance. I can help you with startup grants, funding, eligibility and application process. What would you like to know?"
      },
      suggestions: [
        { hi: "कौन-से स्टार्टअप अनुदान उपलब्ध हैं?", en: "Which startup grants are available?" },
        { hi: "मैं कैसे आवेदन कर सकता हूँ?", en: "How can I apply?" },
        { hi: "पात्रता क्या है?", en: "What is the eligibility?" },
        { hi: "ज़रूरी दस्तावेज़ क्या हैं?", en: "What documents are required?" }
      ]
    },
    "farming-advice": {
      hi: "खेती की सलाह",
      en: "Farming Advice",
      welcome: {
        hi: "नमस्ते! खेती सलाह सहायता में आपका स्वागत है। मैं फसल, बीज, सिंचाई, मिट्टी और कीट नियंत्रण के बारे में व्यावहारिक सुझाव दे सकता हूँ। आप क्या जानना चाहते हैं?",
        en: "Namaste! Welcome to Farming Advice Assistance. I can give you practical tips on crops, seeds, irrigation, soil and pest control. What would you like to know?"
      },
      suggestions: [
        { hi: "मेरी फसल के लिए कौन-सी सलाह है?", en: "What farming advice do you have for my crop?" },
        { hi: "सिंचाई के लिए कौन-सी योजना है?", en: "Which irrigation scheme is available?" },
        { hi: "मिट्टी की जाँच कैसे कराएँ?", en: "How to get soil testing done?" },
        { hi: "बीज कहाँ से मिलेंगे?", en: "Where can I get seeds?" }
      ]
    },
    "farmer-schemes": {
      hi: "किसान योजनाएँ",
      en: "Farmer Schemes",
      welcome: {
        hi: "नमस्ते! किसान योजना सहायता में आपका स्वागत है। मैं किसानों के लिए सरकारी योजनाओं, सब्सिडी, कृषि लाभ और आवेदन प्रक्रिया के बारे में बता सकता हूँ। आप क्या जानना चाहते हैं?",
        en: "Namaste! I can help you understand government schemes for farmers, subsidies, agricultural benefits and application procedures. What would you like to know?"
      },
      suggestions: [
        { hi: "किसानों के लिए कौन-सी योजनाएँ हैं?", en: "Which schemes are available for farmers?" },
        { hi: "क्या मुझे कोई सब्सिडी मिल सकती है?", en: "Am I eligible for any subsidy?" },
        { hi: "मैं कैसे आवेदन करूँ?", en: "How can I apply?" },
        { hi: "ज़रूरी दस्तावेज़ क्या हैं?", en: "What documents are required?" }
      ]
    },
    "health-information": {
      hi: "स्वास्थ्य जानकारी",
      en: "Health Information",
      welcome: {
        hi: "नमस्ते! स्वास्थ्य जानकारी सहायता में आपका स्वागत है। मैं सरकारी स्वास्थ्य योजनाओं, अस्पतालों और चिकित्सा जानकारी के बारे में बता सकता हूँ। आप क्या जानना चाहते हैं?",
        en: "Namaste! Welcome to Health Information Assistance. I can help you with government health schemes, hospitals and medical information. What would you like to know?"
      },
      suggestions: [
        { hi: "कौन-सी सरकारी स्वास्थ्य योजना है?", en: "Which government health scheme can I use?" },
        { hi: "आयुष्मान कार्ड कैसे बनवाएँ?", en: "How to get an Ayushman card?" },
        { hi: "नज़दीकी अस्पताल कहाँ है?", en: "Where is the nearest hospital?" },
        { hi: "स्वास्थ्य बीमा क्या है?", en: "What is health insurance?" }
      ]
    },
    "healthcare-support": {
      hi: "स्वास्थ्य सहायता",
      en: "Healthcare Support",
      welcome: {
        hi: "नमस्ते! स्वास्थ्य सहायता में आपका स्वागत है। मैं चिकित्सा सहायता, अस्पताल भर्ती, स्वास्थ्य बीमा और आपात चिकित्सा के बारे में जानकारी दे सकता हूँ। आप क्या जानना चाहते हैं?",
        en: "Namaste! Welcome to Healthcare Support Assistance. I can help you with medical support, hospital admission, health insurance and emergency care. What would you like to know?"
      },
      suggestions: [
        { hi: "मुफ्त इलाज कहाँ मिलेगा?", en: "Where can I get free treatment?" },
        { hi: "स्वास्थ्य बीमा कैसे लें?", en: "How to get health insurance?" },
        { hi: "आपात स्थिति में किसे फोन करें?", en: "Who to call in an emergency?" },
        { hi: "अस्पताल भर्ती प्रक्रिया क्या है?", en: "What is the hospital admission process?" }
      ]
    },
    "women-welfare": {
      hi: "महिला कल्याण",
      en: "Women Welfare",
      welcome: {
        hi: "नमस्ते! महिला कल्याण सहायता में आपका स्वागत है। मैं महिलाओं के लिए योजनाएँ, सुरक्षा, सशक्तिकरण और वित्तीय सहायता के बारे में बता सकता हूँ। आप क्या जानना चाहते हैं?",
        en: "Namaste! Welcome to Women Welfare Assistance. I can help you with schemes, safety, empowerment and financial support for women. What would you like to know?"
      },
      suggestions: [
        { hi: "महिलाओं के लिए कौन-सी योजनाएँ हैं?", en: "Which schemes are available for women?" },
        { hi: "महिला सुरक्षा हेल्पलाइन क्या है?", en: "What is the women's safety helpline?" },
        { hi: "आर्थिक सहायता कैसे मिलेगी?", en: "How to get financial assistance?" },
        { hi: "आवेदन कैसे करें?", en: "How to apply?" }
      ]
    },
    "senior-citizen": {
      hi: "वरिष्ठ नागरिक सहायता",
      en: "Senior Citizen Support",
      welcome: {
        hi: "नमस्ते! वरिष्ठ नागरिक सहायता में आपका स्वागत है। मैं बुजुर्गों के लिए पेंशन, स्वास्थ्य और कल्याण योजनाओं के बारे में जानकारी दे सकता हूँ। आप क्या जानना चाहते हैं?",
        en: "Namaste! Welcome to Senior Citizen Support Assistance. I can help you with pension, health and welfare schemes for senior citizens. What would you like to know?"
      },
      suggestions: [
        { hi: "वरिष्ठ नागरिकों के लिए कौन-सी पेंशन योजना है?", en: "Which pension scheme is for senior citizens?" },
        { hi: "स्वास्थ्य लाभ कैसे मिलेंगे?", en: "How to get health benefits?" },
        { hi: "आवेदन कहाँ करें?", en: "Where to apply?" },
        { hi: "ज़रूरी दस्तावेज़ क्या हैं?", en: "What documents are required?" }
      ]
    },
    "disability-benefits": {
      hi: "दिव्यांग लाभ",
      en: "Disability Benefits",
      welcome: {
        hi: "नमस्ते! दिव्यांग लाभ सहायता में आपका स्वागत है। मैं दिव्यांग व्यक्तियों के लिए प्रमाणपत्र, पेंशन और सहायता योजनाओं के बारे में बता सकता हूँ। आप क्या जानना चाहते हैं?",
        en: "Namaste! Welcome to Disability Benefits Assistance. I can help you with disability certificates, pension and support schemes for persons with disabilities. What would you like to know?"
      },
      suggestions: [
        { hi: "दिव्यांग प्रमाणपत्र कैसे बनवाएँ?", en: "How to get a disability certificate?" },
        { hi: "कौन-सी पेंशन योजना है?", en: "Which pension scheme is available?" },
        { hi: "सहायता कैसे मिलेगी?", en: "How to get support?" },
        { hi: "आवेदन प्रक्रिया क्या है?", en: "What is the application process?" }
      ]
    },
    "widow-support": {
      hi: "विधवा सहायता",
      en: "Widow Support",
      welcome: {
        hi: "नमस्ते! विधवा सहायता में आपका स्वागत है। मैं विधवा महिलाओं के लिए पेंशन और कल्याण योजनाओं के बारे में जानकारी दे सकता हूँ। आप क्या जानना चाहते हैं?",
        en: "Namaste! Welcome to Widow Support Assistance. I can help you with pension and welfare schemes for widows. What would you like to know?"
      },
      suggestions: [
        { hi: "विधवा पेंशन कैसे मिलेगी?", en: "How to get widow pension?" },
        { hi: "पात्रता क्या है?", en: "What is the eligibility?" },
        { hi: "आवेदन कैसे करें?", en: "How to apply?" },
        { hi: "ज़रूरी दस्तावेज़ क्या हैं?", en: "What documents are required?" }
      ]
    },
    "retirement-support": {
      hi: "सेवानिवृत्ति सहायता",
      en: "Retirement Support",
      welcome: {
        hi: "नमस्ते! सेवानिवृत्ति सहायता में आपका स्वागत है। मैं सेवानिवृत्ति के बाद पेंशन, बचत और वित्तीय सहायता के बारे में बता सकता हूँ। आप क्या जानना चाहते हैं?",
        en: "Namaste! Welcome to Retirement Support Assistance. I can help you with pension, savings and financial support after retirement. What would you like to know?"
      },
      suggestions: [
        { hi: "सेवानिवृत्ति पेंशन कैसे मिलेगी?", en: "How to get retirement pension?" },
        { hi: "बचत योजनाएँ कौन-सी हैं?", en: "Which savings schemes are available?" },
        { hi: "आवेदन कहाँ करें?", en: "Where to apply?" },
        { hi: "पात्रता क्या है?", en: "What is the eligibility?" }
      ]
    },
    "housing-schemes": {
      hi: "आवास योजनाएँ",
      en: "Housing Schemes",
      welcome: {
        hi: "नमस्ते! आवास योजना सहायता में आपका स्वागत है। मैं घर बनाने और आवास के लिए सरकारी योजनाओं, पात्रता और आवेदन प्रक्रिया के बारे में बता सकता हूँ। आप क्या जानना चाहते हैं?",
        en: "Namaste! Welcome to Housing Schemes Assistance. I can help you with government schemes for home construction and housing, eligibility and application process. What would you like to know?"
      },
      suggestions: [
        { hi: "कौन-सी आवास योजना है?", en: "Which housing scheme is available?" },
        { hi: "पात्रता क्या है?", en: "What is the eligibility?" },
        { hi: "मैं कैसे आवेदन करूँ?", en: "How can I apply?" },
        { hi: "ज़रूरी दस्तावेज़ क्या हैं?", en: "What documents are required?" }
      ]
    },
    "sc-st-obenefits": {
      hi: "SC / ST / OBC लाभ",
      en: "SC / ST / OBC Benefits",
      welcome: {
        hi: "नमस्ते! SC / ST / OBC लाभ सहायता में आपका स्वागत है। मैं अनुसूचित जाति, जनजाति और पिछड़ा वर्ग के लिए लाभ, छात्रवृत्ति और योजनाओं के बारे में बता सकता हूँ। आप क्या जानना चाहते हैं?",
        en: "Namaste! Welcome to SC / ST / OBC Benefits Assistance. I can help you with benefits, scholarships and schemes for SC, ST and OBC categories. What would you like to know?"
      },
      suggestions: [
        { hi: "कौन-से लाभ उपलब्ध हैं?", en: "Which benefits are available?" },
        { hi: "पात्रता क्या है?", en: "What is the eligibility?" },
        { hi: "आवेदन कैसे करें?", en: "How to apply?" },
        { hi: "ज़रूरी दस्तावेज़ क्या हैं?", en: "What documents are required?" }
      ]
    },
    "free-ration": {
      hi: "मुफ्त राशन",
      en: "Free Ration",
      welcome: {
        hi: "नमस्ते! मुफ्त राशन सहायता में आपका स्वागत है। मैं राशन कार्ड, खाद्य सुरक्षा योजना और राशन दुकानों के बारे में जानकारी दे सकता हूँ। आप क्या जानना चाहते हैं?",
        en: "Namaste! Welcome to Free Ration Assistance. I can help you with ration cards, food security schemes and ration shops. What would you like to know?"
      },
      suggestions: [
        { hi: "राशन कार्ड कैसे बनवाएँ?", en: "How to get a ration card?" },
        { hi: "कौन पात्र है?", en: "Who is eligible?" },
        { hi: "नज़दीकी राशन दुकान कहाँ है?", en: "Where is the nearest ration shop?" },
        { hi: "ज़रूरी दस्तावेज़ क्या हैं?", en: "What documents are required?" }
      ]
    },
    "marriage-schemes": {
      hi: "विवाह योजनाएँ",
      en: "Marriage Schemes",
      welcome: {
        hi: "नमस्ते! विवाह योजना सहायता में आपका स्वागत है। मैं विवाह के लिए वित्तीय सहायता, योजनाओं और आवेदन प्रक्रिया के बारे में बता सकता हूँ। आप क्या जानना चाहते हैं?",
        en: "Namaste! Welcome to Marriage Schemes Assistance. I can help you with financial assistance, schemes and application process for marriage. What would you like to know?"
      },
      suggestions: [
        { hi: "कौन-सी विवाह योजना है?", en: "Which marriage scheme is available?" },
        { hi: "पात्रता क्या है?", en: "What is the eligibility?" },
        { hi: "मैं कैसे आवेदन करूँ?", en: "How can I apply?" },
        { hi: "ज़रूरी दस्तावेज़ क्या हैं?", en: "What documents are required?" }
      ]
    },
    "life-crisis-help": {
      hi: "जीवन संकट सहायता",
      en: "Life Crisis Help",
      welcome: {
        hi: "नमस्ते! जीवन संकट सहायता में आपका स्वागत है। मैं आपात स्थिति में त्वरित सहायता, राहत योजनाओं और आपदा प्रबंधन के बारे में जानकारी दे सकता हूँ। आप क्या जानना चाहते हैं?",
        en: "Namaste! Welcome to Life Crisis Help Assistance. I can help you with immediate assistance, relief schemes and disaster management in emergencies. What would you like to know?"
      },
      suggestions: [
        { hi: "आपात सहायता कैसे मिलेगी?", en: "How to get emergency assistance?" },
        { hi: "राहत योजनाएँ कौन-सी हैं?", en: "Which relief schemes are available?" },
        { hi: "किससे संपर्क करें?", en: "Who to contact?" },
        { hi: "आवेदन कैसे करें?", en: "How to apply?" }
      ]
    },
    "document-guidance": {
      hi: "दस्तावेज़ मार्गदर्शन",
      en: "Document Guidance",
      welcome: {
        hi: "नमस्ते! दस्तावेज़ मार्गदर्शन सहायता में आपका स्वागत है। मैं ज़रूरी दस्तावेज़ों की सूची, उन्हें कैसे प्राप्त करें और आवेदन प्रक्रिया के बारे में बता सकता हूँ। आप क्या जानना चाहते हैं?",
        en: "Namaste! Welcome to Document Guidance Assistance. I can help you with the list of required documents, how to obtain them and the application process. What would you like to know?"
      },
      suggestions: [
        { hi: "कौन-से दस्तावेज़ चाहिए?", en: "Which documents are needed?" },
        { hi: "दस्तावेज़ कैसे बनवाएँ?", en: "How to get documents made?" },
        { hi: "आवेदन प्रक्रिया क्या है?", en: "What is the application process?" },
        { hi: "कहाँ आवेदन करें?", en: "Where to apply?" }
      ]
    },
    "application-process": {
      hi: "आवेदन प्रक्रिया",
      en: "Application Process",
      welcome: {
        hi: "नमस्ते! आवेदन प्रक्रिया सहायता में आपका स्वागत है। मैं योजना आवेदन की चरण-दर-चरण प्रक्रिया, ऑनलाइन और ऑफलाइन आवेदन के बारे में बता सकता हूँ। आप क्या जानना चाहते हैं?",
        en: "Namaste! Welcome to Application Process Assistance. I can help you with the step-by-step application process for schemes, online and offline application. What would you like to know?"
      },
      suggestions: [
        { hi: "आवेदन कैसे करें?", en: "How to apply?" },
        { hi: "ऑनलाइन आवेदन कैसे करें?", en: "How to apply online?" },
        { hi: "आवेदन शुल्क क्या है?", en: "What is the application fee?" },
        { hi: "आवेदन स्थिति कैसे देखें?", en: "How to check application status?" }
      ]
    },
    "required-documents": {
      hi: "आवश्यक दस्तावेज़",
      en: "Required Documents",
      welcome: {
        hi: "नमस्ते! आवश्यक दस्तावेज़ सहायता में आपका स्वागत है। मैं आवेदन के लिए ज़रूरी दस्तावेज़ों की पूरी सूची, उन्हें कैसे प्राप्त करें और सत्यापन प्रक्रिया के बारे में बता सकता हूँ। आप क्या जानना चाहते हैं?",
        en: "Namaste! Welcome to Required Documents Assistance. I can help you with the complete list of documents needed for application, how to obtain them and verification process. What would you like to know?"
      },
      suggestions: [
        { hi: "कौन-से दस्तावेज़ ज़रूरी हैं?", en: "Which documents are required?" },
        { hi: "आधार कार्ड कैसे बनवाएँ?", en: "How to get an Aadhaar card?" },
        { hi: "आय प्रमाणपत्र कैसे बनवाएँ?", en: "How to get an income certificate?" },
        { hi: "ज़रूरी दस्तावेज़ कहाँ जमा करें?", en: "Where to submit required documents?" }
      ]
    }
  };

  const CHAT_FALLBACK = {
    hi:
      "<p>Main abhi ek helpful assistant hoon, lekin har sawaal ka poora jawaab nahi de sakta. Aap in topics par poochh sakte hain: <strong>PM Kisan, sinchai, solar pump, PMAY-G, Ayushman Bharat</strong> ya <strong>documents</strong>.</p>" +
      "<p>Scheme ki final jaankari ke liye official portal ya nazdeeki CSC/Block office se confirm karein.</p>",
    en:
      "<p>I am a helpful assistant, but I cannot answer every question in full. You can ask about: <strong>PM Kisan, irrigation, solar pumps, PMAY-G, Ayushman Bharat</strong> or <strong>documents</strong>.</p>" +
      "<p>For final scheme details, confirm with the official portal or your nearest CSC/Block office.</p>"
  };

  let chatBusy = false;
  let chatQueue = [];

  function stripHtml(html) {
    if (!html) return "";
    return String(html).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }

  function scrollChat() {
    if (!chatMessages) return;
    window.requestAnimationFrame(() => {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    });
  }

  function appendUserMessage(text) {
    if (!chatMessages) return;

    const row = document.createElement("div");
    row.className = "chat-msg chat-msg--user";

    const bubble = document.createElement("div");
    bubble.className = "chat-bubble";

    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    bubble.appendChild(paragraph);

    row.appendChild(bubble);
    chatMessages.appendChild(row);
    scrollChat();
  }

  function speakAnswer(text) {
    if (!text || !("speechSynthesis" in window)) return;

    const languageCode = detectLanguageFromText(text) || selectedLanguage || "hi-IN";
    const speech = new SpeechSynthesisUtterance(String(text));
    speech.lang = languageCode;
    speech.rate = 1;
    speech.pitch = 1;

    window.speechSynthesis.cancel();

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find((voice) => voice.lang && voice.lang.toLowerCase().startsWith(languageCode.split("-")[0].toLowerCase())) || voices.find((voice) => voice.lang && voice.lang.toLowerCase().includes(languageCode.split("-")[0].toLowerCase()));
    if (preferredVoice) speech.voice = preferredVoice;

    window.speechSynthesis.speak(speech);
  }

  function addChatReplyActions(bubble, audioText, retryText) {
    if (!bubble || !audioText) return;

    const actionWrap = document.createElement("div");
    actionWrap.className = "chat-bubble-actions";

    const speakBtn = document.createElement("button");
    speakBtn.type = "button";
    speakBtn.className = "chat-action-btn chat-action-btn--speaker";
    speakBtn.textContent = uiLang === "en" ? "Listen" : "Sunna";
    speakBtn.addEventListener("click", () => speakAnswer(audioText));

    const pauseBtn = document.createElement("button");
    pauseBtn.type = "button";
    pauseBtn.className = "chat-action-btn";
    pauseBtn.textContent = uiLang === "en" ? "Pause" : "Rukna";
    pauseBtn.addEventListener("click", () => {
      if ("speechSynthesis" in window && window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
      }
    });

    const stopBtn = document.createElement("button");
    stopBtn.type = "button";
    stopBtn.className = "chat-action-btn";
    stopBtn.textContent = uiLang === "en" ? "Stop" : "Band karein";
    stopBtn.addEventListener("click", () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    });

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "chat-action-btn chat-action-btn--copy";
    copyBtn.textContent = uiLang === "en" ? "Copy" : "Copy";
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(audioText);
        showToast(uiLang === "en" ? "Response copied" : "Jawaab copy ho gaya");
      } catch (error) {
        showToast(uiLang === "en" ? "Copy not supported in this browser" : "Is browser mein copy support nahi hai");
      }
    });

    actionWrap.appendChild(speakBtn);
    actionWrap.appendChild(pauseBtn);
    actionWrap.appendChild(stopBtn);
    actionWrap.appendChild(copyBtn);

    if (retryText) {
      const retryBtn = document.createElement("button");
      retryBtn.type = "button";
      retryBtn.className = "chat-action-btn chat-action-btn--retry";
      retryBtn.textContent = uiLang === "en" ? "Retry" : "Dobara poochhiye";
      retryBtn.addEventListener("click", () => sendChatMessage(retryText, { skipAppend: false }));
      actionWrap.appendChild(retryBtn);
    }

    bubble.appendChild(actionWrap);
  }

  function appendBotMessage(html, options = {}) {
    if (!chatMessages) return;

    const row = document.createElement("div");
    row.className = "chat-msg chat-msg--bot";

    const avatar = document.createElement("span");
    avatar.className = "chat-msg-avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.innerHTML = BOT_AVATAR;

    const bubble = document.createElement("div");
    bubble.className = "chat-bubble";
    bubble.innerHTML = html;

    if (options.audioText) {
      addChatReplyActions(bubble, options.audioText, options.retryText || "");
    }

    row.appendChild(avatar);
    row.appendChild(bubble);
    chatMessages.appendChild(row);
    scrollChat();
  }

  function appendBotText(text, options = {}) {
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    const bubble = document.createElement("div");
    bubble.appendChild(paragraph);
    appendBotMessage(bubble.innerHTML, {
      audioText: options.audioText || text,
      retryText: options.retryText || text
    });
  }

  function showTyping() {
    if (!chatMessages) return null;

    const row = document.createElement("div");
    row.className = "chat-msg chat-msg--bot chat-msg--typing";

    const avatar = document.createElement("span");
    avatar.className = "chat-msg-avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.innerHTML = BOT_AVATAR;

    const bubble = document.createElement("div");
    bubble.className = "chat-bubble";
    bubble.innerHTML =
      '<span class="chat-typing" role="status" aria-label="' +
      copy().chat.typing +
      '"><span></span><span></span><span></span></span>';

    row.appendChild(avatar);
    row.appendChild(bubble);
    chatMessages.appendChild(row);
    scrollChat();
    return row;
  }

  function loadChatProfile() {
    try {
      const saved = sessionStorage.getItem("sarthix-chat-profile");
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      return {};
    }
  }

  function saveChatProfile(profile) {
    try {
      sessionStorage.setItem("sarthix-chat-profile", JSON.stringify(profile));
    } catch (error) {
      // Ignore storage issues, but keep the in-memory profile active.
    }
  }

  const chatProfile = loadChatProfile();

  function getLanguageName(code) {
    const names = {
      "hi-IN": "हिंदी",
      "en-IN": "English",
      "gu-IN": "ગુજરાતી",
      "mr-IN": "मराठी",
      "ta-IN": "தமிழ்",
      "te-IN": "తెలుగు",
      "pa-IN": "ਪੰਜਾਬੀ",
      "bn-IN": "বাংলা"
    };
    return names[code] || "हिंदी";
  }

  function updateChatLanguageBadge(code) {
    if (!chatLanguageBadge) return;
    const value = code || selectedLanguage || "hi-IN";
    chatLanguageBadge.textContent = getLanguageName(value);
  }

  function detectLanguageFromText(text) {
    const input = String(text || "");
    if (!input.trim()) return selectedLanguage || "hi-IN";

    if (/[\u0A80-\u0AFF]/.test(input)) return "gu-IN";
    if (/[\u0B80-\u0BFF]/.test(input)) return "ta-IN";
    if (/[\u0C00-\u0C7F]/.test(input)) return "te-IN";
    if (/[\u0980-\u09FF]/.test(input)) return "bn-IN";
    if (/[\u0A00-\u0A7F]/.test(input)) return "pa-IN";
    if (/[\u0900-\u097F]/.test(input)) return "hi-IN";
    if (/[\u0B00-\u0B7F]/.test(input)) return "mr-IN";

    const lower = input.toLowerCase();
    if (/(mara|mane|kya|kem|chhe|aap|ma|mujhe|gova|scholarship|sarkari|yojana)/i.test(lower)) {
      if (/(mara|mane|kem|chhe|aap|sarkari|yojana|scholarship)/i.test(lower)) return "gu-IN";
      if (/(mukhe|ka|ap|kya|sarkari)/i.test(lower)) return "hi-IN";
    }

    return /^hi|hindi|namaste|mujhe|main|kaise|kya|yojana|scheme|scholarship|government/i.test(lower) ? "hi-IN" : selectedLanguage || "hi-IN";
  }

  function mergeProfileFromMessage(question) {
    const message = String(question || "");
    const low = message.toLowerCase();

    const ageMatch = low.match(/\b(\d{1,3})\s*(years?|yrs?|year|saal|varsh|age|aayu)\b/i);
    if (ageMatch && Number(ageMatch[1])) chatProfile.age = Number(ageMatch[1]);

    const stateMatches = [
      { key: "state", value: "rajasthan", regex: /rajasthan| Rajasthan|राजस्थान|राजस्थान में/ },
      { key: "state", value: "haryana", regex: /haryana|हरियाणा/ },
      { key: "state", value: "punjab", regex: /punjab|पंजाब/ },
      { key: "state", value: "uttar pradesh", regex: /uttar pradesh|up|उत्तर प्रदेश/ },
      { key: "state", value: "madhya pradesh", regex: /madhya pradesh|mp|मध्य प्रदेश/ },
      { key: "state", value: "gujarat", regex: /gujarat|गुजरात|ગુજરાત/ },
      { key: "state", value: "maharashtra", regex: /maharashtra|महाराष्ट्र/ },
      { key: "state", value: "bihar", regex: /bihar|बिहार/ },
      { key: "state", value: "west bengal", regex: /west bengal|bengal|বাংলা|पश्चिम बंगाल/ }
    ];

    const stateMatch = stateMatches.find((entry) => entry.regex.test(message));
    if (stateMatch) chatProfile.state = stateMatch.value;

    if (/(student|school|college|university|class|course|education|student|vidyarthi|abhyas|padhe|padhai)/i.test(message)) {
      chatProfile.occupation = "student";
      chatProfile.isStudent = true;
    }

    if (/(farmer|kisan|khet|farm|agriculture|krishi|kisaan|farming)/i.test(message)) {
      chatProfile.occupation = "farmer";
      chatProfile.isFarmer = true;
    }

    if (/(job|work|employee|business|shop|self|daily wage|labour|labourer|kamgar|naukri|bussiness)/i.test(message)) {
      chatProfile.occupation = chatProfile.occupation || "working professional";
    }

    if (/(father|mother|family|parivaar|ghar|financial difficulty|paise|income|kam aay|poor|gareeb|ghareeb|difficult)/i.test(message)) {
      chatProfile.familyCircumstances = chatProfile.familyCircumstances || "financial difficulty";
    }

    const incomeMatch = low.match(/(annual|yearly|varshik|saal|income|aay|kamaya|earning|aamdani)\s*[:=]?\s*(rs\.?\s*|rupees\s*|₹\s*)?(\d{2,7})/i);
    if (incomeMatch) {
      chatProfile.familyIncome = Number(incomeMatch[3]);
      if (chatProfile.familyIncome < 500000) chatProfile.incomeBand = "low";
      else if (chatProfile.familyIncome < 1500000) chatProfile.incomeBand = "middle";
      else chatProfile.incomeBand = "high";
    }

    if (/(house|ghar|housing|home|makan|bhawan)/i.test(message)) chatProfile.need = "housing";
    if (/(health|swasthya|medical|hospital|disease|doctor|treatment|bimari)/i.test(message)) chatProfile.need = "healthcare";
    if (/(scholarship|fee|education|studentship|vidya|school|college)/i.test(message)) chatProfile.need = "education";

    saveChatProfile(chatProfile);
    return chatProfile;
  }

  function buildMissingProfileQuestions(profile) {
    const questions = [];
    const language = uiLang === "en" ? "en" : "hi";

    if (!profile.state) {
      questions.push(language === "en" ? "Which state do you live in?" : "Aapka state kaun sa hai?");
    }

    if (!profile.isStudent && !profile.isFarmer && !profile.occupation) {
      questions.push(language === "en" ? "Are you a student, farmer, or working person?" : "Aap student, farmer ya kaam karne wale log mein se kaun se category ke hain?");
    }

    if (!profile.age) {
      questions.push(language === "en" ? "How old are you?" : "Aapki age kitni hai?");
    }

    if (!profile.familyIncome && !profile.incomeBand) {
      questions.push(language === "en" ? "What is your approximate annual family income?" : "Aapke parivaar ki approximate annual income kitni hai?");
    }

    return questions.slice(0, 3);
  }

  function localAnswer(question) {
    const normalizedQuestion = String(question || "").trim();
    if (!normalizedQuestion) {
      return { html: CHAT_FALLBACK[uiLang], text: uiLang === "en" ? "Please share your situation." : "Kripya apni sthiti bataiye." };
    }

    const profile = mergeProfileFromMessage(normalizedQuestion);
    const detectedLanguage = detectLanguageFromText(normalizedQuestion);
    const answerLanguage = detectedLanguage || selectedLanguage || "hi-IN";
    const isEnglish = answerLanguage.startsWith("en") || uiLang === "en";

    const missingQuestions = buildMissingProfileQuestions(profile);
    const shouldAskQuestions = missingQuestions.length > 0 && !/(scholarship|scheme|yojana|benefit|assistance|help|sahayata|kisan|health|ghar|house)/i.test(normalizedQuestion);

    if (shouldAskQuestions) {
      const intro = isEnglish
        ? "I can suggest the right support options, but a few details will help narrow it down."
        : "Main sahi sahayata options suggest kar sakta hoon, lekin thode se details chahiye taaki sahi option mil sake.";
      const html = '<p>' + intro + '</p><ul>' + missingQuestions.map((item) => '<li>' + item + '</li>').join("") + '</ul>';
      return { html, text: intro + " " + missingQuestions.join(" ") };
    }

    const relevantSchemes = [
      {
        key: "scholarship",
        match: /(scholarship|scholarship|student|school|college|fee|education|vidya|abhyas|student|padho)/i,
        name: { hi: "National Scholarship / Student Support Scheme", en: "National Scholarship / Student Support Scheme" },
        intro: {
          hi: "Aap student hain aur aapke parivaar ki aarthik sthiti seemit lag rahi hai, isliye scholarship aur student support options ka pata lagana upyogi ho sakta hai.",
          en: "Since you are a student and your family may be facing financial strain, education-support options may be relevant for you."
        },
        why: {
          hi: "Aapke liye isliye upyogi ho sakta hai kyunki yeh eligible students ko educational assistance, fee help ya support provide karta hai.",
          en: "This may be suitable because it supports eligible students who need assistance with education and related expenses."
        },
        benefits: {
          hi: "Fee help, academic support, and focused assistance for eligible students.",
          en: "Fee assistance, educational support, and focused aid for eligible students."
        },
        eligibility: {
          hi: "Student ka status hona chahiye, income criteria meet karna chahiye, aur school/college registration hona chahiye.",
          en: "The applicant must be a student, meet income-related conditions, and hold valid school or college enrollment."
        },
        docs: {
          hi: "Aadhaar, income proof, student ID/certificate, caste/income certificate (agar lage), bank details.",
          en: "Aadhaar, income proof, student ID or certificate, caste or income certificate if required, and bank details."
        },
        apply: {
          hi: "Official portal par apply karein aur required documents upload karein.",
          en: "Apply on the official portal and upload the requested documents."
        },
        website: "https://scholarships.gov.in/",
        note: {
          hi: "Final eligibility aur kya support mil sakta hai, official portal par verify karna zaroori hai.",
          en: "Final eligibility and support details should be verified on the official portal."
        }
      },
      {
        key: "farmer",
        match: /(farmer|kisan|farm|khet|agriculture|krishi|crop|irrigation|paani|kheti)/i,
        name: { hi: "PM Kisan Samman Nidhi / Krishi Support", en: "PM Kisan Samman Nidhi / Farm Support" },
        intro: {
          hi: "Aapke khet aur kisani se jude zaroorat ko dekhte hue, agricultural support yojanaen aapke liye relevant ho sakti hain.",
          en: "Given your farming context, agricultural support schemes may be relevant for your livelihood and crop needs."
        },
        why: {
          hi: "Kisani karne wale logon ko direct financial support, irrigation support ya crop-related assistance mil sakti hai.",
          en: "This may suit farmers who need direct financial aid, irrigation support, or crop-related assistance."
        },
        benefits: {
          hi: "Direct cash support, irrigation benefits, and farm-related assistance depending on eligibility.",
          en: "Direct cash support, irrigation-related benefits, and farm assistance depending on eligibility."
        },
        eligibility: {
          hi: "Eligible farmer families, valid land records, and government-defined criteria.",
          en: "Eligible farmer families and compliance with land and government criteria."
        },
        docs: {
          hi: "Land documents, Aadhaar, bank details, and farmer ID or supporting records if requested.",
          en: "Land records, Aadhaar, bank details, and farmer ID or supporting documents if requested."
        },
        apply: {
          hi: "PM Kisan portal ya district agriculture office ke through apply karein.",
          en: "Apply through the PM Kisan portal or the district agriculture office."
        },
        website: "https://pmkisan.gov.in/",
        note: {
          hi: "Kist, eligibility aur land status official portal par validate hota hai.",
          en: "Installment, eligibility, and land-status checks should be validated on the official portal."
        }
      },
      {
        key: "health",
        match: /(health|swasthya|medical|doctor|hospital|disease|treatment|bimari|hospital)/i,
        name: { hi: "Ayushman Bharat / Health Support", en: "Ayushman Bharat / Health Support" },
        intro: {
          hi: "Agar swasthya ya medical assistance chahiye, to government health support schemes bhi practical option ho sakti hain.",
          en: "If you need healthcare support, government health schemes may provide useful assistance."
        },
        why: {
          hi: "Yeh scheme eligible families ko treatment aur healthcare support dene ke liye design kiya gaya hai.",
          en: "This type of scheme is designed to support eligible families with treatment and healthcare-related assistance."
        },
        benefits: {
          hi: "Cashless treatment support and hospital assistance, subject to scheme rules.",
          en: "Cashless treatment support and hospital assistance, subject to scheme rules."
        },
        eligibility: {
          hi: "Eligible family status, valid identity proof, and scheme-specific conditions.",
          en: "Eligible family status, valid identity proof, and scheme-specific conditions."
        },
        docs: {
          hi: "Aadhaar, ration card, family proof, treatment details, and hospital records.",
          en: "Aadhaar, ration card, family proof, treatment records, and hospital documents."
        },
        apply: {
          hi: "Health card ya hospital process ke through apply karne ki information official portal se check karein.",
          en: "Check the official portal for the health-card or treatment process and apply as directed."
        },
        website: "https://pmjay.gov.in/",
        note: {
          hi: "Health-related guidance general information hai; serious medical issues ke liye doctor ya authorized center se consult karein.",
          en: "Health guidance is general information only; serious medical cases need a qualified doctor or authorized health center."
        }
      },
      {
        key: "housing",
        match: /(house|ghar|housing|makan|home|bhawan|roof|pucca)/i,
        name: { hi: "PM Awas Yojana / Housing Support", en: "PM Awas Yojana / Housing Support" },
        intro: {
          hi: "Ghar aur housing support ke liye central/state schemes kabhi kabhi eligible families ko help kar sakti hain.",
          en: "Housing support programs may assist eligible families with home construction or improvement needs."
        },
        why: {
          hi: "Agar aapke parivaar ke paas ghar ya sanrachana ki zaroorat hai, to yeh scheme suitability ko check kar sakta hai.",
          en: "If your family needs housing support, this may be a relevant avenue to review."
        },
        benefits: {
          hi: "Housing or home-construction assistance, subject to eligibility and regional guidelines.",
          en: "Housing or home-construction assistance, depending on eligibility and regional guidelines."
        },
        eligibility: {
          hi: "Family category, income, and housing need conditions may apply.",
          en: "Family category, income, and housing need conditions may apply."
        },
        docs: {
          hi: "Identity proof, land or house documents, income proof, and application forms.",
          en: "Identity proof, land or house documents, income proof, and application forms."
        },
        apply: {
          hi: "State housing department ya official portal se aavedan process seekhein.",
          en: "Review the application process via the state housing department or official portal."
        },
        website: "https://pmaymis.gov.in/",
        note: {
          hi: "Regional requirement aur eligibility official portal par verify karna zaroori hai.",
          en: "Regional requirements and eligibility must be confirmed on the official portal."
        }
      }
    ];

    const candidateSchemes = relevantSchemes.filter((scheme) => scheme.match.test(normalizedQuestion) || (profile.isStudent && scheme.key === "scholarship") || (profile.isFarmer && scheme.key === "farmer") || (profile.need && scheme.key === profile.need));

    if (!candidateSchemes.length) {
      const fallbackIntro = isEnglish
        ? "I can help identify the most relevant scheme, but I need a little more context about your situation."
        : "Main aapke liye sabse upyogi yojana identify kar sakta hoon, lekin aapki situation ke baare mein thoda aur context chahiye.";
      const fallbackText = isEnglish
        ? "Please tell me your age, state, occupation, education, and family income, and I’ll narrow the options."
        : "Kripya age, state, occupation, education aur family income bataiye, phir main option ko narrow kar dunga.";
      return {
        html: '<p>' + fallbackIntro + '</p><p>' + fallbackText + '</p>',
        text: fallbackIntro + " " + fallbackText
      };
    }

    const selected = candidateSchemes.slice(0, 2);
    const schemeHtml = selected
      .map((scheme, index) => {
        const name = scheme.name[isEnglish ? "en" : "hi"] || scheme.name.hi;
        const intro = scheme.intro[isEnglish ? "en" : "hi"] || scheme.intro.hi;
        const why = scheme.why[isEnglish ? "en" : "hi"] || scheme.why.hi;
        const benefits = scheme.benefits[isEnglish ? "en" : "hi"] || scheme.benefits.hi;
        const eligibility = scheme.eligibility[isEnglish ? "en" : "hi"] || scheme.eligibility.hi;
        const docs = scheme.docs[isEnglish ? "en" : "hi"] || scheme.docs.hi;
        const apply = scheme.apply[isEnglish ? "en" : "hi"] || scheme.apply.hi;
        const note = scheme.note[isEnglish ? "en" : "hi"] || scheme.note.hi;

        return (
          '<div class="scheme-card">' +
          '<p><strong>' + (index + 1) + '. ' + name + '</strong></p>' +
          '<p>' + intro + '</p>' +
          '<p><strong>' + (isEnglish ? 'Why this may be suitable for you' : 'Aapke liye yeh kyun suitable ho sakta hai') + '</strong></p>' +
          '<p>' + why + '</p>' +
          '<p><strong>' + (isEnglish ? 'Benefits' : 'Benefits') + '</strong></p>' +
          '<p>' + benefits + '</p>' +
          '<p><strong>' + (isEnglish ? 'Eligibility' : 'Eligibility') + '</strong></p>' +
          '<p>' + eligibility + '</p>' +
          '<p><strong>' + (isEnglish ? 'Documents Required' : 'Documents Required') + '</strong></p>' +
          '<p>' + docs + '</p>' +
          '<p><strong>' + (isEnglish ? 'How to Apply' : 'How to Apply') + '</strong></p>' +
          '<p>' + apply + '</p>' +
          '<p><strong>' + (isEnglish ? 'Official Website' : 'Official Website') + '</strong></p>' +
          '<p><a class="chat-link" href="' + scheme.website + '" target="_blank" rel="noopener noreferrer">' + LINK_ICON + (isEnglish ? 'Official website' : 'Official website') + '</a></p>' +
          '<p><strong>' + (isEnglish ? 'Important Note' : 'Important Note') + '</strong></p>' +
          '<p>' + note + '</p>' +
          '</div>'
        );
      })
      .join("");

    return {
      html: '<p>' + (isEnglish ? 'Here are the most relevant options for your situation:' : 'Aapki situation ke liye sabse relevant options yeh hain:') + '</p>' + schemeHtml,
      text: selected.map((scheme) => scheme.name[isEnglish ? "en" : "hi"]).join(". ")
    };
  }

  async function fetchAIAnswer(question) {
    if (!AI_CONFIG.endpoint) return null;

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), AI_CONFIG.timeout);

    try {
      const response = await fetch(AI_CONFIG.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: question,
          language: selectedLanguage,
          context: "SarthiX rural government scheme guidance"
        }),
        signal: controller.signal
      });

      if (!response.ok) return null;

      const data = await response.json();
      if (data && typeof data.reply === "string" && data.reply.trim()) {
        return { text: data.reply.trim() };
      }
      return null;
    } catch (error) {
      return null;
    } finally {
      window.clearTimeout(timer);
    }
  }

  function finishReply(reply, typing) {
    if (typing && typing.isConnected) typing.remove();

    if (reply && reply.html) {
      appendBotMessage(reply.html, {
        audioText: reply.text || stripHtml(reply.html),
        retryText: reply.retryText || reply.text || stripHtml(reply.html)
      });
    } else if (reply && reply.text) {
      appendBotText(reply.text, {
        audioText: reply.text,
        retryText: reply.retryText || reply.text
      });
    } else {
      appendBotMessage(CHAT_FALLBACK[uiLang], {
        audioText: uiLang === "en" ? "I am a helpful assistant." : "Main ek helpful assistant hoon.",
        retryText: uiLang === "en" ? "I am a helpful assistant." : "Main ek helpful assistant hoon."
      });
    }

    chatBusy = false;

    if (chatQueue.length) {
      const next = chatQueue.shift();
      sendChatMessage(next, { skipAppend: true });
    }
  }

  async function sendChatMessage(raw, options = {}) {
    const message = String(raw || "").trim();
    if (!message || !chatPanel) return;

    if (chatPanel.hidden) openChat();

    if (!options.skipAppend) {
      appendUserMessage(message);
    }
    if (chatInput) chatInput.value = "";

    if (chatBusy) {
      chatQueue.push(message);
      return;
    }

    if (routeAssistantFeatureIntent(message)) return;

    chatBusy = true;
    const typing = showTyping();

    try {
      const remote = await fetchAIAnswer(message);

      if (remote) {
        finishReply(remote, typing);
        return;
      }

      const delay = prefersReducedMotion ? 120 : 650;
      await new Promise((resolve) => window.setTimeout(resolve, delay));
      finishReply(localAnswer(message), typing);
    } catch (error) {
      finishReply({ html: "<p>" + copy().chat.error + "</p>" }, typing);
    }
  }

  function openChat(question) {
    if (!chatPanel) return;

    chatPanel.hidden = false;
    chatPanel.classList.add("is-open");
    chatPanel.setAttribute("aria-hidden", "false");
    if (chatFab) chatFab.setAttribute("aria-expanded", "true");

    // Restore pre-selected service from sessionStorage (survives refresh).
    const preSelected = sessionStorage.getItem("sarthix-selected-service");
    if (preSelected && SERVICE_DATA[preSelected] && !chatBusy) {
      const svc = SERVICE_DATA[preSelected];
      const english = uiLang === "en";
      const welcome = english ? svc.welcome.en : svc.welcome.hi;
      sendChatMessage(welcome);
      renderServiceSuggestions(preSelected, english);
      sessionStorage.removeItem("sarthix-selected-service");
    } else if (question) {
      sendChatMessage(question);
    } else if (!chatBusy) {
      window.setTimeout(() => {
        if (chatInput) chatInput.focus({ preventScroll: true });
      }, prefersReducedMotion ? 0 : 160);
    }

    scrollChat();
  }

  function renderServiceSuggestions(serviceId, english) {
    if (!chatSuggest) return;
    const svc = SERVICE_DATA[serviceId];
    if (!svc) return;
    chatSuggest.replaceChildren();
    svc.suggestions.forEach((s) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = english ? s.en : s.hi;
      btn.className = "";
      btn.addEventListener("click", () => {
        const q = english ? s.en : s.hi;
        chatInput.value = q;
        chatInput.focus({ preventScroll: true });
      });
      chatSuggest.appendChild(btn);
    });
  }

  function openChatWithService(serviceId) {
    if (!SERVICE_DATA[serviceId]) return;
    sessionStorage.setItem("sarthix-selected-service", serviceId);
    openChat();
  }

  function closeChat() {
    if (!chatPanel || chatPanel.hidden) return;

    chatPanel.hidden = true;
    chatPanel.classList.remove("is-open");
    chatPanel.setAttribute("aria-hidden", "true");
    if (chatFab) {
      chatFab.setAttribute("aria-expanded", "false");
      chatFab.focus({ preventScroll: true });
    }
  }

  if (chatFab) {
    chatFab.addEventListener("click", () => {
      if (chatPanel && chatPanel.hidden) {
        openChat();
      } else {
        closeChat();
      }
    });
  }

  if (chatClose) chatClose.addEventListener("click", closeChat);

  if (chatForm) {
    chatForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!chatInput) return;
      const value = chatInput.value.trim();
      if (!value) return;
      sendChatMessage(value);
      chatInput.focus({ preventScroll: true });
    });
  }

  $$("[data-chat-open]").forEach((button) => {
    button.addEventListener("click", () => openChat());
  });

  $$("[data-chat-question]").forEach((button) => {
    button.addEventListener("click", () => {
      const english = uiLang === "en";
      const question = english
        ? button.dataset.chatQuestionEn || button.dataset.chatQuestion
        : button.dataset.chatQuestion;
      openChat(question);
    });
  });

  /* ── 11. Eligibility stepper ─────────────────────────────────── */
  const eligibilityForm = $("#eligibility-form");
  const eligibilityScreens = $$('[data-eligibility-screen]');
  const eligibilityProgress = $$('[data-progress-step]');
  const eligibilityName = $("#eligibility-scheme-name");
  const eligibilityDescription = $("#eligibility-scheme-description");
  const eligibilityCategory = $("#eligibility-category");
  const eligibilityError = $("[data-eligibility-error]");
  const eligibilityQuestionError = $("[data-eligibility-question-error]");
  const eligibilityQuestionCount = $("[data-question-count]");
  const eligibilityQuestionFieldset = $("[data-question-fieldset]");
  const eligibilityMessage = $("[data-eligibility-message]");
  const eligibilityVoiceButton = $("[data-eligibility-voice]");
  const eligibilityVoiceStatus = $("[data-eligibility-voice-status]");
  const eligibilityMeter = $("[data-eligibility-progress]");
  const eligibilityMeterFill = $("[data-eligibility-progress-fill]");
  const eligibilitySummary = $("[data-eligibility-summary]");
  const eligibilityResultCard = $("[data-result-status-card]");
  const eligibilityResultStatusLabel = $("[data-result-status-label]");
  const eligibilityResultReason = $("[data-result-reasoning]");
  const eligibilityResultReasonDetail = $("[data-result-reasoning-detail]");
  const eligibilityResultRequirements = $("[data-result-requirements]");
  const eligibilityResultDocuments = $("[data-result-documents]");
  const eligibilityResultNextSteps = $("[data-result-next-steps]");
  const eligibilityResultLinks = $("[data-result-links]");
  const eligibilityResultLinkList = $("[data-result-link-list]");
  const eligibilityResultDemoNotice = $("[data-result-demo-notice]");
  const eligibilityResultDownload = $("[data-eligibility-download]");
  const eligibilityResultFollowup = $("[data-eligibility-followup]");
  const eligibilityNext = $("[data-eligibility-next]");

  const eligibilityQuestionCopy = {
    hi: {
      count: (current, total) => `सवाल ${current} / ${total}`,
      continue: "आगे बढ़ें", review: "जानकारी देखें",
      missingScheme: "योजना का नाम लिखें या उसके बारे में थोड़ा बताएँ।",
      missingAnswer: "आगे बढ़ने के लिए जवाब चुनें या लिखें।",
      assistantDefault: "ठीक है, हम एक-एक करके सवाल करेंगे। आप बोलकर या लिखकर जवाब दे सकते हैं।",
      assistantTips: {
        state: "योजना के नियम राज्य के अनुसार अलग हो सकते हैं।",
        qualification: "अपनी पूरी की हुई सबसे ऊँची शैक्षणिक योग्यता चुनें।",
        studying: "यदि आप अभी किसी पाठ्यक्रम में पढ़ रहे हैं, तो ‘हाँ’ चुनें।",
        income: "इससे उन योजनाओं की पहचान करने में मदद मिलती है जिनमें आय-सीमा हो सकती है।",
        eligibleCategory: "यदि लागू हो तो अपनी श्रेणी चुनें। बताना न चाहें तो वह विकल्प चुनें।",
        documents: "दस्तावेज़ अभी आपके पास न हों, तब भी अपनी जानकारी के अनुसार जवाब दें।",
        age: "अपनी आयु वर्षों में लिखें।", farmland: "अपनी कृषि भूमि की स्थिति चुनें।",
        landRecords: "यह जानने के लिए पूछा जा रहा है कि भूमि के अभिलेख उपलब्ध हैं या नहीं।",
        employment: "अपनी वर्तमान स्थिति से सबसे मिलता-जुलता विकल्प चुनें।",
        supportFor: "जिस व्यक्ति को सहायता चाहिए, उसके अनुसार विकल्प चुनें।",
        home: "अपने परिवार के आवास की स्थिति बताएँ।", familySize: "परिवार में रहने वाले लोगों की संख्या लिखें।"
      },
      scheme: "योजना", description: "योजना के बारे में आपने क्या सुना", category: "श्रेणी",
      state: "आप किस राज्य या केंद्रशासित प्रदेश में रहते हैं?", stateHelp: "अपना राज्य या केंद्रशासित प्रदेश लिखें।",
      statePlaceholder: "राज्य या केंद्रशासित प्रदेश", age: "आपकी आयु कितनी है?", ageHelp: "आयु वर्षों में लिखें।",
      familySizeHelp: "अनुमानित संख्या भी ठीक है।",
      income: "परिवार की अनुमानित वार्षिक आय कितनी है?", incomeHelp: "अनुमानित आय-सीमा चुनें। आप जवाब न देना भी चुन सकते हैं।",
      incomeOptions: ["₹1 लाख से कम", "₹1–3 लाख", "₹3–6 लाख", "₹6–10 लाख", "₹10 लाख से अधिक", "बताना नहीं चाहते"],
      qualification: "आपकी पूरी की हुई सबसे ऊँची शैक्षणिक योग्यता क्या है?", studying: "क्या आप अभी पढ़ाई कर रहे हैं?",
      eligibleCategory: "क्या आप किसी पात्र श्रेणी में आते हैं?", documents: "क्या आपके पास आवश्यक दस्तावेज़ हैं?",
      employment: "आपकी वर्तमान रोज़गार स्थिति क्या है?", farmland: "क्या आपके पास कृषि भूमि है या आप उसे पट्टे पर लेते हैं?",
      landRecords: "क्या आपके पास भूमि के अभिलेख हैं?", supportFor: "यह सहायता किसके लिए चाहिए?",
      home: "क्या आपके परिवार के पास पक्का घर है?", familySize: "आपके परिवार में कितने लोग रहते हैं?",
      yes: "हाँ", no: "नहीं", notSure: "पता नहीं", studyingYes: "हाँ, अभी पढ़ाई कर रहे हैं",
      studyingNo: "नहीं, अभी पढ़ाई नहीं कर रहे", secondary: "दसवीं तक", higherSecondary: "बारहवीं तक",
      diploma: "डिप्लोमा / आईटीआई", graduate: "स्नातक", postgraduate: "स्नातकोत्तर या उससे अधिक", other: "अन्य",
      general: "सामान्य", sc: "अनुसूचित जाति", st: "अनुसूचित जनजाति", obc: "अन्य पिछड़ा वर्ग", minority: "अल्पसंख्यक समुदाय",
      disability: "दिव्यांग व्यक्ति", preferNot: "बताना नहीं चाहते", documentsYes: "हाँ, सभी या अधिकतर",
      documentsSome: "कुछ दस्तावेज़ हैं", documentsNo: "अभी नहीं", landOwn: "हाँ, अपनी भूमि",
      landLease: "हाँ, पट्टे पर भूमि", landNone: "नहीं", employed: "रोज़गार में हैं",
      unemployed: "रोज़गार तलाश रहे हैं", notWorking: "अभी रोज़गार में नहीं हैं", supportSelf: "मेरे लिए",
      supportFamily: "परिवार के किसी सदस्य के लिए", homeYes: "हाँ", homeNo: "नहीं", homeNotSure: "पता नहीं",
      voiceMatched: "आपका बोला हुआ जवाब लिख दिया गया है। आगे बढ़ने से पहले जाँच लें।",
      voiceUnmatched: "आवाज़ समझ नहीं आई। कोई विकल्प चुनें या फिर बोलें।",
      voiceListening: "सुन रहा हूँ… अपना जवाब बोलें।", voiceNothing: "आवाज़ सुनाई नहीं दी। कृपया फिर प्रयास करें।",
      voiceButtonLabel: "बोलकर जवाब दें"
    },
    en: {
      count: (current, total) => `Question ${current} of ${total}`,
      continue: "Continue", review: "Review details",
      missingScheme: "Enter the scheme name or tell us a little about it.",
      missingAnswer: "Choose or enter an answer to continue.",
      assistantDefault: "All right, we’ll take it one question at a time. You can speak or type your answers.",
      assistantTips: {
        state: "Scheme rules can differ from one state to another.",
        qualification: "Choose the highest level of education you have completed.",
        studying: "Choose yes if you are currently enrolled in a course.",
        income: "This helps identify schemes that may have an income limit.",
        eligibleCategory: "Choose a category if it applies, or prefer not to say.",
        documents: "Answer from memory if the documents are not with you right now.",
        age: "Enter your age in years.", farmland: "Choose the option that best describes your land.",
        landRecords: "This helps note whether land records are available.",
        employment: "Choose the option that best matches your current situation.",
        supportFor: "Choose who needs the support.", home: "Tell us about your household’s home.",
        familySize: "Enter the number of people who live in your household."
      },
      scheme: "Scheme", description: "What you have heard about the scheme", category: "Category",
      state: "Which state or Union Territory do you live in?", stateHelp: "Enter your state or Union Territory.",
      statePlaceholder: "State or Union Territory", age: "How old are you?", ageHelp: "Enter your age in years.",
      familySizeHelp: "An estimate is fine.",
      income: "What is your approximate annual household income?", incomeHelp: "Choose an estimate, or prefer not to say.",
      incomeOptions: ["Under ₹1 lakh", "₹1–3 lakh", "₹3–6 lakh", "₹6–10 lakh", "Above ₹10 lakh", "Prefer not to say"],
      qualification: "What is the highest level of education you have completed?", studying: "Are you currently studying?",
      eligibleCategory: "Do you belong to an eligible category?", documents: "Do you have the required documents?",
      employment: "Which best describes your current work situation?", farmland: "Do you own or lease agricultural land?",
      landRecords: "Do you have your land records?", supportFor: "Who needs this support?",
      home: "Does your household have a permanent home?", familySize: "How many people live in your household?",
      yes: "Yes", no: "No", notSure: "Not sure", studyingYes: "Yes, currently studying",
      studyingNo: "No, not currently studying", secondary: "Up to Grade 10", higherSecondary: "Up to Grade 12",
      diploma: "Diploma / ITI", graduate: "Graduate", postgraduate: "Postgraduate or higher", other: "Something else",
      general: "General", sc: "SC", st: "ST", obc: "OBC", minority: "Minority community",
      disability: "Person with a disability", preferNot: "Prefer not to say", documentsYes: "Yes, all or most",
      documentsSome: "Some documents", documentsNo: "Not yet", landOwn: "Yes, I own the land",
      landLease: "Yes, I lease the land", landNone: "No", employed: "Currently working",
      unemployed: "Looking for work", notWorking: "Not currently working", supportSelf: "For me",
      supportFamily: "For a family member", homeYes: "Yes", homeNo: "No", homeNotSure: "Not sure",
      voiceMatched: "Your spoken answer was added. Review it before continuing.",
      voiceUnmatched: "I couldn’t match that to an option. Please choose one or try saying it again.",
      voiceListening: "Listening... speak your answer.", voiceNothing: "No answer was heard. Please try again.",
      voiceButtonLabel: "Answer by voice"
    }
  };

  const eligibilityMockQuestionSets = {
    scholarship: ["state", "qualification", "studying", "income", "eligibleCategory", "documents"],
    employment: ["state", "age", "qualification", "employment", "income", "documents"],
    agriculture: ["state", "farmland", "landRecords", "income", "documents"],
    healthcare: ["state", "age", "supportFor", "income", "eligibleCategory", "documents"],
    housing: ["state", "home", "familySize", "income", "documents"],
    women: ["state", "age", "employment", "income", "eligibleCategory", "documents"],
    financial: ["state", "age", "employment", "income", "eligibleCategory", "documents"],
    general: ["state", "age", "income", "documents"]
  };

  const eligibilityQuestionDefinitions = {
    state: { type: "text" },
    age: { type: "number", min: 1, max: 120 },
    income: { type: "income" },
    qualification: { type: "choices", options: ["secondary", "higherSecondary", "diploma", "graduate", "postgraduate", "other"] },
    studying: { type: "choices", options: ["studyingYes", "studyingNo", "notSure"] },
    eligibleCategory: { type: "choices", options: ["general", "sc", "st", "obc", "minority", "disability", "preferNot"] },
    documents: { type: "choices", options: ["documentsYes", "documentsSome", "documentsNo"] },
    employment: { type: "choices", options: ["employed", "unemployed", "notWorking", "student", "other"] },
    farmland: { type: "choices", options: ["landOwn", "landLease", "landNone", "notSure"] },
    landRecords: { type: "choices", options: ["yes", "no", "notSure"] },
    supportFor: { type: "choices", options: ["supportSelf", "supportFamily"] },
    home: { type: "choices", options: ["homeYes", "homeNo", "homeNotSure"] },
    familySize: { type: "number", min: 1, max: 30 }
  };

  const eligibilityVoiceTerms = {
    yes: ["yes", "yeah", "haan", "han", "ha", "ji", "हाँ"],
    no: ["no", "nahi", "nahin", "not at all", "नहीं"],
    notSure: ["not sure", "unsure", "pata nahi", "maloom nahi", "पता नहीं"],
    studyingYes: ["student", "padhai", "padh raha", "padh rahi", "haan", "विद्यार्थी", "पढ़ाई", "हाँ"],
    studyingNo: ["not studying", "nahi padh", "no", "नहीं पढ़"],
    documentsYes: ["all documents", "most documents", "sabhi", "haan", "सभी", "हाँ"],
    documentsSome: ["some documents", "kuch documents", "kuch kagaz"],
    documentsNo: ["no documents", "not yet", "abhi nahi"],
    landOwn: ["own land", "my land", "apni zameen", "khud ki zameen", "अपनी जमीन"],
    landLease: ["lease", "leased", "theke par", "kiraye par", "पट्टे पर"],
    landNone: ["no land", "nahi", "no", "जमीन नहीं"],
    employed: ["working", "employed", "kaam kar", "naukri"],
    unemployed: ["looking for work", "job search", "kaam dhoondh", "berozgar"],
    notWorking: ["not working", "kaam nahi", "no work"],
    student: ["student", "studying", "vidyarthi"],
    supportSelf: ["for me", "myself", "mere liye", "khud ke liye"],
    supportFamily: ["family", "relative", "parivaar", "ghar ke"],
    homeYes: ["yes", "haan", "have a home", "pakka ghar", "हाँ"],
    homeNo: ["no", "nahi", "no home", "ghar nahi", "नहीं"],
    homeNotSure: ["not sure", "unsure", "pata nahi", "maloom nahi", "पता नहीं"],
    general: ["general"], sc: ["sc", "scheduled caste"], st: ["st", "scheduled tribe"],
    obc: ["obc", "other backward"], minority: ["minority"], disability: ["disability", "disabled", "viklang"],
    preferNot: ["prefer not", "skip", "nahi batana"]
  };

  const eligibilityResultCopy = {
    hi: {
      demoNotice: "केवल उदाहरण · योजना के आधिकारिक नियमों की जाँच नहीं हुई है। यह सरकारी निर्णय नहीं है।",
      statusLabels: {
        likely_eligible: "आप पात्र हो सकते हैं",
        not_eligible: "आप पात्र नहीं लगते",
        more_information_required: "अधिक जानकारी आवश्यक है"
      },
      statusReason: (scheme) => `${scheme} के लिए सत्यापित पात्रता जाँच अभी उपलब्ध नहीं है।`,
      reasoning: "आपके जवाब केवल उदाहरण के सवालों के आधार पर लिए गए हैं। उनकी तुलना योजना के मौजूदा आधिकारिक नियमों, अभिलेखों या दस्तावेज़ों से नहीं की गई है। इसलिए यह नमूना पात्रता का निर्णय नहीं दे सकता।",
      requirementLabels: {
        state: "राज्य या निवास संबंधी शर्त, यदि लागू हो",
        age: "आयु संबंधी शर्त, यदि लागू हो",
        education: "शिक्षा या नामांकन संबंधी शर्त, यदि लागू हो",
        income: "परिवार की आय संबंधी शर्त, यदि लागू हो",
        category: "श्रेणी संबंधी शर्त, यदि लागू हो",
        land: "कृषि भूमि या भूमि अभिलेख संबंधी शर्त, यदि लागू हो",
        housing: "आवास संबंधी शर्त, यदि लागू हो",
        employment: "रोज़गार या कौशल संबंधी शर्त, यदि लागू हो",
        documents: "योजना के लिए आवश्यक दस्तावेज़"
      },
      requirementDetail: (answer) => answer
        ? `आपका जवाब: ${answer}। इसकी आधिकारिक नियमों से पुष्टि नहीं हुई है।`
        : "इस शर्त की आधिकारिक योजना नियमों से पुष्टि होना बाकी है।",
      verification: "पुष्टि होना बाकी है",
      documentNote: "उदाहरण · सही सूची आधिकारिक योजना स्रोत से जाँचें",
      documents: {
        scholarship: ["पहचान का प्रमाण", "पढ़ाई या नामांकन का प्रमाण", "आय या श्रेणी प्रमाणपत्र, यदि लागू हो", "बैंक खाते का विवरण, यदि योजना माँगे"],
        employment: ["पहचान और निवास का प्रमाण", "शिक्षा या कौशल प्रमाणपत्र", "रोज़गार पंजीकरण, यदि लागू हो", "आय या श्रेणी का प्रमाण, यदि माँगा जाए"],
        agriculture: ["पहचान और बैंक खाते का विवरण", "भूमि अभिलेख, यदि लागू हों", "किसान या खेती से जुड़ा प्रमाण", "आय या श्रेणी का प्रमाण, यदि माँगा जाए"],
        healthcare: ["पहचान का प्रमाण", "राशन कार्ड या परिवार की पहचान, यदि लागू हो", "निवास का प्रमाण", "आय या श्रेणी का प्रमाण, यदि माँगा जाए"],
        housing: ["पहचान और निवास का प्रमाण", "घर या भूमि अभिलेख, यदि लागू हों", "परिवार की आय का प्रमाण", "बैंक खाते का विवरण, यदि योजना माँगे"],
        women: ["पहचान और निवास का प्रमाण", "आय का प्रमाण, यदि लागू हो", "श्रेणी या संबंधित प्रमाणपत्र, यदि माँगा जाए", "बैंक खाते का विवरण, यदि योजना माँगे"],
        financial: ["पहचान और निवास का प्रमाण", "परिवार की आय का प्रमाण", "श्रेणी का प्रमाण, यदि योजना माँगे", "बैंक खाते का विवरण, यदि सहायता खाते में मिले"],
        general: ["पहचान का प्रमाण", "निवास का प्रमाण", "आय या श्रेणी का प्रमाण, यदि योजना माँगे", "योजना में बताए गए अन्य सहायक दस्तावेज़"]
      },
      nextSteps: [
        "योजना का सही नाम और अपने राज्य के मौजूदा नियम आधिकारिक स्रोत से जाँचें।",
        "अपने जवाब और दस्तावेज़ों को आधिकारिक सूची से मिलाएँ। ज़रूरत पड़ने पर CSC या संबंधित सरकारी कार्यालय से सहायता लें।",
        "यदि आप प्रकाशित शर्तें पूरी करते हैं, तो केवल आधिकारिक पोर्टल या अधिकृत केंद्र से आवेदन करें।"
      ],
      followup: "कृपया इस योजना की आधिकारिक पात्रता शर्तें और अगले कदम समझाएँ।",
      saved: "पात्रता का परिणाम सहेजा गया",
      links: [
        { match: /pm\s*kisan/i, url: "https://pmkisan.gov.in/", label: "PM Kisan का आधिकारिक पोर्टल" },
        { match: /pm\s*[- ]?kusum/i, url: "https://pmkusum.mnre.gov.in/", label: "PM-KUSUM का आधिकारिक पोर्टल" },
        { match: /sinchai|pmksy|सिंचाई/i, url: "https://pmksy.gov.in/", label: "PMKSY का आधिकारिक पोर्टल" },
        { match: /scholar|scholarship|छात्रवृत्ति/i, url: "https://scholarships.gov.in/", label: "राष्ट्रीय छात्रवृत्ति पोर्टल" },
        { match: /pmjay|ayushman|आयुष्मान/i, url: "https://pmjay.gov.in/", label: "आयुष्मान भारत PM-JAY पोर्टल" },
        { match: /pmay.?g|awas yojana gramin|आवास योजना ग्रामीण/i, url: "https://pmayg.nic.in/", label: "PMAY-G का आधिकारिक पोर्टल" }
      ]
    },
    en: {
      demoNotice: "DEMONSTRATION ONLY · No official scheme rules were checked. This is not a government decision.",
      statusLabels: {
        likely_eligible: "Likely Eligible",
        not_eligible: "Not Eligible",
        more_information_required: "More Information Required"
      },
      statusReason: (scheme) => `No verified eligibility engine for ${scheme} is connected yet.`,
      reasoning: "Your answers were collected using demonstration questions only. They were not checked against current official scheme rules, records, or documents, so this prototype cannot determine eligibility.",
      requirementLabels: {
        state: "State or residence rule, if applicable",
        age: "Age rule, if applicable",
        education: "Education or enrollment rule, if applicable",
        income: "Household income rule, if applicable",
        category: "Category rule, if applicable",
        land: "Agricultural land or land-record rule, if applicable",
        housing: "Housing rule, if applicable",
        employment: "Employment or skill rule, if applicable",
        documents: "Documents required by the scheme"
      },
      requirementDetail: (answer) => answer
        ? `Your answer: ${answer}. It has not been checked against official rules.`
        : "This condition still needs to be checked against the official scheme rules.",
      verification: "Still needs verification",
      documentNote: "Example · confirm the exact list with an official scheme source",
      documents: {
        scholarship: ["Identity proof", "Proof of study or enrollment", "Income or category certificate, if applicable", "Bank account details, if requested by the scheme"],
        employment: ["Identity and residence proof", "Education or skill certificates", "Employment registration, if applicable", "Income or category proof, if requested"],
        agriculture: ["Identity and bank details", "Land records, if applicable", "Proof related to farming or farmer status", "Income or category proof, if requested"],
        healthcare: ["Identity proof", "Ration card or family identity, if applicable", "Residence proof", "Income or category proof, if requested"],
        housing: ["Identity and residence proof", "House or land records, if applicable", "Household income proof", "Bank details, if requested by the scheme"],
        women: ["Identity and residence proof", "Income proof, if applicable", "Category or relevant certificate, if requested", "Bank details, if requested by the scheme"],
        financial: ["Identity and residence proof", "Household income proof", "Category proof, if requested by the scheme", "Bank details, if benefits are paid to a bank"],
        general: ["Identity proof", "Residence proof", "Income or category proof, if requested", "Other supporting documents specified by the scheme"]
      },
      nextSteps: [
        "Confirm the exact scheme name and current rules for your state through an official source.",
        "Compare your answers with the official checklist. A CSC or relevant government office can help if needed.",
        "If you meet the published conditions, apply only through the official portal or an authorised centre."
      ],
      followup: "Please explain the official eligibility rules and next steps for this scheme.",
      saved: "Eligibility demonstration result saved",
      links: [
        { match: /pm\s*kisan/i, url: "https://pmkisan.gov.in/", label: "PM Kisan official portal" },
        { match: /pm\s*[- ]?kusum/i, url: "https://pmkusum.mnre.gov.in/", label: "PM-KUSUM official portal" },
        { match: /sinchai|pmksy/i, url: "https://pmksy.gov.in/", label: "PMKSY official portal" },
        { match: /scholar|scholarship/i, url: "https://scholarships.gov.in/", label: "National Scholarship Portal" },
        { match: /pmjay|ayushman/i, url: "https://pmjay.gov.in/", label: "Ayushman Bharat PM-JAY portal" },
        { match: /pmay.?g|awas yojana gramin/i, url: "https://pmayg.nic.in/", label: "PMAY-G official portal" }
      ]
    }
  };

  let eligibilityStage = "scheme";
  let eligibilityQuestions = [];
  let eligibilityQuestionIndex = 0;
  let eligibilityAnswers = {};
  let eligibilityProfile = "general";
  let eligibilityCurrentResult = null;

  function eligibilityCopy() {
    return eligibilityQuestionCopy[uiLang];
  }

  function buildEligibilityQuestions() {
    const schemeText = `${eligibilityName ? eligibilityName.value : ""} ${eligibilityDescription ? eligibilityDescription.value : ""}`.toLowerCase();
    const category = eligibilityCategory ? eligibilityCategory.value : "";
    let profile = "";
    if (/scholar|student|education|vidya|shiksha|छात्रवृत्ति|छात्र|शिक्षा/.test(schemeText)) profile = "scholarship";
    else if (/job|employment|employ|skill|rojgar|kaushal|naukri|रोजगार|नौकरी|कौशल/.test(schemeText)) profile = "employment";
    else if (/agri|farmer|kisan|farm|crop|kheti|kusum|sinchai|irrigat|किसान|कृषि|खेती|सिंचाई|फसल/.test(schemeText)) profile = "agriculture";
    else if (/health|medical|ayushman|hospital|swasthya|स्वास्थ्य|चिकित्सा|आयुष्मान/.test(schemeText)) profile = "healthcare";
    else if (/housing|house|awas|home|makan|ghar|आवास|घर|मकान/.test(schemeText)) profile = "housing";
    else if (/women|woman|mahila|nari|महिला|नारी/.test(schemeText)) profile = "women";
    if (!profile) {
      const categoryProfiles = {
        education: "scholarship", employment: "employment", agriculture: "agriculture",
        healthcare: "healthcare", housing: "housing", women: "women", financial: "financial"
      };
      profile = categoryProfiles[category] || "general";
    }
    eligibilityProfile = profile;

    return (eligibilityMockQuestionSets[profile] || eligibilityMockQuestionSets.general).map((id) => ({
      id,
      label: id,
      ...eligibilityQuestionDefinitions[id]
    }));
  }

  function updateEligibilityProgress() {
    eligibilityProgress.forEach((item) => {
      const step = item.dataset.progressStep;
      const current = step === eligibilityStage || (eligibilityStage === "review" && step === "questions");
      const complete = eligibilityStage === "review" || (eligibilityStage === "questions" && step === "scheme");
      item.classList.toggle("is-current", current);
      item.classList.toggle("is-complete", complete);
      if (current) item.setAttribute("aria-current", "step");
      else item.removeAttribute("aria-current");
    });
    const progress = eligibilityStage === "scheme"
      ? 0
      : eligibilityStage === "review"
        ? 100
        : Math.round(((eligibilityQuestionIndex + 1) / Math.max(eligibilityQuestions.length, 1)) * 100);
    if (eligibilityMeter) {
      eligibilityMeter.setAttribute("aria-valuenow", String(progress));
      eligibilityMeter.setAttribute("aria-valuetext", `${progress}%`);
    }
    if (eligibilityMeterFill) eligibilityMeterFill.style.width = `${progress}%`;
  }

  function setEligibilityStage(stage, focusHeading = true) {
    eligibilityStage = stage;
    eligibilityScreens.forEach((screen) => {
      screen.hidden = screen.dataset.eligibilityScreen !== stage;
    });
    if (eligibilityError) eligibilityError.hidden = true;
    if (eligibilityQuestionError) eligibilityQuestionError.hidden = true;
    updateEligibilityProgress();

    if (stage === "questions") renderEligibilityQuestion(focusHeading);
    if (stage === "review") {
      eligibilityCurrentResult = buildEligibilityDemoResult();
      renderEligibilitySummary();
      renderEligibilityResult(eligibilityCurrentResult);
    }

    if (focusHeading) {
      const focusTarget = stage === "questions"
        ? $("legend", eligibilityQuestionFieldset)
        : $(`[data-eligibility-screen="${stage}"] h3`);
      if (focusTarget) {
        focusTarget.setAttribute("tabindex", "-1");
        focusTarget.focus({ preventScroll: true });
      }
    }
  }

  function renderEligibilityQuestion(focusQuestion = false) {
    if (!eligibilityQuestionFieldset || !eligibilityQuestions.length) return;
    const question = eligibilityQuestions[eligibilityQuestionIndex];
    const copy = eligibilityCopy();
    eligibilityQuestionFieldset.replaceChildren();
    if (eligibilityVoiceTarget) eligibilityVoiceTarget = eligibilityQuestionFieldset;

    const legend = document.createElement("legend");
    legend.textContent = copy[question.label];
    eligibilityQuestionFieldset.appendChild(legend);

    if (["state", "income", "age", "familySize"].includes(question.id)) {
      const help = document.createElement("p");
      help.className = "eligibility-question-help";
      const helpKey = question.id === "state" ? "stateHelp" : question.id === "age" ? "ageHelp" : question.id === "familySize" ? "familySizeHelp" : "incomeHelp";
      help.textContent = copy[helpKey] || "";
      eligibilityQuestionFieldset.appendChild(help);
    }

    if (question.type === "choices") {
      const options = document.createElement("div");
      options.className = "eligibility-options";
      question.options.forEach((optionKey) => {
        const label = document.createElement("label");
        label.className = "eligibility-option";
        const input = document.createElement("input");
        input.type = "radio";
        input.name = "eligibility-answer";
        input.value = optionKey;
        input.required = true;
        input.dataset.answer = "true";
        input.checked = eligibilityAnswers[question.id] === optionKey;
        const text = document.createElement("span");
        text.textContent = copy[optionKey];
        label.append(input, text);
        options.appendChild(label);
      });
      eligibilityQuestionFieldset.appendChild(options);
    } else if (question.type === "income") {
      const select = document.createElement("select");
      select.className = "eligibility-question-input";
      select.name = "eligibility-answer";
      select.required = true;
      select.dataset.answer = "true";
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = uiLang === "en" ? "Choose an income range" : "Aay ka daayra chunein";
      select.appendChild(placeholder);
      copy.incomeOptions.forEach((option, index) => {
        const item = document.createElement("option");
        item.value = String(index);
        item.textContent = option;
        select.appendChild(item);
      });
      select.value = eligibilityAnswers[question.id] || "";
      eligibilityQuestionFieldset.appendChild(select);
    } else {
      const input = document.createElement("input");
      input.className = "eligibility-question-input";
      input.name = "eligibility-answer";
      input.type = question.type;
      input.required = true;
      input.dataset.answer = "true";
      input.setAttribute("aria-label", copy[question.label]);
      if (question.id === "state") {
        input.placeholder = copy.statePlaceholder;
        input.autocomplete = "address-level1";
      } else {
        input.min = String(question.min || 1);
        input.max = String(question.max || 120);
        input.inputMode = "numeric";
        input.placeholder = question.id === "familySize"
          ? (uiLang === "en" ? "Number of people" : "Logon ki sankhya")
          : (uiLang === "en" ? "Your age" : "Aapki umar");
      }
      input.value = eligibilityAnswers[question.id] || "";
      eligibilityQuestionFieldset.appendChild(input);
    }

    if (eligibilityQuestionCount) {
      eligibilityQuestionCount.id = "eligibility-question-count";
      eligibilityQuestionCount.textContent = copy.count(eligibilityQuestionIndex + 1, eligibilityQuestions.length);
    }
    if (eligibilityMessage) {
      eligibilityMessage.textContent = copy.assistantTips[question.id] || copy.assistantDefault;
    }
    updateEligibilityProgress();
    if (eligibilityNext) {
      const label = $("span", eligibilityNext);
      if (label) label.textContent = eligibilityQuestionIndex === eligibilityQuestions.length - 1 ? copy.review : copy.continue;
    }
    if (focusQuestion) {
      legend.setAttribute("tabindex", "-1");
      legend.focus({ preventScroll: true });
    }
  }

  function updateEligibilityVoiceAnswer(spokenText) {
    if (!eligibilityQuestionFieldset) return;
    const text = String(spokenText || "").toLowerCase().trim();
    if (!text) return;

    const radios = $$('input[type="radio"]', eligibilityQuestionFieldset);
    const select = $("select[data-answer]", eligibilityQuestionFieldset);
    let matched = false;

    if (radios.length) {
      const option = radios.find((radio) => {
        const terms = eligibilityVoiceTerms[radio.value] || [];
        return terms.some((term) => text.includes(term));
      });
      if (option) {
        option.checked = true;
        option.dispatchEvent(new Event("input", { bubbles: true }));
        option.dispatchEvent(new Event("change", { bubbles: true }));
        matched = true;
      }
    } else if (select) {
      const incomeVoiceTerms = {
        0: ["under one lakh", "less than one lakh", "ek lakh se kam", "1 lakh se kam"],
        1: ["one to three lakh", "1 to 3 lakh", "1-3 lakh", "ek se teen lakh"],
        2: ["three to six lakh", "3 to 6 lakh", "3-6 lakh", "teen se chhe lakh"],
        3: ["six to ten lakh", "6 to 10 lakh", "6-10 lakh", "chhe se das lakh"],
        4: ["above ten lakh", "over ten lakh", "10 lakh se zyada", "das lakh se zyada"],
        5: ["prefer not", "nahi batana", "not say"]
      };
      const option = Array.from(select.options).find((item) => {
        const terms = incomeVoiceTerms[item.value] || [];
        return terms.some((term) => text.includes(term));
      });
      if (option) {
        select.value = option.value;
        select.dispatchEvent(new Event("input", { bubbles: true }));
        select.dispatchEvent(new Event("change", { bubbles: true }));
        matched = true;
      }
    } else {
      const input = $("input[data-answer]", eligibilityQuestionFieldset);
      if (input) {
        input.value = text;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        matched = true;
      }
    }

    const status = $("[data-eligibility-voice-status]");
    if (status) status.textContent = matched
      ? eligibilityCopy().voiceMatched
      : eligibilityCopy().voiceUnmatched;
  }

  function saveCurrentEligibilityAnswer() {
    if (!eligibilityQuestionFieldset || !eligibilityQuestions.length) return;
    const question = eligibilityQuestions[eligibilityQuestionIndex];
    const selected = $("input[type='radio']:checked", eligibilityQuestionFieldset);
    const control = question.type === "choices" ? selected : $("[data-answer]", eligibilityQuestionFieldset);
    eligibilityAnswers[question.id] = control ? control.value.trim() : "";
  }

  function setEligibilityError(element, message) {
    if (!element) return;
    element.textContent = message;
    element.hidden = false;
  }

  function renderEligibilitySummary() {
    if (!eligibilitySummary) return;
    const copy = eligibilityCopy();
    eligibilitySummary.replaceChildren();
    const rows = [];
    const schemeName = eligibilityName ? eligibilityName.value.trim() : "";
    const schemeDescription = eligibilityDescription ? eligibilityDescription.value.trim() : "";
    const categoryOption = eligibilityCategory && eligibilityCategory.value
      ? eligibilityCategory.selectedOptions[0]
      : null;

    if (schemeName) rows.push([copy.scheme, schemeName]);
    if (schemeDescription) rows.push([copy.description, schemeDescription]);
    if (categoryOption) rows.push([copy.category, categoryOption.textContent.trim()]);

    eligibilityQuestions.forEach((question) => {
      let answer = eligibilityAnswers[question.id] || "";
      if (question.type === "income" && answer !== "") answer = copy.incomeOptions[Number(answer)] || answer;
      if (question.type === "choices") answer = copy[answer] || answer;
      rows.push([copy[question.label], answer]);
    });

    rows.forEach(([labelText, valueText]) => {
      const item = document.createElement("div");
      const label = document.createElement("dt");
      const value = document.createElement("dd");
      label.textContent = labelText;
      value.textContent = valueText;
      item.append(label, value);
      eligibilitySummary.appendChild(item);
    });
  }

  const eligibilityRequirementSets = {
    scholarship: ["state", "education", "studying", "income", "category", "documents"],
    employment: ["state", "age", "education", "employment", "income", "documents"],
    agriculture: ["state", "land", "income", "documents"],
    healthcare: ["state", "age", "income", "category", "documents"],
    housing: ["state", "housing", "income", "documents"],
    women: ["state", "age", "employment", "income", "category", "documents"],
    financial: ["state", "age", "employment", "income", "category", "documents"],
    general: ["state", "age", "income", "documents"]
  };

  const eligibilityRequirementAnswers = {
    state: "state", age: "age", education: "qualification", studying: "studying",
    income: "income", category: "eligibleCategory", land: "farmland",
    housing: "home", employment: "employment", documents: "documents"
  };

  function getEligibilityAnswerLabel(questionId) {
    const answer = eligibilityAnswers[questionId];
    if (!answer) return "";
    const question = eligibilityQuestions.find((item) => item.id === questionId);
    if (question && question.type === "income") return eligibilityCopy().incomeOptions[Number(answer)] || answer;
    return eligibilityCopy()[answer] || answer;
  }

  function buildEligibilityDemoResult() {
    const copy = eligibilityResultCopy[uiLang];
    const schemeName = eligibilityName && eligibilityName.value.trim()
      ? eligibilityName.value.trim()
      : (eligibilityDescription && eligibilityDescription.value.trim()) || (uiLang === "en" ? "the scheme you described" : "aapki batayi yojana");
    const schemeText = `${schemeName} ${eligibilityDescription ? eligibilityDescription.value : ""}`;
    const links = copy.links
      .filter((link) => link.match.test(schemeText))
      .map(({ url, label }) => ({ url, label }));

    return {
      source: "demo",
      status: "more_information_required",
      schemeName,
      reason: copy.statusReason(schemeName),
      reasoning: copy.reasoning,
      requirements: (eligibilityRequirementSets[eligibilityProfile] || eligibilityRequirementSets.general).map((key) => {
        const answerId = eligibilityRequirementAnswers[key];
        return {
          condition: copy.requirementLabels[key],
          status: "verification_required",
          detail: copy.requirementDetail(getEligibilityAnswerLabel(answerId))
        };
      }),
      documents: (copy.documents[eligibilityProfile] || copy.documents.general).map((name) => ({
        name,
        note: copy.documentNote
      })),
      nextSteps: copy.nextSteps,
      officialLinks: links
    };
  }

  function renderEligibilityResult(result) {
    if (!result) return;
    const copy = eligibilityResultCopy[uiLang];
    const validStatuses = ["likely_eligible", "not_eligible", "more_information_required"];
    const status = validStatuses.includes(result.status) ? result.status : "more_information_required";
    const statusLabels = copy.statusLabels;

    if (eligibilityResultCard) eligibilityResultCard.dataset.status = status;
    if (eligibilityResultStatusLabel) eligibilityResultStatusLabel.textContent = statusLabels[status];
    if (eligibilityResultReason) eligibilityResultReason.textContent = result.reason || "";
    if (eligibilityResultReasonDetail) eligibilityResultReasonDetail.textContent = result.reasoning || result.reason || "";
    if (eligibilityResultDemoNotice) {
      eligibilityResultDemoNotice.hidden = result.source !== "demo";
      eligibilityResultDemoNotice.textContent = copy.demoNotice;
    }

    if (eligibilityResultRequirements) {
      eligibilityResultRequirements.replaceChildren();
      (Array.isArray(result.requirements) ? result.requirements : []).forEach((requirement) => {
        const item = document.createElement("li");
        item.className = "eligibility-result-item";
        const content = document.createElement("div");
        const condition = document.createElement("p");
        condition.textContent = requirement.condition || "";
        content.appendChild(condition);
        if (requirement.detail) {
          const detail = document.createElement("p");
          detail.textContent = requirement.detail;
          content.appendChild(detail);
        }
        const badge = document.createElement("span");
        badge.className = "eligibility-result-badge";
        const allowedRequirementStatuses = ["match", "does_not_match", "verification_required"];
        const requirementStatus = allowedRequirementStatuses.includes(requirement.status)
          ? requirement.status
          : "verification_required";
        badge.dataset.status = requirementStatus;
        badge.textContent = requirement.statusLabel || (requirementStatus === "match"
          ? (uiLang === "en" ? "Matches your information" : "Aapki jaankari se milta hai")
          : requirementStatus === "does_not_match"
            ? (uiLang === "en" ? "Does not match" : "Nahi milta")
            : copy.verification);
        item.append(content, badge);
        eligibilityResultRequirements.appendChild(item);
      });
    }

    if (eligibilityResultDocuments) {
      eligibilityResultDocuments.replaceChildren();
      (Array.isArray(result.documents) ? result.documents : []).forEach((documentInfo) => {
        const item = document.createElement("li");
        const label = document.createElement("label");
        label.className = "eligibility-document-item";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = documentInfo.name || "";
        checkbox.dataset.resultDocument = "true";
        const text = document.createElement("span");
        const title = document.createElement("strong");
        title.textContent = documentInfo.name || "";
        text.appendChild(title);
        if (documentInfo.note) {
          const note = document.createElement("small");
          note.textContent = ` ${documentInfo.note}`;
          text.appendChild(note);
        }
        label.append(checkbox, text);
        item.appendChild(label);
        eligibilityResultDocuments.appendChild(item);
      });
    }

    if (eligibilityResultNextSteps) {
      eligibilityResultNextSteps.replaceChildren();
      (Array.isArray(result.nextSteps) ? result.nextSteps : []).forEach((step) => {
        const item = document.createElement("li");
        item.textContent = step;
        eligibilityResultNextSteps.appendChild(item);
      });
    }

    if (eligibilityResultLinks && eligibilityResultLinkList) {
      eligibilityResultLinkList.replaceChildren();
      (Array.isArray(result.officialLinks) ? result.officialLinks : []).forEach((officialLink) => {
        try {
          const safeUrl = new URL(officialLink.url);
          if (!['https:', 'http:'].includes(safeUrl.protocol)) return;
          const item = document.createElement("li");
          const anchor = document.createElement("a");
          anchor.href = safeUrl.href;
          anchor.target = "_blank";
          anchor.rel = "noopener noreferrer";
          anchor.textContent = officialLink.label || safeUrl.hostname;
          const icon = document.createElement("span");
          icon.className = "sr-only";
          icon.textContent = uiLang === "en" ? " (opens in a new tab)" : " (naye tab mein khulega)";
          anchor.appendChild(icon);
          item.appendChild(anchor);
          eligibilityResultLinkList.appendChild(item);
        } catch (error) {
          return;
        }
      });
      eligibilityResultLinks.hidden = eligibilityResultLinkList.children.length === 0;
    }
  }

  function downloadEligibilityResult() {
    if (!eligibilityCurrentResult) return;
    const result = eligibilityCurrentResult;
    const selectedDocuments = $$('[data-result-document]:checked').map((input) => input.value);
    const answerLines = Array.from(eligibilitySummary ? eligibilitySummary.querySelectorAll("div") : [])
      .map((row) => `${$("dt", row).textContent}: ${$("dd", row).textContent}`);
    const resultLines = [
      eligibilityResultCopy[uiLang].demoNotice,
      `${uiLang === "en" ? "Scheme" : "Yojana"}: ${result.schemeName}`,
      `${uiLang === "en" ? "Status" : "Sthiti"}: ${eligibilityResultCopy[uiLang].statusLabels[result.status]}`,
      `${uiLang === "en" ? "Reason" : "Kaaran"}: ${result.reasoning}`,
      "",
      uiLang === "en" ? "Answers shared:" : "Diye gaye jawaab:",
      ...answerLines,
      "",
      uiLang === "en" ? "Documents you marked:" : "Aapne jo documents chune:",
      ...(selectedDocuments.length ? selectedDocuments : [uiLang === "en" ? "None" : "Koi nahi"]),
      "",
      ...(result.officialLinks || []).map((link) => `${link.label}: ${link.url}`)
    ];
    const file = new Blob([resultLines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "sarthix-eligibility-demo-result.txt";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(eligibilityResultCopy[uiLang].saved);
  }

  function refreshEligibilityLanguage() {
    if (!eligibilityForm) return;
    if (eligibilityVoiceButton) eligibilityVoiceButton.setAttribute("aria-label", eligibilityCopy().voiceButtonLabel);
    if (eligibilityStage === "questions") renderEligibilityQuestion(false);
    if (eligibilityStage === "review") {
      if (eligibilityCurrentResult && eligibilityCurrentResult.source === "demo") {
        eligibilityCurrentResult = buildEligibilityDemoResult();
      }
      renderEligibilitySummary();
      renderEligibilityResult(eligibilityCurrentResult);
    }
  }

  if (eligibilityForm) {
    eligibilityForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (eligibilityStage !== "scheme") {
        if (eligibilityStage === "questions" && eligibilityNext) eligibilityNext.click();
        return;
      }
      const schemeName = eligibilityName ? eligibilityName.value.trim() : "";
      const schemeDescription = eligibilityDescription ? eligibilityDescription.value.trim() : "";
      if (!schemeName && !schemeDescription) {
        setEligibilityError(eligibilityError, eligibilityQuestionCopy[uiLang].missingScheme);
        if (eligibilityName) eligibilityName.focus();
        return;
      }
      eligibilityQuestions = buildEligibilityQuestions();
      eligibilityQuestionIndex = 0;
      eligibilityAnswers = {};
      eligibilityCurrentResult = null;
      setEligibilityStage("questions");
    });

    if (eligibilityQuestionFieldset) {
      eligibilityQuestionFieldset.addEventListener("input", saveCurrentEligibilityAnswer);
      eligibilityQuestionFieldset.addEventListener("change", saveCurrentEligibilityAnswer);
    }

    if (eligibilityVoiceButton) {
      eligibilityVoiceButton.addEventListener("click", () => {
        if (isListening) {
          if (eligibilityVoiceTarget === eligibilityQuestionFieldset) stopVoice();
          else if (eligibilityVoiceStatus) eligibilityVoiceStatus.textContent = eligibilityQuestionCopy[uiLang].voiceUnmatched;
          return;
        }
        eligibilityVoiceTarget = eligibilityQuestionFieldset;
        if (eligibilityVoiceStatus) eligibilityVoiceStatus.textContent = "";
        startVoiceFromUser();
      });
    }

    if (eligibilityNext) {
      eligibilityNext.addEventListener("click", () => {
        saveCurrentEligibilityAnswer();
        const question = eligibilityQuestions[eligibilityQuestionIndex];
        const value = eligibilityAnswers[question.id];
        const selected = $("input[type='radio']:checked", eligibilityQuestionFieldset);
        const control = selected || $("[data-answer]", eligibilityQuestionFieldset);
        if (!value || (question.type === "number" && (Number(value) < question.min || Number(value) > question.max))) {
          setEligibilityError(eligibilityQuestionError, eligibilityQuestionCopy[uiLang].missingAnswer);
          if (control) control.focus();
          return;
        }
        eligibilityQuestionError.hidden = true;
        if (eligibilityQuestionIndex < eligibilityQuestions.length - 1) {
          eligibilityQuestionIndex += 1;
          renderEligibilityQuestion(true);
        } else {
          setEligibilityStage("review");
        }
      });
    }

    const backButton = $("[data-eligibility-back]");
    if (backButton) {
      backButton.addEventListener("click", () => {
        saveCurrentEligibilityAnswer();
        if (eligibilityQuestionIndex > 0) {
          eligibilityQuestionIndex -= 1;
          renderEligibilityQuestion(true);
        } else {
          setEligibilityStage("scheme");
          if (eligibilityName) eligibilityName.focus({ preventScroll: true });
        }
      });
    }

    const editButton = $("[data-eligibility-edit]");
    if (editButton) {
      editButton.addEventListener("click", () => {
        eligibilityQuestionIndex = Math.max(eligibilityQuestions.length - 1, 0);
        setEligibilityStage("questions");
      });
    }

    const resetButton = $("[data-eligibility-reset]");
    if (resetButton) {
      resetButton.addEventListener("click", () => {
        eligibilityForm.reset();
        eligibilityAnswers = {};
        eligibilityQuestionIndex = 0;
        eligibilityQuestions = [];
        eligibilityCurrentResult = null;
        setEligibilityStage("scheme");
        if (eligibilityName) eligibilityName.focus({ preventScroll: true });
      });
    }

    if (eligibilityResultDownload) {
      eligibilityResultDownload.addEventListener("click", downloadEligibilityResult);
    }

    if (eligibilityResultFollowup) {
      eligibilityResultFollowup.addEventListener("click", () => {
        const result = eligibilityCurrentResult;
        if (!result) return;
        openChat();
        if (chatInput) {
          chatInput.value = `${eligibilityResultCopy[uiLang].followup} (${result.schemeName})`;
          chatInput.focus({ preventScroll: true });
        }
      });
    }
  }

  /* ── 12. Document intake prototype ──────────────────────────── */
  const documentApp = $("[data-document-app]");
  const documentDropzone = $("[data-document-dropzone]");
  const documentFileInput = $("[data-document-file]");
  const documentPreview = $("[data-document-preview]");
  const documentImagePreview = $("[data-document-image]");
  const documentPdfPreview = $("[data-document-pdf]");
  const documentFilename = $("[data-document-filename]");
  const documentFiletype = $("[data-document-filetype]");
  const documentPastedText = $("[data-document-text]");
  const documentAnalyseButton = $("[data-document-analyse]");
  const documentStatus = $("[data-document-status]");
  const documentAnalysisStatus = $("[data-document-analysis-status]");
  const documentIntake = $("[data-document-intake]");
  const documentPanel = $("[data-document-app]");
  const documentResults = $("[data-document-results]");
  const documentResultsTitle = $("#document-results-title");
  const documentUnclearNotice = $("[data-document-unclear]");
  const documentTypeOutput = $("[data-document-type]");
  const documentTypeEvidence = $("[data-document-type-evidence]");
  const documentExplanationOutput = $("[data-document-explanation]");
  const documentPurposeOutput = $("[data-document-purpose]");
  const documentRequestedActionOutput = $("[data-document-requested-action]");
  const documentImportantInformation = $("[data-document-important-information]");
  const documentActionList = $("[data-document-actions]");
  const documentWarningList = $("[data-document-warnings]");
  const documentLegalDisclaimer = $("[data-document-legal-disclaimer]");
  const documentQuestionForm = $("[data-document-question-form]");
  const documentQuestionInput = $("[data-document-question-input]");
  const documentQuestionVoiceButton = $("[data-document-question-voice]");
  const documentQuestionVoiceStatus = $("[data-document-question-voice-status]");
  const documentQuestionStatus = $("[data-document-question-status]");
  const documentListenButton = $("[data-document-listen]");
  const documentSpeechStatus = $("[data-document-speech-status]");
  const documentDownloadButton = $("[data-document-download]");
  const documentAnotherButton = $("[data-document-another]");
  const documentAskAnotherButton = $("[data-document-ask-another]");

  const documentUiCopy = {
    hi: {
      invalidType: "कृपया JPG, JPEG, PNG या PDF फ़ाइल चुनें।",
      fileReady: "फ़ाइल केवल इसी ब्राउज़र में दिखाई जा रही है। इसे कहीं नहीं भेजा गया है।",
      textReady: "पाठ तैयार है। इस नमूने में इसे कहीं नहीं भेजा जाएगा।",
      voiceGuide: "नोटिस या पत्र अपलोड करें, या उसका पाठ यहाँ चिपकाएँ। दस्तावेज़ विश्लेषण अभी उपलब्ध नहीं है।",
      notConnected: "दस्तावेज़ विश्लेषण अभी उपलब्ध नहीं है। आपकी सामग्री कहीं नहीं भेजी जाएगी।",
      unavailable: "विश्लेषण सेवा अभी उपलब्ध नहीं है। आपकी फ़ाइल या पाठ कहीं नहीं भेजा गया।",
      onlyOneFile: "एक बार में केवल एक दस्तावेज़ चुनें।",
      chooseFile: "JPG, JPEG, PNG या PDF दस्तावेज़ चुनें",
      pdf: "PDF दस्तावेज़", image: "चित्र", previewAlt: "अपलोड किए गए दस्तावेज़ का पूर्वावलोकन"
    },
    en: {
      invalidType: "Choose a JPG, JPEG, PNG or PDF file.",
      fileReady: "This file is previewed only in this browser. Nothing has been sent.",
      textReady: "Your text is ready. This prototype will not send it anywhere.",
      voiceGuide: "Upload the notice or letter, or paste its text. Document analysis is not connected yet.",
      notConnected: "Document analysis is not connected yet. Your content will not be sent.",
      unavailable: "The analysis service is not available yet. Your file or text was not sent.",
      onlyOneFile: "Choose one document at a time.",
      chooseFile: "Choose a JPG, JPEG, PNG or PDF document",
      pdf: "PDF document", image: "Image document", previewAlt: "Uploaded document preview"
    }
  };

  const documentResultCopy = {
    hi: {
      stated: "दस्तावेज़ में लिखा है",
      explanation: "एआई द्वारा तैयार व्याख्या",
      suggested: "समझने के लिए सुझाव",
      verify: "मूल दस्तावेज़ से जाँचें",
      sourceExcerpt: "दस्तावेज़ का अंश",
      noDetails: "इस भाग के लिए कोई जानकारी नहीं दी गई है।",
      noWarnings: "विश्लेषण में कोई विशेष चेतावनी नहीं दी गई है। फिर भी मूल दस्तावेज़ ध्यान से पढ़ें।",
      unclear: "दस्तावेज़ या उसका कुछ भाग अस्पष्ट अथवा अधूरा है। नीचे दी गई जानकारी की पुष्टि मूल दस्तावेज़ या उसके प्रेषक से करें।",
      legal: "यह व्याख्या केवल जानकारी के लिए है। यह कानूनी सलाह नहीं है और किसी योग्य कानूनी विशेषज्ञ की सलाह का विकल्प नहीं है।",
      questionUnavailable: "दस्तावेज़ के सवालों के जवाब देने की सुविधा अभी उपलब्ध नहीं है। आपका सवाल कहीं नहीं भेजा गया।",
      questionRequired: "पहले अपना सवाल लिखें।",
      voiceListening: "सुन रहा हूँ… अपना सवाल बोलें।",
      voiceMatched: "आपका सवाल लिख दिया गया है। भेजने से पहले जाँच लें।",
      voiceButtonLabel: "बोलकर सवाल पूछें",
      speechUnavailable: "इस ब्राउज़र में आवाज़ में सुनने की सुविधा उपलब्ध नहीं है। आप सार पढ़ सकते हैं।",
      saved: "दस्तावेज़ का सार सहेजा गया",
      emptyQuestion: ""
    },
    en: {
      stated: "Stated in document",
      explanation: "AI-generated explanation",
      suggested: "Suggested for understanding",
      verify: "Check against the original",
      sourceExcerpt: "Excerpt from document",
      noDetails: "No information was provided for this section.",
      noWarnings: "No specific warnings were supplied in the analysis. Still review the original document carefully.",
      unclear: "The document or part of it is unclear or incomplete. Confirm the details below with the original document or its sender.",
      legal: "This explanation is for information only. It is not legal advice and is not a substitute for advice from a qualified legal professional.",
      questionUnavailable: "Document questions are not connected yet. Your question has not been sent.",
      questionRequired: "Enter a question first.",
      voiceListening: "Listening... speak your question.",
      voiceMatched: "Your question was added. Review it before sending.",
      voiceButtonLabel: "Ask by voice",
      speechUnavailable: "Audio playback is not available in this browser. You can read the text summary.",
      saved: "Document summary saved",
      emptyQuestion: ""
    }
  };

  let localDocumentFile = null;
  let localDocumentUrl = "";
  let documentStatusKey = "notConnected";
  let documentQuestionStatusKey = "";
  let currentDocumentAnalysisResult = null;

  function documentCopy() {
    return documentUiCopy[uiLang];
  }

  function routeAssistantFeatureIntent(rawMessage, options = {}) {
    const message = String(rawMessage || "").trim();
    const normalized = message.toLowerCase();
    const hasDocumentTopic = /notice|letter|document|email|chitthi|patra|dastavez/.test(normalized);
    const hasDocumentIntent = /received|got|don't understand|dont understand|do not understand|explain|meaning|samajh nahi|samajhna|samjha/.test(normalized);
    const documentIntent = hasDocumentTopic && hasDocumentIntent;
    const scholarshipIntent = /scholarship|education|student|chatravritti|छात्रवृत्ति|शिक्षा/.test(normalized);
    const eligibilityIntent = /eligib|qualif|patrata|योग्य/.test(normalized) ||
      (scholarshipIntent && /check|whether|government|sarkari|eligible|yojana|scheme|am i/.test(normalized));

    if (!documentIntent && !eligibilityIntent) return false;
    if (chatPanel && !chatPanel.hidden) closeChat();

    let guidance = "";
    if (documentIntent) {
      const hasResult = currentDocumentAnalysisResult && documentResults && !documentResults.hidden;
      setDocumentStatus("voiceGuide");
      const documentSection = $("#understand-document");
      if (documentSection) documentSection.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
      const target = hasResult ? documentQuestionInput : $("[data-document-browse]");
      if (target) target.focus({ preventScroll: true });
      guidance = uiLang === "en"
        ? (hasResult
          ? "I opened your document summary. You can ask a question by typing or speaking."
          : "I opened the document tool. Upload the notice or letter, or paste its text. You can ask by typing or speaking.")
        : (hasResult
          ? "Maine document ka saar khol diya hai. Aap likhkar ya bolkar sawaal poochh sakte hain."
          : "Maine document tool khol diya hai. Notice ya chitthi upload karein, ya text paste karein. Aap likhkar ya bolkar sawaal poochh sakte hain.");
    } else {
      if (eligibilityForm) eligibilityForm.reset();
      eligibilityAnswers = {};
      eligibilityQuestions = [];
      eligibilityQuestionIndex = 0;
      eligibilityCurrentResult = null;

      if (scholarshipIntent && eligibilityDescription && eligibilityCategory) {
        if (eligibilityName) eligibilityName.value = "";
        eligibilityDescription.value = message;
        eligibilityCategory.value = "education";
        eligibilityQuestions = buildEligibilityQuestions();
        setEligibilityStage("questions");
        guidance = uiLang === "en"
          ? "Let’s check the scholarship step by step. First, which state or Union Territory do you live in?"
          : "Scholarship ki patrata ek-ek karke jaanchte hain. Pehle batayein, aap kis rajya ya kendra shasit pradesh mein rehte hain?";
      } else {
        setEligibilityStage("scheme");
        guidance = uiLang === "en"
          ? "I opened the eligibility check. Enter a scheme name or describe it, then we’ll go through the questions together."
          : "Maine patrata jaanch khol di hai. Yojana ka naam ya uska vivaran likhein, phir hum sawaal ek-ek karke dekhenge.";
      }

      const eligibilitySection = $("#eligibility");
      if (eligibilitySection) eligibilitySection.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
      if (!scholarshipIntent && eligibilityName) eligibilityName.focus({ preventScroll: true });
    }

    showToast(guidance);
    if (options.speak) speakAnswer(guidance);
    return true;
  }

  function setDocumentStatus(key) {
    documentStatusKey = key;
    if (documentStatus) documentStatus.textContent = documentCopy()[key];
  }

  function documentKind(file) {
    const extension = file.name.split(".").pop().toLowerCase();
    return extension === "pdf" ? documentCopy().pdf : documentCopy().image;
  }

  function formatDocumentSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function updateDocumentAvailability() {
    if (!documentAnalyseButton) return;
    const hasFile = Boolean(localDocumentFile);
    const hasText = Boolean(documentPastedText && documentPastedText.value.trim());
    documentAnalyseButton.disabled = !hasFile && !hasText;
    if (!hasFile && documentPastedText && hasText && documentStatusKey === "notConnected") {
      setDocumentStatus("textReady");
    } else if (!hasFile && !hasText && documentStatusKey === "textReady") {
      setDocumentStatus("notConnected");
    }
  }

  function releaseDocumentPreview() {
    if (localDocumentUrl) URL.revokeObjectURL(localDocumentUrl);
    localDocumentUrl = "";
  }

  function removeDocumentFile() {
    releaseDocumentPreview();
    localDocumentFile = null;
    if (documentFileInput) documentFileInput.value = "";
    if (documentFilename) documentFilename.textContent = "";
    if (documentFiletype) documentFiletype.textContent = "";
    if (documentPreview) documentPreview.hidden = true;
    if (documentDropzone) documentDropzone.hidden = false;
    if (documentImagePreview) {
      documentImagePreview.hidden = true;
      documentImagePreview.removeAttribute("src");
    }
    if (documentPdfPreview) {
      documentPdfPreview.hidden = true;
      documentPdfPreview.removeAttribute("src");
    }
    if (documentAnalysisStatus) documentAnalysisStatus.hidden = true;
    setDocumentStatus(documentPastedText && documentPastedText.value.trim() ? "textReady" : "notConnected");
    updateDocumentAvailability();
  }

  function setDocumentFile(file) {
    if (!file || !documentPreview || !documentDropzone) return;
    const extension = file.name.split(".").pop().toLowerCase();
    const acceptedMimeByExtension = {
      jpg: ["image/jpeg"], jpeg: ["image/jpeg"], png: ["image/png"], pdf: ["application/pdf"]
    };
    const acceptedMimes = acceptedMimeByExtension[extension] || [];
    if (!acceptedMimes.length || (file.type && file.type !== "application/octet-stream" && !acceptedMimes.includes(file.type))) {
      setDocumentStatus("invalidType");
      return;
    }
    if (typeof URL.createObjectURL !== "function") {
      setDocumentStatus("unavailable");
      return;
    }

    releaseDocumentPreview();
    localDocumentFile = file;
    localDocumentUrl = URL.createObjectURL(file);
    documentFilename.textContent = file.name;
    documentFiletype.textContent = `${documentKind(file)} · ${formatDocumentSize(file.size)}`;
    documentDropzone.hidden = true;
    documentPreview.hidden = false;
    if (documentAnalysisStatus) documentAnalysisStatus.hidden = true;

    const isPdf = extension === "pdf";
    if (documentImagePreview) {
      documentImagePreview.hidden = isPdf;
      documentImagePreview.alt = documentCopy().previewAlt;
      if (!isPdf) documentImagePreview.src = localDocumentUrl;
      else documentImagePreview.removeAttribute("src");
    }
    if (documentPdfPreview) {
      documentPdfPreview.hidden = !isPdf;
      if (isPdf) documentPdfPreview.src = localDocumentUrl;
      else documentPdfPreview.removeAttribute("src");
    }

    setDocumentStatus("fileReady");
    updateDocumentAvailability();
  }

  function openDocumentPicker() {
    if (!documentFileInput) return;
    documentFileInput.value = "";
    documentFileInput.click();
  }

  function maskDocumentSensitiveText(value) {
    return String(value || "")
      .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, (match) => `XXXX XXXX ${match.replace(/\D/g, "").slice(-4)}`)
      .replace(/\b[A-Z]{5}\d{4}[A-Z]\b/gi, "XXXXX****X")
      .replace(/\b\d{9,18}\b/g, (match) => `${"X".repeat(Math.max(match.length - 4, 4))}${match.slice(-4)}`);
  }

  function setDocumentEmptyState(list, text) {
    if (!list) return;
    const item = document.createElement("li");
    item.className = "document-result-empty";
    item.textContent = text;
    list.replaceChildren(item);
  }

  function appendDocumentFact(list, fact) {
    const item = document.createElement("li");
    item.className = "document-result-item";
    const title = document.createElement("strong");
    title.textContent = maskDocumentSensitiveText(fact.label || "");
    item.appendChild(title);

    if (fact.value) {
      const value = document.createElement("p");
      value.textContent = maskDocumentSensitiveText(fact.value);
      item.appendChild(value);
    }

    const sourceExcerpt = fact.sourceExcerpt || fact.evidence;
    const source = document.createElement("span");
    source.className = sourceExcerpt ? "document-source-badge" : "document-source-badge document-source-badge--explanation";
    source.textContent = sourceExcerpt ? documentResultCopy[uiLang].stated : documentResultCopy[uiLang].suggested;
    item.appendChild(source);

    if (sourceExcerpt) {
      const quote = document.createElement("p");
      quote.className = "document-result-source-quote";
      quote.textContent = `${documentResultCopy[uiLang].sourceExcerpt}: “${maskDocumentSensitiveText(sourceExcerpt)}”`;
      item.appendChild(quote);
    }
    list.appendChild(item);
  }

  function appendDocumentWarning(list, warning) {
    const item = document.createElement("li");
    item.className = "document-warning-item";
    if (warning.severity === "urgent") item.dataset.severity = "urgent";
    const title = document.createElement("strong");
    title.textContent = maskDocumentSensitiveText(warning.title || warning.label || "");
    item.appendChild(title);
    if (warning.detail || warning.text) {
      const detail = document.createElement("p");
      detail.textContent = maskDocumentSensitiveText(warning.detail || warning.text);
      item.appendChild(detail);
    }
    const sourceExcerpt = warning.sourceExcerpt || warning.evidence;
    const source = document.createElement("span");
    source.className = sourceExcerpt ? "document-source-badge" : "document-source-badge document-source-badge--explanation";
    source.textContent = sourceExcerpt ? documentResultCopy[uiLang].stated : documentResultCopy[uiLang].suggested;
    item.appendChild(source);
    if (sourceExcerpt) {
      const quote = document.createElement("p");
      quote.className = "document-result-source-quote";
      quote.textContent = `${documentResultCopy[uiLang].sourceExcerpt}: “${maskDocumentSensitiveText(sourceExcerpt)}”`;
      item.appendChild(quote);
    }
    list.appendChild(item);
  }

  function renderDocumentAnalysisResult(result, shouldFocus = true) {
    if (!result || result.source !== "backend" || !documentResults) return false;
    const type = typeof result.documentType === "string"
      ? { label: result.documentType }
      : (result.documentType || {});
    const explanation = typeof result.explanation === "string"
      ? result.explanation
      : (result.explanation && result.explanation.text) || "";
    const purpose = typeof result.purpose === "string"
      ? { text: result.purpose }
      : (result.purpose || {});
    const requestedAction = typeof result.requestedAction === "string"
      ? { text: result.requestedAction }
      : (result.requestedAction || {});
    const importantInformation = Array.isArray(result.importantInformation) ? result.importantInformation : [];
    const actionItems = Array.isArray(result.actionItems) ? result.actionItems : [];
    const warnings = Array.isArray(result.warnings) ? result.warnings : [];

    currentDocumentAnalysisResult = result;
    documentResults.hidden = false;
    if (documentIntake) documentIntake.hidden = true;
    if (documentPanel) documentPanel.classList.add("is-results");
    if (documentAnalysisStatus) documentAnalysisStatus.hidden = true;

    const typeEvidence = type.sourceExcerpt || type.evidence;
    if (documentTypeOutput) documentTypeOutput.textContent = maskDocumentSensitiveText(type.label || "");
    if (documentTypeEvidence) {
      documentTypeEvidence.textContent = typeEvidence
        ? `${documentResultCopy[uiLang].stated}: “${maskDocumentSensitiveText(typeEvidence)}”`
        : documentResultCopy[uiLang].suggested;
    }
    if (documentExplanationOutput) documentExplanationOutput.textContent = maskDocumentSensitiveText(explanation);

    if (documentPurposeOutput) {
      documentPurposeOutput.replaceChildren();
      documentPurposeOutput.appendChild(document.createTextNode(maskDocumentSensitiveText(purpose.text || "")));
      const source = document.createElement("span");
      source.className = purpose.sourceExcerpt || purpose.evidence
        ? "document-source-badge"
        : "document-source-badge document-source-badge--explanation";
      source.textContent = purpose.sourceExcerpt || purpose.evidence
        ? documentResultCopy[uiLang].stated
        : documentResultCopy[uiLang].explanation;
      documentPurposeOutput.appendChild(source);
      const sourceExcerpt = purpose.sourceExcerpt || purpose.evidence;
      if (sourceExcerpt) {
        const quote = document.createElement("span");
        quote.className = "document-result-source-quote";
        quote.textContent = ` ${documentResultCopy[uiLang].sourceExcerpt}: “${maskDocumentSensitiveText(sourceExcerpt)}”`;
        documentPurposeOutput.appendChild(quote);
      }
    }

    if (documentRequestedActionOutput) {
      documentRequestedActionOutput.replaceChildren();
      documentRequestedActionOutput.appendChild(document.createTextNode(maskDocumentSensitiveText(requestedAction.text || "")));
      documentRequestedActionOutput.hidden = !requestedAction.text;
      if (requestedAction.text) {
        const source = document.createElement("span");
        source.className = requestedAction.sourceExcerpt || requestedAction.evidence
          ? "document-source-badge"
          : "document-source-badge document-source-badge--explanation";
        source.textContent = requestedAction.sourceExcerpt || requestedAction.evidence
          ? documentResultCopy[uiLang].stated
          : documentResultCopy[uiLang].suggested;
        documentRequestedActionOutput.appendChild(source);
        const sourceExcerpt = requestedAction.sourceExcerpt || requestedAction.evidence;
        if (sourceExcerpt) {
          const quote = document.createElement("span");
          quote.className = "document-result-source-quote";
          quote.textContent = ` ${documentResultCopy[uiLang].sourceExcerpt}: “${maskDocumentSensitiveText(sourceExcerpt)}”`;
          documentRequestedActionOutput.appendChild(quote);
        }
      }
    }

    if (importantInformation.length) {
      documentImportantInformation.replaceChildren();
      importantInformation.forEach((fact) => appendDocumentFact(
        documentImportantInformation,
        typeof fact === "string" ? { label: fact } : fact
      ));
    } else {
      setDocumentEmptyState(documentImportantInformation, documentResultCopy[uiLang].noDetails);
    }

    if (actionItems.length) {
      documentActionList.replaceChildren();
      actionItems.forEach((action) => {
        const actionData = typeof action === "string" ? { text: action } : action;
        const item = document.createElement("li");
        item.appendChild(document.createTextNode(maskDocumentSensitiveText(actionData.text || "")));
        const sourceExcerpt = actionData.sourceExcerpt || actionData.evidence;
        const source = document.createElement("span");
        source.className = sourceExcerpt ? "document-source-badge" : "document-source-badge document-source-badge--explanation";
        source.textContent = sourceExcerpt ? documentResultCopy[uiLang].stated : documentResultCopy[uiLang].suggested;
        item.appendChild(source);
        documentActionList.appendChild(item);
      });
    } else {
      setDocumentEmptyState(documentActionList, documentResultCopy[uiLang].noDetails);
    }

    if (warnings.length) {
      documentWarningList.replaceChildren();
      warnings.forEach((warning) => appendDocumentWarning(
        documentWarningList,
        typeof warning === "string" ? { title: warning } : warning
      ));
    } else {
      setDocumentEmptyState(documentWarningList, documentResultCopy[uiLang].noWarnings);
    }

    const unclear = result.isUnclear === true || result.isIncomplete === true ||
      result.clarity === "unclear" || result.clarity === "incomplete" ||
      !type.label || !explanation || !purpose.text;
    if (documentUnclearNotice) {
      documentUnclearNotice.textContent = maskDocumentSensitiveText(result.clarityMessage || documentResultCopy[uiLang].unclear);
      documentUnclearNotice.hidden = !unclear;
    }

    const typeLabel = String(type.label || "").toLowerCase();
    const isLegalNotice = result.isLegalNotice === true || type.category === "legal_notice" ||
      /legal notice|court notice|kanooni notice/.test(typeLabel);
    if (documentLegalDisclaimer) documentLegalDisclaimer.hidden = !isLegalNotice;

    if (shouldFocus && documentResultsTitle) {
      documentResultsTitle.setAttribute("tabindex", "-1");
      documentResultsTitle.focus({ preventScroll: true });
    }
    return true;
  }

  function buildDocumentSummaryText(result) {
    const typeData = typeof result.documentType === "string" ? { label: result.documentType } : (result.documentType || {});
    const explanationData = typeof result.explanation === "string" ? { text: result.explanation } : (result.explanation || {});
    const purposeData = typeof result.purpose === "string" ? { text: result.purpose } : (result.purpose || {});
    const requestedActionData = typeof result.requestedAction === "string" ? { text: result.requestedAction } : (result.requestedAction || {});
    const provenance = (data) => data.sourceExcerpt || data.evidence
      ? documentResultCopy[uiLang].stated
      : documentResultCopy[uiLang].explanation;
    const lines = [
      `${uiLang === "en" ? "Document type" : "Document ka prakaar"}: ${maskDocumentSensitiveText(typeData.label || "")} [${provenance(typeData)}]`,
      `${uiLang === "en" ? "Simple explanation" : "Aasaan samjhauta"} [${documentResultCopy[uiLang].explanation}]: ${maskDocumentSensitiveText(explanationData.text || "")}`,
      `${uiLang === "en" ? "Purpose" : "Maqsad"} [${provenance(purposeData)}]: ${maskDocumentSensitiveText(purposeData.text || "")}`
    ];
    if (requestedActionData.text) {
      lines.push(`${uiLang === "en" ? "Requested action" : "Maanga gaya kadam"} [${provenance(requestedActionData)}]: ${maskDocumentSensitiveText(requestedActionData.text)}`);
    }

    lines.push("", uiLang === "en" ? "Important information:" : "Zaroori jaankari:");
    (result.importantInformation || []).forEach((fact) => {
      const item = typeof fact === "string" ? { label: fact } : fact;
      const evidence = item.sourceExcerpt || item.evidence;
      lines.push(`- ${maskDocumentSensitiveText(item.label || "")}: ${maskDocumentSensitiveText(item.value || "")} [${evidence ? documentResultCopy[uiLang].stated : documentResultCopy[uiLang].suggested}]`);
      if (evidence) lines.push(`  ${documentResultCopy[uiLang].sourceExcerpt}: ${maskDocumentSensitiveText(evidence)}`);
    });

    lines.push("", uiLang === "en" ? "Suggested next steps:" : "Sujhaaye gaye agle kadam:");
    (result.actionItems || []).forEach((action) => {
      const item = typeof action === "string" ? { text: action } : action;
      const evidence = item.sourceExcerpt || item.evidence;
      lines.push(`- ${maskDocumentSensitiveText(item.text || "")} [${evidence ? documentResultCopy[uiLang].stated : documentResultCopy[uiLang].suggested}]`);
      if (evidence) lines.push(`  ${documentResultCopy[uiLang].sourceExcerpt}: ${maskDocumentSensitiveText(evidence)}`);
    });
    lines.push("", uiLang === "en" ? "Warnings:" : "Chetavani:");
    (result.warnings || []).forEach((warning) => {
      const item = typeof warning === "string" ? { detail: warning } : warning;
      const evidence = item.sourceExcerpt || item.evidence;
      lines.push(`- ${maskDocumentSensitiveText(item.detail || item.title || "")} [${evidence ? documentResultCopy[uiLang].stated : documentResultCopy[uiLang].suggested}]`);
      if (evidence) lines.push(`  ${documentResultCopy[uiLang].sourceExcerpt}: ${maskDocumentSensitiveText(evidence)}`);
    });
    if (result.isUnclear || result.isIncomplete || result.clarity === "unclear" || result.clarity === "incomplete") {
      lines.push("", maskDocumentSensitiveText(result.clarityMessage || documentResultCopy[uiLang].unclear));
    }
    const typeLabel = String(typeof result.documentType === "string" ? result.documentType : result.documentType && result.documentType.label || "").toLowerCase();
    if (result.isLegalNotice || /legal notice|court notice|kanooni notice/.test(typeLabel)) {
      lines.push("", documentResultCopy[uiLang].legal);
    }
    return lines.join("\n");
  }

  function downloadDocumentSummary() {
    if (!currentDocumentAnalysisResult) return;
    const blob = new Blob([buildDocumentSummaryText(currentDocumentAnalysisResult)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "sarthix-document-summary.txt";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function resetDocumentExperience() {
    currentDocumentAnalysisResult = null;
    if (documentResults) documentResults.hidden = true;
    if (documentIntake) documentIntake.hidden = false;
    if (documentPanel) documentPanel.classList.remove("is-results");
    if (documentPastedText) documentPastedText.value = "";
    if (documentQuestionInput) documentQuestionInput.value = "";
    if (documentQuestionStatus) documentQuestionStatus.hidden = true;
    if (documentSpeechStatus) documentSpeechStatus.hidden = true;
    documentQuestionStatusKey = "";
    if (documentAnalysisStatus) documentAnalysisStatus.hidden = true;
    removeDocumentFile();
    const browseButton = $("[data-document-browse]");
    if (documentApp) documentApp.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
    if (browseButton) browseButton.focus({ preventScroll: true });
  }

  window.SarthiXDocumentResults = Object.freeze({
    render: renderDocumentAnalysisResult,
    reset: resetDocumentExperience
  });

  function refreshDocumentLanguage() {
    if (!documentApp) return;
    if (documentStatus) documentStatus.textContent = documentCopy()[documentStatusKey];
    if (documentAnalysisStatus && !documentAnalysisStatus.hidden) {
      documentAnalysisStatus.textContent = documentCopy().unavailable;
    }
    if (documentImagePreview) documentImagePreview.alt = documentCopy().previewAlt;
    if (documentFileInput) documentFileInput.setAttribute("aria-label", documentCopy().chooseFile);
    if (documentQuestionVoiceButton) documentQuestionVoiceButton.setAttribute("aria-label", documentResultCopy[uiLang].voiceButtonLabel);
    if (documentQuestionVoiceButton) documentQuestionVoiceButton.setAttribute("aria-label", documentResultCopy[uiLang].voiceButtonLabel);
    if (localDocumentFile && documentFiletype) {
      documentFiletype.textContent = `${documentKind(localDocumentFile)} · ${formatDocumentSize(localDocumentFile.size)}`;
    }
    if (documentQuestionStatus && !documentQuestionStatus.hidden && documentQuestionStatusKey) {
      documentQuestionStatus.textContent = documentResultCopy[uiLang][documentQuestionStatusKey];
    }
    if (documentSpeechStatus && !documentSpeechStatus.hidden) {
      documentSpeechStatus.textContent = documentResultCopy[uiLang].speechUnavailable;
    }
    updateDocumentAvailability();
    if (currentDocumentAnalysisResult) renderDocumentAnalysisResult(currentDocumentAnalysisResult, false);
  }

  if (documentApp) {
    const browseButton = $("[data-document-browse]");
    const replaceButton = $("[data-document-replace]");
    const removeButton = $("[data-document-remove]");

    if (browseButton) browseButton.addEventListener("click", openDocumentPicker);
    if (replaceButton) replaceButton.addEventListener("click", openDocumentPicker);
    if (removeButton) removeButton.addEventListener("click", removeDocumentFile);

    if (documentFileInput) {
      documentFileInput.addEventListener("change", () => {
        const files = Array.from(documentFileInput.files || []);
        if (files.length > 1) {
          setDocumentStatus("onlyOneFile");
          documentFileInput.value = "";
          return;
        }
        if (files[0]) setDocumentFile(files[0]);
      });
    }

    if (documentDropzone) {
      documentDropzone.addEventListener("dragenter", (event) => {
        event.preventDefault();
        documentDropzone.classList.add("is-dragover");
      });
      documentDropzone.addEventListener("dragover", (event) => {
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
        documentDropzone.classList.add("is-dragover");
      });
      documentDropzone.addEventListener("dragleave", (event) => {
        if (!event.relatedTarget || !documentDropzone.contains(event.relatedTarget)) {
          documentDropzone.classList.remove("is-dragover");
        }
      });
      documentDropzone.addEventListener("drop", (event) => {
        event.preventDefault();
        documentDropzone.classList.remove("is-dragover");
        const files = Array.from((event.dataTransfer && event.dataTransfer.files) || []);
        if (files.length > 1) {
          setDocumentStatus("onlyOneFile");
          return;
        }
        if (files[0]) setDocumentFile(files[0]);
      });
    }

    if (documentPastedText) {
      documentPastedText.addEventListener("input", () => {
        if (documentAnalysisStatus) documentAnalysisStatus.hidden = true;
        if (!localDocumentFile) {
          setDocumentStatus(documentPastedText.value.trim() ? "textReady" : "notConnected");
        }
        updateDocumentAvailability();
      });
    }

    if (documentAnalyseButton) {
      documentAnalyseButton.addEventListener("click", () => {
        if (documentAnalysisStatus) {
          documentAnalysisStatus.textContent = documentCopy().unavailable;
          documentAnalysisStatus.hidden = false;
          documentAnalysisStatus.classList.remove("is-error");
        }
      });
    }

    if (documentQuestionForm) {
      documentQuestionForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const question = documentQuestionInput ? documentQuestionInput.value.trim() : "";
        if (!documentQuestionStatus) return;
        documentQuestionStatusKey = question ? "questionUnavailable" : "questionRequired";
        documentQuestionStatus.textContent = documentResultCopy[uiLang][documentQuestionStatusKey];
        documentQuestionStatus.hidden = false;
      });
    }

    if (documentQuestionInput) {
      documentQuestionInput.addEventListener("input", () => {
        documentQuestionStatusKey = "";
        if (documentQuestionStatus) documentQuestionStatus.hidden = true;
        if (documentQuestionVoiceStatus) documentQuestionVoiceStatus.hidden = true;
      });
    }

    if (documentQuestionVoiceButton) {
      documentQuestionVoiceButton.addEventListener("click", () => {
        if (isListening) {
          if (documentVoiceTarget === documentQuestionInput) stopVoice();
          else if (documentQuestionVoiceStatus) {
            documentQuestionVoiceStatus.textContent = documentResultCopy[uiLang].voiceListening;
            documentQuestionVoiceStatus.hidden = false;
          }
          return;
        }
        documentVoiceTarget = documentQuestionInput;
        if (documentQuestionVoiceStatus) {
          documentQuestionVoiceStatus.textContent = "";
          documentQuestionVoiceStatus.hidden = true;
        }
        startVoiceFromUser();
      });
    }

    $$('[data-document-question]').forEach((button) => {
      button.addEventListener("click", () => {
        if (!documentQuestionInput) return;
        documentQuestionInput.value = uiLang === "en"
          ? button.dataset.en || button.dataset.documentQuestion
          : button.dataset.documentQuestion;
        documentQuestionInput.focus({ preventScroll: true });
        documentQuestionStatusKey = "";
        if (documentQuestionStatus) documentQuestionStatus.hidden = true;
      });
    });

    if (documentDownloadButton) documentDownloadButton.addEventListener("click", downloadDocumentSummary);
    if (documentListenButton) {
      documentListenButton.addEventListener("click", () => {
        if (!currentDocumentAnalysisResult) return;
        if (!("speechSynthesis" in window)) {
          if (documentSpeechStatus) {
            documentSpeechStatus.textContent = documentResultCopy[uiLang].speechUnavailable;
            documentSpeechStatus.hidden = false;
          }
          return;
        }
        if (documentSpeechStatus) documentSpeechStatus.hidden = true;
        speakAnswer(buildDocumentSummaryText(currentDocumentAnalysisResult));
      });
    }
    if (documentAnotherButton) documentAnotherButton.addEventListener("click", resetDocumentExperience);
    if (documentAskAnotherButton) {
      documentAskAnotherButton.addEventListener("click", () => {
        if (documentQuestionInput) {
          documentQuestionInput.value = "";
          documentQuestionInput.focus({ preventScroll: true });
        }
        documentQuestionStatusKey = "";
        if (documentQuestionStatus) documentQuestionStatus.hidden = true;
      });
    }

    window.addEventListener("pagehide", releaseDocumentPreview, { once: true });
    updateDocumentAvailability();
  }

  /* ── 13. Startup ─────────────────────────────────────────────── */
  $$("[data-year]").forEach((year) => {
    year.textContent = String(new Date().getFullYear());
  });

  const startLanguage = initialLanguage();
  setLanguage(
    startLanguage,
    startLanguage === "en-IN" ? "English" : "हिंदी",
    { silent: true }
  );
})();
