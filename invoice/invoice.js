import { initLang } from "/assets/lang.js";
import { totals, nextNumber, isoDate, addDays, daysBetween, num, isNum } from "/invoice/calc.js";

const copy = {
    cs: {
        title: "Faktura | Nástroje",
        h1: "Faktura",
        subtitle: "Vyplňte údaje a uložte fakturu jako PDF",
        formHeading: "Údaje",
        partiesHeading: "Dodavatel a odběratel",
        invoiceHeading: "Faktura",
        payHeading: "Platba",
        logoHeading: "Logo",
        logoLabel: "Obrázek (nepovinné)",
        logoRemove: "Odebrat logo",
        fromLabel: "Dodavatel",
        toLabel: "Odběratel",
        fromPh: "Jméno a příjmení\nUlice 12\n602 00 Brno\nIČO 12345678",
        toPh: "Firma s.r.o.\nUlice 34\n110 00 Praha\nIČO 87654321",
        payPh: "Číslo účtu 123456789/0100\nVariabilní symbol 2026001",
        sumSub: "Mezisoučet",
        sumTax: "DPH",
        sumTotal: "Celkem",
        itemAmount: "Částka",
        notNumber: "Zadejte číslo, třeba 1 500 nebo 99,50.",
        taxNotNumber: "DPH musí být číslo, třeba 21.",
        dueIn: (d) => (d === 0 ? "Splatné v den vystavení." : `Splatné za ${d} ${d === 1 ? "den" : d < 5 ? "dny" : "dní"}.`),
        dueBefore: "Datum splatnosti je před datem vystavení.",
        numberLabel: "Číslo faktury",
        currencyLabel: "Měna",
        dateLabel: "Datum vystavení",
        dueLabel: "Datum splatnosti",
        itemsLabel: "Položky",
        addItem: "Přidat položku",
        taxLabel: "DPH (%)",
        payLabel: "Platební údaje",
        notesLabel: "Poznámka (nepovinné)",
        print: "Uložit jako PDF",
        next: "Další faktura",
        reset: "Vymazat",
        resetTemplate: "Obnovit šablonu",
        saveTemplate: "Uložit jako šablonu",
        forgetTemplate: "Zapomenout šablonu",
        templateSaved: "Šablona uložena. „Obnovit šablonu“ ji vrátí s dnešním datem.",
        templateForgotten: "Šablona zapomenuta.",
        privacy: "Vše zůstává v tomto prohlížeči. Formulář se tu uchová, dokud ho nevymažete.",
        previewHeading: "Náhled",
        itemDesc: "Popis",
        itemQty: "Množství",
        itemRate: "Cena",
        itemRemove: "Odebrat",
        itemRemoveAria: (n) => `Odebrat položku ${n}`,
        locale: "cs-CZ",
        sInvoice: "Faktura",
        sDate: "Datum vystavení:",
        sDue: "Splatnost:",
        sBalance: "K úhradě:",
        sBillTo: "Odběratel:",
        sItem: "Položka",
        sQty: "Množství",
        sRate: "Cena",
        sAmount: "Celkem",
        sSub: "Mezisoučet:",
        sTax: (p) => `DPH (${p} %):`,
        sTotal: "Celkem:",
        sPay: "Platební údaje:",
        sNotes: "Poznámka:",
    },
    en: {
        title: "Invoice | Tools",
        h1: "Invoice",
        subtitle: "Fill in the details and save the invoice as a PDF",
        formHeading: "Details",
        partiesHeading: "From and to",
        invoiceHeading: "Invoice",
        payHeading: "Payment",
        logoHeading: "Logo",
        logoLabel: "Image (optional)",
        logoRemove: "Remove logo",
        fromLabel: "From",
        toLabel: "Bill to",
        fromPh: "Your name\nStreet 12\nCity, postcode\nCountry",
        toPh: "Client Ltd\nStreet 34\nCity, postcode\nVAT ID",
        payPh: "Bank, IBAN and BIC / SWIFT",
        sumSub: "Subtotal",
        sumTax: "Tax",
        sumTotal: "Total",
        itemAmount: "Amount",
        notNumber: "Enter a number, like 1500 or 99.50.",
        taxNotNumber: "Tax must be a number, like 21.",
        dueIn: (d) => (d === 0 ? "Due on the invoice date." : `Due in ${d} day${d === 1 ? "" : "s"}.`),
        dueBefore: "The due date is before the invoice date.",
        numberLabel: "Invoice number",
        currencyLabel: "Currency",
        dateLabel: "Date",
        dueLabel: "Due date",
        itemsLabel: "Items",
        addItem: "Add item",
        taxLabel: "Tax (%)",
        payLabel: "Payment details",
        notesLabel: "Notes (optional)",
        print: "Save as PDF",
        next: "Next invoice",
        reset: "Clear",
        resetTemplate: "Reset to template",
        saveTemplate: "Save as template",
        forgetTemplate: "Forget template",
        templateSaved: "Template saved. “Reset to template” brings it back with today's date.",
        templateForgotten: "Template forgotten.",
        privacy: "Everything stays in this browser. The form is kept here until you clear it.",
        previewHeading: "Preview",
        itemDesc: "Description",
        itemQty: "Quantity",
        itemRate: "Rate",
        itemRemove: "Remove",
        itemRemoveAria: (n) => `Remove item ${n}`,
        locale: "en-US",
        sInvoice: "Invoice",
        sDate: "Date:",
        sDue: "Due Date:",
        sBalance: "Balance Due:",
        sBillTo: "Bill To:",
        sItem: "Item",
        sQty: "Quantity",
        sRate: "Rate",
        sAmount: "Amount",
        sSub: "Subtotal:",
        sTax: (p) => `Tax (${p}%):`,
        sTotal: "Total:",
        sPay: "Payment details:",
        sNotes: "Notes:",
    },
};

