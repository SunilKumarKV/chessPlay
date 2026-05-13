import { useState, useEffect, useCallback, useRef } from "react";
import { io } from "socket.io-client";
import { BACKEND_URL, SOCKET_URL } from "../../../config/runtime";
import { useSoundEffects } from "./useSoundEffects";

const STORED_ROOM_ID_KEY = "chessPlay.roomId";
const STORED_PLAYER_COLOR_KEY = "chessPlay.playerColor";
const DRAW_STATUSES = new Set([
  "draw",
  "draw-50move",
  "draw-repetition",
  "stalemate",
]);

function rememberRoom(nextRoomId, nextPlayerColor) {
  sessionStorage.setItem(STORED_ROOM_ID_KEY, nextRoomId);
  sessionStorage.setItem(STORED_PLAYER_COLOR_KEY, nextPlayerColor);
}

function forgetRoom() {
  sessionStorage.removeItem(STORED_ROOM_ID_KEY);
  sessionStorage.removeItem(STORED_PLAYER_COLOR_KEY);
}

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
  const [drawOffered, setDrawOffered] = useState(false);
  const [drawOfferedBy, setDrawOfferedBy] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [queueSize, setQueueSize] = useState(0);
  const [rooms, setRooms] = useState([]);
  const [isSpectating, setIsSpectating] = useState(false);
  const [spectatorCount, setSpectatorCount] = useState(0);
  const playerColorRef = useRef(null);
  const roomIdRef = useRef(null);

  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);

  const updatePlayerColor = (color) => {
    playerColorRef.current = color;
    setPlayerColor(color);
  };

  const updateRoomId = (nextRoomId) => {
    roomIdRef.current = nextRoomId;
    setRoomId(nextRoomId);
  };

  useEffect(() => {
    let isMounted = true;
    let newSocket = null;

    async function fetchSocketToken() {
      const storedToken = sessionStorage.getItem("chessplay_socket_token");
      if (storedToken) return storedToken;

      try {
        const response = await fetch(`${BACKEND_URL}/api/auth/socket-token`, {
          credentials: "include",
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok && data.socketToken) {
          sessionStorage.setItem("chessplay_socket_token", data.socketToken);
          return data.socketToken;
        }
      } catch {
        // Keep cookie-only auth as the fallback.
      }

      return "";
    }

    async function connectSocket() {
      const targetUrl =
        serverUrl || SOCKET_URL || `http://${window.location.hostname}:3001`;
      const socketToken = await fetchSocketToken();
      if (!isMounted) return;

      newSocket = io(targetUrl, {
        transports: ["websocket", "polling"],
        reconnectionAttempts: 5,
        timeout: 8000,
        withCredentials: true,
        auth: socketToken ? { accessToken: socketToken } : undefined,
      });
      socketRef.current = newSocket;

    newSocket.on("connect", () => {
      setIsConnected(true);
      setError(null);

      const storedRoomId = sessionStorage.getItem(STORED_ROOM_ID_KEY);
      const storedPlayerColor = sessionStorage.getItem(STORED_PLAYER_COLOR_KEY);
      if (storedRoomId && storedPlayerColor) {
        newSocket.emit("rejoinRoom", {
          roomId: storedRoomId,
        });
      }
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
    });

      newSocket.on("connect_error", (err) => {
        const message = err.message || "Unable to connect to multiplayer server";
        if (/auth|token|session/i.test(message)) {
          sessionStorage.removeItem("chessplay_socket_token");
          setError("Please login again to play multiplayer.");
        } else {
          setError(message);
        }
        console.error("Socket.IO connect_error:", err);
      });

    newSocket.on("roomCreated", (data) => {
      updateRoomId(data.roomId);
      setGameState(data.gameState);
      setChatMessages(data.chatHistory || []);
      setIsSpectating(false);
      updatePlayerColor("w");
      rememberRoom(data.roomId, "w");
      setIsMyTurn(data.gameState.turn === "w");
      setOpponentName(null);
      setError(null);
    });

    newSocket.on("joinedRoom", (data) => {
      updateRoomId(data.roomId);
      setGameState(data.gameState);
      setIsSpectating(false);
      updatePlayerColor(data.color);
      rememberRoom(data.roomId, data.color);
      setIsMyTurn(data.gameState.turn === data.color);
      setChatMessages(data.chatHistory || []);

      const opponentPlayer =
        data.color === "w"
          ? data.gameState.players.b
          : data.gameState.players.w;
      setOpponentName(opponentPlayer?.userId ? opponentPlayer.name : null);
      setError(null);
    });

    newSocket.on("rejoinedRoom", (data) => {
      updateRoomId(data.roomId);
      setGameState(data.gameState);
      setIsSpectating(false);
      updatePlayerColor(data.color);
      rememberRoom(data.roomId, data.color);
      setIsMyTurn(data.gameState.turn === data.color);
      setChatMessages(data.chatHistory || []);

      const opponentPlayer =
        data.color === "w"
          ? data.gameState.players.b
          : data.gameState.players.w;
      setOpponentName(opponentPlayer?.userId ? opponentPlayer.name : null);
      setError(null);
    });

    newSocket.on("matchFound", (data) => {
      updateRoomId(data.roomId);
      setGameState(data.gameState);
      setIsSpectating(false);
      updatePlayerColor(data.color);
      rememberRoom(data.roomId, data.color);
      setIsMyTurn(data.gameState.turn === data.color);
      setChatMessages(data.chatHistory || []);
      setIsSearching(false);

      const opponentPlayer =
        data.color === "w"
          ? data.gameState.players.b
          : data.gameState.players.w;
      setOpponentName(opponentPlayer?.userId ? opponentPlayer.name : null);
      setError(null);
    });

    newSocket.on("spectatedRoom", (data) => {
      updateRoomId(data.roomId);
      setGameState(data.gameState);
      updatePlayerColor(null);
      setIsSpectating(true);
      setIsMyTurn(false);
      setChatMessages(data.chatHistory || []);
      setOpponentName(null);
      setSpectatorCount(data.spectatorCount || 0);
      setError(null);
    });

    newSocket.on("queueJoined", (data) => {
      setIsSearching(true);
      setQueueSize(data.queueSize || 0);
      setError(null);
    });

    newSocket.on("queueLeft", (data) => {
      setIsSearching(false);
      setQueueSize(data.queueSize || 0);
    });

    newSocket.on("queueUpdate", (data) => {
      setQueueSize(data.queueSize || 0);
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

    newSocket.on("playerRejoined", (data) => {
      setGameState(data.gameState);
      if (data.color !== playerColorRef.current) {
        setOpponentName(data.name);
      }
      setError(null);
    });

    newSocket.on("chatMessage", (message) => {
      setChatMessages((msgs) => [...msgs, message]);
    });

    newSocket.on("moveMade", (data) => {
      setGameState(data.gameState);
      setIsMyTurn(data.gameState.turn === playerColorRef.current);
      setDrawOffered(false);
      setDrawOfferedBy(null);

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
      if (DRAW_STATUSES.has(data.gameState.status)) {
        soundRef.current.stalemate();
      }
    });

    newSocket.on("playerResigned", (data) => {
      setGameState(data.gameState);
      setIsMyTurn(false);
      setDrawOffered(false);
      setDrawOfferedBy(null);
      if (data.winnerColor === playerColorRef.current) {
        soundRef.current.gameEnd(true);
      } else {
        soundRef.current.gameEnd(false);
      }
      forgetRoom();
    });

    newSocket.on("playerLeft", (data) => {
      setOpponentName(null);
      setError(`${data.name} left the game`);
    });

    newSocket.on("playerDisconnected", (data) => {
      setGameState(data.gameState);
      if (data.color !== playerColorRef.current) {
        setError(`${data.name} disconnected. Waiting for reconnection...`);
      }
    });

    newSocket.on("playerAbandoned", (data) => {
      setGameState(data.gameState);
      setIsMyTurn(false);
      setDrawOffered(false);
      setDrawOfferedBy(null);
      forgetRoom();
      setError(
        data.winnerColor === playerColorRef.current
          ? "Opponent abandoned. You win."
          : "You abandoned the game.",
      );
      soundRef.current.gameEnd(data.winnerColor === playerColorRef.current);
    });

    newSocket.on("drawOffer", (data) => {
      setDrawOffered(true);
      setDrawOfferedBy(data?.fromColor || null);
    });

    newSocket.on("drawAccepted", (data) => {
      setGameState(data.gameState);
      setDrawOffered(false);
      setDrawOfferedBy(null);
      setIsMyTurn(false);
      soundRef.current.stalemate();
    });

    newSocket.on("drawDeclined", () => {
      setDrawOffered(false);
      setDrawOfferedBy(null);
    });

    newSocket.on("serverError", (data) => {
      setError(data.message);
    });

    newSocket.on("roomClosed", (data) => {
      setError(data.message || "This room has closed");
      setGameState(null);
      updateRoomId(null);
      setIsSpectating(false);
      setIsMyTurn(false);
      setSpectatorCount(0);
    });

    newSocket.on("roomsList", (roomList) => {
      setRooms(Array.isArray(roomList) ? roomList : []);
    });

    newSocket.on("spectatorCount", (data) => {
      if (data?.roomId && data.roomId === roomIdRef.current) {
        setSpectatorCount(data.count || 0);
      }
      setRooms((prevRooms) =>
        prevRooms.map((room) =>
          room.id === data?.roomId
            ? { ...room, spectatorCount: data.count || 0 }
            : room,
        ),
      );
    });

    newSocket.on("chatHistory", (history) => {
      setChatMessages(history || []);
    });

    }

    connectSocket();

    return () => {
      isMounted = false;
      newSocket?.close();
      socketRef.current = null;
    };
  }, [serverUrl]);

  const createRoom = useCallback(
    (playerName) => {
      if (socketRef.current && isConnected) {
        socketRef.current.emit("createRoom", { playerName });
      }
    },
    [isConnected],
  );

  const joinRoom = useCallback(
    (roomId, playerName) => {
      if (socketRef.current && isConnected) {
        socketRef.current.emit("joinRoom", { roomId, playerName });
      }
    },
    [isConnected],
  );

  const spectateRoom = useCallback(
    (targetRoomId) => {
      if (socketRef.current && isConnected) {
        socketRef.current.emit("spectateRoom", { roomId: targetRoomId });
      }
    },
    [isConnected],
  );

  const makeMove = useCallback(
    (fromRow, fromCol, toRow, toCol, promotion = null) => {
      if (socketRef.current && isConnected && isMyTurn) {
        socketRef.current.emit("makeMove", {
          fromRow,
          fromCol,
          toRow,
          toCol,
          promotion,
        });
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

  const acceptDraw = useCallback(() => {
    if (socketRef.current && isConnected && roomId) {
      socketRef.current.emit("drawAccepted");
    }
    setDrawOffered(false);
    setDrawOfferedBy(null);
  }, [isConnected, roomId]);

  const declineDraw = useCallback(() => {
    if (socketRef.current && isConnected && roomId) {
      socketRef.current.emit("drawDeclined");
    }
    setDrawOffered(false);
    setDrawOfferedBy(null);
  }, [isConnected, roomId]);

  const resign = useCallback(() => {
    if (socketRef.current && isConnected && roomIdRef.current) {
      socketRef.current.emit("resign");
    }
  }, [isConnected]);

  const offerDraw = useCallback(() => {
    if (socketRef.current && isConnected && roomId) {
      setDrawOffered(true);
      setDrawOfferedBy(playerColorRef.current);
      socketRef.current.emit("drawOffer", { fromColor: playerColorRef.current });
    }
  }, [isConnected, roomId]);

  const joinQueue = useCallback(
    (playerName) => {
      if (socketRef.current && isConnected) {
        setIsSearching(true);
        socketRef.current.emit("joinQueue", { playerName });
      }
    },
    [isConnected],
  );

  const leaveQueue = useCallback(() => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("leaveQueue");
    }
    setIsSearching(false);
  }, [isConnected]);

  const getRooms = useCallback(() => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("getRooms");
    }
  }, [isConnected]);

  const leaveRoom = useCallback(() => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("leaveRoom");
      socketRef.current.emit("leaveQueue");
    }

    setGameState(null);
    updateRoomId(null);
    setPlayerColor(null);
    playerColorRef.current = null;
    forgetRoom();
    setOpponentName(null);
    setIsMyTurn(false);
    setIsSpectating(false);
    setSpectatorCount(0);
    setDrawOffered(false);
    setIsSearching(false);
    setError(null);
  }, [isConnected]);

  return {
    isConnected,
    error,

    gameState,
    roomId,
    playerColor,
    opponentName,
    isMyTurn,
    drawOffered,
    drawOfferedBy,
    isSearching,
    queueSize,
    rooms,
    isSpectating,
    spectatorCount,

    createRoom,
    joinRoom,
    spectateRoom,
    makeMove,
    getRooms,
    leaveRoom,
    chatMessages,
    sendMessage,
    offerDraw,
    acceptDraw,
    declineDraw,
    resign,
    joinQueue,
    leaveQueue,
  };
}
