/**
 * Unit tests for CriterionTooltip component.
 *
 * Verifies accessible, keyboard-navigable, touch-friendly tooltip behavior.
 */

import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CriterionTooltip } from "@/components/CriterionTooltip";

function renderTooltip(props?: Partial<{ description: string; criterionName: string }>) {
  const user = userEvent.setup();
  const result = render(
    <CriterionTooltip
      description={props?.description ?? "Measures overall quality"}
      criterionName={props?.criterionName ?? "Quality"}
    />
  );
  return { user, ...result };
}

describe("CriterionTooltip", () => {
  it("renders a button with accessible label", () => {
    renderTooltip();
    const btn = screen.getByRole("button", { name: "Description for Quality" });
    expect(btn).toBeInTheDocument();
  });

  it("tooltip is hidden by default", () => {
    renderTooltip();
    const tooltip = screen.getByRole("tooltip", { hidden: true });
    expect(tooltip).toHaveClass("invisible");
  });

  it("shows tooltip on focus (keyboard / touch tap)", async () => {
    const { user } = renderTooltip();
    await user.tab();
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).not.toHaveClass("invisible");
  });

  it("hides tooltip on blur", async () => {
    const { user } = renderTooltip();
    await user.tab(); // focus
    expect(screen.getByRole("tooltip")).not.toHaveClass("invisible");
    await user.tab(); // blur away
    // Wait for hide timeout (150ms in component) to settle inside act()
    await waitFor(() => {
      expect(screen.getByRole("tooltip", { hidden: true })).toHaveClass("invisible");
    });
  });

  it("hides tooltip on Escape key", async () => {
    const { user } = renderTooltip();
    await user.tab(); // focus to show
    expect(screen.getByRole("tooltip")).not.toHaveClass("invisible");
    await user.keyboard("{Escape}");
    expect(screen.getByRole("tooltip", { hidden: true })).toHaveClass("invisible");
  });

  it("has aria-expanded attribute that tracks open state", async () => {
    const { user } = renderTooltip();
    const btn = screen.getByRole("button", { name: "Description for Quality" });
    expect(btn).toHaveAttribute("aria-expanded", "false");
    await user.tab();
    expect(btn).toHaveAttribute("aria-expanded", "true");
  });

  it("has aria-describedby linking to tooltip", () => {
    renderTooltip();
    const btn = screen.getByRole("button", { name: "Description for Quality" });
    const tooltip = screen.getByRole("tooltip", { hidden: true });
    expect(btn.getAttribute("aria-describedby")).toBe(tooltip.id);
  });

  it("displays the description text", () => {
    renderTooltip({ description: "Custom description text" });
    expect(screen.getByRole("tooltip", { hidden: true })).toHaveTextContent(
      "Custom description text"
    );
  });
});
