const langSelect = document.getElementById("lang-select");
const langMenu = document.getElementById("lang-menu");
const langCurrent = document.getElementById("lang-current");
const langOptions = langMenu.querySelectorAll('[role="option"]');
const chevron = langSelect.querySelector(".lang-chevron");
let isOpen = false;

langSelect.addEventListener("click", () => {
  isOpen = !isOpen;
  langSelect.setAttribute("aria-expanded", String(isOpen));
  langMenu.classList.toggle("is-open", isOpen);
  chevron.style.transform = isOpen ? "rotate(180deg)" : "rotate(0deg)";
});

langOptions.forEach((option) => {
  option.addEventListener("click", () => {
    langCurrent.textContent = option.textContent;
    langOptions.forEach((item) => item.setAttribute("aria-selected", "false"));
    option.setAttribute("aria-selected", "true");
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
