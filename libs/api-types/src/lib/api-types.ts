import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

export const contract = c.router({
  getHealth: {
    method: "GET",
    path: "/health",
    responses: {
      200: z.object({
        status: z.string(),
        uptime: z.number()
      })
    }
  },
  getTracks: {
    method: "GET",
    path: "/tracks",
    responses: {
      200: z.object({
        id: z.string(),
        name: z.string()
      }).array()
    }
  },
  createTrack: {
    method: "POST",
    path: "/tracks",
    body: z.object({
      name: z.string()
    }),
    responses: {
      200: z.object({
        id: z.string(),
        name: z.string()
      })
    }
  }
});
