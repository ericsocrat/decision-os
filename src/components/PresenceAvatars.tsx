/**
 * Presence avatars — stacked circles showing connected collaborators.
 *
 * Features:
 *   - Color-coded avatar circles with initials or images
 *   - Tooltip with display name on hover
 *   - "+N more" overflow indicator
 *   - Edit indicator dot when a collaborator is editing a field
 *   - Accessible with proper aria-labels
 *
 * @see https://github.com/ericsocrat/decision-os/issues/248
 */

"use client";

import { memo } from "react";
import type { PresenceUser } from "@/lib/realtime-types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum avatars to show before "+N more" overflow. */
const MAX_VISIBLE = 4;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract initials from a display name (up to 2 chars). */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || parts[0] === "") return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function AvatarCircle({
  user,
  index,
}: Readonly<{
  user: PresenceUser;
  index: number;
}>) {
  const hasAvatar = user.avatarUrl && user.avatarUrl.length > 0;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{
        marginLeft: index > 0 ? "-8px" : undefined,
        zIndex: MAX_VISIBLE - index,
      }}
      title={`${user.displayName}${user.editingField ? ` — editing ${user.editingField}` : ""}`}
    >
      <div
        className="h-7 w-7 rounded-full border-2 border-white dark:border-gray-900 flex items-center justify-center text-xs font-semibold text-white overflow-hidden"
        style={{ backgroundColor: user.color }}
        aria-label={`${user.displayName} is collaborating${user.editingField ? `, editing ${user.editingField}` : ""}`}
        role="img"
      >
        {hasAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt={user.displayName}
            className="h-full w-full object-cover"
          />
        ) : (
          getInitials(user.displayName)
        )}
      </div>

      {/* Editing indicator dot */}
      {user.editingField && (
        <span
          className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border border-white dark:border-gray-900 animate-pulse"
          aria-hidden="true"
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const PresenceAvatars = memo(function PresenceAvatars({
  collaborators,
}: Readonly<{
  collaborators: PresenceUser[];
}>) {
  if (collaborators.length === 0) return null;

  const visible = collaborators.slice(0, MAX_VISIBLE);
  const overflow = collaborators.length - MAX_VISIBLE;

  return (
    <div
      className="flex items-center"
      role="group"
      aria-label={`${collaborators.length} collaborator${collaborators.length !== 1 ? "s" : ""} connected`}
    >
      {visible.map((user, i) => (
        <AvatarCircle key={user.userId} user={user} index={i} />
      ))}

      {overflow > 0 && (
        <div
          className="relative flex items-center justify-center"
          style={{
            marginLeft: "-8px",
            zIndex: 0,
          }}
          title={`${overflow} more collaborator${overflow !== 1 ? "s" : ""}`}
        >
          <div className="h-7 w-7 rounded-full border-2 border-white dark:border-gray-900 bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs font-semibold text-gray-700 dark:text-gray-200">
            +{overflow}
          </div>
        </div>
      )}
    </div>
  );
});
