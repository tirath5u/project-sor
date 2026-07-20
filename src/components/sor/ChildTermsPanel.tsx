import { InfoTip } from "./InfoTip";
import { NumberField } from "./NumberField";
import { Section } from "./Section";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ChildTermInput, ChildTermsInput } from "@/lib/child-terms";
import { fmtCurrency, type SORResults, type SORInputs, type TermKey } from "@/lib/sor";

interface ChildTermsPanelProps {
  inputs: SORInputs;
  results: SORResults;
  activeTermKeys: TermKey[];
  onChange: (childTerms: ChildTermsInput) => void;
}

const EMPTY_CHILD_TERMS: ChildTermsInput = {
  count: 0,
  allocationMethod: "byChildCredits",
  parents: {},
};

function childEntries(inputs: SORInputs, key: TermKey, count: number): ChildTermInput[] {
  const current = inputs.childTerms?.parents[key] ?? [];
  const parentCredits = inputs.terms[key]?.enrolledCredits ?? 0;
  return Array.from({ length: count }, (_, index) =>
    current[index] ?? { credits: count > 0 ? parentCredits / count : 0 },
  );
}

export function ChildTermsPanel({ inputs, results, activeTermKeys, onChange }: ChildTermsPanelProps) {
  const config = inputs.childTerms ?? EMPTY_CHILD_TERMS;
  const count = config.count;
  const allocation = results.childAllocations;

  function setCount(value: string) {
    const nextCount = Number(value) as ChildTermsInput["count"];
    const parents = Object.fromEntries(
      activeTermKeys.map((key) => [key, childEntries(inputs, key, nextCount)]),
    );
    onChange({ ...config, count: nextCount, parents });
  }

  function setMethod(value: ChildTermsInput["allocationMethod"]) {
    onChange({ ...config, allocationMethod: value });
  }

  function updateChild(key: TermKey, index: number, patch: Partial<ChildTermInput>) {
    const children = childEntries(inputs, key, count);
    children[index] = { ...children[index], ...patch };
    onChange({ ...config, parents: { ...config.parents, [key]: children } });
  }

  return (
    <Section
      letter="K"
      title="Optional Child Terms"
      description="Allocate each already-calculated parent-term payout across child terms or modules."
      tooltip="Child terms do not create a second SOR calculation. The parent term is calculated first, then Section K allocates that parent amount."
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <div className="text-xs font-medium text-foreground">Number of Child Terms</div>
            <InfoTip>None leaves the child-term ledger inactive. Select 1 through 4 to enable it for active parent terms.</InfoTip>
          </div>
          <Select value={String(count)} onValueChange={setCount}>
            <SelectTrigger className="h-10 rounded-lg bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0">None</SelectItem>
              <SelectItem value="1">1</SelectItem>
              <SelectItem value="2">2</SelectItem>
              <SelectItem value="3">3</SelectItem>
              <SelectItem value="4">4</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <div className="text-xs font-medium text-foreground">Child Term Allocation Method</div>
            <InfoTip>This affects Section K only. Annual SOR and parent-term payouts are calculated first.</InfoTip>
          </div>
          <Select value={config.allocationMethod} onValueChange={(value) => setMethod(value as ChildTermsInput["allocationMethod"])}>
            <SelectTrigger className="h-10 rounded-lg bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="byChildCredits">By Child Credits</SelectItem>
              <SelectItem value="equalAcrossActiveChildTerms">Equal Across Active Child Terms</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {count === 0 ? (
        <p className="mt-3 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          Child terms are inactive. Select a number above to show the child-credit and child-paid inputs.
        </p>
      ) : (
        <>
          <p className="mt-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
            Enter actual credits for each child term. Blank child rows default to an even split of the parent enrolled credits. Child paid amounts are gross and remain locked; net display applies the fee percentages shown in the calculator.
          </p>
          <div className="mt-4 space-y-4">
            {activeTermKeys.map((key) => {
              const children = childEntries(inputs, key, count);
              const rows = allocation?.rows.filter((row) => row.parentTerm === key) ?? [];
              return (
                <div key={key} className="overflow-x-auto rounded-lg border border-border/60">
                  <div className="border-b border-border/60 bg-muted/30 px-3 py-2 text-xs font-semibold">
                    {inputs.terms[key].label}
                  </div>
                  <table className="min-w-[760px] w-full text-xs">
                    <thead className="bg-background text-left text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2">Child</th>
                        <th className="px-3 py-2">Credits</th>
                        <th className="px-3 py-2">Gross Paid Sub</th>
                        <th className="px-3 py-2">Gross Paid Unsub</th>
                        <th className="px-3 py-2">Gross Paid Grad PLUS</th>
                        <th className="px-3 py-2">Scheduled Gross Sub</th>
                        <th className="px-3 py-2">Scheduled Gross Unsub</th>
                        <th className="px-3 py-2">Scheduled Gross Grad PLUS</th>
                        <th className="px-3 py-2">Scheduled Net Sub</th>
                        <th className="px-3 py-2">Scheduled Net Unsub</th>
                        <th className="px-3 py-2">Scheduled Net Grad PLUS</th>
                        <th className="px-3 py-2">Review</th>
                      </tr>
                    </thead>
                    <tbody>
                      {children.map((child, index) => {
                        const row = rows.find((item) => item.childIndex === index);
                        return (
                          <tr key={`${key}-${index}`} className="border-t border-border/40 align-top">
                            <td className="px-3 py-2 font-medium">Child {index + 1}</td>
                            <td className="w-28 px-3 py-2">
                              <NumberField label="" value={child.credits} onChange={(value) => updateChild(key, index, { credits: value })} step={0.5} inputClassName="h-8" />
                            </td>
                            <td className="w-32 px-3 py-2">
                              <NumberField label="" value={child.paidGross?.sub ?? 0} onChange={(value) => updateChild(key, index, { paidGross: { ...child.paidGross, sub: value } })} inputClassName="h-8" />
                            </td>
                            <td className="w-32 px-3 py-2">
                              <NumberField label="" value={child.paidGross?.unsub ?? 0} onChange={(value) => updateChild(key, index, { paidGross: { ...child.paidGross, unsub: value } })} inputClassName="h-8" />
                            </td>
                            <td className="w-32 px-3 py-2">
                              <NumberField label="" value={child.paidGross?.gradPlus ?? 0} onChange={(value) => updateChild(key, index, { paidGross: { ...child.paidGross, gradPlus: value } })} inputClassName="h-8" />
                            </td>
                            <td className="px-3 py-2 font-semibold">{fmtCurrency(row?.scheduledGross.sub ?? 0)}</td>
                            <td className="px-3 py-2 font-semibold">{fmtCurrency(row?.scheduledGross.unsub ?? 0)}</td>
                            <td className="px-3 py-2 font-semibold">{fmtCurrency(row?.scheduledGross.gradPlus ?? 0)}</td>
                            <td className="px-3 py-2 font-semibold">{fmtCurrency(row?.calculatedNet.sub ?? 0)}</td>
                            <td className="px-3 py-2 font-semibold">{fmtCurrency(row?.calculatedNet.unsub ?? 0)}</td>
                            <td className="px-3 py-2 font-semibold">{fmtCurrency(row?.calculatedNet.gradPlus ?? 0)}</td>
                            <td className="px-3 py-2 text-muted-foreground">{row?.review ?? "Remaining payable"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Section>
  );
}
