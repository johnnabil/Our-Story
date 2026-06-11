import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getContent, setContent } from "@/lib/kv";
import { GALLERY_CATEGORIES, type GalleryPhoto } from "@/lib/types";

type AppendGalleryBody = {
  photos: unknown;
};

function isAppendGalleryBody(payload: unknown): payload is AppendGalleryBody {
  return typeof payload === "object" && payload !== null && "photos" in payload;
}

function isGalleryPhoto(value: unknown): value is GalleryPhoto {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const photo = value as Record<string, unknown>;

  return (
    typeof photo.url === "string" &&
    typeof photo.caption === "string" &&
    typeof photo.publicId === "string" &&
    typeof photo.category === "string" &&
    GALLERY_CATEGORIES.includes(photo.category as GalleryPhoto["category"])
  );
}

export async function POST(req: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: unknown;

  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed JSON body" }, { status: 400 });
  }

  if (!isAppendGalleryBody(payload) || !Array.isArray(payload.photos)) {
    return NextResponse.json({ error: "Request body must include photos" }, { status: 400 });
  }

  if (!payload.photos.every(isGalleryPhoto)) {
    return NextResponse.json({ error: "Invalid gallery photos" }, { status: 400 });
  }

  try {
    const existingGallery = await getContent("gallery");
    const existingPublicIds = new Set(existingGallery.map((photo) => photo.publicId));
    const photosToAppend = payload.photos.filter(
      (photo) => !existingPublicIds.has(photo.publicId),
    );
    const gallery = [...existingGallery, ...photosToAppend];

    await setContent("gallery", gallery);

    return NextResponse.json({
      ok: true,
      added: photosToAppend.length,
      gallery,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown storage error";
    console.error("Failed to append gallery photos:", error);
    return NextResponse.json(
      {
        error: "Failed to append gallery photos",
        detail: message
      },
      { status: 500 }
    );
  }
}
