/**
 * Main app page — Tab-based layout for Decision Builder, Results, and Sensitivity.
 * Includes keyboard shortcuts: 1/2/3 = switch tabs, ? = help.
 */

"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useSyncExternalStore,
  lazy,
  Suspense,
} from "react";
import { AnnouncerProvider, useAnnounce } from "@/components/Announcer";
import { DecisionProvider, useDecisionData, useActions } from "@/components/DecisionProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { TabErrorFallback } from "@/components/TabErrorFallback";
import { Header } from "@/components/Header";
import { DecisionBuilder } from "@/components/DecisionBuilder";
import { ResultsView } from "@/components/ResultsView";
import { MigrationBanner } from "@/components/MigrationBanner";
import { DecisionSkeleton } from "@/components/DecisionSkeleton";
import { ImportModal } from "@/components/ImportModal";
import { useValidation } from "@/hooks/useValidation";
import { useOnboarding } from "@/hooks/useOnboarding";
import { computeCompleteness } from "@/lib/completeness";
import { isEmptyDecision, generateId } from "@/lib/utils";
import type { Decision } from "@/lib/types";
import { CoachmarkOverlay } from "@/components/CoachmarkOverlay";
import {
  Settings2,
  BarChart3,
  Activity,
  GitCompareArrows,
  Dices,
  Keyboard,
  Upload,
  HelpCircle,
  History,
} from "lucide-react";
import { KeyboardShortcutsModal } from "@/components/KeyboardShortcutsModal";
import { ToastProvider, showToast } from "@/components/Toast";
import { validateFile, readFileAsText, importFromJson } from "@/lib/import";
import { saveDecision } from "@/lib/storage";
import { useAuth } from "@/hooks/useAuth";
import { EmptyState } from "@/components/EmptyState";
import { useWizardMode } from "@/hooks/useWizardMode";
import { ModeToggle } from "@/components/ModeToggle";
import { DEMO_DECISION } from "@/lib/demo-data";
import pkg from "../../package.json";

/* Lazy-load heavy tab views — only downloaded when their tab is first shown */
const SensitivityView = lazy(() =>
  import("@/components/SensitivityView").then((m) => ({ default: m.SensitivityView }))
);
const CompareView = lazy(() =>
  import("@/components/CompareView").then((m) => ({ default: m.CompareView }))
);
const MonteCarloView = lazy(() =>
  import("@/components/MonteCarloView").then((m) => ({ default: m.MonteCarloView }))
);
const VersionHistory = lazy(() => import("@/components/VersionHistory"));
const GuidedWizard = lazy(() =>
  import("@/components/GuidedWizard").then((m) => ({ default: m.GuidedWizard }))
);

/** Skeleton fallback for lazy-loaded tab panels */
function TabPanelSkeleton({ label }: Readonly<{ label: string }>) {
  return (
    <output className="block animate-pulse space-y-4 py-6" aria-label={`Loading ${label}…`}>
      <div className="h-6 w-48 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="h-64 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
      <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
    </output>
  );
}

const emptySubscribe = () => () => {};
function useIsMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

type Tab = "builder" | "results" | "sensitivity" | "compare" | "montecarlo" | "history";

const tabLabels: Record<Tab, string> = {
  builder: "Builder",
  results: "Results",
  sensitivity: "Sensitivity",
  compare: "Compare",
  montecarlo: "Monte Carlo",
  history: "History",
};

const TAB_IDS: Tab[] = ["builder", "results", "sensitivity", "compare", "montecarlo", "history"];

