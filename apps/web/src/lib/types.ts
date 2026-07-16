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

export type SearchResult = {
  signal_id: string;
  owner_id: string;
  raw_text: string;
  topic: string;
  intent: Intent;
  kind: SignalKind;
  tags: string[];
  region_label: string;
  is_profile: boolean;
  score: number;
  similarity: number;
  label: string;
};

export type SearchResponse = {
  empty: boolean;
  message: string | null;
  results: SearchResult[];
};

export type GlobePoint = {
  id: string;
  owner_id: string;
  lat: number;
  lng: number;
  region_label: string;
  kind: SignalKind;
  topic: string;
  is_profile: boolean;
  created_at: string | null;
};

export type ProfileUpsertResponse =
  | { blocked: true; reason: string; risk_flags: string[] }
  | Signal;

export type ActivityItem = {
  id: string;
  owner_id: string;
  raw_text: string;
  region_label: string;
  kind: SignalKind;
  status: SignalStatus;
  created_at: string | null;
};

export type ConnectionStatus = "pending" | "accepted" | "declined";

export type Connection = {
  id: string;
  requester_id: string;
  recipient_id: string;
  signal_id: string;
  message: string;
  rationale: string;
  status: ConnectionStatus;
  direction: "incoming" | "outgoing";
  conversation_id: string | null;
  created_at: string | null;
};

export type Message = {
  sender_id: string;
  text: string;
  sent_at: string | null;
};

export type PinnedContext = {
  signal_id: string;
  owner_id: string;
  raw_text: string;
  topic: string;
  is_profile: boolean;
  rationale: string;
};

export type Conversation = {
  id: string;
  connection_id: string;
  participant_ids: string[];
  pinned_context: PinnedContext;
  messages: Message[];
  status: "active" | "ended";
  created_at: string | null;
};
