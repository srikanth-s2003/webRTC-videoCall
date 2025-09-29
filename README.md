# Firebase WebRTC Video Calling App

A WhatsApp-style video calling application built with WebRTC and Firebase Firestore for signaling.

## 🚀 **Live Demo**

**Production URL**: [https://rtccall-eight.vercel.app/](https://rtccall-eight.vercel.app/)

*Try it now! Open the link on two different devices or browser tabs to test video calling.*

## Features

- 🎥 Real-time video calling
- 🎤 Audio/video controls (mute, camera toggle)
- 📱 Mobile-responsive WhatsApp-style UI
- 🔄 Front/back camera switching on mobile
- 🔒 Secure HTTPS deployment
- 🚀 Firebase Firestore for signaling

## How to Use

1. **Open the app** in your browser
2. **Grant camera/microphone permissions**
3. **Create a room** or **join an existing room** with Room ID
4. **Share the Room ID** with the person you want to call
5. **Enjoy video calling!**

## UI Features

- **Full-screen remote video** (like WhatsApp)
- **Picture-in-picture local video** in the corner
- **Floating control buttons** for mute, video toggle, camera switch, and hang up
- **Connection status indicator**
- **Responsive design** for mobile and desktop

## Deployment

This app is deployed on **Vercel** with automatic HTTPS and global CDN.

### Deploy Your Own
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to Vercel
vercel

# Deploy to production
vercel --prod
```

### Environment Setup
- **HTTPS required** for camera/microphone access on mobile devices
- **Firebase Firestore** for real-time signaling
- **WebRTC** for peer-to-peer video communication

## Development

```bash
# Install dependencies
npm install

# Run locally
npm run dev
```

## Deployment

This app is deployed on Vercel and requires HTTPS for camera/microphone access on mobile devices.

## Technologies Used

- WebRTC for peer-to-peer video communication
- Firebase Firestore for signaling
- Material Design Components
- Responsive CSS for mobile optimization
