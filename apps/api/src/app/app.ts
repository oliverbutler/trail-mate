import { FastifyInstance } from 'fastify';
import sensible from '@fastify/sensible';
import { tsRestPlugin } from './router';
import { HttpError } from '../httpError';

export async function app(fastify: FastifyInstance) {
  fastify.register(sensible);
  fastify.register(tsRestPlugin);

  fastify.setErrorHandler(async (error, request, reply) => {
    if (error instanceof HttpError) {
      return reply.status(error.statusCode).send(error.body);
    } else {
      console.error(error);
      return reply.status(500).send({ message: 'Internal Server Error' });
    }
  });
}
