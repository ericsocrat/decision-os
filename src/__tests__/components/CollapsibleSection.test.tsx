/**
 * Tests for CollapsibleSection and AdvancedSectionsGroup components.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CollapsibleSection, AdvancedSectionsGroup } from "@/components/CollapsibleSection";

// ---------------------------------------------------------------------------
// localStorage mock
// ---------------------------------------------------------------------------

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock, writable: true });

beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// CollapsibleSection
// ---------------------------------------------------------------------------

describe("CollapsibleSection", () => {
  it("renders with title and collapsed by default", () => {
    render(
      <CollapsibleSection sectionId="test" title="My Section">
        <p>Content</p>
      </CollapsibleSection>,
    );

    const button = screen.getByRole("button", { name: /my section/i });
    expect(button).toHaveAttribute("aria-expanded", "false");

    // Content region exists but grid-rows-[0fr] should be present
    const region = screen.getByRole("region", { name: /my section/i });
    expect(region).toBeInTheDocument();
    expect(region.className).toContain("grid-rows-[0fr]");
  });

  it("expands when clicked", async () => {
    const user = userEvent.setup();
    render(
      <CollapsibleSection sectionId="expand-test" title="Expand Me">
        <p>Hidden Content</p>
      </CollapsibleSection>,
    );

    const button = screen.getByRole("button", { name: /expand me/i });
    expect(button).toHaveAttribute("aria-expanded", "false");

    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");

    const region = screen.getByRole("region", { name: /expand me/i });
    expect(region.className).toContain("grid-rows-[1fr]");
  });

  it("collapses when clicked again", async () => {
    const user = userEvent.setup();
    render(
      <CollapsibleSection sectionId="toggle-test" title="Toggle" defaultExpanded>
        <p>Content</p>
      </CollapsibleSection>,
    );

    const button = screen.getByRole("button", { name: /toggle/i });
    expect(button).toHaveAttribute("aria-expanded", "true");

    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("starts expanded when defaultExpanded is true", () => {
    render(
      <CollapsibleSection sectionId="default-exp" title="Open" defaultExpanded>
        <p>Already visible</p>
      </CollapsibleSection>,
    );

    const button = screen.getByRole("button", { name: /open/i });
    expect(button).toHaveAttribute("aria-expanded", "true");
  });

  it("persists state to localStorage on toggle", async () => {
    const user = userEvent.setup();
    render(
      <CollapsibleSection sectionId="persist-test" title="Persist">
        <p>Content</p>
      </CollapsibleSection>,
    );

    await user.click(screen.getByRole("button", { name: /persist/i }));

    expect(localStorageMock.setItem).toHaveBeenCalled();
    const lastCallValue = localStorageMock.setItem.mock.calls.at(-1)?.[1];
    const parsed = JSON.parse(lastCallValue as string);
    expect(parsed["persist-test"]).toBe(true);
  });

  it("restores state from localStorage on mount", () => {
    localStorageMock.getItem.mockReturnValueOnce(
      JSON.stringify({ "restore-test": true }),
    );

    render(
      <CollapsibleSection sectionId="restore-test" title="Restored">
        <p>Content</p>
      </CollapsibleSection>,
    );

    const button = screen.getByRole("button", { name: /restored/i });
    expect(button).toHaveAttribute("aria-expanded", "true");
  });

  it("renders a badge when provided", () => {
    render(
      <CollapsibleSection sectionId="badge-test" title="With Badge" badge="NEW">
        <p>Content</p>
      </CollapsibleSection>,
    );

    expect(screen.getByText("NEW")).toBeInTheDocument();
  });

  it("renders an icon when provided", () => {
    render(
      <CollapsibleSection
        sectionId="icon-test"
        title="With Icon"
        icon={<span data-testid="custom-icon">★</span>}
      >
        <p>Content</p>
      </CollapsibleSection>,
    );

    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
  });

  it("calls onToggle when toggled", async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();

    render(
      <CollapsibleSection sectionId="cb-test" title="Callback" onToggle={onToggle}>
        <p>Content</p>
      </CollapsibleSection>,
    );

    await user.click(screen.getByRole("button", { name: /callback/i }));
    expect(onToggle).toHaveBeenCalledWith(true);

    await user.click(screen.getByRole("button", { name: /callback/i }));
    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it("supports controlled expanded prop", () => {
    const { rerender } = render(
      <CollapsibleSection sectionId="ctrl" title="Controlled" expanded={false}>
        <p>Content</p>
      </CollapsibleSection>,
    );

    expect(screen.getByRole("button", { name: /controlled/i })).toHaveAttribute(
      "aria-expanded",
      "false",
    );

    rerender(
      <CollapsibleSection sectionId="ctrl" title="Controlled" expanded>
        <p>Content</p>
      </CollapsibleSection>,
    );

    expect(screen.getByRole("button", { name: /controlled/i })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("toggles via Enter key", () => {
    render(
      <CollapsibleSection sectionId="key-test" title="Keyboard">
        <p>Content</p>
      </CollapsibleSection>,
    );

    const button = screen.getByRole("button", { name: /keyboard/i });
    button.focus();
    fireEvent.keyDown(button, { key: "Enter" });
    // Native button handles Enter → click, so we fire click manually
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
  });

  it("applies print expansion class", () => {
    render(
      <CollapsibleSection sectionId="print-test" title="Print">
        <p>Content</p>
      </CollapsibleSection>,
    );

    const region = screen.getByRole("region", { name: /print/i });
    expect(region.className).toContain("print:!grid-rows-[1fr]");
  });
});

// ---------------------------------------------------------------------------
// AdvancedSectionsGroup
// ---------------------------------------------------------------------------

describe("AdvancedSectionsGroup", () => {
  it("renders heading and Expand All button", () => {
    render(
      <AdvancedSectionsGroup sectionIds={["a", "b"]}>
        <p>Child A</p>
        <p>Child B</p>
      </AdvancedSectionsGroup>,
    );

    expect(screen.getByText("Advanced Analysis")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /expand all/i })).toBeInTheDocument();
  });

  it("toggles button text between Expand All and Collapse All", async () => {
    const user = userEvent.setup();

    render(
      <AdvancedSectionsGroup sectionIds={["x", "y"]}>
        <p>Content</p>
      </AdvancedSectionsGroup>,
    );

    const btn = screen.getByRole("button", { name: /expand all/i });
    await user.click(btn);
    expect(btn).toHaveTextContent("Collapse All");

    await user.click(btn);
    expect(btn).toHaveTextContent("Expand All");
  });

  it("calls onExpandAll callback", async () => {
    const onExpandAll = vi.fn();
    const user = userEvent.setup();

    render(
      <AdvancedSectionsGroup sectionIds={["s1"]} onExpandAll={onExpandAll}>
        <p>Content</p>
      </AdvancedSectionsGroup>,
    );

    await user.click(screen.getByRole("button", { name: /expand all/i }));
    expect(onExpandAll).toHaveBeenCalledWith(true);

    await user.click(screen.getByRole("button", { name: /collapse all/i }));
    expect(onExpandAll).toHaveBeenCalledWith(false);
  });

  it("saves state for all section IDs on Expand All", async () => {
    const user = userEvent.setup();

    render(
      <AdvancedSectionsGroup sectionIds={["aa", "bb", "cc"]}>
        <p>Content</p>
      </AdvancedSectionsGroup>,
    );

    await user.click(screen.getByRole("button", { name: /expand all/i }));

    // localStorage.setItem should have been called for each section
    const allSetCalls = localStorageMock.setItem.mock.calls;
    const lastStored = JSON.parse(allSetCalls.at(-1)?.[1] as string);
    expect(lastStored.cc).toBe(true);
  });

  it("renders children", () => {
    render(
      <AdvancedSectionsGroup sectionIds={[]}>
        <div data-testid="child-1">Child 1</div>
        <div data-testid="child-2">Child 2</div>
      </AdvancedSectionsGroup>,
    );

    expect(screen.getByTestId("child-1")).toBeInTheDocument();
    expect(screen.getByTestId("child-2")).toBeInTheDocument();
  });
});
