# Temporarily turn off the SOR calculator password (reversible)

## What you get
- Visitors go straight to the staff SOR calculator and other admin pages. They never see the password screen.
- Your current password stays saved. To turn it back on later, you change one setting. You don't need to type the password again or change any code.

## How it works today
- Only the staff and admin side has a password (the calculator at "/", compare, lifecycle, migration and similar pages). The student pages, About, Work, Methodology and the reconciliation lab are already open to everyone.
- The server checks the saved password. If no password is saved, the lock turns itself off.

## Changes
1. **Add an on/off switch** called `SITE_GATE_ENABLED`, stored with your other private settings. Set it to `false` for now.
2. **Server check** (`src/lib/gate.functions.ts`): when the switch is not `"true"`, the lock reports that everyone is let in, and the unlock action simply succeeds. The saved `SITE_PASSWORD` and `SESSION_SECRET` stay as they are.
3. **Password screen** (`src/components/sor/AccessGate.tsx`): no changes needed. It already lets people through when the server says the page is unlocked. I'll add a short note in the code about the switch.
4. **Docs**: add a "Turning the password back on" section to `docs/runbook.md`.
5. **Check it**: open "/" in a fresh browser with no saved cookies and confirm the calculator loads with no password screen. Then run the tests.
6. Publish only if you ask me to.

## Turning it back on later
Change `SITE_GATE_ENABLED` to `true` (just ask me), then publish. The old password works again right away.

## Technical details
- `getGateStatus`: `if (process.env.SITE_GATE_ENABLED !== "true" || !SITE_PASSWORD) return { unlocked: true, gateEnabled: false }`.
- `unlockSite`: same short-circuit, returning `{ ok: true }`.
- I'm using a separate switch instead of deleting `SITE_PASSWORD`, so the password value isn't lost.
