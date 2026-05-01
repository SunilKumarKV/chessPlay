import React, { useState } from "react";

export default function RightPanel({
  moves = [],
  showChat = false,
  onResign,
  onDraw,
  chatComponent,
}) {
  const [activeTab, setActiveTab] = useState("moves");

  return (
    <div className="flex flex-col h-full bg-[#262421] w-full">
      {/* Tab Navigation */}
      <div className="flex bg-[#211f1c] flex-shrink-0">
        <button
          onClick={() => setActiveTab("moves")}
          className={`flex-1 py-3.5 text-sm font-bold transition-colors uppercase tracking-wider ${
            activeTab === "moves"
              ? "bg-[#262421] text-white border-t-2 border-[#81b64c]"
              : "text-gray-500 hover:text-gray-300 border-t-2 border-transparent"
          }`}
        >
          Moves
        </button>
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex-1 py-3.5 text-sm font-bold transition-colors uppercase tracking-wider ${
            activeTab === "chat"
              ? "bg-[#262421] text-white border-t-2 border-[#81b64c]"
              : "text-gray-500 hover:text-gray-300 border-t-2 border-transparent"
          }`}
        >
          Chat
        </button>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-[#262421]">
        {activeTab === "moves" && (
          <div className="space-y-1 font-['JetBrains_Mono',monospace] text-sm">
            {moves.length === 0 ? (
              <div className="text-[#7a7a7a] text-center py-8 italic font-['Inter']">
                Game has not started yet.
              </div>
            ) : (
              moves.map((move, i) => (
                <div
                  key={i}
                  className={`flex items-center space-x-3 p-2 rounded transition-colors ${
                    move.isLatest
                      ? "bg-[#81b64c]/10 border border-[#81b64c]/30"
                      : "hover:bg-[#3a3835]"
                  }`}
                >
                  <span className="text-[#7a7a7a] w-8 font-bold">
                    {move.number}.
                  </span>
                  <span
                    className={`flex-1 ${!move.white ? "text-[#7a7a7a]" : "text-[#e0e0e0]"}`}
                  >
                    {move.white}
                  </span>
                  <span
                    className={`flex-1 ${!move.black ? "text-[#7a7a7a]" : "text-[#e0e0e0]"}`}
                  >
                    {move.black}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "chat" && (
          <div className="h-full flex flex-col">
            {showChat ? (
              chatComponent
            ) : (
              <div className="text-[#7a7a7a] text-center py-8 italic font-['Inter']">
                Chat is available during multiplayer matches.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Action Footer */}
      <div className="p-4 bg-[#211f1c] border-t border-white/5 flex gap-3 flex-shrink-0">
        <button
          onClick={onResign}
          className="flex-1 py-3 bg-[#3a3835] hover:bg-[#4a4845] text-white font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 text-sm border border-white/5"
        >
          <span className="text-lg">🏳️</span> Resign
        </button>
        <button
          onClick={onDraw}
          className="flex-1 py-3 bg-[#3a3835] hover:bg-[#4a4845] text-white font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 text-sm border border-white/5"
        >
          <span className="text-lg">½</span> Draw
        </button>
      </div>
    </div>
  );
}
