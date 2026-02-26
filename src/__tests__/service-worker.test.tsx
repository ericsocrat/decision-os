/**
 * ServiceWorkerRegistrar component tests.
 *
 * Verifies service worker registration, offline indicator,
 * and update banner behavior.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/82
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, act } from "@testing-library/react";
import { renderWithProviders } from "./test-utils";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";

// ─── Mocks ─────────────────────────────────────────────────────────

// Mock process.env.NODE_ENV to be production for most tests

let mockRegistration: {
  update: ReturnType<typeof vi.fn>;
  installing: null | { state: string; addEventListener: ReturnType<typeof vi.fn> };
  addEventListener: ReturnType<typeof vi.fn>;
};

let registerPromise: Promise<typeof mockRegistration>;

beforeEach(() => {
  mockRegistration = {
    update: vi.fn(),
    installing: null,
    addEventListener: vi.fn(),
  };

  registerPromise = Promise.resolve(mockRegistration);

  // Simulate production
  vi.stubEnv("NODE_ENV", "production");

  // Mock navigator.serviceWorker
  Object.defineProperty(navigator, "serviceWorker", {
    value: {
      register: vi.fn(() => registerPromise),
      controller: { postMessage: vi.fn() },
    },
    writable: true,
    configurable: true,
  });

  // Mock navigator.onLine
  Object.defineProperty(navigator, "onLine", {
    value: true,
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("ServiceWorkerRegistrar", () => {
  it("registers the service worker in production", async () => {
    renderWithProviders(<ServiceWorkerRegistrar />);

    // Let the register promise resolve
    await act(async () => {
      await registerPromise;
    });

    expect(navigator.serviceWorker.register).toHaveBeenCalledWith("/sw.js");
  });

  it("does not register in development", async () => {
    vi.stubEnv("NODE_ENV", "development");

    renderWithProviders(<ServiceWorkerRegistrar />);

    expect(navigator.serviceWorker.register).not.toHaveBeenCalled();
  });

  it("does not register when serviceWorker is not supported", async () => {
    // Fully remove serviceWorker from navigator
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (navigator as any).serviceWorker;

    renderWithProviders(<ServiceWorkerRegistrar />);

    // Should not throw — the component gracefully handles missing API
    expect(screen.queryByText(/you are offline/i)).not.toBeInTheDocument();
  });

  it("shows offline indicator when browser goes offline", async () => {
    renderWithProviders(<ServiceWorkerRegistrar />);

    // Simulate going offline
    act(() => {
      Object.defineProperty(navigator, "onLine", {
        value: false,
        writable: true,
        configurable: true,
      });
      window.dispatchEvent(new Event("offline"));
    });

    expect(screen.getByText(/you are offline/i)).toBeInTheDocument();
  });

  it("hides offline indicator when browser comes back online", async () => {
    renderWithProviders(<ServiceWorkerRegistrar />);

    // Go offline
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    expect(screen.getByText(/you are offline/i)).toBeInTheDocument();

    // Come back online
    act(() => {
      window.dispatchEvent(new Event("online"));
    });

    expect(screen.queryByText(/you are offline/i)).not.toBeInTheDocument();
  });

  it("shows update banner when new SW version is waiting", async () => {
    let updateFoundCallback: (() => void) | undefined;
    let stateChangeCallback: (() => void) | undefined;

    mockRegistration.addEventListener = vi.fn((event: string, cb: () => void) => {
      if (event === "updatefound") updateFoundCallback = cb;
    });

    const mockWorker = {
      state: "installed",
      addEventListener: vi.fn((event: string, cb: () => void) => {
        if (event === "statechange") stateChangeCallback = cb;
      }),
    };

    renderWithProviders(<ServiceWorkerRegistrar />);

    // Wait for registration
    await act(async () => {
      await registerPromise;
    });

    // Simulate update found
    act(() => {
      mockRegistration.installing = mockWorker;
      updateFoundCallback?.();
    });

    // Simulate new worker installed
    act(() => {
      stateChangeCallback?.();
    });

    expect(screen.getByText(/new version is available/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Update/i })).toBeInTheDocument();
  });

  it("reloads page when update button is clicked", async () => {
    let updateFoundCallback: (() => void) | undefined;
    let stateChangeCallback: (() => void) | undefined;

    mockRegistration.addEventListener = vi.fn((event: string, cb: () => void) => {
      if (event === "updatefound") updateFoundCallback = cb;
    });

    const mockWorker = {
      state: "installed",
      addEventListener: vi.fn((event: string, cb: () => void) => {
        if (event === "statechange") stateChangeCallback = cb;
      }),
    };

    // Mock location.reload
    const reloadMock = vi.fn();
    Object.defineProperty(window, "location", {
      value: { ...window.location, reload: reloadMock },
      writable: true,
      configurable: true,
    });

    const { user } = renderWithProviders(<ServiceWorkerRegistrar />);

    await act(async () => {
      await registerPromise;
    });

    act(() => {
      mockRegistration.installing = mockWorker;
      updateFoundCallback?.();
    });

    act(() => {
      stateChangeCallback?.();
    });

    await user.click(screen.getByRole("button", { name: /Update/i }));

    expect(navigator.serviceWorker.controller!.postMessage).toHaveBeenCalledWith({
      type: "SKIP_WAITING",
    });
    expect(reloadMock).toHaveBeenCalled();
  });

  it("handles SW registration failure gracefully", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        register: vi.fn(() => Promise.reject(new Error("SW blocked"))),
        controller: null,
      },
      writable: true,
      configurable: true,
    });

    renderWithProviders(<ServiceWorkerRegistrar />);

    // Wait for promise rejection to be handled
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(warnSpy).toHaveBeenCalledWith("[DecisionOS] SW registration failed:", expect.any(Error));

    warnSpy.mockRestore();
  });
});
