import { MessagesSquare } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: "Does summer count?",
    a: (
      <>
        Sometimes. Schools genuinely publish conflicting answers, because summer can belong to this
        academic year or the next one depending on how your school builds its year. Ask your aid
        office this exact question: "Is summer part of my 2026-27 academic year for loan limit
        purposes?" Then run the{" "}
        <a href="/student/advanced" className="font-medium underline underline-offset-2">
          Advanced estimate
        </a>{" "}
        with their answer.
      </>
    ),
  },
  {
    q: "I already got my loan and dropped a class. Do I owe it back?",
    a: (
      <>
        Possibly a part of it. If your credits drop, your school recalculates your reduced limit and
        may have to return money that was already paid out. That is a school-side recalculation, not
        something this estimator can tell you. Contact your aid office before you drop.
      </>
    ),
  },
  {
    q: "Can I fix a light fall by taking more credits in spring?",
    a: (
      <>
        Yes, in most standard academic years. The percentage is based on your credits for the whole
        year, so a heavier spring can pull your percentage back up. Your school still has to
        recalculate and may only be able to adjust the loan that has not been paid out yet.
      </>
    ),
  },
  {
    q: "I am a graduate student. What happened to Grad PLUS?",
    a: (
      <>
        The same law phases out Grad PLUS for new borrowers starting in 2026-27, separately from the
        Schedule of Reductions. This estimator deliberately shows Grad PLUS as zero for 2026-27
        because eligibility depends on lifetime and aggregate checks that only your school can run.
      </>
    ),
  },
  {
    q: "Is there a minimum? What if I take one class?",
    a: (
      <>
        Yes. You must be enrolled at least half time in a term for any Direct Loan to be paid for
        that term. If half time at your school is 6 credits, a single 3-credit class is not enough,
        regardless of what percentage this page shows.
      </>
    ),
  },
  {
    q: "Does this reduce my parents' Parent PLUS loan?",
    a: (
      <>
        No. The Schedule of Reductions applies to Subsidized, Unsubsidized, and Grad PLUS. Parent
        PLUS is not reduced by this rule.
      </>
    ),
  },
  {
    q: "I heard some students are grandfathered. Is that me?",
    a: (
      <>
        Some continuing borrowers keep the older loan limit rules under a loan limit exception. Only
        your school can confirm whether you qualify, using your borrowing history. If they say yes,
        use the Advanced estimate with the exception turned on.
      </>
    ),
  },
  {
    q: "My aid offer showed a different number. Why?",
    a: (
      <>
        Your aid offer also accounts for cost of attendance, grants and scholarships, satisfactory
        academic progress, lifetime limits, and loan fees. This page only shows the reduced yearly
        maximum before all of that. Your school's number wins.
      </>
    ),
  },
  {
    q: "Does my percentage get rounded?",
    a: (
      <>
        Yes, once, to a whole percent. Open "Where this number came from" above to see your raw
        figure and the rounded result side by side.
      </>
    ),
  },
];

export function StudentFaq() {
  return (
    <section aria-labelledby="faq-heading">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-accent-foreground">
          <MessagesSquare className="h-4 w-4" />
        </span>
        <h2 id="faq-heading" className="font-display text-xl font-semibold sm:text-2xl">
          Questions students usually ask
        </h2>
      </div>
      <Accordion
        type="single"
        collapsible
        className="mt-5 rounded-2xl border border-border bg-card px-5 sm:px-6"
      >
        {FAQ.map((item, index) => (
          <AccordionItem key={item.q} value={`faq-${index}`}>
            <AccordionTrigger className="text-left text-base font-medium">
              {item.q}
            </AccordionTrigger>
            <AccordionContent className="text-sm leading-7 text-muted-foreground">
              {item.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
