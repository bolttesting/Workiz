import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), "../../.env") });
config({ path: resolve(process.cwd(), ".env") });

import { createAdminSupabase } from "@workix/db/admin";

export const adminDb = createAdminSupabase();
