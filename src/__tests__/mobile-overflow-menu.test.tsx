/**
 * Tests for the MobileOverflowMenu component.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MobileOverflowMenu, type OverflowMenuItem } from "@/components/MobileOverflowMenu";

// Stub matchMedia for jsdom (Tailwind `sm:hidden` checks)
beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

function createItems(overrides?: (Partial<OverflowMenuItem> | undefined)[]): OverflowMenuItem[] {
  const defaults: OverflowMenuItem[] = [
    {
      key: "templates",
      icon: <span data-testid="icon-tpl">T</span>,
      label: "Templates",
      onClick: vi.fn(),
    },
    {
      key: "import",
      icon: <span data-testid="icon-imp">I</span>,
      label: "Import",
      onClick: vi.fn(),
    },
    {
      key: "delete",
      icon: <span data-testid="icon-del">D</span>,
      label: "Delete",
      onClick: vi.fn(),
    },
  ];
  if (overrides) {
    return defaults.map((d, i) => ({ ...d, ...overrides[i] }));
  }
  return defaults;
}

describe("MobileOverflowMenu", () => {
  it("renders the kebab trigger button", () => {
    render(<MobileOverflowMenu items={createItems()} />);
    expect(screen.getByLabelText("More actions")).toBeInTheDocument();
  });

  it("has correct ARIA attributes on trigger", () => {
    render(<MobileOverflowMenu items={createItems()} />);
    const trigger = screen.getByLabelText("More actions");
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("opens menu on click and sets aria-expanded to true", () => {
    render(<MobileOverflowMenu items={createItems()} />);
    const trigger = screen.getByLabelText("More actions");

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByText("Templates")).toBeInTheDocument();
    expect(screen.getByText("Import")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("calls item onClick and closes menu on selection", () => {
    const items = createItems();
    render(<MobileOverflowMenu items={items} />);

    fireEvent.click(screen.getByLabelText("More actions"));
    fireEvent.click(screen.getByText("Templates"));

    expect(items[0].onClick).toHaveBeenCalledOnce();
    // Menu should be closed (opacity-0 + pointer-events-none via CSS)
    expect(screen.getByLabelText("More actions")).toHaveAttribute("aria-expanded", "false");
  });

  it("closes menu on Escape key", () => {
    render(<MobileOverflowMenu items={createItems()} />);
    fireEvent.click(screen.getByLabelText("More actions"));
    expect(screen.getByLabelText("More actions")).toHaveAttribute("aria-expanded", "true");

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.getByLabelText("More actions")).toHaveAttribute("aria-expanded", "false");
  });

  it("closes menu on outside click", () => {
    render(
      <div>
        <div data-testid="outside">outside</div>
        <MobileOverflowMenu items={createItems()} />
      </div>
    );

    fireEvent.click(screen.getByLabelText("More actions"));
    expect(screen.getByLabelText("More actions")).toHaveAttribute("aria-expanded", "true");

    fireEvent.mouseDown(screen.getByTestId("outside"));

    expect(screen.getByLabelText("More actions")).toHaveAttribute("aria-expanded", "false");
  });

  it("hides items with hidden=true", () => {
    const items = createItems([undefined, undefined, { hidden: true }]);
    render(<MobileOverflowMenu items={items} />);

    fireEvent.click(screen.getByLabelText("More actions"));

    expect(screen.getByText("Templates")).toBeInTheDocument();
    expect(screen.getByText("Import")).toBeInTheDocument();
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
  });

  it("renders separator when specified", () => {
    const items: OverflowMenuItem[] = [
      { key: "a", icon: <span>A</span>, label: "Alpha", onClick: vi.fn() },
      { key: "b", icon: <span>B</span>, label: "Beta", onClick: vi.fn(), separator: true },
    ];
    render(<MobileOverflowMenu items={items} />);

    fireEvent.click(screen.getByLabelText("More actions"));

    // The separator is a div with border-t — there should be exactly one
    const menu = screen.getByRole("menu");
    const separators = menu.querySelectorAll(".border-t");
    expect(separators.length).toBe(1);
  });

  it("assigns role=menuitem to each visible button", () => {
    render(<MobileOverflowMenu items={createItems()} />);
    fireEvent.click(screen.getByLabelText("More actions"));

    const menuItems = screen.getAllByRole("menuitem");
    expect(menuItems).toHaveLength(3);
  });
});
