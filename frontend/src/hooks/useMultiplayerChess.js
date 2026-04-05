import { useState, useEffect, useCallback, useRef } from "react";
import { io } from "socket.io-client";

const BACKEND_URL = "http://localhost:3001";

export function useMultiplayerChess() {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [playerColor, setPlayerColor] = useState(null);
  const [opponentName, setOpponentName] = useState(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [error, setError] = useState(null);
  const playerColorRef = useRef(null);

  const updatePlayerColor = (color) => {
    playerColorRef.current = color;
    setPlayerColor(color);
  };

  // Connect to server
  useEffect(() => {
    const newSocket = io(BACKEND_URL);
    socketRef.current = newSocket;

    newSocket.on("connect", () => {
      setIsConnected(true);
      setError(null);
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
    });

    newSocket.on("connect_error", (err) => {
      setError(err.message);
    });

    // Room events
    newSocket.on("roomCreated", (data) => {
      setRoomId(data.roomId);
      setGameState(data.gameState);
      updatePlayerColor("w");
      setIsMyTurn(data.gameState.turn === "w");
      setOpponentName(null);
      setError(null);
    });

    newSocket.on("joinedRoom", (data) => {
      setRoomId(data.roomId);
      setGameState(data.gameState);
      updatePlayerColor(data.color);
      setIsMyTurn(data.gameState.turn === data.color);

      const opponentPlayer =
        data.color === "w"
          ? data.gameState.players.b
          : data.gameState.players.w;
      setOpponentName(opponentPlayer?.id ? opponentPlayer.name : null);
      setError(null);
    });

    newSocket.on("playerJoined", (data) => {
      setGameState(data.gameState);
      if (
        playerColorRef.current &&
        data.newPlayer.color !== playerColorRef.current
      ) {
        setOpponentName(data.newPlayer.name);
      }
      setError(null);
    });

    newSocket.on("moveMade", (data) => {
      setGameState(data.gameState);
      setIsMyTurn(data.gameState.turn === playerColorRef.current);
    });

    newSocket.on("playerLeft", (data) => {
      setOpponentName(null);
      setError(`${data.name} left the game`);
    });

    newSocket.on("serverError", (data) => {
      setError(data.message);
    });

    return () => {
      newSocket.close();
      socketRef.current = null;
    };
  }, []);

  // Create a new room
  const createRoom = useCallback(
    (playerName) => {
      if (socketRef.current && isConnected) {
        socketRef.current.emit("createRoom", { playerName });
      }
    },
    [isConnected],
  );

  // Join an existing room
  const joinRoom = useCallback(
    (roomId, playerName) => {
      if (socketRef.current && isConnected) {
        socketRef.current.emit("joinRoom", { roomId, playerName });
      }
    },
    [isConnected],
  );

  // Make a move
  const makeMove = useCallback(
    (fromRow, fromCol, toRow, toCol) => {
      if (socketRef.current && isConnected && isMyTurn) {
        socketRef.current.emit("makeMove", { fromRow, fromCol, toRow, toCol });
      }
    },
    [isConnected, isMyTurn],
  );

  // Get rooms list (for debugging)
  const getRooms = useCallback(() => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("getRooms");
    }
  }, [isConnected]);

  // Leave current room without tearing down socket connection
  const leaveRoom = useCallback(() => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("leaveRoom");
    }

    setGameState(null);
    setRoomId(null);
    setPlayerColor(null);
    playerColorRef.current = null;
    setOpponentName(null);
    setIsMyTurn(false);
    setError(null);
  }, [isConnected]);

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
