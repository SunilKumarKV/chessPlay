# ChessPlay v1.3.0-alpha.4 — Phase 4 Social Features

Built on top of `v1.3.0-alpha.3` monetization package.

## Implemented

### 18. Community Page
- Added `/community` dashboard route.
- Added sidebar navigation item: Community.
- Added community post feed with filters:
  - Posts
  - Chess puzzles
  - Discussions
  - Achievements
  - Tournaments
- Added create post form.
- Added puzzle-specific optional FEN and solution fields.
- Added like/unlike support.
- Added comments.
- Added safe HTML stripping and content length limits.
- Added backend MongoDB model: `CommunityPost`.
- Added backend APIs under `/api/social/community/*`.

### 19. Messaging Upgrade
- Added `/messages` dashboard route.
- Added sidebar navigation item: Messages.
- Added public community rooms:
  - General Chess Chat
  - Puzzle Room
  - Tournament Room
  - Beginner Help
- Added private friend chat foundation.
- Added recent conversations.
- Added message history loading.
- Added real-time Socket.IO social messaging event.
- Added typing indicator event.
- Added online/offline status event.
- Added mute, block, and report actions.
- Added backend MongoDB model: `Conversation`.
- Added backend APIs under `/api/social/messaging/*`.

## Backend Changes
- `backend/models/CommunityPost.js`
- `backend/models/Conversation.js`
- `backend/routes/social.js`
- `backend/server.js`
  - mounted `/api/social`
  - added social socket events
  - added online status broadcast
  - added conversation room join/leave

## Frontend Changes
- `frontend/src/pages/CommunityPage.jsx`
- `frontend/src/pages/MessagesPage.jsx`
- `frontend/src/app/App.jsx`
- `frontend/src/features/dashboard/components/Sidebar.jsx`

## Security / Safety
- All community and messaging APIs require auth.
- HTML tags are stripped from user content.
- Post/message/comment length limits added.
- Private conversation access checks added.
- Public rooms are controlled by server-side allow-list.
- Report logs are stored in conversation documents.

## Tested
- Backend syntax check passed.
- Frontend lint passed.
- Frontend production build passed.
- Production smoke test passed.
- Stockfish smoke test passed.

## Manual Checks After Deploy
1. Login as a normal user.
2. Open Dashboard → Community.
3. Create one post, one puzzle, and one discussion.
4. Like and comment on a post.
5. Open Dashboard → Messages.
6. Open a public room and send a message.
7. Open the same account in another browser/device and verify real-time message/typing status.
8. Test mute, block, and report buttons.

