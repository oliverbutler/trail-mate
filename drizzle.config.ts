import type { Config } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

export default {
  schema: "./apps/api/src/app/schema.ts",
  out: "./apps/api/drizzle",
  dbCredentials: {
    connectionString: process.env.DB_CONNECTION_STRING
  },
  driver: "pg"
} satisfies Config;
