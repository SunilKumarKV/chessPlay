# ChessPlay ♛

A beautiful, modern chess game built with React and Node.js, featuring both single-player AI mode and real-time multiplayer functionality.

## Features

### 🎯 Single Player Mode

- Play against AI with adjustable difficulty levels
- Beautiful, responsive chess board with smooth animations
- Move validation and game state management
- Chess clock with multiple time controls
- Sound effects and visual feedback
- Move history and PGN export
- Captured pieces display

### 👥 Multiplayer Mode

- Real-time multiplayer games via Socket.IO
- Create or join game rooms
- Instant move synchronization
- Player status indicators
- Room management and player matching

### 🎨 Design

- Dark theme with golden accents
- Responsive design for all screen sizes
- Smooth animations and transitions
- Professional typography (Crimson Text, Playfair Display)

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS
- **Backend**: Node.js, Express, Socket.IO
- **Real-time**: Socket.IO for multiplayer
- **Styling**: Tailwind CSS with custom gradients
- **Build**: Vite for fast development

## Quick Start

### Prerequisites

- Node.js 16+
- npm or yarn

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd chessplay
```

2. Install all dependencies:

```bash
npm run install:all
```

### Running the Application

#### For Single Player Only

```bash
npm run dev
```

Frontend will be available at `http://localhost:5173`

#### For Multiplayer (Frontend + Backend)

```bash
npm start
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`

#### Manual Setup

```bash
# Terminal 1 - Backend
npm run server

# Terminal 2 - Frontend
npm run dev
```

## Project Structure

```
chessplay/
├── frontend/                # React frontend
│   ├── src/                # React source code
│   │   ├── components/     # React components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── utils/         # Chess utilities
│   │   └── constants/     # Game constants
│   ├── public/            # Static assets
│   ├── package.json       # Frontend dependencies
│   └── vite.config.js     # Vite configuration
├── backend/                # Node.js backend
│   ├── server.js          # Socket.IO server
│   ├── chessUtils.js      # Backend chess utilities
│   └── package.json       # Backend dependencies
├── package.json           # Root package.json for monorepo
└── README.md
```

## Game Features

### Chess Rules

- Complete chess rule implementation
- Move validation for all piece types
- Check, checkmate, and stalemate detection
- Castling and en passant support
- Pawn promotion

### Multiplayer

- Room-based game system
- Real-time move synchronization
- Player connection/disconnection handling
- Turn-based gameplay with validation

### UI/UX

- Intuitive drag-and-drop or click-to-move
- Legal move highlighting
- Last move indication
- Responsive design
- Accessibility considerations

## API Reference

### Backend Socket Events

#### Client → Server

- `createRoom` - Create new game room
- `joinRoom` - Join existing room
- `makeMove` - Submit chess move
- `getRooms` - Get active rooms list

#### Server → Client

- `roomCreated` - Room creation success
- `playerJoined` - Player joined room
- `moveMade` - Move executed
- `playerLeft` - Player disconnected
- `error` - Error message

## Development

### Adding New Features

1. For frontend features, add components in `src/components/`
2. For backend features, modify `backend/server.js`
3. Update chess logic in respective utility files

### Testing

```bash
npm run lint    # Run ESLint
npm run build   # Build for production
```

### Deployment

1. Build frontend: `npm run build`
2. Deploy backend to your Node.js hosting service
3. Update Socket.IO client URL in production

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).

## Acknowledgments

- Chess piece logic inspired by standard chess implementations
- UI design inspired by modern chess applications
- Built with React, Socket.IO, and Tailwind CSS