const KEY = "invoice";
const $ = (id) => document.getElementById(id);
const form = $("invForm");
let m = copy.en;
const TKEY = "invoice-template";
let served = null; // template.json, served next to the page only on the private copy (zvondis.dev/invoice)
let own = null; // template saved in this browser with "Save as template"; wins over the served one
const template = () => own ?? served;

function blank() {
    const today = isoDate(new Date());
    return {
        logo: "",
        from: "",
        to: "",
        number: "1",
        currency: "CZK",
        date: today,
        due: addDays(today, 14),
        items: [{ desc: "", qty: "1", rate: "" }],
        tax: "0",
        payment: "",
        notes: "",
    };
}

// A template gets today's dates; its number is only the first one, later ones come from "Next invoice".
function fresh() {
    const t = template();
    if (!t) return blank();
    const today = isoDate(new Date());
    return { ...blank(), ...structuredClone(t), date: today, due: addDays(today, t.dueDays ?? 14) };
}

function load(key = KEY) {
    try {
        const saved = JSON.parse(localStorage.getItem(key));
        if (saved && Array.isArray(saved.items)) return saved;
    } catch {
        // private window or blocked storage: start fresh
    }
    return null;
}

own = load(TKEY);
let state = load() ?? fresh();

function save(key = KEY, value = state) {
    try {
        if (value) localStorage.setItem(key, JSON.stringify(value));
        else localStorage.removeItem(key);
    } catch {
        // storage full or blocked: the page still works, it just won't remember
    }
}

function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
}

let amountEls = []; // per item: [amount span, error line, qty input, rate input]

function field(label, value, onInput, cls, attrs = {}) {
    const l = el("label", `field ${cls}`);
    const i = el("input");
    i.type = "text";
    i.autocomplete = "off";
    i.value = value;
    Object.assign(i, attrs);
    i.addEventListener("input", () => onInput(i.value));
    l.append(el("span", "", label), i);
    return [l, i];
}

