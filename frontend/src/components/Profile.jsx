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
  Cell
} from "recharts";
import { useSettings } from "../hooks/useSettings";

const API_BASE = "http://localhost:3001/api";

export default function Profile({ user, onBack, profileUserId = null }) {
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

      // Fetch user profile
      const profileResponse = await fetch(`${API_BASE}/auth/profile/${targetUserId || ''}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        setProfileData(profileData.user);
      }

      // Fetch recent games
      const gamesResponse = await fetch(`${API_BASE}/games/history?page=1&limit=10`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (gamesResponse.ok) {
        const gamesData = await gamesResponse.json();
        setRecentGames(gamesData.games || []);
      }

      // Mock rating history data (in a real app, this would come from API)
      const mockRatingHistory = generateMockRatingHistory();
      setRatingHistory(mockRatingHistory);

    } catch (error) {
      console.error("Error fetching profile data:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateMockRatingHistory = () => {
    const data = [];
    const baseRating = profileData?.rating || 1200;
    let currentRating = baseRating - 200; // Start lower for progression

    // Generate 52 weeks of data
    for (let i = 52; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i * 7);

      // Simulate realistic rating changes with some volatility
      const volatility = Math.random() * 60 - 30; // -30 to +30
      const trend = (52 - i) * 2; // Upward trend over time
      const change = volatility + trend * 0.1;

      currentRating += change;
      currentRating = Math.max(800, Math.min(2200, currentRating));

      data.push({
        date: date.toISOString().split('T')[0],
        rating: Math.round(currentRating),
        bullet: Math.round(currentRating - 100 + Math.random() * 200),
        blitz: Math.round(currentRating),
        rapid: Math.round(currentRating + 50 + Math.random() * 100),
        classical: Math.round(currentRating + 100 + Math.random() * 80),
      });
    }

    return data;
  };

  const getTimeControlData = () => {
    return ratingHistory.map(item => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      rating: item[activeTimeControl],
    }));
  };

  const calculateStats = () => {
    if (!recentGames.length) return { games: 0, wins: 0, draws: 0, losses: 0, winRate: 0 };

    let wins = 0, draws = 0, losses = 0;

    recentGames.forEach(game => {
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
    // Mock opening data - in a real app, this would be calculated from games
    return {
      white: [
        { name: "Queen's Gambit", games: 15, wins: 10, draws: 3, losses: 2 },
        { name: "King's Indian", games: 12, wins: 8, draws: 2, losses: 2 },
        { name: "Sicilian Defense", games: 10, wins: 6, draws: 2, losses: 2 },
        { name: "English Opening", games: 8, wins: 5, draws: 1, losses: 2 },
        { name: "Ruy Lopez", games: 6, wins: 4, draws: 1, losses: 1 },
      ],
      black: [
        { name: "Queen's Gambit Declined", games: 14, wins: 9, draws: 3, losses: 2 },
        { name: "Sicilian Defense", games: 11, wins: 7, draws: 2, losses: 2 },
        { name: "King's Indian Defense", games: 9, wins: 6, draws: 1, losses: 2 },
        { name: "French Defense", games: 7, wins: 4, draws: 2, losses: 1 },
        { name: "Caro-Kann", games: 5, wins: 3, draws: 1, losses: 1 },
      ],
    };
  };

  const getActivityHeatmap = () => {
    const data = [];
    const today = new Date();

    for (let week = 51; week >= 0; week--) {
      const weekData = [];
      for (let day = 6; day >= 0; day--) {
        const date = new Date(today);
        date.setDate(date.getDate() - (week * 7 + day));

        // Mock activity data
        const activity = Math.floor(Math.random() * 5);
        weekData.push({
          date: date.toISOString().split('T')[0],
          activity,
          day: day,
        });
      }
      data.push(weekData);
    }

    return data;
  };

  const getActivityColor = (activity) => {
    const colors = ['#1a1a1a', '#2a3d2a', '#3d5a3d', '#5a7a5a', '#81b64c'];
    return colors[activity] || colors[0];
  };

  const stats = calculateStats();
  const openings = getOpeningRepertoire();
  const activityData = getActivityHeatmap();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e0e0e] text-white flex items-center justify-center">
        <div className="text-xl">Loading profile...</div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-[#0e0e0e] text-white flex items-center justify-center">
        <div className="text-xl">Profile not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white">
      {/* Header Section */}
      <div className="relative">
        {/* Banner */}
        <div className="h-48 bg-gradient-to-r from-[#81b64c] to-[#5a7a5a] relative">
          <div className="absolute inset-0 bg-black bg-opacity-20"></div>
        </div>

        {/* Profile Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex items-end space-x-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-20 h-20 bg-[#1a1a1a] rounded-full border-4 border-white overflow-hidden">
                {profileData.avatar ? (
                  <img
                    src={profileData.avatar}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">
                    👤
                  </div>
                )}
              </div>
            </div>

            {/* User Info */}
            <div className="flex-1 text-white">
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-2xl font-bold">{profileData.username}</h1>
                {profileData.title && (
                  <span className="px-2 py-1 bg-yellow-500 text-black text-sm font-bold rounded">
                    {profileData.title}
                  </span>
                )}
                <span className="text-lg">{profileData.country ? `🇺🇸` : '🇺🇸'}</span>
              </div>

              {/* Stats Row */}
              <div className="flex items-center space-x-6 text-sm">
                <div>
                  <span className="text-gray-300">Rating:</span>
                  <span className="ml-1 font-semibold text-[#81b64c]">{profileData.rating}</span>
                </div>
                <div>
                  <span className="text-gray-300">Games:</span>
                  <span className="ml-1 font-semibold">{stats.games}</span>
                </div>
                <div>
                  <span className="text-gray-300">Win Rate:</span>
                  <span className="ml-1 font-semibold text-[#81b64c]">{stats.winRate}%</span>
                </div>
                <div>
                  <span className="text-gray-300">Member since:</span>
                  <span className="ml-1 font-semibold">
                    {new Date(profileData.createdAt).getFullYear()}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {!isOwnProfile && (
              <div className="flex space-x-3">
                <button className="px-4 py-2 bg-[#81b64c] hover:bg-[#6ba43d] text-white font-medium rounded-lg transition-colors">
                  Follow
                </button>
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
                  Challenge
                </button>
                <button className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors">
                  Message
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Back Button */}
      <div className="bg-[#1a1a1a] px-6 py-4 border-b border-[#2a2a2a]">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
        >
          <span>←</span>
          <span>Back to Dashboard</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - 2/3 */}
          <div className="lg:col-span-2 space-y-6">
            {/* Rating History Chart */}
            <div className="bg-[#1a1a1a] rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Rating History</h2>
                <div className="flex space-x-2">
                  {["bullet", "blitz", "rapid", "classical"].map((timeControl) => (
                    <button
                      key={timeControl}
                      onClick={() => setActiveTimeControl(timeControl)}
                      className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors capitalize ${
                        activeTimeControl === timeControl
                          ? "bg-[#81b64c] text-white"
                          : "bg-[#2a2a2a] text-gray-300 hover:bg-[#333]"
                      }`}
                    >
                      {timeControl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={getTimeControlData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                    <XAxis
                      dataKey="date"
                      stroke="#666"
                      fontSize={12}
                      tick={{ fill: '#666' }}
                    />
                    <YAxis
                      stroke="#666"
                      fontSize={12}
                      tick={{ fill: '#666' }}
                      domain={['dataMin - 50', 'dataMax + 50']}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1a1a1a',
                        border: '1px solid #2a2a2a',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="rating"
                      stroke="#81b64c"
                      strokeWidth={2}
                      dot={{ fill: '#81b64c', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#81b64c', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Games */}
            <div className="bg-[#1a1a1a] rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-6">Recent Games</h2>
              <div className="space-y-3">
                {recentGames.slice(0, 5).map((game) => {
                  const isWhite = game.whitePlayer._id === targetUserId;
                  const opponent = isWhite ? game.blackPlayer : game.whitePlayer;
                  const result = game.result === "draw" ? "Draw" :
                               game.winner?._id === targetUserId ? "Win" : "Loss";

                  const getResultColor = (result) => {
                    switch (result) {
                      case "Win": return "bg-green-500/20 text-green-400 border-green-500/30";
                      case "Loss": return "bg-red-500/20 text-red-400 border-red-500/30";
                      case "Draw": return "bg-gray-500/20 text-gray-400 border-gray-500/30";
                      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
                    }
                  };

                  return (
                    <div key={game._id} className="flex items-center justify-between p-3 bg-[#2a2a2a] rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${isWhite ? 'bg-white' : 'bg-gray-600'}`}></div>
                        <div>
                          <div className="font-medium">vs {opponent.username}</div>
                          <div className="text-sm text-gray-400">
                            {new Date(game.endTime || game.startTime).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${getResultColor(result)}`}>
                        {result}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Opening Repertoire */}
            <div className="bg-[#1a1a1a] rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-6">Opening Repertoire</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* White Openings */}
                <div>
                  <h3 className="text-lg font-medium mb-4 text-white">As White</h3>
                  <div className="space-y-3">
                    {openings.white.map((opening, index) => {
                      const winRate = Math.round((opening.wins / opening.games) * 100);
                      return (
                        <div key={index} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-300">{opening.name}</span>
                            <span className="text-[#81b64c]">{winRate}%</span>
                          </div>
                          <div className="w-full bg-[#2a2a2a] rounded-full h-2">
                            <div
                              className="bg-[#81b64c] h-2 rounded-full transition-all duration-300"
                              style={{ width: `${winRate}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-400">
                            {opening.games} games • {opening.wins}W {opening.draws}D {opening.losses}L
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Black Openings */}
                <div>
                  <h3 className="text-lg font-medium mb-4 text-white">As Black</h3>
                  <div className="space-y-3">
                    {openings.black.map((opening, index) => {
                      const winRate = Math.round((opening.wins / opening.games) * 100);
                      return (
                        <div key={index} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-300">{opening.name}</span>
                            <span className="text-[#81b64c]">{winRate}%</span>
                          </div>
                          <div className="w-full bg-[#2a2a2a] rounded-full h-2">
                            <div
                              className="bg-[#81b64c] h-2 rounded-full transition-all duration-300"
                              style={{ width: `${winRate}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-400">
                            {opening.games} games • {opening.wins}W {opening.draws}D {opening.losses}L
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - 1/3 */}
          <div className="space-y-6">
            {/* Achievements */}
            <div className="bg-[#1a1a1a] rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-6">Achievements</h2>
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
                    className={`relative p-3 rounded-lg border transition-colors ${
                      achievement.unlocked
                        ? "bg-[#81b64c]/10 border-[#81b64c]/30"
                        : "bg-[#2a2a2a] border-[#333] opacity-50"
                    }`}
                    title={achievement.title}
                  >
                    <div className="text-2xl mb-1">{achievement.icon}</div>
                    <div className="text-xs text-center text-gray-300">{achievement.title}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Clubs/Teams */}
            <div className="bg-[#1a1a1a] rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-6">Clubs & Teams</h2>
              <div className="space-y-3">
                {[
                  { name: "Chess Masters United", role: "Member", members: 1250 },
                  { name: "Blitz Warriors", role: "Captain", members: 89 },
                  { name: "Tactical Thinkers", role: "Moderator", members: 456 },
                ].map((club, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-[#2a2a2a] rounded-lg">
                    <div>
                      <div className="font-medium text-white">{club.name}</div>
                      <div className="text-sm text-gray-400">{club.role} • {club.members} members</div>
                    </div>
                    <div className="text-gray-400">→</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Puzzle Rating */}
            <div className="bg-[#1a1a1a] rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4">Puzzle Rating</h2>
              <div className="text-center">
                <div className="text-3xl font-bold text-[#81b64c] mb-2">
                  {profileData.puzzleRating || 1200}
                </div>
                <div className="text-sm text-gray-400 mb-4">
                  Highest: {profileData.highestPuzzleRating || 1200}
                </div>
                <div className="flex justify-center space-x-4 text-sm">
                  <div>
                    <div className="text-gray-400">Solved</div>
                    <div className="font-semibold text-white">{profileData.puzzlesSolved || 0}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Avg Time</div>
                    <div className="font-semibold text-white">45s</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Heatmap */}
            <div className="bg-[#1a1a1a] rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-6">Activity (Last 52 Weeks)</h2>
              <div className="grid grid-cols-7 gap-1">
                {activityData.map((week, weekIndex) =>
                  week.map((day, dayIndex) => (
                    <div
                      key={`${weekIndex}-${dayIndex}`}
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: getActivityColor(day.activity) }}
                      title={`${day.date}: ${day.activity} games`}
                    ></div>
                  ))
                )}
              </div>
              <div className="flex items-center justify-between mt-4 text-xs text-gray-400">
                <span>Less</span>
                <div className="flex space-x-1">
                  <div className="w-2 h-2 rounded-sm bg-[#1a1a1a]"></div>
                  <div className="w-2 h-2 rounded-sm bg-[#2a3d2a]"></div>
                  <div className="w-2 h-2 rounded-sm bg-[#3d5a3d]"></div>
                  <div className="w-2 h-2 rounded-sm bg-[#5a7a5a]"></div>
                  <div className="w-2 h-2 rounded-sm bg-[#81b64c]"></div>
                </div>
                <span>More</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}