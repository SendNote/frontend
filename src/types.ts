import { type Database } from "../supabase";

export type Message = Database["public"]["Tables"]["messages"]["Row"];
export type Attachment = Database["public"]["Tables"]["attachments"]["Row"];

export interface MessageWithAttachments extends Message {
  attachments: Attachment[];
}

export type MessageReference = Database["public"]["Tables"]["message_references"]["Row"];

export interface MessageWithReferences extends MessageWithAttachments {
  // References this message makes (messages this one replies to)
  references?: Array<{
    referenced_message_id: string;
    referenced_message: MessageWithAttachments | null;
  }>;
  
  // Messages that reference this one (replies to this message)
  referenced_by?: Array<{
    source_message_id: string;
    source_message: {
      id: string;
      body: string;
      created_at: string;
      channel_id: string;
    };
  }>;
}

export interface MessageWithChannel extends MessageWithAttachments {
  channel: {
    id: string;
    name: string;
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
