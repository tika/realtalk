import { LogLayer, StructuredTransport } from "loglayer";

type LogContext = Record<string, unknown> | undefined;
type LogLevel = "error" | "info";

const logger = new LogLayer({
  contextFieldName: "context",
  errorFieldName: "error",
  errorSerializer: (error: unknown) => {
    if (error instanceof Error) {
      return {
        message: error.message,
        name: error.name,
        stack: error.stack,
      };
    }

    return { value: error };
  },
  transport: new StructuredTransport({
    dateField: "timestamp",
    levelField: "level",
    logger: console,
    messageField: "event",
  }),
});

const splitLogContext = (context: LogContext) => {
  if (!context) {
    return {};
  }

  const { error, ...restContext } = context;

  return {
    error,
    restContext,
  };
};

const writeLog = (level: LogLevel, event: string, context?: LogContext) => {
  const { error, restContext } = splitLogContext(context);
  const scopedLogger =
    restContext && Object.keys(restContext).length > 0
      ? logger.withContext(restContext)
      : logger;

  if (level === "error") {
    const errorLogger = error ? scopedLogger.withError(error) : scopedLogger;
    errorLogger.error(event);
    return;
  }

  scopedLogger.info(event);
};

export const logError = (event: string, context?: LogContext) => {
  writeLog("error", event, context);
};

export const logInfo = (event: string, context?: LogContext) => {
  writeLog("info", event, context);
};
