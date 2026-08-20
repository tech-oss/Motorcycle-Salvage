/**
 * Typed database definitions matching supabase/migrations/*.sql.
 *
 * Hand-maintained rather than generated, because `supabase gen types` needs a
 * live project or a Docker-backed local stack, and neither is a prerequisite
 * for working on this repo. If you change a migration, change this file in the
 * same commit. Once the project is linked you can regenerate with:
 *
 *   npx supabase gen types typescript --project-id <ref> > src/types/database.ts
 */

export type UserRole = "admin" | "staff" | "viewer";

export type KeysStatus = "yes" | "no" | "tbc";

export type DocumentType =
  | "insurance_report"
  | "release_invoice"
  | "transport_invoice"
  | "pop"
  | "purchase_agreement"
  | "upliftment_instruction"
  | "other";

export type PhotoCategory =
  | "front"
  | "rear"
  | "left"
  | "right"
  | "odometer"
  | "vin"
  | "engine"
  | "damage"
  | "other";

export type CommunicationType =
  | "email"
  | "phone"
  | "whatsapp"
  | "internal_note"
  | "other";

export type UpliftmentStatus =
  | "pending"
  | "scheduled"
  | "in_transit"
  | "collected"
  | "cancelled";

export type AuditAction =
  | "created"
  | "updated"
  | "status_changed"
  | "document_uploaded"
  | "photo_uploaded"
  | "archived"
  | "restored"
  | "deleted";

