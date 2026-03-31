import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "#/lib/env";
import { logError, logInfo } from "#/lib/observability";
import { err, ok } from "#/lib/result";
import type { Result } from "#/lib/result";

const PRESIGNED_URL_EXPIRY = 3600; // 1 hour

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  forcePathStyle: true,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

export const uploadToS3 = async (
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<Result<{ key: string }>> => {
  try {
    logInfo("r2.upload.start", { key, contentType });

    await r2.send(
      new PutObjectCommand({
        Bucket: env.R2_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );

    logInfo("r2.upload.success", { key });
    return ok({ key });
  } catch (error: unknown) {
    logError("r2.upload.error", { key, error });
    return err(
      error instanceof Error ? error : new Error("Failed to upload to R2")
    );
  }
};

export const getPresignedDownloadUrl = async (
  key: string
): Promise<Result<string>> => {
  try {
    const url = await getSignedUrl(
      r2,
      new GetObjectCommand({ Bucket: env.R2_BUCKET, Key: key }),
      { expiresIn: PRESIGNED_URL_EXPIRY }
    );

    return ok(url);
  } catch (error: unknown) {
    logError("r2.presign.error", { key, error });
    return err(
      error instanceof Error
        ? error
        : new Error("Failed to generate presigned URL")
    );
  }
};
