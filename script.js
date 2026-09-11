const CONFIG = {
  avatarFileName: '受け取って…いただけますか…？ #神里綾華イラストコンテスト #GenshinImpact #原神 #神里綾華.jpg',
  defaultVolume: 0.45,
  volumeStep: 0.1,
  visualizerFps: 24,
  mobileVisualizerBars: 16
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
const volumePopover = document.getElementById('volumePopover');

const avatarImages = [...document.querySelectorAll('[data-avatar-img]')];
const allSpectrumBars = [...document.querySelectorAll('.spectrum-bars i')];
const spectrumWrap = document.querySelector('.mini-spectrum');

const MOBILE_LITE_QUERY = window.matchMedia('(max-width: 768px), (pointer: coarse)');
const REDUCED_MOTION_QUERY = window.matchMedia('(prefers-reduced-motion: reduce)');
const IS_MOBILE_LITE = MOBILE_LITE_QUERY.matches;
const activeSpectrumBars = allSpectrumBars.slice(
  0,
  IS_MOBILE_LITE ? CONFIG.mobileVisualizerBars : allSpectrumBars.length
);

let isSeeking = false;
let lastVolumeBeforeMute = CONFIG.defaultVolume;
let visualizerFrame = 0;
let lastVisualizerPaint = 0;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatTime(totalSeconds) {
  const safeSeconds = Number.isFinite(totalSeconds)
    ? Math.max(0, Math.floor(totalSeconds))
    : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function getAudioDuration() {
  if (!bgAudio) return 0;
  return Number.isFinite(bgAudio.duration) && bgAudio.duration > 0
    ? bgAudio.duration
    : 0;
}

function setRangeProgress(input, percent) {
  if (!input) return;
  input.style.setProperty('--range-progress', `${clamp(percent, 0, 100)}%`);
}

function syncSeekUI() {
  if (!musicSeek) return;
  setRangeProgress(musicSeek, Number(musicSeek.value) || 0);
}

function syncVolumeUI() {
  if (!bgAudio || !volumeSlider) return;

  const volumePercent = bgAudio.muted ? 0 : Math.round(bgAudio.volume * 100);
  volumeSlider.value = String(volumePercent);
  setRangeProgress(volumeSlider, volumePercent);

  if (!muteToggle) return;
  muteToggle.textContent = volumePercent === 0 ? '🔇' : volumePercent < 50 ? '🔉' : '🔊';
  muteToggle.setAttribute(
    'aria-label',
    volumePercent === 0
      ? 'Đang tắt tiếng, mở chỉnh âm lượng'
      : `Âm lượng ${volumePercent}%, mở bảng điều chỉnh`
  );
}

function syncMusicUI() {
  if (!bgAudio) return;

  const duration = getAudioDuration();
  const current = Number.isFinite(bgAudio.currentTime) ? bgAudio.currentTime : 0;

  if (currentTimeLabel && !isSeeking) currentTimeLabel.textContent = formatTime(current);
  if (durationLabel) durationLabel.textContent = formatTime(duration);

  if (musicSeek && !isSeeking) {
    const percent = duration > 0 ? (current / duration) * 100 : 0;
    musicSeek.value = String(clamp(percent, 0, 100));
    syncSeekUI();
  }
}

function updateMusicToggle() {
  if (!musicToggle || !bgAudio) return;

  const isPlaying = !bgAudio.paused && !bgAudio.ended;
  musicToggle.textContent = isPlaying ? 'Pause' : 'Play';
  musicToggle.classList.toggle('playing', isPlaying);
  musicToggle.setAttribute('aria-pressed', String(isPlaying));
  musicToggle.setAttribute('aria-label', isPlaying ? 'Tạm dừng nhạc' : 'Phát nhạc');

  if (musicStatusText) musicStatusText.textContent = isPlaying ? 'Đang phát' : 'Đang dừng';
}

function setVolume(nextVolume) {
  if (!bgAudio) return;

  const safeVolume = clamp(nextVolume, 0, 1);
  bgAudio.volume = safeVolume;
  bgAudio.muted = safeVolume === 0;

  if (safeVolume > 0) lastVolumeBeforeMute = safeVolume;
  syncVolumeUI();
}

function softenVisualizer() {
  activeSpectrumBars.forEach((bar, index) => {
    const restingScale = 0.14 + ((index * 7) % 9) / 48;
    bar.style.opacity = '0.42';
    bar.style.transform = `scaleY(${restingScale.toFixed(2)})`;
  });
}

function paintVisualizer(timestamp) {
  if (!bgAudio || bgAudio.paused || bgAudio.ended || document.hidden) {
    visualizerFrame = 0;
    return;
  }

  visualizerFrame = requestAnimationFrame(paintVisualizer);

  const minInterval = 1000 / CONFIG.visualizerFps;
  if (timestamp - lastVisualizerPaint < minInterval) return;
  lastVisualizerPaint = timestamp;

  const time = bgAudio.currentTime;
  const barCount = activeSpectrumBars.length;

  activeSpectrumBars.forEach((bar, index) => {
    const position = barCount > 1 ? index / (barCount - 1) : 0.5;
    const envelope = 0.5 + Math.sin(position * Math.PI) * 0.5;
    const waveA = (Math.sin(time * 7.6 + index * 0.72) + 1) * 0.5;
    const waveB = (Math.sin(time * 3.1 + index * 1.37) + 1) * 0.5;
    const pulse = (Math.sin(time * 1.9 + index * 0.2) + 1) * 0.5;
    const level = clamp((waveA * 0.5 + waveB * 0.3 + pulse * 0.2) * envelope, 0.08, 1);
    const scale = 0.12 + Math.pow(level, 0.82) * 0.88;

    bar.style.opacity = String((0.48 + level * 0.52).toFixed(2));
    bar.style.transform = `scaleY(${scale.toFixed(2)})`;
  });
}

function startVisualizer() {
  if (visualizerFrame || !activeSpectrumBars.length || REDUCED_MOTION_QUERY.matches) return;
  spectrumWrap?.classList.add('beat-active');
  lastVisualizerPaint = 0;
  visualizerFrame = requestAnimationFrame(paintVisualizer);
}

function stopVisualizer() {
  if (visualizerFrame) cancelAnimationFrame(visualizerFrame);
  visualizerFrame = 0;
  softenVisualizer();
}

async function tryPlayAudio() {
  if (!bgAudio) return;

  bgAudio.muted = false;
  if (bgAudio.volume === 0) setVolume(lastVolumeBeforeMute || CONFIG.defaultVolume);

  try {
    await bgAudio.play();
  } catch (error) {
    console.warn('Không thể phát nhạc tự động:', error);
  } finally {
    updateMusicToggle();
  }
}

function markVideoMissing() {
  videoBg?.classList.add('missing');
}

function tryPlayVideo() {
  if (!bgVideo) return;

  const playPromise = bgVideo.play();
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(markVideoMissing);
  }
}

function revealPage() {
  if (!enterScreen || enterScreen.classList.contains('hidden')) return;

  enterScreen.classList.add('hidden');
  enterScreen.setAttribute('aria-hidden', 'true');
  document.body.classList.add('entered');

  tryPlayAudio();
  tryPlayVideo();

  requestAnimationFrame(() => layout?.classList.add('show'));
  window.setTimeout(() => {
    enterScreen.hidden = true;
  }, 700);
}

function applyAvatar() {
  if (!avatarImages.length) return;
  const encodedAvatarPath = encodeURIComponent(CONFIG.avatarFileName);

  avatarImages.forEach((img) => {
    img.decoding = 'async';
    img.src = encodedAvatarPath;
    img.addEventListener('error', () => {
      img.hidden = true;
    }, { once: true });
  });
}

function previewSeek(percent) {
  if (!musicSeek) return;
  const duration = getAudioDuration();
  setRangeProgress(musicSeek, percent);
  if (currentTimeLabel && duration > 0) {
    currentTimeLabel.textContent = formatTime((clamp(percent, 0, 100) / 100) * duration);
  }
}

function commitSeek(percent) {
  if (!bgAudio) return;
  const duration = getAudioDuration();
  if (duration <= 0) return;
  bgAudio.currentTime = (clamp(percent, 0, 100) / 100) * duration;
  syncMusicUI();
}

function closeVolumeMenu() {
  volumePopover?.classList.remove('open');
  muteToggle?.setAttribute('aria-expanded', 'false');
}

function setupEvents() {
  if (IS_MOBILE_LITE) {
    document.body.classList.add('mobile-lite-mode');
    allSpectrumBars.forEach((bar, index) => {
      if (index >= CONFIG.mobileVisualizerBars) bar.hidden = true;
    });
  }

  enterBtn?.addEventListener('click', (event) => {
    event.stopPropagation();
    revealPage();
  });
  enterScreen?.addEventListener('click', revealPage);

  document.addEventListener('keydown', (event) => {
    const screenVisible = enterScreen && !enterScreen.classList.contains('hidden');
    if (screenVisible && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      revealPage();
      return;
    }

    if (event.key === 'Escape') closeVolumeMenu();
  });

  musicToggle?.addEventListener('click', async () => {
    if (!bgAudio) return;
    if (bgAudio.paused) await tryPlayAudio();
    else bgAudio.pause();
  });

  musicSeek?.addEventListener('pointerdown', () => {
    isSeeking = true;
  });
  musicSeek?.addEventListener('input', () => {
    isSeeking = true;
    previewSeek(Number(musicSeek.value));
  });
  musicSeek?.addEventListener('change', () => {
    isSeeking = false;
    commitSeek(Number(musicSeek.value));
  });
  musicSeek?.addEventListener('pointerup', () => {
    isSeeking = false;
    commitSeek(Number(musicSeek.value));
  });
  musicSeek?.addEventListener('blur', () => {
    isSeeking = false;
    syncMusicUI();
  });

  volumeSlider?.addEventListener('input', () => {
    setVolume(Number(volumeSlider.value) / 100);
  });
  volumeDown?.addEventListener('click', () => {
    if (!bgAudio) return;
    const currentVolume = bgAudio.muted ? lastVolumeBeforeMute : bgAudio.volume;
    setVolume(currentVolume - CONFIG.volumeStep);
  });
  volumeUp?.addEventListener('click', () => {
    if (!bgAudio) return;
    const currentVolume = bgAudio.muted ? 0 : bgAudio.volume;
    setVolume(currentVolume + CONFIG.volumeStep);
  });

  muteToggle?.setAttribute('aria-expanded', 'false');
  muteToggle?.addEventListener('click', (event) => {
    event.stopPropagation();
    if (!volumePopover) return;
    const isOpen = volumePopover.classList.toggle('open');
    muteToggle.setAttribute('aria-expanded', String(isOpen));
  });
  muteToggle?.addEventListener('dblclick', (event) => {
    event.stopPropagation();
    if (!bgAudio) return;

    if (bgAudio.muted || bgAudio.volume === 0) {
      setVolume(lastVolumeBeforeMute || CONFIG.defaultVolume);
    } else {
      lastVolumeBeforeMute = bgAudio.volume;
      bgAudio.muted = true;
      syncVolumeUI();
    }
  });

  volumePopover?.addEventListener('click', (event) => event.stopPropagation());
  volumePopover?.addEventListener('focusout', (event) => {
    if (!volumePopover.contains(event.relatedTarget)) closeVolumeMenu();
  });
  document.addEventListener('click', closeVolumeMenu);

  bgVideo?.addEventListener('error', markVideoMissing);
  bgVideo?.addEventListener('loadeddata', () => videoBg?.classList.remove('missing'));

  if (bgAudio) {
    bgAudio.addEventListener('loadedmetadata', syncMusicUI);
    bgAudio.addEventListener('durationchange', syncMusicUI);
    bgAudio.addEventListener('timeupdate', syncMusicUI);
    bgAudio.addEventListener('seeked', syncMusicUI);
    bgAudio.addEventListener('volumechange', syncVolumeUI);
    bgAudio.addEventListener('play', () => {
      startVisualizer();
      syncMusicUI();
      updateMusicToggle();
    });
    bgAudio.addEventListener('pause', () => {
      stopVisualizer();
      updateMusicToggle();
    });
    bgAudio.addEventListener('ended', () => {
      stopVisualizer();
      syncMusicUI();
      updateMusicToggle();
    });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (bgVideo && !bgVideo.paused) bgVideo.pause();
      if (visualizerFrame) {
        cancelAnimationFrame(visualizerFrame);
        visualizerFrame = 0;
      }
      return;
    }

    if (document.body.classList.contains('entered')) tryPlayVideo();
    if (bgAudio && !bgAudio.paused) startVisualizer();
  });
}

function init() {
  applyAvatar();
  setupEvents();
  tryPlayVideo();

  if (bgAudio) {
    bgAudio.volume = CONFIG.defaultVolume;
    bgAudio.muted = false;
  }

  syncMusicUI();
  updateMusicToggle();
  syncVolumeUI();
  syncSeekUI();
  softenVisualizer();
}

init();

console.assert(formatTime(0) === '00:00', 'formatTime should format zero seconds');
console.assert(formatTime(60) === '01:00', 'formatTime should format one minute');
console.assert(formatTime(75) === '01:15', 'formatTime should format minute and seconds');
