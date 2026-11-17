// JSON / Base64 / JWT decoder. The functions above the page wiring are pure so selfcheck.mjs
// can run them in node; the wiring at the bottom only runs in a browser. Nothing leaves the browser.

// Errors carry a code the page turns into words in the current language.
const fail = (code, extra) => {
    throw Object.assign(new Error(code), { code, ...extra });
};

const WS = " \t\n\r";

// Where JSON.parse gave up, found by a strict walk, so the position is the same in every browser.
// Returns the offset of the first bad character (text.length for an unexpected end).
function jsonErrorAt(s) {
    let i = 0;
    const stop = () => {
        throw i;
    };
    const ws = () => {
        while (i < s.length && WS.includes(s[i])) i++;
    };
    const word = (w) => {
        for (const c of w)
            if (s[i] === c) i++;
            else stop();
    };
    const str = () => {
        i++;
        while (i < s.length) {
            const c = s[i];
            if (c === '"') return i++;
            if (c < " ") stop();
            if (c === "\\") {
                i++;
                if (s[i] === "u") {
                    if (!/^[0-9a-fA-F]{4}$/.test(s.slice(i + 1, i + 5))) stop();
                    i += 5;
                } else if (i < s.length && '"\\/bfnrt'.includes(s[i])) i++;
                else stop();
            } else i++;
        }
        stop();
    };
    const NUM = /-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/y;
    const value = () => {
        ws();
        const c = s[i];
        if (c === "{" || c === "[") {
            const end = c === "{" ? "}" : "]";
            i++;
            ws();
            if (s[i] === end) return i++;
            for (;;) {
                if (c === "{") {
                    ws();
                    if (s[i] !== '"') stop();
                    str();
                    ws();
                    if (s[i] !== ":") stop();
                    i++;
                }
                value();
                ws();
                if (s[i] === ",") i++;
                else if (s[i] === end) return i++;
                else stop();
            }
        }
        if (c === '"') return str();
        if (c === "t") return word("true");
        if (c === "f") return word("false");
        if (c === "n") return word("null");
        NUM.lastIndex = i;
        if (!NUM.test(s)) stop();
        i = NUM.lastIndex;
    };
    try {
        value();
        ws();
        return i < s.length ? i : -1;
    } catch (at) {
        return typeof at === "number" ? at : -1; // -1: too deep to walk, position unknown
    }
}

// Parses JSON or throws { code: "json", line, col, ch } (ch empty at an unexpected end).
export function jsonParse(text) {
    try {
        return JSON.parse(text);
    } catch {
        const at = jsonErrorAt(text);
        if (at < 0) fail("json");
        const before = text.slice(0, at).split("\n");
        fail("json", {
            line: before.length,
            col: [...before.at(-1)].length + 1,
            ch: [...text.slice(at)][0] ?? "",
        });
    }
}

// Re-indents valid JSON token by token, so numbers, key order and duplicate keys stay exactly as typed.
function reflow(s, indent) {
    let out = "";
    let depth = 0;
    const nl = () => (indent ? "\n" + indent.repeat(depth) : "");
    for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (c === '"') {
            let j = i + 1;
            while (s[j] !== '"') j += s[j] === "\\" ? 2 : 1;
            out += s.slice(i, j + 1);
            i = j;
        } else if (c === "{" || c === "[") {
            let j = i + 1;
            while (WS.includes(s[j])) j++;
            if (s[j] === "}" || s[j] === "]") {
                out += c + s[j];
                i = j;
            } else {
                depth++;
                out += c + nl();
            }
        } else if (c === "}" || c === "]") {
            depth--;
            out += nl() + c;
        } else if (c === ",") out += "," + nl();
        else if (c === ":") out += indent ? ": " : ":";
        else if (!WS.includes(c)) out += c;
    }
    return out;
}

export function jsonFormat(text, indent = "  ") {
    jsonParse(text);
    return reflow(text, indent);
}

export const jsonMinify = (text) => jsonFormat(text, "");

const utf8 = new TextDecoder("utf-8", { fatal: true });

export function b64Encode(text, url = false) {
    const b64 = btoa(
        Array.from(new TextEncoder().encode(text), (b) => String.fromCharCode(b)).join(""),
    );
    return url ? b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") : b64;
}

// Accepts both alphabets, missing padding and line breaks.
export function b64Decode(text) {
    let bin;
    try {
        bin = atob(text.replace(/-/g, "+").replace(/_/g, "/").replace(/\s+/g, ""));
    } catch {
        fail("b64Invalid");
    }
    try {
        return utf8.decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
    } catch {
        fail("b64NotUtf8");
    }
}

