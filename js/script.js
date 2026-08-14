/**
 * Apex Minds Academy — landing page interactions.
 *
 * Three responsibilities, kept separate on purpose:
 *   1. Mobile nav drawer toggle
 *   2. Scroll-triggered reveal animations (step cards)
 *   3. Animated stat counters
 *
 * Design note: we use IntersectionObserver for scroll-triggered effects
 * instead of a `scroll` event listener. A scroll listener fires dozens of
 * times per second and forces you to manually calculate element position
 * on every tick — expensive, and easy to jank on low-end devices.
 * IntersectionObserver lets the browser do that work natively and only
 * calls our code when something actually crosses the viewport.
 */

document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initSubjectPills();
  initStepReveal();
  initStatCounters();
});

/* --------------------------------------------------------------------
   1. Mobile nav drawer
   -------------------------------------------------------------------- */
function initMobileMenu() {
  const menuBtn = document.getElementById('menuBtn');
  const drawer = document.getElementById('mobileDrawer');
  const iconOpen = document.getElementById('menuIconOpen');
  const iconClose = document.getElementById('menuIconClose');

  if (!menuBtn || !drawer) return;

  let isOpen = false;

  const setOpen = (open) => {
    isOpen = open;
    drawer.classList.toggle('open', isOpen);
    iconOpen.hidden = isOpen;
    iconClose.hidden = !isOpen;
    menuBtn.setAttribute('aria-expanded', String(isOpen));
    menuBtn.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
  };

  menuBtn.addEventListener('click', () => setOpen(!isOpen));

  // Close the drawer after navigating — otherwise it stays open behind
  // the section the user just jumped to.
  drawer.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setOpen(false));
  });
}

/* --------------------------------------------------------------------
   2. Subject pill selection
   -------------------------------------------------------------------- */
function initSubjectPills() {
  const pills = document.querySelectorAll('.pill');
  pills.forEach((pill) => {
    pill.addEventListener('click', () => {
      pills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
    });
  });
}

/* --------------------------------------------------------------------
   3. Reveal step cards as they enter the viewport
   -------------------------------------------------------------------- */
function initStepReveal() {
  const steps = document.querySelectorAll('.step-card');
  if (!steps.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const index = Number(el.dataset.step || 0);
        // Staggering the delay by index turns a flat "everything pops in
        // at once" reveal into a readable left-to-right/top-to-bottom sequence.
        el.style.transitionDelay = `${index * 120}ms`;
        el.classList.add('in-view');
        observer.unobserve(el); // reveal once — don't replay on scroll-back
      });
    },
    { threshold: 0.3 }
  );

  steps.forEach((el) => observer.observe(el));
}

/* --------------------------------------------------------------------
   4. Animated stat counters
   -------------------------------------------------------------------- */
function initStatCounters() {
  const statsSection = document.querySelector('.stats-section');
  const counters = document.querySelectorAll('.stat-value[id], .stat-value span[data-target]');
  if (!statsSection || !counters.length) return;

  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  let hasAnimated = false;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting || hasAnimated) return;
        hasAnimated = true;
        counters.forEach((el) => animateCount(el, prefersReducedMotion));
        observer.unobserve(statsSection);
      });
    },
    { threshold: 0.3 }
  );

  observer.observe(statsSection);
}

function animateCount(el, prefersReducedMotion, duration = 1400) {
  const target = Number(el.dataset.target || 0);

  if (prefersReducedMotion) {
    el.textContent = target;
    return;
  }

  let start = null;

  function tick(timestamp) {
    if (start === null) start = timestamp;
    const progress = Math.min((timestamp - start) / duration, 1);
    // Ease-out-cubic: fast start, gentle settle — reads as more "alive"
    // than a linear count, without being distracting.
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target);
    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}
