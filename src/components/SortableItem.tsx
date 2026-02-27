/**
 * SortableItem — reusable drag-and-drop wrapper with accessible grip handle.
 *
 * Uses @dnd-kit/sortable for smooth, keyboard-accessible, touch-friendly
 * drag reordering with visual lift feedback.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/186
 */

"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { ReactNode } from "react";

interface SortableItemProps {
  /** Unique ID for the sortable item (must match SortableContext items) */
  id: string;
  /** The content to render inside the sortable wrapper */
  children: ReactNode;
  /** Accessible label for the drag handle */
  dragLabel?: string;
}

export function SortableItem({ id, children, dragLabel = "Drag to reorder" }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${isDragging ? "z-10 opacity-60 shadow-lg ring-2 ring-blue-400 rounded-md" : ""}`}
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="cursor-grab touch-none shrink-0 rounded p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 active:cursor-grabbing transition-colors"
          {...attributes}
          {...listeners}
          aria-label={dragLabel}
          aria-roledescription="sortable"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
