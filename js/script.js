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
  initPageSearch();
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

/* --------------------------------------------------------------------
   5. Search this page
   -------------------------------------------------------------------- */
function initPageSearch() {
  const toggleBtn = document.getElementById('searchToggleBtn');
  const panel = document.getElementById('searchPanel');
  const input = document.getElementById('searchInput');
  const countLabel = document.getElementById('searchCount');
  const prevBtn = document.getElementById('searchPrev');
  const nextBtn = document.getElementById('searchNext');
  const closeBtn = document.getElementById('searchClose');

  if (!toggleBtn || !panel || !input) return;

  // Scope the search to real page content — the sticky header/nav labels
  // are short and repeat (mobile drawer + desktop nav both say "About Us"),
  // so including them just produces noisy, unhelpful matches.
  const searchRoots = Array.from(document.querySelectorAll('main, footer'));

  let matches = [];
  let currentIndex = -1;
  let debounceTimer = null;

  function openPanel() {
    panel.classList.add('open');
    toggleBtn.setAttribute('aria-expanded', 'true');
    // Wait for the open transition to start before focusing, otherwise
    // some mobile browsers ignore focus on a still-collapsed element.
    requestAnimationFrame(() => input.focus());
  }

  function closePanel() {
    panel.classList.remove('open');
    toggleBtn.setAttribute('aria-expanded', 'false');
    input.value = '';
    clearHighlights();
    updateCount();
  }

  toggleBtn.addEventListener('click', () => {
    const isOpen = panel.classList.contains('open');
    isOpen ? closePanel() : openPanel();
  });
  closeBtn.addEventListener('click', closePanel);

  function clearHighlights() {
    document.querySelectorAll('mark.search-hit').forEach((mark) => {
      mark.replaceWith(document.createTextNode(mark.textContent));
    });
    searchRoots.forEach((root) => root.normalize());
    matches = [];
    currentIndex = -1;
  }

  function highlightQuery(query) {
    const lowerQuery = query.toLowerCase();
    const found = [];

    searchRoots.forEach((root) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          const parentTag = node.parentElement && node.parentElement.tagName;
          if (parentTag === 'SCRIPT' || parentTag === 'STYLE') return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      });

      const textNodes = [];
      let node;
      while ((node = walker.nextNode())) textNodes.push(node);

      textNodes.forEach((textNode) => {
        const text = textNode.nodeValue;
        const lowerText = text.toLowerCase();
        let idx = lowerText.indexOf(lowerQuery);
        if (idx === -1) return;

        const frag = document.createDocumentFragment();
        let lastIndex = 0;

        while (idx !== -1) {
          if (idx > lastIndex) {
            frag.appendChild(document.createTextNode(text.slice(lastIndex, idx)));
          }
          const mark = document.createElement('mark');
          mark.className = 'search-hit';
          mark.textContent = text.slice(idx, idx + query.length);
          frag.appendChild(mark);
          found.push(mark);
          lastIndex = idx + query.length;
          idx = lowerText.indexOf(lowerQuery, lastIndex);
        }

        if (lastIndex < text.length) {
          frag.appendChild(document.createTextNode(text.slice(lastIndex)));
        }
        textNode.replaceWith(frag);
      });
    });

    return found;
  }

  function updateCount() {
    if (!input.value.trim()) {
      countLabel.textContent = '';
    } else if (matches.length === 0) {
      countLabel.textContent = 'No results';
    } else {
      countLabel.textContent = `${currentIndex + 1} of ${matches.length}`;
    }
    prevBtn.disabled = matches.length === 0;
    nextBtn.disabled = matches.length === 0;
  }

  function goToMatch(index) {
    if (!matches.length) return;
    if (currentIndex >= 0) matches[currentIndex].classList.remove('active');
    currentIndex = (index + matches.length) % matches.length;
    const activeMark = matches[currentIndex];
    activeMark.classList.add('active');
    activeMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
    updateCount();
  }

  function runSearch() {
    clearHighlights();
    const query = input.value.trim();
    if (query.length > 0) {
      matches = highlightQuery(query);
      if (matches.length) goToMatch(0);
    }
    updateCount();
  }

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    // Debounced so a fast typist doesn't trigger a full-page TreeWalker
    // pass on every single keystroke.
    debounceTimer = setTimeout(runSearch, 150);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.shiftKey ? goToMatch(currentIndex - 1) : goToMatch(currentIndex + 1);
    } else if (e.key === 'Escape') {
      closePanel();
    }
  });

  prevBtn.addEventListener('click', () => goToMatch(currentIndex - 1));
  nextBtn.addEventListener('click', () => goToMatch(currentIndex + 1));

  // Global shortcut: press "/" anywhere on the page (outside a text field)
  // to jump straight into search — a convention borrowed from sites like
  // GitHub that power users will already expect.
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== input) {
      const tag = document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      e.preventDefault();
      openPanel();
    }
  });
}
