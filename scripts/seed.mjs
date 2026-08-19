/**
 * Seeds demo data into the linked Supabase project so the UI has something to
 * render during development.
 *
 * Uses the service role key and therefore bypasses RLS — it is a local
 * development tool, never something the app calls.
 *
 * Run:    node scripts/seed.mjs
 * Undo:   node scripts/seed.mjs --clear
 *
 * Safe to re-run: rows are upserted on their natural keys.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const INSURERS = [
  { name: "Hollard Insurance", contact_person: "Claims Desk", phone: "011 351 5000" },
  { name: "OUTsurance", contact_person: "Claims Desk", phone: "012 673 3000" },
  { name: "Santam", contact_person: "Claims Desk", phone: "021 915 7000" },
  { name: "Absa Insurance", contact_person: "Claims Desk", phone: "011 501 5050" },
  { name: "MiWay", contact_person: "Claims Desk", phone: "086 000 6494" },
];

const TRANSPORTERS = [
  { name: "Swift Bike Transport", contact_person: "R. Pillay", phone: "082 444 9021" },
  { name: "Gauteng Bike Movers", contact_person: "D. Botha", phone: "083 220 5567" },
  { name: "Cape Bike Logistics", contact_person: "M. Fortuin", phone: "084 331 7789" },
];

const LOCATIONS = [
  { name: "Durban Yard A", city: "Durban", province: "KwaZulu-Natal" },
  { name: "Johannesburg Yard B", city: "Johannesburg", province: "Gauteng" },
  { name: "Pretoria Yard A", city: "Pretoria", province: "Gauteng" },
  { name: "Cape Town Yard C", city: "Cape Town", province: "Western Cape" },
];

const BIKES = [
  {
    stock_number: "M01187", claim_number: "RBS01-HOL-00060721", status: "new_instruction",
    insurer: "Hollard Insurance", make: "Triumph", model: "800 XC", year: 2012,
    registration_number: "BJ 92 NT ZN", vin_number: "WB10TSA872701531", odometer: 60000,
    colour: "Yellow", engine_number: "652CCM 37KW", keys_status: "yes", write_off_code: "Code 3",
    loss_date: "2026-06-25", date_received: "2026-08-04",
    insured_name: "T. Naidoo", insured_phone: "083 555 0112",
    assessor: "KZN Insurance Assessors", assessor_contact: "031 315 7899",
    retail_value: 89000, salvage_value: 32000, salvage_percentage: 36,
    mssa_commission: 3200, release_fee: 850,
    collection_location: "19 Eden Valley Road, Hillcrest, 4235",
    location: "Durban Yard A", transporter: "Swift Bike Transport",
  },
  {
    stock_number: "M01188", claim_number: "RBS01-OUT-00060722", status: "upliftment_pending",
    insurer: "OUTsurance", make: "BMW", model: "F 650 GS", year: 2006,
    registration_number: "CA 14 XY GP", vin_number: "WB10214067ZC00112", odometer: 78500,
    colour: "Blue", engine_number: "652CCM 34KW", keys_status: "yes", write_off_code: "Code 2",
    loss_date: "2026-07-20", date_received: "2026-08-03",
    insured_name: "S. van Wyk", insured_phone: "082 111 2233",
    assessor: "Reliable Assessors", assessor_contact: "011 622 4410",
    retail_value: 54000, salvage_value: 19500, salvage_percentage: 36,
    mssa_commission: 1950, release_fee: 850,
    collection_location: "44 Rivonia Road, Sandton, 2196",
    location: "Johannesburg Yard B", transporter: "Gauteng Bike Movers",
    upliftment_date: "2026-08-12",
  },
  {
    stock_number: "M01189", claim_number: "RBS01-ABSA-00060723", status: "in_transit",
    insurer: "Absa Insurance", make: "Yamaha", model: "YZF R6", year: 2015,
    registration_number: "CY 55 PQ WC", vin_number: "JYARJ23E5FA003321", odometer: 22000,
    colour: "Black", engine_number: "599CCM 89KW", keys_status: "yes", write_off_code: "Code 3",
    loss_date: "2026-07-28", date_received: "2026-08-03",
    insured_name: "J. Adams", insured_phone: "071 998 4432",
    assessor: "Coastal Assessing", assessor_contact: "021 555 7712",
    retail_value: 112000, salvage_value: 41000, salvage_percentage: 37,
    mssa_commission: 4100, release_fee: 850,
    collection_location: "7 Marine Drive, Sea Point, 8005",
    location: "Cape Town Yard C", transporter: "Cape Bike Logistics",
    upliftment_date: "2026-08-03",
  },
  {
    stock_number: "M01190", claim_number: "RBS01-SANTAM-00060724", status: "received",
    insurer: "Santam", make: "Honda", model: "CB 500", year: 2018,
    registration_number: "JD 88 KL GP", vin_number: "MLHPC4407JA100221", odometer: 15300,
    colour: "Red", engine_number: "471CCM 35KW", keys_status: "yes", write_off_code: "Code 2",
    loss_date: "2026-07-30", date_received: "2026-08-02",
    insured_name: "L. Mokoena", insured_phone: "079 220 6612",
    assessor: "Prime Assessors", assessor_contact: "012 444 1290",
    retail_value: 68000, salvage_value: 27500, salvage_percentage: 40,
    mssa_commission: 2750, release_fee: 850,
    collection_location: "18 Church Street, Pretoria, 0002",
    location: "Pretoria Yard A", transporter: "Gauteng Bike Movers",
    upliftment_date: "2026-08-02",
  },
  {
    stock_number: "M01191", claim_number: "RBS01-MIWAY-00060725", status: "ready_for_sale",
    insurer: "MiWay", make: "Kawasaki", model: "Ninja 300", year: 2016,
    registration_number: "ND 21 CV KZN", vin_number: "JKAEX8A15GA011223", odometer: 31200,
    colour: "Green", engine_number: "296CCM 29KW", keys_status: "tbc", write_off_code: "Code 3",
    loss_date: "2026-07-18", date_received: "2026-07-25",
    insured_name: "P. Naidoo", insured_phone: "072 664 1198",
    assessor: "Reliable Assessors", assessor_contact: "011 622 4410",
    retail_value: 49000, salvage_value: 16000, salvage_percentage: 33,
    mssa_commission: 1600, release_fee: 850,
    collection_location: "3 Umgeni Road, Durban, 4001",
    location: "Durban Yard A", transporter: "Swift Bike Transport",
    upliftment_date: "2026-07-25",
  },
  {
    stock_number: "M01192", claim_number: "RBS01-HOL-00060726", status: "scheduled",
    insurer: "Hollard Insurance", make: "Suzuki", model: "GSX-S750", year: 2019,
    registration_number: "KP 40 RT GP", vin_number: "JS1GR7MA1K2100447", odometer: 9800,
    colour: "Blue", engine_number: "749CCM 84KW", keys_status: "yes", write_off_code: "Code 2",
    loss_date: "2026-08-01", date_received: "2026-08-06",
    insured_name: "M. Khumalo", insured_phone: "081 334 2277",
    assessor: "Prime Assessors", assessor_contact: "012 444 1290",
    retail_value: 132000, salvage_value: 52000, salvage_percentage: 39,
    mssa_commission: 5200, release_fee: 850,
    collection_location: "21 Oxford Road, Rosebank, 2196",
    location: "Johannesburg Yard B", transporter: "Gauteng Bike Movers",
    upliftment_date: "2026-08-14",
  },
];

const STOCK_NUMBERS = BIKES.map((b) => b.stock_number);

async function clear() {
  // Child rows cascade from salvage_bikes, so deleting the bikes is enough.
  const { error } = await supabase
    .from("salvage_bikes")
    .delete()
    .in("stock_number", STOCK_NUMBERS);
  if (error) throw new Error(error.message);
  console.log(`Removed ${STOCK_NUMBERS.length} seeded bikes (children cascaded).`);

  for (const [table, names] of [
    ["transporters", TRANSPORTERS.map((t) => t.name)],
    ["insurance_companies", INSURERS.map((i) => i.name)],
    ["locations", LOCATIONS.map((l) => l.name)],
  ]) {
    const { error: e } = await supabase.from(table).delete().in("name", names);
    if (e) console.warn(`  ${table}: ${e.message}`);
  }
  console.log("Removed seeded reference data.");
}

async function upsertRef(table, rows) {
  const { data, error } = await supabase
    .from(table)
    .upsert(rows, { onConflict: "name" })
    .select("id, name");
  if (error) throw new Error(`${table}: ${error.message}`);
  return new Map(data.map((r) => [r.name, r.id]));
}

async function seed() {
  console.log("Seeding reference data…");
  const insurers = await upsertRef("insurance_companies", INSURERS);
  const transporters = await upsertRef("transporters", TRANSPORTERS);
  const locations = await upsertRef("locations", LOCATIONS);
  console.log(
    `  ${insurers.size} insurers, ${transporters.size} transporters, ${locations.size} locations`
  );

  console.log("Seeding bikes…");
  const rows = BIKES.map((b) => {
    const { insurer, location, transporter, ...rest } = b;
    return {
      ...rest,
      insurance_company_id: insurers.get(insurer) ?? null,
      transporter_id: transporters.get(transporter) ?? null,
      current_location_id: locations.get(location) ?? null,
      storage_location_id: locations.get(location) ?? null,
      current_location: location,
      storage_location: location,
      delivery_location: `Motorcycle Salvage Yard, ${location.split(" Yard")[0]}`,
      transport_contact_person:
        TRANSPORTERS.find((t) => t.name === transporter)?.contact_person ?? null,
      transport_contact_number:
        TRANSPORTERS.find((t) => t.name === transporter)?.phone ?? null,
    };
  });

  const { data: bikes, error } = await supabase
    .from("salvage_bikes")
    .upsert(rows, { onConflict: "stock_number" })
    .select("id, stock_number");
  if (error) throw new Error(`salvage_bikes: ${error.message}`);
  console.log(`  ${bikes.length} bikes`);

  const byStock = new Map(bikes.map((b) => [b.stock_number, b.id]));

  console.log("Seeding communications…");
  const comms = [
    {
      bike_id: byStock.get("M01187"),
      communication_type: "email",
      from_party: "assessor@kznassessors.co.za",
      to_party: "Salvage Desk",
      subject: "Assessment report",
      note: "Assessment report received and attached to the file.",
      occurred_at: "2026-08-05T09:20:00Z",
    },
    {
      bike_id: byStock.get("M01187"),
      communication_type: "phone",
      from_party: "Salvage Desk",
      to_party: "Swift Bike Transport",
      note: "Confirmed upliftment window for Thursday morning.",
      occurred_at: "2026-08-06T11:05:00Z",
    },
    {
      bike_id: byStock.get("M01188"),
      communication_type: "whatsapp",
      from_party: "Tow Yard",
      to_party: "Salvage Desk",
      note: "Yard confirmed the bike is ready for collection.",
      occurred_at: "2026-08-07T14:42:00Z",
    },
    {
      bike_id: byStock.get("M01189"),
      communication_type: "internal_note",
      from_party: "Salvage Desk",
      to_party: null,
      note: "Keys present. Awaiting release invoice before upliftment.",
      occurred_at: "2026-08-04T08:15:00Z",
    },
  ].filter((c) => c.bike_id);

  const { error: commErr } = await supabase.from("communications").insert(comms);
  if (commErr) console.warn(`  communications: ${commErr.message}`);
  else console.log(`  ${comms.length} communications`);

  console.log("\nDone. Reload the dashboard to see live data.");
}

const run = process.argv.includes("--clear") ? clear : seed;
run().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
