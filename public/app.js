// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD5GDcfOptFPkaYVgSP2WGfu6wBvfF1_pc",
  authDomain: "fir-rtc-e7764.firebaseapp.com",
  projectId: "fir-rtc-e7764",
  storageBucket: "fir-rtc-e7764.firebasestorage.app",
  messagingSenderId: "576601014687",
  appId: "1:576601014687:web:f45ea4241d8a007f3ffdaa",
  measurementId: "G-HTQCTMXXRV"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

mdc.ripple.MDCRipple.attachTo(document.querySelector('.mdc-button'));

// DEfault configuration - Change these if you have a different STUN or TURN server.
const configuration = {
  iceServers: [
    {
      urls: [
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
      ],
    },
  ],
  iceCandidatePoolSize: 10,
};

let peerConnection = null;
let localStream = null;
let remoteStream = null;
let roomDialog = null;
let roomId = null;

let currentFacingMode = 'user'; // Track current camera
let isAudioMuted = false;
let isVideoEnabled = true;

function init() {
  document.querySelector('#cameraBtn').addEventListener('click', openUserMedia);
  document.querySelector('#hangupBtn').addEventListener('click', hangUp);
  document.querySelector('#createBtn').addEventListener('click', createRoom);
  document.querySelector('#joinBtn').addEventListener('click', joinRoom);
  document.querySelector('#switchCameraBtn')?.addEventListener('click', switchCamera);
  document.querySelector('#muteBtn')?.addEventListener('click', toggleMute);
  document.querySelector('#videoToggleBtn')?.addEventListener('click', toggleVideo);
  roomDialog = new mdc.dialog.MDCDialog(document.querySelector('#room-dialog'));
}

function showCallScreen() {
  document.querySelector('#setup-screen').style.display = 'none';
  document.querySelector('#call-screen').style.display = 'block';
  document.querySelector('#call-screen').classList.add('fade-in');
}

function showSetupScreen() {
  document.querySelector('#call-screen').style.display = 'none';
  document.querySelector('#setup-screen').style.display = 'flex';
}

function toggleMute() {
  if (!localStream) return;
  
  const audioTrack = localStream.getAudioTracks()[0];
  if (audioTrack) {
    audioTrack.enabled = !audioTrack.enabled;
    isAudioMuted = !audioTrack.enabled;
    
    const muteBtn = document.querySelector('#muteBtn i');
    muteBtn.textContent = isAudioMuted ? 'mic_off' : 'mic';
    document.querySelector('#muteBtn').style.background = isAudioMuted ? '#ff4444' : 'rgba(255, 255, 255, 0.2)';
  }
}

function toggleVideo() {
  if (!localStream) return;
  
  const videoTrack = localStream.getVideoTracks()[0];
  if (videoTrack) {
    videoTrack.enabled = !videoTrack.enabled;
    isVideoEnabled = videoTrack.enabled;
    
    const videoBtn = document.querySelector('#videoToggleBtn i');
    videoBtn.textContent = isVideoEnabled ? 'videocam' : 'videocam_off';
    document.querySelector('#videoToggleBtn').style.background = isVideoEnabled ? 'rgba(255, 255, 255, 0.2)' : '#ff4444';
    
    // Hide/show local video element
    document.querySelector('#localVideo').style.opacity = isVideoEnabled ? '1' : '0.3';
  }
}

async function switchCamera() {
  if (!localStream) return;
  
  currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
  
  try {
    const videoTrack = localStream.getVideoTracks()[0];
    videoTrack.stop();
    
    const newStream = await navigator.mediaDevices.getUserMedia({
      video: { 
        facingMode: currentFacingMode,
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 }
      },
      audio: localStream.getAudioTracks().length > 0
    });
    
    const newVideoTrack = newStream.getVideoTracks()[0];
    document.querySelector('#localVideo').srcObject = newStream;
    
    // Update the stream for peer connection if active
    if (peerConnection) {
      const sender = peerConnection.getSenders().find(s => 
        s.track && s.track.kind === 'video'
      );
      if (sender) {
        await sender.replaceTrack(newVideoTrack);
      }
    }
    
    // Update local stream reference
    localStream.removeTrack(videoTrack);
    localStream.addTrack(newVideoTrack);
    
  } catch (error) {
    console.error('Error switching camera:', error);
    alert('Unable to switch camera. Your device may only have one camera.');
  }
}

