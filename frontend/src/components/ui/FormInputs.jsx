import React, { useState } from 'react';

// Form Input - Dark background, green focus border
export const FormInput = ({
  label,
  error,
  type = 'text',
  className = '',
  ...props
}) => {
  const inputId = props.id || props.name;

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-[#e0e0e0] font-['Inter']">
          {label}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        className={`w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-[#e0e0e0] placeholder-[#7a7a7a] focus:outline-none focus:border-[#81b64c] transition-colors font-['Inter'] ${className}`}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-500 font-['Inter']">{error}</p>
      )}
    </div>
  );
};

// Password Input with show/hide toggle
export const PasswordInput = ({
  label,
  error,
  className = '',
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = props.id || props.name;

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-[#e0e0e0] font-['Inter']">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          type={showPassword ? 'text' : 'password'}
          className={`w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 pr-10 text-[#e0e0e0] placeholder-[#7a7a7a] focus:outline-none focus:border-[#81b64c] transition-colors font-['Inter'] ${className}`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          className="absolute right-3 top-2.5 text-[#7a7a7a] hover:text-[#e0e0e0] transition-colors"
        >
          {showPassword ? '🙈' : '👁️'}
        </button>
      </div>
      {error && (
        <p className="text-sm text-red-500 font-['Inter']">{error}</p>
      )}
    </div>
  );
};

// Textarea Input
export const FormTextarea = ({
  label,
  error,
  className = '',
  ...props
}) => {
  const inputId = props.id || props.name;

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-[#e0e0e0] font-['Inter']">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={`w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-[#e0e0e0] placeholder-[#7a7a7a] focus:outline-none focus:border-[#81b64c] transition-colors font-['Inter'] resize-none ${className}`}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-500 font-['Inter']">{error}</p>
      )}
    </div>
  );
};
