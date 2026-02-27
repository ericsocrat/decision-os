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
import { useDecisionData, useActions } from "./DecisionProvider";
import { useTheme } from "./ThemeProvider";
import { useT, useTf } from "@/lib/i18n";
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
import { LanguageSwitcher } from "./LanguageSwitcher";
import type { DecisionTemplate } from "@/lib/templates";
import { saveDecision } from "@/lib/storage";
import { useAuth } from "@/hooks/useAuth";
import { useSync } from "@/hooks/useSync";
import { isCloudEnabled } from "@/lib/supabase";

export const Header = memo(function Header() {
  const { decision, decisions } = useDecisionData();
  const { loadDecision, createNewDecision, removeDecision, resetDemo } = useActions();
  const { theme, toggleTheme } = useTheme();
  const t = useT();
  const tf = useTf();
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
        label: t.header.templates,
        onClick: () => setShowTemplates(true),
      },
      {
        key: "import",
        icon: <Upload className="h-4 w-4" />,
        label: t.header.importDecision,
        onClick: () => setShowImport(true),
      },
      {
        key: "delete",
        icon: <Trash2 className="h-4 w-4" />,
        label: t.header.deleteDecision,
        hidden: decisions.length <= 1,
        onClick: () => {
          if (globalThis.confirm(`Delete "${decision.title}"? This cannot be undone.`)) {
            removeDecision(decision.id);
          }
        },
      },
      {
        key: "reset",
        icon: <RotateCcw className="h-4 w-4" />,
        label: t.header.resetDemo,
        onClick: () => {
          if (
            globalThis.confirm(
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
        label: sync.isSyncing ? t.header.syncing : t.header.syncNow,
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
          label: t.header.signOut,
          onClick: () => {
            auth.signOut();
          },
        });
      } else {
        items.push({
          key: "signin",
          icon: <LogIn className="h-4 w-4" />,
          label: t.header.signIn,
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
      label: theme === "dark" ? t.header.lightMode : t.header.darkMode,
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
    t,
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
                {t.app.title}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t.app.subtitle}</p>
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
              className="min-w-37.5 max-w-50 shrink truncate rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:min-w-0 sm:max-w-none"
              aria-label={t.header.selectDecision}
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
              aria-label={tf("header.newDecision")}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t.header.newDecision}</span>
            </button>

            {/* ── Desktop-only inline buttons (≥ 640px) ── */}
            <button
              onClick={() => setShowTemplates(true)}
              className="hidden sm:inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              aria-label={t.header.templates}
            >
              <LayoutTemplate className="h-4 w-4" />
              <span>{t.header.templates}</span>
            </button>

            <button
              onClick={() => setShowImport(true)}
              className="hidden sm:inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              aria-label={t.header.importDecision}
            >
              <Upload className="h-4 w-4" />
              <span>{t.header.importDecision}</span>
            </button>

            {decisions.length > 1 && (
              <button
                onClick={() => {
                  if (globalThis.confirm(`Delete "${decision.title}"? This cannot be undone.`)) {
                    removeDecision(decision.id);
                  }
                }}
                className="hidden sm:inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                aria-label={t.header.deleteDecision}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}

            <button
              onClick={() => {
                if (globalThis.confirm(t.header.confirmReset)) {
                  resetDemo();
                }
              }}
              className="hidden sm:inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              aria-label={t.header.resetDemo}
              title={t.header.resetDemo}
            >
              <RotateCcw className="h-4 w-4" />
              <span>{t.header.resetDemo}</span>
            </button>

            {/* Cloud sync status — desktop only */}
            <div className="hidden sm:block">
              <SyncStatus sync={sync} isAuthenticated={!!auth.user} />
            </div>

            {/* Auth button — desktop only */}
            <div className="hidden sm:block">
              <AuthButton auth={auth} />
            </div>

            {/* Language switcher — desktop only */}
            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>

            {/* Theme toggle — desktop only */}
            <button
              onClick={toggleTheme}
              className="hidden sm:inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              aria-label={tf("header.switchTheme", { mode: theme === "dark" ? "light" : "dark" })}
              title={tf("header.switchTheme", { mode: theme === "dark" ? "light" : "dark" })}
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
