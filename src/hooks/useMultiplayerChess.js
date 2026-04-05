import { useState, useEffect, useCallback, useRef } from "react";
import { io } from "socket.io-client";

const BACKEND_URL = "http://localhost:3001";

export function useMultiplayerChess() {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [playerColor, setPlayerColor] = useState(null);
  const [opponentName, setOpponentName] = useState(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [error, setError] = useState(null);

  // Connect to server
  useEffect(() => {
    const newSocket = io(BACKEND_URL);
    setSocket(newSocket);

    newSocket.on("connect", () => {
      setIsConnected(true);
      setError(null);
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
    });

    newSocket.on("error", (data) => {
      setError(data.message);
    });

    // Room events
    newSocket.on("roomCreated", (data) => {
      setRoomId(data.roomId);
      setGameState(data.gameState);
      setPlayerColor("w");
      setIsMyTurn(true);
      setError(null);
    });

    newSocket.on("playerJoined", (data) => {
      setGameState(data.gameState);
      if (data.newPlayer.color !== playerColor) {
        setOpponentName(data.newPlayer.name);
      }
      setError(null);
    });

    newSocket.on("moveMade", (data) => {
      setGameState(data.gameState);
      setIsMyTurn(data.gameState.turn === playerColor);
    });

    newSocket.on("playerLeft", (data) => {
      setOpponentName(null);
      setError(`${data.name} left the game`);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  // Create a new room
  const createRoom = useCallback(
    (playerName) => {
      if (socket && isConnected) {
        socket.emit("createRoom", { playerName });
      }
    },
    [socket, isConnected],
  );

  // Join an existing room
  const joinRoom = useCallback(
    (roomId, playerName) => {
      if (socket && isConnected) {
        socket.emit("joinRoom", { roomId, playerName });
      }
    },
    [socket, isConnected],
  );

  // Make a move
  const makeMove = useCallback(
    (fromRow, fromCol, toRow, toCol) => {
      if (socket && isConnected && isMyTurn) {
        socket.emit("makeMove", { fromRow, fromCol, toRow, toCol });
      }
    },
    [socket, isConnected, isMyTurn],
  );

  // Get rooms list (for debugging)
  const getRooms = useCallback(() => {
    if (socket && isConnected) {
      socket.emit("getRooms");
    }
  }, [socket, isConnected]);

  // Leave current room
  const leaveRoom = useCallback(() => {
    if (socket) {
      socket.disconnect();
      setGameState(null);
      setRoomId(null);
      setPlayerColor(null);
      setOpponentName(null);
      setIsMyTurn(false);
      setError(null);
    }
  }, [socket]);

  return {
    // Connection state
    isConnected,
    error,

    // Game state
    gameState,
    roomId,
    playerColor,
    opponentName,
    isMyTurn,

    // Actions
    createRoom,
    joinRoom,
    makeMove,
    getRooms,
    leaveRoom,
  };
}
