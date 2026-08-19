import { Mail, Phone, MessageCircle, StickyNote, CircleDot } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/layout/empty-state";
import { formatDateTime } from "@/lib/utils";
import type { BikeCommunication, CommunicationType } from "@/types/bike";

const NOTE_ICONS: Record<CommunicationType, LucideIcon> = {
  email: Mail,
  phone: Phone,
  whatsapp: MessageCircle,
  internal_note: StickyNote,
  other: CircleDot,
};

const NOTE_LABELS: Record<CommunicationType, string> = {
  email: "Email",
  phone: "Phone",
  whatsapp: "WhatsApp",
  internal_note: "Internal Note",
  other: "Other",
};

export function NotesTimeline({ notes }: { notes: BikeCommunication[] }) {
  if (notes.length === 0) {
    return (
      <EmptyState
        icon={StickyNote}
        title="No communication logged"
        description="Record calls, emails, WhatsApp messages and internal notes against this bike to keep the full history in one place."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {notes.map((note) => {
        const Icon = NOTE_ICONS[note.type];
        const parties = [note.from, note.to].filter(Boolean).join(" → ");

        return (
          <li key={note.id} className="flex gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1 rounded-lg border border-border bg-card px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{NOTE_LABELS[note.type]}</Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(note.occurredAt)}
                  {parties && ` · ${parties}`}
                </span>
              </div>
              {note.subject && (
                <p className="mt-2 text-sm font-medium text-foreground">
                  {note.subject}
                </p>
              )}
              <p className="mt-1 text-sm whitespace-pre-line text-foreground">
                {note.note}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
