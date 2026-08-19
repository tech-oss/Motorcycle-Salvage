/**
 * Fixture data standing in for Supabase queries until the database is
 * connected. Every consumer goes through services/* (see bikes.ts there),
 * so swapping this for real queries later touches one place, not the UI.
 */
import type { Bike, BikeStatus } from "@/types/bike";

const PHOTO_SPECS: Array<{
  category: Bike["photos"][number]["category"];
  label: string;
  colorFrom: string;
  colorTo: string;
}> = [
  { category: "Front", label: "Front View", colorFrom: "#1a2733", colorTo: "#0d1620" },
  { category: "Right", label: "Right Side", colorFrom: "#16212e", colorTo: "#0b131d" },
  { category: "Left", label: "Left Side", colorFrom: "#1a2733", colorTo: "#0d1620" },
  { category: "Rear", label: "Rear View", colorFrom: "#16212e", colorTo: "#0b131d" },
  { category: "Odometer", label: "Odometer", colorFrom: "#1a2733", colorTo: "#0d1620" },
  { category: "Engine", label: "Engine", colorFrom: "#16212e", colorTo: "#0b131d" },
  { category: "VIN", label: "VIN Plate", colorFrom: "#1a2733", colorTo: "#0d1620" },
  { category: "Damage", label: "Damage", colorFrom: "#16212e", colorTo: "#0b131d" },
];

function makePhotos(bikeId: string, count: number): Bike["photos"] {
  return PHOTO_SPECS.slice(0, count).map((spec, i) => ({
    id: `${bikeId}-photo-${i + 1}`,
    category: spec.category,
    label: spec.label,
    uploadedAt: "2026-08-09T10:17:00Z",
    colorFrom: spec.colorFrom,
    colorTo: spec.colorTo,
  }));
}

function makeDocuments(bikeId: string, count: number): Bike["documents"] {
  const specs: Array<{ name: string; type: Bike["documents"][number]["type"] }> = [
    { name: "Insurance Assessment Report.pdf", type: "Insurance Report" },
    { name: "Upliftment Instruction.pdf", type: "Upliftment Instruction" },
    { name: "Proof of Payment.pdf", type: "POP" },
    { name: "Release Invoice.pdf", type: "Release Invoice" },
  ];
  return specs.slice(0, count).map((spec, i) => ({
    id: `${bikeId}-doc-${i + 1}`,
    name: spec.name,
    type: spec.type,
    uploadedAt: "2026-08-06T09:40:00Z",
    uploadedBy: "Leonard D.",
    sizeLabel: "1.2 MB",
  }));
}

function makeNotes(bikeId: string, count: number): Bike["notes"] {
  const specs: Array<{ type: Bike["notes"][number]["type"]; note: string; from: string; to: string }> = [
    {
      type: "Email",
      from: "assessor@insurer.co.za",
      to: "Leonard D.",
      note: "Assessment report received and attached to the file.",
    },
    {
      type: "Phone",
      from: "Leonard D.",
      to: "Transporter",
      note: "Confirmed upliftment window with the transporter.",
    },
    {
      type: "WhatsApp",
      from: "Tow Yard",
      to: "Leonard D.",
      note: "Yard confirmed the bike is ready for collection.",
    },
    {
      type: "Internal Note",
      from: "Leonard D.",
      to: "—",
      note: "Keys present. Awaiting release invoice before upliftment.",
    },
  ];
  return specs.slice(0, count).map((spec, i) => ({
    id: `${bikeId}-note-${i + 1}`,
    type: spec.type,
    date: "2026-08-05T14:20:00Z",
    from: spec.from,
    to: spec.to,
    note: spec.note,
    createdBy: "Leonard D.",
  }));
}

