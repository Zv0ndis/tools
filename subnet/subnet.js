// Subnet calculator. The math functions are pure so selfcheck.mjs can run them in node;
// the page wiring at the bottom only runs in a browser. Nothing leaves the browser.

const MAX_ROWS = 64;
const ALL6 = (1n << 128n) - 1n;

// Thrown codes are keys into copy.*.errors.
const fail = (code) => {
    throw new Error(code);
};

// ---------- IPv4 ----------

const OCTET = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;

// Strict dotted quad to an unsigned 32-bit number, or null. Leading zeros are refused (octal ambiguity).
export function v4(text) {
    const parts = String(text).split(".");
    if (parts.length !== 4 || !parts.every((p) => OCTET.test(p))) return null;
    return parts.reduce((n, p) => n * 256 + Number(p), 0);
}

export const toV4 = (n) => [24, 16, 8, 0].map((s) => (n >>> s) & 255).join(".");

export const toBin = (n) => n.toString(2).padStart(32, "0").match(/.{8}/g).join(".");

export const prefixMask = (p) => (p === 0 ? 0 : (0xffffffff << (32 - p)) >>> 0);

// Prefix length of a contiguous mask, or -1.
export function maskToPrefix(mask) {
    const p = mask.toString(2).padStart(32, "0").indexOf("0");
    const len = p === -1 ? 32 : p;
    return prefixMask(len) === mask ? len : -1;
}

// "10.0.0.1/24", "10.0.0.1/255.255.255.0", "10.0.0.1 255.255.255.0" or a bare address (/32).
export function parseV4(text) {
    const [ip, rest, extra] = text.trim().split(/\s*\/\s*|\s+/);
    const addr = v4(ip);
    if (addr === null || extra !== undefined) fail("v4bad");
    if (rest === undefined) return { addr, prefix: 32 };
    if (/^\d+$/.test(rest)) {
        if (Number(rest) > 32) fail("v4prefix");
        return { addr, prefix: Number(rest) };
    }
    const mask = v4(rest);
    if (mask === null) fail("v4bad");
    const prefix = maskToPrefix(mask);
    if (prefix === -1) fail("v4mask");
    return { addr, prefix };
}

// /31 is a point-to-point link (RFC 3021): both addresses are hosts, no broadcast. /32 is one host.
export function v4info(addr, prefix) {
    const mask = prefixMask(prefix);
    const network = (addr & mask) >>> 0;
    const total = 2 ** (32 - prefix);
    const top = network + total - 1;
    const info = { addr, prefix, mask, wildcard: ~mask >>> 0, network, total };
    if (prefix >= 31) return { ...info, broadcast: null, first: network, last: top, hosts: total };
    return { ...info, broadcast: top, first: network + 1, last: top - 1, hosts: total - 2 };
}

// Smallest prefix that gives at least n subnets of /prefix.
export function prefixForCount(prefix, n) {
    if (!Number.isInteger(n) || n < 1) fail("splitBad");
    let bits = 0;
    while (2 ** bits < n) bits++;
    if (prefix + bits > 32) fail("splitBig");
    return prefix + bits;
}

// The first MAX_ROWS subnets of /newPrefix inside network/prefix, and how many there are.
export function v4split(network, prefix, newPrefix) {
    if (!Number.isInteger(newPrefix) || newPrefix > 32) fail("v4prefix");
    if (newPrefix <= prefix) fail("splitSmall");
    const count = 2 ** (newPrefix - prefix);
    const size = 2 ** (32 - newPrefix);
    const subnets = [];
    for (let i = 0; i < Math.min(count, MAX_ROWS); i++)
        subnets.push(v4info(network + i * size, newPrefix));
    return { count, subnets };
}

// ---------- IPv6 ----------

const HEX = /^[0-9a-f]{1,4}$/i;

