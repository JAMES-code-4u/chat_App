# ChatVerse — Full-Stack Chat Application

A real-time chat application with video/voice calls, AI voice chatting, file sharing, and an interactive login UI.

## Screenshots

![Login Page — animated gradient background with floating particles and glassmorphism card](C:/Users/JAYESH VANIYAR/.gemini/antigravity/brain/5698efc3-0f91-413b-93a3-e35db7bb4e2b/.system_generated/click_feedback/click_feedback_1773940203354.png)

![Registration Form — smooth transition with username, email, password fields](C:/Users/JAYESH VANIYAR/.gemini/antigravity/brain/5698efc3-0f91-413b-93a3-e35db7bb4e2b/.system_generated/click_feedback/click_feedback_1773940252105.png)

![App Demo Recording](C:/Users/JAYESH VANIYAR/.gemini/antigravity/brain/5698efc3-0f91-413b-93a3-e35db7bb4e2b/chatverse_app_demo_1773940176243.webp)

## What Was Built

### Backend ([server/](file:///C:/Users/JAYESH%20VANIYAR/.gemini/antigravity/scratch/chat-app/server))
| File | Purpose |
|------|---------|
| [index.js](file:///C:/Users/JAYESH%20VANIYAR/.gemini/antigravity/scratch/chat-app/server/index.js) | Express + Socket.io server with REST API and WebRTC signaling |
| [db.js](file:///C:/Users/JAYESH%20VANIYAR/.gemini/antigravity/scratch/chat-app/server/db.js) | SQLite database with users & messages tables |
| [auth.js](file:///C:/Users/JAYESH%20VANIYAR/.gemini/antigravity/scratch/chat-app/server/auth.js) | JWT authentication for HTTP and Socket.io |

### Frontend ([client/](file:///C:/Users/JAYESH%20VANIYAR/.gemini/antigravity/scratch/chat-app/client))
| File | Purpose |
|------|---------|
| [LoginPage.jsx](file:///C:/Users/JAYESH%20VANIYAR/.gemini/antigravity/scratch/chat-app/client/src/pages/LoginPage.jsx) | Interactive login/register with animated gradient, particles, glassmorphism |
| [ChatPage.jsx](file:///C:/Users/JAYESH%20VANIYAR/.gemini/antigravity/scratch/chat-app/client/src/pages/ChatPage.jsx) | Main chat UI with sidebar, message area, call buttons, emoji picker |
| [VideoCall.jsx](file:///C:/Users/JAYESH%20VANIYAR/.gemini/antigravity/scratch/chat-app/client/src/components/VideoCall.jsx) | WebRTC video/voice calls with mute, camera toggle, PIP |
| [AIVoiceChat.jsx](file:///C:/Users/JAYESH%20VANIYAR/.gemini/antigravity/scratch/chat-app/client/src/components/AIVoiceChat.jsx) | Speech-to-text input + text-to-speech for incoming messages |
| [FileUpload.jsx](file:///C:/Users/JAYESH%20VANIYAR/.gemini/antigravity/scratch/chat-app/client/src/components/FileUpload.jsx) | Drag & drop file sharing with preview |
| [MessageBubble.jsx](file:///C:/Users/JAYESH%20VANIYAR/.gemini/antigravity/scratch/chat-app/client/src/components/MessageBubble.jsx) | Renders text, images, videos, audio, and file messages |

## Features Verified

- ✅ **Login/Register** — Interactive UI with animated gradient and glassmorphism
- ✅ **Real-time messaging** — Socket.io with typing indicators, read receipts
- ✅ **File sharing** — Drag & drop upload for images, videos, audio, zip files
- ✅ **Video/voice calls** — WebRTC with STUN servers, mute/camera toggles
- ✅ **AI voice chat** — Web Speech API speech-to-text & text-to-speech
- ✅ **Online status** — Real-time user presence tracking

## How to Run

```bash
# Terminal 1 — Backend (already running)
cd chat-app/server
node index.js          # → http://localhost:3001

# Terminal 2 — Frontend (already running)
cd chat-app/client
npm run dev            # → http://localhost:5173
```

## How to Test

1. Open **http://localhost:5173** in Chrome
2. **Register** two users in separate tabs
3. **Send messages** between them — verify real-time delivery
4. **Upload files** — drag & drop images, videos, zip files
5. **Video/voice call** — click the call buttons in the chat header
6. **AI Voice** — toggle the mic icon, speak a message, it gets transcribed and sent
