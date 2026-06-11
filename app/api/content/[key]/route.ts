import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { setContent } from "@/lib/kv";
import { isContentKey, type SiteContent } from "@/lib/types";

type PatchBody = {
  value: unknown;
};

function isPatchBody(payload: unknown): payload is PatchBody {
  return typeof payload === "object" && payload !== null && "value" in payload;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { key } = await params;

  if (!isContentKey(key)) {
    return NextResponse.json({ error: "Invalid content key" }, { status: 400 });
  }

  let payload: unknown;

  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed JSON body" }, { status: 400 });
  }

  if (!isPatchBody(payload)) {
    return NextResponse.json({ error: "Request body must include value" }, { status: 400 });
  }

  try {
    await setContent(key, payload.value as SiteContent[typeof key]);
    return NextResponse.json({ ok: true, key, value: payload.value });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown storage error";
    console.error(`Failed to update content key "${key}":`, error);
    return NextResponse.json(
      {
        error: "Failed to update content",
        detail: message
      },
      { status: 500 }
    );
  }
}
