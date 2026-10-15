import { Room, RoomEvent, Track } from 'livekit-client';

let room = null;

export async function connectAudio({
  url,
  token,
  onPermissionChange,
  onSpeakersChange,
  onAudioBlockedChange
}) {
  if (room) {
    room.disconnect();
    room = null;
  }

  const current = new Room({ adaptiveStream: true, dynacast: true });
  room = current;

  current
    .on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind === Track.Kind.Audio) {
        const el = track.attach();
        el.setAttribute('data-lk-audio', '1');
        document.body.appendChild(el);
      }
    })
    .on(RoomEvent.TrackUnsubscribed, (track) => {
      track.detach().forEach((el) => el.remove());
    })
    .on(RoomEvent.ParticipantPermissionsChanged, (_prev, participant) => {
      if (participant.identity === current.localParticipant.identity) {
        onPermissionChange?.(!!participant.permissions?.canPublish);
      }
    })
    .on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      onSpeakersChange?.(speakers.map((s) => s.identity));
    })
    .on(RoomEvent.AudioPlaybackStatusChanged, () => {
      onAudioBlockedChange?.(!current.canPlaybackAudio);
    });

  await current.connect(url, token);
  onAudioBlockedChange?.(!current.canPlaybackAudio);
  return current;
}

export async function setMic(enabled) {
  if (!room) throw new Error('Audio not connected');
  await room.localParticipant.setMicrophoneEnabled(enabled);
}

// Browsers block autoplay until a user gesture (e.g. after a page refresh)
export async function startAudioPlayback() {
  if (room) await room.startAudio();
}

export function disconnectAudio() {
  if (room) {
    room.disconnect();
    room = null;
  }
  document.querySelectorAll('audio[data-lk-audio]').forEach((el) => el.remove());
}