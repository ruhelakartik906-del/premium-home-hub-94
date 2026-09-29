import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_properties",
  title: "List properties",
  description: "List live Eliteoz property listings, optionally filtered by location text.",
  inputSchema: {
    location: z.string().optional().describe("Optional location text to match."),
    limit: z.number().int().min(1).max(50).optional().describe("Max results (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ location, limit }, ctx) => {
    const sb = supabaseForUser(ctx);
    let q = sb
      .from("properties")
      .select("id, ref, title, location, price, property_type, beds, baths, area_sqft, status")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (location) q = q.ilike("location", `%${location}%`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const properties = (data ?? []).map((p) => ({
      id: p.id, ref: p.ref, title: p.title, location: p.location, price: p.price,
      property_type: p.property_type, beds: p.beds, baths: p.baths, area_sqft: p.area_sqft,
    }));
    return { content: [{ type: "text", text: JSON.stringify(properties) }], structuredContent: { properties } };
  },
});
