import React, { useEffect } from 'react';

// Modal - Backdrop blur, dark modal bg, close X button
export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  className = '',
  ...props
}) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto ${className}`}
        {...props}
      >
        {/* Header */}
        {(title || onClose) && (
          <div className="flex items-center justify-between p-6 border-b border-[#2a2a2a]">
            {title && (
              <h2 className="text-xl font-bold text-[#e0e0e0] font-['Montserrat']">
                {title}
              </h2>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="text-[#7a7a7a] hover:text-[#e0e0e0] transition-colors text-xl"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

// Game Over Modal
export const GameOverModal = ({
  isOpen,
  onClose,
  result,
  opponent,
  newRating,
  ratingChange,
  onNewGame,
  onRematch,
  ...props
}) => {
  const getResultMessage = () => {
    switch (result) {
      case 'win': return 'Victory!';
      case 'loss': return 'Defeat';
      case 'draw': return 'Draw';
      default: return 'Game Over';
    }
  };

  const getResultColor = () => {
    switch (result) {
      case 'win': return 'text-green-500';
      case 'loss': return 'text-red-500';
      case 'draw': return 'text-yellow-500';
      default: return 'text-[#e0e0e0]';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={getResultMessage()} {...props}>
      <div className="text-center space-y-4">
        <div className={`text-4xl ${getResultColor()}`}>
          {result === 'win' ? '🏆' : result === 'loss' ? '😔' : '🤝'}
        </div>

        <div>
          <p className="text-[#e0e0e0] font-['Inter']">
            You {result === 'win' ? 'defeated' : result === 'loss' ? 'lost to' : 'drew with'} {opponent}
          </p>
          {newRating && (
            <p className="text-sm text-[#7a7a7a] font-['Inter'] mt-2">
              New rating: {newRating}
              {ratingChange && (
                <span className={`ml-2 ${ratingChange > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  ({ratingChange > 0 ? '+' : ''}{ratingChange})
                </span>
              )}
            </p>
          )}
        </div>

        <div className="flex space-x-3 justify-center">
          <button
            onClick={onNewGame}
            className="bg-[#81b64c] text-[#0e0e0e] hover:bg-[#6fa442] rounded-lg px-4 py-2 font-semibold transition-all"
          >
            New Game
          </button>
          {onRematch && (
            <button
              onClick={onRematch}
              className="border border-[#81b64c] text-[#81b64c] hover:bg-[#81b64c] hover:text-[#0e0e0e] rounded-lg px-4 py-2 font-semibold transition-all"
            >
              Rematch
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};

// Draw Offer Modal
export const DrawOfferModal = ({
  isOpen,
  onClose,
  opponent,
  onAccept,
  onDecline,
  ...props
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Draw Offer" {...props}>
      <div className="text-center space-y-4">
        <div className="text-4xl">🤝</div>
        <p className="text-[#e0e0e0] font-['Inter']">
          {opponent} offers a draw. Do you accept?
        </p>

        <div className="flex space-x-3 justify-center">
          <button
            onClick={onAccept}
            className="bg-[#81b64c] text-[#0e0e0e] hover:bg-[#6fa442] rounded-lg px-4 py-2 font-semibold transition-all"
          >
            Accept Draw
          </button>
          <button
            onClick={onDecline}
            className="border border-red-500 text-red-500 hover:bg-red-500 hover:text-white rounded-lg px-4 py-2 font-semibold transition-all"
          >
            Decline
          </button>
        </div>
      </div>
    </Modal>
  );
};