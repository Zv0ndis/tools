// Self-check for the invoice helpers: `node invoice/selfcheck.mjs`.
import assert from "node:assert/strict";
import { totals, nextNumber, addDays, daysBetween, num, isNum } from "./calc.js";

assert.deepEqual(totals([{ qty: 1, rate: 2000 }], 0), { lines: [2000], sub: 2000, tax: 0, total: 2000 });
assert.deepEqual(totals([{ qty: "3", rate: "0,1" }], "21"), { lines: [0.3], sub: 0.3, tax: 0.06, total: 0.36 });
assert.deepEqual(totals([{ qty: "", rate: "abc" }], ""), { lines: [0], sub: 0, tax: 0, total: 0 });

assert.equal(num("1 500,50"), 1500.5);
assert.equal(num("1\u00a0500"), 1500);
assert.equal(num("12abc"), 0);
assert.equal(isNum("12abc"), false);
assert.equal(isNum(""), true);
assert.equal(isNum(" 7.5 "), true);

assert.equal(nextNumber("2677001"), "2677002");
assert.equal(nextNumber("FV-2026-009"), "FV-2026-010");
assert.equal(nextNumber("99"), "100");
assert.equal(nextNumber("draft"), "draft");

assert.equal(addDays("2026-10-22", 8), "2026-10-30");
assert.equal(addDays("2026-12-28", 8), "2027-01-05");
assert.equal(daysBetween("2026-10-22", "2026-10-30"), 8);
assert.equal(daysBetween("2026-03-28", "2026-04-02"), 5); // across the DST change

console.log("invoice selfcheck: ok");
