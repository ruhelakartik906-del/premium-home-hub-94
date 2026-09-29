import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_interests",
  title: "List my interests",
  description: "List the properties the signed-in buyer has contacted the team about.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    const sb = supabaseForUser(ctx);
    const { data, error } = await sb
      .from("interests")
      .select("id, property_id, status, message, created_at")
      .eq("buyer_id", ctx.getUserId() ?? "")
      .order("created_at", { ascending: false });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const interests = (data ?? []).map((i) => ({
      id: i.id, property_id: i.property_id, status: i.status, message: i.message, created_at: i.created_at,
    }));
    return { content: [{ type: "text", text: JSON.stringify(interests) }], structuredContent: { interests } };
  },
});
