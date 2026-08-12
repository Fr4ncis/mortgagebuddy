# MortgageBuddy

A one-page mortgage overpayment calculator that shows the time you save **down to the minute**.

Most overpayment calculators round to whole months, so anything under a few hundred pounds
reads as "0 months" — which is wrong, and quietly discouraging. This one tells you that an
extra £1 takes a couple of hours off, and that £1 a month takes nearly three weeks off.

**[→ Open the calculator](https://fr4ncis.github.io/mortgagebuddy/)**

## What it does

- **One-off lump sum**, **regular monthly overpayment**, or both together
- Optional duration on the regular payment ("£200/month, but only for 24 months")
- Time saved broken down to years / months / days / hours / minutes / seconds
- Interest saved, total overpaid, and your new final-payment date
- A ladder table of amounts, so you can see what each level of commitment buys
- Handles a **rate change mid-term** — a fixed or tracker deal ending, with a different
  rate and payment afterwards
- Everything saves to `localStorage`. No accounts, no analytics, no network calls;
  your figures never leave your browser.

Single self-contained HTML file, no build step and no dependencies. Clone it and open
`index.html`, or just use the hosted link.

## Where the sub-month precision comes from

It isn't decoration. Amortisation is a monthly loop — each month, interest is added to the
balance and the payment is taken off it. The final payment is almost never a whole one: the
debt clears partway through that last month. So the payoff time is

```
whole months of full payments  +  (what's left to clear ÷ that month's payment)
```

That fraction moves continuously with the balance, which is exactly what makes a £1
overpayment measurable. Because an overpayment made today compounds for the whole remaining
term, a single pound early in a 30-year mortgage is worth several pounds at the end — and the
tool shows you that in hours.

## Assumptions

- Your contractual monthly payment **stays the same** after overpaying, so the saving comes
  off the *term*. This is the assumption every overpayment calculator makes, and it's the one
  most likely to bite you — see below.
- The interest rate holds at whatever you enter (plus the optional later rate you specify).
  Trackers and variable rates will move; re-run it when they do.
- Interest is charged monthly on the outstanding balance, and overpayments reduce that
  balance immediately.

**Check your lender's rules before acting on any of this.** Some charge early repayment fees,
or cap penalty-free overpayments at a percentage of the balance per year. Many respond to a
large overpayment by reducing your *monthly payment* instead of your term — which is the
opposite of what's modelled here and cancels the time saving entirely. If you want the term
shortened, you usually have to ask.

Estimates only. Not financial advice.

## Prefilling from the URL

Handy for bookmarking your own figures without typing them in each time (they stay in your
browser either way):

| Param | Meaning              | Param | Meaning                          |
|-------|----------------------|-------|----------------------------------|
| `b`   | remaining balance    | `r2`  | rate after the change            |
| `r`   | annual interest rate | `p2`  | monthly payment after the change |
| `p`   | monthly payment      | `o`   | one-off overpayment              |
| `c`   | months until the rate changes | `m` | regular monthly overpayment |
| `d`   | balance as-of date (`YYYY-MM-DD`) | `mf` | months to keep it up for |
| `nc`  | `1` to turn the rate change off | | |

Example: `?b=250000&r=4.5&p=1266.71&m=100`

## Verifying the maths

The amortisation engine was cross-checked against the closed-form solution

```
n = −ln(1 − rB/P) / ln(1+r)
```

for the single-rate case (agreeing to four decimal places on the number of months, the
residual being the fractional final payment), and against a lender's own illustration of
total amount repayable. Capped-duration overpayments were checked to total exactly
`amount × months`, and savings confirmed monotonic across amounts from £0.01 upward.

## Licence

MIT
