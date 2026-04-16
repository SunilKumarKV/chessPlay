import React from 'react';

// Primary Button - Green background, black text, hover darken 10%
export const PrimaryBtn = ({ children, className = '', ...props }) => {
  return (
    <button
      className={`bg-[#81b64c] text-[#0e0e0e] hover:bg-[#6fa442] rounded-lg px-4 py-2 font-semibold transition-all active:scale-95 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// Secondary Button - Transparent, green border, green text, hover fill
export const SecondaryBtn = ({ children, className = '', ...props }) => {
  return (
    <button
      className={`border border-[#81b64c] text-[#81b64c] hover:bg-[#81b64c] hover:text-[#0e0e0e] rounded-lg px-4 py-2 font-semibold transition-all active:scale-95 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// Danger Button - Red border, red text, hover fill red
export const DangerBtn = ({ children, className = '', ...props }) => {
  return (
    <button
      className={`border border-red-500 text-red-500 hover:bg-red-500 hover:text-white rounded-lg px-4 py-2 font-semibold transition-all active:scale-95 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// Ghost Button - No border, muted text, hover show subtle bg
export const GhostBtn = ({ children, className = '', ...props }) => {
  return (
    <button
      className={`text-[#7a7a7a] hover:bg-[#2a2a2a] hover:text-[#e0e0e0] rounded-lg px-4 py-2 font-semibold transition-all active:scale-95 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};