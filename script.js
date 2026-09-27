// No build step needed, this file is plain JS served as-is by GitHub Pages.

(function () {
  const root = document.documentElement;
  const toggle = document.querySelector('.theme-toggle');
  if (!toggle) return;

  function syncToggleLabel() {
    const isDark = root.getAttribute('data-theme') === 'dark';
    toggle.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
  }

  syncToggleLabel();

  toggle.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    if (next === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }
    try {
      localStorage.setItem('theme', next);
    } catch (e) {}
    syncToggleLabel();
  });
})();

if (
  'IntersectionObserver' in window &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches
) {
  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-visible');
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  const groups = [
    document.querySelectorAll('#work .project-row'),
    document.querySelectorAll('.index-list li'),
  ];

  groups.forEach((group) => {
    group.forEach((el, i) => {
      el.classList.add('reveal-pending');
      el.style.transitionDelay = `${i * 70}ms`;
      observer.observe(el);
    });
  });

  const contact = document.querySelector('.contact');
  if (contact) {
    contact.classList.add('reveal-pending');
    observer.observe(contact);
  }
}

const sectionLinks = document.querySelectorAll('.site-nav nav a[href^="#"]');
if (sectionLinks.length && 'IntersectionObserver' in window) {
  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        sectionLinks.forEach((link) => {
          link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`);
        });
      });
    },
    { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
  );

  sectionLinks.forEach((link) => {
    const section = document.querySelector(link.getAttribute('href'));
    if (section) spy.observe(section);
  });
}

(function () {
  const githubPreview = document.querySelector('#preview-github');
  const githubTrigger = githubPreview && githubPreview.closest('.nav-preview');
  if (!githubPreview || !githubTrigger) return;

  let loaded = false;

  function loadGithubPreview() {
    if (loaded) return;
    loaded = true;

    fetch('https://api.github.com/users/siddharthvkutty')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        const avatar = githubPreview.querySelector('.preview-avatar');
        const desc = githubPreview.querySelector('.preview-desc');
        if (data.avatar_url) avatar.src = `${data.avatar_url}&s=80`;
        if (desc) desc.textContent = `${data.public_repos} repositories · ${data.followers} followers`;
      })
      .catch(() => {
        const desc = githubPreview.querySelector('.preview-desc');
        if (desc) desc.textContent = 'View repositories on GitHub';
      });
  }

  githubTrigger.addEventListener('mouseenter', loadGithubPreview);
  githubTrigger.addEventListener('focusin', loadGithubPreview);
})();
