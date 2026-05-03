import { useState, useEffect, useRef } from "react";

const MAX_MESSAGE_LENGTH = 200;

export default function ChatBox({ messages, onSend, currentUser }) {
  const [text, setText] = useState("");
  const bottomRef = useRef(null);
  const trimmedText = text.trim();
  const isTooLong = text.length > MAX_MESSAGE_LENGTH;
  const canSend = Boolean(trimmedText) && !isTooLong;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!canSend) return;
    onSend(trimmedText);
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

      <form className="flex flex-col gap-1 mt-auto" onSubmit={handleSubmit}>
        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            className={`flex-1 rounded-full px-4 py-2 bg-white/10 border text-white placeholder-white/50 focus:outline-none ${
              isTooLong ? "border-red-400" : "border-white/20"
            }`}
          />
          <button
            type="submit"
            disabled={!canSend}
            className="rounded-full bg-yellow-400 px-4 py-2 text-black font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
        <div
          className={`text-xs text-right ${isTooLong ? "text-red-400" : "text-white/60"}`}
        >
          {text.length}/{MAX_MESSAGE_LENGTH}
        </div>
      </form>
    </div>
  );
}
