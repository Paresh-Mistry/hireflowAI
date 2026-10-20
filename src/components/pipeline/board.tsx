"use client";
import * as React from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { GripVertical, Sparkles } from "lucide-react";
import { Avatar, SkillBadge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/form";
import { moveApplicationStage } from "@/features/applications/actions";
import { validateTransition } from "@/lib/permissions/stage-transitions";
import { ACTIVE_STAGES, STAGES, STAGE_META, TERMINAL_STAGES, type Stage } from "@/config/constants";
import { cn, formatDate } from "@/lib/utils/index";
import type { PipelineCard } from "@/types";

function CardBody({ card, dragging }: { card: PipelineCard; dragging?: boolean }) {
  return (
    <div className={cn("rounded-[12px] border border-line bg-card p-3", dragging && "rotate-1 border-accent shadow-lg")}>
      <div className="flex items-start gap-2.5">
        <Avatar name={card.candidate.full_name} size={32} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{card.candidate.full_name}</p>
          <p className="truncate text-xs text-muted">{card.candidate.current_title ?? "—"}</p>
        </div>
        {card.analyzed && <Sparkles className="h-4 w-4 shrink-0 text-accent" aria-label="AI analysis available" />}
      </div>
      <p className="mt-2 truncate text-xs font-medium">{card.job.title}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {card.candidate.skills.slice(0, 2).map((s) => (
          <SkillBadge key={s}>{s}</SkillBadge>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted">Applied {formatDate(card.applied_at, "MMM d")}</p>
    </div>
  );
}

function DraggableCard({ card, onMove }: { card: PipelineCard; onMove: (id: string, to: Stage) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: card.id, data: { stage: card.stage } });
  return (
    <li ref={setNodeRef} className={cn("group relative", isDragging && "opacity-40")}>
      <CardBody card={card} />
      <button
        {...attributes}
        {...listeners}
        aria-label={`Drag ${card.candidate.full_name}. Press space to lift, arrow keys to move, space to drop.`}
        className="absolute right-1.5 top-1.5 cursor-grab touch-none rounded p-1 text-muted opacity-60 hover:bg-[#efede8] hover:opacity-100 focus-visible:opacity-100 active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Link
        href={`/candidates/${card.candidate.id}?app=${card.id}`}
        className="absolute inset-0 -z-0 rounded-[12px]"
        aria-label={`Open ${card.candidate.full_name}`}
        style={{ zIndex: 0 }}
        tabIndex={-1}
      />
      <div className="relative z-10 mt-1.5">
        <label className="sr-only" htmlFor={`move-${card.id}`}>
          Move {card.candidate.full_name} to stage
        </label>
        <select
          id={`move-${card.id}`}
          value={card.stage}
          onChange={(e) => onMove(card.id, e.target.value as Stage)}
          className="h-7 w-full cursor-pointer rounded-md border border-line bg-card px-1.5 text-xs"
        >
          {STAGES.map((s) => (
            <option key={s} value={s} disabled={s !== card.stage && !validateTransition(card.stage, s).ok}>
              {s === card.stage ? `Stage: ${STAGE_META[s].label}` : `Move to ${STAGE_META[s].label}`}
            </option>
          ))}
        </select>
      </div>
    </li>
  );
}

function Column({ stage, cards, onMove }: { stage: Stage; cards: PipelineCard[]; onMove: (id: string, to: Stage) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage, data: { stage } });
  const meta = STAGE_META[stage];
  return (
    <section
      ref={setNodeRef}
      aria-label={`${meta.label} column, ${cards.length} candidates`}
      className={cn(
        "flex min-h-40 flex-col rounded-[14px] border bg-[#f1efea] p-2.5 transition-colors",
        isOver ? "border-accent bg-accent-soft" : "border-line",
      )}
    >
      <header className="mb-2 flex items-center justify-between px-1.5 pt-1">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: meta.color }} aria-hidden />
          {meta.label}
        </h2>
        <span className="tabular rounded-full bg-card px-2 py-0.5 text-xs font-semibold">{cards.length}</span>
      </header>
      <ul className="flex flex-1 flex-col gap-2">
        {cards.map((c) => (
          <DraggableCard key={c.id} card={c} onMove={onMove} />
        ))}
        {cards.length === 0 && (
          <li className="flex flex-1 items-center justify-center rounded-[10px] border border-dashed border-[#d9d6ce] p-4 text-center text-xs text-muted">
            Drop candidates here
          </li>
        )}
      </ul>
    </section>
  );
}

export function PipelineBoard({ initial }: { initial: PipelineCard[] }) {
  const [cards, setCards] = React.useState(initial);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [rejecting, setRejecting] = React.useState<{ id: string } | null>(null);
  const [reason, setReason] = React.useState("");
  const [announce, setAnnounce] = React.useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );

  async function move(id: string, to: Stage, rejection_reason?: string, isUndo = false) {
    const card = cards.find((c) => c.id === id);
    if (!card) return;
    const from = card.stage;
    const check = validateTransition(from, to);
    if (!check.ok) return void toast.error(check.reason);
    if (to === "rejected" && !isUndo && rejection_reason === undefined) {
      setReason("");
      return void setRejecting({ id });
    }

    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, stage: to } : c))); // optimistic
    const res = await moveApplicationStage({ application_id: id, to, rejection_reason: rejection_reason || undefined });
    if (!res.ok) {
      setCards((prev) => prev.map((c) => (c.id === id ? { ...c, stage: from } : c))); // rollback
      setAnnounce(`Could not move ${card.candidate.full_name}.`);
      return void toast.error(res.error);
    }
    setAnnounce(`${card.candidate.full_name} moved to ${STAGE_META[to].label}.`);
    toast.success(`${card.candidate.full_name} → ${STAGE_META[to].label}`, {
      action: isUndo ? undefined : { label: "Undo", onClick: () => void move(id, from, undefined, true) },
    });
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const to = e.over?.data.current?.stage as Stage | undefined;
    if (to) void move(String(e.active.id), to);
  }

  const active = cards.find((c) => c.id === activeId);

  const col = (s: Stage) => (
    <Column key={s} stage={s} cards={cards.filter((c) => c.stage === s)} onMove={(id, to) => void move(id, to)} />
  );

  return (
    <>
      <DndContext sensors={sensors} onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{ACTIVE_STAGES.map(col)}</div>
        <h2 className="mb-2 mt-8 text-sm font-bold uppercase tracking-wide text-muted">Outcomes</h2>
        <div className="grid gap-3 md:grid-cols-2">{TERMINAL_STAGES.map(col)}</div>
        <DragOverlay>{active ? <CardBody card={active} dragging /> : null}</DragOverlay>
      </DndContext>
      <p className="sr-only" role="status" aria-live="polite">{announce}</p>

      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent title="Reject this application?" description="Add an optional reason for your records. You can reopen the application later.">
          <Textarea aria-label="Rejection reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional reason…" maxLength={500} />
          <div className="mt-4 flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button
              variant="danger"
              onClick={() => {
                const id = rejecting!.id;
                setRejecting(null);
                void move(id, "rejected", reason);
              }}
            >
              Reject
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
