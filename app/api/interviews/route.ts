import { NextResponse } from "next/server";
import { z } from "zod";
import { createInterview, registerSource } from "@/lib/interview";

const createSchema = z.object({
  agentName: z.string().min(1),
  agentDescription: z.string().min(1),
  expertRole: z.string().min(1),
  knowledgeSourceUrl: z.url(),
});

export async function POST(request: Request) {
  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const interview = await createInterview({
    agentName: parsed.data.agentName,
    agentDescription: parsed.data.agentDescription,
    expertRole: parsed.data.expertRole,
    knowledgeSource: { url: parsed.data.knowledgeSourceUrl },
  });

  const { pageCount } = await registerSource({
    interviewId: interview.id,
    source: { url: parsed.data.knowledgeSourceUrl },
  });

  return NextResponse.json({ interview, pageCount }, { status: 201 });
}