/** Status codes seeded by 001; the table is extensible, so treat as a hint. */
export type BikeStatusCode =
  | "new_instruction"
  | "upliftment_pending"
  | "scheduled"
  | "in_transit"
  | "received"
  | "ready_for_sale"
  | "archived";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          phone: string | null;
          role: UserRole;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          phone?: string | null;
          role?: UserRole;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string;
          full_name?: string | null;
          phone?: string | null;
          role?: UserRole;
          is_active?: boolean;
        };
        Relationships: [];
      };

      bike_statuses: {
        Row: {
          code: string;
          label: string;
          sort_order: number;
          is_archived_state: boolean;
        };
        Insert: {
          code: string;
          label: string;
          sort_order?: number;
          is_archived_state?: boolean;
        };
        Update: {
          label?: string;
          sort_order?: number;
          is_archived_state?: boolean;
        };
        Relationships: [];
      };

      insurance_companies: {
        Row: {
          id: string;
          name: string;
          contact_person: string | null;
          phone: string | null;
          email: string | null;
          address: string | null;
          notes: string | null;
          archived: boolean;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          contact_person?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          notes?: string | null;
          archived?: boolean;
        };
        Update: {
          name?: string;
          contact_person?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          notes?: string | null;
          archived?: boolean;
        };
        Relationships: [];
      };

      transporters: {
        Row: {
          id: string;
          name: string;
          contact_person: string | null;
          phone: string | null;
          email: string | null;
          address: string | null;
          notes: string | null;
          archived: boolean;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          contact_person?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          notes?: string | null;
          archived?: boolean;
        };
        Update: {
          name?: string;
          contact_person?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          notes?: string | null;
          archived?: boolean;
        };
        Relationships: [];
      };

      locations: {
        Row: {
          id: string;
          name: string;
          address: string | null;
          city: string | null;
          province: string | null;
          contact_person: string | null;
          phone: string | null;
          notes: string | null;
          archived: boolean;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          address?: string | null;
          city?: string | null;
          province?: string | null;
          contact_person?: string | null;
          phone?: string | null;
          notes?: string | null;
          archived?: boolean;
        };
        Update: {
          name?: string;
          address?: string | null;
          city?: string | null;
          province?: string | null;
          contact_person?: string | null;
          phone?: string | null;
          notes?: string | null;
          archived?: boolean;
        };
        Relationships: [];
      };

      salvage_bikes: {
        Row: {
          id: string;
          stock_number: string;
          file_number: string | null;
          claim_number: string | null;
          status: string;

          insurance_company_id: string | null;
          broker: string | null;
          assessor: string | null;
          assessor_contact: string | null;
          insured_name: string | null;
          insured_address: string | null;
          insured_phone: string | null;
          insured_email: string | null;

          make: string | null;
          model: string | null;
          year: number | null;
          registration_number: string | null;
          vin_number: string | null;
          odometer: number | null;
          colour: string | null;
          engine_number: string | null;
          keys_status: KeysStatus | null;
          write_off_code: string | null;
          loss_date: string | null;

          pre_accident_condition: string | null;
          severity_of_impact: string | null;
          pre_accident_damage: string | null;
          tyre_condition: string | null;
          tyre_depth_left_front: number | null;
          tyre_depth_right_front: number | null;
          tyre_depth_left_rear: number | null;
          tyre_depth_right_rear: number | null;

          collection_location: string | null;
          collection_location_id: string | null;
          collection_contact: string | null;
          collection_phone: string | null;
          delivery_location: string | null;
          delivery_location_id: string | null;
          current_location: string | null;
          current_location_id: string | null;
          storage_location: string | null;
          storage_location_id: string | null;

          retail_value: number | null;
          salvage_value: number | null;
          salvage_percentage: number | null;
          mssa_commission: number | null;
          release_fee: number | null;
          release_payment_date: string | null;
          total_loss: boolean;
          estimator_cost: number | null;

          transporter_id: string | null;
          transport_contact_person: string | null;
          transport_contact_number: string | null;
          upliftment_date: string | null;
          upliftment_time: string | null;
          upliftment_sent_date: string | null;
          upliftment_received_date: string | null;
          pickup_address: string | null;
          delivery_address: string | null;
          upliftment_notes: string | null;

          date_received: string | null;
          assigned_to: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
          archived: boolean;
        };
        Insert: Partial<
          Omit<
            Database["public"]["Tables"]["salvage_bikes"]["Row"],
            "id" | "stock_number" | "created_at" | "updated_at"
          >
        > & { id?: string; stock_number: string };
        Update: Partial<
          Omit<
            Database["public"]["Tables"]["salvage_bikes"]["Row"],
            "id" | "created_at" | "updated_at" | "created_by"
          >
        >;
        Relationships: [];
      };

      upliftments: {
        Row: {
          id: string;
          bike_id: string;
          transporter_id: string | null;
          status: UpliftmentStatus;
          reference: string | null;
          contact_person: string | null;
          contact_number: string | null;
          upliftment_date: string | null;
          upliftment_time: string | null;
          sent_date: string | null;
          received_date: string | null;
          pickup_address: string | null;
          delivery_address: string | null;
          notes: string | null;
          document_path: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          bike_id: string;
          transporter_id?: string | null;
          status?: UpliftmentStatus;
          reference?: string | null;
          contact_person?: string | null;
          contact_number?: string | null;
          upliftment_date?: string | null;
          upliftment_time?: string | null;
          sent_date?: string | null;
          received_date?: string | null;
          pickup_address?: string | null;
          delivery_address?: string | null;
          notes?: string | null;
          document_path?: string | null;
        };
        Update: Partial<
          Omit<
            Database["public"]["Tables"]["upliftments"]["Row"],
            "id" | "created_at" | "updated_at" | "created_by"
          >
        >;
        Relationships: [];
      };

      documents: {
        Row: {
          id: string;
          bike_id: string;
          upliftment_id: string | null;
          name: string;
          document_type: DocumentType;
          storage_path: string;
          mime_type: string | null;
          file_size: number | null;
          notes: string | null;
          source: string;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          bike_id: string;
          upliftment_id?: string | null;
          name: string;
          document_type?: DocumentType;
          storage_path: string;
          mime_type?: string | null;
          file_size?: number | null;
          notes?: string | null;
          source?: string;
        };
        Update: {
          name?: string;
          document_type?: DocumentType;
          notes?: string | null;
          upliftment_id?: string | null;
        };
        Relationships: [];
      };

      bike_photos: {
        Row: {
          id: string;
          bike_id: string;
          category: PhotoCategory;
          caption: string | null;
          storage_path: string;
          mime_type: string | null;
          file_size: number | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          bike_id: string;
          category?: PhotoCategory;
          caption?: string | null;
          storage_path: string;
          mime_type?: string | null;
          file_size?: number | null;
          sort_order?: number;
        };
        Update: {
          category?: PhotoCategory;
          caption?: string | null;
          sort_order?: number;
        };
        Relationships: [];
      };

      communications: {
        Row: {
          id: string;
          bike_id: string;
          communication_type: CommunicationType;
          occurred_at: string;
          from_party: string | null;
          to_party: string | null;
          subject: string | null;
          note: string;
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          bike_id: string;
          communication_type?: CommunicationType;
          occurred_at?: string;
          from_party?: string | null;
          to_party?: string | null;
          subject?: string | null;
          note: string;
        };
        Update: {
          communication_type?: CommunicationType;
          occurred_at?: string;
          from_party?: string | null;
          to_party?: string | null;
          subject?: string | null;
          note?: string;
        };
        Relationships: [];
      };

      import_batches: {
        Row: {
          id: string;
          file_name: string;
          sheet_name: string;
          total_rows: number;
          imported_count: number;
          updated_count: number;
          skipped_count: number;
          invalid_count: number;
          duplicate_count: number;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          file_name: string;
          sheet_name: string;
          total_rows?: number;
          imported_count?: number;
          updated_count?: number;
          skipped_count?: number;
          invalid_count?: number;
          duplicate_count?: number;
        };
        Update: never;
        Relationships: [];
      };

      audit_logs: {
        Row: {
          id: string;
          bike_id: string | null;
          table_name: string;
          record_id: string | null;
          action: AuditAction;
          field_name: string | null;
          old_value: string | null;
          new_value: string | null;
          changed_data: Json | null;
          actor_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          bike_id?: string | null;
          table_name: string;
          record_id?: string | null;
          action: AuditAction;
          field_name?: string | null;
          old_value?: string | null;
          new_value?: string | null;
          changed_data?: Json | null;
          actor_id?: string | null;
        };
        // Append-only: no RLS policy permits UPDATE.
        Update: never;
        Relationships: [];
      };
    };

    Views: Record<string, never>;

    Functions: {
      current_user_role: { Args: Record<string, never>; Returns: UserRole };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      can_write: { Args: Record<string, never>; Returns: boolean };
      can_read: { Args: Record<string, never>; Returns: boolean };
    };

    CompositeTypes: Record<string, never>;

    Enums: {
      user_role: UserRole;
      keys_status: KeysStatus;
      document_type: DocumentType;
      photo_category: PhotoCategory;
      communication_type: CommunicationType;
      upliftment_status: UpliftmentStatus;
      audit_action: AuditAction;
    };
  };
}

/** Convenience aliases so call sites read cleanly. */
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertDto<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateDto<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

export type Profile = Tables<"profiles">;
export type SalvageBikeRow = Tables<"salvage_bikes">;
export type UpliftmentRow = Tables<"upliftments">;
export type DocumentRow = Tables<"documents">;
export type BikePhotoRow = Tables<"bike_photos">;
export type CommunicationRow = Tables<"communications">;
export type AuditLogRow = Tables<"audit_logs">;
export type InsuranceCompanyRow = Tables<"insurance_companies">;
export type TransporterRow = Tables<"transporters">;
export type LocationRow = Tables<"locations">;
export type BikeStatusRow = Tables<"bike_statuses">;
export type ImportBatchRow = Tables<"import_batches">;