// Reads a JWT without checking its signature. now is in milliseconds.
export function jwtDecode(token, now = Date.now()) {
    const parts = token
        .trim()
        .replace(/^Bearer\s+/i, "")
        .split(".");
    if (parts.length === 5) fail("jwe");
    if (parts.length !== 3) fail("jwtParts");
    const [header, payload] = ["header", "payload"].map((part, n) => {
        try {
            const text = b64Decode(parts[n]);
            const value = JSON.parse(text);
            if (value && typeof value === "object" && !Array.isArray(value)) return { text, value };
        } catch {}
        fail("jwtPart", { part });
    });
    const claim = (k) => payload.value[k];
    const secs = (k) => (typeof claim(k) === "number" ? claim(k) * 1000 : null);
    const exp = secs("exp");
    const nbf = secs("nbf");
    const status =
        exp !== null && exp <= now
            ? "expired"
            : nbf !== null && nbf > now
              ? "notYet"
              : exp !== null
                ? "valid"
                : "noExp";
    return {
        header: reflow(header.text, "  "),
        payload: reflow(payload.text, "  "),
        alg: header.value.alg,
        times: { iat: claim("iat"), nbf: claim("nbf"), exp: claim("exp") },
        status,
    };
}

const copy = {
    cs: {
        title: "Dekodér | Nástroje",
        h1: "Dekodér",
        subtitle: "JSON, Base64 a JWT: formátování, kódování a čtení tokenů",
        formHeading: "Zadání",
        modeLabel: "Režim",
        inLabel: "Text ke zpracování",
        urlSafe: "Base64URL (znaky bezpečné pro URL, bez = na konci)",
        format: "Formátovat",
        minify: "Minifikovat",
        validate: "Ověřit",
        encode: "Zakódovat",
        decode: "Dekódovat",
        jwtDecode: "Přečíst token",
        privacy: "Vše běží jen ve tvém prohlížeči, nic se nikam neodesílá.",
        resultHeading: "Výsledek",
        headerLabel: "Hlavička",
        output: "Výstup",
        payload: "Obsah (payload)",
        copy: "Kopírovat výstup",
        showErr: "Ukázat ve vstupu",
        rowAlg: "Algoritmus (alg)",
        rowIat: "Vydáno (iat)",
        rowNbf: "Platí od (nbf)",
        rowExp: "Platí do (exp)",
        rowStatus: "Stav",
        sigNote:
            "Podpis se NEOVĚŘUJE. Token se jen přečte, takže z toho nepoznáš, jestli je pravý.",
        locale: "cs-CZ",
        msgs: {
            empty: "Nejdřív vlož text.",
            valid: "Platný JSON.",
            formatted: "Platný JSON, naformátováno.",
            minified: "Platný JSON, minifikováno.",
            encoded: "Zakódováno.",
            decoded: "Dekódováno.",
            jwt: "Token přečten.",
            copied: "Zkopírováno.",
            json: "Neplatný JSON.",
            jsonAt: (l, c) => `Neplatný JSON na řádku ${l}, sloupci ${c}: `,
            badChar: (ch) => `nečekaný znak „${ch}“.`,
            end: "nečekaný konec vstupu.",
            b64Invalid:
                "Tohle není platný Base64. Povolená jsou písmena A-Z a a-z, číslice, + a / (nebo - a _) a = na konci.",
            b64NotUtf8: "Dekódovaná data nejsou text v UTF-8, nejspíš jde o binární soubor.",
            jwe: "Tohle je šifrovaný token (JWE, pět částí). Bez klíče se přečíst nedá.",
            jwtParts: "Token musí mít tři části oddělené tečkou: hlavička.obsah.podpis.",
            jwtPart: (part) =>
                `${part === "header" ? "Hlavička" : "Obsah"} tokenu není platný JSON objekt v Base64URL.`,
            none: "neuvedeno",
            badTime: (v) => `neplatná hodnota ${v}`,
            status: {
                expired: "Platnost vypršela",
                notYet: "Ještě neplatí",
                valid: "Časově platný",
                noExp: "Bez data vypršení",
            },
        },
    },
    en: {
        title: "Decoder | Tools",
        h1: "Decoder",
        subtitle: "JSON, Base64 and JWT: format, encode and read tokens",
        formHeading: "Input",
        modeLabel: "Mode",
        inLabel: "Text to process",
        urlSafe: "Base64URL (URL-safe characters, no = padding)",
        format: "Format",
        minify: "Minify",
        validate: "Validate",
        encode: "Encode",
        decode: "Decode",
        jwtDecode: "Decode token",
        privacy: "Everything runs in your browser only; nothing is sent anywhere.",
        resultHeading: "Result",
        headerLabel: "Header",
        output: "Output",
        payload: "Payload",
        copy: "Copy output",
        showErr: "Show in input",
        rowAlg: "Algorithm (alg)",
        rowIat: "Issued at (iat)",
        rowNbf: "Not before (nbf)",
        rowExp: "Expires (exp)",
        rowStatus: "Status",
        sigNote:
            "The signature is NOT verified. The token is only read, so this does not tell you whether it is genuine.",
        locale: "en-GB",
        msgs: {
            empty: "Paste some text first.",
            valid: "Valid JSON.",
            formatted: "Valid JSON, formatted.",
            minified: "Valid JSON, minified.",
            encoded: "Encoded.",
            decoded: "Decoded.",
            jwt: "Token decoded.",
            copied: "Copied.",
            json: "Invalid JSON.",
            jsonAt: (l, c) => `Invalid JSON at line ${l}, column ${c}: `,
            badChar: (ch) => `unexpected character “${ch}”.`,
            end: "unexpected end of input.",
            b64Invalid:
                "This is not valid Base64. Allowed are letters A-Z and a-z, digits, + and / (or - and _) and = at the end.",
            b64NotUtf8: "The decoded data is not UTF-8 text; it is probably a binary file.",
            jwe: "This is an encrypted token (JWE, five parts). It cannot be read without the key.",
            jwtParts: "A token needs three parts separated by dots: header.payload.signature.",
            jwtPart: (part) => `The token ${part} is not a valid Base64URL JSON object.`,
            none: "not set",
            badTime: (v) => `invalid value ${v}`,
            status: {
                expired: "Expired",
                notYet: "Not valid yet",
                valid: "Valid by time",
                noExp: "No expiry",
            },
        },
    },
};

