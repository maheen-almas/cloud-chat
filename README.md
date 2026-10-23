# Cloud Chat Application

A real-time cloud chat app built with Next.js and Firebase, featuring secure authentication, chat rooms, and live messaging.

## Features
- Email/Password and Google sign-in (Firebase Authentication)
- Real-time messaging in chat rooms using Firestore listeners
- Room-based access, so only members can read or send messages
- Responsive design for desktop and mobile

## Tech Stack
| Layer | Technology |
|---|---|
| Frontend | Next.js, React, TypeScript |
| Authentication | Firebase Authentication |
| Database | Cloud Firestore |
| Hosting | Vercel / Firebase Hosting |

## How it works
1. The user logs in with Firebase Auth.
2. They create or join a room, stored in Firestore with a `members[]` list.
3. Messages are saved under `rooms/{roomId}/messages` and streamed to all members in real time with `onSnapshot`.

## Getting started
```bash
git clone https://github.com/maheen-almas/cloud-chat.git
cd cloud-chat
npm install
```

Create a `.env.local` file in the project root with your own Firebase config:

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

Then run:

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Security
Firestore rules allow only authenticated room members to read or write messages.