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

  function setStatus(mount, message, href) {
    mount.replaceChildren();
    mount.setAttribute('data-state', 'empty');
    var status = make('p', 'demi-review-status');
    status.appendChild(document.createTextNode(message + ' '));
    if (href) status.appendChild(externalLink(
      make('a', '', 'View DEMI on Google Maps'), href));
    mount.appendChild(status);
  }

  function renderAttributions(place, target) {
    var attributions = place.attributions || [];
    if (!attributions.length) return;
    var wrap = make('span', 'demi-review-attributions');
    attributions.forEach(function (attribution, index) {
      if (index) wrap.appendChild(document.createTextNode(', '));
      var label = attribution.provider || 'Data provider';
      wrap.appendChild(attribution.providerURI
        ? externalLink(make('a', '', label), attribution.providerURI)
        : document.createTextNode(label));
    });
    target.appendChild(wrap);
  }

  function reviewCard(review, reviewListUrl) {
    var card = make('article', 'demi-review-card');
    var rating = Number(review.rating) || 0;
    var starRow = make('div', 'demi-review-stars', stars(rating));
    starRow.setAttribute('aria-label', rating + ' out of 5 stars');
    card.appendChild(starRow);
    card.appendChild(make('p', 'demi-review-text', review.text || ''));

    var author = review.authorAttribution || {};
    var authorRow = make('div', 'demi-review-author');
    if (author.photoURI) {
      var photo = make('img', 'demi-review-avatar');
      photo.src = author.photoURI;
      photo.alt = '';
      photo.loading = 'lazy';
      photo.referrerPolicy = 'no-referrer';
      authorRow.appendChild(photo);
    } else {
      authorRow.appendChild(make('span', 'demi-review-avatar-fallback',
        (author.displayName || 'G').trim().charAt(0).toUpperCase()));
    }

    var authorCopy = make('div', 'demi-review-author-copy');
    var authorName = make(author.uri ? 'a' : 'span',
      'demi-review-author-name', author.displayName || 'Google reviewer');
    if (author.uri) externalLink(authorName, author.uri);
    authorCopy.appendChild(authorName);
    if (review.relativePublishTimeDescription) {
      authorCopy.appendChild(make('span', 'demi-review-time',
        review.relativePublishTimeDescription));
    }
    authorRow.appendChild(authorCopy);
    card.appendChild(authorRow);
    card.appendChild(externalLink(make('a', 'demi-review-source',
      'Read on Google Maps ↗'), review.googleMapsURI || reviewListUrl));
    return card;
  }

  function render(mount, place) {
    var minRating = Number(config.minRating) || 4;
    var limit = Math.max(1, Math.min(3, Number(config.limit) || 3));
    var reviews = (place.reviews || []).filter(function (review) {
      return review && (review.text || '').trim() &&
        Number(review.rating || 0) >= minRating;
    }).slice(0, limit);
    var links = place.googleMapsLinks || {};
    var reviewListUrl = links.reviewsURI || place.googleMapsURI ||
      config.fallbackUrl;

    if (!reviews.length) {
      setStatus(mount, 'No matching guest reviews are available yet.',
        reviewListUrl);
      return;
    }

    mount.replaceChildren();
    mount.setAttribute('data-state', 'ready');
    var summary = make('div', 'demi-review-summary');
    if (place.rating) {
      summary.appendChild(make('span', 'demi-review-score',
        Number(place.rating).toFixed(1)));
      var summaryCopy = make('span', 'demi-review-summary-copy');
      var summaryStars = make('span', 'demi-review-stars', stars(place.rating));
      summaryStars.setAttribute('aria-label', place.rating + ' out of 5 stars');
      summaryCopy.appendChild(summaryStars);
      if (place.userRatingCount) {
        summaryCopy.appendChild(make('span', '',
          String(place.userRatingCount) + ' Google reviews'));
      }
      summary.appendChild(summaryCopy);
    }
    if (reviewListUrl) {
      var googleAttribution = externalLink(
        make('a', 'demi-google-attribution', 'Google Maps'), reviewListUrl);
      googleAttribution.setAttribute('translate', 'no');
      googleAttribution.setAttribute('aria-label',
        'Google Maps attribution and DEMI reviews');
      summary.appendChild(googleAttribution);
    }
    mount.appendChild(summary);

    var grid = make('div', 'demi-review-grid');
    reviews.forEach(function (review) {
      grid.appendChild(reviewCard(review, reviewListUrl));
    });
    mount.appendChild(grid);

    var disclosure = make('p', 'demi-review-disclosure');
    disclosure.appendChild(document.createTextNode(
      'Google reviews are shown in Google’s relevance order. Only reviews ' +
      'rated ' + minRating + ' stars or higher and containing text are displayed. '));
    disclosure.appendChild(externalLink(make('a', '', 'Google review policies'),
      'https://support.google.com/contributionpolicy/answer/7400114'));
    renderAttributions(place, disclosure);
    mount.appendChild(disclosure);
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
      await place.fetchFields({
        fields: ['displayName', 'rating', 'userRatingCount', 'reviews',
          'googleMapsURI', 'googleMapsLinks']
      });
      [].forEach.call(mounts, function (mount) { render(mount, place); });
    } catch (error) {
      [].forEach.call(mounts, function (mount) {
        setStatus(mount, 'Guest reviews are temporarily unavailable.',
          config.fallbackUrl);
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
