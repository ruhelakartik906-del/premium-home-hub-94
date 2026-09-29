import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_notifications",
  title: "List my notifications",
  description: "List recent notifications for the signed-in Eliteoz member.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    const sb = supabaseForUser(ctx);
    const { data, error } = await sb
      .from("notifications")
      .select("id, title, body, read, created_at")
      .eq("user_id", ctx.getUserId() ?? "")
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const notifications = (data ?? []).map((n) => ({
      id: n.id, title: n.title, body: n.body, read: n.read, created_at: n.created_at,
    }));
    return { content: [{ type: "text", text: JSON.stringify(notifications) }], structuredContent: { notifications } };
  },
});
