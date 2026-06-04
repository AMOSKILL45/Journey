import { SOUND_CATEGORY, soundAssets, type SoundId } from './soundManifest';
import { useFeedbackSettings } from './store/feedbackSettings';

let suppressed = false;
export function setAudioSuppressed(v: boolean): void {
  suppressed = v;
}

interface AudioPlayerLike {
  play: () => void;
  remove: () => void;
  volume: number;
  loop: boolean;
}
interface AudioModule {
  createAudioPlayer: (source: number) => AudioPlayerLike;
}
function loadAudio(): AudioModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy on purpose: a build without expo-audio must no-op, not crash at import (spec ADR 6C-5)
    return require('expo-audio') as AudioModule;
  } catch {
    return null; // native module absent on this build → silent (crash-safe)
  }
}

export function playSfx(id: SoundId): void {
  if (suppressed) return;
  const asset = soundAssets[id];
  if (asset === undefined) return; // no file yet
  const s = useFeedbackSettings.getState();
  const enabled = SOUND_CATEGORY[id] === 'event' ? s.sfxEnabled : s.uiSoundsEnabled;
  if (!enabled) return;
  const audio = loadAudio();
  if (!audio) return;
  try {
    const player = audio.createAudioPlayer(asset);
    player.volume = s.masterVolume;
    player.play();
  } catch {
    /* ignore playback errors */
  }
}

let musicPlayer: AudioPlayerLike | null = null;
export function playMusic(asset: number): void {
  const s = useFeedbackSettings.getState();
  if (!s.musicEnabled) return;
  const audio = loadAudio();
  if (!audio) return;
  try {
    stopMusic();
    const player = audio.createAudioPlayer(asset);
    player.loop = true;
    player.volume = s.masterVolume;
    player.play();
    musicPlayer = player;
  } catch {
    /* ignore */
  }
}

export function stopMusic(): void {
  try {
    musicPlayer?.remove();
  } catch {
    /* ignore */
  }
  musicPlayer = null;
}
