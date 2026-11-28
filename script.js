// ---------- Mobile menu ----------
(function () {
  var button = document.querySelector('.menu-btn');
  var links = document.getElementById('site-links');
  if (!button || !links) return;

  function setOpen(open) {
    links.classList.toggle('open', open);
    button.setAttribute('aria-expanded', open ? 'true' : 'false');
    button.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }

  button.addEventListener('click', function () {
    setOpen(!links.classList.contains('open'));
  });

  // Close after choosing a section, on Escape, or when the screen becomes wide.
  links.addEventListener('click', function (event) {
    if (event.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') setOpen(false);
  });
  window.addEventListener('resize', function () {
    if (window.innerWidth > 860) setOpen(false);
  });
})();

// ---------- Nav shadow once the page is scrolled ----------
(function () {
  var nav = document.querySelector('nav.top');
  if (!nav) return;
  function update() {
    nav.classList.toggle('scrolled', window.pageYOffset > 8);
  }
  window.addEventListener('scroll', update, { passive: true });
  update();
})();

// ---------- Reveal sections as they scroll into view ----------
(function () {
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || !('IntersectionObserver' in window)) return;

  var targets = document.querySelectorAll(
    'main .eyebrow, main .section-title, main .lead, main .note, ' +
    '.stat, .f, .step, .plan, .m, .mv > div, details, .contact'
  );

  // Count a stat's number up from 0, e.g. "11" in <b>11<span>/11</span></b>.
  function countUp(stat) {
    var node = stat.querySelector('b').firstChild;
    var target = parseInt(node.nodeValue, 10);
    if (isNaN(target)) return;
    var start = null;
    node.nodeValue = '0';
    function step(time) {
      if (start === null) start = time;
      var progress = Math.min((time - start) / 1000, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      node.nodeValue = String(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var el = entry.target;
      observer.unobserve(el);
      el.classList.add('in');

      // Once revealed, drop the reveal classes so hover effects use their own timing.
      el.addEventListener('transitionend', function done(event) {
        if (event.target !== el) return;
        el.classList.remove('reveal', 'in');
        el.style.transitionDelay = '';
        el.removeEventListener('transitionend', done);
      });

      if (el.classList.contains('stat')) countUp(el);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  Array.prototype.forEach.call(targets, function (el) {
    // Stagger items that sit side by side (cards in a grid, title after eyebrow, ...).
    var index = Array.prototype.indexOf.call(el.parentNode.children, el);
    el.style.transitionDelay = Math.min(index, 5) * 80 + 'ms';
    el.classList.add('reveal');
    observer.observe(el);
  });
})();

// ---------- Copy contact email ----------
// If the clipboard isn't available, select the text so the user can copy it manually.
(function () {
  var emailEl = document.getElementById('email');
  var button = document.getElementById('copyBtn');
  if (!emailEl || !button) return;

  function showCopied() {
    button.textContent = 'Copied';
    setTimeout(function () {
      button.textContent = 'Copy';
    }, 1500);
  }

  function selectEmail() {
    var range = document.createRange();
    range.selectNodeContents(emailEl);

    var selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    button.textContent = 'Selected';
  }

  button.addEventListener('click', function () {
    try {
      navigator.clipboard.writeText(emailEl.textContent).then(showCopied, selectEmail);
    } catch (e) {
      selectEmail();
    }
  });
})();
