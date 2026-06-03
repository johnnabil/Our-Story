import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { destroyImage } from "@/lib/cloudinary";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ publicId: string }> }
) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { publicId } = await params;
  const decodedPublicId = decodeURIComponent(publicId);

  if (!decodedPublicId) {
    return NextResponse.json({ error: "Invalid public ID" }, { status: 400 });
  }

  try {
    const result = await destroyImage(decodedPublicId);
    return NextResponse.json({ ok: true, result });
  } catch {
    return NextResponse.json({ error: "Failed to delete image" }, { status: 500 });
  }
}
