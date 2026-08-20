"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateUpliftmentInstruction } from "@/app/(app)/bikes/upliftment-actions";

export function GenerateInstructionButton({
  bikeId,
  stockNumber,
}: {
  bikeId: string;
  stockNumber: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    startTransition(async () => {
      const result = await generateUpliftmentInstruction(bikeId, stockNumber);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.downloadUrl) {
        window.open(result.downloadUrl, "_blank", "noopener,noreferrer");
      }
      toast.success("Upliftment instruction generated.");
      router.refresh();
    });
  }

  return (
    <Button onClick={handleGenerate} disabled={isPending} className="gap-2">
      {isPending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <Printer className="size-4" aria-hidden="true" />
      )}
      Generate PDF
    </Button>
  );
}
