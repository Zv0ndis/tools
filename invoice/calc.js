// Pure helpers for the invoice page; checked by `node invoice/selfcheck.mjs`.

const num = (v) => {
    const n = parseFloat(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : 0;
};

// Amounts in cents so the sum of the lines matches the total printed under them.
export function totals(items, taxPct) {
    const lines = items.map((it) => Math.round(num(it.qty) * num(it.rate) * 100));
    const sub = lines.reduce((a, b) => a + b, 0);
    const tax = Math.round((sub * num(taxPct)) / 100);
    return { lines: lines.map((c) => c / 100), sub: sub / 100, tax: tax / 100, total: (sub + tax) / 100 };
}

// "2677001" -> "2677002", "FV-2026-009" -> "FV-2026-010"; no trailing digits -> unchanged.
export function nextNumber(n) {
    return String(n).replace(/(\d+)(?!.*\d)/, (d) => String(Number(d) + 1).padStart(d.length, "0"));
}

export const isoDate = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function addDays(iso, days) {
    const [y, m, d] = iso.split("-").map(Number);
    return isoDate(new Date(y, m - 1, d + days));
}

export function daysBetween(a, b) {
    const t = (iso) => Date.UTC(...iso.split("-").map((x, i) => Number(x) - (i === 1 ? 1 : 0)));
    return Math.round((t(b) - t(a)) / 86400000);
}
