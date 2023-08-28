import postgres from "postgres";
import { environment } from "./env";
import { readFileSync } from "fs";
import { drizzle } from "drizzle-orm/postgres-js";

const connection = postgres(environment.DB_CONNECTION_STRING, {
  ssl:
    environment.ENVIRONMENT !== "local"
      ? {
        ca: readFileSync("./api/assets/drizzle/global-bundle.pem").toString()
      }
      : false
});
export const db = drizzle(connection);
