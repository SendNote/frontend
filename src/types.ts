import { type Database } from "../supabase";

export type Message = Database["public"]["Tables"]["messages"]["Row"];
export type Attachment = Database["public"]["Tables"]["attachments"]["Row"];

export interface MessageWithAttachments extends Message {
  attachments: Attachment[];
}
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
