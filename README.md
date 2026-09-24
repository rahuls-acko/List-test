# Placement Study — collect results in a Google Sheet

Three parts: a Google Sheet with a small script (receives results), the study page
(`index.html` + `fonts.css`, sends results), and a static host for the page.
About 15 minutes, all free, no server.

## 1. The Sheet (5 min)

1. Create a blank Google Sheet. Name it "Placement study".
2. Extensions → Apps Script. Delete what is there, paste the whole of `Code.gs`, save.
3. Deploy → New deployment → gear icon → **Web app**.
   - Description: anything
   - Execute as: **Me**
   - Who has access: **Anyone**  (this is what lets participants post without logging in)
4. Authorize when asked (it only touches this one spreadsheet).
5. Copy the **Web app URL** (ends in `/exec`). Open it in a new tab once: you should see
   "Placement Study collector is running."

Every time you change `Code.gs`, use Deploy → **Manage deployments** → edit → new version,
or the old code keeps running.

## 2. The page (1 min)

Open `index.html` in any text editor and paste the URL into the line near the top of the script:

    const SHEET_ENDPOINT = 'https://script.google.com/macros/s/…/exec';

Save. Nothing else changes.

## 3. Hosting (3 min)

The claude.ai artifact link cannot reach Google (its sandbox blocks all outbound requests),
so the page must live on a normal static host. Either:

- **Netlify Drop**: go to app.netlify.com/drop, drag the folder containing `index.html` and
  `fonts.css` onto the page. You get a link like `https://something.netlify.app` instantly.
  Free, no account needed for the first site.
- **GitHub Pages**: put the two files in a repo, Settings → Pages → deploy from main.

Share that link. Add `#results` to the end of it for the analyser (it still works on
pasted codes; the Sheet is the primary record).

## What lands in the Sheet

**Responses** — one row per participant: received time, id, phone/laptop, group A/B,
OS, touch, viewport, and the two preference taps (which layout, which was shown first,
time to decide).

**Tasks** — one row per participant per screen: placement (leading/trailing), success,
total time, time to first tap, taps, wrong taps, undo, dead taps, what the first tap
landed on, pause before finishing, scrolls, plus the per-screen extras (first-tap
correct, first fix time, time to find Select, row taps before Select, search and
select-all use).

A participant id is written once. Refreshing the thank-you page does not double-count.

## If the post fails

The page falls back to the old behaviour: it shows a response code and asks the person
to send it. Paste those into `#results` as before. Most common cause: the deployment's
"Who has access" is not "Anyone", or the URL pasted is the editor URL instead of the
`/exec` one.

## Pivot to read it

In the Sheet: Insert → Pivot table on **Tasks**. Rows: task, placement. Values:
success (average), time_ms (median), wrong (average), first_tap_ms (median). Filter by
device. That reproduces the `#results` view.
