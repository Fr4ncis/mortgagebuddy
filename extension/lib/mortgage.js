/* Mortgage amortisation engine — the same maths as the MortgageBuddy web app.
   No DOM, no globals beyond the export, so it runs in a content script,
   an extension page, or node (for the tests). */
(function(root, factory){
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MortgageMath = api;
})(typeof self !== "undefined" ? self : null, function(){
  "use strict";

  var MONTH_DAYS = 365.2425/12;   // 30.436875

  /* Walks the mortgage month by month. `ops` layers overpayments on top of the
     contractual payment: a lump sum today, and/or an extra amount every month.
     Returns payoff time as a real number of months — whole months of full
     payments, plus the fraction of the final month's payment actually needed
     to clear the debt. That fraction is what makes £1 measurable in hours. */
  function payoff(balance, cfg, ops){
    ops = ops || {};
    var lump     = Math.max(0, Math.min(ops.oneOff || 0, balance));
    var perMonth = Math.max(0, ops.monthly || 0);
    var forN     = ops.monthlyFor || null;

    var b = balance - lump, paid = lump, extra = lump, m = 0;
    if (b <= 1e-9) return {months:0, paid:paid, extra:extra, interest: paid - balance};

    while (m < 1500){
      var late = cfg.hasChange && m >= cfg.changeIn;
      var r = (late ? cfg.rate2 : cfg.rate)/100/12;
      var P = late ? cfg.payment2 : cfg.payment;
      var ex = (perMonth > 0 && (!forN || m < forN)) ? perMonth : 0;
      var pay = P + ex;
      var interest = b*r;
      if (pay <= interest + 1e-9) return null;   // never clears
      var due = b + interest;
      if (due <= pay){
        var frac = due/pay;
        paid  += due;
        extra += ex*frac;
        return {months: m + frac, paid:paid, extra:extra, interest: paid - balance};
      }
      b = due - pay;
      paid  += pay;
      extra += ex;
      m++;
    }
    return null;
  }

  function breakdown(months){
    var y = Math.floor(months/12);
    var rem = months - y*12;
    var mo = Math.floor(rem);
    var frac = rem - mo;
    var totalSec = Math.round(frac*MONTH_DAYS*86400);
    var d = Math.floor(totalSec/86400); totalSec -= d*86400;
    var h = Math.floor(totalSec/3600);  totalSec -= h*3600;
    var mi = Math.floor(totalSec/60);
    return {years:y, months:mo, days:d, hours:h, minutes:mi, seconds: totalSec - mi*60};
  }

  function timeText(months, maxUnits){
    maxUnits = maxUnits || 3;
    var b = breakdown(months);
    var all = [[b.years,"yr"],[b.months,"mo"],[b.days,"d"],[b.hours,"h"],[b.minutes,"m"],[b.seconds,"s"]];
    var i = 0;
    while (i < all.length-1 && all[i][0] === 0) i++;
    var out = [];
    for (var k=i; k<all.length && out.length<maxUnits; k++){
      if (all[k][0] === 0 && out.length === 0) continue;
      out.push(all[k][0] + all[k][1]);
    }
    while (out.length > 1 && /^0[a-z]+$/.test(out[out.length-1])) out.pop();
    return out.length ? out.join(" ") : "0m";
  }

  /* Long form, for the headline: "2 months, 11 days" */
  function timeWords(months, maxUnits){
    maxUnits = maxUnits || 2;
    var b = breakdown(months);
    var all = [[b.years,"year"],[b.months,"month"],[b.days,"day"],
               [b.hours,"hour"],[b.minutes,"minute"],[b.seconds,"second"]];
    var i = 0;
    while (i < all.length-1 && all[i][0] === 0) i++;
    var out = [];
    for (var k=i; k<all.length && out.length<maxUnits; k++){
      if (all[k][0] === 0 && out.length === 0) continue;
      if (all[k][0] === 0) continue;
      out.push(all[k][0] + " " + all[k][1] + (all[k][0] === 1 ? "" : "s"));
    }
    return out.length ? out.join(", ") : "no time at all";
  }

  /* What a one-off overpayment of `amount` would buy, versus not making it. */
  function savingFor(cfg, amount){
    var base = payoff(cfg.balance, cfg, {});
    if (!base) return null;
    var after = payoff(cfg.balance, cfg, {oneOff: amount});
    if (!after) return null;
    return {
      months:   Math.max(0, base.months - after.months),
      interest: Math.max(0, base.paid - after.paid),
      baseMonths: base.months,
      newMonths:  after.months
    };
  }

  function isConfigured(cfg){
    return !!(cfg && cfg.balance > 0 && cfg.payment > 0 && cfg.rate >= 0);
  }

  return {
    payoff: payoff,
    breakdown: breakdown,
    timeText: timeText,
    timeWords: timeWords,
    savingFor: savingFor,
    isConfigured: isConfigured,
    MONTH_DAYS: MONTH_DAYS
  };
});
