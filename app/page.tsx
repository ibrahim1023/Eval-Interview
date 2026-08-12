import Link from "next/link";

export default function Landing() {
  return (
    <div className="min-h-screen bg-paper text-neutral-900">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <span className="text-[17px] font-semibold tracking-tight">EvalInterview</span>
        <Link
          href="/interview/new"
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Start Interview
        </Link>
      </nav>

      <section className="mx-auto max-w-2xl px-6 pt-24 pb-20 text-center">
        <div className="text-[11px] font-semibold tracking-[0.12em] text-neutral-400 uppercase">
          Voice interviews → behavior specs → executable evals
        </div>
        <h1 className="mt-4 font-serif text-[52px] leading-[1.08] font-bold tracking-tight">
          Turn expert judgment into executable AI evals.
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-neutral-500">
          Your best evals aren&rsquo;t in your test suite. They&rsquo;re in your domain
          experts&rsquo; heads and scattered across your docs, repositories, and policies.
          EvalInterview extracts both into one executable specification.
        </p>
        <div className="mt-9 flex justify-center gap-3">
          <Link
            href="/interview/new"
            className="rounded-lg bg-neutral-900 px-6 py-3 text-[15px] font-medium text-white hover:bg-neutral-800"
          >
            Start an interview
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-28">
        {[
          {
            n: "01",
            title: "Expert",
            body: "A domain expert describes real-world judgment in a voice interview. No eval-writing skills needed.",
          },
          {
            n: "02",
            title: "Organizational knowledge",
            body: "Context.dev retrieves your docs and policies, surfacing contradictions and missing areas mid-interview — and the behavior spec writes itself live as you talk.",
          },
          {
            n: "03",
            title: "Executable evals",
            body: "The reviewed specification compiles into scenarios, graders, and a runnable eval suite that works outside the product.",
          },
        ].map((step) => (
          <div
            key={step.n}
            className="flex gap-6 border-t border-hairline py-7 last:border-b"
          >
            <span className="pt-0.5 font-serif text-[15px] text-neutral-400">{step.n}</span>
            <div>
              <h3 className="font-serif text-xl font-bold">{step.title}</h3>
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-neutral-500">{step.body}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
