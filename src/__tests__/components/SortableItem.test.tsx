/**
 * Tests for SortableItem component.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SortableItem } from "@/components/SortableItem";

/* ---------- mocks ---------- */
const mockUseSortable = vi.fn();

vi.mock("@dnd-kit/sortable", () => ({
  useSortable: (...args: unknown[]) => mockUseSortable(...args),
}));

vi.mock("@dnd-kit/utilities", () => ({
  CSS: {
    Transform: {
      toString: (t: unknown) => (t ? `translate(${(t as { x: number }).x}px, ${(t as { y: number }).y}px)` : undefined),
    },
  },
}));

function defaultSortable(overrides = {}) {
  return {
    attributes: { role: "button", tabIndex: 0 },
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
    ...overrides,
  };
}

describe("SortableItem", () => {
  beforeEach(() => {
    mockUseSortable.mockReturnValue(defaultSortable());
  });

  it("renders children inside the wrapper", () => {
    render(
      <SortableItem id="item-1">
        <span>Test child</span>
      </SortableItem>,
    );
    expect(screen.getByText("Test child")).toBeInTheDocument();
  });

  it("renders drag handle with default aria-label", () => {
    render(
      <SortableItem id="item-1">
        <span>Content</span>
      </SortableItem>,
    );
    expect(screen.getByLabelText("Drag to reorder")).toBeInTheDocument();
  });

  it("accepts a custom dragLabel", () => {
    render(
      <SortableItem id="item-1" dragLabel="Move criterion">
        <span>Content</span>
      </SortableItem>,
    );
    expect(screen.getByLabelText("Move criterion")).toBeInTheDocument();
  });

  it("has aria-roledescription sortable on the handle", () => {
    render(
      <SortableItem id="item-1">
        <span>Content</span>
      </SortableItem>,
    );
    const handle = screen.getByLabelText("Drag to reorder");
    expect(handle).toHaveAttribute("aria-roledescription", "sortable");
  });

  it("passes the id to useSortable", () => {
    render(
      <SortableItem id="criterion-42">
        <span>X</span>
      </SortableItem>,
    );
    expect(mockUseSortable).toHaveBeenCalledWith({ id: "criterion-42" });
  });

  it("applies isDragging visual classes when dragging", () => {
    mockUseSortable.mockReturnValue(defaultSortable({ isDragging: true }));
    const { container } = render(
      <SortableItem id="item-1">
        <span>Dragging</span>
      </SortableItem>,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain("z-10");
    expect(wrapper.className).toContain("opacity-60");
    expect(wrapper.className).toContain("shadow-lg");
  });

  it("does not apply isDragging classes when not dragging", () => {
    const { container } = render(
      <SortableItem id="item-1">
        <span>Static</span>
      </SortableItem>,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).not.toContain("opacity-60");
  });
});
