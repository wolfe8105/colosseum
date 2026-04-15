/**
 * THE MODERATOR — Voice Memo Player
 * renderPlayer, playInline, togglePlayback.
 */

import { escapeHTML } from './config.ts';

let isPlayingState = false;

export function renderPlayer(voiceUrl: string, duration: number): string {
  const id = 'vmp-' + Math.random().toString(36).slice(2, 8);
  const min = Math.floor(duration / 60);
  const sec = String(duration % 60).padStart(2, '0');
  const safeUrl = escapeHTML(voiceUrl);

  return `
    <div class="vm-inline-player" data-player-id="${id}" style="
      display:flex;align-items:center;gap:10px;
      background:#132240; /* TODO: needs CSS var token */border:1px solid var(--mod-accent-muted);
      border-radius:10px;padding:10px 12px;margin-top:8px;
    ">
      <button data-action="play-inline" data-player="${id}" style="
        width:40px;height:40px;border-radius:50%;
        background:var(--mod-accent);border:none;color:var(--mod-bg-base);
        font-size:16px;cursor:pointer;display:flex;
        align-items:center;justify-content:center;flex-shrink:0;
        -webkit-tap-highlight-color:transparent;
      " id="${id}-btn">▶</button>
      <div style="flex:1;">
        <div style="font-size:11px;color:var(--mod-text-sub);letter-spacing:0.5px;">🎤 VOICE TAKE</div>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:14px;color:var(--mod-text-heading);letter-spacing:1px;">${min}:${sec}</div>
      </div>
      <audio id="${id}" src="${safeUrl}" preload="metadata" style="display:none;"></audio>
    </div>
  `;
}

export function playInline(id: string): void {
  const audio = document.getElementById(id) as HTMLAudioElement | null;
  const btn = document.getElementById(id + '-btn');
  if (!audio || !btn) return;

  if (audio.paused) {
    document.querySelectorAll('.vm-inline-player audio').forEach(a => {
      const el = a as HTMLAudioElement;
      if (el.id !== id) { el.pause(); el.currentTime = 0; }
    });
    document.querySelectorAll('.vm-inline-player button').forEach(b => { b.textContent = '▶'; });
    void audio.play();
    btn.textContent = '⏸';
    audio.onended = () => { btn.textContent = '▶'; };
  } else {
    audio.pause();
    audio.currentTime = 0;
    btn.textContent = '▶';
  }
}

export function togglePlayback(): void {
  const audioEl = document.getElementById('vm-audio-preview') as HTMLAudioElement | null;
  const playBtn = document.getElementById('vm-play-btn');
  if (!audioEl) return;

  if (isPlayingState) {
    audioEl.pause();
    audioEl.currentTime = 0;
    isPlayingState = false;
    if (playBtn) playBtn.textContent = '▶';
  } else {
    void audioEl.play();
    isPlayingState = true;
    if (playBtn) playBtn.textContent = '⏸';
    audioEl.onended = () => {
      isPlayingState = false;
      if (playBtn) playBtn.textContent = '▶';
    };
  }
}

export function resetPlayingState(): void {
  isPlayingState = false;
}
