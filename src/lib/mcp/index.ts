import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listProperties from "./tools/list-properties";
import myInterests from "./tools/my-interests";
import myNotifications from "./tools/my-notifications";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "elite-horizon",
  title: "Elite Horizon",
  version: "0.1.0",
  instructions:
    "Tools for the Eliteoz property marketplace. Browse live listings, and view the signed-in member's property interests and notifications.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listProperties, myInterests, myNotifications],
});
