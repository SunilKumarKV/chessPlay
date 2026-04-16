import { useState, useEffect, useRef } from "react";

export default function ChatBox({ messages, onSend, currentUser }) {
  const [text, setText] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
  };

  return (
    <div className="rounded-3xl bg-white/5 border border-white/10 p-4 flex flex-col h-full">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold uppercase tracking-widest text-white/80">
          Room Chat
        </div>
      </div>

      <div className="mb-3 overflow-y-auto" style={{ maxHeight: 280 }}>
        {messages.length === 0 ? (
          <div className="text-xs opacity-50">No messages yet.</div>
        ) : (
          messages.map((message, index) => {
            const isSelf = currentUser && message.username === currentUser;
            return (
              <div
                key={`${message.timestamp}-${index}`}
                className={`mb-2 rounded-2xl px-3 py-2 ${
                  isSelf
                    ? "bg-yellow-400/20 text-white"
                    : "bg-white/5 text-white/80"
                }`}
              >
                <div className="text-xs opacity-70">{message.username}</div>
                <div className="mt-1 text-sm break-words">{message.text}</div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form className="flex gap-2 mt-auto" onSubmit={handleSubmit}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-full px-4 py-2 bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-full bg-yellow-400 px-4 py-2 text-black font-semibold"
        >
          Send
        </button>
      </form>
    </div>
  );
}
