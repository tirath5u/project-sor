/**
 * PDF case-file export using jsPDF + jsPDF-AutoTable.
 * Produces a branded, multi-page report summarizing the SOR calculation.
 */

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { fmtCurrency, type SORInputs, type SORResults, type TermResult } from "./sor";
import { GRADE_LABELS } from "./loanLimits";

interface ExportArgs {
  inputs: SORInputs;
  results: SORResults;
  scenarioTitle?: string;
  scenarioId?: string;
}

/**
 * jspdf-autotable attaches `lastAutoTable` to the jsPDF instance at runtime
 * but does not augment the type. Narrow once here so call sites stay typed.
 */
type DocWithAutoTable = jsPDF & { lastAutoTable: { finalY: number } };

const COLOR_PRIMARY: [number, number, number] = [75, 46, 131]; // #4B2E83 deep purple
const COLOR_INK: [number, number, number] = [33, 25, 56];
const COLOR_MUTED: [number, number, number] = [110, 105, 130];
const COLOR_DIVIDER: [number, number, number] = [225, 222, 235];

function fmtDate(d = new Date()): string {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

function pretty(d = new Date()): string {
  return d.toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

/**
 * Sanitize strings for jsPDF's default helvetica font (WinAnsi encoding).
 * Replaces common Unicode characters that would otherwise render as broken
 * glyphs (e.g. arrow → renders as !' and breaks line-width measurement).
 */
function safe(text: string): string {
  return text
    .replace(/[→⟶⇒]/g, "->")
    .replace(/[←⟵⇐]/g, "<-")
    .replace(/[↔⇔]/g, "<->")
    .replace(/[•·]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[…]/g, "...")
    .replace(/[✓]/g, "[x]")
    .replace(/[✗✘]/g, "[ ]");
}

export function exportSORCaseFile({
  inputs,
  results,
  scenarioTitle,
  scenarioId,
}: ExportArgs): void {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;

  // ---------- HEADER BAND ----------
  doc.setFillColor(...COLOR_PRIMARY);
  doc.rect(0, 0, pageWidth, 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(safe("Schedule of Reductions - Case File"), margin, 32);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(safe(`Generated ${pretty()}`), margin, 50);
  if (scenarioTitle) {
    doc.text(safe(`Scenario: ${scenarioTitle}`), margin, 62);
  }

  let y = 95;
  doc.setTextColor(...COLOR_INK);

  const sectionHeading = (label: string) => {
    if (y > 720) {
      doc.addPage();
      y = 50;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...COLOR_PRIMARY);
    doc.text(safe(label), margin, y);
    doc.setDrawColor(...COLOR_DIVIDER);
    doc.line(margin, y + 4, pageWidth - margin, y + 4);
    doc.setTextColor(...COLOR_INK);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    y += 18;
  };

  const writeKV = (rows: Array<[string, string]>) => {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      body: rows.map(([k, v]) => [safe(k), safe(v)]),
      theme: "plain",
      styles: { fontSize: 9.5, cellPadding: { top: 2, bottom: 2, left: 0, right: 4 } },
      columnStyles: {
        0: { cellWidth: 170, textColor: COLOR_MUTED },
        1: { textColor: COLOR_INK, fontStyle: "bold" },
      },
    });

    y = (doc as DocWithAutoTable).lastAutoTable.finalY + 14;
  };

  // ---------- 1. STUDENT & LOAN PERIOD ----------
  sectionHeading("1. Student & Loan Period");
  writeKV([
    ["Grade level", GRADE_LABELS[inputs.gradeLevel] ?? inputs.gradeLevel],
    ["Dependency", inputs.dependency],
    ["Annual financial need", fmtCurrency(inputs.annualNeed)],
    ["AY full-time credits", String(inputs.ayFtCredits)],
    ["Standard terms", String(inputs.numStandardTerms)],
    ["Calendar / AY type", `AC${inputs.calType} · ${inputs.ayType}`],
    ["Program level", inputs.programLevel],
    ["Parent PLUS denied", inputs.parentPlusDenied ? "Yes" : "No"],
    ["Override statutory limits", inputs.overrideLimits ? "Yes" : "No"],
    ["View mode", inputs.viewMode],
    ["Distribution model", inputs.distributionModel],
  ]);

  // ---------- 2. COMPUTED BASELINES ----------
  sectionHeading("2. Computed baselines");
  {
    const baselineText = safe(
      `Effective statutory caps: Sub ${fmtCurrency(
        results.effectiveSubStatutory,
      )} + Unsub ${fmtCurrency(
        results.effectiveUnsubStatutory,
      )} = Combined annual limit ${fmtCurrency(results.effectiveCombinedLimit)}.`,
    );
    const split1 = doc.splitTextToSize(baselineText, pageWidth - margin * 2);
    doc.text(split1, margin, y);
    y += split1.length * 11 + 4;

    const ruleText = safe(
      `Combined Limit Shifting Rule: Sub baseline = MIN(Annual Need ${fmtCurrency(
        inputs.annualNeed,
      )}, Sub cap ${fmtCurrency(results.effectiveSubStatutory)}) = ${fmtCurrency(
        results.subBaseline,
      )}. Unsub baseline = Combined limit ${fmtCurrency(
        results.effectiveCombinedLimit,
      )} - Sub baseline ${fmtCurrency(results.subBaseline)} = ${fmtCurrency(
        results.unsubBaseline,
      )}.`,
    );
    const split2 = doc.splitTextToSize(ruleText, pageWidth - margin * 2);
    doc.text(split2, margin, y);
    y += split2.length * 11 + 6;
  }
  if (results.additionalUnsubBase > 0) {
    doc.setTextColor(...COLOR_PRIMARY);
    doc.text(
      safe(
        `+ ${fmtCurrency(results.additionalUnsubBase)} additional Unsub from PLUS-denial uplift.`,
      ),
      margin,
      y,
    );
    doc.setTextColor(...COLOR_INK);
    y += 16;
  }

  // ---------- 3. PER-TERM ENROLLMENT ----------
  const visibleTerms: TermResult[] = results.termResults.filter((t) => t.enabled);
  sectionHeading("3. Per-term enrollment");
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Term", "FT", "Enrolled", "Paid Sub", "Paid Unsub", "Refund S/U", "COA cap S/U"]],
    body: visibleTerms.map((t) => [
      safe(t.label),
      String(t.ftCredits),
      String(t.enrolledCredits),
      fmtCurrency(t.paidSub),
      fmtCurrency(t.paidUnsub),
      `${fmtCurrency(t.refundSub)} / ${fmtCurrency(t.refundUnsub)}`,
      safe(
        `${t.coaCapSub ? fmtCurrency(t.coaCapSub) : "—"} / ${
          t.coaCapUnsub ? fmtCurrency(t.coaCapUnsub) : "—"
        }`,
      ),
    ]),
    headStyles: { fillColor: COLOR_PRIMARY, textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 8.5, textColor: COLOR_INK },
    alternateRowStyles: { fillColor: [248, 246, 252] },
    styles: { cellPadding: 4 },
  });

  y = (doc as DocWithAutoTable).lastAutoTable.finalY + 18;

  // ---------- 4. RESULTS MATRIX ----------
  sectionHeading("4. Results matrix");
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [
      [
        "Term",
        "Term %",
        "Enrollment Intensity (EI) %",
        "Share Sub",
        "Share Unsub",
        "Final Sub",
        "Final Unsub",
        "Net Paid",
        "Status",
      ],
    ],
    body: visibleTerms.map((t) => [
      safe(t.label),
      pct(t.termPctCapped),
      pct(t.intensityPct),
      fmtCurrency(t.shareSub),
      fmtCurrency(t.shareUnsub),
      fmtCurrency(t.finalSub),
      fmtCurrency(t.finalUnsub),
      fmtCurrency(t.netPaidSub + t.netPaidUnsub),
      safe(t.disbursed ? "PAID" : t.eligible ? "Eligible" : "Below 1/2-time"),
    ]),
    headStyles: { fillColor: COLOR_PRIMARY, textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 8.5, textColor: COLOR_INK },
    alternateRowStyles: { fillColor: [248, 246, 252] },
    styles: { cellPadding: 4 },
  });

  y = (doc as DocWithAutoTable).lastAutoTable.finalY + 18;

  // ---------- 5. ANNUAL TOTALS ----------
  sectionHeading("5. Annual totals");
  writeKV([
    ["Academic Year enrollment %", pct(results.sorPctRounded)],
    ["Annual Sub limit (reduced)", fmtCurrency(results.reducedSub)],
    ["Annual Unsub limit (reduced)", fmtCurrency(results.reducedUnsub)],
    ["Final Sub disbursed (sum)", fmtCurrency(results.totalFinalSub)],
    ["Final Unsub disbursed (sum)", fmtCurrency(results.totalFinalUnsub)],
    ["Remaining Sub headroom", fmtCurrency(results.remainingSub)],
    ["Remaining Unsub headroom", fmtCurrency(results.remainingUnsub)],
  ]);

  // ---------- 6. STEP WALKTHROUGH ----------
  sectionHeading("6. Step walkthrough");
  const eligibleTerms = results.termResults.filter((t) => t.eligible);
  const enabledTerms = results.termResults.filter((t) => t.enabled);
  const ayPctRoundedPct = Math.round(results.sorPctRounded * 100);
  const shareSubLine = eligibleTerms.map((t) => `${t.label} ${fmtCurrency(t.shareSub)}`).join(", ");
  const shareUnsubLine = eligibleTerms
    .map((t) => `${t.label} ${fmtCurrency(t.shareUnsub)}`)
    .join(", ");

  // Step 3 formula proof - equal vs proportional
  const N = results.eligibleTermsCount;
  const equalSubPer = N > 0 ? Math.floor(results.reducedSub / N) : 0;
  const equalUnsubPer = N > 0 ? Math.floor(results.reducedUnsub / N) : 0;
  const eligibleFtSum = eligibleTerms.reduce((s, t) => s + t.ftCredits, 0);
  let step3Formula = "";
  if (N > 0) {
    if (inputs.distributionModel === "equal") {
      const subRem = results.reducedSub - equalSubPer * N;
      const unsubRem = results.reducedUnsub - equalUnsubPer * N;
      step3Formula =
        ` Equal model: Sub ${fmtCurrency(results.reducedSub)} / ${N} = ${fmtCurrency(equalSubPer)} per term` +
        (subRem !== 0 ? ` (last term absorbs +${fmtCurrency(subRem)})` : "") +
        `; Unsub ${fmtCurrency(results.reducedUnsub)} / ${N} = ${fmtCurrency(equalUnsubPer)} per term` +
        (unsubRem !== 0 ? ` (last term absorbs +${fmtCurrency(unsubRem)})` : "") +
        ".";
    } else {
      step3Formula =
        ` Proportional model: each term's share = pool x (term FT / ${eligibleFtSum} eligible-term FT). ` +
        eligibleTerms
          .map(
            (t) =>
              `${t.label} Sub = ${fmtCurrency(results.reducedSub)} x (${t.ftCredits}/${eligibleFtSum}) = ${fmtCurrency(t.shareSub)}`,
          )
          .join("; ") +
        ".";
    }
  }

  const steps: string[] = [
    `Step 1 - Initial maxima (Combined Limit Shifting Rule): Sub = MIN(Annual Need ${fmtCurrency(
      inputs.annualNeed,
    )}, Sub cap ${fmtCurrency(results.effectiveSubStatutory)}) = ${fmtCurrency(
      results.subBaseline,
    )}. Unsub = Combined limit ${fmtCurrency(
      results.effectiveCombinedLimit,
    )} - ${fmtCurrency(results.subBaseline)} = ${fmtCurrency(results.unsubBaseline)}.`,
    `Step 2 - Academic Year enrollment %: ${results.enrolledSumAll} / ${results.ftSumAll} = ${(
      results.enrollmentFractionRaw * 100
    ).toFixed(2)}% -> rounded to ${ayPctRoundedPct}%. Reduced annual Sub ${fmtCurrency(
      results.subBaseline,
    )} x ${ayPctRoundedPct}% = ${fmtCurrency(
      results.reducedSub,
    )}; Unsub ${fmtCurrency(results.unsubBaseline)} x ${ayPctRoundedPct}% = ${fmtCurrency(
      results.reducedUnsub,
    )}.`,
    `Step 3 - Per-term share via "${inputs.distributionModel}" model across ${results.eligibleTermsCount} eligible term(s).${step3Formula} Resulting Sub split: ${shareSubLine || "n/a"}. Unsub split: ${shareUnsubLine || "n/a"}.`,
    `Step 4 - Term enrollment % (term enrolled / term FT): ${enabledTerms
      .map(
        (t) =>
          `${t.label} ${t.effectiveCredits}/${t.ftCredits} = ${Math.round(
            t.termPct * 100,
          )}%${t.eligible ? "" : " (ineligible, below half-time)"}`,
      )
      .join("; ")}.`,
    `Step 5 - Disbursement = share x min(term %, 100%); over/underflow carries forward; finals clamped to per-term COA caps. ${enabledTerms
      .filter((t) => t.eligible)
      .map((t) => {
        const pctCapped = Math.min(100, Math.round(t.termPct * 100));
        const subPart = `Sub ${fmtCurrency(t.shareSub)} x ${pctCapped}% = ${fmtCurrency(t.calcSub)}${t.coaCapSub > 0 && t.calcSub > t.coaCapSub ? ` -> COA-capped to ${fmtCurrency(t.finalSub)}` : ""}`;
        const unsubPart =
          t.shareUnsub > 0 || t.calcUnsub > 0
            ? `; Unsub ${fmtCurrency(t.shareUnsub)} x ${pctCapped}% = ${fmtCurrency(t.calcUnsub)}${t.coaCapUnsub > 0 && t.calcUnsub > t.coaCapUnsub ? ` -> ${fmtCurrency(t.finalUnsub)}` : ""}`
            : "";
        return `${t.label}: ${subPart}${unsubPart}. Final ${fmtCurrency(t.finalSub)} Sub / ${fmtCurrency(t.finalUnsub)} Unsub.`;
      })
      .join(" ")}`,
  ];
  steps.forEach((s) => {
    if (y > 720) {
      doc.addPage();
      y = 50;
    }
    const split = doc.splitTextToSize(safe(s), pageWidth - margin * 2);
    doc.text(split, margin, y);
    y += split.length * 11 + 6;
  });

  // ---------- FOOTER ----------
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_MUTED);
    doc.text(
      safe(`Generated by Schedule of Reductions Calculator · Page ${i} of ${total}`),
      margin,
      doc.internal.pageSize.getHeight() - 20,
    );
  }

  const idPart = scenarioId || "custom";
  doc.save(`SOR-case-file-${idPart}-${fmtDate()}.pdf`);
}
