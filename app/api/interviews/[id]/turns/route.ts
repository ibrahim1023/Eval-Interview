import { NextResponse } from "next/server";
import { z } from "zod";
import { runTurn } from "@/lib/interview";

const turnSchema = z.object({
  content: z.string().min(1),
});

// Also receives ElevenLabs webhook tool calls (submit_expert_turn). The shared
// secret is required when ELEVENLABS_WEBHOOK_SECRET is configured.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const secret = process.env.ELEVENLABS_WEBHOOK_SECRET;
  if (secret && request.headers.get("x-webhook-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = turnSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { id } = await params;
  const result = await runTurn(id, parsed.data.content);
  return NextResponse.json(result);
}
