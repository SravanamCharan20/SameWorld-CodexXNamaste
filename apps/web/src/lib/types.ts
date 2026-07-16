export type SignalKind = "NOW" | "OPEN" | "PROFILE";
export type Intent =
  | "need"
  | "offer"
  | "question"
  | "experience"
  | "goal"
  | "opinion"
  | "moment"
  | "other";
export type Visibility = "worldwide" | "country" | "region";
export type ContactIntent = "just_sharing" | "open_to_conversation" | "actively_looking";
export type SignalStatus = "active" | "resolved" | "expired" | "blocked";

export type Signal = {
  id: string;
  owner_id: string;
  is_profile: boolean;
  raw_text: string;
  kind: SignalKind;
  intent: Intent;
  topic: string;
  tags: string[];
  links: string[];
  region_label: string;
  region_lat: number;
  region_lng: number;
  visibility: Visibility;
  contact_intent: ContactIntent;
  status: SignalStatus;
  risk_flags: string[];
  created_at: string | null;
  expires_at: string | null;
  resolved_at: string | null;
  edited_at: string | null;
};

export type SignalPreview =
  | { blocked: true; reason: string; risk_flags: string[] }
  | {
      blocked: false;
      preview_id: string;
      intent: Intent;
      topic: string;
      tags: string[];
      suggested_kind: SignalKind;
      region_label: string;
    };
