import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { useSettings } from "../hooks/useSettings";

const API_BASE = `${import.meta.env.VITE_BACKEND_URL || "http://localhost:3001"}/api`;

export default function Profile({
  user,
  onBack,
  profileUserId = null,
  onNavigate,
}) {
  const [profileData, setProfileData] = useState(null);
  const [ratingHistory, setRatingHistory] = useState([]);
  const [recentGames, setRecentGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTimeControl, setActiveTimeControl] = useState("blitz");
  const settings = useSettings();

  // Use current user if no specific profile user ID provided
  const targetUserId = profileUserId || user?.id;
  const isOwnProfile = !profileUserId || profileUserId === user?.id;

  useEffect(() => {
    if (targetUserId) {
      fetchProfileData();
    }
  }, [targetUserId]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);

      let fetchedUser = null;

      // Fetch user profile
      const profileResponse = await fetch(
        `${API_BASE}/auth/profile/${targetUserId || ""}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      if (profileResponse.ok) {
        const data = await profileResponse.json();
        fetchedUser = data.user;
        setProfileData(fetchedUser);
      }

      // Fetch recent games
      const gamesResponse = await fetch(
        `${API_BASE}/games/history?page=1&limit=10`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      if (gamesResponse.ok) {
        const gamesData = await gamesResponse.json();
        setRecentGames(gamesData.games || []);
      }

      // Generate rating history from fetched profile data
      if (fetchedUser) {
        const ratingHistoryData = generateRatingHistory(fetchedUser);
        setRatingHistory(ratingHistoryData);
      }
    } catch (error) {
      console.error("Error fetching profile data:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateRatingHistory = (profileData) => {
    // Generate rating history based on actual profile rating
    // In a production app, this would come from the database
    const data = [];
    const baseRating = profileData?.rating || 1200;
    let currentRating = baseRating - 100;

    // Generate 52 weeks of historical data
    for (let i = 52; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i * 7);

      // Simulate realistic rating changes based on performance
      const volatility = Math.random() * 40 - 20;
      const trend = (52 - i) * 1.5;
      const change = volatility + trend * 0.05;

      currentRating += change;
      currentRating = Math.max(800, Math.min(2800, currentRating));

      data.push({
        date: date.toISOString().split("T")[0],
        rating: Math.round(currentRating),
        bullet: Math.round(
          Math.max(400, currentRating - 150 + Math.random() * 200),
        ),
        blitz: Math.round(currentRating),
        rapid: Math.round(
          Math.max(800, currentRating + 50 + Math.random() * 150),
        ),
        classical: Math.round(
          Math.max(1000, currentRating + 100 + Math.random() * 120),
        ),
      });
    }

    return data;
  };

  const getTimeControlData = () => {
    return ratingHistory.map((item) => ({
      date: new Date(item.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      rating: item[activeTimeControl],
    }));
  };

  const calculateStats = () => {
    if (!recentGames.length)
      return { games: 0, wins: 0, draws: 0, losses: 0, winRate: 0 };

    let wins = 0,
      draws = 0,
      losses = 0;

    recentGames.forEach((game) => {
      if (game.result === "draw") {
        draws++;
      } else if (game.winner?._id === targetUserId) {
        wins++;
      } else {
        losses++;
      }
    });

    const total = wins + draws + losses;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

    return { games: total, wins, draws, losses, winRate };
  };

  const getOpeningRepertoire = () => {
    // Calculate opening data from actual games
    if (!recentGames.length) {
      return {
        white: [],
        black: [],
      };
    }

    const whiteOpenings = {};
    const blackOpenings = {};

    recentGames.forEach((game) => {
      const isWhite = game.whitePlayer?._id === targetUserId;
      const openingName =
        game.opening || (isWhite ? "Unknown Opening" : "Unknown Defense");

      if (isWhite) {
        if (!whiteOpenings[openingName]) {
          whiteOpenings[openingName] = {
            name: openingName,
            games: 0,
            wins: 0,
            draws: 0,
            losses: 0,
          };
        }
        whiteOpenings[openingName].games++;
        if (game.result === "draw") {
          whiteOpenings[openingName].draws++;
        } else if (game.winner?._id === targetUserId) {
          whiteOpenings[openingName].wins++;
        } else {
          whiteOpenings[openingName].losses++;
        }
      } else {
        if (!blackOpenings[openingName]) {
          blackOpenings[openingName] = {
            name: openingName,
            games: 0,
            wins: 0,
            draws: 0,
            losses: 0,
          };
        }
        blackOpenings[openingName].games++;
        if (game.result === "draw") {
          blackOpenings[openingName].draws++;
        } else if (game.winner?._id === targetUserId) {
          blackOpenings[openingName].wins++;
        } else {
          blackOpenings[openingName].losses++;
        }
      }
    });

    return {
      white: Object.values(whiteOpenings).sort((a, b) => b.games - a.games),
      black: Object.values(blackOpenings).sort((a, b) => b.games - a.games),
    };
  };

  const getActivityHeatmap = () => {
    const data = [];
    const today = new Date();

    // Create a map of games by date
    const gamesByDate = {};
    recentGames.forEach((game) => {
      const date = new Date(game.endTime || game.startTime)
        .toISOString()
        .split("T")[0];
      gamesByDate[date] = (gamesByDate[date] || 0) + 1;
    });

    for (let week = 51; week >= 0; week--) {
      const weekData = [];
      for (let day = 6; day >= 0; day--) {
        const date = new Date(today);
        date.setDate(date.getDate() - (week * 7 + day));
        const dateStr = date.toISOString().split("T")[0];

        // Get actual activity count for this date
        const activity = Math.min(
          gamesByDate[dateStr]
            ? Math.floor(Math.log2(gamesByDate[dateStr] + 1))
            : 0,
          4,
        );
        weekData.push({
          date: dateStr,
          activity,
          day: day,
        });
      }
      data.push(weekData);
    }

    return data;
  };

  const getActivityColor = (activity) => {
    const colors = ["#1a1a1a", "#2a3d2a", "#3d5a3d", "#5a7a5a", "#81b64c"];
    return colors[activity] || colors[0];
  };

  const stats = calculateStats();
  const openings = getOpeningRepertoire();
  const activityData = getActivityHeatmap();

  if (loading) {
    return (
      <div className="flex h-screen bg-[#312e2b] text-[#e0e0e0] font-['Inter'] w-full overflow-hidden">
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#81b64c] mx-auto mb-4"></div>
            <p className="text-[#7a7a7a]">Loading profile...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="flex h-screen bg-[#312e2b] text-[#e0e0e0] font-['Inter'] w-full overflow-hidden">
        {/* Skeleton Sidebar */}
        <aside className="w-64 bg-[#262421] h-full hidden lg:flex flex-col justify-between border-r border-[#211f1c] flex-shrink-0 z-20 shadow-2xl">
          <div className="p-8 animate-pulse flex flex-col gap-6">
            <div className="h-8 bg-[#3a3835] rounded w-3/4"></div>
            <div className="space-y-4 mt-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-10 bg-[#3a3835] rounded w-full"></div>
              ))}
            </div>
          </div>
        </aside>
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl text-[#7a7a7a]">Profile not found</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#312e2b] text-[#e0e0e0] font-['Inter'] w-full overflow-hidden">
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Banner */}
        <div className="relative bg-[#262421] border-b border-white/5">
          <div className="h-48 bg-gradient-to-r from-[#81b64c] to-[#4a6a3a] relative">
            <div className="absolute inset-0 bg-black/20"></div>
            <button
              onClick={onBack}
              className="absolute top-4 left-6 flex items-center space-x-2 text-white/80 hover:text-white bg-black/30 hover:bg-black/50 px-3 py-1.5 rounded-lg transition-all backdrop-blur-sm z-10 text-sm"
            >
              <span>←</span>
              <span>Back to Dashboard</span>
            </button>
          </div>

          {/* Profile Info Overlay */}
          <div className="px-6 pb-6 pt-0">
            <div className="flex flex-col md:flex-row items-center md:items-end space-y-4 md:space-y-0 md:space-x-6 -mt-10 relative z-10">
              {/* Avatar */}
              <div className="w-24 h-24 bg-[#262421] rounded-xl border-4 border-[#262421] overflow-hidden shadow-lg flex-shrink-0">
                {profileData.avatar ? (
                  <img
                    src={profileData.avatar}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[#3a3835] flex items-center justify-center text-4xl shadow-inner">
                    👤
                  </div>
                )}
              </div>

              {/* User Info */}
              <div className="flex-1 text-white w-full text-center md:text-left">
                <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-3 mb-3">
                  <h1 className="text-2xl font-bold font-['Montserrat']">
                    {profileData.username}
                  </h1>
                  {profileData.title && (
                    <span className="px-2 py-1 bg-yellow-500 text-black text-xs font-bold rounded-md uppercase tracking-wider shadow-sm">
                      {profileData.title}
                    </span>
                  )}
                  <span className="text-lg hidden md:block">
                    {profileData.country ? `🇺🇸` : "🇺🇸"}
                  </span>
                </div>

                {/* Stats Row */}
                <div className="flex flex-wrap justify-center md:justify-start gap-4 md:gap-8 text-sm text-[#c2c1c0]">
                  <div className="flex flex-col items-center md:items-start">
                    <span className="text-xs uppercase tracking-wider mb-1">
                      Rating
                    </span>
                    <span className="font-bold text-[#81b64c] text-lg font-['Montserrat']">
                      {profileData.rating}
                    </span>
                  </div>
                  <div className="flex flex-col items-center md:items-start">
                    <span className="text-xs uppercase tracking-wider mb-1">
                      Games
                    </span>
                    <span className="font-bold text-[#e0e0e0] text-lg font-['Montserrat']">
                      {stats.games}
                    </span>
                  </div>
                  <div className="flex flex-col items-center md:items-start">
                    <span className="text-xs uppercase tracking-wider mb-1">
                      Win Rate
                    </span>
                    <span className="font-bold text-[#81b64c] text-lg font-['Montserrat']">
                      {stats.winRate}%
                    </span>
                  </div>
                  <div className="flex flex-col items-center md:items-start">
                    <span className="text-xs uppercase tracking-wider mb-1">
                      Joined
                    </span>
                    <span className="font-bold text-[#e0e0e0] text-lg font-['Montserrat']">
                      {new Date(profileData.createdAt).getFullYear()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {!isOwnProfile && (
                <div className="flex space-x-3 w-full md:w-auto justify-center mt-6 md:mt-0">
                  <button className="flex-1 md:flex-none px-6 py-2.5 bg-[#81b64c] hover:bg-[#6ba03d] text-[#0e0e0e] font-bold rounded-lg transition-colors font-['Montserrat'] shadow-sm">
                    Follow
                  </button>
                  <button className="flex-1 md:flex-none px-6 py-2.5 bg-[#3a3835] hover:bg-[#4a4845] text-white font-bold rounded-lg transition-colors border border-white/10 shadow-sm">
                    Challenge
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Body */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - 2/3 */}
            <div className="lg:col-span-2 space-y-8">
              {/* Rating History Chart */}
              <div className="bg-[#262421] rounded-xl p-6 shadow-md border border-white/5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                  <h2 className="text-xl font-bold text-[#e0e0e0] font-['Montserrat']">
                    Rating History
                  </h2>
                  <div className="flex space-x-2 bg-[#1a1917] p-1 rounded-lg border border-white/5">
                    {["bullet", "blitz", "rapid", "classical"].map(
                      (timeControl) => (
                        <button
                          key={timeControl}
                          onClick={() => setActiveTimeControl(timeControl)}
                          className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors capitalize ${
                            activeTimeControl === timeControl
                              ? "bg-[#3a3835] text-white shadow-sm"
                              : "text-[#7a7a7a] hover:text-[#e0e0e0]"
                          }`}
                        >
                          {timeControl}
                        </button>
                      ),
                    )}
                  </div>
                </div>

                <div className="h-72 w-full">
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                    minHeight={300}
                  >
                    <LineChart
                      data={getTimeControlData()}
                      margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#3a3835"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="date"
                        stroke="#7a7a7a"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#7a7a7a" }}
                        dy={10}
                      />
                      <YAxis
                        stroke="#7a7a7a"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#7a7a7a" }}
                        domain={["dataMin - 50", "dataMax + 50"]}
                        dx={-10}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#262421",
                          border: "1px solid #3a3835",
                          borderRadius: "8px",
                          color: "#fff",
                          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                        }}
                        itemStyle={{ color: "#81b64c", fontWeight: "bold" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="rating"
                        stroke="#81b64c"
                        strokeWidth={3}
                        dot={false}
                        activeDot={{
                          r: 6,
                          fill: "#81b64c",
                          stroke: "#262421",
                          strokeWidth: 2,
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Recent Games */}
              <div className="bg-[#262421] rounded-xl shadow-md border border-white/5 overflow-hidden">
                <div className="p-6 border-b border-white/5">
                  <h2 className="text-xl font-bold text-[#e0e0e0] font-['Montserrat']">
                    Recent Games
                  </h2>
                </div>
                <div className="divide-y divide-white/5">
                  {recentGames.slice(0, 5).map((game) => {
                    const isWhite = game.whitePlayer?._id === targetUserId;
                    const opponent = isWhite
                      ? game.blackPlayer
                      : game.whitePlayer;
                    const opponentName =
                      opponent?.username ||
                      (game.aiOpponent
                        ? `Stockfish Lv${game.aiDifficulty || 10}`
                        : "Unknown");
                    const result =
                      game.result === "draw"
                        ? "Draw"
                        : game.winner?._id === targetUserId
                          ? "Win"
                          : "Loss";

                    const getResultColor = (result) => {
                      switch (result) {
                        case "Win":
                          return "bg-[#81b64c]/10 text-[#81b64c] border-[#81b64c]/20";
                        case "Loss":
                          return "bg-red-500/10 text-red-400 border-red-500/20";
                        case "Draw":
                          return "bg-gray-500/10 text-gray-400 border-gray-500/20";
                        default:
                          return "bg-gray-500/10 text-gray-400 border-gray-500/20";
                      }
                    };

                    return (
                      <div
                        key={game._id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 hover:bg-white/[0.02] transition-colors gap-4"
                      >
                        <div className="flex items-center space-x-4">
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl shadow-inner ${isWhite ? "bg-white text-black" : "bg-[#1a1917] text-white"}`}
                          >
                            {isWhite ? "♔" : "♚"}
                          </div>
                          <div>
                            <div className="font-bold text-[#e0e0e0] font-['Montserrat'] mb-1 text-sm sm:text-base truncate max-w-[200px] sm:max-w-xs">
                              vs {opponentName}
                            </div>
                            <div className="text-xs text-[#7a7a7a] font-['Inter']">
                              {new Date(
                                game.endTime || game.startTime,
                              ).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div
                          className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider border ${getResultColor(result)} text-center sm:text-left self-start sm:self-auto`}
                        >
                          {result}
                        </div>
                      </div>
                    );
                  })}
                  {recentGames.length === 0 && (
                    <div className="p-8 text-center text-[#7a7a7a] italic">
                      No games played yet.
                    </div>
                  )}
                </div>
              </div>

              {/* Opening Repertoire */}
              <div className="bg-[#262421] rounded-xl p-6 shadow-md border border-white/5">
                <h2 className="text-xl font-bold mb-6 text-[#e0e0e0] font-['Montserrat']">
                  Opening Repertoire
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* White Openings */}
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider mb-4 text-[#7a7a7a] flex items-center gap-2">
                      <span className="w-4 h-4 bg-white rounded-sm inline-block shadow-sm"></span>
                      As White
                    </h3>
                    <div className="space-y-5">
                      {openings.white.slice(0, 4).map((opening, index) => {
                        const winRate = Math.round(
                          (opening.wins / opening.games) * 100,
                        );
                        return (
                          <div key={index} className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-[#e0e0e0] font-medium truncate pr-4">
                                {opening.name}
                              </span>
                              <span className="text-[#81b64c] font-bold">
                                {winRate}%
                              </span>
                            </div>
                            <div className="w-full bg-[#1a1917] rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-[#81b64c] h-full rounded-full transition-all duration-300"
                                style={{ width: `${winRate}%` }}
                              ></div>
                            </div>
                            <div className="text-xs text-[#7a7a7a] font-['Inter']">
                              {opening.games} games • {opening.wins}W{" "}
                              {opening.draws}D {opening.losses}L
                            </div>
                          </div>
                        );
                      })}
                      {openings.white.length === 0 && (
                        <div className="text-sm text-[#7a7a7a] italic">
                          No data
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Black Openings */}
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider mb-4 text-[#7a7a7a] flex items-center gap-2">
                      <span className="w-4 h-4 bg-[#1a1917] rounded-sm inline-block shadow-sm"></span>
                      As Black
                    </h3>
                    <div className="space-y-5">
                      {openings.black.slice(0, 4).map((opening, index) => {
                        const winRate = Math.round(
                          (opening.wins / opening.games) * 100,
                        );
                        return (
                          <div key={index} className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-[#e0e0e0] font-medium truncate pr-4">
                                {opening.name}
                              </span>
                              <span className="text-[#81b64c] font-bold">
                                {winRate}%
                              </span>
                            </div>
                            <div className="w-full bg-[#1a1917] rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-[#81b64c] h-full rounded-full transition-all duration-300"
                                style={{ width: `${winRate}%` }}
                              ></div>
                            </div>
                            <div className="text-xs text-[#7a7a7a] font-['Inter']">
                              {opening.games} games • {opening.wins}W{" "}
                              {opening.draws}D {opening.losses}L
                            </div>
                          </div>
                        );
                      })}
                      {openings.black.length === 0 && (
                        <div className="text-sm text-[#7a7a7a] italic">
                          No data
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - 1/3 */}
            <div className="space-y-8">
              {/* Achievements */}
              <div className="bg-[#262421] rounded-xl p-6 shadow-md border border-white/5">
                <h2 className="text-xl font-bold mb-6 text-[#e0e0e0] font-['Montserrat']">
                  Achievements
                </h2>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { icon: "🏆", title: "First Win", unlocked: true },
                    { icon: "⚡", title: "Speed Demon", unlocked: true },
                    { icon: "🎯", title: "Sharpshooter", unlocked: false },
                    { icon: "🛡️", title: "Defender", unlocked: true },
                    { icon: "🔥", title: "Winning Streak", unlocked: false },
                    { icon: "🎪", title: "Puzzle Master", unlocked: true },
                    { icon: "👑", title: "King Slayer", unlocked: true },
                    { icon: "🌟", title: "Rising Star", unlocked: false },
                  ].map((achievement, index) => (
                    <div
                      key={index}
                      className={`relative p-3 rounded-xl flex flex-col items-center justify-center aspect-square transition-colors border ${
                        achievement.unlocked
                          ? "bg-[#81b64c]/10 border-[#81b64c]/20 shadow-sm"
                          : "bg-[#1a1917] border-white/5 opacity-50 grayscale"
                      }`}
                      title={achievement.title}
                    >
                      <div className="text-2xl mb-1 drop-shadow-sm">
                        {achievement.icon}
                      </div>
                      <div className="text-[9px] text-center font-bold uppercase tracking-wider text-[#c2c1c0] leading-tight mt-1 line-clamp-2">
                        {achievement.title}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Clubs/Teams */}
              <div className="bg-[#262421] rounded-xl p-6 shadow-md border border-white/5">
                <h2 className="text-xl font-bold mb-6 text-[#e0e0e0] font-['Montserrat']">
                  Clubs
                </h2>
                <div className="space-y-3">
                  {[
                    {
                      name: "Chess Masters",
                      role: "Member",
                      members: 1250,
                    },
                    { name: "Blitz Warriors", role: "Captain", members: 89 },
                  ].map((club, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-[#1a1917] hover:bg-[#3a3835] transition-colors rounded-lg border border-white/5 cursor-pointer shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md bg-[#262421] flex items-center justify-center text-lg border border-white/10 shadow-inner">
                          🛡️
                        </div>
                        <div>
                          <div className="font-bold text-[#e0e0e0] text-sm font-['Montserrat']">
                            {club.name}
                          </div>
                          <div className="text-xs text-[#7a7a7a] mt-0.5">
                            {club.role} • {club.members}
                          </div>
                        </div>
                      </div>
                      <div className="text-[#7a7a7a] font-bold">›</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Puzzle Rating */}
              <div className="bg-[#262421] rounded-xl p-6 shadow-md border border-white/5">
                <h2 className="text-xl font-bold mb-6 text-[#e0e0e0] font-['Montserrat'] flex items-center justify-between">
                  <span>Puzzle Rating</span>
                  <span className="text-sm font-bold text-[#81b64c] bg-[#81b64c]/10 px-3 py-1 rounded-md">
                    {profileData.puzzleRating || 1200}
                  </span>
                </h2>
                <div className="bg-[#1a1917] rounded-lg p-4 border border-white/5">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm text-[#7a7a7a] uppercase tracking-wider font-bold">
                      Highest Rating
                    </span>
                    <span className="font-bold text-[#e0e0e0]">
                      {profileData.highestPuzzleRating || 1200}
                    </span>
                  </div>
                  <div className="w-full h-px bg-white/5 mb-4"></div>
                  <div className="flex justify-between text-sm">
                    <div className="flex flex-col gap-1">
                      <span className="text-[#7a7a7a] font-bold">Solved</span>
                      <span className="font-bold text-[#e0e0e0] text-lg">
                        {profileData.puzzlesSolved || 0}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 text-right">
                      <span className="text-[#7a7a7a] font-bold">Avg Time</span>
                      <span className="font-bold text-[#e0e0e0] text-lg">
                        45s
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Activity Heatmap */}
              <div className="bg-[#262421] rounded-xl p-6 shadow-md border border-white/5">
                <h2 className="text-xl font-bold mb-6 text-[#e0e0e0] font-['Montserrat']">
                  Activity
                </h2>
                <div className="bg-[#1a1917] p-4 rounded-lg border border-white/5">
                  <div className="grid grid-cols-7 gap-1">
                    {activityData.map((week, weekIndex) =>
                      week.map((day, dayIndex) => (
                        <div
                          key={`${weekIndex}-${dayIndex}`}
                          className="w-full pt-[100%] rounded-[2px] relative"
                          title={`${day.date}: ${day.activity} games`}
                        >
                          <div
                            className="absolute inset-0"
                            style={{
                              backgroundColor: getActivityColor(day.activity),
                            }}
                          ></div>
                        </div>
                      )),
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-4 text-xs font-bold text-[#7a7a7a] uppercase tracking-wider">
                    <span>Less</span>
                    <div className="flex space-x-1">
                      <div className="w-3 h-3 rounded-[2px] bg-[#1a1a1a]"></div>
                      <div className="w-3 h-3 rounded-[2px] bg-[#2a3d2a]"></div>
                      <div className="w-3 h-3 rounded-[2px] bg-[#3d5a3d]"></div>
                      <div className="w-3 h-3 rounded-[2px] bg-[#5a7a5a]"></div>
                      <div className="w-3 h-3 rounded-[2px] bg-[#81b64c]"></div>
                    </div>
                    <span>More</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
