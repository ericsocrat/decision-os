/**
 * Tests for HelpTooltip component.
 *
 * Note: userEvent.click() fires mouseenter before click, so the onMouseEnter
 * handler opens the tooltip and the onClick toggle sees it as already open and
 * closes it. We use fireEvent.click for isolated click-to-open tests.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HelpTooltip } from "@/components/HelpTooltip";
import { HELP_REGISTRY } from "@/lib/help-content";

beforeEach(() => {
  localStorage.clear();
});

describe("HelpTooltip", () => {
  it("renders a trigger button with correct aria-label", () => {
    render(<HelpTooltip topic="wsm" />);
    const btn = screen.getByTestId("help-trigger-wsm");
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute("aria-label", `Help: ${HELP_REGISTRY.wsm.term}`);
  });

  it("does not render tooltip when not hovered", () => {
    render(<HelpTooltip topic="wsm" />);
    expect(screen.queryByTestId("help-tooltip-wsm")).not.toBeInTheDocument();
  });

  it("shows tooltip on mouse enter and displays content", async () => {
    const user = userEvent.setup();
    render(<HelpTooltip topic="wsm" />);
    const btn = screen.getByTestId("help-trigger-wsm");

    await user.hover(btn);

    const tooltip = screen.getByTestId("help-tooltip-wsm");
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveAttribute("role", "tooltip");
    expect(tooltip).toHaveTextContent(HELP_REGISTRY.wsm.term);
    expect(tooltip).toHaveTextContent(HELP_REGISTRY.wsm.short);

    // cleanup: close before unmount to avoid portal error
    await user.unhover(btn);
  });

  it("hides tooltip on mouse leave", async () => {
    const user = userEvent.setup();
    render(<HelpTooltip topic="wsm" />);
    const btn = screen.getByTestId("help-trigger-wsm");

    await user.hover(btn);
    expect(screen.getByTestId("help-tooltip-wsm")).toBeInTheDocument();

    await user.unhover(btn);
    expect(screen.queryByTestId("help-tooltip-wsm")).not.toBeInTheDocument();
  });

  it("shows tooltip on focus", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <HelpTooltip topic="topsis" />
        <button>other</button>
      </div>,
    );

    await user.tab();
    expect(screen.getByTestId("help-tooltip-topsis")).toBeInTheDocument();
    expect(screen.getByTestId("help-tooltip-topsis")).toHaveTextContent(HELP_REGISTRY.topsis.short);

    // cleanup: blur to close tooltip before unmount
    await user.tab();
  });

  it("hides tooltip on blur", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <HelpTooltip topic="topsis" />
        <button>other</button>
      </div>,
    );

    await user.tab(); // focuses trigger
    expect(screen.getByTestId("help-tooltip-topsis")).toBeInTheDocument();

    await user.tab(); // moves focus to "other" button
    expect(screen.queryByTestId("help-tooltip-topsis")).not.toBeInTheDocument();
  });

  it("opens tooltip on click (via fireEvent)", () => {
    render(<HelpTooltip topic="pareto" />);
    const btn = screen.getByTestId("help-trigger-pareto");

    fireEvent.click(btn);
    expect(screen.getByTestId("help-tooltip-pareto")).toBeInTheDocument();

    // close before unmount
    fireEvent.click(btn);
  });

  it("toggles tooltip closed on second click", () => {
    render(<HelpTooltip topic="pareto" />);
    const btn = screen.getByTestId("help-trigger-pareto");

    fireEvent.click(btn);
    expect(screen.getByTestId("help-tooltip-pareto")).toBeInTheDocument();

    fireEvent.click(btn);
    expect(screen.queryByTestId("help-tooltip-pareto")).not.toBeInTheDocument();
  });

  it("closes tooltip on Escape and returns focus to trigger", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <HelpTooltip topic="sensitivity" />
        <button>other</button>
      </div>,
    );
    const btn = screen.getByTestId("help-trigger-sensitivity");

    await user.tab(); // focus trigger → opens tooltip
    expect(screen.getByTestId("help-tooltip-sensitivity")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByTestId("help-tooltip-sensitivity")).not.toBeInTheDocument();
    expect(btn).toHaveFocus();
  });

  it("closes tooltip on click-away", () => {
    render(
      <div>
        <HelpTooltip topic="ahp" />
        <button data-testid="outside">outside</button>
      </div>,
    );
    const btn = screen.getByTestId("help-trigger-ahp");

    fireEvent.click(btn);
    expect(screen.getByTestId("help-tooltip-ahp")).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByTestId("outside"));
    expect(screen.queryByTestId("help-tooltip-ahp")).not.toBeInTheDocument();
  });

  it("sets aria-describedby when open", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <HelpTooltip topic="wsm" />
        <button>other</button>
      </div>,
    );
    const btn = screen.getByTestId("help-trigger-wsm");

    expect(btn).not.toHaveAttribute("aria-describedby");

    await user.hover(btn);
    expect(btn).toHaveAttribute("aria-describedby");

    const tooltipId = btn.getAttribute("aria-describedby")!;
    expect(document.getElementById(tooltipId)).toBeInTheDocument();

    // cleanup
    await user.unhover(btn);
  });

  it("renders in a portal (tooltip not inside trigger)", () => {
    render(<HelpTooltip topic="wsm" />);
    const btn = screen.getByTestId("help-trigger-wsm");

    fireEvent.click(btn);

    const tooltip = screen.getByTestId("help-tooltip-wsm");
    // Portal means the tooltip is NOT a descendant of the trigger button
    expect(btn.contains(tooltip)).toBe(false);
    // It should be a child of document.body
    expect(tooltip.parentElement).toBe(document.body);

    // cleanup
    fireEvent.click(btn);
  });

  it("only one tooltip is open at a time (singleton)", () => {
    render(
      <div>
        <HelpTooltip topic="wsm" />
        <HelpTooltip topic="topsis" />
      </div>,
    );

    fireEvent.click(screen.getByTestId("help-trigger-wsm"));
    expect(screen.getByTestId("help-tooltip-wsm")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("help-trigger-topsis"));
    expect(screen.queryByTestId("help-tooltip-wsm")).not.toBeInTheDocument();
    expect(screen.getByTestId("help-tooltip-topsis")).toBeInTheDocument();

    // cleanup
    fireEvent.click(screen.getByTestId("help-trigger-topsis"));
  });

  it("returns null for unknown topic", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { container } = render(<HelpTooltip topic={"unknown-topic" as any} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders custom children instead of default badge", () => {
    render(
      <HelpTooltip topic="wsm">
        <span data-testid="custom-child">Custom trigger</span>
      </HelpTooltip>,
    );

    expect(screen.getByTestId("custom-child")).toBeInTheDocument();
    expect(screen.getByText("Custom trigger")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("help-trigger-wsm"));
    expect(screen.getByTestId("help-tooltip-wsm")).toBeInTheDocument();

    // cleanup
    fireEvent.click(screen.getByTestId("help-trigger-wsm"));
  });

  // --- Accessibility ---
  it("trigger has role button and is keyboard-accessible", () => {
    render(<HelpTooltip topic="wsm" />);
    const btn = screen.getByTestId("help-trigger-wsm");
    expect(btn.tagName).toBe("BUTTON");
    expect(btn).toHaveAttribute("type", "button");
  });

  it("tooltip has role tooltip", () => {
    render(<HelpTooltip topic="wsm" />);
    fireEvent.click(screen.getByTestId("help-trigger-wsm"));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    // cleanup
    fireEvent.click(screen.getByTestId("help-trigger-wsm"));
  });
});
