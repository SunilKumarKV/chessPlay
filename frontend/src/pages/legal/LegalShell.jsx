export default function LegalShell({ title, eyebrow, children, onBack }) {
  return (
    <div className="min-h-screen bg-[#07100d] p-4 text-white sm:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/25 md:p-8">
        <button type="button" onClick={onBack} className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/15">Back</button>
        <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-[#b8f28f]">{eyebrow}</p>
        <h1 className="mt-3 font-['Montserrat'] text-3xl font-black md:text-5xl">{title}</h1>
        <div className="prose prose-invert mt-6 max-w-none text-slate-300 prose-headings:text-white prose-a:text-[#b8f28f]">
          {children}
        </div>
      </div>
    </div>
  );
}
