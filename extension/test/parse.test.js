/* Price parsing and settings-link handling.
   Run: node test/parse.test.js */
"use strict";
const assert = require("assert");
const A = require("../lib/amazon.js");
const S = require("../lib/settings.js");

let passed = 0;
function ok(name, fn){
  try { fn(); passed++; console.log("  ✓ " + name); }
  catch(e){ console.error("  ✗ " + name + "\n    " + e.message); process.exitCode = 1; }
}
const val = t => { const p = A.parsePrice(t); return p && p.value; };

console.log("parsePrice");

ok("plain UK prices", () => {
  assert.strictEqual(val("£12.99"), 12.99);
  assert.strictEqual(val("£1,234.56"), 1234.56);
  assert.strictEqual(val("£0.99"), 0.99);
  assert.strictEqual(val("£1,000,000.00"), 1000000);
});

ok("Amazon's real subtotal strings", () => {
  assert.strictEqual(val("Subtotal (3 items): £142.97"), 142.97);
  assert.strictEqual(val("Subtotal (1 item):£9.99"), 9.99);
  assert.strictEqual(val("\n  Subtotal (12 items):\n  £1,043.80\n "), 1043.80);
});

ok("other currencies", () => {
  assert.strictEqual(val("$45.00"), 45);
  assert.strictEqual(val("€19,99"), 19.99);        // European decimal comma
  assert.strictEqual(val("1.234,56 €"), 1234.56);  // European thousands + decimal
  assert.strictEqual(val("¥1,480"), 1480);
});

ok("thousands separators without decimals", () => {
  assert.strictEqual(val("£1,234"), 1234);
  assert.strictEqual(val("1.234 €"), 1234);       // dot as thousands
  assert.strictEqual(val("£12,345,678"), 12345678);
});

ok("integers and bare numbers", () => {
  assert.strictEqual(val("£5"), 5);
  assert.strictEqual(val("42"), 42);
});

ok("non-breaking spaces (Amazon uses them)", () => {
  assert.strictEqual(val("£ 1,234.56"), 1234.56);
  assert.strictEqual(val("1 234,56 €"), 1234.56);
});

ok("captures the currency symbol", () => {
  assert.strictEqual(A.parsePrice("£12.99").symbol, "£");
  assert.strictEqual(A.parsePrice("$12.99").currency, "USD");
  assert.strictEqual(A.parsePrice("€12,99").currency, "EUR");
});

ok("rejects strings with no price", () => {
  assert.strictEqual(A.parsePrice("Proceed to checkout"), null);
  assert.strictEqual(A.parsePrice(""), null);
  assert.strictEqual(A.parsePrice(null), null);
  assert.strictEqual(A.parsePrice("Subtotal:"), null);
});

console.log("item count");

ok("reads the count out of the label", () => {
  assert.strictEqual(A.findItemCount(null, "Subtotal (3 items): £42.00"), 3);
  assert.strictEqual(A.findItemCount(null, "Subtotal (1 item): £9.99"), 1);
  assert.strictEqual(A.findItemCount(null, "Subtotal: £9.99"), null);
});

console.log("subtotal scanning");

// findSubtotal only ever touches querySelector/querySelectorAll/textContent,
// so a hand-rolled stub document is enough to test it without a browser.
function fakeDoc(texts){
  const nodes = texts.map(t => ({textContent: t}));
  return {querySelector: () => null, querySelectorAll: () => nodes};
}

ok("ignores postage and picks the subtotal (regression)", () => {
  const doc = fakeDoc([
    "Items (2)Postage & Packing£3.99Subtotal (2 items): £64.00",  // whole summary box
    "Postage & Packing£3.99",
    "Subtotal (2 items): £64.00"
  ]);
  const found = A.findSubtotal(doc);
  assert.strictEqual(found.value, 64.00, `picked ${found.value}`);
  assert.strictEqual(found.items, 2);
});

ok("prefers the most specific element", () => {
  const doc = fakeDoc([
    "Basket Subtotal (1 item): £19.99 Proceed to checkout Continue shopping",
    "Subtotal (1 item): £19.99"
  ]);
  assert.strictEqual(A.findSubtotal(doc).value, 19.99);
});

ok("returns null when there's no subtotal on the page", () => {
  assert.strictEqual(A.findSubtotal(fakeDoc(["Your basket is empty", "Deals £4.99"])), null);
});

console.log("cart page detection");

ok("recognises Amazon basket URLs", () => {
  assert.ok(A.looksLikeCartPage({pathname:"/gp/cart/view.html"}));
  assert.ok(A.looksLikeCartPage({pathname:"/cart/smart-wagon"}));
  assert.ok(A.looksLikeCartPage({pathname:"/gp/aw/c"}));
  assert.strictEqual(A.looksLikeCartPage({pathname:"/dp/B01234"}), false);
});

console.log("settings links");

ok("imports figures from a MortgageBuddy link", () => {
  const p = S.fromLink("https://fr4ncis.github.io/mortgagebuddy/?b=250000&r=4.5&p=1266.71&c=24&r2=5.5&p2=1411.73");
  assert.strictEqual(p.balance, 250000);
  assert.strictEqual(p.rate, 4.5);
  assert.strictEqual(p.payment, 1266.71);
  assert.strictEqual(p.changeIn, 24);
  assert.strictEqual(p.hasChange, true);
});

ok("honours nc=1 (no rate change)", () => {
  const p = S.fromLink("https://fr4ncis.github.io/mortgagebuddy/?b=200000&r=4&p=1200&nc=1");
  assert.strictEqual(p.hasChange, false);
  assert.strictEqual(p.balance, 200000);
});

ok("accepts a bare query string and rejects junk", () => {
  assert.strictEqual(S.fromLink("b=1000&r=4&p=50").balance, 1000);
  assert.strictEqual(S.fromLink("https://example.com/"), null);
  assert.strictEqual(S.fromLink(""), null);
});

ok("round-trips through toLink", () => {
  const cfg = {balance:250000, rate:4.5, payment:1266.71, hasChange:true,
               changeIn:24, rate2:5.5, payment2:1411.73};
  const back = S.fromLink(S.toLink(cfg));
  ["balance","rate","payment","changeIn","rate2","payment2"].forEach(k =>
    assert.strictEqual(back[k], cfg[k], k));
  assert.strictEqual(back.hasChange, true);
});

console.log(`\n${passed} passed`);
