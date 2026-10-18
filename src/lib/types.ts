export type AppRole = "SUPER_ADMIN" | "ORGANIZATION_ADMIN" | "PUBLIC_USER";

export type OrganizationStatus = "active" | "inactive";

export interface Organization {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  locality: string | null;
  avatar_path: string | null;
  cover_path: string | null;
  status: OrganizationStatus;
  is_demo?: boolean;
  region_id?: string | null;
  settlement?: string | null;
  organization_type?: "district_center" | "house_of_culture" | "rural_house" | "club" | "leisure_center" | null;
  director_name?: string | null;
  staff_count?: number | null;
  source_url?: string | null;
  verified_at?: string | null;
  created_at: string;
  updated_at: string;
}

export type PlanItemStatus =
  | "planned"
  | "completion_submitted"
  | "completion_returned"
  | "completed"
  | "cancelled";

export interface PlanItem {
  id: string;
  organization_id: string;
  plan_id: string | null;
  source_item_id: string | null;
  event_id: string | null;
  title: string;
  planned_date: string;
  responsible: string | null;
  notes: string | null;
  status: PlanItemStatus;
  completion_report: string | null;
  completed_on: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_note: string | null;
  cancel_reason: string | null;
  cancelled_at: string | null;
  is_demo: boolean;
  requires_media: boolean;
  material_status: import("./plan-material").PlanMaterialStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  organizations?: { name: string } | null;
  plans?: { title: string; plan_type: PlanType; period_year: number; period_month: number | null } | null;
  events?: { title: string; event_date: string; moderation_status: EventStatus } | null;
}

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  user_id: string;
  organization_id: string;
  role: AppRole;
  created_at: string;
}

export type PlanType = "annual" | "monthly";
export type MediaKind = "photo" | "video";
export type MediaStatus = "pending" | "approved" | "rejected";

export interface Plan {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  plan_type: PlanType;
  period_year: number;
  period_month: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  file_path: string | null;
  file_name: string | null;
  file_mime_type: string | null;
  file_size: number | null;
  uploaded_at: string | null;
  organizations?: { name: string } | null;
}

export type EventStatus = "draft" | "pending" | "approved" | "rejected";

export interface EventItem {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  location: string | null;
  moderation_status: EventStatus;
  rejection_reason: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  organizations?: { name: string } | null;
  media_items?: { id: string; media_kind: MediaKind }[];
}

export interface MediaItem {
  id: string;
  organization_id: string;
  event_id: string | null;
  uploader_id: string | null;
  title: string;
  description: string | null;
  storage_path: string;
  thumbnail_path?: string | null;
  media_kind: MediaKind;
  mime_type: string;
  file_size: number;
  status: MediaStatus;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  unpublished_at?: string | null;
  updated_at: string;
  organizations?: { name: string } | null;
  events?: { title: string; moderation_status: EventStatus } | null;
}

export interface MediaItemWithUrl extends MediaItem {
  url: string | null;
  thumbnail_url?: string | null;
  uploader?: { full_name: string | null; email: string | null } | null;
}
