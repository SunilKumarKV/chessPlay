import WaitlistForm from "../../components/waitlist/WaitlistForm";

export default function CoachingPage({ onBack }) {
  return (
    <div className="min-h-screen bg-[#07100d] p-4 text-white sm:p-6 lg:p-8">
      <main className="mx-auto max-w-6xl">
        <button type="button" onClick={onBack} className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/15">Back</button>
        <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 md:p-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#b8f28f]">Premium roadmap</p>
          <h1 className="mt-3 font-['Montserrat'] text-4xl font-black">AI Coach and Coaching Marketplace</h1>
          <p className="mt-4 max-w-3xl text-slate-300">A safe placeholder for future coaching features. No real coach payments are enabled yet.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {["AI Coach review", "Coach profile cards", "Training plans"].map((item) => <div key={item} className="rounded-2xl border border-white/10 bg-black/20 p-4 font-bold">{item}</div>)}
          </div>
          <WaitlistForm source="coaching" interest="coaching" />
        </section>
      </main>
    </div>
  );
}
