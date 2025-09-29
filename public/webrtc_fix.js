// Quick fix for the WebRTC undefined offer issue
// Add this validation to the joinRoomForRandomMatch function

// Before the line: await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
// Add this validation:

const offer = roomSnapshot.data().offer;
console.log('Got offer:', offer);

// Validate the offer before using it
if (!offer || !offer.type || !offer.sdp) {
  console.error('Invalid offer received:', offer);
  console.log('Waiting for valid offer...');
  // Wait a bit and try again
  setTimeout(() => joinRoomForRandomMatch(roomId), 2000);
  return;
}

// Then proceed with:
await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));