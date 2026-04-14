const CONFIG = {
  avatarFileName: '受け取って…いただけますか…？ #神里綾華イラストコンテスト #GenshinImpact #原神 #神里綾華.jpg',
  defaultVolume: 0.45,
  volumeStep: 0.1
};

const enterScreen = document.getElementById('enterScreen');
const enterBtn = document.getElementById('enterBtn');
const layout = document.getElementById('layout');
const bgVideo = document.getElementById('bgVideo');
const bgAudio = document.getElementById('bgAudio');
const videoBg = document.getElementById('videoBg');

const currentTimeLabel = document.getElementById('currentTimeLabel');
const durationLabel = document.getElementById('durationLabel');
const musicStatusText = document.getElementById('musicStatusText');

const musicToggle = document.getElementById('musicToggle');
const musicSeek = document.getElementById('musicSeek');

const volumeSlider = document.getElementById('volumeSlider');
const volumeDown = document.getElementById('volumeDown');
const volumeUp = document.getElementById('volumeUp');
const muteToggle = document.getElementById('muteToggle');

const avatarImages = document.querySelectorAll('[data-avatar-img]');

let isSeeking = false;
let lastVolumeBeforeMute = CONFIG.defaultVolume;

function formatTime(totalSeconds) {
  const safeSeconds = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function getAudioDuration() {
  if (!bgAudio) return 0;
  return Number.isFinite(bgAudio.duration) && bgAudio.duration > 0 ? bgAudio.duration : 0;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function updateSeekBackground() {
  if (!musicSeek) return;
  const min = Number(musicSeek.min) || 0;
  const max = Number(musicSeek.max) || 100;
  const value = Number(musicSeek.value) || 0;
  const percent = ((value - min) / (max - min)) * 100;

  musicSeek.style.background = `linear-gradient(to right, rgba(255,255,255,.95) 0%, rgba(255,255,255,.95) ${percent}%, rgba(255,255,255,.08) ${percent}%, rgba(255,255,255,.08) 100%)`;
}

function updateVolumeBackground() {
  if (!volumeSlider) return;
  const min = Number(volumeSlider.min) || 0;
  const max = Number(volumeSlider.max) || 100;
  const value = Number(volumeSlider.value) || 0;
  const percent = ((value - min) / (max - min)) * 100;

  volumeSlider.style.background = `linear-gradient(to right, rgba(255,255,255,.95) 0%, rgba(255,255,255,.95) ${percent}%, rgba(255,255,255,.08) ${percent}%, rgba(255,255,255,.08) 100%)`;
}

function syncMusicUI() {
  if (!bgAudio) return;

  const duration = getAudioDuration();
  const current = Number.isFinite(bgAudio.currentTime) ? bgAudio.currentTime : 0;

  if (currentTimeLabel) currentTimeLabel.textContent = formatTime(current);
  if (durationLabel) durationLabel.textContent = formatTime(duration);

  if (musicSeek && !isSeeking) {
    const percent = duration > 0 ? (current / duration) * 100 : 0;
    musicSeek.value = String(clamp(percent, 0, 100));
    updateSeekBackground();
  }
}

function updateMusicToggle() {
  if (!musicToggle || !bgAudio) return;

  const isPlaying = !bgAudio.paused;

  musicToggle.textContent = isPlaying ? 'Pause' : 'Play';
  musicToggle.classList.toggle('playing', isPlaying);
  musicToggle.setAttribute('aria-pressed', String(isPlaying));

  if (musicStatusText) {
    musicStatusText.textContent = isPlaying ? 'Đang phát' : 'Đang dừng';
  }
}

function updateMuteButton() {
  if (!muteToggle || !bgAudio) return;

  const volume = bgAudio.muted ? 0 : bgAudio.volume;

  if (volume === 0) {
    muteToggle.textContent = '🔇';
  } else if (volume < 0.5) {
    muteToggle.textContent = '🔉';
  } else {
    muteToggle.textContent = '🔊';
  }
}

function syncVolumeUI() {
  if (!bgAudio || !volumeSlider) return;

  const volumePercent = bgAudio.muted ? 0 : Math.round(bgAudio.volume * 100);
  volumeSlider.value = String(volumePercent);
  updateVolumeBackground();
  updateMuteButton();
}

function setVolume(nextVolume) {
  if (!bgAudio) return;

  const safeVolume = clamp(nextVolume, 0, 1);
  bgAudio.volume = safeVolume;
  bgAudio.muted = safeVolume === 0;

  if (safeVolume > 0) {
    lastVolumeBeforeMute = safeVolume;
  }

  syncVolumeUI();
}

function tryPlayAudio() {
  if (!bgAudio) return;

  const playPromise = bgAudio.play();
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(() => {
      updateMusicToggle();
    });
  }
}

function tryPlayVideo() {
  if (!bgVideo) return;

  const playPromise = bgVideo.play();
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(() => {});
  }
}

function revealPage() {
  if (!enterScreen || enterScreen.classList.contains('hidden')) return;

  enterScreen.classList.add('hidden');
  tryPlayAudio();

  requestAnimationFrame(() => {
    setTimeout(() => {
      if (layout) layout.classList.add('show');
    }, 80);
  });
}

