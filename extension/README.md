# MortgageBuddy for Amazon

A Chrome extension that reads your Amazon basket total and tells you what that
money would take off your mortgage if you overpaid it instead.

> **£336.98 → 1 month, 17 hours**
> off your mortgage, if you overpaid instead of buying 3 items.
> Interest you'd avoid: £959.52

It appears under the subtotal on the basket page and updates as you change
quantities. The toolbar popup does the same for any amount you type, so you can
check something before it reaches the basket.

## Installing it

It isn't on the Chrome Web Store, so load it unpacked:

1. Open `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked** and choose this `extension` folder
4. The settings page opens on install — enter your mortgage, or paste a link
   from the [web calculator](https://fr4ncis.github.io/mortgagebuddy/) and press
   **Import**

Chrome will show it as an unpacked developer extension, which is expected.

## What it can see

- It runs **only** on Amazon basket URLs (`/gp/cart/*`, `/cart/*`, `/gp/aw/c/*`
  on amazon.co.uk and amazon.com). Not product pages, not checkout, not the rest
  of the web.
- It asks for one permission: `storage`, to keep your mortgage figures.
- Those figures are held in `chrome.storage.local` — **this machine only**, not
  synced to your Google account.
- It makes **no network requests at all**. Nothing about your basket or your
  mortgage leaves the browser.

To add another Amazon domain, add its cart paths to `content_scripts.matches` in
`manifest.json` and reload the extension.

## How the figures are worked out

The engine in `lib/mortgage.js` is the same one the web calculator uses: a
month-by-month amortisation where the payoff point is resolved to the fraction of
the final month's payment actually needed. That's what lets a £12 cable show up
as a day and a half rather than rounding to zero.

It assumes your monthly payment stays the same, so the saving comes off the term.
See the [main README](../README.md) for the assumptions and the lender caveat —
in particular, many lenders cut your monthly payment instead of your term unless
you tell them otherwise.

The panel compares against *your* mortgage, so the numbers are only as good as
the figures on the settings page. Re-check them when your rate changes.

## Tests

```sh
./test/run.sh          # engine, price parsing, manifest — no browser needed
```

`test/fixtures/` holds three Amazon-shaped basket pages used to test the DOM
side in a real browser: the classic `#sc-subtotal-amount-activecart` layout, the
`data-name="Subtotal"` gutter box, and one with no recognisable markup at all to
exercise the text scan and the floating panel. Serve the repo and open them:

```sh
python3 -m http.server 8000
# then http://127.0.0.1:8000/extension/test/fixtures/cart-classic.html
```

They use a stub for `chrome.*`, and take mortgage figures from the query string
(`?balance=0` for the not-set-up state, `?currency=$` for the mismatch warning).

## Why the scraping is defensive

Amazon's basket markup is not an API: it differs between locales, changes with
redesigns, and varies between A/B buckets. So `lib/amazon.js` tries a list of
known selectors, then falls back to reading the text of the page. Two rules stop
that fallback misfiring, both of which cost real bugs during development:

- the number must sit **next to a currency symbol** — "Subtotal (3 items): £142.97"
  otherwise parses as `3`
- only text **after** the word "subtotal" counts, preferring the smallest element
  that qualifies — otherwise a summary box gives you the postage line

If Amazon changes things enough to break it, the panel disappears rather than
showing a wrong number, and `AmazonCart.findSubtotal(document)` in the console
will tell you what it found.
