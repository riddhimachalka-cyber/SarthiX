const panelTrack = document.getElementById("auth-panel-track");
const signupPanel = document.getElementById("signup-panel");
const authShell = document.querySelector(".login-shell");

let signupLoaded = false;
let signupLoad = null;
let activePanel = "login";

async function loadSignupPanel() {
  if (signupLoaded) return;
  if (signupLoad) return signupLoad;

  signupLoad = (async () => {
    const response = await fetch("signup.html?embed=1");
    if (!response.ok) throw new Error(`Signup form request failed (${response.status}).`);

    const html = await response.text();
    const signupDocument = new DOMParser().parseFromString(html, "text/html");
    const signupCard = signupDocument.querySelector(".signup-card");
    const signupToast = signupDocument.querySelector("#signup-toast");
    if (!signupCard || !signupToast) throw new Error("Signup form markup is incomplete.");

    const signInLink = signupCard.querySelector(".signup-footer a");
    if (signInLink) {
      signInLink.href = "#login";
      signInLink.dataset.authTab = "login";
    }

    signupPanel.replaceChildren(signupCard);
    document.body.appendChild(signupToast);
    await import("./signup.js");
    signupLoaded = true;
  })();

  try {
    await signupLoad;
  } finally {
    signupLoad = null;
  }
}

function updateSelectedPanel(panel) {
  activePanel = panel;
  panelTrack.dataset.activePanel = panel;
  authShell.classList.toggle("is-signup", panel === "signup");
  const loginPanel = document.getElementById("login-panel");
  loginPanel.setAttribute("aria-hidden", String(panel !== "login"));
  loginPanel.inert = panel !== "login";
  signupPanel.setAttribute("aria-hidden", String(panel !== "signup"));
  signupPanel.inert = panel !== "signup";

  document.querySelectorAll("#login-tab, #signup-tab").forEach((tab) => {
    const selected = tab.dataset.authTab === panel;
    tab.classList.toggle("is-active", selected);
    tab.setAttribute("aria-selected", String(selected));
  });
}

async function selectPanel(panel, updateUrl = true) {
  if (panel === "signup") {
    updateSelectedPanel(panel);
    if (updateUrl) window.history.replaceState(null, "", "#signup");
    try {
      await loadSignupPanel();
    } catch (error) {
      console.error("Could not load the signup form.", error);
      signupPanel.replaceChildren();
      const message = document.createElement("p");
      message.className = "auth-load-error";
      message.textContent = "We could not load signup. Please refresh the page and try again.";
      signupPanel.appendChild(message);
      return;
    }
    if (activePanel === "signup") window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  updateSelectedPanel("login");
  if (updateUrl) window.history.replaceState(null, "", "#login");
}

document.addEventListener("click", (event) => {
  const tab = event.target.closest("[data-auth-tab]");
  if (!tab) return;
  event.preventDefault();
  selectPanel(tab.dataset.authTab);
});

window.addEventListener("hashchange", () => {
  selectPanel(window.location.hash === "#signup" ? "signup" : "login", false);
});

selectPanel(window.location.hash === "#signup" ? "signup" : "login", false);
