const CONFIG = {
  avatarFileName: '受け取って…いただけますか…？ #神里綾華イラストコンテスト #GenshinImpact #原神 #神里綾華.jpg',
  defaultVolume: 0.45
};

const enterScreen = document.getElementById('enterScreen');
const enterBtn = document.getElementById('enterBtn');
const layout = document.getElementById('layout');
const bgVideo = document.getElementById('bgVideo');
const bgAudio = document.getElementById('bgAudio');
const videoBg = document.getElementById('videoBg');
const musicProgress = document.getElementById('musicProgress');
const currentTimeLabel = document.getElementById('currentTimeLabel');
const durationLabel = document.getElementById('durationLabel');
const musicToggle = document.getElementById('musicToggle');
const avatarImages = document.querySelectorAll('[data-avatar-img]');

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

function syncMusicUI() {
  if (!bgAudio) return;

  const duration = getAudioDuration();
  const current = Number.isFinite(bgAudio.currentTime) ? bgAudio.currentTime : 0;

  currentTimeLabel.textContent = formatTime(current);
  durationLabel.textContent = formatTime(duration);

  const progress = duration > 0 ? (current / duration) * 100 : 0;
  musicProgress.style.width = `${Math.min(100, Math.max(0, progress))}%`;
}

function updateMusicToggle() {
  if (!musicToggle || !bgAudio) return;

  const isPlaying = !bgAudio.paused;
  musicToggle.textContent = isPlaying ? '⏸ Tạm dừng' : '▶ Phát';
  musicToggle.classList.toggle('playing', isPlaying);
  musicToggle.setAttribute('aria-pressed', String(isPlaying));
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
    }

    syncMusicUI();
    updateMusicToggle();
  });
}

setupEvents();

console.assert(formatTime(0) === '00:00', 'formatTime should format zero seconds');
console.assert(formatTime(60) === '01:00', 'formatTime should format one minute');
console.assert(formatTime(75) === '01:15', 'formatTime should format minute and seconds');