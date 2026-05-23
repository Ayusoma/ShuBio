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
const spectrumTimeLabel = document.getElementById('spectrumTimeLabel');

const musicToggle = document.getElementById('musicToggle');
const musicSeek = document.getElementById('musicSeek');

const volumeSlider = document.getElementById('volumeSlider');
const volumeDown = document.getElementById('volumeDown');
const volumeUp = document.getElementById('volumeUp');
const muteToggle = document.getElementById('muteToggle');
const volumePopover = document.getElementById('volumePopover');

const avatarImages = document.querySelectorAll('[data-avatar-img]');
const spectrumBars = document.querySelectorAll('.spectrum-bars i');
const spectrumWrap = document.querySelector('.mini-spectrum');

let isSeeking = false;
let lastVolumeBeforeMute = CONFIG.defaultVolume;

let visualizerFrame = 0;
let smoothedLevels = [];
let beatBuffer = null;
let beatDataReady = false;
let beatDataLoading = false;
let beatFallbackActive = false;
let lastFallbackKick = 0;

const AUDIO_FILE_NAME = 'VienPhanMem.com_7504256092592065800.mp3';

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

  musicSeek.style.background = `linear-gradient(to right, #1db954 0%, #1db954 ${percent}%, rgba(255,255,255,.12) ${percent}%, rgba(255,255,255,.12) 100%)`;
}

function updateVolumeBackground() {
  if (!volumeSlider) return;
  const min = Number(volumeSlider.min) || 0;
  const max = Number(volumeSlider.max) || 100;
  const value = Number(volumeSlider.value) || 0;
  const percent = ((value - min) / (max - min)) * 100;

  volumeSlider.style.background = `linear-gradient(to top, #1db954 0%, #1db954 ${percent}%, rgba(255,255,255,.14) ${percent}%, rgba(255,255,255,.14) 100%)`;
}

