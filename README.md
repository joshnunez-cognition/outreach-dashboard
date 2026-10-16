# Outreach dashboard

A simple daily action list for prospect outreach. Open it each morning to see who needs a LinkedIn or email follow-up today.

- Today view: overdue and due follow-ups, sorted by priority or grouped by account, plus anyone with no follow-up set.
- Per-prospect LinkedIn and email lanes, each with its own last-touch and next follow-up date.
- One-click actions: Contacted (sets the next follow-up 2 business days out for LinkedIn, 3 for email), Replied, and snooze (pushes the follow-up back by the same number of business days). Gaps live in `FOLLOW_UP_BUSINESS_DAYS` in `app.js`.
- Click a name to edit their details or dates, mark "No follow-up needed" (off Today, still under Prospects), or delete them.
- Data is stored only in this browser (localStorage). Use Export backup / Import backup to move or save it.

No build step: open `index.html`, or serve the folder with any static server, e.g. `python3 -m http.server`.