function renderItems() {
    amountEls = [];
    $("items").replaceChildren(
        ...state.items.map((it, n) => {
            const li = el("li", "inv-item");
            const set = (k) => (v) => {
                it[k] = v;
                update();
            };
            const [desc] = field(m.itemDesc, it.desc, set("desc"), "inv-desc");
            const [qtyL, qty] = field(m.itemQty, it.qty, set("qty"), "inv-qty", { inputMode: "decimal" });
            const [rateL, rate] = field(m.itemRate, it.rate, set("rate"), "inv-rate", { inputMode: "decimal" });
            const amount = el("div", "field inv-amount");
            const value = el("output");
            amount.append(el("span", "", m.itemAmount), value);
            const remove = el("button", "text-link inv-remove", m.itemRemove);
            remove.type = "button";
            remove.setAttribute("aria-label", m.itemRemoveAria(n + 1));
            remove.hidden = state.items.length === 1;
            remove.addEventListener("click", () => {
                state.items.splice(n, 1);
                renderItems();
                update();
                const items = $("items").children;
                items[Math.min(n, items.length - 1)].querySelector("input").focus();
            });
            const error = el("p", "error");
            error.id = `itemError${n}`;
            qty.setAttribute("aria-describedby", error.id);
            rate.setAttribute("aria-describedby", error.id);
            const nums = el("div", "inv-nums");
            nums.append(qtyL, rateL, amount, remove);
            li.append(desc, nums, error);
            amountEls.push([value, error, qty, rate]);
            return li;
        }),
    );
    refreshForm();
}

function money(n) {
    try {
        return new Intl.NumberFormat(m.locale, { style: "currency", currency: state.currency }).format(n);
    } catch {
        return n.toFixed(2);
    }
}

// The parts of the form that are computed: line amounts, totals, the due-date hint and number errors.
function refreshForm() {
    const t = totals(state.items, state.tax);
    amountEls.forEach(([value, error, qty, rate], i) => {
        value.textContent = money(t.lines[i] ?? 0);
        const bad = [qty, rate].filter((x) => !isNum(x.value));
        for (const x of [qty, rate]) x.toggleAttribute("aria-invalid", bad.includes(x));
        error.textContent = bad.length ? m.notNumber : "";
    });
    const tax = form.elements.tax;
    tax.toggleAttribute("aria-invalid", !isNum(tax.value));
    $("taxError").textContent = isNum(tax.value) ? "" : m.taxNotNumber;
    $("sumSub").textContent = money(t.sub);
    $("sumTax").textContent = money(t.tax);
    $("sumTotal").textContent = money(t.total);
    const days = state.date && state.due ? daysBetween(state.date, state.due) : null;
    const hint = $("dueHint");
    hint.textContent = days == null ? "" : days < 0 ? m.dueBefore : m.dueIn(days);
    hint.classList.toggle("error", days != null && days < 0);
}

function fillForm() {
    for (const k of ["from", "to", "number", "currency", "date", "due", "tax", "payment", "notes"]) form.elements[k].value = state[k];
    $("logo").value = "";
    $("logoRemove").hidden = !state.logo;
    renderItems();
}

function lines(parent, text, firstBold) {
    text.split("\n").forEach((line, i) => parent.append(el("div", firstBold && i === 0 ? "inv-strong" : "", line || " "))); // nbsp keeps blank lines
}

function pair(label, value, cls = "") {
    const r = el("div", `inv-pair ${cls}`);
    r.append(el("span", "inv-mute", label), el("span", "", value));
    return r;
}

function renderSheet() {
    const date = (iso) => {
        const [y, mo, d] = (iso || "").split("-").map(Number);
        return y ? new Intl.DateTimeFormat(m.locale, { dateStyle: "medium" }).format(new Date(y, mo - 1, d)) : "";
    };
    const t = totals(state.items, state.tax);
    const sheet = $("sheet");

    const head = el("header", "inv-head");
    const brand = el("div");
    if (state.logo) {
        const img = el("img", "inv-logo");
        img.src = state.logo;
        img.alt = "";
        brand.append(img);
    }
    const title = el("div", "inv-title");
    title.append(el("div", "inv-word", m.sInvoice.toUpperCase()), el("div", "inv-mute", `# ${state.number}`));
    head.append(brand, title);

    const parties = el("div", "inv-parties");
    const who = el("div");
    lines(who, state.from, true);
    const billTo = el("div", "inv-billto");
    billTo.append(el("div", "inv-mute", m.sBillTo));
    lines(billTo, state.to, true);
    who.append(billTo);
    const dates = el("div", "inv-dates");
    dates.append(pair(m.sDate, date(state.date)), pair(m.sDue, date(state.due)), pair(m.sBalance, money(t.total), "inv-balance"));
    parties.append(who, dates);

    const table = el("table", "inv-table");
    const hr = el("tr");
    for (const [h, c] of [
        [m.sItem, ""],
        [m.sQty, ""],
        [m.sRate, "inv-num"],
        [m.sAmount, "inv-num"],
    ])
        hr.append(el("th", c, h));
    table.append(el("thead"), el("tbody"));
    table.tHead.append(hr);
    state.items.forEach((it, i) => {
        const tr = el("tr");
        tr.append(el("td", "inv-strong", it.desc), el("td", "", it.qty), el("td", "inv-num", money(num(it.rate))), el("td", "inv-num", money(t.lines[i])));
        table.tBodies[0].append(tr);
    });

    const sums = el("div", "inv-sums");
    sums.append(pair(m.sSub, money(t.sub)), pair(m.sTax(state.tax || 0), money(t.tax)), pair(m.sTotal, money(t.total)));

    const foot = el("div", "inv-foot");
    if (state.payment.trim()) {
        foot.append(el("div", "inv-mute", m.sPay));
        lines(foot, state.payment);
    }
    if (state.notes.trim()) {
        foot.append(el("div", "inv-mute inv-gap", m.sNotes));
        lines(foot, state.notes);
    }

    sheet.replaceChildren(head, parties, table, sums, foot);
}

