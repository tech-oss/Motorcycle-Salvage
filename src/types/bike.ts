/**
 * Domain shapes consumed by the UI.
 *
 * These are camelCase projections of the snake_case database rows in
 * types/database.ts. The mapping lives in services/bikes.ts — components take
 * these plain objects and never touch Supabase directly, which keeps the
 * query layer swappable and the components trivially testable.
 */
import type {
  CommunicationType,
  DocumentType,
  KeysStatus,
  PhotoCategory,
  UpliftmentStatus,
} from "./database";

export type { CommunicationType, DocumentType, PhotoCategory, KeysStatus };

export interface BikeDocument {
  id: string;
  name: string;
  type: DocumentType;
  storagePath: string;
  fileSize: number | null;
  uploadedAt: string;
  uploadedBy: string | null;
}

export interface BikePhoto {
  id: string;
  category: PhotoCategory;
  caption: string | null;
  storagePath: string;
  uploadedAt: string;
}

export interface BikeCommunication {
  id: string;
  type: CommunicationType;
  occurredAt: string;
  from: string | null;
  to: string | null;
  subject: string | null;
  note: string;
  createdBy: string | null;
}

export interface BikeUpliftment {
  id: string;
  status: UpliftmentStatus;
  transporterName: string | null;
  contactPerson: string | null;
  contactNumber: string | null;
  upliftmentDate: string | null;
  sentDate: string | null;
  receivedDate: string | null;
  pickupAddress: string | null;
  deliveryAddress: string | null;
  notes: string | null;
}

/** Row shape for list views — only what the table renders. */
export interface BikeListItem {
  id: string;
  stockNumber: string;
  claimNumber: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  insuranceCompany: string | null;
  dateReceived: string | null;
  status: string;
}

/** Full record for the bike detail page. */
export interface Bike extends BikeListItem {
  fileNumber: string | null;

  broker: string | null;
  assessor: string | null;
  assessorContact: string | null;
  insuredName: string | null;
  insuredAddress: string | null;
  insuredPhone: string | null;
  insuredEmail: string | null;

  registrationNumber: string | null;
  vin: string | null;
  odometer: number | null;
  colour: string | null;
  engineNumber: string | null;
  keysStatus: KeysStatus | null;
  writeOffCode: string | null;
  lossDate: string | null;

  collectionLocation: string | null;
  collectionContact: string | null;
  collectionPhone: string | null;
  deliveryLocation: string | null;
  currentLocation: string | null;
  storageLocation: string | null;

  retailValue: number | null;
  salvageValue: number | null;
  salvagePercentage: number | null;
  commission: number | null;
  releaseFee: number | null;
  totalLoss: boolean;
  estimatorCost: number | null;

  transporter: string | null;
  transportContactPerson: string | null;
  transportContactNumber: string | null;
  upliftmentDate: string | null;
  pickupAddress: string | null;
  deliveryAddress: string | null;
  upliftmentNotes: string | null;

  assignedTo: string | null;
  notes: string | null;
  archived: boolean;

  documents: BikeDocument[];
  photos: BikePhoto[];
  communications: BikeCommunication[];
  upliftments: BikeUpliftment[];
}
