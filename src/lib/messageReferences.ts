import { supabase } from "@/lib/supabase";

/**
 * Create reference(s) from a source message to referenced message(s)
 * Returns { data, error } following Supabase pattern
 */
export async function createMessageReferences(
  sourceMessageId: string,
  referencedMessageIds: string[]
) {
  // Validation
  if (!sourceMessageId || referencedMessageIds.length === 0) {
    return { 
      data: null, 
      error: new Error("Source message ID and at least one referenced message ID required") 
    };
  }

  // Prevent self-references
  const validIds = referencedMessageIds.filter(id => id !== sourceMessageId);
  if (validIds.length === 0) {
    return { data: [], error: null };
  }

  const records = validIds.map(refId => ({
    source_message_id: sourceMessageId,
    referenced_message_id: refId
  }));

  const { data, error } = await supabase
    .from("message_references")
    .insert(records)
    .select();

  if (error) {
    console.error("Error creating message references:", error);
    return { data: null, error };
  }

  return { data: data || [], error: null };
}

/**
 * Delete all references from a message (used when deleting message)
 */
export async function deleteMessageReferences(sourceMessageId: string) {
  const { error } = await supabase
    .from("message_references")
    .delete()
    .eq("source_message_id", sourceMessageId);

  if (error) {
    console.error("Error deleting message references:", error);
    return { data: null, error };
  }

  return { data: true, error: null };
}
