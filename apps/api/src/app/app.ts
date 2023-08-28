import { FastifyInstance } from "fastify";
import sensible from "@fastify/sensible";
import { tsRestPlugin } from "./router";


export async function app(fastify: FastifyInstance) {
  fastify.register(sensible);
  fastify.register(tsRestPlugin);
}
