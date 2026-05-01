import { useState, useEffect, useCallback, useRef } from "react";
import { io } from "socket.io-client";
import { useSoundEffects } from "./useSoundEffects";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

export function useMultiplayerChess(serverUrl = null, soundEnabled = true) {
  const socketRef = useRef(null);
  const sound = useSoundEffects({ enabled: soundEnabled });
  const soundRef = useRef(sound);
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [playerColor, setPlayerColor] = useState(null);
  const [opponentName, setOpponentName] = useState(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [error, setError] = useState(null);
  const playerColorRef = useRef(null);

  // Keep sound ref up-to-date without triggering socket reconnects
  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);

  const updatePlayerColor = (color) => {
    playerColorRef.current = color;
    setPlayerColor(color);
  };

  // Connect to server
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Authentication required");
      return;
    }

    const targetUrl =
      serverUrl || BACKEND_URL || `http://${window.location.hostname}:3001`;
    const newSocket = io(targetUrl, {
      transports: ["polling", "websocket"],
      reconnectionAttempts: 5,
      timeout: 5000,
      auth: {
        token: token,
      },
    });
    socketRef.current = newSocket;

    newSocket.on("connect", () => {
      setIsConnected(true);
      setError(null);
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
    });

    newSocket.on("connect_error", (err) => {
      setError(err.message || "Unable to connect to server");
      console.error("Socket.IO connect_error:", err);
    });

    // Room events
    newSocket.on("roomCreated", (data) => {
      setRoomId(data.roomId);
      setGameState(data.gameState);
      setChatMessages(data.chatHistory || []);
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
      setChatMessages(data.chatHistory || []);

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

    newSocket.on("chatMessage", (message) => {
      setChatMessages((msgs) => [...msgs, message]);
    });

    newSocket.on("moveMade", (data) => {
      setGameState(data.gameState);
      setIsMyTurn(data.gameState.turn === playerColorRef.current);

      const lastMove =
        data.gameState.moveHistory &&
        data.gameState.moveHistory[data.gameState.moveHistory.length - 1];

      if (lastMove?.captured) {
        soundRef.current.capture();
      } else {
        soundRef.current.move();
      }

      if (data.gameState.status === "check") {
        soundRef.current.check();
      }
      if (data.gameState.status === "checkmate") {
        soundRef.current.gameEnd(
          data.gameState.turn !== playerColorRef.current,
        );
      }
      if (data.gameState.status === "stalemate") {
        soundRef.current.stalemate();
      }
    });

    newSocket.on("playerLeft", (data) => {
      setOpponentName(null);
      setError(`${data.name} left the game`);
    });

    newSocket.on("serverError", (data) => {
      setError(data.message);
    });

    newSocket.on("chatHistory", (history) => {
      setChatMessages(history || []);
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

  const sendMessage = useCallback(
    (text) => {
      if (socketRef.current && isConnected && text?.trim()) {
        socketRef.current.emit("sendMessage", { text: text.trim() });
      }
    },
    [isConnected],
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
    chatMessages,
    sendMessage,
  };
}
