/* Mira docs: generated "on this page" nav, scrollspy and section filter. */
(function () {
  const article = document.querySelector('.doc-prose');
  if (!article) return;

  const sections = Array.from(article.querySelectorAll('[data-doc-section]'));
  const navLinks = Array.from(document.querySelectorAll('[data-doc-link]'));

  /* ---------- On this page ---------- */
  const toc = document.getElementById('docs-toc');
  if (toc) {
    toc.innerHTML = sections
      .map((section) => {
        const heading = section.querySelector('h2');
        if (!heading) return '';
        return `<a class="block border-l-2 border-transparent py-1 pl-3 text-[12px] leading-snug text-sub transition hover:text-ink" data-toc-link="${section.id}" href="#${section.id}">${heading.textContent}</a>`;
      })
      .join('');
  }

  const tocLinks = Array.from(document.querySelectorAll('[data-toc-link]'));

  function markActive(id) {
    navLinks.forEach((link) => {
      link.setAttribute('aria-current', String(link.dataset.docLink === id));
    });
    tocLinks.forEach((link) => {
      const active = link.dataset.tocLink === id;
      link.setAttribute('aria-current', String(active));
      link.classList.toggle('border-link', active);
      link.classList.toggle('font-medium', active);
      link.classList.toggle('text-link', active);
    });
  }

  let ticking = false;
  function updateActive() {
    ticking = false;
    if (!sections.length) return;
    const offset = 120;
    let current = sections[0].id;
    sections.forEach((section) => {
      if (section.getBoundingClientRect().top - offset <= 0) current = section.id;
    });
    // The final section may never reach the offset line; treat the page end as its start.
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
      current = sections[sections.length - 1].id;
    }
    markActive(current);
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateActive);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  updateActive();

  /* ---------- Section filter ---------- */
  const filter = document.getElementById('docs-filter');
  const nav = document.getElementById('docs-nav');
  const empty = document.getElementById('docs-filter-empty');

  if (filter && nav) {
    const groups = Array.from(nav.querySelectorAll('[data-doc-group]'));

    filter.addEventListener('input', () => {
      const query = filter.value.trim().toLowerCase();
      let visible = 0;

      navLinks.forEach((link) => {
        const match = !query || link.textContent.toLowerCase().includes(query);
        link.classList.toggle('hidden', !match);
        if (match) visible++;
      });

      groups.forEach((label) => {
        const list = label.nextElementSibling;
        if (!list) return;
        const count = Array.from(list.querySelectorAll('[data-doc-link]')).filter((l) => !l.classList.contains('hidden')).length;
        label.classList.toggle('hidden', count === 0);
        list.classList.toggle('hidden', count === 0);
      });

      if (empty) empty.classList.toggle('hidden', visible > 0);
    });

    filter.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        filter.value = '';
        filter.dispatchEvent(new Event('input'));
        filter.blur();
      }
    });
  }
})();
