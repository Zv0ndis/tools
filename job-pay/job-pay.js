import { initLang } from "/assets/lang.js";

const NIGHT_WEEKEND_BONUS = 0.1;
const TAX_RATE = 0.15;
const LIMITS = { dpp: 12000, dpc: 4500 };
const LABELS = { dpp: "DPP", dpc: "DPČ" };

const copy = {
    cs: {
        title: "Výplata | Nástroje",
        h1: "Výplata",
        subtitle: "Kalkulačka výplaty z brigády (DPP / DPČ)",
        formHeading: "Zadání",
        contractLabel: "Typ dohody",
        hourlyRate: "Hodinová mzda (Kč/hod)",
        regularHours: "Odpracované hodiny: běžné",
        nightHours: "Odpracované hodiny: z toho noční / víkendové",
        resultHeading: "Výsledek",
        rowRegular: "Běžné hodiny",
        rowNight: "Příplatek za noční / víkendové hodiny (+10 %)",
        rowGross: "Hrubá odměna celkem",
        rowNet: "Odhad čisté odměny",
        disclaimer:
            "Jde o orientační výpočet pro rok 2026 (student, bez odvodů na sociální a zdravotní pojištění). Neuvažuje případné podepsané prohlášení poplatníka ani slevy na dani. Skutečná čistá odměna se může lišit.",
        locale: "cs-CZ",
        reached: (limit, label) => `Hrubá odměna dosáhla limitu ${limit} pro ${label}.`,
        below: (limit, label) => `Hrubá odměna je pod limitem ${limit} pro ${label}.`,
        tax: (pct) => `Daň z příjmu (${pct} %)`,
    },
    en: {
        title: "Job Pay | Tools",
        h1: "Job Pay",
        subtitle: "Part-time job payout calculator (DPP / DPČ)",
        formHeading: "Input",
        contractLabel: "Contract type",
        hourlyRate: "Hourly rate (Kč/hr)",
        regularHours: "Hours worked: regular",
        nightHours: "Hours worked: of which night / weekend",
        resultHeading: "Result",
        rowRegular: "Regular hours",
        rowNight: "Night / weekend bonus (+10%)",
        rowGross: "Total gross pay",
        rowNet: "Estimated net pay",
        disclaimer:
            "This is a rough estimate for 2026 (student, no social/health insurance contributions). It doesn't account for a signed taxpayer declaration or tax credits. Actual net pay may differ.",
        locale: "en-US",
        reached: (limit, label) => `Gross pay has reached the ${limit} limit for ${label}.`,
        below: (limit, label) => `Gross pay is below the ${limit} limit for ${label}.`,
        tax: (pct) => `Income tax (${pct}%)`,
    },
};

const $ = (id) => document.getElementById(id);
const form = $("payForm");
let m = copy.en;

const kc = (amount) => `${Math.round(amount).toLocaleString(m.locale)} Kč`;

function calculate() {
    const rate = parseFloat($("hourlyRate").value) || 0;
    const regularPay = rate * (parseFloat($("regularHours").value) || 0);
    const nightPay = rate * NIGHT_WEEKEND_BONUS * (parseFloat($("nightHours").value) || 0);
    const gross = regularPay + nightPay;
    const type = form.querySelector('input[name="contractType"]:checked').value;
    const over = gross >= LIMITS[type];
    const tax = gross * TAX_RATE;

    $("resRegularPay").textContent = kc(regularPay);
    $("resNightPay").textContent = kc(nightPay);
    $("resGrossTotal").textContent = kc(gross);
    const text = $("resThresholdText");
    text.textContent = (over ? m.reached : m.below)(kc(LIMITS[type]), LABELS[type]);
    text.classList.toggle("pay-threshold-over", over);
    $("resTaxRow").hidden = !over;
    $("resTaxLabel").textContent = m.tax(Math.round(TAX_RATE * 100));
    $("resTax").textContent = kc(tax);
    $("resNetTotal").textContent = kc(over ? gross - tax : gross);
}

form.addEventListener("submit", (e) => e.preventDefault());
form.addEventListener("input", calculate);
form.addEventListener("change", calculate);
initLang(copy, (l) => {
    m = copy[l];
    calculate();
});
