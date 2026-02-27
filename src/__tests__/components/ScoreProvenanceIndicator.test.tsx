/**
 * Component tests for ScoreProvenanceIndicator (Issue #109).
 *
 * Validates:
 * - Manual cells render no indicator
 * - Enriched cells show data icon with source tooltip
 * - Overridden cells show user icon with override details
 * - Restore button appears and fires callback
 * - Accessibility: ARIA labels present
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScoreProvenanceIndicator } from "@/components/ScoreProvenanceIndicator";
import {
  createManualMetadata,
  createEnrichedMetadata,
  createOverrideMetadata,
} from "@/lib/provenance";

describe("ScoreProvenanceIndicator", () => {
  it("renders nothing for undefined metadata", () => {
    const { container } = render(
      <ScoreProvenanceIndicator metadata={undefined} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing for manual provenance", () => {
    const { container } = render(
      <ScoreProvenanceIndicator metadata={createManualMetadata()} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("shows enriched indicator with source tooltip", () => {
    const meta = createEnrichedMetadata(7, "CostOfLivingProvider", 2);
    render(<ScoreProvenanceIndicator metadata={meta} />);

    const indicator = screen.getByLabelText(/Enriched/);
    expect(indicator).toBeInTheDocument();
    expect(indicator.getAttribute("title")).toContain("CostOfLivingProvider");
    expect(indicator.getAttribute("title")).toContain("Tier 2");
  });

  it("shows overridden indicator with override details", () => {
    const enriched = createEnrichedMetadata(6, "Numbeo", 2);
    const overridden = createOverrideMetadata(enriched, "Local data");
    render(<ScoreProvenanceIndicator metadata={overridden} />);

    const indicator = screen.getByLabelText(/Overridden/);
    expect(indicator).toBeInTheDocument();
    expect(indicator.getAttribute("title")).toContain("Overridden");
    expect(indicator.getAttribute("title")).toContain("6");
  });

  it("shows restore button for overridden cells when canRestore is true", () => {
    const enriched = createEnrichedMetadata(8, "src", 2);
    const overridden = createOverrideMetadata(enriched);
    render(
      <ScoreProvenanceIndicator
        metadata={overridden}
        canRestore={true}
        onRestore={() => undefined}
      />,
    );

    const restoreBtn = screen.getByLabelText(/Restore enriched value/);
    expect(restoreBtn).toBeInTheDocument();
  });

  it("hides restore button when canRestore is false", () => {
    const enriched = createEnrichedMetadata(8, "src", 2);
    const overridden = createOverrideMetadata(enriched);
    render(
      <ScoreProvenanceIndicator
        metadata={overridden}
        canRestore={false}
        onRestore={() => undefined}
      />,
    );

    expect(screen.queryByLabelText(/Restore enriched value/)).not.toBeInTheDocument();
  });

  it("calls onRestore when restore button is clicked", async () => {
    const user = userEvent.setup();
    const onRestore = vi.fn();
    const enriched = createEnrichedMetadata(5, "src", 3);
    const overridden = createOverrideMetadata(enriched);

    render(
      <ScoreProvenanceIndicator
        metadata={overridden}
        canRestore={true}
        onRestore={onRestore}
      />,
    );

    await user.click(screen.getByLabelText(/Restore enriched value/));
    expect(onRestore).toHaveBeenCalledOnce();
  });

  it("enriched indicator has correct ARIA label", () => {
    const meta = createEnrichedMetadata(9, "QualityOfLifeProvider", 1);
    render(<ScoreProvenanceIndicator metadata={meta} />);

    const indicator = screen.getByLabelText(/Enriched from QualityOfLifeProvider/);
    expect(indicator).toBeInTheDocument();
  });
});
