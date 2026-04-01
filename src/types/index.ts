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
  | "PRINCIPAL_INFO"
  | "CUSTOM";

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
  custom_name: string | null;
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
  CUSTOM: "Custom Document",
};

export const DEAL_STATUS_LABELS: Record<DealStatus, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  DOCUMENTS_COMPLETE: "Documents Complete",
  APPROVED: "Approved",
  DECLINED: "Declined",
};

// Processing profile
export type BusinessType = "B2B" | "B2C" | "BOTH";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "TBD";
export type ChecklistOwner = "jason" | "ran" | "merchant" | "underwriting";
export type ChecklistStatus = "PENDING" | "IN_PROGRESS" | "COMPLETE" | "BLOCKED";
export type TranscriptSource = "aircall" | "loom" | "manual";
export type TranscriptType = "call" | "internal_notes" | "other";

export interface ProcessingProfile {
  id: string;
  deal_id: string;
  dba_name: string | null;
  legal_name: string | null;
  industry: string | null;
  business_type: BusinessType | null;
  years_in_business: number | null;
  ein_age_months: number | null;
  website: string | null;
  referral_source: string | null;
  referral_contact: string | null;
  card_present: boolean;
  card_not_present: boolean;
  needs_pos: boolean;
  needs_gateway: boolean;
  gateway_preference: string | null;
  needs_ach: boolean;
  monthly_volume_estimate: number | null;
  avg_transaction_size: number | null;
  high_ticket_expected: number | null;
  high_ticket_initial_limit: number | null;
  risk_level: RiskLevel;
  risk_factors: string | null;
  processor: string | null;
  processor_team: string | null;
  trade_component: string | null;
  setup_fee_arrangement: string | null;
  strategic_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChecklistItem {
  id: string;
  deal_id: string;
  task: string;
  owner: ChecklistOwner;
  status: ChecklistStatus;
  due_date: string | null;
  auto_generated: boolean;
  depends_on: string | null;
  sort_order: number;
  notes: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface RateComparison {
  id: string;
  deal_id: string;
  competitor_name: string;
  competitor_setup_fee: number | null;
  competitor_monthly_fee: number | null;
  competitor_qualified_rate: number | null;
  competitor_mid_qual_rate: number | null;
  competitor_non_qual_rate: number | null;
  competitor_per_transaction_fee: number | null;
  our_proposed_rate: number | null;
  our_setup_fee: number | null;
  our_monthly_fee: number | null;
  our_per_transaction_fee: number | null;
  estimated_monthly_savings: number | null;
  trade_component: string | null;
  pricing_model: string | null;
  notes: string | null;
  created_at: string;
}

export interface TranscriptRecord {
  id: string;
  deal_id: string;
  source: TranscriptSource;
  transcript_type: TranscriptType;
  raw_text: string;
  ai_extraction: AIExtraction | null;
  processed_at: string | null;
  created_at: string;
}

// The structured output from Claude's transcript extraction
export interface AIExtraction {
  merchant_profile: {
    business_name: string | null;
    dba_name: string | null;
    legal_name: string | null;
    business_type: string | null;
    industry: string | null;
    business_model: string | null;
    years_in_business: number | null;
    ein_age_months: number | null;
    referral_source: string | null;
    referral_contact: string | null;
    website: string | null;
  };
  contact_info: {
    contact_name: string | null;
    contact_phone: string | null;
    contact_email: string | null;
  };
  processing_details: {
    card_present: boolean;
    card_not_present: boolean;
    needs_pos: boolean;
    needs_gateway: boolean;
    gateway_preference: string | null;
    needs_ach: boolean;
    monthly_volume_estimate: number | null;
    avg_transaction_size: number | null;
    high_ticket_expected: number | null;
    high_ticket_initial_limit: number | null;
  };
  underwriting_risk: {
    risk_level: string;
    risk_factors: string[];
    documents_needed: string[];
    ownership_structure: string | null;
    principal_info: {
      name: string | null;
      ownership_pct: number | null;
      info_status: string | null;
    }[];
  };
  pricing: {
    competitor_name: string | null;
    competitor_setup_fee: number | null;
    competitor_monthly_fee: number | null;
    competitor_qualified_rate: number | null;
    competitor_non_qual_rate: number | null;
    our_pricing_approach: string | null;
    trade_component: string | null;
    setup_fee_arrangement: string | null;
  };
  action_items: {
    task: string;
    owner: string;
    deadline: string | null;
  }[];
  strategic_notes: string[];
}

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  LOW: "Low Risk",
  MEDIUM: "Medium Risk",
  HIGH: "High Risk",
  TBD: "To Be Determined",
};

export const CHECKLIST_OWNER_LABELS: Record<ChecklistOwner, string> = {
  jason: "Jason",
  ran: "Rann",
  merchant: "Merchant",
  underwriting: "Underwriting",
};
