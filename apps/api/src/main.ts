import Fastify from "fastify";
import { app } from "./app/app";
import "./env";
import { db } from "./db";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { environment } from "./env";

const server = Fastify({
  logger: {
    transport: environment.ENVIRONMENT === "local" ? {
      target: "pino-pretty"
    } : undefined
  }
});

server.register(app);

if (environment.ENVIRONMENT !== "local") {
  server.addHook("onReady", async () => {
    console.log("Starting migration");
    migrate(db, { migrationsFolder: "./api/assets/drizzle" })
      .then(() => {
        console.log("Migration complete");
      })
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });
  });
}

server.listen({ port: environment.PORT, host: environment.HOST }, (err) => {
  if (err) {
    server.log.error(err);
    process.exit(1);
  } else {
    console.log(`[ ready ] http://${environment.HOST}:${environment.PORT}`);
  }
});
