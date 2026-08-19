import { Mail, Phone, MessageCircle, StickyNote, CircleDot } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { BikeNote, NoteType } from "@/types/bike";

const NOTE_ICONS: Record<NoteType, LucideIcon> = {
  Email: Mail,
  Phone: Phone,
  WhatsApp: MessageCircle,
  "Internal Note": StickyNote,
  Other: CircleDot,
};

export function NotesTimeline({ notes }: { notes: BikeNote[] }) {
  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
        <StickyNote className="size-8 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">No communication logged yet.</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {notes.map((note) => {
        const Icon = NOTE_ICONS[note.type];
        return (
          <li key={note.id} className="flex gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1 rounded-lg border border-border bg-card px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{note.type}</Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDate(note.date)} · {note.from} → {note.to}
                </span>
              </div>
              <p className="mt-2 text-sm text-foreground">{note.note}</p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Logged by {note.createdBy}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
