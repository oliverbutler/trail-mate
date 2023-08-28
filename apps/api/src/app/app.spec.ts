import Fastify, { FastifyInstance, InjectOptions } from "fastify";
import { app } from "./app";
import cuid from "cuid";
import { initClient } from "@ts-rest/core";
import { contract } from "@trail-mate/api-types";


describe("App Test", () => {
  let server: FastifyInstance;

  const testClient = initClient(contract, {
    baseUrl: "",
    baseHeaders: {},
    api: async (args) => {

      const response = await server.inject({
        method: args.method as InjectOptions["method"],
        url: args.path,
        body: args.rawBody as InjectOptions["body"]
      });

      return {
        status: response.statusCode,
        body: response.json(),
        headers: response.headers as unknown as Headers
      };
    }
  });

  beforeAll(() => {
    server = Fastify();
    server.register(app);
  });

  it("health endpoint should work", async () => {

    const response = await testClient.getHealth();

    expect(response).toEqual({
      status: 200,
      body: {
        status: "ok",
        uptime: expect.any(Number)
      },
      headers: expect.anything()
    });
  });

  it("should return a list of tracks", async () => {

    const trackName = `Test ${cuid()}`;

    const createResponse = await testClient.createTrack({
      body: {
        name: trackName
      }
    });

    expect(createResponse.status).toBe(200);

    const response = await testClient.getTracks();

    expect(response.body).toStrictEqual(expect.arrayContaining([
      {
        id: expect.any(String),
        name: trackName
      }
    ]));
  });

});
