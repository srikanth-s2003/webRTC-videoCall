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

// Theme toggle functionality
function initTheme() {
  const themeToggle = document.querySelector('#themeToggle');
  const savedTheme = localStorage.getItem('theme') || 'light';
  
  // Apply saved theme
  document.body.className = savedTheme + '-theme';
  
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const currentTheme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      
      document.body.className = newTheme + '-theme';
      localStorage.setItem('theme', newTheme);
      
      // Update icon
      const icon = themeToggle.querySelector('i');
      if (icon) {
        icon.textContent = newTheme === 'light' ? 'dark_mode' : 'light_mode';
      }
    });
    
    // Set initial icon
    const icon = themeToggle.querySelector('i');
    if (icon) {
      icon.textContent = savedTheme === 'light' ? 'dark_mode' : 'light_mode';
    }
  }
}

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
  console.log('Starting initialization...');
  
  // Initialize theme
  initTheme();
  
  console.log('Initializing event listeners...');
  
  // Debug: Check if elements exist
  const hangupBtn = document.querySelector('#hangupBtn');
  const createBtn = document.querySelector('#createBtn');
  const joinBtn = document.querySelector('#joinBtn');
  const randomMatchBtn = document.querySelector('#randomMatchBtn');
  
  console.log('Button elements found:', {
    hangupBtn: !!hangupBtn,
    createBtn: !!createBtn,
    joinBtn: !!joinBtn,
    randomMatchBtn: !!randomMatchBtn
  });
  
  if (hangupBtn) {
    hangupBtn.addEventListener('click', hangUp);
    console.log('Added hangup event listener');
  }
  if (createBtn) {
    createBtn.addEventListener('click', createRoom);
    console.log('Added create room event listener');
  }
  if (joinBtn) {
    joinBtn.addEventListener('click', joinRoom);
    console.log('Added join room event listener');
  }
  if (randomMatchBtn) {
    randomMatchBtn.addEventListener('click', findRandomMatch);
    console.log('Added random match event listener');
  }
  
  // Add confirm join button listener
  const confirmJoinBtn = document.querySelector('#confirmJoinBtn');
  if (confirmJoinBtn) {
    confirmJoinBtn.addEventListener('click', () => {
      const roomId = document.querySelector('#room-id').value.trim();
      if (roomId) {
        joinRoomById(roomId);
        // Close modal
        if (roomDialog && typeof roomDialog.hide === 'function') {
          roomDialog.hide();
        }
      }
    });
    console.log('Added confirm join event listener');
  }
  
  document.querySelector('#nextChatBtn')?.addEventListener('click', nextChat);
  document.querySelector('#switchCameraBtn')?.addEventListener('click', switchCamera);
  document.querySelector('#muteBtn')?.addEventListener('click', toggleMute);
  document.querySelector('#videoToggleBtn')?.addEventListener('click', toggleVideo);
  
  // Initialize Bootstrap modal safely
  try {
    if (typeof bootstrap !== 'undefined') {
      roomDialog = new bootstrap.Modal(document.querySelector('#room-dialog'));
    } else {
      console.error('Bootstrap not loaded');
      // Fallback - just use the modal element
      roomDialog = document.querySelector('#room-dialog');
    }
  } catch (error) {
    console.error('Error initializing modal:', error);
    roomDialog = document.querySelector('#room-dialog');
  }
  
  console.log('Event listeners initialized successfully');
}

function showCallScreen() {
  console.log('Switching to call screen');
  // Force hide setup screen
  const setupScreen = document.querySelector('#setup-screen');
  if (setupScreen) {
    setupScreen.style.display = 'none';
    setupScreen.style.visibility = 'hidden';
  }
  
  // Force show call screen
  const callScreen = document.querySelector('#call-screen');
  if (callScreen) {
    callScreen.style.display = 'block';
    callScreen.style.visibility = 'visible';
    callScreen.classList.add('fade-in');
  }
  
  console.log('Call screen should now be visible');
}

