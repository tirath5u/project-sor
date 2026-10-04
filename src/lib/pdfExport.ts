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

const COLOR_PRIMARY: [number, number, number] = [122, 31, 46]; // #7A1F2E maroon
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

export function pdfAllocationLines(results: SORResults) {
  const eligibleTerms = results.termResults.filter((term) => term.eligible);
  const enabledTerms = results.termResults.filter((term) => term.enabled);
  const subShares = eligibleTerms.map((term) => `${term.label} ${fmtCurrency(term.shareSub)}`).join(", ") || "n/a";
  const unsubShares = eligibleTerms.map((term) => `${term.label} ${fmtCurrency(term.shareUnsub)}`).join(", ") || "n/a";
  const step3 = results.loanPeriodScope === "singleTerm"
    ? `Step 3 - The selected payment period receives the amount reduced in Step 2. No Equal or Proportional distribution and no second SOR percentage apply. Sub ${subShares}. Unsub ${unsubShares}.`
    : `Step 3 - ${results.effectiveDistributionModel === "equal" ? "Equal" : "Proportional"} allocation of the reduced annual amount. Shares include eligibility, paid-history, and rounding effects. Sub split: ${subShares}. Unsub split: ${unsubShares}.`;
  const step5 = `Step 5 - The term percentage in Step 4 is informational, not a second multiplier. Final payouts reflect allocated shares, paid history, and applicable term caps. ${enabledTerms
    .filter((term) => term.eligible)
    .map((term) => {
      const sub = `Sub share ${fmtCurrency(term.shareSub)}, calculated ${fmtCurrency(term.calcSub)}${term.coaCapSub > 0 && term.calcSub > term.coaCapSub ? ` -> COA-capped to ${fmtCurrency(term.finalSub)}` : ""}`;
      const unsub = term.shareUnsub > 0 || term.calcUnsub > 0
        ? `; Unsub share ${fmtCurrency(term.shareUnsub)}, calculated ${fmtCurrency(term.calcUnsub)}${term.coaCapUnsub > 0 && term.calcUnsub > term.coaCapUnsub ? ` -> ${fmtCurrency(term.finalUnsub)}` : ""}`
        : "";
      return `${term.label}: ${sub}${unsub}. Final ${fmtCurrency(term.finalSub)} Sub / ${fmtCurrency(term.finalUnsub)} Unsub.`;
    })
    .join(" ")}`;
  return { step3, step5 };
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
    ["Distribution model", results.effectiveDistributionModel],
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
        `${t.coaCapSub ? fmtCurrency(t.coaCapSub) : "-"} / ${
          t.coaCapUnsub ? fmtCurrency(t.coaCapUnsub) : "-"
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
  const enabledTerms = results.termResults.filter((t) => t.enabled);
  const ayPctRoundedPct = Math.round(results.sorPctRounded * 100);
  const appliedStage = results.calculationStages?.find((stage) => stage.id === "ordinary-pre-sor-maximum")?.output;
  const appliedSub = typeof appliedStage?.appliedSubBaseline === "number" ? appliedStage.appliedSubBaseline : results.subBaseline;
  const appliedUnsub = typeof appliedStage?.appliedUnsubBaseline === "number" ? appliedStage.appliedUnsubBaseline : results.unsubBaseline;
  const allocationLines = pdfAllocationLines(results);

  const steps: string[] = [
    `Step 1 - Initial maxima (Combined Limit Shifting Rule): Sub = MIN(Annual Need ${fmtCurrency(
      inputs.annualNeed,
    )}, Sub cap ${fmtCurrency(results.effectiveSubStatutory)}) = ${fmtCurrency(
      results.subBaseline,
    )}. Unsub = Combined limit ${fmtCurrency(
      results.effectiveCombinedLimit,
    )} - ${fmtCurrency(results.subBaseline)} = ${fmtCurrency(results.unsubBaseline)}.`,
    `Step 2 - ${results.loanPeriodScope === "singleTerm" ? "Selected-term" : "Academic Year"} enrollment %: ${results.enrolledSumAll} / ${results.ftSumAll} = ${(
      results.enrollmentFractionRaw * 100
    ).toFixed(2)}% -> rounded to ${ayPctRoundedPct}%. Reduced ${results.loanPeriodScope === "singleTerm" ? "selected-term" : "annual"} Sub ${fmtCurrency(
      appliedSub,
    )} x ${ayPctRoundedPct}% = ${fmtCurrency(
      results.reducedSub,
    )}; Unsub ${fmtCurrency(appliedUnsub)} x ${ayPctRoundedPct}% = ${fmtCurrency(
      results.reducedUnsub,
    )}.`,
    allocationLines.step3,
    `Step 4 - Term enrollment % (term enrolled / term FT): ${enabledTerms
      .map(
        (t) =>
          `${t.label} ${t.effectiveCredits}/${t.ftCredits} = ${Math.round(
            t.termPct * 100,
          )}%${t.eligible ? "" : " (ineligible, below half-time)"}`,
      )
      .join("; ")}.`,
    allocationLines.step5,
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
