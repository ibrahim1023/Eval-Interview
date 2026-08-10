import Link from "next/link";

export default function Landing() {
  return (
    <div>
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <span className="text-[17px] font-semibold tracking-tight">EvalInterview</span>
        <Link
          href="/interview/new"
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          Start Interview
        </Link>
      </nav>

      <section className="mx-auto max-w-2xl px-6 pt-24 pb-16 text-center">
        <h1 className="text-5xl font-semibold leading-[1.08] tracking-tight">
          Turn expert judgment into executable AI evals.
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-neutral-600">
          Your best evals aren&rsquo;t in your test suite. They&rsquo;re in your domain
          experts&rsquo; heads and scattered across your docs, repositories, and policies.
          EvalInterview extracts both into one executable specification.
        </p>
        <div className="mt-9 flex justify-center gap-3">
          <Link
            href="/interview/new"
            className="rounded-lg bg-neutral-900 px-6 py-3 text-[15px] font-medium text-white"
          >
            Start an interview
          </Link>
        </div>
      </section>

      <section className="mx-auto flex max-w-4xl items-stretch gap-4 px-6 pb-24">
        {[
          {
            title: "Expert",
            body: "A domain expert describes real-world judgment in a voice interview. No eval-writing skills needed.",
          },
          {
            title: "Organizational knowledge",
            body: "Context.dev retrieves your docs and policies, surfacing contradictions and missing areas mid-interview.",
          },
          {
            title: "Executable evals",
            body: "A reviewed behavior specification compiles into scenarios, graders, and a runnable eval suite.",
          },
        ].map((card, i) => (
          <div key={card.title} className="flex flex-1 items-center gap-4">
            <div className="flex-1 rounded-2xl border border-neutral-200 bg-neutral-50 p-7 text-center">
              <h3 className="mb-2 text-[15px] font-semibold">{card.title}</h3>
              <p className="text-[13px] leading-relaxed text-neutral-500">{card.body}</p>
            </div>
            {i < 2 && <span className="text-xl text-neutral-400">&rarr;</span>}
          </div>
        ))}
      </section>
    </div>
  );
}
