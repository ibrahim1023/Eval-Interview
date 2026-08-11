import 'dotenv/config';

async function main() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const webhookSecret = process.env.ELEVENLABS_WEBHOOK_SECRET;

  if (!apiKey || !webhookSecret) {
    console.error(
      'Usage: ELEVENLABS_API_KEY=<key> ELEVENLABS_WEBHOOK_SECRET=<secret> npx tsx scripts/create-elevenlabs-tool.ts'
    );
    process.exit(1);
  }

  const body = {
    tool_config: {
      type: 'webhook',
      name: 'submit_expert_turn',
      description:
        "Submit the expert's latest response and receive the next interview question from the EvalInterview engine.",
      api_schema: {
        url: 'https://evalinterview.vercel.app/api/interviews/{interview_id}/turns',
        method: 'POST',
        path_params_schema: {
          interview_id: {
            type: 'string',
            dynamic_variable: 'interview_id',
          },
        },
        request_headers: {
          'x-webhook-secret': webhookSecret,
        },
        request_body_schema: {
          type: 'object',
          required: ['content'],
          description:
            'The JSON body sent to the EvalInterview engine containing the expert\'s transcribed response.',
          properties: {
            content: {
              type: 'string',
              description:
                "The expert's complete response as plain spoken text, preserving their meaning exactly, e.g. 'Block destructive migrations unless a rollback plan exists.'",
            },
          },
        },
      },
      response_timeout_secs: 20,
      dynamic_variables: {
        dynamic_variable_placeholders: {
          interview_id: '00000000-0000-0000-0000-000000000000',
        },
      },
    },
  };

  const res = await fetch('https://api.elevenlabs.io/v1/convai/tools', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error('Failed to create tool:', res.status);
    console.error(JSON.stringify(data, null, 2));
    process.exit(1);
  }

  console.log('Tool created successfully:');
  console.log(JSON.stringify(data, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
