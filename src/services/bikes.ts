import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  Bike,
  BikeCommunication,
  BikeDocument,
  BikeListItem,
  BikePhoto,
  BikeUpliftment,
} from "@/types/bike";

/**
 * Data access for salvage bikes. Every read goes through here rather than
 * components querying Supabase inline, so the query layer stays swappable and
 * future ingestion paths (PROJECT_SCOPE §23) can reuse the same functions.
 *
 * All queries run under the caller's session, so RLS decides what comes back.
 */

/** Shape of the joined columns Supabase returns for a list row. */
type ListRow = {
  id: string;
  stock_number: string;
  claim_number: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  date_received: string | null;
  status: string;
  insurance_companies: { name: string } | null;
};

const LIST_COLUMNS =
  "id, stock_number, claim_number, make, model, year, date_received, status, " +
  "insurance_companies(name)";

function toListItem(row: ListRow): BikeListItem {
  return {
    id: row.id,
    stockNumber: row.stock_number,
    claimNumber: row.claim_number,
    make: row.make,
    model: row.model,
    year: row.year,
    insuranceCompany: row.insurance_companies?.name ?? null,
    dateReceived: row.date_received,
    status: row.status,
  };
}

export async function getBikes({
  includeArchived = false,
  limit,
}: { includeArchived?: boolean; limit?: number } = {}): Promise<BikeListItem[]> {
  const supabase = await createClient();

  let query = supabase
    .from("salvage_bikes")
    .select(LIST_COLUMNS)
    .order("date_received", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (!includeArchived) query = query.eq("archived", false);
  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load bikes: ${error.message}`);

  return (data as unknown as ListRow[]).map(toListItem);
}

export async function getBikeByStockNumber(
  stockNumber: string
): Promise<Bike | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("salvage_bikes")
    .select(
      `*,
       insurance_companies(name),
       transporters(name),
       documents(id, name, document_type, storage_path, file_size, created_at, created_by),
       bike_photos(id, category, caption, storage_path, created_at, sort_order),
       communications(id, communication_type, occurred_at, from_party, to_party, subject, note, created_by),
       upliftments(id, status, contact_person, contact_number, upliftment_date,
                   sent_date, received_date, pickup_address, delivery_address, notes,
                   transporters(name))`
    )
    // Stock numbers are printed on stickers and typed by hand, so match
    // case-insensitively rather than failing on "m01187".
    .ilike("stock_number", stockNumber)
    .maybeSingle();

  if (error) throw new Error(`Failed to load bike: ${error.message}`);
  if (!data) return null;

  // The generated Database types don't model embedded joins, so this row is
  // widened deliberately and narrowed by the mapping below.
  const row = data as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

  const documents: BikeDocument[] = (row.documents ?? [])
    .map((d: Record<string, any>) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
      id: d.id,
      name: d.name,
      type: d.document_type,
      storagePath: d.storage_path,
      fileSize: d.file_size,
      uploadedAt: d.created_at,
      uploadedBy: d.created_by,
    }))
    .sort((a: BikeDocument, b: BikeDocument) =>
      b.uploadedAt.localeCompare(a.uploadedAt)
    );

  const photos: BikePhoto[] = (row.bike_photos ?? [])
    .map((p: Record<string, any>) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
      id: p.id,
      category: p.category,
      caption: p.caption,
      storagePath: p.storage_path,
      uploadedAt: p.created_at,
      sortOrder: p.sort_order ?? 0,
    }))
    .sort(
      (a: BikePhoto & { sortOrder: number }, b: BikePhoto & { sortOrder: number }) =>
        a.sortOrder - b.sortOrder || a.uploadedAt.localeCompare(b.uploadedAt)
    );

  const communications: BikeCommunication[] = (row.communications ?? [])
    .map((c: Record<string, any>) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
      id: c.id,
      type: c.communication_type,
      occurredAt: c.occurred_at,
      from: c.from_party,
      to: c.to_party,
      subject: c.subject,
      note: c.note,
      createdBy: c.created_by,
    }))
    .sort((a: BikeCommunication, b: BikeCommunication) =>
      b.occurredAt.localeCompare(a.occurredAt)
    );

  const upliftments: BikeUpliftment[] = (row.upliftments ?? []).map(
    (u: Record<string, any>) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
      id: u.id,
      status: u.status,
      transporterName: u.transporters?.name ?? null,
      contactPerson: u.contact_person,
      contactNumber: u.contact_number,
      upliftmentDate: u.upliftment_date,
      sentDate: u.sent_date,
      receivedDate: u.received_date,
      pickupAddress: u.pickup_address,
      deliveryAddress: u.delivery_address,
      notes: u.notes,
    })
  );

  return {
    id: row.id,
    stockNumber: row.stock_number,
    fileNumber: row.file_number,
    claimNumber: row.claim_number,
    status: row.status,

    insuranceCompany: row.insurance_companies?.name ?? null,
    broker: row.broker,
    assessor: row.assessor,
    assessorContact: row.assessor_contact,
    insuredName: row.insured_name,
    insuredAddress: row.insured_address,
    insuredPhone: row.insured_phone,
    insuredEmail: row.insured_email,

    make: row.make,
    model: row.model,
    year: row.year,
    registrationNumber: row.registration_number,
    vin: row.vin_number,
    odometer: row.odometer,
    colour: row.colour,
    engineNumber: row.engine_number,
    keysStatus: row.keys_status,
    writeOffCode: row.write_off_code,
    lossDate: row.loss_date,

    collectionLocation: row.collection_location,
    collectionContact: row.collection_contact,
    collectionPhone: row.collection_phone,
    deliveryLocation: row.delivery_location,
    currentLocation: row.current_location,
    storageLocation: row.storage_location,

    retailValue: row.retail_value,
    salvageValue: row.salvage_value,
    salvagePercentage: row.salvage_percentage,
    commission: row.mssa_commission,
    releaseFee: row.release_fee,
    totalLoss: row.total_loss,
    estimatorCost: row.estimator_cost,

    transporter: row.transporters?.name ?? null,
    transportContactPerson: row.transport_contact_person,
    transportContactNumber: row.transport_contact_number,
    upliftmentDate: row.upliftment_date,
    pickupAddress: row.pickup_address,
    deliveryAddress: row.delivery_address,
    upliftmentNotes: row.upliftment_notes,

    dateReceived: row.date_received,
    assignedTo: row.assigned_to,
    notes: row.notes,
    archived: row.archived,

    documents,
    photos,
    communications,
    upliftments,
  };
}

/** Stock numbers only — used to build QR/detail routes. */
export async function getBikeStockNumbers(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("salvage_bikes")
    .select("stock_number");

  if (error) throw new Error(`Failed to load stock numbers: ${error.message}`);
  return (data ?? []).map((r) => r.stock_number);
}
