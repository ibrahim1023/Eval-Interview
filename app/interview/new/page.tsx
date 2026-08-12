import { NewInterviewForm } from "./new-interview-form";

export default function NewInterviewPage() {
  return (
    <div className="min-h-screen bg-[#fdfcf9]">
      <nav className="mx-auto max-w-5xl px-6 py-5">
        <span className="text-[15px] font-semibold tracking-tight">EvalInterview</span>
      </nav>

      <main className="mx-auto mt-12 max-w-xl px-6">
        <h1 className="font-serif text-3xl font-bold tracking-tight">New interview</h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
          Describe the AI agent you want to evaluate and connect a knowledge source.
          EvalInterview will interview your domain expert and check their judgment
          against it.
        </p>
        <NewInterviewForm />
      </main>
    </div>
  );
}
