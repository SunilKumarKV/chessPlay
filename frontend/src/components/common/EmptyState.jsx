export default function EmptyState({ title = "Nothing here yet", message = "This area will appear when data is available.", actionLabel = "", onAction }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.04] p-6 text-center text-slate-300">
      <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-white/10 text-lg font-black text-[#81b64c]" aria-hidden="true">◇</div>
      <h3 className="font-['Montserrat'] text-base font-black text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-400">{message}</p>
      {actionLabel && onAction ? (
        <button type="button" onClick={onAction} className="mt-4 rounded-xl bg-[#81b64c] px-4 py-2 text-sm font-black text-[#07100a] transition hover:bg-[#93c85f]">
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