function AppContent() {
  const onboarding = useOnboarding();
  // First-time visitors start on Results tab (onboarding step 1)
  const [activeTab, setActiveTab] = useState<Tab>(
    onboarding.step === "step1" ? "results" : "builder"
  );
  const [showShortcuts, setShowShortcuts] = useState(false);
  const shortcutTriggerRef = useRef<HTMLButtonElement>(null);
  const announce = useAnnounce();
  const { decision, isLoading } = useDecisionData();
  const { undo, redo, loadDecision } = useActions();
  const validation = useValidation(decision);
  const completeness = useMemo(() => computeCompleteness(decision), [decision]);
  const auth = useAuth();
  const { mode, setMode } = useWizardMode();
  const isAdvanced = mode === "advanced";

  // ── Empty-state detection ──
  const isEmpty = !isLoading && isEmptyDecision(decision);

  /** Template quick-start: instantiate and save the decision. */
  const handleLoadTemplate = useCallback(
    (templateDecision: Decision) => {
      saveDecision(templateDecision);
      loadDecision(templateDecision.id);
    },
    [loadDecision]
  );

  /** Load the built-in demo decision. */
  const handleLoadDemo = useCallback(() => {
    saveDecision(DEMO_DECISION);
    loadDecision(DEMO_DECISION.id);
  }, [loadDecision]);

  /** Start a blank decision in the builder. */
  const handleStartBlank = useCallback(() => {
    // Create an empty decision shell with a fresh ID
    const blank: Decision = {
      id: generateId(),
      title: "",
      options: [],
      criteria: [],
      scores: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveDecision(blank);
    loadDecision(blank.id);
    setActiveTab("builder");
  }, [loadDecision]);

  // ── Onboarding: tab switching handled in callbacks (no effect) ──
  const handleOnboardingNext = useCallback(() => {
    const currentStep = onboarding.step;
    onboarding.next();
    // Advance tab to match the next step
    if (currentStep === "step1") setActiveTab("builder");
    else if (currentStep === "step2") setActiveTab("sensitivity");
    else if (currentStep === "step3") setActiveTab("builder"); // end of tour
  }, [onboarding]);

  const handleOnboardingDismiss = useCallback(() => {
    onboarding.dismiss();
    setActiveTab("builder");
  }, [onboarding]);

  // ── Global drag-and-drop for file import ──────────────────
  const [showDropOverlay, setShowDropOverlay] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const dropCounter = useRef(0);

  const handleGlobalDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    dropCounter.current++;
    if (e.dataTransfer?.types.includes("Files")) {
      setShowDropOverlay(true);
    }
  }, []);

  const handleGlobalDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    dropCounter.current--;
    if (dropCounter.current === 0) {
      setShowDropOverlay(false);
    }
  }, []);

  const handleGlobalDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
  }, []);

  const handleGlobalDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault();
      setShowDropOverlay(false);
      dropCounter.current = 0;
      const file = e.dataTransfer?.files[0];
      if (!file) return;

      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
      const fileErrors = validateFile(file);
      if (fileErrors.length > 0) {
        showToast({ text: fileErrors[0].message });
        return;
      }

      if (ext === ".csv") {
        // CSV needs preview — open import modal
        setShowImportModal(true);
        return;
      }

      // JSON — import directly
      try {
        const content = await readFileAsText(file);
        const result = importFromJson(content);
        if (result.success && result.decision) {
          saveDecision(result.decision);
          loadDecision(result.decision.id);
          showToast({ text: `Imported "${result.decision.title}" successfully!` });
        } else {
          showToast({ text: result.errors[0]?.message || "Import failed." });
        }
      } catch {
        showToast({ text: "Failed to read file." });
      }
    },
    [loadDecision]
  );

  useEffect(() => {
    window.addEventListener("dragenter", handleGlobalDragEnter);
    window.addEventListener("dragleave", handleGlobalDragLeave);
    window.addEventListener("dragover", handleGlobalDragOver);
    window.addEventListener("drop", handleGlobalDrop);
    return () => {
      window.removeEventListener("dragenter", handleGlobalDragEnter);
      window.removeEventListener("dragleave", handleGlobalDragLeave);
      window.removeEventListener("dragover", handleGlobalDragOver);
      window.removeEventListener("drop", handleGlobalDrop);
    };
  }, [handleGlobalDragEnter, handleGlobalDragLeave, handleGlobalDragOver, handleGlobalDrop]);

  // Focus the active tab button after tab change via arrow keys
  const activateTab = useCallback(
    (tab: Tab) => {
      setActiveTab(tab);
      announce(`${tabLabels[tab]} tab`);
      document.getElementById(`tab-${tab}`)?.focus();
    },
    [announce]
  );

  // Arrow key navigation within the tablist (WAI-ARIA Tabs Pattern)
  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const idx = TAB_IDS.indexOf(activeTab);
      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          activateTab(TAB_IDS[(idx + 1) % TAB_IDS.length]);
          break;
        case "ArrowLeft":
          e.preventDefault();
          activateTab(TAB_IDS[(idx + TAB_IDS.length - 1) % TAB_IDS.length]);
          break;
        case "Home":
          e.preventDefault();
          activateTab(TAB_IDS[0]);
          break;
        case "End":
          e.preventDefault();
          activateTab(TAB_IDS[TAB_IDS.length - 1]);
          break;
      }
    },
    [activeTab, activateTab]
  );

  // Restore focus to trigger element when modal closes
  const closeModal = useCallback(() => {
    setShowShortcuts(false);
    shortcutTriggerRef.current?.focus();
  }, []);

  // Global keyboard shortcuts (1/2/3/?/Ctrl+Z/Ctrl+Shift+Z)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Undo/Redo — works even in inputs (Ctrl/Cmd + Z/Shift+Z/Y)
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if (mod && ((e.key === "z" && e.shiftKey) || e.key === "y")) {
        e.preventDefault();
        redo();
        return;
      }

      // Ignore remaining shortcuts when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (isAdvanced) {
        switch (e.key) {
          case "1":
            setActiveTab("builder");
            announce("Builder tab");
            break;
          case "2":
            setActiveTab("results");
            announce("Results tab");
            break;
          case "3":
            setActiveTab("sensitivity");
            announce("Sensitivity tab");
            break;
          case "4":
            setActiveTab("compare");
            announce("Compare tab");
            break;
          case "5":
            setActiveTab("montecarlo");
            announce("Monte Carlo tab");
            break;
          case "6":
            setActiveTab("history");
            announce("History tab");
            break;
          case "?":
            setShowShortcuts((prev) => !prev);
            break;
          case "Escape":
            closeModal();
            break;
        }
      } else if (e.key === "Escape") {
        closeModal();
      }
    },
    [closeModal, announce, undo, redo, isAdvanced]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "builder", label: "Builder", icon: <Settings2 className="h-4 w-4" /> },
    { id: "results", label: "Results", icon: <BarChart3 className="h-4 w-4" /> },
    {
      id: "sensitivity",
      label: "Sensitivity",
      icon: <Activity className="h-4 w-4" />,
    },
    {
      id: "compare",
      label: "Compare",
      icon: <GitCompareArrows className="h-4 w-4" />,
    },
    {
      id: "montecarlo",
      label: "Monte Carlo",
      icon: <Dices className="h-4 w-4" />,
    },
    {
      id: "history",
      label: "History",
      icon: <History className="h-4 w-4" />,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Header
        onShowShortcuts={() => setShowShortcuts(true)}
        shortcutsTriggerRef={shortcutTriggerRef}
      />

      {/* Cloud migration banner (shown once for new sign-ins with local data) */}
      <MigrationBanner
        isAuthenticated={!!auth.user}
        onComplete={() => announce("Decisions uploaded to cloud")}
      />

      <main id="main-content" className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6">
        {isEmpty ? (
          <EmptyState
            onLoadTemplate={handleLoadTemplate}
            onLoadDemo={handleLoadDemo}
            onStartBlank={handleStartBlank}
          />
        ) : !isAdvanced ? (
          <Suspense fallback={<DecisionSkeleton />}>
            <GuidedWizard onSwitchToAdvanced={() => setMode("advanced")} />
          </Suspense>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
              <nav role="tablist" aria-label="Decision sections" className="flex">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    id={`tab-${tab.id}`}
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    aria-controls={`panel-${tab.id}`}
                    tabIndex={activeTab === tab.id ? 0 : -1}
                    onClick={() => setActiveTab(tab.id)}
                    onKeyDown={handleTabKeyDown}
                    className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-t-md ${
                      activeTab === tab.id
                        ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200"
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                    {tab.id === "builder" && validation.errorCount > 0 && (
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1">
                        {validation.errorCount}
                      </span>
                    )}
                    {tab.id === "results" &&
                      completeness.total > 0 &&
                      (completeness.percent === 100 ? (
                        <span
                          className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white px-1"
                          title="All scores filled"
                        >
                          ✓
                        </span>
                      ) : completeness.percent < 50 ? (
                        <span
                          className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white px-1"
                          title={`${completeness.percent}% of scores filled`}
                        >
                          ⚠
                        </span>
                      ) : null)}
                  </button>
                ))}
              </nav>

              {/* Keyboard shortcut hint */}
              <button
                ref={shortcutTriggerRef}
                onClick={() => setShowShortcuts(true)}
                className="ml-auto text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors hidden sm:inline-flex items-center gap-1"
                aria-label="Show keyboard shortcuts"
              >
                <Keyboard className="h-3.5 w-3.5" />
                <kbd className="rounded border border-gray-300 dark:border-gray-600 px-1 py-0.5 text-[10px] font-mono">
                  ?
                </kbd>
              </button>
            </div>

            {/* Tab Panels */}
            <div
              id="panel-builder"
              role="tabpanel"
              aria-labelledby="tab-builder"
              className={activeTab === "builder" ? "" : "hidden"}
            >
              {isLoading ? (
                <DecisionSkeleton />
              ) : (
                <DecisionBuilder validation={validation} completeness={completeness} />
              )}
            </div>
            {activeTab === "results" && (
              <div id="panel-results" role="tabpanel" aria-labelledby="tab-results">
                <ErrorBoundary
                  fallback={(reset) => <TabErrorFallback tab="Results" onReset={reset} />}
                >
                  <ResultsView
                    validation={validation}
                    completeness={completeness}
                    onSwitchToBuilder={() => setActiveTab("builder")}
                    onTabChange={(tab) => setActiveTab(tab as Tab)}
                  />
                </ErrorBoundary>
              </div>
            )}
            {activeTab === "sensitivity" && (
              <div id="panel-sensitivity" role="tabpanel" aria-labelledby="tab-sensitivity">
                <ErrorBoundary
                  fallback={(reset) => <TabErrorFallback tab="Sensitivity" onReset={reset} />}
                >
                  <Suspense fallback={<TabPanelSkeleton label="Sensitivity" />}>
                    <SensitivityView />
                  </Suspense>
                </ErrorBoundary>
              </div>
            )}
            {activeTab === "compare" && (
              <div id="panel-compare" role="tabpanel" aria-labelledby="tab-compare">
                <ErrorBoundary
                  fallback={(reset) => <TabErrorFallback tab="Compare" onReset={reset} />}
                >
                  <Suspense fallback={<TabPanelSkeleton label="Compare" />}>
                    <CompareView />
                  </Suspense>
                </ErrorBoundary>
              </div>
            )}
            {activeTab === "montecarlo" && (
              <div id="panel-montecarlo" role="tabpanel" aria-labelledby="tab-montecarlo">
                <ErrorBoundary
                  fallback={(reset) => <TabErrorFallback tab="Monte Carlo" onReset={reset} />}
                >
                  <Suspense fallback={<TabPanelSkeleton label="Monte Carlo" />}>
                    <MonteCarloView />
                  </Suspense>
                </ErrorBoundary>
              </div>
            )}
            {activeTab === "history" && (
              <div id="panel-history" role="tabpanel" aria-labelledby="tab-history">
                <ErrorBoundary
                  fallback={(reset) => <TabErrorFallback tab="History" onReset={reset} />}
                >
                  <Suspense fallback={<TabPanelSkeleton label="History" />}>
                    <VersionHistory />
                  </Suspense>
                </ErrorBoundary>
              </div>
            )}
          </>
        )}
        {/* Mode toggle — visible when decision has data */}
        {!isEmpty && (
          <ModeToggle
            mode={mode}
            onModeChange={setMode}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 mt-12 transition-colors">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span>
            Decision OS v{pkg.version} — Open source structured decision-making tool.{" "}
            <a
              href="https://github.com/ericsocrat/decision-os"
              className="text-blue-600 underline hover:no-underline dark:text-blue-400"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>{" "}
            | MIT License
          </span>
          <button
            onClick={onboarding.restart}
            className="inline-flex items-center justify-center h-6 w-6 rounded-full text-gray-400 dark:text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:hover:text-blue-400 dark:hover:bg-gray-700 transition-colors"
            aria-label="Replay onboarding tour"
            title="Replay tour"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>
      </footer>

      {/* Onboarding coachmark overlay */}
      {isAdvanced && onboarding.step !== "idle" && (
        <CoachmarkOverlay
          step={onboarding.step}
          onNext={handleOnboardingNext}
          onDismiss={handleOnboardingDismiss}
        />
      )}

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal open={showShortcuts} onClose={closeModal} />

      {/* Global drag-and-drop overlay */}
      {showDropOverlay && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-blue-600/10 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-2xl border-4 border-dashed border-blue-500 bg-white/90 px-12 py-10 shadow-2xl dark:bg-gray-800/90">
            <Upload className="h-12 w-12 text-blue-500" />
            <p className="text-lg font-semibold text-blue-700 dark:text-blue-300">
              Drop file to import decision
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">JSON or CSV</p>
          </div>
        </div>
      )}

      {/* Import modal (for CSV drop) */}
      {showImportModal && <ImportModal onClose={() => setShowImportModal(false)} />}
    </div>
  );
}

export default function Home() {
  const mounted = useIsMounted();

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors">
        <div className="text-center">
          <div className="h-9 w-9 rounded-lg bg-blue-600 mx-auto mb-3 animate-pulse" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading Decision OS...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <AnnouncerProvider>
        <DecisionProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </DecisionProvider>
      </AnnouncerProvider>
    </ErrorBoundary>
  );
}
