import { NextResponse } from "next/server";
import { startConversation } from "@/lib/elevenlabs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await params;
  const session = await startConversation();
  return NextResponse.json(session);
}
