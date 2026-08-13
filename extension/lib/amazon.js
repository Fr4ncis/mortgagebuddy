/* Pulling the basket total off an Amazon cart page.
   Amazon's markup shifts around and differs by locale, so nothing here trusts a
   single selector: we try the known anchors in order, then fall back to reading
   any "Subtotal" line on the page. Everything is exported for the tests. */
(function(root, factory){
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AmazonCart = api;
})(typeof self !== "undefined" ? self : null, function(){
  "use strict";

  var CURRENCIES = {"£":"GBP", "$":"USD", "€":"EUR", "₹":"INR", "¥":"JPY", "kr":"SEK", "zł":"PLN"};

  var SYM = "\u00a3|\\$|\u20ac|\u20b9|\u00a5|z\u0142|kr";
  var NUM = "\\d[\\d.,\\s]*\\d|\\d";

  /* "£1,234.56" -> 1234.56 · "1.234,56 €" -> 1234.56 · "$12.99" -> 12.99
     Returns null when there's no price in the string.

     The number has to sit next to a currency symbol, because Amazon's subtotal
     line reads "Subtotal (3 items): £142.97" — taking the first number in the
     string would give you the item count, not the price. A bare number is only
     accepted when the element holds nothing else, as in a dedicated price node. */
  function parsePrice(text){
    if (!text) return null;
    var s = String(text).replace(/[\u00a0\u202f\u2007]/g, " ").trim();

    var symbol = null, raw = null;

    var before = s.match(new RegExp("(" + SYM + ")\\s*(" + NUM + ")"));
    if (before){ symbol = before[1]; raw = before[2]; }

    if (raw === null){
      var after = s.match(new RegExp("(" + NUM + ")\\s*(" + SYM + ")"));
      if (after){ raw = after[1]; symbol = after[2]; }
    }

    if (raw === null){
      if (!/^[\d.,\s]+$/.test(s)) return null;   // words but no currency: not a price
      var bare = s.match(new RegExp(NUM));
      if (!bare) return null;
      raw = bare[0];
    }

    raw = raw.replace(/\s/g, "");

    var lastDot = raw.lastIndexOf("."), lastComma = raw.lastIndexOf(",");
    var dec = Math.max(lastDot, lastComma);
    var value;
    if (dec === -1){
      value = parseFloat(raw);
    } else {
      var tail = raw.length - dec - 1;
      // a separator with exactly 1-2 trailing digits is a decimal point;
      // anything else (1.234 / 1,234) is a thousands separator
      if (tail === 1 || tail === 2){
        value = parseFloat(raw.slice(0, dec).replace(/[.,]/g, "") + "." + raw.slice(dec+1));
      } else {
        value = parseFloat(raw.replace(/[.,]/g, ""));
      }
    }
    if (!isFinite(value)) return null;
    return {value: value, symbol: symbol, currency: symbol ? CURRENCIES[symbol] : null};
  }

  /* Ordered best-guess anchors for the cart subtotal. */
  var SELECTORS = [
    "#sc-subtotal-amount-activecart .a-price .a-offscreen",
    "#sc-subtotal-amount-activecart .sc-price",
    "#sc-subtotal-amount-activecart",
    "#sc-subtotal-amount-buybox .a-price .a-offscreen",
    "#sc-subtotal-amount-buybox",
    "[data-name='Subtotal'] .a-price .a-offscreen",
    "[data-name='Subtotal'] .a-color-price",
    "#gutterCartViewForm [data-name='Subtotal'] .a-price .a-offscreen",
    "#sc-mini-cart-subtotal .a-price .a-offscreen",
    "#nav-cart-count + .nav-cart-subtotal"
  ];

  var SUBTOTAL_WORDS = /subtotal|sub-total|zwischensumme|sous-total|subtotaal|totale parziale/i;

  /* Reads the subtotal from a document. Returns
     {value, symbol, currency, items, source} or null. */
  function findSubtotal(doc){
    doc = doc || document;

    for (var i=0; i<SELECTORS.length; i++){
      var el = doc.querySelector(SELECTORS[i]);
      if (!el) continue;
      var p = parsePrice(el.textContent);
      if (p && p.value > 0){
        p.items  = findItemCount(doc);
        p.source = SELECTORS[i];
        return p;
      }
    }

    /* Nothing matched, so read the page text instead. Two rules keep this
       honest: only look at the text *after* the word "subtotal" (a summary box
       also lists postage, which would otherwise win), and prefer the smallest
       element that qualifies (the most specific one wrapping the figure). */
    var nodes = doc.querySelectorAll("span, div, td, p");
    var best = null;
    for (var j=0; j<nodes.length; j++){
      var t = (nodes[j].textContent || "").trim();
      if (!t || t.length > 160) continue;
      var label = SUBTOTAL_WORDS.exec(t);
      if (!label) continue;
      var q = parsePrice(t.slice(label.index));
      if (q && q.value > 0 && (!best || t.length < best.len)) best = {price:q, len:t.length, text:t};
    }
    if (best){
      best.price.items  = findItemCount(doc, best.text);
      best.price.source = "text-scan";
      return best.price;
    }
    return null;
  }

  /* "Subtotal (3 items): £42.00" -> 3 */
  function findItemCount(doc, text){
    var d = doc || (typeof document !== "undefined" ? document : null);
    var candidates = [];
    if (text) candidates.push(text);
    var label = d && d.querySelector("#sc-subtotal-label-activecart, #sc-subtotal-label-buybox");
    if (label) candidates.push(label.textContent);
    for (var i=0; i<candidates.length; i++){
      var m = String(candidates[i]).match(/\(\s*(\d+)\s+/);
      if (m) return parseInt(m[1], 10);
    }
    return null;
  }

  /* Where to put the panel — next to the subtotal if we can, otherwise the
     caller floats it. */
  var ANCHORS = [
    "#sc-subtotal-amount-activecart",
    "#activeCartViewForm #sc-subtotal-amount-activecart",
    "[data-name='Subtotal']",
    "#sc-subtotal-amount-buybox",
    "#gutterCartViewForm",
    "#sc-active-cart"
  ];

  function findAnchor(doc){
    doc = doc || document;
    for (var i=0; i<ANCHORS.length; i++){
      var el = doc.querySelector(ANCHORS[i]);
      if (el) return el;
    }
    return null;
  }

  function looksLikeCartPage(loc){
    loc = loc || location;
    return /\/(gp\/cart|cart|gp\/aw\/c)/.test(loc.pathname);
  }

  return {
    parsePrice: parsePrice,
    findSubtotal: findSubtotal,
    findItemCount: findItemCount,
    findAnchor: findAnchor,
    looksLikeCartPage: looksLikeCartPage,
    SELECTORS: SELECTORS,
    ANCHORS: ANCHORS
  };
});
