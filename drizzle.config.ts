import { config } from "dotenv"
config({ path: ".env.local" })

import { defineConfig } from "drizzle-kit"

export default defineConfig({
  schema: "./schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.AUTH_DRIZZLE_URL!,
  },
});