function update() {
    save();
    renderSheet();
    refreshForm();
}

form.addEventListener("submit", (e) => e.preventDefault());
form.addEventListener("input", (e) => {
    const k = e.target.name;
    if (!k || !(k in state)) return;
    // Moving the invoice date moves the due date with it, keeping the payment term.
    if (k === "date" && e.target.value && state.date && state.due) {
        state.due = addDays(e.target.value, daysBetween(state.date, state.due));
        form.elements.due.value = state.due;
    }
    state[k] = e.target.value;
    update();
});

$("logo").addEventListener("change", () => {
    const file = $("logo").files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
        state.logo = r.result;
        $("logoRemove").hidden = false;
        update();
    };
    r.readAsDataURL(file);
});
$("logoRemove").addEventListener("click", () => {
    state.logo = "";
    fillForm();
    update();
});
function addItem() {
    state.items.push({ desc: "", qty: "1", rate: "" });
    renderItems();
    update();
    $("items").lastElementChild.querySelector("input").focus();
}
$("addItem").addEventListener("click", addItem);
// Enter in the last item starts a new one, like the next line of a list.
$("items").addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || e.target.tagName !== "INPUT") return;
    e.preventDefault();
    const li = e.target.closest("li");
    if (li === $("items").lastElementChild) addItem();
    else li.nextElementSibling.querySelector("input").focus();
});
$("next").addEventListener("click", () => {
    const today = isoDate(new Date());
    const gap = state.date && state.due ? daysBetween(state.date, state.due) : 14;
    state = { ...state, number: nextNumber(state.number), date: today, due: addDays(today, gap) };
    fillForm();
    update();
});
$("reset").addEventListener("click", () => {
    state = fresh();
    fillForm();
    update();
});
function syncTemplateButtons() {
    $("reset").textContent = template() ? m.resetTemplate : m.reset;
    $("forgetTemplate").hidden = !own;
}
$("saveTemplate").addEventListener("click", () => {
    const { date, due, ...rest } = state;
    own = { ...structuredClone(rest), dueDays: date && due ? daysBetween(date, due) : 14 };
    save(TKEY, own);
    $("tplStatus").textContent = m.templateSaved;
    syncTemplateButtons();
});
$("forgetTemplate").addEventListener("click", () => {
    own = null;
    save(TKEY, null);
    $("tplStatus").textContent = m.templateForgotten;
    syncTemplateButtons();
    $("saveTemplate").focus();
});
$("print").addEventListener("click", () => {
    const title = document.title;
    document.title = `${m.sInvoice} ${state.number}`; // becomes the PDF file name
    window.print();
    document.title = title;
});

initLang(copy, (l) => {
    m = copy[l];
    for (const [k, key] of [["from", "fromPh"], ["to", "toPh"], ["payment", "payPh"]]) form.elements[k].placeholder = m[key];
    syncTemplateButtons();
    $("tplStatus").textContent = "";
    renderItems();
    renderSheet();
});
fillForm();
renderSheet();

// Only the private copy has a template.json next to it; on tools.zvondis.dev this is a 404.
fetch("template.json", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((t) => {
        if (!t) return;
        served = t;
        syncTemplateButtons();
        if (!load()) {
            state = fresh();
            fillForm();
            update();
        }
    })
    .catch(() => {});
