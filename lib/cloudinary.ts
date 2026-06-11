import { v2 as cloudinary } from "cloudinary";

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;
const contentFolder = "our-story-content";

if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true
  });
}

export function assertCloudinaryConfig() {
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary environment variables are not configured.");
  }
}

export function generateUploadSignature() {
  assertCloudinaryConfig();

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "our-story";
  const signature = cloudinary.utils.api_sign_request({ folder, timestamp }, apiSecret as string);

  return {
    timestamp,
    folder,
    signature,
    apiKey,
    cloudName
  };
}

export async function destroyImage(publicId: string) {
  assertCloudinaryConfig();

  return cloudinary.uploader.destroy(publicId, {
    invalidate: true,
    resource_type: "image"
  });
}

function contentPublicId(key: string) {
  return `${contentFolder}/${key}`;
}

export async function readJsonAsset<T>(key: string): Promise<T | null> {
  assertCloudinaryConfig();

  try {
    const resource = await cloudinary.api.resource(contentPublicId(key), {
      resource_type: "raw"
    });
    const response = await fetch(resource.secure_url, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Cloudinary content asset "${key}".`);
    }

    return (await response.json()) as T;
  } catch (error) {
    const maybeCloudinaryError = error as { http_code?: number };
    if (maybeCloudinaryError.http_code === 404) {
      return null;
    }

    throw error;
  }
}

export async function writeJsonAsset(key: string, value: unknown): Promise<void> {
  assertCloudinaryConfig();

  const payload = Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8").toString("base64");

  await cloudinary.uploader.upload(`data:application/json;base64,${payload}`, {
    resource_type: "raw",
    public_id: contentPublicId(key),
    overwrite: true,
    invalidate: true
  });
}
