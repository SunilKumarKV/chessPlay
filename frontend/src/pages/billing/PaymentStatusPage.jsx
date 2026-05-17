export default function PaymentStatusPage({ status = "success", onNavigate }) {
  const success = status === "success";
  return (
    <main className="grid min-h-screen place-items-center bg-[#07100d] p-4 text-white">
      <section className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 text-center shadow-2xl shadow-black/30 md:p-8">
        <div className={`mx-auto grid h-14 w-14 place-items-center rounded-2xl ${success ? "bg-[#81b64c]/20 text-[#b8f28f]" : "bg-red-400/15 text-red-100"}`} aria-hidden="true">
          {success ? "✓" : "!"}
        </div>
        <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-slate-400">Payment status</p>
        <h1 className="mt-2 font-['Montserrat'] text-3xl font-black">{success ? "Payment received" : "Payment failed or cancelled"}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          {success
            ? "If the payment was verified by the backend, your plan will activate automatically. Manual requests still require admin approval."
            : "No plan was activated from this screen. You can retry checkout or contact support with your payment reference."}
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => onNavigate?.("dashboard")} className="rounded-xl bg-[#81b64c] px-4 py-3 text-sm font-black text-[#07100a]">
            Go to dashboard
          </button>
          <button type="button" onClick={() => onNavigate?.(success ? "billing" : "pricing")} className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white">
            {success ? "View billing" : "Retry payment"}
          </button>
        </div>
        {!success ? (
          <button type="button" onClick={() => onNavigate?.("contact")} className="mt-3 text-sm font-bold text-amber-200 hover:text-amber-100">
            Contact support
          </button>
        ) : null}
      </section>
    </main>
  );
}
