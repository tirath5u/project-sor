import type { LinkProps } from "@tanstack/react-router";

export type NavItem = {
  to: LinkProps["to"];
  label: string;
  blurb: string;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

/**
 * Single source of truth for site-wide wayfinding. Groups are labelled by
 * audience task, not by feature, so each visitor can self-select in one read.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Calculators",
    items: [
      { to: "/", label: "Staff calculator", blurb: "Full SOR engine for financial aid offices" },
      {
        to: "/student",
        label: "Student estimate",
        blurb: "Fast Fall/Spring estimate for students",
      },
      {
        to: "/student/advanced",
        label: "Advanced student estimate",
        blurb: "Add COA, other aid, and paid history",
      },
      {
        to: "/lifecycle",
        label: "Lifecycle tracker",
        blurb: "Cumulative undergraduate borrowing by year",
      },
    ],
  },
  {
    label: "Developers",
    items: [
      { to: "/api-docs", label: "Public API", blurb: "REST endpoints, schemas, OpenAPI 3.1" },
      { to: "/mcp-guide", label: "AI agents (MCP)", blurb: "Query the engine in natural language" },
      { to: "/compare", label: "Parity compare", blurb: "Replay published scenarios side by side" },
      { to: "/migration", label: "Version migration", blurb: "V1 to V2 contract differences" },
    ],
  },
  {
    label: "About",
    items: [
      { to: "/work", label: "Work", blurb: "Case studies and shipped products" },
      { to: "/methodology", label: "Methodology", blurb: "Sources, rounding, and caveats" },
      { to: "/releases", label: "Releases", blurb: "Version history and changelog" },
      { to: "/about", label: "About me", blurb: "Who built this and how I work" },
    ],
  },
];
