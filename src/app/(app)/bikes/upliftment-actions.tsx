"use server";

import { revalidatePath } from "next/cache";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, canWrite } from "@/lib/supabase/auth";
import { createDownloadUrl } from "@/services/storage";
import { buildStoragePath, DOCUMENTS_BUCKET } from "@/lib/storage";
import {
  UpliftmentInstructionDocument,
  type UpliftmentInstructionData,
} from "@/lib/pdf/upliftment-instruction";

export type GenerateInstructionResult = {
  error?: string;
  downloadUrl?: string;
};

/**
 * Renders the upliftment instruction PDF straight from the bike's own
 * fields — PROJECT_SCOPE §14 requires auto-population with no re-typing —
 * uploads it, and records both an upliftments row and a documents row so it
 * shows up in the bike's Documents tab and instruction history.
 */
export async function generateUpliftmentInstruction(
  bikeId: string,
  stockNumber: string
): Promise<GenerateInstructionResult> {
  const profile = await getCurrentProfile();
  if (!canWrite(profile)) {
    return { error: "You do not have permission to generate this document." };
  }

  const supabase = await createClient();

  const { data: row, error: readError } = await supabase
    .from("salvage_bikes")
    .select(
      `id, stock_number, file_number, claim_number, make, model, year,
       registration_number, vin_number, colour,
       transport_contact_person, transport_contact_number,
       upliftment_date, upliftment_time, pickup_address, delivery_address,
       upliftment_notes, transporter_id,
       insurance_companies(name), insured_name, transporters(name)`
    )
    .eq("id", bikeId)
    .maybeSingle();

  if (readError) return { error: `Could not load the bike: ${readError.message}` };
  if (!row) return { error: "That bike no longer exists." };

  const bike = row as unknown as {
    id: string;
    stock_number: string;
    file_number: string | null;
    claim_number: string | null;
    make: string | null;
    model: string | null;
    year: number | null;
    registration_number: string | null;
    vin_number: string | null;
    colour: string | null;
    transport_contact_person: string | null;
    transport_contact_number: string | null;
    upliftment_date: string | null;
    upliftment_time: string | null;
    pickup_address: string | null;
    delivery_address: string | null;
    upliftment_notes: string | null;
    transporter_id: string | null;
    insurance_companies: { name: string } | null;
    insured_name: string | null;
    transporters: { name: string } | null;
  };

  const pdfData: UpliftmentInstructionData = {
    stockNumber: bike.stock_number,
    fileNumber: bike.file_number,
    claimNumber: bike.claim_number,
    insuranceCompany: bike.insurance_companies?.name ?? null,
    insuredName: bike.insured_name,
    make: bike.make,
    model: bike.model,
    year: bike.year,
    registrationNumber: bike.registration_number,
    vin: bike.vin_number,
    colour: bike.colour,
    transporterName: bike.transporters?.name ?? null,
    contactPerson: bike.transport_contact_person,
    contactNumber: bike.transport_contact_number,
    upliftmentDate: bike.upliftment_date,
    upliftmentTime: bike.upliftment_time,
    pickupAddress: bike.pickup_address,
    deliveryAddress: bike.delivery_address,
    notes: bike.upliftment_notes,
    generatedAt: new Date().toLocaleString("en-ZA"),
  };

  let buffer: Buffer;
  try {
    buffer = await renderToBuffer(
      <UpliftmentInstructionDocument data={pdfData} />
    );
  } catch (err) {
    console.error("[pdf] failed to render upliftment instruction:", err);
    return { error: "Could not generate the PDF." };
  }

  const storagePath = buildStoragePath(
    bike.id,
    `upliftment-instruction-${bike.stock_number}.pdf`
  );

  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, buffer, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    return { error: `Could not save the PDF: ${uploadError.message}` };
  }

  const { data: upliftment, error: upliftmentError } = await supabase
    .from("upliftments")
    .insert({
      bike_id: bike.id,
      transporter_id: bike.transporter_id,
      status: "pending",
      contact_person: bike.transport_contact_person,
      contact_number: bike.transport_contact_number,
      upliftment_date: bike.upliftment_date,
      upliftment_time: bike.upliftment_time,
      pickup_address: bike.pickup_address,
      delivery_address: bike.delivery_address,
      notes: bike.upliftment_notes,
      document_path: storagePath,
    })
    .select("id")
    .single();

  if (upliftmentError) {
    // The PDF exists but nothing references it — remove it rather than
    // leaving an orphaned object with no way to reach it.
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([storagePath]);
    return { error: `Could not record the instruction: ${upliftmentError.message}` };
  }

  const { error: documentError } = await supabase.from("documents").insert({
    bike_id: bike.id,
    upliftment_id: upliftment.id,
    name: `Upliftment Instruction - ${bike.stock_number}.pdf`,
    document_type: "upliftment_instruction",
    storage_path: storagePath,
    mime_type: "application/pdf",
    file_size: buffer.byteLength,
    source: "system_generated",
  });

  if (documentError) {
    console.error(
      "[upliftment] instruction PDF generated but not linked in Documents:",
      documentError.message
    );
  }

  const downloadUrl = await createDownloadUrl(
    DOCUMENTS_BUCKET,
    storagePath,
    `Upliftment Instruction - ${stockNumber}.pdf`
  );

  revalidatePath(`/bikes/${stockNumber}`);
  revalidatePath(`/bikes/${stockNumber}/upliftment-instruction`);

  if (!downloadUrl) {
    return { error: "The PDF was saved but a download link could not be created." };
  }

  return { downloadUrl };
}