// "2001:db8::1/64", "::ffff:192.0.2.1", or a bare address (/128). Zone ids are refused.
export function parseV6(text) {
    let [s, p, extra] = text.trim().split("/");
    if (extra !== undefined) fail("v6bad");
    let prefix = 128;
    if (p !== undefined) {
        if (!/^\d{1,3}$/.test(p) || Number(p) > 128) fail("v6prefix");
        prefix = Number(p);
    }
    const dotted = s.match(/^(.*:)(\d+\.[\d.]+)$/);
    if (dotted) {
        const n = v4(dotted[2]);
        if (n === null) fail("v6bad");
        s = dotted[1] + (n >>> 16).toString(16) + ":" + (n & 0xffff).toString(16);
    }
    const halves = s.split("::");
    if (halves.length > 2) fail("v6bad");
    const groups = (h) => (h === "" ? [] : h.split(":"));
    const head = groups(halves[0]);
    const tail = halves.length === 2 ? groups(halves[1]) : [];
    const gap = 8 - head.length - tail.length;
    if (![...head, ...tail].every((g) => HEX.test(g))) fail("v6bad");
    if (halves.length === 2 ? gap < 1 : gap !== 0) fail("v6bad");
    const all = [...head, ...Array(halves.length === 2 ? gap : 0).fill("0"), ...tail];
    return { addr: all.reduce((a, g) => (a << 16n) | BigInt("0x" + g), 0n), prefix };
}

const groups6 = (n) =>
    Array.from({ length: 8 }, (_, i) => Number((n >> BigInt(112 - i * 16)) & 0xffffn));

export const expand6 = (n) =>
    groups6(n)
        .map((g) => g.toString(16).padStart(4, "0"))
        .join(":");

// RFC 5952: lowercase, no leading zeros, the longest run (first on a tie) of two or more zero groups becomes "::".
export function compress6(n) {
    const g = groups6(n);
    let best = -1;
    let bestLen = 1;
    for (let i = 0; i < 8;) {
        let j = i;
        while (j < 8 && g[j] === 0) j++;
        if (j - i > bestLen) [best, bestLen] = [i, j - i];
        i = j === i ? i + 1 : j;
    }
    const hex = g.map((x) => x.toString(16));
    if (best === -1) return hex.join(":");
    return hex.slice(0, best).join(":") + "::" + hex.slice(best + bestLen).join(":");
}

export function v6info(addr, prefix) {
    const host = (1n << BigInt(128 - prefix)) - 1n;
    const network = addr & (ALL6 ^ host);
    return { addr, prefix, network, last: network | host, count: host + 1n };
}

// ---------- Page ----------