async function createRoom() {
  document.querySelector('#createBtn').disabled = true;
  document.querySelector('#joinBtn').disabled = true;
  const db = firebase.firestore();

  console.log('Create PeerConnection with configuration: ', configuration);
  peerConnection = new RTCPeerConnection(configuration);

  registerPeerConnectionListeners();

  // Add local stream tracks to peer connection BEFORE creating offer
  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  // Create offer after adding tracks
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  const roomWithOffer = {
      offer: {
          type: offer.type,
          sdp: offer.sdp
      }
  }
  const roomRef = await db.collection('rooms').add(roomWithOffer);
  roomId = roomRef.id; // Store roomId globally
  
  // Show room ID in setup screen BEFORE transitioning to call screen
  document.querySelector('#currentRoom').innerHTML = `
    <div style="background: rgba(255, 255, 255, 0.9); color: #333; padding: 1rem; border-radius: 10px; margin: 1rem 0;">
      <h3 style="margin: 0 0 0.5rem 0; color: #333;">Room Created!</h3>
      <p style="margin: 0 0 0.5rem 0; color: #666;">Share this Room ID with others:</p>
      <div style="display: flex; align-items: center; gap: 10px;">
        <strong style="font-size: 1.2em; color: #333; background: rgba(0,0,0,0.1); padding: 8px 12px; border-radius: 5px; font-family: monospace;">${roomId}</strong>
        <button onclick="copyRoomId('${roomId}')" style="background: #4CAF50; color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer;">Copy</button>
      </div>
      <p style="margin: 0.5rem 0 0 0; font-size: 0.9em; color: #666;">Click "Start Call" when ready</p>
      <button onclick="startCall()" style="background: #2196F3; color: white; border: none; padding: 12px 24px; border-radius: 25px; cursor: pointer; margin-top: 10px; font-size: 1rem;">Start Call</button>
    </div>
  `;
  
  // DON'T show call screen immediately - wait for user to click "Start Call"
  
  // Set up ICE candidate collection
  peerConnection.addEventListener('icecandidate', event => {
    if (!event.candidate) {
      console.log('Got final candidate!');
      return;
    }
    console.log('Got caller candidate: ', event.candidate);
    roomRef.collection('callerCandidates').add(event.candidate.toJSON());
  });

  peerConnection.addEventListener('track', event => {
    console.log('Got remote track:', event.streams[0]);
    event.streams[0].getTracks().forEach(track => {
      console.log('Add a track to the remoteStream:', track);
      remoteStream.addTrack(track);
    });
  });

  // Listen for remote session description (answer)
  roomRef.onSnapshot(async snapshot => {
    const data = snapshot.data();
    if (!peerConnection.currentRemoteDescription && data && data.answer) {
      console.log('Got remote answer: ', data.answer);
      const rtcSessionDescription = new RTCSessionDescription(data.answer);
      await peerConnection.setRemoteDescription(rtcSessionDescription);
      document.querySelector('#call-status').textContent = 'Connected';
      setTimeout(() => {
        document.querySelector('#call-status').style.opacity = '0';
      }, 2000);
    }
  });

  // Listen for remote ICE candidates from callee
  roomRef.collection('calleeCandidates').onSnapshot(snapshot => {
    snapshot.docChanges().forEach(async change => {
      if (change.type === 'added') {
        let data = change.doc.data();
        console.log(`Got new callee ICE candidate: ${JSON.stringify(data)}`);
        await peerConnection.addIceCandidate(new RTCIceCandidate(data));
      }
    });
  });
}

// Helper function to copy room ID to clipboard
function copyRoomId(roomId) {
  navigator.clipboard.writeText(roomId).then(() => {
    // Show feedback
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = 'Copied!';
    button.style.background = '#4CAF50';
    setTimeout(() => {
      button.textContent = originalText;
      button.style.background = '#4CAF50';
    }, 2000);
  }).catch(() => {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = roomId;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = 'Copied!';
    setTimeout(() => {
      button.textContent = originalText;
    }, 2000);
  });
}

// Helper function to start the call (show call screen)
function startCall() {
  showCallScreen();
  document.querySelector('#call-status').textContent = 'Waiting for someone to join...';
}

function joinRoom() {
  document.querySelector('#createBtn').disabled = true;
  document.querySelector('#joinBtn').disabled = true;

  document.querySelector('#confirmJoinBtn').
      addEventListener('click', async () => {
        roomId = document.querySelector('#room-id').value;
        console.log('Join room: ', roomId);
        document.querySelector(
            '#currentRoom').innerText = `Current room is ${roomId} - You are the callee!`;
        await joinRoomById(roomId);
      }, {once: true});
  roomDialog.open();
}

