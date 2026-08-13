/* Minimal chrome.* stub so the content script can run in a plain page.
   Mortgage figures come from the query string, e.g. ?balance=0 for the
   not-set-up state. Defaults are the neutral example mortgage. */
(function(){
  var q = new URLSearchParams(location.search);
  var num = function(k, d){ var v = q.get(k); return v === null ? d : +v; };

  window.__CFG = {
    balance: num("balance", 250000),
    rate: num("rate", 4.5),
    payment: num("payment", 1266.71),
    hasChange: q.get("hasChange") === "1",
    changeIn: num("changeIn", 24),
    rate2: num("rate2", 5.5),
    payment2: num("payment2", 1411.73),
    currency: q.get("currency") || "£",
    enabled: q.get("enabled") !== "0"
  };

  window.__messages = [];
  window.chrome = {
    storage: {
      local: {
        get: function(key, cb){ cb({mortgage: window.__CFG}); },
        set: function(obj, cb){ window.__CFG = obj.mortgage; if (cb) cb(); }
      },
      onChanged: { addListener: function(fn){ window.__onChanged = fn; } }
    },
    runtime: {
      sendMessage: function(msg){ window.__messages.push(msg); },
      openOptionsPage: function(){ window.__messages.push({type:"open-options"}); }
    }
  };
})();
