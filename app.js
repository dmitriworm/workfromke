// WorkFromKE - renders every page from data.json.
// Page type is set on <body data-page="home|platform|category">.
(function () {
  'use strict';

  var CATEGORIES = [
    { id: 'freelancing',   label: 'Freelancing' },
    { id: 'surveys',       label: 'Surveys' },
    { id: 'microtasks',    label: 'Microtasks' },
    { id: 'transcription', label: 'Transcription' },
    { id: 'writing',       label: 'Writing' },
    { id: 'remote-jobs',   label: 'Remote Jobs' },
    { id: 'ai-training',   label: 'AI Training' }
  ];

  // ---------- helpers ----------

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function categoryLabel(id) {
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (CATEGORIES[i].id === id) return CATEGORIES[i].label;
    }
    return null;
  }

  // Only allow http(s) links so a bad data.json entry can never inject a javascript: URL.
  function safeUrl(url) {
    return /^https?:\/\//i.test(url) ? url : '#';
  }

  function loadData() {
    return fetch('data.json').then(function (res) {
      if (!res.ok) throw new Error('Could not load data.json (' + res.status + ')');
      return res.json();
    });
  }

  function showError(container, message) {
    container.textContent = '';
    container.appendChild(el('p', 'empty', message));
  }

  // Logo: real image if the file exists, otherwise a letter badge.
  function buildLogo(platform) {
    var badge = el('span', 'logo', platform.name.charAt(0).toUpperCase());
    badge.setAttribute('aria-hidden', 'true');
    if (!platform.logo) return badge;

    var img = new Image();
    img.className = 'logo';
    img.alt = '';
    img.addEventListener('load', function () {
      if (badge.parentNode) badge.parentNode.replaceChild(img, badge);
    });
    img.src = platform.logo; // 404 simply leaves the letter badge in place
    return badge;
  }

  function buildCard(platform) {
    var card = el('a', 'card');
    card.href = 'platform.html?id=' + encodeURIComponent(platform.id);

    var body = el('div');
    body.appendChild(el('h3', null, platform.name));
    body.appendChild(el('p', null, platform.tagline));
    body.appendChild(el('span', 'more', 'View details'));

    card.appendChild(buildLogo(platform));
    card.appendChild(body);
    return card;
  }

  function renderCards(container, platforms) {
    container.textContent = '';
    if (platforms.length === 0) {
      container.appendChild(el('p', 'empty', 'No platforms in this category yet.'));
      return;
    }
    platforms.forEach(function (p) { container.appendChild(buildCard(p)); });
  }

  // ---------- home ----------

  function initHome() {
    var grid = document.getElementById('platform-grid');
    var filters = document.getElementById('filters');

    loadData().then(function (data) {
      var platforms = data.platforms;
      var buttons = [];

      function setActive(categoryId) {
        buttons.forEach(function (b) {
          b.setAttribute('aria-pressed', String(b.dataset.cat === categoryId));
        });
        var list = categoryId === 'all'
          ? platforms
          : platforms.filter(function (p) { return p.category === categoryId; });
        renderCards(grid, list);
      }

      [{ id: 'all', label: 'All' }].concat(CATEGORIES).forEach(function (c) {
        var btn = el('button', 'filter-btn', c.label);
        btn.type = 'button';
        btn.dataset.cat = c.id;
        btn.addEventListener('click', function () { setActive(c.id); });
        buttons.push(btn);
        filters.appendChild(btn);
      });

      setActive('all');
    }).catch(function (err) {
      console.error(err);
      showError(grid, 'Could not load platforms. Please try again later.');
    });
  }

  // ---------- category ----------

  function initCategory() {
    var title = document.getElementById('category-title');
    var grid = document.getElementById('platform-grid');
    var links = document.getElementById('category-links');
    var catId = getParam('cat');
    var label = categoryLabel(catId);

    // Links to the other categories
    CATEGORIES.forEach(function (c) {
      var a = el('a', null, c.label);
      a.href = 'category.html?cat=' + encodeURIComponent(c.id);
      links.appendChild(a);
    });

    if (!label) {
      title.textContent = 'Category not found';
      showError(grid, 'We could not find that category. Pick one from the list below.');
      document.title = 'Category not found | WorkFromKE';
      return;
    }

    title.textContent = label;
    document.title = label + ' platforms | WorkFromKE';

    loadData().then(function (data) {
      renderCards(grid, data.platforms.filter(function (p) { return p.category === catId; }));
    }).catch(function (err) {
      console.error(err);
      showError(grid, 'Could not load platforms. Please try again later.');
    });
  }

  // ---------- platform ----------

  function section(title, contentNode) {
    var s = el('section');
    s.appendChild(el('h2', null, title));
    s.appendChild(contentNode);
    return s;
  }

  // Returns an HTML comment label plus an empty fixed-height container. No ad code.
  function adSlot(label) {
    var frag = document.createDocumentFragment();
    frag.appendChild(document.createComment(' Ad Slot: ' + label + ' '));
    var slot = el('div', 'ad-slot');
    slot.setAttribute('aria-hidden', 'true');
    frag.appendChild(slot);
    return frag;
  }

  function initPlatform() {
    var root = document.getElementById('platform');
    var id = getParam('id');

    function notFound() {
      root.textContent = '';
      root.appendChild(el('h1', null, 'Platform not found'));
      root.appendChild(el('p', 'lead', 'We could not find that platform.'));
      var back = el('a', 'back', 'Browse all platforms');
      back.href = 'index.html';
      root.appendChild(back);
      document.title = 'Platform not found | WorkFromKE';
    }

    if (!id) { notFound(); return; }

    loadData().then(function (data) {
      var p = data.platforms.filter(function (x) { return x.id === id; })[0];
      if (!p) { notFound(); return; }

      document.title = p.name + ' for Kenyans | WorkFromKE';
      root.textContent = '';

      // 1. Name
      root.appendChild(el('h1', null, p.name));

      // 2. What it is
      root.appendChild(section('What it is', el('p', null, p.whatItIs)));

      // 3. What you do
      var tasks = el('ul', 'facts');
      p.tasks.forEach(function (t) { tasks.appendChild(el('li', null, t)); });
      root.appendChild(section('What you do', tasks));

      // Ad slot after "What you do"
      root.appendChild(adSlot('After What You Do'));

      // 4. Pay range
      root.appendChild(section('Pay range', el('p', null, p.payRange)));

      // 5. Payout methods
      var methods = el('ul', 'facts');
      p.payoutMethods.forEach(function (m) { methods.appendChild(el('li', null, m)); });
      root.appendChild(section('Payout methods', methods));

      // 6. Minimum withdrawal
      root.appendChild(section('Minimum withdrawal', el('p', null, p.minWithdrawal)));

      // 7. Sign up
      var cta = el('a', 'cta', 'Sign up on ' + p.name);
      cta.href = safeUrl(p.signupUrl);
      cta.target = '_blank';
      cta.rel = 'noopener noreferrer sponsored';
      var ctaWrap = el('div');
      ctaWrap.appendChild(cta);
      ctaWrap.appendChild(el('p', 'note',
        'Check the ' + p.name + ' website for the latest details, rates and availability in Kenya. ' +
        'We may earn a commission if you sign up through this link.'));
      root.appendChild(ctaWrap);

      // Ad slot after payout info
      root.appendChild(adSlot('After Payout Info'));

      var back = el('a', 'back', 'More ' + (categoryLabel(p.category) || '') + ' platforms');
      back.href = 'category.html?cat=' + encodeURIComponent(p.category);
      root.appendChild(back);
    }).catch(function (err) {
      console.error(err);
      showError(root, 'Could not load this platform. Please try again later.');
    });
  }

  // ---------- boot ----------

  var page = document.body.dataset.page;
  if (page === 'home') initHome();
  else if (page === 'category') initCategory();
  else if (page === 'platform') initPlatform();
})();