function syncMusicUI() {
  if (!bgAudio) return;

  const duration = getAudioDuration();
  const current = Number.isFinite(bgAudio.currentTime) ? bgAudio.currentTime : 0;

  if (currentTimeLabel) currentTimeLabel.textContent = formatTime(current);
  if (durationLabel) durationLabel.textContent = formatTime(duration);
  if (spectrumTimeLabel) spectrumTimeLabel.textContent = formatTime(current).replace(/^0/, '');

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

async function tryPlayAudio() {
  if (!bgAudio) return;

  /*
    Bản an toàn âm thanh:
    KHÔNG dùng createMediaElementSource nữa vì nó có thể làm Chrome phát UI
    nhưng không ra tiếng trên một số máy / khi mở file local.
    Nhạc vẫn chạy trực tiếp bằng <audio>, visualizer chỉ đọc dữ liệu mp3
    riêng để dựng sóng nên không thể làm mất tiếng.
  */
  bgAudio.muted = false;
  if (bgAudio.volume === 0) setVolume(lastVolumeBeforeMute || CONFIG.defaultVolume);

  try {
    await bgAudio.play();
    initBeatData();
    startBeatVisualizer();
  } catch (error) {
    console.warn('Không thể phát nhạc:', error);
    updateMusicToggle();
    startFallbackVisualizer();
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



async function initBeatData() {
  if (beatDataReady || beatDataLoading || !spectrumBars.length) return;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass || !window.fetch) {
    startFallbackVisualizer();
    return;
  }

  beatDataLoading = true;

  try {
    const context = new AudioContextClass();
    const response = await fetch(encodeURIComponent(AUDIO_FILE_NAME));
    if (!response.ok) throw new Error(`Không tải được file nhạc: ${response.status}`);

    const arrayBuffer = await response.arrayBuffer();
    const decoded = await context.decodeAudioData(arrayBuffer);
    const channel = decoded.getChannelData(0);

    beatBuffer = {
      channel,
      duration: decoded.duration,
      sampleRate: decoded.sampleRate
    };

    beatDataReady = true;
    beatFallbackActive = false;
    spectrumWrap?.classList.add('beat-active');
    spectrumWrap?.classList.remove('beat-fallback');

    if (context.close) context.close().catch(() => {});
  } catch (error) {
    console.warn('Không đọc được beat thật, dùng sóng fallback:', error);
    startFallbackVisualizer();
  } finally {
    beatDataLoading = false;
  }
}

function getAudioLevelAt(time, barIndex, barCount) {
  if (!beatBuffer || !beatBuffer.channel || !beatBuffer.duration) return null;

  const { channel, sampleRate, duration } = beatBuffer;
  const safeTime = clamp(time, 0, Math.max(0, duration - 0.03));

  // Mỗi cột nhìn một lát cắt rất nhỏ quanh thời điểm hiện tại để tạo cảm giác spectrum.
  const spread = 0.18;
  const offsetRatio = barCount <= 1 ? 0 : (barIndex / (barCount - 1)) - 0.5;
  const sampleCenter = Math.floor((safeTime + offsetRatio * spread) * sampleRate);
  const windowSize = Math.max(180, Math.floor(sampleRate * 0.026));
  const start = clamp(sampleCenter - Math.floor(windowSize / 2), 0, channel.length - 1);
  const end = clamp(sampleCenter + Math.floor(windowSize / 2), start + 1, channel.length);

  let sum = 0;
  let peak = 0;
  let count = 0;

  for (let i = start; i < end; i += 18) {
    const value = Math.abs(channel[i]);
    sum += value * value;
    if (value > peak) peak = value;
    count += 1;
  }

  const rms = Math.sqrt(sum / Math.max(1, count));
  const energy = clamp(rms * 5.8 + peak * 0.85, 0, 1);
  return energy;
}

function startBeatVisualizer() {
  if (visualizerFrame || !spectrumBars.length) return;

  const render = () => {
    visualizerFrame = requestAnimationFrame(render);

    const bars = Array.from(spectrumBars);
    const maxHeight = spectrumWrap ? Math.max(26, spectrumWrap.clientHeight - 3) : 44;
    const minHeight = 3.5;
    const current = bgAudio && Number.isFinite(bgAudio.currentTime) ? bgAudio.currentTime : 0;
    const isPlaying = bgAudio && !bgAudio.paused && !bgAudio.ended;
    const now = performance.now() / 1000;

    bars.forEach((bar, index) => {
      const position = bars.length <= 1 ? 0 : index / (bars.length - 1);
      const centerShape = 0.42 + Math.sin(position * Math.PI) * 0.58;
      let level = 0.06;

      if (isPlaying && beatDataReady) {
        const realLevel = getAudioLevelAt(current, index, bars.length);
        const pulse = (Math.sin(now * 7.2 + index * 0.46) + 1) * 0.035;
        level = clamp((realLevel ?? 0.08) * 0.96 * centerShape + pulse, 0.06, 0.96);
      } else if (isPlaying) {
        // Fallback không đụng vào audio: có nhịp mềm trong lúc đang load/không đọc được mp3.
        const pulseA = (Math.sin(now * 7.6 + index * 0.52) + 1) / 2;
        const pulseB = (Math.sin(now * 3.1 + index * 0.18) + 1) / 2;
        level = clamp((pulseA * 0.62 + pulseB * 0.38) * centerShape, 0.09, 0.78);
      }

      const targetHeight = minHeight + Math.pow(level, 0.76) * (maxHeight - minHeight);
      smoothedLevels[index] = (smoothedLevels[index] || targetHeight) * 0.76 + targetHeight * 0.24;
      bar.style.height = `${smoothedLevels[index].toFixed(1)}px`;
      bar.style.opacity = String(clamp(0.38 + level * 0.66, 0.38, 1));
      bar.style.transform = `scaleY(${clamp(0.88 + level * 0.18, 0.88, 1.12)})`;
    });
  };

  render();
}

function stopBeatVisualizer() {
  if (visualizerFrame) {
    cancelAnimationFrame(visualizerFrame);
    visualizerFrame = 0;
  }
}

function softenVisualizer() {
  if (!spectrumBars.length) return;
  spectrumBars.forEach((bar, index) => {
    const base = 5 + Math.sin(index * 0.55) * 3 + (index % 9) * 0.35;
    bar.style.height = `${Math.max(3.5, base).toFixed(1)}px`;
    bar.style.opacity = '0.36';
    bar.style.transform = 'scaleY(1)';
  });
}

function startFallbackVisualizer() {
  if (!spectrumBars.length) return;
  beatFallbackActive = true;
  spectrumWrap?.classList.add('beat-active', 'beat-fallback');
  startBeatVisualizer();
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
    musicToggle.addEventListener('click', async () => {
      if (!bgAudio) return;

      if (bgAudio.paused) {
        await tryPlayAudio();
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
    muteToggle.addEventListener('click', (event) => {
      event.stopPropagation();

      if (volumePopover) {
        volumePopover.classList.toggle('open');
      }
    });

    muteToggle.addEventListener('dblclick', (event) => {
      event.stopPropagation();
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

  if (volumePopover) {
    volumePopover.addEventListener('click', (event) => {
      event.stopPropagation();
    });

    volumePopover.addEventListener('mouseenter', () => {
      volumePopover.classList.add('open');
    });

    volumePopover.addEventListener('mouseleave', () => {
      volumePopover.classList.remove('open');
      if (document.activeElement && volumePopover.contains(document.activeElement)) {
        document.activeElement.blur();
      }
    });

    volumePopover.addEventListener('focusout', (event) => {
      if (!volumePopover.contains(event.relatedTarget)) {
        volumePopover.classList.remove('open');
      }
    });

    document.addEventListener('click', () => {
      volumePopover.classList.remove('open');
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
      initBeatData();
      startBeatVisualizer();
      syncMusicUI();
      updateMusicToggle();
    });

    bgAudio.addEventListener('pause', () => {
      updateMusicToggle();
      softenVisualizer();
    });

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
    softenVisualizer();
  });
}

setupEvents();

console.assert(formatTime(0) === '00:00', 'formatTime should format zero seconds');
console.assert(formatTime(60) === '01:00', 'formatTime should format one minute');
console.assert(formatTime(75) === '01:15', 'formatTime should format minute and seconds');