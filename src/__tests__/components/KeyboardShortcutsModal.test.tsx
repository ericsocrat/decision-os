/**
 * Tests for KeyboardShortcutsModal component.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { KeyboardShortcutsModal, formatKey } from "@/components/KeyboardShortcutsModal";

describe("KeyboardShortcutsModal", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <KeyboardShortcutsModal open={false} onClose={vi.fn()} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders dialog when open", () => {
    render(<KeyboardShortcutsModal open={true} onClose={vi.fn()} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();
  });

  it("has correct ARIA attributes", () => {
    render(<KeyboardShortcutsModal open={true} onClose={vi.fn()} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-label", "Keyboard shortcuts");
  });

  it("renders all shortcut entries", () => {
    render(<KeyboardShortcutsModal open={true} onClose={vi.fn()} />);
    // Check some key shortcuts are rendered
    expect(screen.getByText("Builder tab")).toBeInTheDocument();
    expect(screen.getByText("Results tab")).toBeInTheDocument();
    expect(screen.getByText("Undo")).toBeInTheDocument();
    expect(screen.getByText("Redo")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(<KeyboardShortcutsModal open={true} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("Close shortcuts"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    render(<KeyboardShortcutsModal open={true} onClose={onClose} />);
    // Click the backdrop (outermost div with onClick={onClose})
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not close when modal content is clicked", () => {
    const onClose = vi.fn();
    render(<KeyboardShortcutsModal open={true} onClose={onClose} />);
    // Click the "Keyboard Shortcuts" text inside the modal content
    fireEvent.click(screen.getByText("Keyboard Shortcuts"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("renders kbd elements for shortcut keys", () => {
    const { container } = render(
      <KeyboardShortcutsModal open={true} onClose={vi.fn()} />
    );
    const kbds = container.querySelectorAll("kbd");
    expect(kbds.length).toBeGreaterThan(0);
    // Check one specific shortcut key
    const kbdTexts = Array.from(kbds).map((k) => k.textContent);
    expect(kbdTexts).toContain("Ctrl+Z");
    expect(kbdTexts).toContain("?");
  });
});

describe("formatKey", () => {
  it("returns key unchanged on non-Mac platforms", () => {
    // JSDOM navigator.platform defaults to empty or non-Mac
    expect(formatKey("Ctrl+Z")).toBe("Ctrl+Z");
    expect(formatKey("Alt+1")).toBe("Alt+1");
    expect(formatKey("Ctrl+Shift+Z")).toBe("Ctrl+Shift+Z");
  });

  it("replaces modifiers with Mac symbols on macOS", () => {
    const original = Object.getOwnPropertyDescriptor(navigator, "platform");
    Object.defineProperty(navigator, "platform", { value: "MacIntel", configurable: true });
    try {
      expect(formatKey("Ctrl+Z")).toBe("\u2318Z");
      expect(formatKey("Alt+1")).toBe("\u23251");
      expect(formatKey("Ctrl+Shift+Z")).toBe("\u2318\u21E7Z");
    } finally {
      if (original) {
        Object.defineProperty(navigator, "platform", original);
      } else {
        Object.defineProperty(navigator, "platform", { value: "", configurable: true });
      }
    }
  });
});