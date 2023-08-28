import Fastify, { FastifyInstance } from "fastify";
import { app } from "./app";
import cuid from "cuid";

describe("App Test", () => {
  let server: FastifyInstance;

  beforeEach(() => {
    server = Fastify();
    server.register(app);
  });

  it("health endpoint should work", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/health"
    });

    expect(response.json()).toEqual({ status: "ok", uptime: expect.any(Number) });
  });

  it("should return a list of tracks", async () => {

    const trackName = `Test ${cuid()}`;

    const createResponse = await server.inject({
      method: "POST",
      url: "/tracks",
      body: {
        name: trackName
      }
    });

    expect(createResponse.statusCode).toBe(200);

    const response = await server.inject({
      method: "GET",
      url: "/tracks"
    });

    expect(response.json()).toStrictEqual(expect.arrayContaining([
      {
        id: expect.any(String),
        name: trackName
      }
    ]));
  });

});
