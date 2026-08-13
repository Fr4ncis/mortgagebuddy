/* Checks the extension's copy of the amortisation engine against the closed-form
   solution and against values derived independently (in Python) from the same
   inputs. Uses the example mortgage: £250,000 at 4.5% over 30 years.
   Run: node test/engine.test.js */
"use strict";
const assert = require("assert");
const M = require("../lib/mortgage.js");

let passed = 0;
function ok(name, fn){
  try { fn(); passed++; console.log("  ✓ " + name); }
  catch(e){ console.error("  ✗ " + name + "\n    " + e.message); process.exitCode = 1; }
}
/* "interest saved" is total outlay without overpaying minus total outlay with
   it — and the "with" figure already includes the overpayment itself. So
   overpaying £1,000 cuts £2,833 off what you hand over in total, £1,833 of
   which is net gain on top of the £1,000 you'd have spent anyway. */
const near = (a, b, tol, what) =>
  assert.ok(Math.abs(a-b) <= tol, `${what}: got ${a}, expected ${b} (±${tol})`);

const B = 250000;
const single = {balance:B, rate:4.5, payment:1266.71, hasChange:false};
const twoRate = {balance:B, rate:4.5, payment:1266.71, hasChange:true,
                 changeIn:24, rate2:5.5, payment2:1411.73};

console.log("engine");

ok("matches the closed-form payoff time  n = −ln(1−rB/P)/ln(1+r)", () => {
  const r = 4.5/100/12;
  const closed = -Math.log(1 - r*B/1266.71)/Math.log(1+r);
  near(M.payoff(B, single, {}).months, closed, 0.001, "months");
});

ok("a 30-year mortgage has ~360 payments left", () => {
  near(M.payoff(B, single, {}).months, 360.001970, 1e-4, "months");
  near(M.payoff(B, single, {}).paid, 456018.10, 0.05, "total paid");
});

ok("handles a rate change mid-term", () => {
  near(M.payoff(B, twoRate, {}).months, 359.999777, 1e-4, "months");
  near(M.payoff(B, twoRate, {}).paid, 504742.01, 0.05, "total paid");
});

ok("£1 overpaid saves 0.00304491 months and £2.86 of interest", () => {
  const s = M.savingFor(single, 1);
  near(s.months, 0.00304491, 1e-7, "months");
  near(s.interest, 2.857023, 0.01, "interest");
});

ok("£1,000 overpaid saves 3.026 months and £2,833.10 of interest", () => {
  const s = M.savingFor(single, 1000);
  near(s.months, 3.02602412, 1e-6, "months");
  near(s.interest, 2833.095, 0.01, "interest");
});

ok("regular overpayments work too (£200/mo saves 87.654 months)", () => {
  const base = M.payoff(B, single, {});
  const with200 = M.payoff(B, single, {monthly: 200});
  near(base.months - with200.months, 87.654369, 1e-4, "months");
});

ok("a basket-sized amount against the two-rate mortgage", () => {
  const s = M.savingFor(twoRate, 336.98);
  near(s.months, 1.21283528, 1e-6, "months");
  near(s.interest, 1375.216, 0.01, "interest");
  assert.strictEqual(M.timeWords(s.months, 2), "1 month, 6 days");
});

ok("saving is monotonic in the amount", () => {
  let prev = -1;
  for (const amt of [0, 0.01, 1, 9.99, 50, 250, 1000, 10000]){
    const s = M.savingFor(single, amt);
    assert.ok(s.months >= prev, `£${amt} went backwards`);
    prev = s.months;
  }
});

ok("overpaying the whole balance clears it", () => {
  assert.strictEqual(M.savingFor(single, B).newMonths, 0);
});

ok("returns null when the payment can't cover the interest", () => {
  assert.strictEqual(M.payoff(B, {rate:10, payment:100, hasChange:false}, {}), null);
  assert.strictEqual(M.savingFor({balance:B, rate:10, payment:100, hasChange:false}, 50), null);
});

ok("isConfigured rejects an unset mortgage", () => {
  assert.strictEqual(M.isConfigured({balance:0, rate:4, payment:100}), false);
  assert.strictEqual(M.isConfigured({balance:1000, rate:4, payment:100}), true);
  assert.strictEqual(M.isConfigured(null), false);
});

console.log("time formatting");

ok("timeText trims to the largest meaningful units", () => {
  assert.strictEqual(M.timeText(0), "0m");
  assert.strictEqual(M.timeText(12), "1yr");
  assert.strictEqual(M.timeText(13.5, 2), "1yr 1mo");
});

ok("small amounts still read as hours and minutes, not zero", () => {
  const s = M.savingFor(single, 1);
  assert.ok(/^\d+h \d+m/.test(M.timeText(s.months, 2)), M.timeText(s.months, 2));
});

ok("timeWords is singular for one", () => {
  assert.strictEqual(M.timeWords(1), "1 month");
  assert.strictEqual(M.timeWords(0), "no time at all");
  assert.ok(/2 months/.test(M.timeWords(2.4)));
});

console.log(`\n${passed} passed`);
