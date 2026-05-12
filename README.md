# ChessPlay ♟️

**ChessPlay** is a production-focused online chess platform built with **React, Vite, Node.js, Express, Socket.IO, MongoDB, and Stockfish**. It supports chess vs AI, real-time multiplayer, authenticated dashboards, game history, leaderboard, privacy controls, analysis tools, offline play, and production-ready deployment structure.

> Current Version: **v1.1.1**  
> Status: **Production Upgrade Release**

---

## 🚀 Live Demo

**Live App:** https://chessplay1.vercel.app/

---

## 📌 Project Overview

ChessPlay is designed as a real-world chess application with modern UI/UX, secure authentication, AI-powered chess gameplay, multiplayer support, user profiles, and scalable backend architecture.

This project was built to demonstrate full-stack production skills, including:

- Frontend architecture
- Backend API development
- Real-time communication
- Authentication and authorization
- Database integration
- AI engine integration
- Production deployment
- UI/UX polish
- Security and performance hardening

---

## ✨ Key Features

### ♟️ Chess Gameplay

- Legal chess move validation
- Check, checkmate, stalemate detection
- Castling support
- En passant support
- Pawn promotion support
- Draw conditions
- Resign option
- Undo support where applicable
- Game end statistics

### 🤖 Play vs AI

- Stockfish-powered AI opponent
- AI move calculation
- Hint support
- Side selection
- Difficulty/time control foundation
- Worker-based engine integration for better performance

### 📊 Analysis Board

- Stockfish-powered analysis page
- FEN support
- PGN support foundation
- Best move analysis
- Position evaluation foundation
- Useful for post-game review and learning

### 🌐 Real-Time Multiplayer

- Socket.IO-based room system
- Create/join game rooms
- Server-side move validation
- Real-time board updates
- Resign handling
- Game status synchronization

### 🧑‍🤝‍🧑 Offline Play

- Play vs Player mode
- Local pass-and-play gameplay
- Useful for two players on the same device

### 📡 Same WiFi / LAN Play Foundation

- LAN multiplayer setup guidance
- Local backend connection foundation
- Designed for future same-network two-device gameplay

> Note: True two-device offline LAN play requires a local Socket.IO server or WebRTC signaling setup.

### 🔐 Authentication & Security

- User signup/login
- JWT-based authentication
- Secure session handling
- HttpOnly cookie strategy foundation
- Dummy/temp email blocking
- Optional allowed email domain validation
- Protected dashboard APIs
- Privacy settings

### 👤 User Dashboard

- User profile
- Game history
- Leaderboard
- Friends foundation
- Messages foundation
- Notifications foundation
- Privacy controls
- Loading and error states

### 🎨 UI/UX

- Responsive layout
- Dark/light theme foundation
- Improved loading states
- Branded startup loader
- Dashboard navigation
- Polished coming-soon pages
- Production-level empty/error states

---

## 🛠️ Tech Stack

### Frontend

- React
- Vite
- JavaScript / JSX
- CSS / modern responsive styling
- React Router
- Stockfish Web Worker

### Backend

- Node.js
- Express.js
- Socket.IO
- MongoDB
- Mongoose
- JWT Authentication
- Cookie-based auth foundation

### Deployment

- Vercel for frontend
- Render / Railway / AWS / VPS for backend
- MongoDB Atlas for database

---

## 📁 Project Structure

```bash
ChessPlay/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── features/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── styles/
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── socket/
│   ├── tests/
│   ├── package.json
│   └── server.js
│
├── package.json
├── vercel.json
└── README.md
```

---

## ⚙️ Environment Variables

### Frontend `.env`

Create a `.env` file inside the `frontend` folder:

```env
VITE_BACKEND_URL=https://your-backend-url.com
```

For local development:

```env
VITE_BACKEND_URL=http://localhost:5000
```

---

### Backend `.env`

Create a `.env` file inside the `backend` folder:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secure_jwt_secret
FRONTEND_ORIGINS=http://localhost:5173,https://chessplay1.vercel.app
AUTH_ALLOWED_EMAIL_DOMAINS=gmail.com,outlook.com,yahoo.com
```

### Important Notes

- Never commit `.env` files to GitHub.
- Use strong `JWT_SECRET` in production.
- Add your deployed frontend URL inside `FRONTEND_ORIGINS`.
- Add your deployed backend URL inside `VITE_BACKEND_URL`.

---

## 🧪 Installation & Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name
```

### 2. Install all dependencies

```bash
npm install
```

If frontend and backend dependencies are separate:

```bash
cd frontend
npm install

cd ../backend
npm install
```

---

## ▶️ Run Locally

### Run frontend

```bash
cd frontend
npm run dev
```

Frontend runs on:

```bash
http://localhost:5173
```

### Run backend

```bash
cd backend
npm run dev
```

Backend runs on:

```bash
http://localhost:5000
```

---