export const BIKES: Bike[] = [
  {
    stockNumber: "M01187",
    fileNumber: "F-2026-1187",
    claimNumber: "RBS01-HOL-00060721",
    status: "New Instruction",
    insuranceCompany: "Hollard Insurance",
    broker: "Aon South Africa",
    assessor: "KZN Insurance Assessors",
    assessorContact: "031 315 7899",
    insuredName: "T. Naidoo",
    insuredAddress: "12 Eden Valley Mews, Hillcrest, 3610",
    insuredPhone: "083 555 0112",
    insuredEmail: "kznia-pa@ventureweb.co.za",
    make: "Triumph",
    model: "800 XC",
    year: 2012,
    registrationNumber: "BJ 92 NT ZN",
    vin: "WB10TSA872701531",
    odometer: 60000,
    colour: "Yellow",
    engineNumber: "652CCM 37KW",
    keysStatus: "Yes",
    writeOffCode: "Code 3",
    lossDate: "2026-06-25",
    collectionLocation: "Eden Valley Mews, 19 Eden Valley Road, Hillcrest, 4235",
    collectionContact: "T. Naidoo",
    collectionPhone: "083 555 0112",
    deliveryLocation: "Motorcycle Salvage Yard, Durban",
    currentLocation: "At Tow Yard",
    storageLocation: "Durban Yard A",
    city: "Durban",
    retailValue: 89000,
    salvageValue: 32000,
    salvagePercentage: 36,
    commission: 3200,
    releaseFee: 850,
    transporter: "Swift Bike Transport",
    transporterContact: "R. Pillay",
    transporterPhone: "082 444 9021",
    upliftmentDate: null,
    dateReceived: "2026-08-04",
    assignedUser: "Leonard D.",
    documents: makeDocuments("M01187", 4),
    photos: makePhotos("M01187", 8),
    notes: makeNotes("M01187", 4),
  },
  {
    stockNumber: "M01188",
    fileNumber: "F-2026-1188",
    claimNumber: "RBS01-OUT-00060722",
    status: "Upliftment Pending",
    insuranceCompany: "OUTsurance",
    broker: "Direct",
    assessor: "Reliable Assessors",
    assessorContact: "011 622 4410",
    insuredName: "S. van Wyk",
    insuredAddress: "44 Rivonia Road, Sandton, 2196",
    insuredPhone: "082 111 2233",
    insuredEmail: "claims@reliableassessors.co.za",
    make: "BMW",
    model: "F 650 GS",
    year: 2006,
    registrationNumber: "CA 14 XY GP",
    vin: "WB10214067ZC00112",
    odometer: 78500,
    colour: "Blue",
    engineNumber: "652CCM 34KW",
    keysStatus: "Yes",
    writeOffCode: "Code 2",
    lossDate: "2026-07-20",
    collectionLocation: "44 Rivonia Road, Sandton, 2196",
    collectionContact: "S. van Wyk",
    collectionPhone: "082 111 2233",
    deliveryLocation: "Motorcycle Salvage Yard, Johannesburg",
    currentLocation: "At Tow Yard",
    storageLocation: "Johannesburg Yard B",
    city: "Johannesburg",
    retailValue: 54000,
    salvageValue: 19500,
    salvagePercentage: 36,
    commission: 1950,
    releaseFee: 850,
    transporter: "Gauteng Bike Movers",
    transporterContact: "D. Botha",
    transporterPhone: "083 220 5567",
    upliftmentDate: "2026-08-12",
    dateReceived: "2026-08-03",
    assignedUser: "Leonard D.",
    documents: makeDocuments("M01188", 2),
    photos: makePhotos("M01188", 4),
    notes: makeNotes("M01188", 2),
  },
  {
    stockNumber: "M01189",
    fileNumber: "F-2026-1189",
    claimNumber: "RBS01-ABSA-00060723",
    status: "In Transit",
    insuranceCompany: "Absa Insurance",
    broker: "Absa Direct",
    assessor: "Coastal Assessing",
    assessorContact: "021 555 7712",
    insuredName: "J. Adams",
    insuredAddress: "7 Marine Drive, Sea Point, 8005",
    insuredPhone: "071 998 4432",
    insuredEmail: "claims@coastalassessing.co.za",
    make: "Yamaha",
    model: "YZF R6",
    year: 2015,
    registrationNumber: "CY 55 PQ WC",
    vin: "JYARJ23E5FA003321",
    odometer: 22000,
    colour: "Black",
    engineNumber: "599CCM 89KW",
    keysStatus: "Yes",
    writeOffCode: "Code 3",
    lossDate: "2026-07-28",
    collectionLocation: "7 Marine Drive, Sea Point, 8005",
    collectionContact: "J. Adams",
    collectionPhone: "071 998 4432",
    deliveryLocation: "Motorcycle Salvage Yard, Cape Town",
    currentLocation: "In Transit — N1 Corridor",
    storageLocation: "Cape Town Yard C",
    city: "Cape Town",
    retailValue: 112000,
    salvageValue: 41000,
    salvagePercentage: 37,
    commission: 4100,
    releaseFee: 850,
    transporter: "Cape Bike Logistics",
    transporterContact: "M. Fortuin",
    transporterPhone: "084 331 7789",
    upliftmentDate: "2026-08-03",
    dateReceived: "2026-08-03",
    assignedUser: "Leonard D.",
    documents: makeDocuments("M01189", 3),
    photos: makePhotos("M01189", 6),
    notes: makeNotes("M01189", 3),
  },
  {
    stockNumber: "M01190",
    fileNumber: "F-2026-1190",
    claimNumber: "RBS01-SANTAM-00060724",
    status: "Received",
    insuranceCompany: "Santam",
    broker: "Santam Direct",
    assessor: "Prime Assessors",
    assessorContact: "012 444 1290",
    insuredName: "L. Mokoena",
    insuredAddress: "18 Church Street, Pretoria, 0002",
    insuredPhone: "079 220 6612",
    insuredEmail: "claims@primeassessors.co.za",
    make: "Honda",
    model: "CB 500",
    year: 2018,
    registrationNumber: "JD 88 KL GP",
    vin: "MLHPC4407JA100221",
    odometer: 15300,
    colour: "Red",
    engineNumber: "471CCM 35KW",
    keysStatus: "Yes",
    writeOffCode: "Code 2",
    lossDate: "2026-07-30",
    collectionLocation: "18 Church Street, Pretoria, 0002",
    collectionContact: "L. Mokoena",
    collectionPhone: "079 220 6612",
    deliveryLocation: "Motorcycle Salvage Yard, Pretoria",
    currentLocation: "Pretoria Yard",
    storageLocation: "Pretoria Yard A",
    city: "Pretoria",
    retailValue: 68000,
    salvageValue: 27500,
    salvagePercentage: 40,
    commission: 2750,
    releaseFee: 850,
    transporter: "Gauteng Bike Movers",
    transporterContact: "D. Botha",
    transporterPhone: "083 220 5567",
    upliftmentDate: "2026-08-02",
    dateReceived: "2026-08-02",
    assignedUser: "Leonard D.",
    documents: makeDocuments("M01190", 4),
    photos: makePhotos("M01190", 8),
    notes: makeNotes("M01190", 4),
  },
  {
    stockNumber: "M01191",
    fileNumber: "F-2026-1191",
    claimNumber: "RBS01-MIWAY-00060725",
    status: "Ready for Sale",
    insuranceCompany: "MiWay",
    broker: "Direct",
    assessor: "Reliable Assessors",
    assessorContact: "011 622 4410",
    insuredName: "P. Naidoo",
    insuredAddress: "3 Umgeni Road, Durban, 4001",
    insuredPhone: "072 664 1198",
    insuredEmail: "claims@reliableassessors.co.za",
    make: "Kawasaki",
    model: "Ninja 300",
    year: 2016,
    registrationNumber: "ND 21 CV KZN",
    vin: "JKAEX8A15GA011223",
    odometer: 31200,
    colour: "Green",
    engineNumber: "296CCM 29KW",
    keysStatus: "TBC",
    writeOffCode: "Code 3",
    lossDate: "2026-07-18",
    collectionLocation: "3 Umgeni Road, Durban, 4001",
    collectionContact: "P. Naidoo",
    collectionPhone: "072 664 1198",
    deliveryLocation: "Motorcycle Salvage Yard, Durban",
    currentLocation: "Durban Yard A",
    storageLocation: "Durban Yard A",
    city: "Durban",
    retailValue: 49000,
    salvageValue: 16000,
    salvagePercentage: 33,
    commission: 1600,
    releaseFee: 850,
    transporter: "Swift Bike Transport",
    transporterContact: "R. Pillay",
    transporterPhone: "082 444 9021",
    upliftmentDate: "2026-07-25",
    dateReceived: "2026-07-25",
    assignedUser: "Leonard D.",
    documents: makeDocuments("M01191", 4),
    photos: makePhotos("M01191", 8),
    notes: makeNotes("M01191", 4),
  },
];

