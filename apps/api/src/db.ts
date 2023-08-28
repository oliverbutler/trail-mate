import postgres from "postgres";
import { environment } from "./env";
import { readFileSync } from "fs";
import { drizzle } from "drizzle-orm/postgres-js";

const connection = postgres(environment.DB_CONNECTION_STRING, {
  ssl:
    process.env.NODE_ENV === "production"
      ? {
        ca: readFileSync("./drizzle/global-bundle.pem").toString()
      }
      : false
});
export const db = drizzle(connection);
