import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { generateUploadSignature } from "@/lib/cloudinary";

export async function POST() {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(generateUploadSignature());
  } catch {
    return NextResponse.json({ error: "Failed to generate upload signature" }, { status: 500 });
  }
}
