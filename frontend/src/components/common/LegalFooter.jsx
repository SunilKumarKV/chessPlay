import { BrandLogo } from "../brand/BrandLogo";

const LINKS = [
  ["Privacy", "/privacy"],
  ["Terms", "/terms"],
  ["Delete Account", "/delete-account"],
  ["Support", "/support"],
  ["Refund Policy", "/refund-policy"],
  ["Cookie Policy", "/cookie-policy"],
  ["Contact", "/contact"],
];

export default function LegalFooter({ onNavigatePath }) {
  const go = (event, path) => {
    if (!onNavigatePath) return;
    event.preventDefault();
    onNavigatePath(path);
  };

  return (
    <footer className="border-t border-white/10 bg-black/20 px-4 py-6 text-sm text-slate-400">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <BrandLogo className="h-9 w-32 text-slate-100" />
        <nav className="flex flex-wrap gap-3" aria-label="Legal links">
          {LINKS.map(([label, path]) => (
            <a key={path} href={path} onClick={(event) => go(event, path)} className="font-bold text-slate-300 hover:text-white">
              {label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
