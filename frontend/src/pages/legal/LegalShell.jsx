const LINKS = [
  ["Privacy", "/privacy"],
  ["Terms", "/terms"],
  ["Delete Account", "/delete-account"],
  ["Support", "/support"],
];

export default function LegalShell({ title, eyebrow, description, children, onBack }) {
  const goBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-[#07100d] text-white">
      <header className="border-b border-white/10 bg-[#07100d]/90 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <a href="/" className="flex items-center gap-3 font-['Montserrat'] text-xl font-black">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#81b64c] text-2xl text-[#07100d]">♘</span>
            ChessPlay
          </a>
          <nav className="flex flex-wrap gap-3 text-sm font-bold text-slate-300" aria-label="Legal navigation">
            {LINKS.map(([label, href]) => (
              <a key={href} href={href} className="rounded-lg px-2 py-1 hover:bg-white/10 hover:text-white">{label}</a>
            ))}
          </nav>
        </div>
      </header>
      <main className="p-4 sm:p-6 lg:p-8">
        <article className="mx-auto max-w-5xl rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/25 md:p-10">
          <button type="button" onClick={goBack} className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/15">Back</button>
          <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-[#b8f28f]">{eyebrow}</p>
        <h1 className="mt-3 font-['Montserrat'] text-3xl font-black md:text-5xl">{title}</h1>
          {description ? <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">{description}</p> : null}
          <div className="prose prose-invert mt-8 max-w-none text-slate-300 prose-headings:text-white prose-a:text-[#b8f28f] prose-li:marker:text-[#b8f28f]">
            {children}
          </div>
        </article>
      </main>
      <footer className="border-t border-white/10 px-4 py-6 text-sm text-slate-400 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} ChessPlay</span>
          <a href="mailto:support@getchessplay.com" className="font-bold text-slate-300 hover:text-white">support@getchessplay.com</a>
        </div>
      </footer>
    </div>
  );
}
