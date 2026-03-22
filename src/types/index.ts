export type DealStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "DOCUMENTS_COMPLETE"
  | "APPROVED"
  | "DECLINED";

export type DocumentType =
  | "VOIDED_CHECK"
  | "BANK_LETTER"
  | "DRIVERS_LICENSE"
  | "PRINCIPAL_INFO";

export type DocumentStatus = "MISSING" | "SUBMITTED" | "APPROVED" | "REJECTED";

export type SequenceStatus = "ACTIVE" | "PAUSED" | "COMPLETED";

export interface Deal {
  id: string;
  merchant_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  status: DealStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  documents?: Document[];
  principals?: Principal[];
  follow_up_sequences?: FollowUpSequence[];
}

export interface Document {
  id: string;
  deal_id: string;
  type: DocumentType;
  status: DocumentStatus;
  storage_path: string | null;
  file_name: string | null;
  uploaded_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
}

export interface Principal {
  id: string;
  deal_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  ssn_encrypted: string | null;
  ssn_iv: string | null;
  ssn_tag: string | null;
  dob: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  ownership_percentage: number | null;
  drivers_license_path: string | null;
  submitted_at: string | null;
  created_at: string;
  ssn_last4?: string | null;
}

export interface FollowUpSequence {
  id: string;
  deal_id: string;
  interval_days: number;
  status: SequenceStatus;
  next_send_at: string;
  custom_message: string | null;
  created_at: string;
  follow_up_messages?: FollowUpMessage[];
}

export interface FollowUpMessage {
  id: string;
  sequence_id: string;
  channel: "SMS" | "EMAIL";
  sent_at: string;
  content: string;
  external_id: string | null;
}

export interface DelegationToken {
  id: string;
  principal_id: string;
  token: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
  principals?: Principal;
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  VOIDED_CHECK: "Voided Check or Bank Letter",
  BANK_LETTER: "Bank Letter",
  DRIVERS_LICENSE: "Driver's License",
  PRINCIPAL_INFO: "Principal Information",
};

export const DEAL_STATUS_LABELS: Record<DealStatus, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  DOCUMENTS_COMPLETE: "Documents Complete",
  APPROVED: "Approved",
  DECLINED: "Declined",
};
