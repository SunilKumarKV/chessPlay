import { useState } from "react";
import { Modal } from "../components/ui";
import Auth from "../features/auth/components/Auth";

const BOARD = [
  ["r", "n", "b", "q", "k", "b", "n", "r"],
  ["p", "p", "p", "", "", "p", "p", "p"],
  ["", "", "", "", "p", "", "", ""],
  ["", "", "", "p", "P", "", "", ""],
  ["", "", "", "", "", "N", "", ""],
  ["", "", "N", "", "", "", "", ""],
  ["P", "P", "P", "P", "", "P", "P", "P"],
  ["R", "", "B", "Q", "K", "B", "", "R"],
];

const PIECES = {
  r: "♜",
  n: "♞",
  b: "♝",
  q: "♛",
  k: "♚",
  p: "♟",
  R: "♖",
  N: "♘",
  B: "♗",
  Q: "♕",
  K: "♔",
  P: "♙",
};

const FEATURE_ROWS = [
  ["Stockfish", "Local engine, fast best-move analysis, PGN export"],
  ["Live rooms", "Socket matchmaking, spectators, room links, chat"],
  ["Trust layer", "HttpOnly cookies, rate limits, privacy controls"],
];

export default function LandingPage({ onLogin, onGuestPlay }) {
  const [showAuth, setShowAuth] = useState(false);
  const [isLogin, setIsLogin] = useState(true);

  const openSignup = () => {
    setIsLogin(false);
    setShowAuth(true);
  };

  const openLogin = () => {
    setIsLogin(true);
    setShowAuth(true);
  };

  const handleAuthSuccess = (userData) => {
    setShowAuth(false);
    onLogin(userData);
  };

  return (
    <div className="min-h-screen bg-[#07100d] text-white">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
        <button
          type="button"
          onClick={onGuestPlay}
          className="flex items-center gap-3"
          aria-label="ChessPlay home"
        >
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#81b64c] text-xl font-black text-[#07100d]">
            ♘
          </span>
          <span className="font-['Montserrat'] text-xl font-black">
            ChessPlay
          </span>
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openLogin}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm font-bold text-slate-200 transition hover:bg-white/10"
          >
            Log in
          </button>
          <button
            type="button"
            onClick={openSignup}
            className="rounded-lg bg-[#81b64c] px-4 py-2 text-sm font-black text-[#07100d] transition hover:bg-[#93c85f]"
          >
            Create account
          </button>
        </div>
      </header>

      <main className="mx-auto grid min-h-[calc(100vh-74px)] max-w-7xl items-center gap-8 px-4 pb-10 pt-4 md:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,520px)]">
        <section className="max-w-3xl">
          <div className="mb-5 inline-flex rounded-full border border-[#81b64c]/25 bg-[#81b64c]/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-[#a8e36f]">
            v1.2.0 launch ready
          </div>
          <h1 className="font-['Montserrat'] text-5xl font-black leading-[1.02] tracking-normal text-white md:text-7xl">
            ChessPlay
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300 md:text-xl">
            A polished chess room for fast AI games, live multiplayer, post-game
            analysis, and player progress without making the first move feel
            heavy.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onGuestPlay}
              className="rounded-xl bg-[#81b64c] px-6 py-4 text-base font-black text-[#07100d] shadow-xl shadow-[#81b64c]/20 transition hover:-translate-y-0.5 hover:bg-[#93c85f]"
            >
              Play as guest
            </button>
            <button
              type="button"
              onClick={openSignup}
              className="rounded-xl border border-white/15 bg-white/10 px-6 py-4 text-base font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15"
            >
              Create account
            </button>
          </div>

          <div className="mt-10 grid gap-3 md:grid-cols-3">
            {FEATURE_ROWS.map(([title, copy]) => (
              <div key={title} className="border-l border-white/15 pl-4">
                <div className="font-['Montserrat'] text-lg font-black">
                  {title}
                </div>
                <div className="mt-2 text-sm leading-6 text-slate-400">
                  {copy}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="relative">
          <div className="absolute -inset-4 rounded-[2rem] bg-[#81b64c]/10 blur-2xl" />
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111917] shadow-2xl shadow-black/40">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <div className="text-sm font-black text-white">Live board</div>
                <div className="text-xs text-slate-400">Blitz 3+0</div>
              </div>
              <div className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-black text-emerald-300">
                Online
              </div>
            </div>
            <div className="grid grid-cols-8 p-4">
              {BOARD.flatMap((row, rowIndex) =>
                row.map((piece, colIndex) => {
                  const light = (rowIndex + colIndex) % 2 === 0;
                  return (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      className={`grid aspect-square place-items-center text-2xl md:text-4xl ${
                        light ? "bg-[#e7d8bd]" : "bg-[#527a45]"
                      }`}
                    >
                      <span
                        className={
                          piece === piece.toUpperCase()
                            ? "text-[#f7f0df]"
                            : "text-[#172019]"
                        }
                      >
                        {PIECES[piece] || ""}
                      </span>
                    </div>
                  );
                }),
              )}
            </div>
            <div className="grid grid-cols-3 gap-3 border-t border-white/10 p-4 text-center">
              {[
                ["1200", "Guest ELO"],
                ["<2s", "AI ready"],
                ["Live", "Rooms"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-lg bg-black/20 px-3 py-3">
                  <div className="font-['Montserrat'] text-xl font-black">
                    {value}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Modal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        title={isLogin ? "Log In" : "Sign Up"}
        className="max-w-md"
      >
        <Auth
          onLogin={handleAuthSuccess}
          isModal={true}
          initialIsLogin={isLogin}
          onToggleMode={() => setIsLogin(!isLogin)}
        />
      </Modal>
    </div>
  );
}
