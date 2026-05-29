"use client";

import type { ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useI18n } from "@/lib/i18n";

interface SortableSectionProps {
  id: string;
  editing: boolean;
  label: string;
  children: ReactNode;
}

function SortableSection({ id, editing, label, children }: SortableSectionProps) {
  const { t } = useI18n();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !editing,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${editing ? "rounded-[var(--radius-card)] ring-1 ring-emerald-500/25" : ""} ${
        isDragging ? "z-10 opacity-95 shadow-lg" : ""
      }`}
    >
      {editing ? (
        <div className="flex items-center gap-2 border-b border-[color:var(--border)] bg-[color:var(--surface-soft)] px-2 py-1.5">
          <button
            type="button"
            className="flex min-h-9 min-w-9 shrink-0 cursor-grab items-center justify-center rounded-md text-[color:var(--muted)] hover:bg-[color:var(--surface-highlight)] hover:text-[color:var(--foreground)] active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
            aria-label={t("aidLayoutDragHandle", { section: label })}
            {...attributes}
            {...listeners}
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
              <circle cx="7" cy="5" r="1.2" />
              <circle cx="13" cy="5" r="1.2" />
              <circle cx="7" cy="10" r="1.2" />
              <circle cx="13" cy="10" r="1.2" />
              <circle cx="7" cy="15" r="1.2" />
              <circle cx="13" cy="15" r="1.2" />
            </svg>
          </button>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--muted)]">{label}</span>
        </div>
      ) : null}
      <div className={editing ? "pointer-events-none select-none" : undefined}>{children}</div>
    </div>
  );
}

interface Props<T extends string> {
  ids: T[];
  editing: boolean;
  onReorder: (ids: T[]) => void;
  getLabel: (id: T) => string;
  renderItem: (id: T) => ReactNode;
  ariaLabel: string;
  className?: string;
}

export default function AidSortableSectionList<T extends string>({
  ids,
  editing,
  onReorder,
  getLabel,
  renderItem,
  ariaLabel,
  className,
}: Props<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id) as T);
    const newIndex = ids.indexOf(String(over.id) as T);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(ids, oldIndex, newIndex));
  };

  if (!editing) {
    return (
      <div className={`space-y-4 ${className ?? ""}`} aria-label={ariaLabel}>
        {ids.map((id) => (
          <div key={id}>{renderItem(id)}</div>
        ))}
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className={`space-y-4 ${className ?? ""}`} aria-label={ariaLabel}>
          {ids.map((id) => (
            <SortableSection key={id} id={id} editing={editing} label={getLabel(id)}>
              {renderItem(id)}
            </SortableSection>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
