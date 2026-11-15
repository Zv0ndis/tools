// Language for every tools page: ?lang= (links from zvondis.dev), then the saved choice,
// then the browser. Fills [data-t] from the page's copy plus the shared rail strings.

const RAIL = {
    cs: { navTools: "Nástroje", navShips: "Lodě", navAria: "Stránky", skip: "Přeskočit na obsah" },
    en: { navTools: "Tools", navShips: "Battleships", navAria: "Pages", skip: "Skip to content" },
};
const HOME = { cs: "https://zvondis.dev/", en: "https://zvondis.dev/en/" };

function pick() {
    const asked = new URLSearchParams(location.search).get("lang");
    if (asked === "cs" || asked === "en") return asked;
    let saved = null;
    try {
        saved = localStorage.getItem("lang");
    } catch {}
    if (saved === "cs" || saved === "en") return saved;
    return navigator.language.startsWith("cs") ? "cs" : "en";
}

// copy: { cs: {...}, en: {...} } with a `title` per language. onChange(lang) runs after each switch.
export function initLang(copy, onChange = () => {}) {
    const button = document.getElementById("lang");
    const set = (l) => {
        const m = { ...RAIL[l], ...copy[l] };
        document.documentElement.lang = l;
        if (m.title) document.title = m.title;
        for (const el of document.querySelectorAll("[data-t]")) el.textContent = m[el.dataset.t];
        for (const el of document.querySelectorAll("[data-t-aria]"))
            el.setAttribute("aria-label", m[el.dataset.tAria]);
        for (const el of document.querySelectorAll("[data-home]")) el.href = HOME[l];
        button.textContent = l === "en" ? "CZ" : "EN";
        button.lang = l === "en" ? "cs" : "en";
        button.setAttribute("aria-label", l === "en" ? "CZ, přepnout do češtiny" : "EN, switch to English");
        button.dataset.lang = l;
        try {
            localStorage.setItem("lang", l);
        } catch {}
        onChange(l);
    };
    button.addEventListener("click", () => set(button.dataset.lang === "en" ? "cs" : "en"));
    set(pick());
}
