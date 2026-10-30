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
      menuOpen: "Menu kholein",
      menuClose: "Menu band karein",
      langMenuLabel: "Bhasha chuniye",
      langChanged: (name) => `Website ki bhasha badal gayi: ${name}.`,
      voice: {
        online: "Online",
        listening: "Sun raha hai",
        micStart: "Sawaal bolne ke liye mic shuru karein",
        micStop: "Sunna band karein",
        hint: "Mic dabaiye aur apna sawaal boliye",
        listeningHint: "Suniye... Boliye...",
        interim: "Sun rahe hain...",
        final: "Aapne kaha",
        permissionTitle: "Talk to SarthiX",
        permissionDescription: "Allow microphone access so you can ask your questions naturally in your own language. Your spoken words will appear in the chat box, where you can review them before sending.",
        permissionAllow: "Allow Microphone",
        permissionCancel: "Not Now",
        noSupport: "Is browser mein voice input support nahi hai. Chrome ya Edge par try karein.",
        insecure: "Voice input ke liye page https ya localhost par kholein.",
        startFail: "Voice input shuru nahi ho saka. Dobara koshish karein.",
        recognized: "Sawaal sun liya gaya. Assistant se jawaab chat mein poochhiye.",
        nothing: "Kuch sunai nahi diya — dobara mic dabaiye.",
        stoppedWithText: "Sunna band. Aapka sawaal text mein hai.",
        stoppedEmpty: "Sunna band ho gaya. Dobara mic dabaiye.",
        errors: {
          "not-allowed": "Microphone ki permission chahiye. Browser settings mein allow karein.",
          "service-not-allowed": "Voice service is browser mein allowed nahi hai.",
          "no-speech": "Kuch sunai nahi diya. Mic ke paas bolkar dobara try karein.",
          network: "Voice service se connection nahi bana. Internet check karein.",
          "audio-capture": "Microphone nahi mila. Device settings check karein.",
          "language-not-supported": "Chuni hui bhasha is browser mein support nahi karti."
        },
        genericError: "Voice input mein dikkat aayi. Dobara koshish karein."
      },
      schemeDemo: (name) =>
        `${name} ki aadhikarik jaankari ke liye sarkari portal dekhein.`,
      chat: {
        fab: "SarthiX chat kholein",
        close: "Chat band karein",
        send: "Sawaal bhejein",
        typing: "SarthiX jawaab likh raha hai",
        error: "Connection mein dikkat aayi. Aap neeche diye topics par dobara poochh sakte hain.",
        linkNote: "Official portal"
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

    const meta = $('meta[name="description"]');
    document.title = isEnglish
      ? "SarthiX — Your Rural AI Companion"
      : "SarthiX — Aapka Grameen AI Saathi";

    if (meta) {
      meta.setAttribute(
        "content",
        isEnglish
          ? "SarthiX is a multilingual, voice-first AI companion — government schemes, farming, health and guidance, in your own language."
          : "SarthiX ek multilingual, voice-first AI saathi hai — sarkari yojanaon, kheti, swasthya aur margdarshan ki jaankari, apni bhasha mein."
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
    if (permissionDescription) permissionDescription.textContent = copy().voice.permissionDescription;
    if (permissionAllow) permissionAllow.textContent = copy().voice.permissionAllow;
    if (permissionCancelBtn) permissionCancelBtn.textContent = copy().voice.permissionCancel;
  }

  function closePermissionModal() {
    if (!permissionModal) return;
    permissionModal.hidden = true;
  }

  function setListeningUI(active) {
    if (!voiceCard || !micBtn) return;

    isListening = active;
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

  function showTranscript(text, label) {
    if (!transcript || !transcriptText) return;

    if (!text) {
      transcript.hidden = true;
      transcriptText.textContent = "";
      return;
    }

    transcript.hidden = false;
    transcriptText.textContent = text;
    if (transcriptLabel) transcriptLabel.textContent = label || copy().voice.final;

    if (chatInput && !chatInput.matches(":focus")) {
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

      if (chatInput && chatInput.value.trim() !== combined) {
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
      if (chatInput && finalTranscript.trim()) {
        populateVoiceToChatInput(finalTranscript.trim());
      }
    };

    rec.onend = function () {
      if (!isListening) {
        const cleanText = finalTranscript.trim();
        if (cleanText && chatInput) {
          populateVoiceToChatInput(cleanText);
        }
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

      if (cleanText) {
        populateVoiceToChatInput(cleanText);
        showTranscript(cleanText, copy().voice.final);
      }
    };

    return rec;
  }

  function startVoiceFromUser() {
    if (!voiceCard || !micBtn) return;

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
    if (chatInput) chatInput.focus({ preventScroll: true });
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
      if (voiceStatus) {
        voiceStatus.classList.remove("is-error");
        voiceStatus.textContent = copy().voice.hint;
      }
    });
  }

  if (permissionBackdrop) {
    permissionBackdrop.addEventListener("click", closePermissionModal);
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
          "<p>Kheti ke liye yojana chunna aapki zameen, rajya aur parivaar ki sthiti par depend karta hai.</p>" +
          "<p><strong>PM Kisan Samman Nidhi</strong> — eligible kisan parivaaron ke liye aarthik sahayata.</p>" +
          "<p><strong>PM-KUSUM</strong> — solar pump aur renewable energy se judi yojana.</p>" +
          "<p><strong>PM Krishi Sinchayee Yojana</strong> — sinchai aur paani ke behtar upyog ke liye.</p>" +
          "<p>Final patrata aur kist ki sthiti ke liye apne Block Agriculture Office ya official portal par check karein.</p>",
        en:
          "<p>Choosing a farming scheme depends on your land, state and family situation.</p>" +
          "<p><strong>PM Kisan Samman Nidhi</strong> — financial support for eligible farmer families.</p>" +
          "<p><strong>PM-KUSUM</strong> — a scheme linked to solar pumps and renewable energy.</p>" +
          "<p><strong>PM Krishi Sinchayee Yojana</strong> — support for irrigation and better water use.</p>" +
          "<p>For final eligibility and instalment status, check with your Block Agriculture Office or the official portal.</p>"
      },
      links: [
        { href: "https://pmkisan.gov.in/", label: { hi: "PM Kisan portal", en: "PM Kisan portal" } },
        { href: "https://pmkusum.mnre.gov.in/", label: { hi: "PM-KUSUM portal", en: "PM-KUSUM portal" } },
        { href: "https://pmksy.gov.in/", label: { hi: "PMKSY portal", en: "PMKSY portal" } }
      ]
    },
    {
      id: "sinchai",
      keywords: ["sinchai", "sinchayee", "irrigation", "paani", "pani", "water", "borewell", "सिंचाई", "पानी"],
      body: {
        hi:
          "<p>Sinchai ke liye <strong>Pradhan Mantri Krishi Sinchayee Yojana (PMKSY)</strong> ek main kendriya yojana hai — iska maksad khet tak paani pahunchana aur drip/sprinkler jaise tarikon ko badhava dena hai.</p>" +
          "<p>Rajya sarkarein apni alag sinchai aur borewell/subsidy yojanaen bhi chalati hain. Aavedan se pehle apne Jila Krishi Vibhag ya Sinchai Vibhag se apne kshetra ki yojana confirm karein.</p>",
        en:
          "<p><strong>Pradhan Mantri Krishi Sinchayee Yojana (PMKSY)</strong> is the main central scheme for irrigation — it aims to bring water to fields and promote drip and sprinkler systems.</p>" +
          "<p>State governments also run their own irrigation and borewell/subsidy schemes. Before applying, confirm the scheme for your area with your District Agriculture or Irrigation Department.</p>"
      },
      links: [
        { href: "https://pmksy.gov.in/", label: { hi: "PMKSY official site", en: "PMKSY official site" } }
      ]
    },
    {
      id: "solar",
      keywords: ["solar", "kusum", "pump", "bijli", "renewable", "urja", "सोलर", "पंप", "ऊर्जा"],
      body: {
        hi:
          "<p><strong>PM-KUSUM Yojana</strong> kheti mein solar pump aur renewable energy ko badhava deti hai. Iske components mein solar pump lagwana aur krishi pump ki solarisation shamil hai.</p>" +
          "<p>Available components, subsidy aur aavedan ki prakriya rajya ke hisaab se badalti hai. Apne rajya ki Renewable Energy Agency (REDA) ya DISCOM ki official website par latest detail dekhein.</p>",
        en:
          "<p><strong>PM-KUSUM Yojana</strong> promotes solar pumps and renewable energy in farming. Its components include installing solar pumps and solarising agricultural pumps.</p>" +
          "<p>Available components, subsidy and the application process differ by state. Check your State Renewable Energy Agency (REDA) or DISCOM website for the latest details.</p>"
      },
      links: [
        { href: "https://pmkusum.mnre.gov.in/", label: { hi: "PM-KUSUM portal", en: "PM-KUSUM portal" } }
      ]
    },
    {
      id: "awas",
      keywords: ["awas", "ghar", "house", "housing", "pmay", "makan", "chhat", "घर", "आवास"],
      body: {
        hi:
          "<p>Gramin kshetra mein pucca ghar ke liye <strong>Pradhan Mantri Awas Yojana — Gramin (PMAY-G)</strong> ki jaankari dekhein.</p>" +
          "<p>Patrata, beneficiary list aur installments ki sthiti ke liye apne Gram Panchayat se sampark karein ya official portal par apna naam check karein.</p>",
        en:
          "<p>For a pucca house in rural areas, look at <strong>Pradhan Mantri Awas Yojana — Gramin (PMAY-G)</strong>.</p>" +
          "<p>For eligibility, the beneficiary list and instalment status, contact your Gram Panchayat or check your name on the official portal.</p>"
      },
      links: [
        { href: "https://pmayg.nic.in/", label: { hi: "PMAY-G portal", en: "PMAY-G portal" } }
      ]
    },
    {
      id: "swasthya",
      keywords: ["swasthya", "health", "ilaaj", "hospital", "ayushman", "pmjay", "bima", "dawa", "स्वास्थ्य", "इलाज", "अस्पताल"],
      body: {
        hi:
          "<p><strong>Ayushman Bharat — PM-JAY</strong> eligible parivaaron ke liye sarkari health cover ki yojana hai. Iske liye Ayushman card aur eligibility check zaroori hai.</p>" +
          "<p>Apne nazdeeki CSC, sarkari hospital ke Ayushman help desk ya official portal par card aur patrata ki jaankari lein. Emergency mein nazdeeki sarkari hospital ya 108 ambulance se sampark karein.</p>",
        en:
          "<p><strong>Ayushman Bharat — PM-JAY</strong> is a government health cover scheme for eligible families. You need an Ayushman card and an eligibility check.</p>" +
          "<p>Get card and eligibility details at your nearest CSC, the Ayushman help desk at a government hospital, or the official portal. In an emergency, contact the nearest government hospital or the 108 ambulance service.</p>"
      },
      links: [
        { href: "https://pmjay.gov.in/", label: { hi: "PM-JAY portal", en: "PM-JAY portal" } }
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
      "hi-IN": "हिन्दी",
      "en-IN": "English",
      "gu-IN": "ગુજરાતી",
      "mr-IN": "मराठी",
      "ta-IN": "தமிழ்",
      "te-IN": "తెలుగు",
      "pa-IN": "ਪੰਜਾਬੀ",
      "bn-IN": "বাংলা"
    };
    return names[code] || "हिन्दी";
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

    if (question) {
      sendChatMessage(question);
    } else if (!chatBusy) {
      window.setTimeout(() => {
        if (chatInput) chatInput.focus({ preventScroll: true });
      }, prefersReducedMotion ? 0 : 160);
    }

    scrollChat();
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

  /* ── 11. Startup ─────────────────────────────────────────────── */
  $$("[data-year]").forEach((year) => {
    year.textContent = String(new Date().getFullYear());
  });

  const startLanguage = initialLanguage();
  setLanguage(
    startLanguage,
    startLanguage === "en-IN" ? "English" : "हिन्दी",
    { silent: true }
  );
})();
