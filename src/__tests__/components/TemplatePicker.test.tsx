/**
 * Tests for TemplatePicker modal component.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TemplatePicker } from "@/components/TemplatePicker";
import { TEMPLATES } from "@/lib/templates";

describe("TemplatePicker", () => {
  const onSelect = vi.fn();
  const onClose = vi.fn();

  function renderPicker() {
    return render(<TemplatePicker onSelect={onSelect} onClose={onClose} />);
  }

  it("renders as a dialog with proper ARIA attributes", () => {
    renderPicker();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-label", "Choose a decision template");
  });

  it("renders the heading", () => {
    renderPicker();
    expect(screen.getByText("Start from Template")).toBeInTheDocument();
  });

  it("renders a card for each template in TEMPLATES", () => {
    renderPicker();
    for (const t of TEMPLATES) {
      expect(screen.getByText(t.name)).toBeInTheDocument();
    }
  });

  it("shows template description text", () => {
    renderPicker();
    for (const t of TEMPLATES) {
      expect(screen.getByText(t.description)).toBeInTheDocument();
    }
  });

  it("shows criteria and options count for each template", () => {
    renderPicker();
    // Multiple templates may share the same count string, so use getAllByText
    const countTexts = TEMPLATES.map(
      (t) => `${t.criteria.length} criteria · ${t.options.length} options`,
    );
    const unique = [...new Set(countTexts)];
    for (const label of unique) {
      const expected = countTexts.filter((c) => c === label).length;
      expect(screen.getAllByText(label)).toHaveLength(expected);
    }
  });

  it("calls onSelect when a template card is clicked", async () => {
    renderPicker();
    const user = userEvent.setup();
    const firstCard = screen.getByText(TEMPLATES[0].name);
    await user.click(firstCard);
    expect(onSelect).toHaveBeenCalledWith(TEMPLATES[0]);
  });

  it("calls onClose when close button is clicked", async () => {
    renderPicker();
    const user = userEvent.setup();
    const closeBtn = screen.getByLabelText("Close template picker");
    await user.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when backdrop is clicked", () => {
    renderPicker();
    const backdrop = screen.getByRole("dialog");
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it("does not call onClose when content area is clicked", () => {
    renderPicker();
    onClose.mockClear();
    const heading = screen.getByText("Start from Template");
    fireEvent.click(heading);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onClose on Escape key", () => {
    renderPicker();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});
