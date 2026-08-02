/* DEMI live Google reviews. Google supplies the content directly to the
   visitor's browser; review text is never copied into the site database. */
(function () {
  var config = window.DEMI_GOOGLE_REVIEWS || {};
  var mounts = document.querySelectorAll('[data-demi-google-reviews]');
  if (!mounts.length || !config.configured || !config.placeId) return;

  var started = false;

  function make(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function externalLink(node, href) {
    if (!href) return node;
    node.href = href;
    node.target = '_blank';
    node.rel = 'noopener noreferrer';
    return node;
  }

  function stars(rating) {
    var value = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
    return '★★★★★'.slice(0, value) + '☆☆☆☆☆'.slice(value);
  }

  function setStatus(mount, message) {
    mount.replaceChildren();
    mount.setAttribute('data-state', 'empty');
    mount.appendChild(make('p', 'demi-review-status', message));
  }

  function renderAttributions(place, target) {
    var attributions = place.attributions || [];
    if (!attributions.length) return;
    var wrap = make('span', 'demi-review-attributions');
    attributions.forEach(function (attribution, index) {
      if (index) wrap.appendChild(document.createTextNode(', '));
      if (typeof attribution === 'string') {
        wrap.appendChild(document.createTextNode(attribution));
        return;
      }
      var label = attribution.provider || 'Data provider';
      wrap.appendChild(attribution.providerURI
        ? externalLink(make('a', '', label), attribution.providerURI)
        : document.createTextNode(label));
    });
    target.appendChild(document.createTextNode(' · '));
    target.appendChild(wrap);
  }

  function reviewCard(review, index, total) {
    var card = make('article', 'demi-review-card');
    card.setAttribute('role', 'group');
    card.setAttribute('aria-label',
      'Guest review ' + (index + 1) + ' of ' + total);

    var rating = Number(review.rating) || 0;
    var starRow = make('div', 'demi-review-stars', stars(rating));
    starRow.setAttribute('aria-label', rating + ' out of 5 stars');
    card.appendChild(starRow);
    card.appendChild(make('p', 'demi-review-text', review.text || ''));

    var author = review.authorAttribution || {};
    var authorRow = make('div', 'demi-review-author');
    authorRow.appendChild(make('span', 'demi-review-author-name',
      author.displayName || 'Google reviewer'));
    if (review.relativePublishTimeDescription) {
      authorRow.appendChild(make('span', 'demi-review-time',
        review.relativePublishTimeDescription));
    }
    card.appendChild(authorRow);
    return card;
  }

  function initialiseCarousel(carousel, cards, track, dots, live) {
    var index = 0;
    var touchStartX = null;

    function show(nextIndex, announce) {
      index = (nextIndex + cards.length) % cards.length;
      carousel.setAttribute('data-carousel-index', String(index));
      track.style.transform = 'translate3d(-' + (index * 100) + '%,0,0)';
      cards.forEach(function (card, cardIndex) {
        card.setAttribute('aria-hidden', cardIndex === index ? 'false' : 'true');
      });
      dots.forEach(function (dot, dotIndex) {
        dot.setAttribute('aria-current', dotIndex === index ? 'true' : 'false');
      });
      if (announce) live.textContent =
        'Showing review ' + (index + 1) + ' of ' + cards.length;
    }

    carousel.querySelector('.demi-review-prev').addEventListener('click', function () {
      show(index - 1, true);
    });
    carousel.querySelector('.demi-review-next').addEventListener('click', function () {
      show(index + 1, true);
    });
    dots.forEach(function (dot, dotIndex) {
      dot.addEventListener('click', function () { show(dotIndex, true); });
    });
    carousel.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        show(index - 1, true);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        show(index + 1, true);
      }
    });
    carousel.addEventListener('touchstart', function (event) {
      touchStartX = event.changedTouches[0].clientX;
    }, { passive: true });
    carousel.addEventListener('touchend', function (event) {
      if (touchStartX === null) return;
      var distance = event.changedTouches[0].clientX - touchStartX;
      touchStartX = null;
      if (Math.abs(distance) < 45) return;
      show(index + (distance < 0 ? 1 : -1), true);
    }, { passive: true });
    show(0, false);
  }

  function render(mount, place) {
    var minRating = Number(config.minRating) || 4;
    var limit = Math.max(1, Math.min(3, Number(config.limit) || 3));
    var reviews = (place.reviews || []).filter(function (review) {
      return review && (review.text || '').trim() &&
        Number(review.rating || 0) >= minRating;
    }).slice(0, limit);

    if (!reviews.length) {
      setStatus(mount, 'No matching guest reviews are available yet.');
      return;
    }

    mount.replaceChildren();
    mount.setAttribute('data-state', 'ready');

    var attribution = make('div', 'demi-review-attribution-row');
    var googleAttribution = make('span', 'demi-google-attribution', 'Google Maps');
    googleAttribution.setAttribute('translate', 'no');
    googleAttribution.setAttribute('aria-label', 'Google Maps attribution');
    attribution.appendChild(googleAttribution);
    renderAttributions(place, attribution);
    mount.appendChild(attribution);

    var carousel = make('div', 'demi-review-carousel');
    carousel.setAttribute('role', 'region');
    carousel.setAttribute('aria-roledescription', 'carousel');
    carousel.setAttribute('aria-label', 'Guest reviews');
    carousel.tabIndex = 0;

    var viewport = make('div', 'demi-review-viewport');
    var track = make('div', 'demi-review-track');
    var cards = reviews.map(function (review, index) {
      var card = reviewCard(review, index, reviews.length);
      track.appendChild(card);
      return card;
    });
    viewport.appendChild(track);
    carousel.appendChild(viewport);

    if (cards.length > 1) {
      var controls = make('div', 'demi-review-controls');
      var prev = make('button', 'demi-review-arrow demi-review-prev', '‹');
      prev.type = 'button';
      prev.setAttribute('aria-label', 'Previous review');
      controls.appendChild(prev);

      var dotWrap = make('div', 'demi-review-dots');
      var dots = cards.map(function (_card, index) {
        var dot = make('button', 'demi-review-dot');
        dot.type = 'button';
        dot.setAttribute('aria-label', 'Show review ' + (index + 1));
        dotWrap.appendChild(dot);
        return dot;
      });
      controls.appendChild(dotWrap);

      var next = make('button', 'demi-review-arrow demi-review-next', '›');
      next.type = 'button';
      next.setAttribute('aria-label', 'Next review');
      controls.appendChild(next);
      carousel.appendChild(controls);

      var live = make('span', 'demi-review-live');
      live.setAttribute('aria-live', 'polite');
      live.setAttribute('aria-atomic', 'true');
      carousel.appendChild(live);
      initialiseCarousel(carousel, cards, track, dots, live);
    } else {
      cards[0].setAttribute('aria-hidden', 'false');
    }

    mount.appendChild(carousel);
  }

  async function load() {
    if (started) return;
    started = true;
    try {
      if (!window.google || !google.maps || !google.maps.importLibrary) {
        throw new Error('Google Maps JavaScript API unavailable');
      }
      var library = await google.maps.importLibrary('places');
      var place = new library.Place({ id: config.placeId });
      await place.fetchFields({ fields: ['reviews'] });
      [].forEach.call(mounts, function (mount) { render(mount, place); });
    } catch (error) {
      [].forEach.call(mounts, function (mount) {
        setStatus(mount, 'Guest reviews are temporarily unavailable.');
      });
      if (window.console && console.warn) {
        console.warn('DEMI Google reviews could not load:', error);
      }
    }
  }

  function ready() {
    if (!('IntersectionObserver' in window)) { load(); return; }
    var observer = new IntersectionObserver(function (entries) {
      if (entries.some(function (entry) { return entry.isIntersecting; })) {
        observer.disconnect();
        load();
      }
    }, { rootMargin: '500px 0px' });
    observer.observe(mounts[0]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ready);
  } else {
    ready();
  }
})();
