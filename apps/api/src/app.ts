import Fastify from "fastify";
import {
  listDemoSegments,
  getDemoForecast,
  getPlannerData,
} from "@scout/application";
export function createApp() {
  const app = Fastify({ logger: false, bodyLimit: 4096 });
  app.get("/health/live", async () => ({ status: "ok", mode: "demo" }));
  app.get("/health/ready", async () => ({
    status: "ok",
    mode: "demo",
    database: "not-required",
  }));
  app.get("/segments", async () => ({
    mode: "demo",
    segments: listDemoSegments(),
  }));
  app.get("/weather/demo", async () => getDemoForecast());
  app.post("/planner/demo", async (request, reply) => {
    try {
      return await getPlannerData(request.body);
    } catch {
      return reply.code(400).send({ error: "Invalid planner input" });
    }
  });
  return app;
}
