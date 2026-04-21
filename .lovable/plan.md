

# Fix broken Step 2 rendering in PDF export

## The bug

In the exported PDF, **Step 2** of the walkthrough renders with garbled letter-spacing (`S t e p  2 — A Y...`), shows `!'` instead of an arrow, runs off the right edge, and gets cut off mid-sentence ("Reduced annual Sub" → never finishes). Steps 3–5 render correctly.

## Root cause

Step 2's string contains the Unicode right-arrow character `→` (U+2192). jsPDF's default `helvetica` font uses WinAnsi encoding, which does not include `→`. When jsPDF hits an unsupported glyph it:

1. Falls back to drawing each character individually with broken kerning (the spaced-out look).
2. Mis-measures the line width, so `splitTextToSize` cannot wrap it.
3. Substitutes `!'` for the arrow.
4. Lets the over-wide line overflow the right margin, clipping the rest of the sentence onto a phantom continuation that breaks across pages.

Steps 3–5 only use characters in WinAnsi (`÷`, `×`, `—`, `½`), which is why they render fine.

## The fix

In `src/lib/pdfExport.ts`, replace the unsupported Unicode characters in the step strings with WinAnsi-safe equivalents:

- `→` → `->` (or `=>`)
- Audit all other step strings for any non-WinAnsi characters and swap them too (defensive — `½` in the matrix `"Below ½-time"` IS WinAnsi-safe, so that stays).

Specifically Step 2 becomes:
```
Step 2 — AY enrollment %: 24 ÷ 36 = 75.00% -> rounded to 75%. Reduced annual Sub $1,500, Unsub $2,625.
```

This keeps the visual meaning intact while staying within the encoding the default font supports — no font-embedding overhead needed.

## Optional hardening (small, recommended)

Add a tiny `safe()` helper in `pdfExport.ts` that strips/replaces any non-WinAnsi characters before passing strings to `doc.text()` / `autoTable`. One-pass map covers the common offenders (`→ ⇒ ⟶ ✓ ✗ • → ←`) so this class of bug can't reappear if someone later adds emoji or another arrow elsewhere in the PDF body.

## Files to edit

- **Edit**: `src/lib/pdfExport.ts` — replace `→` with `->` in the Step 2 string; add the optional `safe()` helper and route all `doc.text()` calls through it.

## Out of scope

- Embedding a Unicode TTF font in the PDF (would let arrows render natively but adds ~200KB to the bundle and isn't worth it for one arrow).
- Restyling the walkthrough layout — current rendering is correct once the encoding issue is fixed.

