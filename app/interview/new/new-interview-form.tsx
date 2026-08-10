"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function NewInterviewForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(event.currentTarget);
    try {
      const res = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentName: form.get("agentName"),
          agentDescription: form.get("agentDescription"),
          expertRole: form.get("expertRole"),
          knowledgeSourceUrl: form.get("knowledgeSourceUrl"),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }
      const { interview } = (await res.json()) as { interview: { id: string } };
      router.push(`/interview/${interview.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  const field =
    "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm focus:border-neutral-900 focus:outline-none";

  return (
    <form
      onSubmit={onSubmit}
      className="mt-7 rounded-2xl border border-neutral-200 bg-white p-7"
    >
      <div className="mb-5">
        <label htmlFor="agentName" className="mb-1.5 block text-[13px] font-semibold">
          Agent name
        </label>
        <input id="agentName" name="agentName" required className={field} placeholder="Code Review Agent" />
      </div>

      <div className="mb-5">
        <label htmlFor="agentDescription" className="mb-1.5 block text-[13px] font-semibold">
          Agent description
        </label>
        <textarea
          id="agentDescription"
          name="agentDescription"
          required
          rows={3}
          className={field}
          placeholder="Reviews pull requests and determines whether changes are safe to merge."
        />
      </div>

      <div className="mb-5">
        <label htmlFor="expertRole" className="mb-1.5 block text-[13px] font-semibold">
          Expert role
        </label>
        <input id="expertRole" name="expertRole" required className={field} placeholder="Senior Staff Engineer" />
        <p className="mt-1 text-xs text-neutral-400">
          The person being interviewed — the one who knows what correct behavior means.
        </p>
      </div>

      <div>
        <label htmlFor="knowledgeSourceUrl" className="mb-1.5 block text-[13px] font-semibold">
          Knowledge source
        </label>
        <input
          id="knowledgeSourceUrl"
          name="knowledgeSourceUrl"
          type="url"
          required
          className={field}
          placeholder="https://handbook.example.com"
        />
        <p className="mt-1 text-xs text-neutral-400">
          A documentation site or handbook URL. Crawled via Context.dev before the interview starts.
        </p>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="mt-7 w-full rounded-lg bg-neutral-900 py-3 text-[15px] font-medium text-white hover:bg-black disabled:opacity-50"
      >
        {loading ? "Crawling knowledge source…" : "Start Interview"}
      </button>
    </form>
  );
}
