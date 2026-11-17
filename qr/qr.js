import { initLang } from "/assets/lang.js";
import { encode, toSvg, capacity } from "/qr/encode.js";

const PNG_SCALE = 10; // pixels per module
const BORDER = 4; // quiet zone in modules, as the standard asks

const copy = {
    cs: {
        title: "QR kód | Nástroje",
        h1: "QR kód",
        subtitle: "Udělá z textu nebo odkazu QR kód ke stažení jako PNG nebo SVG",
        formHeading: "Zadání",
        textLabel: "Text nebo odkaz",
        levelLabel: "Oprava chyb (kolik kódu smí být poškozeno)",
        levelL: "L (7 %)",
        levelM: "M (15 %)",
        levelQ: "Q (25 %)",
        levelH: "H (30 %)",
        privacy: "Kód vzniká ve tvém prohlížeči, nic se nikam neodesílá.",
        resultHeading: "Výsledek",
        empty: "Napiš text nebo vlož odkaz.",
        rowVersion: "Verze",
        rowSize: "Velikost",
        rowLength: "Délka",
        dlPng: "Stáhnout PNG",
        dlSvg: "Stáhnout SVG",
        note: "Než kód vytiskneš, vyzkoušej ho telefonem. Vyšší oprava chyb dá větší kód, který vydrží špínu i poškození.",
        alt: "QR kód se zadaným textem",
        size: (n) => `${n} × ${n} modulů`,
        length: (n, max) => `${n} z ${max} bajtů`,
        tooLong: (n, level, max) =>
            `Text je moc dlouhý: má ${n} bajtů a při opravě ${level} se vejde nejvýš ${max}. Zkrať ho nebo zvol nižší opravu chyb.`,
    },
    en: {
        title: "QR Code | Tools",
        h1: "QR Code",
        subtitle: "Turns text or a link into a QR code to download as PNG or SVG",
        formHeading: "Input",
        textLabel: "Text or link",
        levelLabel: "Error correction (how much of the code may be damaged)",
        levelL: "L (7%)",
        levelM: "M (15%)",
        levelQ: "Q (25%)",
        levelH: "H (30%)",
        privacy: "The code is made in your browser; nothing is sent anywhere.",
        resultHeading: "Result",
        empty: "Type some text or paste a link.",
        rowVersion: "Version",
        rowSize: "Size",
        rowLength: "Length",
        dlPng: "Download PNG",
        dlSvg: "Download SVG",
        note: "Scan the code with your phone before you print it. Higher error correction makes a larger code that survives dirt and damage.",
        alt: "QR code with the text above",
        size: (n) => `${n} × ${n} modules`,
        length: (n, max) => `${n} of ${max} bytes`,
        tooLong: (n, level, max) =>
            `The text is too long: it has ${n} bytes and level ${level} fits at most ${max}. Shorten it or pick a lower error correction.`,
    },
};

const $ = (id) => document.getElementById(id);
const form = $("qrForm");
let m = copy.en;
let qr = null;

function render() {
    const text = $("qrText").value;
    const level = form.querySelector('input[name="level"]:checked').value;
    const bytes = new TextEncoder().encode(text).length;
    const max = capacity(40, level);
    qr = null;
    $("qrError").textContent = "";
    if (text && bytes <= max) qr = encode(text, level);
    else if (text) $("qrError").textContent = m.tooLong(bytes, level, max);

    $("qrEmpty").hidden = Boolean(text);
    for (const id of ["qrInfo", "qrPicture", "qrDownload"]) $(id).hidden = !qr;
    if (!qr) return;
    $("qrVersion").textContent = qr.version;
    $("qrSize").textContent = m.size(qr.size);
    $("qrLength").textContent = m.length(bytes, max);
    $("qrImage").alt = m.alt;
    $("qrImage").src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(toSvg(qr, BORDER));
}

function save(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: filename });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
}

$("qrSvg").addEventListener("click", () => {
    save(new Blob([toSvg(qr, BORDER)], { type: "image/svg+xml;charset=utf-8" }), "qr-code.svg");
});

$("qrPng").addEventListener("click", () => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = (qr.size + BORDER * 2) * PNG_SCALE;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000";
    qr.modules.forEach((row, y) =>
        row.forEach((dark, x) => {
            if (dark)
                ctx.fillRect(
                    (x + BORDER) * PNG_SCALE,
                    (y + BORDER) * PNG_SCALE,
                    PNG_SCALE,
                    PNG_SCALE,
                );
        }),
    );
    canvas.toBlob((blob) => save(blob, "qr-code.png"), "image/png");
});

form.addEventListener("submit", (e) => e.preventDefault());
form.addEventListener("input", render);
initLang(copy, (l) => {
    m = copy[l];
    render();
});
