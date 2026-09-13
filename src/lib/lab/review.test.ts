import { describe, it, expect } from 'vitest';
import { LAB_SCENARIOS, LAB_PROCEDURES } from './fixtures';
import { compareLabRecords } from './compare';
import { retrieveProcedures, isProcedureApplicable, decideReviewGate } from './retrieval';
import { LabExplanationSchema } from './ai-contract';

describe('independent review regressions', () => {
 it('mixed matched and missing never retrieves the all-matched procedure', () => {
   const scenario = LAB_SCENARIOS[1];
   for (const [a,b] of [[scenario.systemA, scenario.systemB], [scenario.systemB, scenario.systemA]]) {
    const c = compareLabRecords(a,b);
    expect(retrieveProcedures(scenario,c).passages.map(p=>p.id)).toEqual(['FP-102']);
    expect(c.summary.absoluteDeltaCents).toBe(0);
    expect(c.summary.unmatchedAmountCents).toBe(22500);
   }
 });
 it('enforces amount threshold and equal-amount status prerequisite', () => {
   const scenario = LAB_SCENARIOS[0];
   const c = compareLabRecords(scenario.systemA, [{...scenario.systemB[0], amountCents: 0, status: 'pending'}]);
   expect(isProcedureApplicable(LAB_PROCEDURES[0],c)).toBe(false);
   expect(isProcedureApplicable(LAB_PROCEDURES[2],c)).toBe(false);
 });
 it('never permits corrections, including normal scenarios', () => {
   for (const s of LAB_SCENARIOS) {
    const c = compareLabRecords(s.systemA,s.systemB);
    expect(decideReviewGate(c,retrieveProcedures(s,c)).allowProposedCorrection).toBe(false);
   }
   expect(LabExplanationSchema.safeParse({summary:'x', observations:['x'],citedSourceIds:['FP-101'], proposedNextStep:'x', proposedCorrection:'Change the amount',uncertainty:'x',requiresHumanReview:false}).success).toBe(false);
 });
});
