export type BikeStatus =
  | "New Instruction"
  | "Upliftment Pending"
  | "Scheduled"
  | "In Transit"
  | "Received"
  | "Ready for Sale"
  | "Archived";

export type DocumentType =
  | "Insurance Report"
  | "Release Invoice"
  | "Transport Invoice"
  | "POP"
  | "Purchase Agreement"
  | "Upliftment Instruction"
  | "Other";

export type PhotoCategory =
  | "Front"
  | "Rear"
  | "Left"
  | "Right"
  | "Odometer"
  | "VIN"
  | "Engine"
  | "Damage"
  | "Other";

export interface BikeDocument {
  id: string;
  name: string;
  type: DocumentType;
  uploadedAt: string;
  uploadedBy: string;
  sizeLabel: string;
}

export interface BikePhoto {
  id: string;
  category: PhotoCategory;
  label: string;
  uploadedAt: string;
  colorFrom: string;
  colorTo: string;
}

export type NoteType = "Email" | "Phone" | "WhatsApp" | "Internal Note" | "Other";

export interface BikeNote {
  id: string;
  type: NoteType;
  date: string;
  from: string;
  to: string;
  note: string;
  createdBy: string;
}

export interface Bike {
  stockNumber: string;
  fileNumber: string;
  claimNumber: string;
  status: BikeStatus;

  insuranceCompany: string;
  broker: string;
  assessor: string;
  assessorContact: string;
  insuredName: string;
  insuredAddress: string;
  insuredPhone: string;
  insuredEmail: string;

  make: string;
  model: string;
  year: number;
  registrationNumber: string;
  vin: string;
  odometer: number;
  colour: string;
  engineNumber: string;
  keysStatus: "Yes" | "No" | "TBC";
  writeOffCode: string;
  lossDate: string;

  collectionLocation: string;
  collectionContact: string;
  collectionPhone: string;
  deliveryLocation: string;
  currentLocation: string;
  storageLocation: string;
  /** Normalized city, used for location aggregation (dashboard, filters). */
  city: string;

  retailValue: number;
  salvageValue: number;
  salvagePercentage: number;
  commission: number;
  releaseFee: number;

  transporter: string;
  transporterContact: string;
  transporterPhone: string;
  upliftmentDate: string | null;

  dateReceived: string;
  assignedUser: string;

  documents: BikeDocument[];
  photos: BikePhoto[];
  notes: BikeNote[];
}