function markVideoMissing() {
  if (videoBg) videoBg.classList.add('missing');
}

function applyAvatar() {
  if (!avatarImages.length) return;

  const encodedAvatarPath = encodeURIComponent(CONFIG.avatarFileName);

  avatarImages.forEach((img) => {
    img.src = encodedAvatarPath;
    img.onerror = () => {
      img.removeAttribute('src');
      img.style.display = 'none';
    };
  });
}

function seekAudioByPercent(percent) {
  if (!bgAudio) return;

  const duration = getAudioDuration();
  if (duration <= 0) return;

  const targetTime = (clamp(percent, 0, 100) / 100) * duration;
  bgAudio.currentTime = targetTime;

  if (currentTimeLabel) {
    currentTimeLabel.textContent = formatTime(targetTime);
  }
}

function setupEvents() {
  if (enterBtn) {
    enterBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      revealPage();
    });
  }

  if (enterScreen) {
    enterScreen.addEventListener('click', revealPage);
  }

  document.addEventListener('keydown', (event) => {
    const isActivationKey = event.key === 'Enter' || event.key === ' ';
    const isScreenVisible = enterScreen && !enterScreen.classList.contains('hidden');

    if (isActivationKey && isScreenVisible) {
      event.preventDefault();
      revealPage();
    }
  });

  if (musicToggle) {
    musicToggle.addEventListener('click', () => {
      if (!bgAudio) return;

      if (bgAudio.paused) {
        tryPlayAudio();
      } else {
        bgAudio.pause();
      }

      updateMusicToggle();
    });
  }

  if (musicSeek) {
    musicSeek.addEventListener('input', () => {
      isSeeking = true;
      updateSeekBackground();
      seekAudioByPercent(Number(musicSeek.value));
    });

    musicSeek.addEventListener('change', () => {
      isSeeking = false;
      seekAudioByPercent(Number(musicSeek.value));
      updateSeekBackground();
    });

    musicSeek.addEventListener('mousedown', () => {
      isSeeking = true;
    });

    musicSeek.addEventListener('mouseup', () => {
      isSeeking = false;
    });

    musicSeek.addEventListener('touchstart', () => {
      isSeeking = true;
    }, { passive: true });

    musicSeek.addEventListener('touchend', () => {
      isSeeking = false;
    }, { passive: true });
  }

  if (volumeSlider) {
    volumeSlider.addEventListener('input', () => {
      const nextVolume = Number(volumeSlider.value) / 100;
      setVolume(nextVolume);
    });
  }

  if (volumeDown) {
    volumeDown.addEventListener('click', () => {
      if (!bgAudio) return;
      setVolume(bgAudio.muted ? Math.max(0, lastVolumeBeforeMute - CONFIG.volumeStep) : bgAudio.volume - CONFIG.volumeStep);
    });
  }

  if (volumeUp) {
    volumeUp.addEventListener('click', () => {
      if (!bgAudio) return;
      setVolume(bgAudio.muted ? Math.max(CONFIG.volumeStep, lastVolumeBeforeMute) : bgAudio.volume + CONFIG.volumeStep);
    });
  }

  if (muteToggle) {
    muteToggle.addEventListener('click', () => {
      if (!bgAudio) return;

      if (bgAudio.muted || bgAudio.volume === 0) {
        setVolume(lastVolumeBeforeMute > 0 ? lastVolumeBeforeMute : CONFIG.defaultVolume);
      } else {
        lastVolumeBeforeMute = bgAudio.volume;
        bgAudio.muted = true;
        syncVolumeUI();
      }
    });
  }

  if (bgVideo) {
    bgVideo.addEventListener('error', markVideoMissing);
    bgVideo.addEventListener('stalled', markVideoMissing);
    bgVideo.addEventListener('loadeddata', () => {
      if (videoBg) videoBg.classList.remove('missing');
    });
  }

  if (bgAudio) {
    bgAudio.addEventListener('loadedmetadata', syncMusicUI);
    bgAudio.addEventListener('durationchange', syncMusicUI);
    bgAudio.addEventListener('timeupdate', syncMusicUI);
    bgAudio.addEventListener('seeked', syncMusicUI);
    bgAudio.addEventListener('volumechange', syncVolumeUI);

    bgAudio.addEventListener('play', () => {
      syncMusicUI();
      updateMusicToggle();
    });

    bgAudio.addEventListener('pause', updateMusicToggle);

    bgAudio.addEventListener('ended', () => {
      syncMusicUI();
      updateMusicToggle();
    });
  }

  window.addEventListener('load', () => {
    applyAvatar();
    setTimeout(tryPlayVideo, 120);

    if (bgAudio) {
      bgAudio.volume = CONFIG.defaultVolume;
      bgAudio.muted = false;
    }

    syncMusicUI();
    updateMusicToggle();
    syncVolumeUI();
    updateSeekBackground();
    updateVolumeBackground();
  });
}

setupEvents();

console.assert(formatTime(0) === '00:00', 'formatTime should format zero seconds');
console.assert(formatTime(60) === '01:00', 'formatTime should format one minute');
console.assert(formatTime(75) === '01:15', 'formatTime should format minute and seconds');