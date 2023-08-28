import Fastify from "fastify";
import { app } from "./app/app";
import "./env";
import { db } from "./db";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const host = process.env.HOST ?? "localhost";
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

const server = Fastify({
  logger: {
    transport: {
      target: "pino-pretty"
    }
  }
});

server.register(app);

if (process.env.NODE_ENV === "production") {
  server.addHook("onReady", async () => {
    console.log("Starting migration");
    migrate(db, { migrationsFolder: "./drizzle" })
      .then(() => {
        console.log("Migration complete");
      })
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });
  });
}

server.listen({ port, host }, (err) => {
  if (err) {
    server.log.error(err);
    process.exit(1);
  } else {
    console.log(`[ ready ] http://${host}:${port}`);
  }
});
