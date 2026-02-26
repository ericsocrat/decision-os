/**
 * Header component with app branding, decision selector, dark mode toggle,
 * authentication button, and cloud sync status.
 *
 * Desktop (≥ 640px): all action buttons rendered inline.
 * Mobile  (< 640px): primary actions (New) stay visible; secondary actions
 *                     collapse into a kebab overflow menu.
 *
 * Wrapped in React.memo — only re-renders when context values change.
 */

"use client";

import { memo, useMemo, useState } from "react";
import { useDecision } from "./DecisionProvider";
import { useTheme } from "./ThemeProvider";
import {
  Plus,
  RotateCcw,
  Trash2,
  Sun,
  Moon,
  LayoutTemplate,
  Upload,
  Cloud,
  LogIn,
  LogOut,
} from "lucide-react";
import Image from "next/image";
import { TemplatePicker, instantiateTemplate } from "./TemplatePicker";
import { ImportModal } from "./ImportModal";
import { AuthButton } from "./AuthButton";
import { SyncStatus } from "./SyncStatus";
import { MobileOverflowMenu, type OverflowMenuItem } from "./MobileOverflowMenu";
import type { DecisionTemplate } from "@/lib/templates";
import { saveDecision } from "@/lib/storage";
import { useAuth } from "@/hooks/useAuth";
import { useSync } from "@/hooks/useSync";
import { isCloudEnabled } from "@/lib/supabase";

export const Header = memo(function Header() {
  const { decision, decisions, loadDecision, createNewDecision, removeDecision, resetDemo } =
    useDecision();
  const { theme, toggleTheme } = useTheme();
  const auth = useAuth();
  const sync = useSync(!!auth.user);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const handleTemplateSelect = (template: DecisionTemplate) => {
    const newDecision = instantiateTemplate(template);
    saveDecision(newDecision);
    loadDecision(newDecision.id);
    setShowTemplates(false);
  };

  /* ------------------------------------------------------------------ */
  /*  Overflow menu items (shown in kebab on mobile only)                */
  /* ------------------------------------------------------------------ */
  const overflowItems = useMemo<OverflowMenuItem[]>(() => {
    const items: OverflowMenuItem[] = [
      {
        key: "templates",
        icon: <LayoutTemplate className="h-4 w-4" />,
        label: "Templates",
        onClick: () => setShowTemplates(true),
      },
      {
        key: "import",
        icon: <Upload className="h-4 w-4" />,
        label: "Import",
        onClick: () => setShowImport(true),
      },
      {
        key: "delete",
        icon: <Trash2 className="h-4 w-4" />,
        label: "Delete Decision",
        hidden: decisions.length <= 1,
        onClick: () => {
          if (window.confirm(`Delete "${decision.title}"? This cannot be undone.`)) {
            removeDecision(decision.id);
          }
        },
      },
      {
        key: "reset",
        icon: <RotateCcw className="h-4 w-4" />,
        label: "Reset Demo",
        onClick: () => {
          if (
            window.confirm(
              "Reset all decisions to demo data? This will remove all custom decisions."
            )
          ) {
            resetDemo();
          }
        },
      },
    ];

    // Cloud sync status — only when configured + authenticated
    if (isCloudEnabled() && auth.user) {
      items.push({
        key: "sync",
        icon: <Cloud className="h-4 w-4" />,
        label: sync.isSyncing ? "Syncing…" : "Sync Now",
        separator: true,
        onClick: () => {
          sync.triggerSync();
        },
      });
    }

    // Auth actions
    if (auth.cloudEnabled) {
      if (auth.user) {
        items.push({
          key: "signout",
          icon: <LogOut className="h-4 w-4" />,
          label: "Sign Out",
          onClick: () => {
            auth.signOut();
          },
        });
      } else {
        items.push({
          key: "signin",
          icon: <LogIn className="h-4 w-4" />,
          label: "Sign In",
          separator: true,
          onClick: () => {
            auth.signIn("github");
          },
        });
      }
    }

    // Theme toggle — always last
    items.push({
      key: "theme",
      icon: theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />,
      label: theme === "dark" ? "Light Mode" : "Dark Mode",
      separator: true,
      onClick: toggleTheme,
    });

    return items;
  }, [
    decisions.length,
    decision.title,
    decision.id,
    removeDecision,
    resetDemo,
    auth,
    sync,
    theme,
    toggleTheme,
  ]);

  return (
    <header
      className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors"
      role="banner"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-2">
          {/* Logo — hidden on mobile to reclaim space for the selector */}
          <div className="hidden items-center gap-3 sm:flex">
            <Image
              src="/logo.svg"
              alt="Decision OS logo"
              width={36}
              height={36}
              className="rounded-lg"
              priority
            />
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Decision OS
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Structured decision-making</p>
            </div>
          </div>

          {/* Mobile-only compact logo */}
          <div className="flex items-center sm:hidden">
            <Image
              src="/logo.svg"
              alt="Decision OS logo"
              width={28}
              height={28}
              className="rounded-lg"
              priority
            />
          </div>

          {/* Decision selector + actions */}
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
            {/* Decision selector — flex-shrink with min-width on mobile */}
            <select
              value={decision.id}
              onChange={(e) => loadDecision(e.target.value)}
              className="min-w-[150px] max-w-[200px] flex-shrink truncate rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:min-w-0 sm:max-w-none"
              aria-label="Select decision"
            >
              {decisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>

            {/* New — always visible (primary creation action) */}
            <button
              onClick={createNewDecision}
              className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              aria-label="Create new decision"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New</span>
            </button>

            {/* ── Desktop-only inline buttons (≥ 640px) ── */}
            <button
              onClick={() => setShowTemplates(true)}
              className="hidden sm:inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              aria-label="Start from template"
            >
              <LayoutTemplate className="h-4 w-4" />
              <span>Templates</span>
            </button>

            <button
              onClick={() => setShowImport(true)}
              className="hidden sm:inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              aria-label="Import decision from file"
            >
              <Upload className="h-4 w-4" />
              <span>Import</span>
            </button>

            {decisions.length > 1 && (
              <button
                onClick={() => {
                  if (window.confirm(`Delete "${decision.title}"? This cannot be undone.`)) {
                    removeDecision(decision.id);
                  }
                }}
                className="hidden sm:inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                aria-label="Delete current decision"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}

            <button
              onClick={() => {
                if (
                  window.confirm(
                    "Reset all decisions to demo data? This will remove all custom decisions."
                  )
                ) {
                  resetDemo();
                }
              }}
              className="hidden sm:inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              aria-label="Reset to demo data"
              title="Reset to demo"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reset Demo</span>
            </button>

            {/* Cloud sync status — desktop only */}
            <div className="hidden sm:block">
              <SyncStatus sync={sync} isAuthenticated={!!auth.user} />
            </div>

            {/* Auth button — desktop only */}
            <div className="hidden sm:block">
              <AuthButton auth={auth} />
            </div>

            {/* Theme toggle — desktop only */}
            <button
              onClick={toggleTheme}
              className="hidden sm:inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* ── Mobile overflow menu (< 640px) ── */}
            <MobileOverflowMenu items={overflowItems} />
          </div>
        </div>
      </div>

      {/* Template Picker Modal */}
      {showTemplates && (
        <TemplatePicker onSelect={handleTemplateSelect} onClose={() => setShowTemplates(false)} />
      )}

      {/* Import Modal */}
      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
    </header>
  );
});
