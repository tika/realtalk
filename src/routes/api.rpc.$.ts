import { RPCHandler } from "@orpc/server/fetch";
import { createFileRoute } from "@tanstack/react-router";

import { logError, logInfo } from "#/lib/observability";
import router from "#/orpc/router";

const handler = new RPCHandler(router);

const handle = async ({ request }: { request: Request }) => {
  const requestId = crypto.randomUUID();
  const url = new URL(request.url);

  logInfo("rpc.request.start", {
    method: request.method,
    pathname: url.pathname,
    requestId,
  });

  try {
    const { response } = await handler.handle(request, {
      context: { requestId },
      prefix: "/api/rpc",
    });

    logInfo("rpc.request.complete", {
      method: request.method,
      pathname: url.pathname,
      requestId,
      status: response?.status ?? 404,
    });

    return response ?? new Response("Not Found", { status: 404 });
  } catch (error: unknown) {
    logError("rpc.request.unhandled-error", {
      error,
      method: request.method,
      pathname: url.pathname,
      requestId,
    });

    throw error;
  }
};

export const Route = createFileRoute("/api/rpc/$")({
  server: {
    handlers: {
      DELETE: handle,
      GET: handle,
      HEAD: handle,
      PATCH: handle,
      POST: handle,
      PUT: handle,
    },
  },
});
