/* Mortgage settings, stored with chrome.storage.local — on this machine only,
   never uploaded or synced anywhere. */
(function(root, factory){
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MBSettings = api;
})(typeof self !== "undefined" ? self : null, function(){
  "use strict";

  // Neutral example figures: £250,000 over 30 years at 4.5%.
  var DEFAULTS = {
    balance: 0,            // 0 = not set up yet
    rate: 4.5,
    payment: 1266.71,
    hasChange: false,
    changeIn: 24,
    rate2: 5.5,
    payment2: 1411.73,
    currency: "£",
    enabled: true
  };

  var KEY = "mortgage";

  function get(cb){
    if (typeof chrome === "undefined" || !chrome.storage) return cb(Object.assign({}, DEFAULTS));
    chrome.storage.local.get(KEY, function(res){
      cb(Object.assign({}, DEFAULTS, (res && res[KEY]) || {}));
    });
  }

  function set(values, cb){
    var merged = Object.assign({}, DEFAULTS, values);
    chrome.storage.local.set({mortgage: merged}, function(){ if (cb) cb(merged); });
  }

  /* Accepts a MortgageBuddy link (or bare query string) and pulls the figures
     out of it, so settings can move between the web app and the extension. */
  function fromLink(link){
    if (!link) return null;
    var q = String(link).split(/[?#]/)[1] || String(link);
    var params;
    try { params = new URLSearchParams(q); } catch(e){ return null; }
    var map = {b:"balance", r:"rate", p:"payment", c:"changeIn", r2:"rate2", p2:"payment2"};
    var out = {}, found = false;
    Object.keys(map).forEach(function(k){
      var v = params.get(k);
      if (v !== null && v !== "" && isFinite(+v)){ out[map[k]] = +v; found = true; }
    });
    if (!found) return null;
    out.hasChange = params.get("nc") !== "1" && (out.rate2 !== undefined || out.payment2 !== undefined);
    return out;
  }

  function toLink(cfg, base){
    base = base || "https://fr4ncis.github.io/mortgagebuddy/";
    var q = ["b="+cfg.balance, "r="+cfg.rate, "p="+cfg.payment];
    if (cfg.hasChange) q.push("c="+cfg.changeIn, "r2="+cfg.rate2, "p2="+cfg.payment2);
    else q.push("nc=1");
    return base + "?" + q.join("&");
  }

  return {DEFAULTS: DEFAULTS, get: get, set: set, fromLink: fromLink, toLink: toLink};
});
