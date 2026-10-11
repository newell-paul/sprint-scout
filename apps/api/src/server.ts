import { createApp } from "./app";
const app = createApp();
await app.listen({ host: "127.0.0.1", port: 3001 });
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => {
    void app.close();
  });
