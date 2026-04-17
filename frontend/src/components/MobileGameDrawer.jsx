import React, { useState, useRef, useEffect } from 'react';

export const MobileGameDrawer = ({ isOpen, onClose, title, children }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const drawerRef = useRef(null);

  const handleTouchStart = (e) => {
    setIsDragging(true);
    setDragStart(e.touches[0].clientY);
  };

  const handleTouchMove = (e) => {
    if (!isDragging || !drawerRef.current) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - dragStart;

    // Only swipe down to close
    if (diff > 0) {
      const translateY = Math.min(diff, 300);
      drawerRef.current.style.transform = `translateY(${translateY}px)`;
    }
  };

  const handleTouchEnd = (e) => {
    setIsDragging(false);
    const currentY = e.changedTouches[0].clientY;
    const diff = currentY - dragStart;

    if (diff > 100 && drawerRef.current) {
      // Close drawer if dragged down more than 100px
      onClose();
      drawerRef.current.style.transform = 'translateY(0)';
    } else if (drawerRef.current) {
      // Snap back
      drawerRef.current.style.transform = 'translateY(0)';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="absolute bottom-0 left-0 right-0 bg-[#1a1a1a] rounded-t-xl border-t border-[#2a2a2a] max-h-[80vh] flex flex-col transition-transform"
        style={{ touchAction: 'pan-y' }}
      >
        {/* Drag handle */}
        <div className="w-12 h-1 bg-[#2a2a2a] rounded-full mx-auto my-3 cursor-grab active:cursor-grabbing" />

        {/* Header */}
        <div className="px-4 py-3 border-b border-[#2a2a2a] flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#e0e0e0] font-['Montserrat']">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-[#7a7a7a] hover:text-[#e0e0e0] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export const ClockBar = ({ whiteTime, blackTime, whiteName, blackName, isWhiteTurn }) => {
  return (
    <div className="grid grid-cols-[1fr,1fr] gap-2 px-4 py-2 bg-[#0e0e0e] border-b border-[#2a2a2a]">
      {/* Black clock (top on mobile) */}
      <div className={`bg-[#1a1a1a] rounded-lg p-2 text-center transition-colors ${
        !isWhiteTurn ? 'border border-[#81b64c]' : 'border border-[#2a2a2a]'
      }`}>
        <div className="text-xs text-[#7a7a7a] font-['Inter'] truncate">{blackName}</div>
        <div className={`text-lg font-bold font-['JetBrains Mono'] ${
          !isWhiteTurn ? 'text-[#81b64c]' : 'text-[#e0e0e0]'
        }`}>
          {blackTime}
        </div>
      </div>

      {/* White clock */}
      <div className={`bg-[#1a1a1a] rounded-lg p-2 text-center transition-colors ${
        isWhiteTurn ? 'border border-[#81b64c]' : 'border border-[#2a2a2a]'
      }`}>
        <div className="text-xs text-[#7a7a7a] font-['Inter'] truncate">{whiteName}</div>
        <div className={`text-lg font-bold font-['JetBrains Mono'] ${
          isWhiteTurn ? 'text-[#81b64c]' : 'text-[#e0e0e0]'
        }`}>
          {whiteTime}
        </div>
      </div>
    </div>
  );
};