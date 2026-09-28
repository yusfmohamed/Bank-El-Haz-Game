import { buildServer } from "./server";

const server = await buildServer();
let closing = false;

async function shutdown(signal: string): Promise<void> {
  if (closing) return;
  closing = true;
  server.app.log.info({ signal }, "Shutting down");

  const forceExit = setTimeout(() => {
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  try {
    await server.app.close();
    clearTimeout(forceExit);
    process.exit(0);
  } catch (error) {
    server.app.log.error(error);
    process.exit(1);
  }
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));

try {
  await server.app.listen({
    port: server.config.port,
    host: "0.0.0.0",
  });
  server.app.log.info(
    { port: server.config.port, storage: server.rooms.storageKind },
    "Bank El Hazz server is ready",
  );
} catch (error) {
  server.app.log.error(error);
  await server.app.close().catch(() => {});
  process.exit(1);
}