const copy = {
    cs: {
        title: "Kalkulačka podsítí | Nástroje",
        h1: "Kalkulačka podsítí",
        subtitle: "Rozsah, maska a rozdělení sítě pro IPv4 a IPv6",
        v4Heading: "IPv4",
        v4Label: "Adresa s prefixem nebo maskou",
        v4Note: "Např. 192.168.1.10/24 nebo 192.168.1.10 255.255.255.0. Bez prefixu se bere /32.",
        splitHeading: "Rozdělení",
        splitLegend: "Rozdělit podle",
        modeCount: "Počtu podsítí",
        modePrefix: "Nového prefixu",
        labelCount: "Počet podsítí",
        labelPrefix: "Nový prefix (číslo za lomítkem)",
        splitNote: "Dělí síť z pole IPv4 výše. Vypíše nejvýš 64 podsítí.",
        v6Heading: "IPv6",
        v6Label: "Adresa IPv6 s prefixem",
        v6Note: "Např. 2001:db8::1/64. Bez prefixu se bere /128. Zóna (%eth0) se nepodporuje.",
        privacy: "Vše se počítá ve tvém prohlížeči, nic se nikam neodesílá.",
        locale: "cs-CZ",
        rows: {
            address: "Adresa",
            network: "Síť",
            broadcast: "Broadcast",
            first: "První host",
            last: "Poslední host",
            hosts: "Použitelných hostů",
            total: "Adres celkem",
            mask: "Maska",
            wildcard: "Wildcard maska",
            binary: "Binárně",
            expanded: "Plný zápis",
            compressed: "Zkrácený zápis",
            lastAddr: "Poslední adresa",
            count: "Počet adres",
        },
        none31: "žádný (/31, spoj bod-bod podle RFC 3021)",
        none32: "žádný (/32, jediná adresa)",
        summary: (n, p, size, hosts) =>
            `Podsítě /${p}: ${n}, v každé ${size} adres a ${hosts} hostů.`,
        rounded: "Počet je zaokrouhlený nahoru na mocninu dvou.",
        more: (n) => `…a dalších ${n}.`,
        errors: {
            v4bad: "Zadej adresu IPv4 ve tvaru 192.168.1.10/24.",
            v4prefix: "Prefix musí být 0 až 32.",
            v4mask: "Maska musí být souvislá, třeba 255.255.255.0.",
            splitBad: "Zadej celé kladné číslo.",
            splitBig: "Tolik podsítí se do sítě nevejde.",
            splitSmall: "Nový prefix musí být delší než prefix sítě.",
            splitNeedV4: "Nejdřív zadej platnou síť IPv4 výše.",
            v6bad: "Zadej adresu IPv6, třeba 2001:db8::1/64.",
            v6prefix: "Prefix musí být 0 až 128.",
        },
    },
    en: {
        title: "Subnet Calculator | Tools",
        h1: "Subnet Calculator",
        subtitle: "Range, mask and network splits for IPv4 and IPv6",
        v4Heading: "IPv4",
        v4Label: "Address with prefix or mask",
        v4Note: "For example 192.168.1.10/24 or 192.168.1.10 255.255.255.0. Without a prefix, /32 is used.",
        splitHeading: "Split",
        splitLegend: "Split by",
        modeCount: "Number of subnets",
        modePrefix: "New prefix",
        labelCount: "Number of subnets",
        labelPrefix: "New prefix (number after the slash)",
        splitNote: "Splits the network from the IPv4 field above. Lists at most 64 subnets.",
        v6Heading: "IPv6",
        v6Label: "IPv6 address with prefix",
        v6Note: "For example 2001:db8::1/64. Without a prefix, /128 is used. Zone IDs (%eth0) are not supported.",
        privacy: "Everything is calculated in your browser; nothing is sent anywhere.",
        locale: "en-US",
        rows: {
            address: "Address",
            network: "Network",
            broadcast: "Broadcast",
            first: "First host",
            last: "Last host",
            hosts: "Usable hosts",
            total: "Total addresses",
            mask: "Mask",
            wildcard: "Wildcard mask",
            binary: "Binary",
            expanded: "Expanded",
            compressed: "Compressed",
            lastAddr: "Last address",
            count: "Address count",
        },
        none31: "none (/31, point-to-point link per RFC 3021)",
        none32: "none (/32, a single address)",
        summary: (n, p, size, hosts) =>
            `${n} subnets of /${p}, ${size} addresses and ${hosts} usable hosts each.`,
        rounded: "The count is rounded up to a power of two.",
        more: (n) => `…and ${n} more.`,
        errors: {
            v4bad: "Enter an IPv4 address like 192.168.1.10/24.",
            v4prefix: "The prefix must be 0 to 32.",
            v4mask: "The mask must be contiguous, like 255.255.255.0.",
            splitBad: "Enter a whole positive number.",
            splitBig: "That many subnets don't fit in this network.",
            splitSmall: "The new prefix must be longer than the network's prefix.",
            splitNeedV4: "Enter a valid IPv4 network above first.",
            v6bad: "Enter an IPv6 address like 2001:db8::1/64.",
            v6prefix: "The prefix must be 0 to 128.",
        },
    },
};

