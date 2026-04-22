# Finalize SOR setup + README + next steps for the hub

## What you're keeping vs changing

You said: **do not rename** "SOR Calculator - Schedule of Reductions" in the app. That stays as-is. "Project SOR" is just the GitHub/Lovable project name. The user-facing brand on this tool remains **SOR Calculator – Schedule of Reductions**, served at `sor.myproduct.life`.

So this turn, the app code stays exactly as it is. No rename to `__root.tsx`, `index.tsx`, `lifecycle.tsx`, or `pdfExport.ts`.

## What I'll actually do

### 1. Create `README.md` at the project root

Tool-focused README for the GitHub repo. Sections:

1. Tagline + **Try it now** link to `https://sor.myproduct.life`
2. Screenshot placeholder (`docs/screenshot.png`) you can drop an image into
3. What it does (5 bullets: reduced Sub/Unsub baselines, per-term disbursements, history-anchored disbursement view, PDF case-file export, 12 ED scenarios)
4. Who it's for (FAA, devs, QA, PMs)
5. The 5-step SOR formula (compressed)
6. Hard rules teams miss (lifted from your Claude draft)
7. How to use the tool (pick scenario → adjust inputs → 6-step walkthrough → export PDF)
8. Sources & confidence (Confirmed / Inferred / Pending labels)
9. Local development: `bun install`, `bun dev`, `bun test` — TanStack Start + Vite + Tailwind v4
10. Contributing & issues
11. Disclaimer (not an ED publication, not an Anthology product, not a substitute for the COD Tech Ref)
12. Author + links to `myproduct.life` and LinkedIn placeholder

Drops from your Claude draft (those belong on the hub site, not this repo): full 5-tag table, LLE grandfathering matrix, Workforce Pell section, product-strategy section, status table.

### 2. Quick fix for the React #418 hydration error

You're hitting a hydration mismatch in production (minified React error 418). I'll do a quick SSR-safety pass on any client-only `Date.now()` / `new Date()` / `Math.random()` rendering in `src/routes/index.tsx` and `pdfExport.ts` so the preview stops crashing.

---

## Answers to your blockers (no code, just guidance)

### Your DNS is already done — you're not stuck, you're just one step away

Looking at the records you pasted, DNS is **fully configured correctly**:

- `A @ → 185.158.133.1` ✅ root domain
- `A sor → 185.158.133.1` ✅ subdomain for this project
- `A www → 185.158.133.1` ✅ www
- `TXT _lovable` ✅ root verification
- `TXT _lovable.sor` ✅ subdomain verification
- `TXT _lovable.www` ✅ www verification

**Custom Domain URL already shows `https://sor.myproduct.life` as Active for this project.** That means Step 3 is done. Nothing left to do in the DNS Manager dialog — you can close it.

To confirm: open `https://sor.myproduct.life` in a new browser tab. If the SOR calculator loads, you're live. If it shows "Verifying" or "Setting up", give it 5–60 minutes for SSL provisioning. - this shows Publish or update your Lovable project for it to appear here.

### GitHub repo is still named `reduction-ray`

The clone URL `https://github.com/tirath5u/reduction-ray.git` means the repo on GitHub.com was never renamed. Fix it manually on GitHub (this is a 30-second operation Lovable cannot do for you):

1. Go to `https://github.com/tirath5u/reduction-ray - when i open this - it opens to` [tirath5u/project-sor](https://github.com/tirath5u/project-sor)
2. **Settings** tab (top of repo) → scroll to **Repository name**
3. Change `reduction-ray` → `project-sor` → **Rename - its already project-sor**
4. GitHub auto-redirects the old URL, so the Lovable ↔ GitHub sync keeps working without reconnecting
5. New clone URL becomes `https://github.com/tirath5u/project-sor.git`

### Move the root domain `myproduct.life` to the hub project

Right now `myproduct.life` (apex) and `www.myproduct.life` are pointing at THIS project (the SOR calculator). You want them pointing at `myproduct-hub` instead. Do this in Lovable's UI:

1. Open this project (Project SOR) → **Project Settings → Domains**
2. Find `myproduct.life` (the apex, not `sor.myproduct.life`) → **⋯ → Remove**. Do the same for `www.myproduct.life`. **Keep** `sor.myproduct.life` connected. - they are already removed - its only [sor.myproduct.life](http://sor.myproduct.life) now - changed this before you wrote this. 
3. Open the `myproduct-hub` project → **Project Settings → Domains → Connect Domain**
4. Add `myproduct.life`, then add `www.myproduct.life` separately. Set apex as **Primary** so www redirects to it.
5. The DNS records already exist (`A @`, `A www`), so Lovable will verify in minutes, not hours.

**While the apex is being moved**, `myproduct.life` may briefly 404 or show the SOR app — that's normal during the swap. `sor.myproduct.life` keeps working the whole time. - pleasecheck if htings look ok now. 

### Build the hub site (separate task, not this turn)

Once the domain is moved to `myproduct-hub`, that project needs actual content — white + light-maroon landing page with a tile linking to `sor.myproduct.life`. That's a separate prompt in the `myproduct-hub` Lovable project, not here.

---

## Files to change (this turn)

- **Create** `README.md` at project root
- **Edit** `src/routes/index.tsx` — SSR-safe any client-only date/random rendering (hydration fix)

## Out of scope (you do these yourself, outside this project)

- Renaming the GitHub repo `reduction-ray` → `project-sor` (do it on GitHub.com)
- Moving `myproduct.life` apex from SOR to hub (do it in Lovable Project Settings)
- Building the `myproduct-hub` landing page (separate Lovable project)
- Renaming the user-facing app title (you said keep it)