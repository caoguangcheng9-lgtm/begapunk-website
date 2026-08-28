/**
 * Begapunk Site Search — Fuse.js powered client-side search
 * Searches across products, applications, blogs, and core pages
 */
(function () {
    'use strict';

    const currentScript = document.currentScript;
    const scriptBaseUrl = currentScript && currentScript.src
        ? new URL('.', currentScript.src)
        : new URL('js/', window.location.href);

    const CONFIG = {
        INDEX_URL: 'search-index.json',
        FUSE_SCRIPT: new URL('vendor/fuse.min.js?v=7.0.0', scriptBaseUrl).toString(),
        MIN_QUERY_LENGTH: 2,
        RESULTS_PER_PAGE: 20
    };

    const languageCode = (document.documentElement.lang || 'en').toLowerCase().split('-')[0];
    const UI_COPY = {
        en: {
            categories: { product: 'Product', application: 'Application', blog: 'Blog', core: 'Page' },
            resultCount: function (count, query) {
                return count + ' result' + (count !== 1 ? 's' : '') + ' for "' + query + '"';
            },
            enterSearchTerm: 'Enter a search term above',
            matchScore: function (percent) { return percent + '% match'; },
            loading: 'Loading search index...',
            browseProducts: function (count) { return 'Browse all ' + count + ' products — or search above'; },
            errorHtml: 'Search is temporarily unavailable. Please <a href="products.html">browse the catalog</a> directly.'
        },
        de: {
            categories: { product: 'Produkt', application: 'Anwendung', blog: 'Fachbeitrag', core: 'Seite' },
            resultCount: function (count, query) {
                return count + ' Ergebnis' + (count !== 1 ? 'se' : '') + ' für „' + query + '“';
            },
            enterSearchTerm: 'Geben Sie oben einen Suchbegriff ein.',
            matchScore: function (percent) { return percent + ' % Übereinstimmung'; },
            loading: 'Suchindex wird geladen …',
            browseProducts: function (count) { return 'Alle ' + count + ' Produkte im Überblick – oder oben suchen.'; },
            errorHtml: 'Die Suche ist vorübergehend nicht verfügbar. Öffnen Sie bitte direkt den <a href="products.html">Produktkatalog</a>.'
        },
        ja: {
            categories: { product: '製品', application: '用途', blog: '技術記事', core: 'ページ' },
            resultCount: function (count, query) { return '「' + query + '」の検索結果：' + count + '件'; },
            enterSearchTerm: '上の入力欄に検索キーワードを入力してください。',
            matchScore: function (percent) { return '一致度 ' + percent + '%'; },
            loading: '検索データを読み込んでいます…',
            browseProducts: function (count) { return '製品を' + count + '件表示しています。上の入力欄から検索できます。'; },
            errorHtml: '現在、検索を利用できません。<a href="products.html">製品一覧</a>をご覧ください。'
        },
        ru: {
            categories: { product: 'Изделие', application: 'Применение', blog: 'Статья', core: 'Страница' },
            resultCount: function (count, query) {
                const mod10 = count % 10;
                const mod100 = count % 100;
                const noun = mod10 === 1 && mod100 !== 11
                    ? 'результат'
                    : (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? 'результата' : 'результатов');
                return count + ' ' + noun + ' по запросу «' + query + '»';
            },
            enterSearchTerm: 'Введите запрос в поле выше.',
            matchScore: function (percent) { return 'Совпадение: ' + percent + ' %'; },
            loading: 'Загрузка поискового индекса…',
            browseProducts: function (count) { return 'Показаны все изделия: ' + count + '. Для поиска используйте поле выше.'; },
            errorHtml: 'Поиск временно недоступен. Перейдите в <a href="products.html">каталог продукции</a>.'
        }
    };
    const uiCopy = UI_COPY[languageCode] || UI_COPY.en;

    let fuse = null;
    let indexData = [];
    let currentQuery = '';
    let currentFilter = 'all';

    /* ===================== UTILITIES ===================== */
    function getQueryParam(name) {
        const params = new URLSearchParams(window.location.search);
        return params.get(name) || '';
    }

    function setQueryParam(name, value) {
        const url = new URL(window.location.href);
        if (value) {
            url.searchParams.set(name, value);
        } else {
            url.searchParams.delete(name);
        }
        window.history.replaceState({}, '', url.toString());
    }

    function loadScript(src) {
        return new Promise(function (resolve, reject) {
            const s = document.createElement('script');
            s.src = src;
            s.async = true;
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
        });
    }

    function fetchJSON(url) {
        return fetch(url).then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        });
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function highlightText(text, query) {
        if (!query || !text) return escapeHtml(text);
        const terms = query.trim().split(/\s+/).filter(function (t) { return t.length > 1; });
        let html = escapeHtml(text);
        terms.forEach(function (term) {
            const re = new RegExp('(' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
            html = html.replace(re, '<mark>$1</mark>');
        });
        return html;
    }

    function getCategoryLabel(cat) {
        return uiCopy.categories[cat] || cat;
    }

    function getCategoryIcon(cat) {
        const map = {
            product: '⚙️',
            application: '🏭',
            blog: '📚',
            core: '📄'
        };
        return map[cat] || '🔍';
    }

    /* ===================== FUSE INIT ===================== */
    function initFuse() {
        const options = {
            keys: [
                { name: 'title', weight: 0.35 },
                { name: 'id', weight: 0.25 },
                { name: 'keywords', weight: 0.20 },
                { name: 'description', weight: 0.10 },
                { name: 'h1', weight: 0.05 },
                { name: 'h2s', weight: 0.03 },
                { name: 'body', weight: 0.02 }
            ],
            threshold: 0.35,
            distance: 100,
            includeScore: true,
            includeMatches: false,
            minMatchCharLength: 2,
            ignoreLocation: true,
            useExtendedSearch: true
        };
        fuse = new window.Fuse(indexData, options);
    }

    /* ===================== RENDER ===================== */
    function renderResults(results) {
        const container = document.getElementById('search-results');
        const countEl = document.getElementById('search-count');
        const emptyEl = document.getElementById('search-empty');

        if (!container) return;

        // Filter by category
        let filtered = results;
        if (currentFilter !== 'all') {
            filtered = results.filter(function (r) {
                return r.item.category === currentFilter;
            });
        }

        // Update count
        if (countEl) {
            if (currentQuery) {
                countEl.textContent = uiCopy.resultCount(filtered.length, currentQuery);
            } else {
                countEl.textContent = uiCopy.enterSearchTerm;
            }
        }

        // Empty state
        if (filtered.length === 0) {
            container.innerHTML = '';
            if (emptyEl) emptyEl.style.display = 'block';
            return;
        }
        if (emptyEl) emptyEl.style.display = 'none';

        // Build HTML
        const html = filtered.map(function (result) {
            const item = result.item;
            const score = result.score;
            const relevance = score < 0.2 ? 'high' : score < 0.4 ? 'medium' : 'low';

            return '<article class="search-result-card" data-relevance="' + relevance + '">\n' +
                '  <div class="search-result-meta">\n' +
                '    <span class="search-result-badge">' + getCategoryIcon(item.category) + ' ' + getCategoryLabel(item.category) + '</span>\n' +
                '    <span class="search-result-score">' + uiCopy.matchScore(Math.round((1 - score) * 100)) + '</span>\n' +
                '  </div>\n' +
                '  <h3 class="search-result-title"><a href="' + escapeHtml(item.url) + '">' + highlightText(item.title, currentQuery) + '</a></h3>\n' +
                '  <p class="search-result-desc">' + highlightText(item.description, currentQuery) + '</p>\n' +
                (item.keywords && item.keywords.length ?
                    '  <div class="search-result-tags">' +
                    item.keywords.slice(0, 6).map(function (k) {
                        return '<span class="search-tag">' + escapeHtml(k) + '</span>';
                    }).join('') +
                    '</div>\n' : '') +
                '</article>';
        }).join('');

        container.innerHTML = html;
    }

    function renderSuggestions(query) {
        if (!fuse || query.length < CONFIG.MIN_QUERY_LENGTH) {
            renderResults([]);
            return;
        }
        const results = fuse.search(query, { limit: CONFIG.RESULTS_PER_PAGE });
        renderResults(results);
    }

    /* ===================== UI BINDINGS ===================== */
    function bindSearchInput() {
        const input = document.getElementById('search-input');
        if (!input) return;

        // Set initial value from URL
        input.value = currentQuery;

        let debounceTimer;
        input.addEventListener('input', function () {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(function () {
                currentQuery = input.value.trim();
                setQueryParam('q', currentQuery);
                renderSuggestions(currentQuery);
            }, 200);
        });

        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                currentQuery = input.value.trim();
                setQueryParam('q', currentQuery);
                renderSuggestions(currentQuery);
            }
        });

        // Focus on load
        if (currentQuery) {
            input.focus();
        }
    }

    function bindFilters() {
        const buttons = document.querySelectorAll('.search-filter-btn');
        buttons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                buttons.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                currentFilter = btn.dataset.filter || 'all';
                renderSuggestions(currentQuery);
            });
        });
    }

    /* ===================== INIT ===================== */
    function init() {
        currentQuery = getQueryParam('q');

        // Show loading
        const container = document.getElementById('search-results');
        if (container) container.innerHTML = '<p class="search-loading">' + uiCopy.loading + '</p>';

        // Load Fuse.js + index in parallel
        Promise.all([
            loadScript(CONFIG.FUSE_SCRIPT),
            fetchJSON(CONFIG.INDEX_URL)
        ]).then(function (results) {
            indexData = results[1];
            initFuse();
            bindSearchInput();
            bindFilters();

            if (currentQuery) {
                renderSuggestions(currentQuery);
            } else {
                // Show all products as default browse view
                const allProducts = indexData
                    .filter(function (d) { return d.category === 'product'; })
                    .map(function (d) { return { item: d, score: 0 }; });
                renderResults(allProducts);
                if (document.getElementById('search-count')) {
                    document.getElementById('search-count').textContent = uiCopy.browseProducts(allProducts.length);
                }
            }
        }).catch(function (err) {
            console.error('[SiteSearch] Failed to initialize:', err);
            if (container) {
                container.innerHTML = '<p class="search-error">' + uiCopy.errorHtml + '</p>';
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
