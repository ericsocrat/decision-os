/**
 * VersionHistory — Browse, label, compare, and restore decision version snapshots.
 *
 * Features:
 * - Save manual "checkpoint" versions with custom labels
 * - Browse auto-saved and manual versions
 * - Restore any version (replaces current decision, marks dirty)
 * - Diff any version against the current decision
 * - Delete individual versions
 *
 * @see https://github.com/ericsocrat/decision-os/issues/246
 */

"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  History,
  Save,
  RotateCcw,
  Trash2,
  ChevronDown,
  ChevronUp,
  GitCompareArrows,
  Tag,
  Clock,
  Zap,
} from "lucide-react";
import { useDecisionData, useActions } from "./DecisionProvider";
import {
  saveVersion,
  getVersions,
  deleteVersion,
  diffVersions,
} from "@/lib/version-history";
import type { DecisionVersion, VersionDiff } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Trigger badge (manual vs auto) */
function TriggerBadge({ trigger }: { trigger: "manual" | "auto" }) {
  if (trigger === "manual") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
        <Tag className="h-3 w-3" aria-hidden="true" />
        Manual
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
      <Zap className="h-3 w-3" aria-hidden="true" />
      Auto
    </span>
  );
}

/** Diff summary for a version compared to current */
function DiffSummary({ diff }: { diff: VersionDiff }) {
  const items: string[] = [];
  if (diff.titleChanged) items.push("title changed");
  if (diff.descriptionChanged) items.push("description changed");
  if (diff.addedOptions.length > 0) items.push(`+${diff.addedOptions.length} option(s)`);
  if (diff.removedOptions.length > 0) items.push(`-${diff.removedOptions.length} option(s)`);
  if (diff.addedCriteria.length > 0) items.push(`+${diff.addedCriteria.length} criterion(s)`);
  if (diff.removedCriteria.length > 0) items.push(`-${diff.removedCriteria.length} criterion(s)`);
  if (diff.changedWeights.length > 0) items.push(`${diff.changedWeights.length} weight(s)`);
  if (diff.changedScores > 0) items.push(`${diff.changedScores} score(s)`);

  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 italic">No differences from current</p>
    );
  }

  return (
    <div className="mt-2 space-y-1">
      <p className="text-xs font-medium text-gray-600 dark:text-gray-300">
        Changes from this version to current:
      </p>
      <ul className="ml-4 list-disc text-xs text-gray-500 dark:text-gray-400">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function VersionHistory() {
  const { decision } = useDecisionData();
  const { restoreVersion } = useActions();
  const [versions, setVersions] = useState<DecisionVersion[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);

  // Reload versions whenever the decision changes
  useEffect(() => {
    setVersions(getVersions(decision.id));
  }, [decision.id, decision.updatedAt]);

  // Save a manual version
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const version = await saveVersion(decision, label || undefined, "manual");
      if (version) {
        setVersions(getVersions(decision.id));
        setLabel("");
      }
    } finally {
      setSaving(false);
    }
  }, [decision, label]);

  // Delete a version
  const handleDelete = useCallback(
    (versionId: string) => {
      deleteVersion(decision.id, versionId);
      setVersions(getVersions(decision.id));
      setExpanded(null);
    },
    [decision.id],
  );

  // Restore a version
  const handleRestore = useCallback(
    (version: DecisionVersion) => {
      restoreVersion(version.snapshot);
      setConfirmRestore(null);
      setVersions(getVersions(decision.id));
    },
    [restoreVersion, decision.id],
  );

  // Compute diff for expanded version
  const expandedDiff = useMemo<VersionDiff | null>(() => {
    if (!expanded) return null;
    const version = versions.find((v) => v.id === expanded);
    if (!version) return null;
    return diffVersions(version.snapshot, decision);
  }, [expanded, versions, decision]);

  return (
    <section
      aria-labelledby="version-history-heading"
      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2
          id="version-history-heading"
          className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white"
        >
          <History className="h-5 w-5" aria-hidden="true" />
          Version History
        </h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {versions.length} version{versions.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Save checkpoint */}
      <div className="mt-4 flex gap-2">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Version label (optional)"
          aria-label="Version label"
          className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-gray-900"
          aria-label="Save version checkpoint"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          Save
        </button>
      </div>

      {/* Version list */}
      {versions.length === 0 ? (
        <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          No versions saved yet. Changes are auto-versioned every 5 minutes.
        </p>
      ) : (
        <ul className="mt-4 space-y-2" role="list" aria-label="Decision versions">
          {versions.map((version) => (
            <li
              key={version.id}
              className="rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50"
            >
              {/* Version header row */}
              <div className="flex items-center gap-2 px-3 py-2">
                <button
                  onClick={() => setExpanded(expanded === version.id ? null : version.id)}
                  className="flex flex-1 items-center gap-2 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                  aria-expanded={expanded === version.id}
                  aria-controls={`version-details-${version.id}`}
                >
                  {expanded === version.id ? (
                    <ChevronUp className="h-4 w-4 text-gray-400" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
                  )}
                  <span className="flex-1 truncate text-sm font-medium text-gray-900 dark:text-white">
                    {version.label ?? version.snapshot.title}
                  </span>
                </button>
                <TriggerBadge trigger={version.trigger} />
                <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  {formatRelativeTime(version.createdAt)}
                </span>
              </div>

              {/* Expanded details */}
              {expanded === version.id && (
                <div
                  id={`version-details-${version.id}`}
                  className="border-t border-gray-200 px-3 py-3 dark:border-gray-700"
                >
                  {/* Snapshot info */}
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    <span>
                      {version.snapshot.options.length} option
                      {version.snapshot.options.length !== 1 ? "s" : ""},{" "}
                      {version.snapshot.criteria.length} criterion
                      {version.snapshot.criteria.length !== 1 ? "s" : ""}
                    </span>
                    <span className="ml-2 font-mono">#{version.snapshotHash.slice(0, 8)}</span>
                  </div>

                  {/* Diff */}
                  {expandedDiff && (
                    <div className="mt-2">
                      <div className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-300">
                        <GitCompareArrows className="h-3 w-3" aria-hidden="true" />
                        Diff vs current
                      </div>
                      <DiffSummary diff={expandedDiff} />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-3 flex gap-2">
                    {confirmRestore === version.id ? (
                      <>
                        <span className="text-sm text-amber-600 dark:text-amber-400">
                          Restore this version?
                        </span>
                        <button
                          onClick={() => handleRestore(version)}
                          className="rounded-md bg-amber-600 px-2 py-1 text-xs font-medium text-white hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmRestore(null)}
                          className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setConfirmRestore(version.id)}
                          className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                          aria-label={`Restore version ${version.label ?? version.snapshot.title}`}
                        >
                          <RotateCcw className="h-3 w-3" aria-hidden="true" />
                          Restore
                        </button>
                        <button
                          onClick={() => handleDelete(version.id)}
                          className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                          aria-label={`Delete version ${version.label ?? version.snapshot.title}`}
                        >
                          <Trash2 className="h-3 w-3" aria-hidden="true" />
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
