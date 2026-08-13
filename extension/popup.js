(function(){
  "use strict";
  var $ = function(id){ return document.getElementById(id); };
  var cfg = null;

  function money(n){
    return cfg.currency + n.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
  }

  function render(){
    var out = $("out"), amt = +$("amt").value || 0;
    if (!cfg) return;
    if (!MortgageMath.isConfigured(cfg)){
      out.innerHTML = '<p class="m">No mortgage set up yet — open Settings below.</p>';
      return;
    }
    if (amt <= 0){ out.innerHTML = '<p class="m">Enter an amount.</p>'; return; }

    var s = MortgageMath.savingFor(cfg, amt);
    if (!s){ out.innerHTML = '<p class="m">Check your figures in Settings.</p>'; return; }
    out.innerHTML = '<p class="big">' + MortgageMath.timeWords(s.months, 2) + '</p>' +
      '<p class="m">off your mortgage, and ' + money(s.interest) +
      ' less interest, if you overpaid it instead.</p>';
  }

  $("amt").addEventListener("input", render);
  $("opts").addEventListener("click", function(){ chrome.runtime.openOptionsPage(); });

  MBSettings.get(function(c){ cfg = c; render(); });
})();