/**
 * The mockup's bike list (M01187–M01196) follows a clean 10-combo cycle of
 * make/model/insurer/status/city. We extend that same cycle to produce a
 * larger, pagination-worthy fixture set rather than hand-writing dozens of
 * near-duplicate records.
 */
const LIST_TEMPLATES: Array<{
  make: string;
  model: string;
  year: number;
  insurance: string;
  claimCode: string;
  status: BikeStatus;
  city: keyof typeof CITY_LOCATIONS;
}> = [
  { make: "Triumph", model: "800 XC", year: 2012, insurance: "Hollard Insurance", claimCode: "HOL", status: "New Instruction", city: "Durban" },
  { make: "BMW", model: "F 650 GS", year: 2006, insurance: "OUTsurance", claimCode: "OUT", status: "Upliftment Pending", city: "Johannesburg" },
  { make: "Yamaha", model: "YZF R6", year: 2015, insurance: "Absa Insurance", claimCode: "ABSA", status: "In Transit", city: "Cape Town" },
  { make: "Honda", model: "CB 500", year: 2018, insurance: "Santam", claimCode: "SANTAM", status: "Received", city: "Pretoria" },
  { make: "Kawasaki", model: "Ninja 300", year: 2016, insurance: "MiWay", claimCode: "MIWAY", status: "Ready for Sale", city: "Durban" },
  { make: "Suzuki", model: "GSX-S750", year: 2019, insurance: "Hollard Insurance", claimCode: "HOL", status: "New Instruction", city: "Johannesburg" },
  { make: "KTM", model: "390 Duke", year: 2017, insurance: "OUTsurance", claimCode: "OUT", status: "Upliftment Pending", city: "Durban" },
  { make: "BMW", model: "R 1200 GS", year: 2015, insurance: "Absa Insurance", claimCode: "ABSA", status: "In Transit", city: "Pretoria" },
  { make: "Harley Davidson", model: "883", year: 2016, insurance: "Santam", claimCode: "SANTAM", status: "Received", city: "Cape Town" },
  { make: "Triumph", model: "Street Triple", year: 2014, insurance: "MiWay", claimCode: "MIWAY", status: "Ready for Sale", city: "Johannesburg" },
];

