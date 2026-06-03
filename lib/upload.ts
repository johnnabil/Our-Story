export interface UploadSignatureResponse {
  timestamp: number;
  folder: string;
  signature: string;
  apiKey: string;
  cloudName: string;
}

export interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
}

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function uploadImage(file: File): Promise<CloudinaryUploadResponse> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds the 10MB limit.`);
  }

  const signatureResponse = await fetch("/api/upload", {
    method: "POST"
  });

  if (!signatureResponse.ok) {
    throw new Error("Could not create upload signature");
  }

  const signaturePayload = (await signatureResponse.json()) as UploadSignatureResponse;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", signaturePayload.apiKey);
  formData.append("timestamp", String(signaturePayload.timestamp));
  formData.append("signature", signaturePayload.signature);
  formData.append("folder", signaturePayload.folder);

  const cloudinaryResponse = await fetch(
    `https://api.cloudinary.com/v1_1/${signaturePayload.cloudName}/image/upload`,
    {
      method: "POST",
      body: formData
    }
  );

  if (!cloudinaryResponse.ok) {
    throw new Error("Cloudinary upload failed");
  }

  return (await cloudinaryResponse.json()) as CloudinaryUploadResponse;
}

export async function deleteImageAsset(publicId: string): Promise<void> {
  if (!publicId) {
    return;
  }

  const response = await fetch(`/api/image/${encodeURIComponent(publicId)}`, {
    method: "DELETE"
  });

  if (!response.ok) {
    throw new Error("Image cleanup failed");
  }
}
