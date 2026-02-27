/**
 * CoachmarkOverlay — 3-step onboarding tour with positioned coachmarks.
 *
 * Each step highlights a target element and shows a tooltip with an arrow.
 * Features: focus trap, Escape/outside-click to dismiss, dark mode, responsive.
 */

"use client";

import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import { Target, Pencil, FlaskConical, X } from "lucide-react";
import type { OnboardingStep } from "@/hooks/useOnboarding";

interface CoachmarkOverlayProps {
  step: OnboardingStep;
  onNext: () => void;
  onDismiss: () => void;
}

interface StepConfig {
  targetSelector: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  button: string;
}

const STEPS: Record<Exclude<OnboardingStep, "idle">, StepConfig> = {
  step1: {
    targetSelector: "#panel-results",
    icon: <Target className="h-5 w-5 text-blue-500" />,
    title: "See Your Decision, Ranked",
    body: "Decision OS scores and ranks your options based on the criteria and weights you define. This demo compares job offers.",
    button: "Next →",
  },
  step2: {
    targetSelector: "#panel-builder",
    icon: <Pencil className="h-5 w-5 text-blue-500" />,
    title: "Define Your Decision",
    body: "Add options, set criteria, assign weights, and score each option. Try changing a score and watch the results update instantly.",
    button: "Next →",
  },
  step3: {
    targetSelector: "#panel-sensitivity",
    icon: <FlaskConical className="h-5 w-5 text-blue-500" />,
    title: "Test Your Decision\u2019s Robustness",
    body: "Sensitivity analysis and Monte Carlo simulation show if your top choice holds up under uncertainty.",
    button: "Get Started! ✓",
  },
};

interface Position {
  top: number;
  left: number;
  arrowLeft: number;
}

export function CoachmarkOverlay({ step, onNext, onDismiss }: CoachmarkOverlayProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position | null>(null);

  // Position the coachmark relative to the target element's tab button
  const updatePosition = useCallback(() => {
    if (step === "idle") return;
    // Position relative to the corresponding tab button
    const tabId =
      step === "step1" ? "tab-results" : step === "step2" ? "tab-builder" : "tab-sensitivity";
    const tabEl = document.getElementById(tabId);
    if (!tabEl) {
      setPosition(null);
      return;
    }

    const rect = tabEl.getBoundingClientRect();
    const cardWidth = Math.min(360, window.innerWidth - 32);

    // Position below the tab button
    let left = rect.left + rect.width / 2 - cardWidth / 2;
    // Clamp to viewport
    left = Math.max(16, Math.min(left, window.innerWidth - cardWidth - 16));

    const arrowLeft = rect.left + rect.width / 2 - left;

    setPosition({
      top: rect.bottom + 12 + window.scrollY,
      left,
      arrowLeft: Math.max(20, Math.min(arrowLeft, cardWidth - 20)),
    });
  }, [step]);

  // Compute initial position synchronously before paint (legitimate pattern:
  // DOM measurement → setState is exactly what useLayoutEffect is for).
  useLayoutEffect(() => {
    if (step === "idle") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- DOM measurement before paint
    updatePosition();
  }, [step, updatePosition]);

  // Re-compute on resize/scroll
  useEffect(() => {
    if (step === "idle") return;
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [step, updatePosition]);

  // Escape key handler — always active while overlay is visible
  useEffect(() => {
    if (step === "idle") return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onDismiss();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [step, onDismiss]);

  // Focus trap: focus the card when it appears and trap Tab
  useEffect(() => {
    if (step === "idle") return;
    const card = cardRef.current;
    if (!card) return;

    // Focus the primary action button
    const btn = card.querySelector<HTMLElement>("[data-coachmark-next]");
    btn?.focus();

    const handleTrap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusable = card.querySelectorAll<HTMLElement>(
        'button, [href], [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleTrap);
    return () => document.removeEventListener("keydown", handleTrap);
  }, [step, position]);

  if (step === "idle") return null;

  const config = STEPS[step];
  const stepNum = step === "step1" ? 1 : step === "step2" ? 2 : 3;

  return (
    <div
      className="fixed inset-0 z-50"
      data-testid={`onboarding-step-${stepNum}`}
      role="dialog"
      aria-modal="true"
      aria-label={`Onboarding step ${stepNum} of 3: ${config.title}`}
    >
      {/* Semi-transparent backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onDismiss}
        data-testid="coachmark-backdrop"
      />

      {/* Coachmark card */}
      {position && (
        <div
          ref={cardRef}
          className="absolute w-[calc(100vw-2rem)] max-w-[360px] rounded-xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-gray-700 p-5 animate-in fade-in slide-in-from-top-2 duration-200"
          style={{
            top: position.top,
            left: position.left,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Arrow pointer */}
          <div
            className="absolute -top-2 w-4 h-4 rotate-45 bg-white dark:bg-gray-800 border-l border-t border-gray-200 dark:border-gray-700"
            style={{ left: position.arrowLeft - 8 }}
          />

          {/* Close button (Skip tour) top-right */}
          <button
            onClick={onDismiss}
            className="absolute top-3 right-3 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Skip tour"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Content */}
          <div className="flex items-start gap-3 mb-3">
            <div className="mt-0.5 shrink-0">{config.icon}</div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {config.title}
              </h3>
            </div>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4 pl-8">
            {config.body}
          </p>

          {/* Footer: step indicator + actions */}
          <div className="flex items-center justify-between pl-8">
            {/* Step dots */}
            <div className="flex items-center gap-1.5" aria-hidden="true">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className={`h-1.5 rounded-full transition-all duration-200 ${
                    n === stepNum
                      ? "w-4 bg-blue-600 dark:bg-blue-400"
                      : n < stepNum
                        ? "w-1.5 bg-blue-300 dark:bg-blue-600"
                        : "w-1.5 bg-gray-300 dark:bg-gray-600"
                  }`}
                />
              ))}
              <span className="sr-only">Step {stepNum} of 3</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onDismiss}
                className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                Skip tour
              </button>
              <button
                data-coachmark-next
                onClick={onNext}
                className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
              >
                {config.button}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
