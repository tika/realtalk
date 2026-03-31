import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { logError, logInfo } from "#/lib/observability";
import { err, ok } from "#/lib/result";
import type { Result } from "#/lib/result";

const PRESIGNED_URL_EXPIRY = 3600; // 1 hour

const getS3Client = () => {
  const region = process.env.AWS_REGION;
  const bucket = process.env.S3_BUCKET;

  if (!region || !bucket) {
    return err(
      new Error("AWS_REGION and S3_BUCKET environment variables are required")
    );
  }

  return ok({ client: new S3Client({ region }), bucket });
};

export const uploadToS3 = async (
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<Result<{ key: string }>> => {
  const s3Result = getS3Client();
  if (!s3Result.success) {
    return err(s3Result.error);
  }

  const { client, bucket } = s3Result.data;

  try {
    logInfo("s3.upload.start", { bucket, key, contentType });

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );

    logInfo("s3.upload.success", { bucket, key });
    return ok({ key });
  } catch (error: unknown) {
    logError("s3.upload.error", { bucket, key, error });
    return err(
      error instanceof Error ? error : new Error("Failed to upload to S3")
    );
  }
};

export const getPresignedDownloadUrl = async (
  key: string
): Promise<Result<string>> => {
  const s3Result = getS3Client();
  if (!s3Result.success) {
    return err(s3Result.error);
  }

  const { client, bucket } = s3Result.data;

  try {
    const url = await getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn: PRESIGNED_URL_EXPIRY }
    );

    return ok(url);
  } catch (error: unknown) {
    logError("s3.presign.error", { bucket, key, error });
    return err(
      error instanceof Error
        ? error
        : new Error("Failed to generate presigned URL")
    );
  }
};