async function joinRoomById(roomId) {
  const db = firebase.firestore();
  const roomRef = db.collection('rooms').doc(`${roomId}`);
  const roomSnapshot = await roomRef.get();
  console.log('Got room:', roomSnapshot.exists);

  if (roomSnapshot.exists) {
    // Show call screen immediately
    showCallScreen();
    document.querySelector('#call-status').textContent = 'Connecting...';
    
    console.log('Create PeerConnection with configuration: ', configuration);
    peerConnection = new RTCPeerConnection(configuration);
    registerPeerConnectionListeners();
    
    // Add local stream tracks to peer connection BEFORE processing offer
    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
    });

    // Collect ICE candidates
    peerConnection.addEventListener('icecandidate', event => {
      if (!event.candidate) {
        console.log('Got final candidate!');
        return;
      }
      console.log('Got callee candidate: ', event.candidate);
      roomRef.collection('calleeCandidates').add(event.candidate.toJSON());
    });

    peerConnection.addEventListener('track', event => {
      console.log('Got remote track:', event.streams[0]);
      event.streams[0].getTracks().forEach(track => {
        console.log('Add a track to the remoteStream:', track);
        remoteStream.addTrack(track);
      });
    });

    // Create SDP answer
    const offer = roomSnapshot.data().offer;
    console.log('Got offer:', offer);
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    console.log('Created answer:', answer);
    await peerConnection.setLocalDescription(answer);

    const roomWithAnswer = {
      answer: {
        type: answer.type,
        sdp: answer.sdp,
      },
    };
    await roomRef.update(roomWithAnswer);
    
    // Update call status
    document.querySelector('#call-status').textContent = 'Connected';
    setTimeout(() => {
      document.querySelector('#call-status').style.opacity = '0';
    }, 2000);

    // Listen for remote ICE candidates from caller
    roomRef.collection('callerCandidates').onSnapshot(snapshot => {
      snapshot.docChanges().forEach(async change => {
        if (change.type === 'added') {
          let data = change.doc.data();
          console.log(`Got new caller ICE candidate: ${JSON.stringify(data)}`);
          await peerConnection.addIceCandidate(new RTCIceCandidate(data));
        }
      });
    });
  }
}

async function openUserMedia(e) {
  // Mobile-friendly media constraints
  const constraints = {
    video: {
      width: { ideal: 1280, max: 1920 },
      height: { ideal: 720, max: 1080 },
      facingMode: 'user' // Front camera by default
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }
  };

  try {
    console.log('Requesting user media with constraints:', constraints);
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    document.querySelector('#localVideo').srcObject = stream;
    localStream = stream;
    remoteStream = new MediaStream();
    document.querySelector('#remoteVideo').srcObject = remoteStream;

    console.log('Stream:', document.querySelector('#localVideo').srcObject);
    document.querySelector('#cameraBtn').disabled = true;
    document.querySelector('#joinBtn').disabled = false;
    document.querySelector('#createBtn').disabled = false;
    
    // Show switch camera button on mobile devices
    const switchCameraBtn = document.querySelector('#switchCameraBtn');
    if (switchCameraBtn && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      switchCameraBtn.style.display = 'block';
    }
  } catch (error) {
    console.error('Error accessing media devices:', error);
    
    // Show user-friendly error message
    let errorMessage = 'Unable to access camera/microphone. ';
    if (error.name === 'NotAllowedError') {
      errorMessage += 'Please allow camera and microphone access in your browser settings.';
    } else if (error.name === 'NotFoundError') {
      errorMessage += 'No camera or microphone found on your device.';
    } else if (error.name === 'NotSupportedError') {
      errorMessage += 'Your browser does not support camera/microphone access.';
    } else {
      errorMessage += 'Make sure you are using HTTPS and have granted permissions.';
    }
    
    alert(errorMessage);
  }
}

async function hangUp(e) {
  const tracks = document.querySelector('#localVideo').srcObject?.getTracks() || [];
  tracks.forEach(track => {
    track.stop();
  });

  if (remoteStream) {
    remoteStream.getTracks().forEach(track => track.stop());
  }

  if (peerConnection) {
    peerConnection.close();
  }

  document.querySelector('#localVideo').srcObject = null;
  document.querySelector('#remoteVideo').srcObject = null;
  document.querySelector('#cameraBtn').disabled = false;
  document.querySelector('#joinBtn').disabled = true;
  document.querySelector('#createBtn').disabled = true;
  document.querySelector('#currentRoom').innerText = '';

  // Delete room on hangup
  if (roomId) {
    const db = firebase.firestore();
    const roomRef = db.collection('rooms').doc(roomId);
    const calleeCandidates = await roomRef.collection('calleeCandidates').get();
    calleeCandidates.forEach(async candidate => {
      await candidate.delete();
    });
    const callerCandidates = await roomRef.collection('callerCandidates').get();
    callerCandidates.forEach(async candidate => {
      await candidate.delete();
    });
    await roomRef.delete();
  }

  // Reset UI state
  isAudioMuted = false;
  isVideoEnabled = true;
  localStream = null;
  remoteStream = null;
  roomId = null;
  
  // Return to setup screen
  showSetupScreen();
}

function registerPeerConnectionListeners() {
  peerConnection.addEventListener('icegatheringstatechange', () => {
    console.log(
        `ICE gathering state changed: ${peerConnection.iceGatheringState}`);
  });

  peerConnection.addEventListener('connectionstatechange', () => {
    console.log(`Connection state change: ${peerConnection.connectionState}`);
  });

  peerConnection.addEventListener('signalingstatechange', () => {
    console.log(`Signaling state change: ${peerConnection.signalingState}`);
  });

  peerConnection.addEventListener('iceconnectionstatechange', () => {
    console.log(
        `ICE connection state change: ${peerConnection.iceConnectionState}`);
  });

  // Add additional debugging
  peerConnection.addEventListener('track', event => {
    console.log('Track event received:', event);
    console.log('Remote streams:', event.streams.length);
  });
}

init();
