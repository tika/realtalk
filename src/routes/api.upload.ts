import { createFileRoute } from "@tanstack/react-router";

import { getAudioExtensionFromMimeType } from "#/lib/audio";
import { logError, logInfo } from "#/lib/observability";
import { uploadToS3 } from "#/lib/s3";

const MAX_FILE_SIZE = 32 * 1024 * 1024; // 32MB

const handle = async ({ request }: { request: Request }) => {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const contentType = request.headers.get("content-type") ?? "audio/webm";
  const contentLength = Number(request.headers.get("content-length") ?? "0");

  if (contentLength > MAX_FILE_SIZE) {
    return Response.json(
      { error: "File too large. Maximum size is 32MB." },
      { status: 413 }
    );
  }

  const seriesId = request.headers.get("x-series-id");
  const recordingId = crypto.randomUUID();
  const extension = getAudioExtensionFromMimeType(contentType);

  const key = seriesId
    ? `recordings/${seriesId}/${recordingId}.${extension}`
    : `recordings/${recordingId}.${extension}`;

  try {
    const buffer = Buffer.from(await request.arrayBuffer());

    logInfo("api.upload.start", { key, contentType, size: buffer.byteLength });

    const result = await uploadToS3(key, buffer, contentType);

    if (!result.success) {
      logError("api.upload.failed", { key, error: result.error });
      return Response.json({ error: "Upload failed" }, { status: 500 });
    }

    logInfo("api.upload.success", { key });
    return Response.json({ key });
  } catch (error: unknown) {
    logError("api.upload.error", { key, error });
    return Response.json({ error: "Upload failed" }, { status: 500 });
  }
};

export const Route = createFileRoute("/api/upload")({
  server: {
    handlers: {
      POST: handle,
    },
  },
});
