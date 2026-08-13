(function(){
  "use strict";
  var $ = function(id){ return document.getElementById(id); };
  var NUM = ["balance","rate","payment","changeIn","rate2","payment2"];
  var PREVIEW_BASKET = 50;

  function fill(cfg){
    NUM.forEach(function(k){ $(k).value = cfg[k]; });
    $("currency").value  = cfg.currency;
    $("hasChange").checked = !!cfg.hasChange;
    $("enabled").checked   = cfg.enabled !== false;
    sync();
  }

  function collect(){
    var out = {};
    NUM.forEach(function(k){ out[k] = +$(k).value || 0; });
    out.currency  = $("currency").value.trim() || "£";
    out.hasChange = $("hasChange").checked;
    out.enabled   = $("enabled").checked;
    return out;
  }

  function sync(){
    $("changeFields").hidden = !$("hasChange").checked;
    preview();
  }

  function preview(){
    var cfg = collect(), box = $("preview");
    if (!MortgageMath.isConfigured(cfg)){
      box.innerHTML = "<p>Enter your mortgage above.</p>";
      return;
    }
    var s = MortgageMath.savingFor(cfg, PREVIEW_BASKET);
    if (!s){
      box.innerHTML = "<p>That payment doesn't cover the monthly interest, so the balance never clears. " +
                      "Check the rate and payment.</p>";
      return;
    }
    var money = function(n){
      return cfg.currency + n.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
    };
    box.innerHTML = "<p>" + cfg.currency + PREVIEW_BASKET + " would take <b>" +
      MortgageMath.timeWords(s.months, 2) + "</b> off your mortgage.</p>" +
      "<p class='m'>Saving " + money(s.interest) + " in interest. " +
      "You're currently " + MortgageMath.timeText(s.baseMonths, 2) + " from the end.</p>";
  }

  function flash(msg){
    $("status").textContent = msg;
    setTimeout(function(){ $("status").textContent = ""; }, 2200);
  }

  $("importBtn").addEventListener("click", function(){
    var parsed = MBSettings.fromLink($("link").value);
    if (!parsed){ flash("Couldn't read that link."); return; }
    Object.keys(parsed).forEach(function(k){
      if (k === "hasChange") $("hasChange").checked = parsed[k];
      else if ($(k)) $(k).value = parsed[k];
    });
    sync();
    flash("Imported — press Save.");
  });

  $("saveBtn").addEventListener("click", function(){
    MBSettings.set(collect(), function(){ flash("Saved."); });
  });

  document.addEventListener("input", preview);
  $("hasChange").addEventListener("change", sync);

  MBSettings.get(fill);
})();
