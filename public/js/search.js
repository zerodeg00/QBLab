// === 공통: 검색 로직 ===
var searchIndex = null;

function loadSearchIndex(callback) {
  if (searchIndex) { callback(); return; }
  fetch('/index.json')
    .then(function (r) { return r.json(); })
    .then(function (data) { searchIndex = data; callback(); })
    .catch(function () { searchIndex = []; callback(); });
}

function searchPosts(query) {
  if (!query || !searchIndex) return [];
  var terms = query.trim().toLowerCase().split(/\s+/);
  return searchIndex.filter(function (item) {
    var text = [item.title, item.description, (item.tags || []).join(' '), item.content].join(' ').toLowerCase();
    return terms.every(function (t) { return text.indexOf(t) !== -1; });
  });
}

function highlightText(text, query) {
  var terms = query.trim().toLowerCase().split(/\s+/);
  terms.forEach(function (t) {
    var re = new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
    text = text.replace(re, '<mark>$1</mark>');
  });
  return text;
}

// === 사이드바 검색 (미리보기 드롭다운) ===
(function () {
  var input = document.getElementById('search-input');
  var resultsEl = document.getElementById('search-results');
  if (!input || !resultsEl) return;

  var debounceTimer = null;

  input.addEventListener('focus', function () { loadSearchIndex(function () {}); });

  input.addEventListener('input', function () {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(doSearch, 200);
  });

  // 엔터 → 검색 페이지로 이동
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && input.value.trim()) {
      window.location.href = '/search/?q=' + encodeURIComponent(input.value.trim());
    }
  });

  function doSearch() {
    var query = input.value.trim();
    if (!query) { resultsEl.innerHTML = ''; resultsEl.classList.remove('show'); return; }

    var results = searchPosts(query);
    if (results.length === 0) {
      resultsEl.innerHTML = '<div class="search-empty">검색 결과가 없습니다</div>';
      resultsEl.classList.add('show');
      return;
    }

    var html = results.slice(0, 5).map(function (item) {
      var tags = (item.tags || []).slice(0, 3).map(function (t) {
        return '<span class="tag">#' + t + '</span>';
      }).join('');
      return '<a href="' + item.url + '" class="search-item">' +
        '<span class="search-item-title">' + highlightText(item.title, query) + '</span>' +
        '<span class="search-item-date">' + item.date + '</span>' +
        (tags ? '<div class="search-item-tags">' + tags + '</div>' : '') +
        '</a>';
    }).join('');

    // 결과가 더 있으면 "전체 결과 보기" 링크 추가
    if (results.length > 5) {
      html += '<a href="/search/?q=' + encodeURIComponent(input.value.trim()) + '" class="search-item search-more">전체 ' + results.length + '건 보기 &rarr;</a>';
    }

    resultsEl.innerHTML = html;
    resultsEl.classList.add('show');
  }

  document.addEventListener('click', function (e) {
    if (!e.target.closest('.sidebar-search')) {
      resultsEl.classList.remove('show');
    }
  });
})();

// === 검색 페이지 (전체 결과 리스트) ===
(function () {
  var input = document.getElementById('search-page-input');
  var resultsEl = document.getElementById('search-page-results');
  var statusEl = document.getElementById('search-page-status');
  if (!input || !resultsEl) return;

  // URL 파라미터에서 검색어 읽기
  var params = new URLSearchParams(window.location.search);
  var initialQuery = params.get('q') || '';
  // 초기 상태 또는 URL 파라미터 검색어
  loadSearchIndex(function () {
    if (initialQuery) input.value = initialQuery;
    renderResults(initialQuery);
  });

  input.addEventListener('input', function () {
    var query = input.value.trim();
    loadSearchIndex(function () { renderResults(query); });
  });

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      var query = input.value.trim();
      if (query) {
        // URL 업데이트 (새로고침 없이)
        history.replaceState(null, '', '/search/?q=' + encodeURIComponent(query));
        loadSearchIndex(function () { renderResults(query); });
      }
    }
  });

  function renderResults(query) {
    var results = query ? searchPosts(query) : searchIndex || [];
    statusEl.textContent = query ? '"' + query + '" 검색 결과 ' + results.length + '건' : '전체 글 ' + results.length + '건';

    if (results.length === 0) {
      resultsEl.innerHTML = '<div class="search-page-empty">검색 결과가 없습니다.</div>';
      return;
    }

    var html = results.map(function (item) {
      var tags = (item.tags || []).slice(0, 5).map(function (t) {
        return '<span class="tag">#' + t + '</span>';
      }).join('');
      var thumb = item.cover
        ? '<div class="post-thumb-h"><img src="' + item.cover + '" alt="" loading="lazy"></div>'
        : '';
      return '<article class="post-item-h"><a href="' + item.url + '" class="post-link-h">' +
        thumb +
        '<div class="post-info-h">' +
        '<h2 class="post-title-h">' + highlightText(item.title, query) + '</h2>' +
        (item.description ? '<p class="post-desc-h">' + highlightText(item.description, query) + '</p>' : '') +
        '<div class="post-meta-h"><time>' + item.date + '</time></div>' +
        (tags ? '<div class="post-tags-h">' + tags + '</div>' : '') +
        '</div></a></article>';
    }).join('');

    resultsEl.innerHTML = html;
  }
})();