function showSetupScreen() {
  console.log('🏠 SHOWING SETUP SCREEN - Switching to setup screen');
  
  // Force hide call screen
  const callScreen = document.querySelector('#call-screen');
  if (callScreen) {
    console.log('Hiding call screen...');
    callScreen.style.display = 'none';
    callScreen.style.visibility = 'hidden';
    callScreen.classList.remove('fade-in');
  } else {
    console.error('Call screen element not found!');
  }
  
  // Force show setup screen
  const setupScreen = document.querySelector('#setup-screen');
  if (setupScreen) {
    console.log('Showing setup screen...');
    setupScreen.style.display = 'flex';
    setupScreen.style.visibility = 'visible';
  } else {
    console.error('Setup screen element not found!');
  }
  
  console.log('✅ Setup screen should now be visible');
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
  console.log('createRoom function called');
  document.querySelector('#createBtn').disabled = true;
  document.querySelector('#joinBtn').disabled = true;
  
  // Get camera access first if we don't have it
  if (!localStream) {
    try {
      await openUserMedia();
    } catch (error) {
      // Reset button state and return
      document.querySelector('#createBtn').disabled = false;
      document.querySelector('#joinBtn').disabled = false;
      return;
    }
  }
  
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
  document.querySelector('#currentRoom').style.display='block';
  document.querySelector('#currentRoom').innerHTML = `
    <div style="background: rgba(255, 255, 255, 0.9); color: #333; padding: 1rem; border-radius: 10px; margin: 1rem 0;">
      <h3 style="margin: 0 0 0.5rem 0; color: #333;">Room Created!</h3>
      <p style="margin: 0 0 0.5rem 0; color: #666;">Share this Room ID with others:</p>
      <div style="display: flex; align-items: center; gap: 10px;">
        <strong style="font-size: 1.2em; color: #333; background: rgba(0,0,0,0.1); padding: 8px 12px; border-radius: 5px; font-family: monospace;">${roomId}</strong>
        <button onclick="copyRoomId('${roomId}', event)" style="background: #4CAF50; color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer;">Copy</button>
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
function copyRoomId(roomId, event) {
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
  console.log('joinRoom function called');
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
      
  // Show modal with fallback
  try {
    if (roomDialog && typeof roomDialog.show === 'function') {
      roomDialog.show();
    } else if (typeof bootstrap !== 'undefined') {
      const modal = new bootstrap.Modal(document.querySelector('#room-dialog'));
      modal.show();
    } else {
      // Fallback: show modal manually
      const modalElement = document.querySelector('#room-dialog');
      modalElement.style.display = 'block';
      modalElement.classList.add('show');
    }
  } catch (error) {
    console.error('Error showing modal:', error);
    alert('Enter room ID:');
  }
}

async function joinRoomById(roomId) {
  // Get camera access first if we don't have it
  if (!localStream) {
    try {
      await openUserMedia();
    } catch (error) {
      // Reset button state and return
      document.querySelector('#createBtn').disabled = false;
      document.querySelector('#joinBtn').disabled = false;
      return;
    }
  }
  
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
    
    // Show switch camera button on mobile devices
    const switchCameraBtn = document.querySelector('#switchCameraBtn');
    if (switchCameraBtn && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      switchCameraBtn.style.display = 'block';
    }
  } catch (error) {
    console.error('Error accessing media devices:', error);
    throw error; // Re-throw so calling functions can handle it
  }
}

async function hangUp(e) {
  console.log('🔴 HANGUP BUTTON CLICKED - Starting hangup process...');
  
  // Stop all local tracks
  if (localStream) {
    console.log('Stopping local stream tracks...');
    localStream.getTracks().forEach(track => {
      track.stop();
    });
  }

  // Stop all remote tracks
  if (remoteStream) {
    console.log('Stopping remote stream tracks...');
    remoteStream.getTracks().forEach(track => track.stop());
  }

  // Close peer connection
  if (peerConnection) {
    console.log('Closing peer connection...');
    peerConnection.close();
    peerConnection = null;
  }

  // Clear video elements
  const localVideo = document.querySelector('#localVideo');
  const remoteVideo = document.querySelector('#remoteVideo');
  if (localVideo) localVideo.srcObject = null;
  if (remoteVideo) remoteVideo.srcObject = null;
  
  // Reset streams
  localStream = null;
  remoteStream = null;
  
  // Reset room state
  roomId = null;
  isWaitingForMatch = false;
  
  console.log('🏠 Calling showSetupScreen() to return to home...');
  // Properly return to setup screen
  showSetupScreen();
  
  // Reset current room display
  const currentRoom = document.querySelector('#currentRoom');
  if (currentRoom) {
    currentRoom.style.display = 'none';
    currentRoom.innerHTML = '';
  }
  
  // Reset random match button
  const randomMatchBtn = document.querySelector('#randomMatchBtn');
  if (randomMatchBtn) {
    randomMatchBtn.innerHTML = '<i class="material-icons me-2">shuffle</i><span>Start Random Chat</span>';
  }
  
  // Re-enable buttons
  const createBtn = document.querySelector('#createBtn');
  const joinBtn = document.querySelector('#joinBtn');
  if (createBtn) createBtn.disabled = false;
  if (joinBtn) joinBtn.disabled = false;
  
  console.log('✅ Call ended successfully - should be back on home screen');

  // Delete room on hangup (do this before resetting roomId)
  const currentRoomId = roomId;
  if (currentRoomId) {
    try {
      const db = firebase.firestore();
      const roomRef = db.collection('rooms').doc(currentRoomId);
      const calleeCandidates = await roomRef.collection('calleeCandidates').get();
      calleeCandidates.forEach(async candidate => {
        await candidate.delete();
      });
      const callerCandidates = await roomRef.collection('callerCandidates').get();
      callerCandidates.forEach(async candidate => {
        await candidate.delete();
      });
      await roomRef.delete();
      console.log('Room cleaned up successfully');
    } catch (error) {
      console.error('Error cleaning up room:', error);
    }
  }

  // Clean up random match state
  if (isWaitingForMatch) {
    cancelRandomMatch();
  }
  
  // Reset final UI state
  isAudioMuted = false;
  isVideoEnabled = true;
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

// Random matching functionality
let isWaitingForMatch = false;
let matchListener = null;
let waitingPoolListener = null;

async function findRandomMatch() {
  console.log('findRandomMatch function called');
  if (isWaitingForMatch) {
    cancelRandomMatch();
    return;
  }

  // Get camera access first if we don't have it
  if (!localStream) {
    try {
      await openUserMedia();
    } catch (error) {
      // Reset button state and return
      const randomMatchBtn = document.querySelector('#randomMatchBtn');
      randomMatchBtn.innerHTML = '<i class="material-icons">shuffle</i><span>Start Random Chat</span>';
      return;
    }
  }

  isWaitingForMatch = true;
  const randomMatchBtn = document.querySelector('#randomMatchBtn');
  randomMatchBtn.innerHTML = '<i class="material-icons mdc-button__icon">close</i><span class="mdc-button__label">Cancel search</span>';
  
  // Show waiting status
  document.querySelector('#currentRoom').style.display = 'block';
  document.querySelector('#currentRoom').innerHTML = `
    <div style="background: rgba(255, 193, 7, 0.15); border: 1px solid rgba(255, 193, 7, 0.3); color: #333; padding: 1.5rem; border-radius: 15px; margin: 1rem 0; backdrop-filter: blur(10px);">
      <h3 style="margin: 0 0 0.5rem 0; color: #fff; display: flex; align-items: center; gap: 0.5rem;">
        <span style="font-size: 1.2rem;">🔍</span> Searching for a stranger...
      </h3>
      <p style="margin: 0; color: rgba(255,255,255,0.8);">Please wait while we connect you with someone</p>
      <div style="margin-top: 15px;">
        <div style="width: 100%; height: 3px; background: rgba(255,255,255,0.2); border-radius: 2px; overflow: hidden;">
          <div style="width: 100%; height: 100%; background: linear-gradient(90deg, transparent, #4ecdc4, transparent); animation: loading 1.5s infinite;"></div>
        </div>
      </div>
    </div>
  `;

  const firestore = firebase.firestore();
  const waitingPool = firestore.collection('waitingPool');
  
  try {
    // First, check if there's anyone already waiting
    const waitingUsers = await waitingPool.get();
    
    if (!waitingUsers.empty && waitingUsers.docs.length > 0) {
      // Found someone waiting, match with them
      const otherUser = waitingUsers.docs[0];
      const otherUserId = otherUser.id;
      
      // Remove the other user from waiting pool
      await waitingPool.doc(otherUserId).delete();
      
      // Create a room and start as caller
      roomId = Math.random().toString(36).substring(2, 15);
      const roomRef = firestore.collection('rooms').doc(roomId);
      
      // Notify the other user about the match
      await roomRef.set({
        caller: 'current-user',
        callee: otherUserId,
        created: firebase.firestore.FieldValue.serverTimestamp(),
        randomMatch: true
      });
      
      showMatchFound();
      createRoomForRandomMatch(roomId);
      
    } else {
      // No one waiting, add ourselves to the waiting pool
      const currentUserId = Math.random().toString(36).substring(2, 15);
      await waitingPool.doc(currentUserId).set({
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        status: 'waiting'
      });
      
      // Listen for when someone matches with us
      waitingPoolListener = waitingPool.doc(currentUserId).onSnapshot(async (doc) => {
        if (!doc.exists && isWaitingForMatch) {
          // We were removed from waiting pool, someone matched with us
          // Listen for room creation
          const roomsRef = firestore.collection('rooms');
          matchListener = roomsRef.where('callee', '==', currentUserId)
            .onSnapshot(async (snapshot) => {
              snapshot.docChanges().forEach(async (change) => {
                if (change.type === 'added' && change.doc.data().randomMatch) {
                  roomId = change.doc.id;
                  showMatchFound();
                  joinRoomForRandomMatch(roomId);
                  if (matchListener) {
                    matchListener();
                    matchListener = null;
                  }
                }
              });
            });
        }
      });
    }
  } catch (error) {
    console.error('Error in random matching:', error);
    cancelRandomMatch();
    alert('Error finding a match. Please try again.');
  }
}

function showMatchFound() {
  console.log('Showing match found message');
  document.querySelector('#currentRoom').innerHTML = `
    <div style="background: rgba(76, 175, 80, 0.15); border: 1px solid rgba(76, 175, 80, 0.3); color: var(--text-primary); padding: 1.5rem; border-radius: 15px; margin: 1rem 0; backdrop-filter: blur(10px);">
      <h3 style="margin: 0 0 0.5rem 0; display: flex; align-items: center; gap: 0.5rem;">
        <span style="font-size: 1.2rem;">🎉</span> Stranger found!
      </h3>
      <p style="margin: 0; color: var(--text-secondary);">Connecting you now...</p>
    </div>
  `;
}

function cancelRandomMatch() {
  isWaitingForMatch = false;
  const randomMatchBtn = document.querySelector('#randomMatchBtn');
  randomMatchBtn.innerHTML = '<i class="material-icons mdc-button__icon">shuffle</i><span class="mdc-button__label">Random match</span>';
  
  document.querySelector('#currentRoom').style.display = 'none';
  
  // Clean up listeners
  if (waitingPoolListener) {
    waitingPoolListener();
    waitingPoolListener = null;
  }
  if (matchListener) {
    matchListener();
    matchListener = null;
  }
}

async function createRoomForRandomMatch(roomId) {
  console.log('Creating room for random match:', roomId);
  const firestore = firebase.firestore();
  const roomRef = firestore.collection('rooms').doc(roomId);
  
  console.log('Create PeerConnection with configuration: ', configuration);
  peerConnection = new RTCPeerConnection(configuration);

  registerPeerConnectionListeners();

  // Add local stream tracks to peer connection
  console.log('Adding local stream tracks');
  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  // Handle incoming tracks - THIS IS THE KEY FIX
  peerConnection.addEventListener('track', event => {
    console.log('Got remote track:', event.streams[0]);
    const [remoteStream] = event.streams;
    document.querySelector('#remoteVideo').srcObject = remoteStream;
    
    // Update call status when we get video
    document.querySelector('#call-status').textContent = 'Connected';
    setTimeout(() => {
      document.querySelector('#call-status').style.opacity = '0';
    }, 2000);
  });

  // Collect ICE candidates
  const callerCandidatesCollection = roomRef.collection('callerCandidates');
  peerConnection.addEventListener('icecandidate', event => {
    if (!event.candidate) {
      console.log('Got final candidate!');
      return;
    }
    console.log('Got caller candidate: ', event.candidate);
    callerCandidatesCollection.add(event.candidate.toJSON());
  });

  // Create and set offer
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  console.log('Created offer:', offer);

  const roomWithOffer = {
    'offer': {
      type: offer.type,
      sdp: offer.sdp,
    },
  };
  
  console.log('Updating room with offer:', roomWithOffer);
  await roomRef.update(roomWithOffer);
  console.log('Room updated successfully');

  // Listen for remote session description (answer)
  roomRef.onSnapshot(async snapshot => {
    const data = snapshot.data();
    if (!peerConnection.currentRemoteDescription && data && data.answer) {
      console.log('Got remote answer: ', data.answer);
      const rtcSessionDescription = new RTCSessionDescription(data.answer);
      await peerConnection.setRemoteDescription(rtcSessionDescription);
    }
  });

  // Listen for remote ICE candidates
  roomRef.collection('calleeCandidates').onSnapshot(snapshot => {
    snapshot.docChanges().forEach(async change => {
      if (change.type === 'added') {
        let data = change.doc.data();
        console.log(`Got new callee ICE candidate: ${JSON.stringify(data)}`);
        await peerConnection.addIceCandidate(new RTCIceCandidate(data));
      }
    });
  });
  
  console.log('About to show call screen from createRoom');
  showCallScreen();
  document.querySelector('#call-status').textContent = 'Connecting...';
  console.log('Call screen should now be visible from createRoom');
}

async function joinRoomForRandomMatch(roomId) {
  console.log('Starting to join room for random match:', roomId);
  const firestore = firebase.firestore();
  const roomRef = firestore.collection('rooms').doc(roomId);
  
  try {
    const roomSnapshot = await roomRef.get();
    console.log('Got room:', roomSnapshot.exists);

    if (roomSnapshot.exists) {
      const roomData = roomSnapshot.data();
      console.log('Room data:', roomData);
      
      // Check if offer exists before proceeding
      if (!roomData || !roomData.offer) {
        console.log('Offer not ready yet, waiting...');
        // Wait a bit and try again
        setTimeout(() => joinRoomForRandomMatch(roomId), 1000);
        return;
      }
      
      console.log('Room exists, creating peer connection');
      console.log('Create PeerConnection with configuration: ', configuration);
      peerConnection = new RTCPeerConnection(configuration);
      registerPeerConnectionListeners();
    
    // Add local stream tracks to peer connection
    console.log('Adding local stream tracks');
    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
    });

    // Collect ICE candidates
    const calleeCandidatesCollection = roomRef.collection('calleeCandidates');
    peerConnection.addEventListener('icecandidate', event => {
      if (!event.candidate) {
        console.log('Got final candidate!');
        return;
      }
      console.log('Got callee candidate: ', event.candidate);
      calleeCandidatesCollection.add(event.candidate.toJSON());
    });

    // Handle incoming tracks
    peerConnection.addEventListener('track', event => {
      console.log('Got remote track:', event.streams[0]);
      const [remoteStream] = event.streams;
      document.querySelector('#remoteVideo').srcObject = remoteStream;
      
      // Update call status when we get video
      document.querySelector('#call-status').textContent = 'Connected';
      setTimeout(() => {
        document.querySelector('#call-status').style.opacity = '0';
      }, 2000);
    });

    // Create SDP answer
    const offer = roomSnapshot.data().offer;
    console.log('Got offer:', offer);
    
    // Validate the offer before using it
    if (!offer || !offer.type || !offer.sdp) {
      console.error('Invalid offer received:', offer);
      console.log('Waiting for valid offer and retrying...');
      // Wait and retry
      setTimeout(() => {
        joinRoomForRandomMatch(roomId);
      }, 2000);
      return;
    }
    
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
    
    console.log('About to show call screen');
    showCallScreen();
    document.querySelector('#call-status').textContent = 'Connecting...';
    console.log('Call screen should now be visible');
  } else {
    console.error('Room does not exist!');
  }
  } catch (error) {
    console.error('Error in joinRoomForRandomMatch:', error);
    cancelRandomMatch();
  }
}

// Next chat functionality (like Omegle)
async function nextChat() {
  // Hang up current call
  await hangUp();
  
  // Wait a moment for cleanup
  setTimeout(() => {
    // Automatically start a new random match
    findRandomMatch();
  }, 500);
}

document.addEventListener('DOMContentLoaded', () => {
  init();
});
