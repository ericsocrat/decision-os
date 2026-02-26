/**
 * MigrationBanner — prompts users to upload localStorage data to cloud.
 *
 * Shown once after the user signs in for the first time and has
 * existing localStorage decisions that haven't been migrated yet.
 */

"use client";

import { memo, useCallback, useState } from "react";
import { CloudUpload, X, Loader2 } from "lucide-react";
import { hasMigrated } from "@/lib/sync";
import { getDecisions } from "@/lib/storage";
import { cloudSaveAllDecisions } from "@/lib/cloud-storage";
import { isCloudEnabled } from "@/lib/supabase";

interface MigrationBannerProps {
  isAuthenticated: boolean;
  onComplete: () => void;
}

export const MigrationBanner = memo(function MigrationBanner({
  isAuthenticated,
  onComplete,
}: MigrationBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMigrate = useCallback(async () => {
    setMigrating(true);
    setError(null);

    try {
      const decisions = getDecisions();
      const ok = await cloudSaveAllDecisions(decisions);
      if (ok) {
        // Mark as migrated so the banner doesn't reappear
        if (typeof window !== "undefined") {
          localStorage.setItem("decision-os:cloud-migrated", "true");
        }
        onComplete();
        setDismissed(true);
      } else {
        setError("Migration failed. Please try again.");
      }
    } catch {
      setError("Migration failed. Please try again.");
    } finally {
      setMigrating(false);
    }
  }, [onComplete]);

  // Don't show if cloud isn't enabled, not authed, already migrated, or dismissed
  if (!isCloudEnabled() || !isAuthenticated || hasMigrated() || dismissed) return null;

  // Only show if there are local decisions
  const localCount = typeof window !== "undefined" ? getDecisions().length : 0;
  if (localCount === 0) return null;

  return (
    <div className="border-b border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-950">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
          <CloudUpload className="h-4 w-4 shrink-0" />
          <span>
            You have <strong>{localCount}</strong> decision
            {localCount !== 1 ? "s" : ""} saved locally. Upload them to the cloud for cross-device
            access?
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleMigrate}
            disabled={migrating}
            className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {migrating ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <CloudUpload className="h-3 w-3" />
                Upload Now
              </>
            )}
          </button>

          <button
            onClick={() => setDismissed(true)}
            className="rounded-md p-1 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900"
            aria-label="Dismiss migration banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-auto mt-1 max-w-7xl text-xs text-red-600 dark:text-red-400">{error}</div>
      )}
    </div>
  );
});
