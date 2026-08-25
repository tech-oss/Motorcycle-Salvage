import "server-only";
import { createClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/paginate";
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

  const build = () => {
    let query = supabase
      .from("salvage_bikes")
      .select(LIST_COLUMNS)
      .order("date_received", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (!includeArchived) query = query.eq("archived", false);
    return query;
  };

  // A caller asking for the first N rows does not need paging.
  if (limit) {
    const { data, error } = await build().limit(limit);
    if (error) throw new Error(`Failed to load bikes: ${error.message}`);
    return (data as unknown as ListRow[]).map(toListItem);
  }

  // Otherwise page: an unbounded select stops at PostgREST's 1,000-row cap,
  // which hid 500+ of the client's imported bikes from the list.
  const rows = await fetchAllRows<ListRow>((from, to) =>
    build().range(from, to) as unknown as PromiseLike<{
      data: ListRow[] | null;
      error: { message: string } | null;
    }>
  );
  return rows.map(toListItem);
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
                   document_path, created_at, transporters(name))`
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

  const upliftments: BikeUpliftment[] = (row.upliftments ?? [])
    .slice()
    .sort((a: Record<string, any>, b: Record<string, any>) => // eslint-disable-line @typescript-eslint/no-explicit-any
      String(b.created_at).localeCompare(String(a.created_at))
    )
    .map((u: Record<string, any>) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
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
      documentPath: u.document_path,
    }));

  return {
    id: row.id,
    stockNumber: row.stock_number,
    claimNumber: row.claim_number,
    status: row.status,

    insuranceCompany: row.insurance_companies?.name ?? null,
    broker: row.broker,
    claimsHandler: row.claims_handler,
    salvageClerk: row.salvage_clerk,

    make: row.make,
    model: row.model,
    year: row.year,
    registrationNumber: row.registration_number,
    vin: row.vin_number,
    engineCapacityCc: row.engine_capacity_cc,
    engineNumber: row.engine_number,
    keysStatus: row.keys_status,
    writeOffCode: row.write_off_code,
    lossDate: row.loss_date,

    collectionLocation: row.collection_location,
    collectionContact: row.collection_contact,
    collectionPhone: row.collection_phone,
    currentLocation: row.current_location,
    arrivalDate: row.arrival_date,

    retailValue: row.retail_value,
    insuranceAmount: row.insurance_amount,
    insuranceInvoiceNo: row.insurance_invoice_no,
    commissionRatePercent: row.commission_rate_percent,
    commission: row.mssa_commission,
    totalCommsInclVat: row.total_comms_incl_vat,
    insuranceInvToMssa: row.insurance_inv_to_mssa,
    salvagePercentage: row.salvage_percentage,
    estimatorCost: row.estimator_cost,

    soldTo: row.sold_to,
    sellingAmount: row.selling_amount,

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

/**
 * Raw row shaped for the edit form. The form binds to database column names,
 * so this deliberately skips the camelCase domain mapping — going Bike →
 * form would mean maintaining a second, reverse mapping for no benefit.
 *
 * Nulls become "" because controlled inputs need strings; the Zod schema
 * converts them back to null on submit.
 */
export async function getBikeForEdit(stockNumber: string): Promise<{
  id: string;
  values: Record<string, string | boolean>;
} | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("salvage_bikes")
    .select("*")
    .ilike("stock_number", stockNumber)
    .maybeSingle();

  if (error) throw new Error(`Failed to load bike: ${error.message}`);
  if (!data) return null;

  const row = data as Record<string, unknown>;
  const values: Record<string, string | boolean> = {};

  for (const [key, value] of Object.entries(row)) {
    if (key === "total_loss" || key === "archived") {
      values[key] = Boolean(value);
    } else if (value === null || value === undefined) {
      values[key] = "";
    } else {
      values[key] = String(value);
    }
  }

  return { id: data.id, values };
}

/** Stock numbers only — used to build QR/detail routes. */
export async function getBikeStockNumbers(): Promise<string[]> {
  const supabase = await createClient();
  const rows = await fetchAllRows<{ stock_number: string }>((from, to) =>
    supabase.from("salvage_bikes").select("stock_number").range(from, to)
  );
  return rows.map((r) => r.stock_number);
}