## 📦 Available Scripts

From project root:

```bash
npm run build
npm run lint
npm run test:production
```

Backend:

```bash
npm --workspace backend test
```

Frontend:

```bash
cd frontend
npm run dev
npm run build
npm run preview
```

---

## ✅ Production Test Checklist

Before deployment, run:

```bash
npm install
npm run lint
npm run build
npm run test:production
npm --workspace backend test
```

Manual checks:

- Homepage loads without black screen
- Login/signup works correctly
- Dummy emails are blocked
- Dashboard does not infinite-load
- Play vs AI works
- Play vs Player works
- Analysis page works
- Theme switching works across pages
- Protected routes redirect correctly
- Multiplayer room creation works
- Backend CORS works with production frontend
- Mobile responsiveness is acceptable

---

## 🚀 Deployment Guide

### Frontend Deployment - Vercel

1. Push code to GitHub
2. Import project into Vercel
3. Set build settings:

If deploying from root:

```bash
Build Command: npm run build
Output Directory: frontend/dist
```

If deploying only frontend folder:

```bash
Root Directory: frontend
Build Command: npm run build
Output Directory: dist
```

4. Add environment variable:

```env
VITE_BACKEND_URL=https://your-backend-url.com
```

---

### Backend Deployment - Render/Railway

1. Deploy backend folder
2. Add environment variables:

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=your_mongodb_atlas_uri
JWT_SECRET=your_production_secret
FRONTEND_ORIGINS=https://chessplay1.vercel.app
AUTH_ALLOWED_EMAIL_DOMAINS=gmail.com,outlook.com,yahoo.com
```

3. Update frontend `VITE_BACKEND_URL` with backend deployment URL.

---

## 🧷 Versioning

This project follows semantic versioning:

```bash
v1.0.0       Initial production release
v1.1.0-beta  Beta feature release
v1.1.1       Production upgrade and bug fix release
```

Recommended future versions:

```bash
v1.1.2  Small bug fixes
v1.2.0  Tournaments, puzzles, improved analysis
v1.3.0  PWA and mobile improvements
v2.0.0  Android/iOS release
```

---

## 🏷️ Git Tagging

Create a release tag:

```bash
git tag -a v1.1.1 -m "ChessPlay v1.1.1 production release"
git push origin v1.1.1
```

Or push all tags:

```bash
git push --tags
```

---

## 📝 Recommended Commit Message

```bash
git commit -m "feat(v1.1.1): ChessPlay production upgrade with analysis, offline multiplayer, auth hardening, and UX improvements"
```

---

## 📌 Release Notes - v1.1.1

### Added

- Stockfish-powered analysis board
- Offline Play vs Player mode
- Same WiFi / LAN play foundation
- Improved dashboard loading states
- Branded app startup loader
- Better coming-soon pages

### Fixed

- Homepage black screen loading issue
- Dashboard infinite loading issue
- Theme inconsistency across some components
- Broken guest play flow
- Protected API loading fallback issues

### Security

- Dummy email blocking
- Temporary email blocking foundation
- Optional allowed email domain validation
- Better auth/session handling

### Improved

- UI/UX polish
- Navigation structure
- Production deployment configuration
- Error and empty states
- Build stability

---

## 🧭 Roadmap

### v1.2.0

- Full puzzle system
- Tournaments
- Better game review analysis
- Move accuracy scoring
- Mistake/blunder detection
- Improved Stockfish evaluation UI

### v1.3.0

- PWA install support
- Offline-first improvements
- Mobile layout upgrade
- Push notifications

### v2.0.0

- Android app
- iOS app
- Real LAN multiplayer
- Advanced friend system
- Chat and clubs

---

## 🔒 Security Considerations

- Use a strong production JWT secret.
- Keep MongoDB credentials private.
- Restrict CORS to trusted frontend domains only.
- Do not expose backend secrets to frontend.
- Do not commit `.env` files.
- Validate user inputs on backend.
- Rate-limit auth routes in production.
- Use HTTPS in production.

---

## 🧠 Learning & Engineering Highlights

This project demonstrates:

- Full-stack app architecture
- Real-time multiplayer using Socket.IO
- AI chess engine integration
- Secure authentication flow
- Production deployment workflow
- Responsive UI/UX design
- Scalable feature-based structure
- Real-world debugging and optimization

---

## 👨‍💻 Author

**Sunil Kumar K V**  
Full Stack Developer | React Specialist | MCA Student

- GitHub: https://github.com/SunilKumarKV
- LinkedIn: https://www.linkedin.com/in/sunilkumarkv44/
- Portfolio: https://sunilcraft.vercel.app/

---

## 📄 License

This project is for learning, portfolio, and production-level development demonstration.

If you plan to use Stockfish or any third-party chess engine, review and follow its license terms before commercial use.

---

## ⭐ Support

If you like this project, consider giving it a star on GitHub and sharing feedback.

