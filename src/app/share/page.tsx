/**
 * /share route — read-only presentation of a shared decision.
 *
 * Decodes decision data from the URL hash fragment (#d=...)
 * and renders a clean, presentation-ready view with no editing controls.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/4
 */

import type { Metadata } from "next";
import { ShareView } from "@/components/ShareView";

export const metadata: Metadata = {
  title: "Shared Decision — Decision OS",
  description:
    "View a shared decision analysis — rankings, score breakdown, sensitivity analysis, and top drivers.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SharePage() {
  return <ShareView />;
}
