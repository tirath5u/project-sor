import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "What is a Schedule of Reductions?",
    a: "It is the rule that lowers your annual Direct Loan maximum when you enroll in fewer credits than your school's full-time definition. Fewer credits means a smaller loan maximum for the year.",
  },
  {
    q: "Why do my credits matter so much?",
    a: "Your loan maximum is scaled by how many credits you actually take compared to a full-time load, added up across the terms in your academic year.",
  },
  {
    q: "Is this my actual award?",
    a: "No. Only your school's financial aid office can determine your real eligibility and disbursements. This tool is an estimate you can bring to that conversation.",
  },
  {
    q: "Do you store anything I enter?",
    a: "No. Nothing you type is saved, and the tool never asks for your name, ID, or FAFSA data.",
  },
  {
    q: "What should I do next?",
    a: "If the estimate is lower than you expected, talk with your financial aid advisor about your credit load, term plans, and any remaining aid options before the term starts.",
  },
];

export function StudentFaq() {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-7">
      <h2 className="font-display text-2xl font-bold tracking-tight">Student questions</h2>
      <Accordion type="single" collapsible className="mt-4">
        {faqs.map((faq) => (
          <AccordionItem key={faq.q} value={faq.q}>
            <AccordionTrigger className="text-left font-display text-sm font-semibold">
              {faq.q}
            </AccordionTrigger>
            <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
              {faq.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}