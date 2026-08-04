import type { LinkProps } from "@tanstack/react-router";

export type NavItem = {
  to: LinkProps["to"];
  label: string;
  blurb: string;
};

export type NavGroup = {
  label: string;
  caption?: string;
  items: NavItem[];
};

/**
 * Single source of truth for site-wide wayfinding. Groups are labelled by
 * audience task, not by feature, so each visitor can self-select in one read.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "SOR Calculators",
    caption:
      "Direct Loan Schedule of Reductions under the One Big Beautiful Bill Act, 2026-27",
    items: [
      {
        to: "/",
        label: "Staff SOR calculator",
        blurb: "Full Schedule of Reductions engine for financial aid offices",
      },
      {
        to: "/student",
        label: "Student SOR estimate",
        blurb: "Fast Fall and Spring loan limit estimate for students",
      },
      {
        to: "/student/advanced",
        label: "Advanced student SOR estimate",
        blurb: "Add cost of attendance, other aid, and paid history",
      },
      {
        to: "/lifecycle",
        label: "SOR lifecycle tracker",
        blurb: "Cumulative undergraduate borrowing by year",
      },
    ],
  },
  {
    label: "Developers & AI agents",
    caption: "Open contracts for the same engine that powers the calculators",
    items: [
      { to: "/api-docs", label: "Public SOR API", blurb: "REST endpoints, schemas, OpenAPI 3.1" },
      {
        to: "/mcp-guide",
        label: "Ask an AI agent (MCP)",
        blurb: "Query the engine in natural language",
      },
      { to: "/compare", label: "Parity compare", blurb: "Replay published scenarios side by side" },
      { to: "/migration", label: "Version migration", blurb: "V1 to V2 contract differences" },
    ],
  },
  {
    label: "Product work",
    caption: "Higher-ed product management, built in public and source-backed",
    items: [
      { to: "/work", label: "Product work", blurb: "Case studies and shipped products" },
      { to: "/methodology", label: "Methodology", blurb: "Sources, rounding, and caveats" },
      { to: "/releases", label: "Releases", blurb: "Version history and changelog" },
      { to: "/about", label: "About Tirath", blurb: "Who built this and how I work" },
    ],
  },
];
