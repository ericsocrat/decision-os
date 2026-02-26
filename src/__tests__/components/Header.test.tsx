/**
 * Tests for Header component interactions.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../test-utils";
import { Header } from "@/components/Header";

// Mock next/image since it requires a lot of Next.js internals
vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

beforeEach(() => {
  localStorage.clear();
});

describe("Header", () => {
  it("renders app title and subtitle", () => {
    renderWithProviders(<Header />);
    expect(screen.getByText("Decision OS")).toBeInTheDocument();
    expect(screen.getByText("Structured decision-making")).toBeInTheDocument();
  });

  it("renders the decision selector", () => {
    renderWithProviders(<Header />);
    const select = screen.getByRole("combobox", { name: /select decision/i });
    expect(select).toBeInTheDocument();
    // Should have at least the demo decision
    expect(select.querySelectorAll("option").length).toBeGreaterThanOrEqual(1);
  });

  it("renders New button", () => {
    renderWithProviders(<Header />);
    expect(screen.getByRole("button", { name: /create new decision/i })).toBeInTheDocument();
  });

  it("renders Templates button", () => {
    renderWithProviders(<Header />);
    expect(screen.getByRole("button", { name: /start from template/i })).toBeInTheDocument();
  });

  it("opens template picker on Templates click", async () => {
    const { user } = renderWithProviders(<Header />);
    const btn = screen.getByRole("button", { name: /start from template/i });
    await user.click(btn);
    expect(screen.getByRole("dialog", { name: /choose a decision template/i })).toBeInTheDocument();
  });

  it("renders dark mode toggle", () => {
    renderWithProviders(<Header />);
    expect(
      screen.getByRole("button", { name: /switch to (dark|light) mode/i })
    ).toBeInTheDocument();
  });

  it("renders reset demo button", () => {
    renderWithProviders(<Header />);
    expect(screen.getByRole("button", { name: /reset to demo data/i })).toBeInTheDocument();
  });
});
