/**
 * Component tests for ConfidenceIndicator (Issue #114).
 *
 * Validates:
 * - Three visual confidence levels (high/medium/low)
 * - Tooltip with source, tier, confidence details
 * - Only renders for enriched/overridden cells
 * - Accessible: aria-label describes confidence level
 * - Color-blind safe: data-confidence attribute for testing
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConfidenceIndicator } from "@/components/ConfidenceIndicator";
import {
  createManualMetadata,
  createEnrichedMetadata,
  createOverrideMetadata,
} from "@/lib/provenance";

describe("ConfidenceIndicator", () => {
  it("renders nothing for undefined metadata", () => {
    const { container } = render(
      <ConfidenceIndicator metadata={undefined} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing for manual provenance", () => {
    const { container } = render(
      <ConfidenceIndicator metadata={createManualMetadata()} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("shows high confidence for Tier 1 enriched data", () => {
    const meta = createEnrichedMetadata(8, "NumbeoLiveAPI", 1);
    render(<ConfidenceIndicator metadata={meta} />);

    const indicator = screen.getByLabelText(/High confidence/);
    expect(indicator).toBeInTheDocument();
    expect(indicator.getAttribute("data-confidence")).toBe("high");
    expect(indicator.getAttribute("title")).toContain("Live data");
    expect(indicator.getAttribute("title")).toContain("NumbeoLiveAPI");
  });

  it("shows medium confidence for Tier 2 enriched data", () => {
    const meta = createEnrichedMetadata(6, "BundledDataset", 2);
    render(<ConfidenceIndicator metadata={meta} />);

    const indicator = screen.getByLabelText(/Medium confidence/);
    expect(indicator).toBeInTheDocument();
    expect(indicator.getAttribute("data-confidence")).toBe("medium");
    expect(indicator.getAttribute("title")).toContain("Bundled data");
    expect(indicator.getAttribute("title")).toContain("BundledDataset");
  });

  it("shows low confidence for Tier 3 estimated data", () => {
    const meta = createEnrichedMetadata(4, "RegionalEstimator", 3);
    render(<ConfidenceIndicator metadata={meta} />);

    const indicator = screen.getByLabelText(/Low confidence/);
    expect(indicator).toBeInTheDocument();
    expect(indicator.getAttribute("data-confidence")).toBe("low");
    expect(indicator.getAttribute("title")).toContain("Estimated");
    expect(indicator.getAttribute("title")).toContain("RegionalEstimator");
  });

  it("renders for overridden cells using original tier", () => {
    const enriched = createEnrichedMetadata(7, "Provider", 2);
    const overridden = createOverrideMetadata(enriched);
    render(<ConfidenceIndicator metadata={overridden} />);

    const indicator = screen.getByLabelText(/Medium confidence/);
    expect(indicator).toBeInTheDocument();
    expect(indicator.getAttribute("title")).toContain("Provider");
  });

  it("tooltip includes tier number", () => {
    const meta = createEnrichedMetadata(9, "Source", 1);
    render(<ConfidenceIndicator metadata={meta} />);

    const indicator = screen.getByLabelText(/High confidence/);
    expect(indicator.getAttribute("title")).toContain("Tier 1");
  });

  it("tooltip includes enriched value", () => {
    const meta = createEnrichedMetadata(5, "Source", 3);
    render(<ConfidenceIndicator metadata={meta} />);

    const indicator = screen.getByLabelText(/Low confidence/);
    expect(indicator.getAttribute("title")).toContain("Value: 5");
  });

  it("has accessible aria-label describing the confidence level", () => {
    const meta = createEnrichedMetadata(7, "CostOfLivingProvider", 2);
    render(<ConfidenceIndicator metadata={meta} />);

    const indicator = screen.getByLabelText(/Medium confidence.*Bundled data/);
    expect(indicator).toBeInTheDocument();
  });
});
