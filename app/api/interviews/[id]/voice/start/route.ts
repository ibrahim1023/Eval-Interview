import { NextResponse } from "next/server";
import { startConversation } from "@/lib/elevenlabs";

export async function POST() {
  const session = await startConversation();
  return NextResponse.json(session);
}
