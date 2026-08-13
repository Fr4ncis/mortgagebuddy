/* Reads the Amazon basket subtotal and says what that money would do to your
   mortgage instead. Renders into a shadow root so Amazon's stylesheets and ours
   can't interfere with each other. */
(function(){
  "use strict";

  var HOST_ID = "mortgagebuddy-host";
  var DISMISS_KEY = "mortgagebuddy-dismissed";
  var settings = null;
  var lastRendered = null;
  var timer = null;

  var STYLE = [
    ":host{all:initial}",
    ".panel{font:14px/1.45 'Amazon Ember',Arial,sans-serif;color:#0f1111;background:#fff;",
      "border:1px solid #d5d9d9;border-radius:8px;padding:14px 16px;margin:12px 0;",
      "box-shadow:0 2px 5px rgba(15,17,17,.15);max-width:100%}",
    ".panel.floating{position:fixed;right:18px;bottom:18px;width:320px;z-index:2147483000;margin:0}",
    ".top{display:flex;align-items:center;gap:8px;margin-bottom:8px}",
    ".dot{width:8px;height:8px;border-radius:50%;background:#067d62;flex:none}",
    ".name{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#565959}",
    ".x{margin-left:auto;border:none;background:none;color:#565959;font-size:16px;line-height:1;",
      "cursor:pointer;padding:2px 4px;border-radius:4px}",
    ".x:hover{background:#f0f2f2;color:#0f1111}",
    ".head{font-size:19px;font-weight:700;letter-spacing:-.01em;margin:0 0 4px}",
    ".head b{color:#067d62}",
    ".sub{font-size:13px;color:#565959;margin:0}",
    ".rows{margin:11px 0 0;padding:10px 0 0;border-top:1px solid #e7e9e9;display:grid;gap:5px}",
    ".row{display:flex;justify-content:space-between;gap:12px;font-size:12.5px;color:#565959}",
    ".row b{color:#0f1111;font-weight:600;font-variant-numeric:tabular-nums}",
    ".foot{margin:11px 0 0;font-size:11.5px;color:#565959;display:flex;gap:12px;align-items:center}",
    ".foot a{color:#007185;text-decoration:none;cursor:pointer}",
    ".foot a:hover{color:#c7511f;text-decoration:underline}",
    ".warn{margin:9px 0 0;font-size:11.5px;color:#8a5a00;background:#fef8e7;border-radius:5px;padding:7px 9px}",
    ".setup{font-size:13px;color:#0f1111;margin:0}",
    "@media (prefers-color-scheme: dark){",
      ".panel{background:#1c232c;border-color:#2a323c;color:#e6edf3}",
      ".head{color:#e6edf3}.head b{color:#4ade80}",
      ".name,.sub,.row,.foot{color:#9aa7b4}.row b{color:#e6edf3}",
      ".rows{border-top-color:#2a323c}.x:hover{background:#2a323c;color:#e6edf3}",
      ".setup{color:#e6edf3}.foot a{color:#4c8dff}",
      ".warn{background:#2a2214;color:#e3b341}}"
  ].join("");

  function gbp(n, symbol, dp){
    dp = dp === undefined ? 2 : dp;
    return (symbol || "£") + n.toLocaleString(undefined, {minimumFractionDigits:dp, maximumFractionDigits:dp});
  }

  function host(){
    var el = document.getElementById(HOST_ID);
    if (el) return el;
    el = document.createElement("div");
    el.id = HOST_ID;
    el.attachShadow({mode:"open"});
    var style = document.createElement("style");
    style.textContent = STYLE;
    el.shadowRoot.appendChild(style);
    el.shadowRoot.appendChild(document.createElement("div"));
    return el;
  }

  function place(el){
    if (el.isConnected) return;
    var anchor = AmazonCart.findAnchor(document);
    if (anchor && anchor.parentNode){
      // sit directly under the subtotal
      var target = anchor.closest("#sc-subtotal-amount-activecart, [data-name='Subtotal']") || anchor;
      target.parentNode.insertBefore(el, target.nextSibling);
    } else {
      document.body.appendChild(el);
      el.shadowRoot.querySelector("div").classList.add("float-wrap");
    }
  }

  function render(html, floating){
    var el = host();
    var body = el.shadowRoot.querySelector("div");
    body.innerHTML = '<div class="panel' + (floating ? " floating" : "") + '">' + html + '</div>';
    place(el);
    var x = body.querySelector(".x");
    if (x) x.addEventListener("click", function(){
      try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch(e){}
      el.remove();
    });
    var opts = body.querySelector(".open-options");
    if (opts) opts.addEventListener("click", function(e){
      e.preventDefault();
      chrome.runtime.sendMessage({type:"open-options"});
    });
  }

  function shell(inner){
    return '<div class="top"><span class="dot"></span><span class="name">MortgageBuddy</span>' +
           '<button class="x" title="Hide until next visit">&times;</button></div>' + inner;
  }

  function update(){
    if (!settings || !settings.enabled) return;
    try { if (sessionStorage.getItem(DISMISS_KEY)) return; } catch(e){}

    var cart = AmazonCart.findSubtotal(document);
    if (!cart || !(cart.value > 0)){
      var existing = document.getElementById(HOST_ID);
      if (existing) existing.remove();
      lastRendered = null;
      return;
    }

    var floating = !AmazonCart.findAnchor(document);

    if (!MortgageMath.isConfigured(settings)){
      if (lastRendered === "setup") return;
      lastRendered = "setup";
      render(shell(
        '<p class="setup">Add your mortgage and this will tell you what ' +
        gbp(cart.value, cart.symbol) + ' would take off it.</p>' +
        '<p class="foot"><a class="open-options" href="#">Set up your mortgage &rarr;</a></p>'
      ), floating);
      return;
    }

    var saving = MortgageMath.savingFor(settings, cart.value);
    if (!saving) return;

    var key = cart.value + "|" + settings.balance + "|" + settings.rate + "|" + settings.payment;
    if (key === lastRendered) return;
    lastRendered = key;

    var mismatch = cart.symbol && settings.currency && cart.symbol !== settings.currency;
    var itemNote = cart.items ? (cart.items === 1 ? "1 item" : cart.items + " items") : "this basket";

    render(shell(
      '<p class="head">' + gbp(cart.value, cart.symbol) + ' &rarr; <b>' +
        MortgageMath.timeWords(saving.months, 2) + '</b></p>' +
      '<p class="sub">off your mortgage, if you overpaid instead of buying ' + itemNote + '.</p>' +
      '<div class="rows">' +
        '<div class="row"><span>Interest you\'d avoid</span><b>' +
          gbp(saving.interest, settings.currency) + '</b></div>' +
        '<div class="row"><span>Mortgage-free sooner by</span><b>' +
          MortgageMath.timeText(saving.months, 3) + '</b></div>' +
      '</div>' +
      (mismatch ? '<p class="warn">This basket is in ' + cart.symbol + ' but your mortgage is in ' +
        settings.currency + '. No exchange rate is applied, so treat this as a rough comparison.</p>' : '') +
      '<p class="foot"><a class="open-options" href="#">Adjust figures</a></p>'
    ), floating);
  }

  function schedule(){
    clearTimeout(timer);
    timer = setTimeout(update, 350);       // Amazon re-renders the subtotal via ajax
  }

  function start(){
    MBSettings.get(function(cfg){
      settings = cfg;
      update();
      var obs = new MutationObserver(schedule);
      obs.observe(document.body, {childList:true, subtree:true, characterData:true});
      if (chrome.storage && chrome.storage.onChanged){
        chrome.storage.onChanged.addListener(function(changes){
          if (changes.mortgage){
            settings = Object.assign({}, MBSettings.DEFAULTS, changes.mortgage.newValue || {});
            lastRendered = null;
            update();
          }
        });
      }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