const CITY_LOCATIONS = {
  Durban: { yard: "Durban Yard A", collectionSuburb: "Umgeni Road, Durban" },
  Johannesburg: { yard: "Johannesburg Yard B", collectionSuburb: "Rivonia Road, Sandton" },
  Pretoria: { yard: "Pretoria Yard A", collectionSuburb: "Church Street, Pretoria" },
  "Cape Town": { yard: "Cape Town Yard C", collectionSuburb: "Marine Drive, Sea Point" },
};

function generateBike(sequence: number): Bike {
  const template = LIST_TEMPLATES[sequence % LIST_TEMPLATES.length];
  const stockNumber = `M${(1192 + sequence).toString().padStart(5, "0")}`;
  const location = CITY_LOCATIONS[template.city];

  return {
    stockNumber,
    fileNumber: `F-2026-${1192 + sequence}`,
    claimNumber: `RBS01-${template.claimCode}-000${60730 + sequence}`,
    status: template.status,
    insuranceCompany: template.insurance,
    broker: "Direct",
    assessor: `${template.city} Insurance Assessors`,
    assessorContact: "011 000 0000",
    insuredName: "On file",
    insuredAddress: `${location.collectionSuburb}`,
    insuredPhone: "082 000 0000",
    insuredEmail: "claims@assessors.co.za",
    make: template.make,
    model: template.model,
    year: template.year,
    registrationNumber: `${stockNumber.slice(1, 3)} ${sequence % 90} XY GP`,
    vin: `WB${stockNumber}0${sequence}00000`,
    odometer: 15000 + sequence * 731,
    colour: ["Black", "Red", "Blue", "Yellow", "White"][sequence % 5],
    engineNumber: `ENG${sequence}00CC`,
    keysStatus: "Yes",
    writeOffCode: sequence % 3 === 0 ? "Code 2" : "Code 3",
    lossDate: "2026-07-15",
    collectionLocation: location.collectionSuburb,
    collectionContact: "On file",
    collectionPhone: "082 000 0000",
    deliveryLocation: `Motorcycle Salvage Yard, ${template.city}`,
    currentLocation: location.yard,
    storageLocation: location.yard,
    city: template.city,
    retailValue: 45000 + sequence * 1200,
    salvageValue: 15000 + sequence * 400,
    salvagePercentage: 33,
    commission: 1500 + sequence * 40,
    releaseFee: 850,
    transporter: "Regional Bike Movers",
    transporterContact: "On file",
    transporterPhone: "082 000 0000",
    upliftmentDate: template.status === "New Instruction" ? null : "2026-08-01",
    dateReceived: "2026-08-01",
    assignedUser: "Leonard D.",
    documents: makeDocuments(stockNumber, 2),
    photos: makePhotos(stockNumber, 4),
    notes: makeNotes(stockNumber, 2),
  };
}

const GENERATED_BIKES: Bike[] = Array.from({ length: 32 }, (_, i) => generateBike(i));

const ALL_BIKES: Bike[] = [...BIKES, ...GENERATED_BIKES];

export function getBikes(): Bike[] {
  return ALL_BIKES;
}

export function getBikeByStockNumber(stockNumber: string): Bike | undefined {
  return ALL_BIKES.find(
    (bike) => bike.stockNumber.toLowerCase() === stockNumber.toLowerCase()
  );
}

export const STATUS_COLORS: Record<
  BikeStatus,
  { badge: string; dot: string }
> = {
  "New Instruction": { badge: "bg-sky-500/15 text-sky-300 border-sky-500/30", dot: "bg-sky-400" },
  "Upliftment Pending": { badge: "bg-violet-500/15 text-violet-300 border-violet-500/30", dot: "bg-violet-400" },
  Scheduled: { badge: "bg-amber-500/15 text-amber-300 border-amber-500/30", dot: "bg-amber-400" },
  "In Transit": { badge: "bg-orange-500/15 text-orange-300 border-orange-500/30", dot: "bg-orange-400" },
  Received: { badge: "bg-teal-500/15 text-teal-300 border-teal-500/30", dot: "bg-teal-400" },
  "Ready for Sale": { badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", dot: "bg-emerald-400" },
  Archived: { badge: "bg-slate-500/15 text-slate-300 border-slate-500/30", dot: "bg-slate-400" },
};
