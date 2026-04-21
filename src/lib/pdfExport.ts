/**
 * PDF case-file export using jsPDF + jsPDF-AutoTable.
 * Produces a branded, multi-page report summarizing the SOR calculation.
 */

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  fmtCurrency,
  type SORInputs,
  type SORResults,
  type TermResult,
} from "./sor";
import { GRADE_LABELS } from "./loanLimits";

interface ExportArgs {
  inputs: SORInputs;
  results: SORResults;
  scenarioTitle?: string;
  scenarioId?: string;
}

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
  doc.text(safe("Schedule of Reductions — Case File"), margin, 32);
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
    
    y = (doc as any).lastAutoTable.finalY + 14;
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
  doc.text(
    safe(`Sub baseline ${fmtCurrency(results.subBaseline)} · Unsub baseline ${fmtCurrency(
      results.unsubBaseline,
    )} · derived from $${inputs.subStatutory.toLocaleString()} / $${inputs.unsubStatutory.toLocaleString()} statutory caps via the Combined Limit Shifting Rule.`),
    margin,
    y,
    { maxWidth: pageWidth - margin * 2 },
  );
  y += 30;
  if (results.additionalUnsubBase > 0) {
    doc.setTextColor(...COLOR_PRIMARY);
    doc.text(
      safe(`+ ${fmtCurrency(results.additionalUnsubBase)} additional Unsub from PLUS-denial uplift.`),
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
      safe(`${t.coaCapSub ? fmtCurrency(t.coaCapSub) : "—"} / ${
        t.coaCapUnsub ? fmtCurrency(t.coaCapUnsub) : "—"
      }`),
    ]),
    headStyles: { fillColor: COLOR_PRIMARY, textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 8.5, textColor: COLOR_INK },
    alternateRowStyles: { fillColor: [248, 246, 252] },
    styles: { cellPadding: 4 },
  });
  
  y = (doc as any).lastAutoTable.finalY + 18;

  // ---------- 4. RESULTS MATRIX ----------
  sectionHeading("4. Results matrix");
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [
      [
        "Term",
        "Term %",
        "Intensity %",
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
  
  y = (doc as any).lastAutoTable.finalY + 18;

  // ---------- 5. ANNUAL TOTALS ----------
  sectionHeading("5. Annual totals");
  writeKV([
    ["AY %", pct(results.sorPctRounded)],
    ["Annual Sub limit (reduced)", fmtCurrency(results.reducedSub)],
    ["Annual Unsub limit (reduced)", fmtCurrency(results.reducedUnsub)],
    ["Final Sub disbursed (sum)", fmtCurrency(results.totalFinalSub)],
    ["Final Unsub disbursed (sum)", fmtCurrency(results.totalFinalUnsub)],
    ["Remaining Sub headroom", fmtCurrency(results.remainingSub)],
    ["Remaining Unsub headroom", fmtCurrency(results.remainingUnsub)],
  ]);

  // ---------- 6. STEP WALKTHROUGH ----------
  sectionHeading("6. Step walkthrough");
  const steps: string[] = [
    `Step 1 — Initial maxima: Sub baseline ${fmtCurrency(
      results.subBaseline,
    )}, Unsub baseline ${fmtCurrency(results.unsubBaseline)} (statutory caps $${inputs.subStatutory.toLocaleString()} / $${inputs.unsubStatutory.toLocaleString()}).`,
    `Step 2 — AY enrollment %: ${results.enrolledSumAll} ÷ ${results.ftSumAll} = ${(
      results.enrollmentFractionRaw * 100
    ).toFixed(2)}% → rounded to ${pct(results.sorPctRounded)}. Reduced annual Sub ${fmtCurrency(
      results.reducedSub,
    )}, Unsub ${fmtCurrency(results.reducedUnsub)}.`,
    `Step 3 — Per-term share via "${inputs.distributionModel}" model across ${results.eligibleTermsCount} eligible term(s).`,
    `Step 4 — Per-term enrollment intensity (term enrolled ÷ term FT). Capped to 100% for disbursement math.`,
    `Step 5 — Disbursement = share × min(intensity, 100%). Unspent share carries forward to remaining eligible terms; finals are clamped to per-term COA caps.`,
  ];
  steps.forEach((s) => {
    if (y > 720) {
      doc.addPage();
      y = 50;
    }
    const split = doc.splitTextToSize(s, pageWidth - margin * 2);
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
      `Generated by Schedule of Reductions Calculator · Page ${i} of ${total}`,
      margin,
      doc.internal.pageSize.getHeight() - 20,
    );
  }

  const idPart = scenarioId || "custom";
  doc.save(`SOR-case-file-${idPart}-${fmtDate()}.pdf`);
}
