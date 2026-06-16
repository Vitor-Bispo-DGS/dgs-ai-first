import pino from "pino";
import { config } from "./config.js";

export const rootLogger = pino({
  level: config.logLevel,
  base: { service: "novatech-assistant" },
});

export function createRequestLogger(requestId: string) {
  return rootLogger.child({ requestId });
}

export type RequestLogger = ReturnType<typeof createRequestLogger>;
