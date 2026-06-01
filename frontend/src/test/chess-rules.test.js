import { Chess } from 'chess.js';
import { describe, test, expect } from 'vitest';

describe('ChessPlay chess rules', () => {
  test('allows legal opening move', () => {
    const game = new Chess();
    const move = game.move('e4');
    expect(move.san).toBe('e4');
  });

  test('blocks illegal move', () => {
    const game = new Chess();
    expect(() => game.move('e5')).toThrow();
  });

  test('detects checkmate', () => {
    const game = new Chess();
    game.move('f3');
    game.move('e5');
    game.move('g4');
    game.move('Qh4#');

    expect(game.isCheckmate()).toBe(true);
  });

  test('supports castling when legal', () => {
    const game = new Chess();
    game.move('e4');
    game.move('e5');
    game.move('Nf3');
    game.move('Nc6');
    game.move('Bc4');
    game.move('Bc5');

    const move = game.move('O-O');
    expect(move.san).toBe('O-O');
  });

  test('supports promotion', () => {
    const game = new Chess('8/P7/8/8/8/8/8/k6K w - - 0 1');
    const move = game.move({ from: 'a7', to: 'a8', promotion: 'q' });

    expect(move.promotion).toBe('q');
  });
});