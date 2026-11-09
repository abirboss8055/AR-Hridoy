/* ==========================================================================
   AR HRIDOY — Smooth Canvas Scroll Sequence & Interaction Script
   ========================================================================== */

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { alpha: false });

const TOTAL_FRAMES = 300;
const images = new Array(TOTAL_FRAMES);
let lastRenderedFrame = -1;
let currentFrame = 0;
let targetFrame = 0;
let targetProgress = 0;

// Path to image frames
function getFramePath(index) {
  const num = String(index).padStart(3, '0');
  return `./sequence/ezgif-frame-${num}.jpg`;
}

// Preload first frame immediately for 0ms initial paint
const frame1 = new Image();
frame1.src = getFramePath(1);
images[0] = frame1;
frame1.onload = () => {
  drawFrame(0);
};

// Asynchronously preload all remaining frames
for (let i = 2; i <= TOTAL_FRAMES; i++) {
  const img = new Image();
  img.src = getFramePath(i);
  if (img.decode) {
    img.decode().catch(() => {});
  }
  images[i - 1] = img;
}

// Fallback to closest loaded frame if user scrubs ahead rapidly
function getLoadedImage(targetIdx) {
  if (images[targetIdx] && images[targetIdx].complete && images[targetIdx].naturalWidth > 0) {
    return images[targetIdx];
  }
  for (let i = targetIdx - 1; i >= 0; i--) {
    if (images[i] && images[i].complete && images[i].naturalWidth > 0) return images[i];
  }
  for (let i = targetIdx + 1; i < TOTAL_FRAMES; i++) {
    if (images[i] && images[i].complete && images[i].naturalWidth > 0) return images[i];
  }
  return null;
}

// Draw frame centered with crisp cover fit
function drawFrame(index) {
  const img = getLoadedImage(index);
  if (!img) return;

  const cw = canvas.width;
  const ch = canvas.height;
  const iw = img.naturalWidth || 1280;
  const ih = img.naturalHeight || 720;

  // Aspect-ratio cover fit
  const scale = Math.max(cw / iw, ch / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (cw - dw) * 0.5;
  const dy = (ch - dh) * 0.5;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, iw, ih, dx, dy, dw, dh);
  lastRenderedFrame = index;
}

// Resize canvas handling devicePixelRatio for high-DPI displays
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';

  if (lastRenderedFrame >= 0) {
    drawFrame(lastRenderedFrame);
  } else {
    drawFrame(0);
  }
}

window.addEventListener('resize', resize);
resize();

// ==========================================================================
// Lenis Smooth Scrolling Engine
// ==========================================================================
const lenis = new Lenis({
  duration: 1.25,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  orientation: 'vertical',
  gestureOrientation: 'vertical',
  smoothWheel: true,
  wheelMultiplier: 1.0,
  touchMultiplier: 1.5,
});

function calculateProgress() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
}

targetProgress = calculateProgress();
currentFrame = targetProgress * (TOTAL_FRAMES - 1);

// ==========================================================================
// Section Transitions (Fade Up In, Fade Out Up/Down)
// ==========================================================================
const sections = document.querySelectorAll('.section');

function triggerSectionAnimations(sec) {
  // If skills section: animate progress bars
  if (sec.id === 'skills') {
    const bars = sec.querySelectorAll('.progress-fill');
    bars.forEach((bar) => {
      const target = bar.getAttribute('data-progress') || '0';
      bar.style.width = target + '%';
    });
  }

  // If hero section: trigger stats counter animation
  if (sec.id === 'home') {
    const counters = sec.querySelectorAll('.counter');
    counters.forEach((c) => {
      const target = parseInt(c.getAttribute('data-target'), 10) || 0;
      let start = 0;
      const duration = 1200;
      const startTime = performance.now();
      function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        c.textContent = Math.floor(ease * target);
        if (progress < 1) {
          requestAnimationFrame(updateCounter);
        } else {
          c.textContent = target;
        }
      }
      requestAnimationFrame(updateCounter);
    });
  }
}

function resetSectionAnimations(sec) {
  if (sec.id === 'skills') {
    const bars = sec.querySelectorAll('.progress-fill');
    bars.forEach((bar) => {
      bar.style.width = '0%';
    });
  }
}

function updateSectionTransitions() {
  const vh = window.innerHeight;

  sections.forEach((sec) => {
    const rect = sec.getBoundingClientRect();

    // Section is below viewport
    if (rect.top > vh * 0.90) {
      if (sec.classList.contains('is-in-view')) {
        sec.classList.remove('is-in-view');
        resetSectionAnimations(sec);
      }
      sec.classList.remove('is-exited-top');
      sec.classList.add('is-below-view');
    }
    // Section has scrolled above viewport
    else if (rect.bottom < vh * 0.08) {
      sec.classList.remove('is-in-view');
      sec.classList.remove('is-below-view');
      sec.classList.add('is-exited-top');
    }
    // Section is actively in view
    else {
      if (!sec.classList.contains('is-in-view')) {
        sec.classList.add('is-in-view');
        sec.classList.remove('is-below-view');
        sec.classList.remove('is-exited-top');
        triggerSectionAnimations(sec);
      }
    }
  });
}

// Initial call to set active section
updateSectionTransitions();

lenis.on('scroll', (e) => {
  targetProgress = e.progress;
  updateSectionTransitions();
  updateActiveNavLink();
});

window.addEventListener('scroll', () => {
  targetProgress = calculateProgress();
  updateSectionTransitions();
  updateActiveNavLink();
}, { passive: true });

// Animation loop with exponential lerp for frame-rate independence
function animate(time) {
  lenis.raf(time);

  targetFrame = targetProgress * (TOTAL_FRAMES - 1);

  const diff = targetFrame - currentFrame;
  if (Math.abs(diff) > 0.005) {
    currentFrame += diff * 0.18;
  } else {
    currentFrame = targetFrame;
  }

  const frameToRender = Math.min(TOTAL_FRAMES - 1, Math.max(0, Math.round(currentFrame)));
  if (frameToRender !== lastRenderedFrame) {
    drawFrame(frameToRender);
  }

  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

// ==========================================================================
// Interactive 3D Card Tilt Effect
// ==========================================================================
document.querySelectorAll('.tilt-card').forEach((card) => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const deltaX = (x - centerX) / centerX;
    const deltaY = (y - centerY) / centerY;
    card.style.transform = `perspective(1000px) rotateX(${-deltaY * 4.5}deg) rotateY(${deltaX * 4.5}deg) translateY(-4px)`;
  });

  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
  });
});

// ==========================================================================
// Smooth Nav Link Handling
// ==========================================================================
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener('click', function (e) {
    const targetId = this.getAttribute('href');
    if (targetId && targetId !== '#') {
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();
        lenis.scrollTo(targetElement, {
          offset: -80,
          duration: 1.4,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        });
      }
    }
  });
});

// Active Nav Link Spy
const navSections = ['about', 'skills', 'projects', 'services', 'process', 'contact'];
const navLinks = document.querySelectorAll('.nav-pill .nav-link');

function updateActiveNavLink() {
  const scrollPos = window.scrollY + 200;

  let currentSection = '';
  navSections.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      const top = el.offsetTop;
      const height = el.offsetHeight;
      if (scrollPos >= top && scrollPos < top + height) {
        currentSection = id;
      }
    }
  });

  navLinks.forEach((link) => {
    const href = link.getAttribute('href');
    if (href === '#' + currentSection) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}