if (typeof document !== "undefined") {
    const { initLang } = await import("/assets/lang.js");
    const $ = (id) => document.getElementById(id);
    const form = $("decForm");
    const input = $("decIn");
    const out = $("decOut");
    const head = $("decHead");
    let lang = "en";
    let mode = "json";
    let state = null; // what the result area shows, kept so a language switch can redraw it

    const ACTIONS = {
        format: () => [jsonFormat(input.value), "formatted"],
        minify: () => [jsonMinify(input.value), "minified"],
        validate: () => (jsonParse(input.value), [null, "valid"]),
        encode: () => [b64Encode(input.value, $("decUrl").checked), "encoded"],
        decode: () => [b64Decode(input.value), "decoded"],
        jwt: () => {
            const jwt = jwtDecode(input.value);
            head.value = jwt.header;
            return [jwt.payload, "jwt", jwt];
        },
    };

    const when = (v) => {
        if (v === undefined) return copy[lang].msgs.none;
        if (typeof v !== "number") return copy[lang].msgs.badTime(JSON.stringify(v));
        const d = new Date(v * 1000);
        return isNaN(d)
            ? copy[lang].msgs.badTime(v)
            : d.toLocaleString(copy[lang].locale, { dateStyle: "medium", timeStyle: "long" });
    };

    const render = () => {
        const m = copy[lang].msgs;
        const s = state ?? {};
        const e = s.error;
        $("decErr").textContent = !e
            ? ""
            : e.code === "json" && e.line
              ? m.jsonAt(e.line, e.col) + (e.ch ? m.badChar(e.ch) : m.end)
              : e.code === "jwtPart"
                ? m.jwtPart(e.part)
                : (m[e.code] ?? e.message);
        $("decShowErr").hidden = !e?.line;
        $("decMsg").textContent = s.msg ? m[s.msg] : "";
        $("decJwt").hidden = !s.jwt;
        if (s.jwt) {
            $("decAlg").textContent = s.jwt.alg === undefined ? m.none : String(s.jwt.alg);
            for (const k of ["iat", "nbf", "exp"]) $("dec-" + k).textContent = when(s.jwt.times[k]);
            $("decStatus").textContent = m.status[s.jwt.status];
        }
        $("decCopy").hidden = !out.value;
        $("decOutLabel").textContent = copy[lang][mode === "jwt" ? "payload" : "output"];
    };

    const run = (action) => {
        out.value = head.value = "";
        if (!input.value.trim()) state = { error: { code: "empty" } };
        else
            try {
                const [text, msg, jwt] = ACTIONS[action]();
                if (text !== null) out.value = text;
                state = { msg, jwt };
            } catch (error) {
                state = { error };
            }
        render();
    };

    const setMode = () => {
        mode = form.querySelector('input[name="mode"]:checked').value;
        for (const el of document.querySelectorAll("[data-mode]"))
            el.hidden = el.dataset.mode !== mode;
        state = null;
        out.value = head.value = "";
        render();
    };

    form.addEventListener("submit", (e) => e.preventDefault());
    for (const r of form.querySelectorAll('input[name="mode"]'))
        r.addEventListener("change", setMode);
    for (const b of form.querySelectorAll("[data-action]"))
        b.addEventListener("click", () => run(b.dataset.action));
    $("decShowErr").addEventListener("click", () => {
        const { line, col } = state.error;
        const lines = input.value.split("\n");
        const at =
            lines.slice(0, line - 1).join("\n").length +
            (line > 1) +
            [...lines[line - 1]].slice(0, col - 1).join("").length;
        input.focus();
        input.setSelectionRange(at, at + 1);
    });
    $("decCopy").addEventListener("click", async () => {
        try {
            await navigator.clipboard.writeText(out.value);
            state = { ...state, error: null, msg: "copied" };
        } catch {
            out.select(); // no clipboard permission: leave it selected for Ctrl+C
        }
        render();
    });
    initLang(copy, (l) => {
        lang = l;
        render();
    });
    setMode();
}