if (typeof document !== "undefined") {
    const { initLang } = await import("/assets/lang.js");
    const $ = (id) => document.getElementById(id);
    let m = copy.en;

    const el = (tag, className, text) => {
        const e = document.createElement(tag);
        if (className) e.className = className;
        if (text !== undefined) e.textContent = text;
        return e;
    };
    const row = (label, value, total) => {
        const d = el("div", total ? "result-row result-total" : "result-row");
        d.append(el("span", null, label), el("span", null, value));
        return d;
    };
    const num = (n) => n.toLocaleString(m.locale);
    // Runs fn and puts its rows, or the error it threw, into root.
    const fill = (root, fn) => {
        try {
            root.replaceChildren(...fn());
        } catch (e) {
            root.replaceChildren(el("p", "error", m.errors[e.message] ?? e.message));
        }
    };

    const ipv4 = () => {
        const text = $("v4In").value;
        return text.trim() ? parseV4(text) : null;
    };

    function renderV4() {
        fill($("v4Out"), () => {
            const p = ipv4();
            if (!p) return [];
            const i = v4info(p.addr, p.prefix);
            const r = m.rows;
            const none = i.prefix === 32 ? m.none32 : m.none31;
            return [
                row(r.address, toV4(i.addr)),
                row(r.network, `${toV4(i.network)}/${i.prefix}`),
                row(r.broadcast, i.broadcast === null ? none : toV4(i.broadcast)),
                row(r.first, toV4(i.first)),
                row(r.last, toV4(i.last)),
                row(r.mask, toV4(i.mask)),
                row(r.wildcard, toV4(i.wildcard)),
                row(r.total, num(i.total)),
                row(r.hosts, num(i.hosts), true),
                el("h3", null, r.binary),
                row(r.address, toBin(i.addr)),
                row(r.mask, toBin(i.mask)),
                row(r.network, toBin(i.network)),
            ];
        });
    }

    function renderSplit() {
        const byCount = $("splitForm").elements.mode.value === "count";
        $("splitLabel").textContent = byCount ? m.labelCount : m.labelPrefix;
        fill($("splitOut"), () => {
            let p = null;
            try {
                p = ipv4();
            } catch {}
            if (!p) fail("splitNeedV4");
            const value = $("splitIn").value.trim();
            if (!value) return [];
            if (!/^\d+$/.test(value)) fail("splitBad");
            const net = v4info(p.addr, p.prefix);
            const newPrefix = byCount ? prefixForCount(p.prefix, Number(value)) : Number(value);
            const { count, subnets } = v4split(net.network, p.prefix, newPrefix);
            const out = [
                el(
                    "p",
                    null,
                    m.summary(num(count), newPrefix, num(subnets[0].total), num(subnets[0].hosts)),
                ),
            ];
            if (byCount && count !== Number(value)) out.push(el("p", "note", m.rounded));
            const list = el("div");
            for (const s of subnets)
                list.append(
                    row(
                        `${toV4(s.network)}/${s.prefix}`,
                        s.first === s.last ? toV4(s.first) : `${toV4(s.first)} - ${toV4(s.last)}`,
                    ),
                );
            out.push(list);
            if (count > subnets.length)
                out.push(el("p", "note", m.more(num(count - subnets.length))));
            return out;
        });
    }

    function renderV6() {
        fill($("v6Out"), () => {
            const text = $("v6In").value;
            if (!text.trim()) return [];
            const p = parseV6(text);
            const i = v6info(p.addr, p.prefix);
            const r = m.rows;
            const count = i.prefix === 128 ? "1" : `2^${128 - i.prefix} = ${num(i.count)}`;
            return [
                row(r.compressed, compress6(i.addr)),
                row(r.expanded, expand6(i.addr)),
                row(r.network, `${compress6(i.network)}/${i.prefix}`),
                row(r.lastAddr, compress6(i.last)),
                row(r.count, count, true),
            ];
        });
    }

    for (const form of document.querySelectorAll("form"))
        form.addEventListener("submit", (e) => e.preventDefault());
    $("v4Form").addEventListener("input", () => {
        renderV4();
        renderSplit();
    });
    $("splitForm").addEventListener("input", renderSplit);
    $("v6Form").addEventListener("input", renderV6);
    initLang(copy, (l) => {
        m = copy[l];
        renderV4();
        renderSplit();
        renderV6();
    });
}
