import { v2 as cloudinary } from "cloudinary";

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true
  });
}

function assertCloudinaryConfig() {
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
