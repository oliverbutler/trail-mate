import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { Tracks } from "../../schema";
import { db } from "../../db";


export default async function(fastify: FastifyInstance) {
  fastify.get(
    "/",
    async function(request: FastifyRequest, reply: FastifyReply) {
      return { message: "Hello API" };
    }
  );

  fastify.get("/health", async (request, reply) => {
    return {
      status: "ok",
      uptime: process.uptime()
    };
  });

  fastify.get("/tracks", async (request, reply) => {
    const tracks = await db.select().from(Tracks);

    return tracks;
  });

  fastify.post("/tracks", async (request, reply) => {
    const { name } = request.body as { name: string };

    await db.insert(Tracks).values({
      name
    });

    const tracks = await db.select().from(Tracks);

    return tracks;
  });
}
