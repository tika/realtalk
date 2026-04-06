export const uploadAudio = async (blob: Blob): Promise<string> => {
  const response = await fetch("/api/upload", {
    method: "POST",
    headers: {
      "content-type": blob.type || "audio/webm",
    },
    body: blob,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
  }

  const { key } = (await response.json()) as { key: string };
  return key;
};
