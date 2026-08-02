/* DEMI Palo Alto — mobile navigation + sticky-bar elevation.
   Progressive enhancement: with JS off the bar is still a working
   header, the panel simply stays closed and every link lives in
   the footer as well. */
(function () {
  var nav = document.querySelector('.nav');
  if (!nav) return;
  var burger = nav.querySelector('.burger');
  var panel = nav.querySelector('ul');

  function setOpen(open) {
    nav.classList.toggle('open', open);
    if (burger) {
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }
  }

  if (burger) {
    burger.addEventListener('click', function (e) {
      e.stopPropagation();
      setOpen(!nav.classList.contains('open'));
    });
  }

  // Tapping a link navigates; close first so the panel isn't mid-flight
  // when an in-page anchor scrolls.
  if (panel) {
    panel.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });
  }

  document.addEventListener('click', function (e) {
    if (nav.classList.contains('open') && !nav.contains(e.target)) setOpen(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('open')) {
      setOpen(false);
      if (burger) burger.focus();
    }
  });

  // Rotating to landscape can cross back into the desktop nav; drop the
  // open state so the links don't stay stuck in panel form.
  var wide = window.matchMedia('(min-width: 1025px)');
  var onChange = function (e) { if (e.matches) setOpen(false); };
  if (wide.addEventListener) wide.addEventListener('change', onChange);
  else if (wide.addListener) wide.addListener(onChange);

  var onScroll = function () {
    nav.classList.toggle('scrolled', window.scrollY > 6);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
})();
