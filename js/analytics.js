/**
 * Begapunk Analytics & Cookie Consent Manager
 * GDPR / CCPA baseline compliance for B2B industrial websites
 * 
 * Features:
 * - Measurement consent banner (accept / decline)
 * - Conditional GA4 loading (only after consent)
 * - Consent state persisted in localStorage
 * - Consent-gated Google Ads / UTM session attribution
 * - No third-party cookie consent libraries (zero dependencies)
 * - Lightweight (~3 KB minified)
 * 
 * Usage:
 * 1. Configure GA_ID below with your GA4 Measurement ID
 * 2. Include this script in <head> of every page: <script src="js/analytics.js"></script>
 * 3. Banner HTML is auto-injected before </body> by this script
 */

(function () {
    'use strict';

    /* ===================== CONFIG ===================== */
    const CONFIG = {
        GA_ID: 'G-D4FZF37Z07',
        GA_DEBUG: false,               // Set true to log GA events to console
        STORAGE_KEY: 'begapunk_cookie_consent',
        ATTRIBUTION_STORAGE_KEY: 'begapunk_session_attribution_v1',
        // Version 2 expands the optional choice from analytics-only to analytics
        // and advertising-effectiveness measurement. Existing choices must be
        // collected again instead of silently broadening a prior consent.
        BANNER_VERSION: '2.0',
        COOKIE_MAX_AGE_DAYS: 365,
        // CSS class names used by the banner (prefix to avoid collisions)
        PREFIX: 'bp-consent-'
    };

    const ATTRIBUTION_FIELDS = Object.freeze([
        'gclid',
        'gbraid',
        'wbraid',
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_term',
        'utm_content',
        'first_landing_page',
        'initial_referrer'
    ]);
    const CLICK_ID_FIELDS = Object.freeze(['gclid', 'gbraid', 'wbraid']);
    const ATTRIBUTION_LIMITS = Object.freeze({
        gclid: 300,
        gbraid: 300,
        wbraid: 300,
        utm_source: 200,
        utm_medium: 200,
        utm_campaign: 200,
        utm_term: 200,
        utm_content: 200,
        first_landing_page: 500,
        initial_referrer: 500
    });

    /* ===================== STATE ===================== */
    let bannerEl = null;
    let bannerRemovalTimer = null;
    let consentState = null; // 'granted' | 'denied' | null

    function setConsentUiState(state) {
        document.documentElement.setAttribute('data-bp-consent-ui', state);
    }

    function cancelBannerRemoval() {
        if (bannerRemovalTimer !== null) {
            clearTimeout(bannerRemovalTimer);
            bannerRemovalTimer = null;
        }
    }

    // Queue Consent Mode v2 defaults before any Google measurement library loads.
    // No optional storage or user-data processing is enabled before a choice.
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () {
        window.dataLayer.push(arguments);
    };
    window.gtag('consent', 'default', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        wait_for_update: 500
    });

    /* ===================== UTILITIES ===================== */
    function getConsent() {
        try {
            const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
            if (!raw) return null;
            const data = JSON.parse(raw);
            const storedAt = data && Date.parse(data.timestamp);
            const maxAgeMs = CONFIG.COOKIE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
            const isCurrentVersion = data && data.version === CONFIG.BANNER_VERSION;
            const isWithinMaxAge = Number.isFinite(storedAt) && Date.now() - storedAt < maxAgeMs;

            if (isCurrentVersion && isWithinMaxAge && (data.value === 'granted' || data.value === 'denied')) {
                return data.value;
            }
            localStorage.removeItem(CONFIG.STORAGE_KEY);
        } catch (e) {
            // localStorage unavailable or corrupt
        }
        return null;
    }

    function setConsent(value) {
        try {
            localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify({
                value: value,
                version: CONFIG.BANNER_VERSION,
                timestamp: new Date().toISOString()
            }));
        } catch (e) {
            // localStorage unavailable (private mode, etc.)
        }
        consentState = value;
    }

    function updateGoogleConsent(measurementStorage) {
        window.gtag('consent', 'update', {
            analytics_storage: measurementStorage,
            ad_storage: measurementStorage,
            ad_user_data: measurementStorage,
            ad_personalization: 'denied'
        });
    }

    function notifyConsentChange() {
        document.dispatchEvent(new CustomEvent('begapunk:consent-change', {
            detail: { state: consentState }
        }));
    }

    function clearAnalyticsCookies() {
        const cookieNames = document.cookie.split(';').map(function (cookie) {
            return cookie.split('=')[0].trim();
        }).filter(function (name) {
            return /^_(?:ga(?:_|$)|gid$|gat(?:_|$))/i.test(name);
        });

        const hostname = window.location.hostname;
        const domainCandidates = ['', hostname, '.' + hostname];
        const hostnameParts = hostname.split('.');
        if (hostnameParts.length > 2) {
            domainCandidates.push('.' + hostnameParts.slice(-2).join('.'));
        }

        cookieNames.forEach(function (name) {
            domainCandidates.forEach(function (domain) {
                const domainPart = domain ? '; domain=' + domain : '';
                document.cookie = name + '=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + domainPart + '; SameSite=Lax';
            });
        });
    }

    function cleanAttributionValue(fieldName, rawValue) {
        if (typeof rawValue !== 'string') return '';
        const maximum = ATTRIBUTION_LIMITS[fieldName] || 200;
        const value = rawValue
            .replace(/[\u0000-\u001F\u007F]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, maximum);
        if (CLICK_ID_FIELDS.indexOf(fieldName) !== -1
            && value !== ''
            && !/^[A-Za-z0-9._~-]+$/.test(value)) {
            return '';
        }
        return value;
    }

    function normalizeTrackingUrl(rawValue, sameSiteOnly) {
        if (!rawValue) return '';
        try {
            const parsed = new URL(rawValue, window.location.href);
            if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return '';
            if (parsed.username || parsed.password) return '';
            if (sameSiteOnly && parsed.origin !== window.location.origin) return '';
            parsed.hash = '';
            return cleanAttributionValue(
                sameSiteOnly ? 'first_landing_page' : 'initial_referrer',
                parsed.href
            );
        } catch (error) {
            return '';
        }
    }

    function readSessionAttribution() {
        const cleanRecord = {};
        try {
            const raw = sessionStorage.getItem(CONFIG.ATTRIBUTION_STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : {};
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return cleanRecord;
            ATTRIBUTION_FIELDS.forEach(function (fieldName) {
                if (!Object.prototype.hasOwnProperty.call(parsed, fieldName)) return;
                cleanRecord[fieldName] = cleanAttributionValue(fieldName, parsed[fieldName]);
            });
        } catch (error) {
            // sessionStorage unavailable or corrupt
        }
        return cleanRecord;
    }

    function writeSessionAttribution(record) {
        try {
            sessionStorage.setItem(CONFIG.ATTRIBUTION_STORAGE_KEY, JSON.stringify(record));
        } catch (error) {
            // sessionStorage unavailable (private mode, etc.)
        }
    }

    function populateAttributionFields(record) {
        ATTRIBUTION_FIELDS.forEach(function (fieldName) {
            const field = document.getElementById(fieldName);
            if (field && field.tagName === 'INPUT' && field.type === 'hidden') {
                field.value = record[fieldName] || '';
            }
        });
    }

    function captureSessionAttribution() {
        if (consentState !== 'granted') return {};

        const record = readSessionAttribution();
        if (!Object.prototype.hasOwnProperty.call(record, 'first_landing_page')) {
            record.first_landing_page = normalizeTrackingUrl(window.location.href, true);
            record.initial_referrer = normalizeTrackingUrl(document.referrer, false);
        }

        try {
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.forEach(function (rawValue, rawKey) {
                const fieldName = String(rawKey).toLowerCase();
                if (ATTRIBUTION_FIELDS.indexOf(fieldName) === -1
                    || fieldName === 'first_landing_page'
                    || fieldName === 'initial_referrer') {
                    return;
                }
                const value = cleanAttributionValue(fieldName, rawValue);
                if (value !== '') record[fieldName] = value;
            });
        } catch (error) {
            // An invalid URL must not break consent or form behavior.
        }

        writeSessionAttribution(record);
        populateAttributionFields(record);
        return record;
    }

    function clearSessionAttribution() {
        try {
            sessionStorage.removeItem(CONFIG.ATTRIBUTION_STORAGE_KEY);
        } catch (error) {
            // sessionStorage unavailable
        }
        populateAttributionFields({});
    }

    function loadScript(src, async, defer) {
        return new Promise(function (resolve, reject) {
            const s = document.createElement('script');
            s.src = src;
            if (async) s.async = true;
            if (defer) s.defer = true;
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
        });
    }

    function trackEvent(eventName, parameters) {
        if (consentState !== 'granted' || !window.gtag || !window.gtag.loaded) {
            return;
        }
        window.gtag('event', eventName, Object.assign({
            content_language: document.documentElement.lang || 'en'
        }, parameters || {}));
    }

    function getLinkLabel(link) {
        return (link.getAttribute('aria-label') || link.textContent || '')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 100);
    }

    function bindConversionTracking() {
        document.addEventListener('click', function (event) {
            const link = event.target.closest('a');
            if (!link) return;

            const href = link.getAttribute('href') || '';
            const parameters = {
                link_text: getLinkLabel(link),
                page_path: window.location.pathname
            };

            if (/^mailto:/i.test(href)) {
                trackEvent('contact_email_click', parameters);
            } else if (/^(https?:)?\/\/(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)/i.test(href)) {
                trackEvent('whatsapp_click', parameters);
            } else if (/\.(pdf|step|stp|dxf|dwg)(?:[?#]|$)/i.test(href)) {
                trackEvent('technical_document_download', Object.assign(parameters, {
                    document_name: href.split('/').pop().split('?')[0]
                }));
            } else if (/contact\.html/i.test(href) && /quote|request/i.test(href + ' ' + parameters.link_text)) {
                trackEvent('quote_request_start', parameters);
            }
        });

        // Capture phase is intentional: contact-page handlers serialize
        // FormData on the form itself, so attribution must be refreshed first.
        document.addEventListener('submit', function (event) {
            const form = event.target;
            if (!form || form.tagName !== 'FORM') return;

            const action = form.getAttribute('action') || '';
            if (form.id === 'quoteForm' || /send_inquiry|contact/i.test(action)) {
                // Refresh hidden attribution immediately before native or AJAX
                // serialization. This is a no-op until measurement is accepted.
                captureSessionAttribution();
                // This records an attempt for funnel analysis. The confirmed
                // conversion is generate_lead, emitted only after server success.
                trackEvent('contact_form_attempt', {
                    form_id: form.id || 'contact_form',
                    page_path: window.location.pathname
                });
            }
        }, true);
    }

    function bindSuccessfulInquiryTracking() {
        document.addEventListener('begapunk:inquiry-success', function (event) {
            const detail = event.detail || {};
            trackEvent('generate_lead', {
                method: 'website_contact_form',
                form_id: detail.formId || 'quoteForm',
                inquiry_type: detail.inquiryType || 'general_inquiry',
                requested_product: detail.product || 'not_specified',
                page_path: window.location.pathname
            });
        });
    }

    /* ===================== GA4 LOADER ===================== */
    function initGA4() {
        if (!CONFIG.GA_ID || CONFIG.GA_ID === 'G-XXXXXXXXXX') {
            console.warn('[Begapunk Analytics] GA4 ID not configured. Set CONFIG.GA_ID in js/analytics.js');
            return;
        }

        updateGoogleConsent('granted');
        captureSessionAttribution();

        // Consent may be granted again after a prior decline while gtag.js is
        // already present. Update consent above, but do not configure it twice.
        if (window.gtag.loaded) return;

        window.gtag.loaded = true;
        window.gtag('js', new Date());
        window.gtag('config', CONFIG.GA_ID, {
            send_page_view: true,
            cookie_flags: 'SameSite=None;Secure',
            cookie_expires: CONFIG.COOKIE_MAX_AGE_DAYS * 24 * 60 * 60,
            // Disable advertising features by default (privacy-first)
            allow_google_signals: false,
            allow_ad_personalization_signals: false
        });

        // Load gtag.js
        loadScript('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(CONFIG.GA_ID), true, false)
            .then(function () {
                if (CONFIG.GA_DEBUG) console.log('[Begapunk Analytics] GA4 loaded:', CONFIG.GA_ID);
            })
            .catch(function () {
                console.warn('[Begapunk Analytics] Failed to load GA4 script');
            });

        // Track consent-granted event for audit trail
        window.gtag('event', 'cookie_consent_granted', {
            event_category: 'consent',
            event_label: 'banner_v' + CONFIG.BANNER_VERSION
        });
    }

    /* ===================== BANNER UI ===================== */
    function injectStyles() {
        if (document.getElementById('bp-consent-styles')) return;
        const css = `
            #bp-consent-banner {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                box-sizing: border-box;
                width: 100%;
                max-height: 100vh;
                max-height: 100dvh;
                overflow-x: hidden;
                overflow-y: auto;
                overscroll-behavior: contain;
                -webkit-overflow-scrolling: touch;
                z-index: 99999;
                background: rgba(255,255,255,0.97);
                border-top: 3px solid #0056b3;
                box-shadow: 0 -4px 20px rgba(0,0,0,0.12);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                font-size: 14px;
                line-height: 1.5;
                color: #333;
                transform: translateY(100%);
                transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            }
            #bp-consent-banner.bp-visible {
                transform: translateY(0);
            }
            #bp-consent-banner .bp-inner {
                box-sizing: border-box;
                width: 100%;
                max-width: 1200px;
                margin: 0 auto;
                padding-top: calc(16px + env(safe-area-inset-top, 0px));
                padding-right: calc(24px + env(safe-area-inset-right, 0px));
                padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
                padding-left: calc(24px + env(safe-area-inset-left, 0px));
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 20px;
            }
            #bp-consent-banner .bp-text {
                flex: 1;
                min-width: 0;
            }
            #bp-consent-banner .bp-text strong {
                display: block;
                margin-bottom: 4px;
                font-size: 15px;
                color: #111;
            }
            #bp-consent-banner .bp-text a {
                color: #0056b3;
                text-decoration: underline;
                font-weight: 500;
            }
            #bp-consent-banner .bp-text a:hover {
                color: #003d80;
            }
            #bp-consent-banner .bp-actions {
                display: flex;
                gap: 10px;
                flex-shrink: 0;
                flex-wrap: wrap;
            }
            #bp-consent-banner button {
                border: none;
                border-radius: 6px;
                padding: 10px 20px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                white-space: nowrap;
            }
            #bp-consent-banner .bp-btn-primary {
                background: #0056b3;
                color: #fff;
            }
            #bp-consent-banner .bp-btn-primary:hover {
                background: #003d80;
            }
            #bp-consent-banner .bp-btn-secondary {
                background: #f0f0f0;
                color: #333;
                border: 1px solid #ccc;
            }
            #bp-consent-banner .bp-btn-secondary:hover {
                background: #e0e0e0;
            }
            #bp-consent-banner .bp-btn-ghost {
                background: transparent;
                color: #666;
                text-decoration: underline;
                padding: 10px 8px;
                font-weight: 400;
            }
            #bp-consent-banner .bp-btn-ghost:hover {
                color: #333;
            }
            @media (max-width: 768px) {
                #bp-consent-banner .bp-inner {
                    flex-direction: column;
                    align-items: flex-start;
                    padding-top: calc(14px + env(safe-area-inset-top, 0px));
                    padding-right: calc(16px + env(safe-area-inset-right, 0px));
                    padding-bottom: calc(14px + env(safe-area-inset-bottom, 0px));
                    padding-left: calc(16px + env(safe-area-inset-left, 0px));
                    gap: 14px;
                }
                #bp-consent-banner .bp-actions {
                    width: 100%;
                    justify-content: stretch;
                }
                #bp-consent-banner button {
                    flex: 1 1 10rem;
                    min-width: 0;
                    text-align: center;
                    white-space: normal;
                    overflow-wrap: anywhere;
                }
            }
            @media (prefers-reduced-motion: reduce) {
                #bp-consent-banner,
                #bp-consent-banner button {
                    transition: none;
                }
            }
        `;
        const style = document.createElement('style');
        style.id = 'bp-consent-styles';
        style.textContent = css;
        document.head.appendChild(style);
    }

    function createBanner() {
        const existingBanner = document.getElementById('bp-consent-banner');
        if (existingBanner) {
            bannerEl = existingBanner;
            return bannerEl;
        }

        injectStyles();

        const language = (document.documentElement.lang || 'en').toLowerCase().split('-')[0];
        const messages = {
            fr: {
                label: 'Mesure facultative',
                title: 'Analyse et mesure de l’efficacité publicitaire',
                body: 'Avec votre accord, nous utilisons des cookies et le stockage facultatifs pour analyser la fréquentation du site et mesurer l’efficacité de la publicité. La publicité personnalisée reste désactivée. Les fonctions essentielles sont toujours actives.',
                privacy: 'Politique de confidentialité',
                decline: 'Refuser la mesure facultative',
                accept: 'Autoriser la mesure'
            },
            de: {
                label: 'Optionale Messung',
                title: 'Analyse und Werbeerfolg messen',
                body: 'Mit Ihrer Einwilligung nutzen wir optionale Cookies und Speicher für Webanalyse und die Messung des Werbeerfolgs. Personalisierte Werbung bleibt deaktiviert. Notwendige Funktionen sind immer aktiv.',
                privacy: 'Datenschutzerklärung',
                decline: 'Optionale Messung ablehnen',
                accept: 'Messung erlauben'
            },
            ja: {
                label: '任意の計測設定',
                title: 'アクセス解析と広告効果の計測',
                body: '同意いただいた場合、任意のCookieとストレージをアクセス解析および広告効果の計測に使用します。パーソナライズ広告は行いません。必須機能は常に有効です。',
                privacy: 'プライバシーポリシー',
                decline: '任意の計測を拒否',
                accept: '計測を許可'
            },
            ru: {
                label: 'Необязательные измерения',
                title: 'Аналитика и оценка эффективности рекламы',
                body: 'С вашего согласия мы используем необязательные cookie и хранилище для веб-аналитики и оценки эффективности рекламы. Персонализированная реклама остаётся отключённой. Необходимые функции всегда активны.',
                privacy: 'Политика конфиденциальности',
                decline: 'Отклонить измерения',
                accept: 'Разрешить измерения'
            },
            en: {
                label: 'Optional measurement consent',
                title: 'Analytics and advertising measurement',
                body: 'With your permission, we use optional cookies and storage for site analytics and advertising-effectiveness measurement. Personalized advertising remains off. Essential functions are always active.',
                privacy: 'Privacy Policy',
                decline: 'Decline optional measurement',
                accept: 'Allow measurement'
            }
        };
        const copy = messages[language] || messages.en;

        const banner = document.createElement('div');
        banner.id = 'bp-consent-banner';
        banner.setAttribute('role', 'dialog');
        banner.setAttribute('aria-label', copy.label);
        banner.innerHTML = `
            <div class="bp-inner">
                <div class="bp-text">
                    <strong>${copy.title}</strong>
                    ${copy.body}
                    <a href="privacy.html">${copy.privacy}</a>
                </div>
                <div class="bp-actions">
                    <button class="bp-btn-secondary" id="bp-decline-btn" type="button">${copy.decline}</button>
                    <button class="bp-btn-primary" id="bp-accept-btn" type="button">${copy.accept}</button>
                </div>
            </div>
        `;
        document.body.appendChild(banner);
        bannerEl = banner;

        // Bind events
        document.getElementById('bp-accept-btn').addEventListener('click', function () {
            handleAccept();
        });
        document.getElementById('bp-decline-btn').addEventListener('click', function () {
            handleDecline();
        });

        return bannerEl;
    }

    function showBanner() {
        cancelBannerRemoval();
        if (!bannerEl) createBanner();
        if (!bannerEl) {
            setConsentUiState('settled');
            return;
        }
        const bannerToShow = bannerEl;
        setConsentUiState('open');
        // Small delay to ensure CSS transition works
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                if (bannerEl === bannerToShow
                    && bannerToShow.parentNode
                    && document.documentElement.getAttribute('data-bp-consent-ui') === 'open') {
                    bannerToShow.classList.add('bp-visible');
                }
            });
        });
    }

    function hideBanner() {
        cancelBannerRemoval();
        if (!bannerEl) {
            setConsentUiState('settled');
            return;
        }
        const closingBanner = bannerEl;
        closingBanner.classList.remove('bp-visible');
        const reducedMotion = window.matchMedia
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        // Remove from DOM after animation, then allow the fixed CTA to return.
        bannerRemovalTimer = setTimeout(function () {
            if (bannerEl === closingBanner
                && document.documentElement.getAttribute('data-bp-consent-ui') === 'closing') {
                if (closingBanner.parentNode) closingBanner.parentNode.removeChild(closingBanner);
                bannerEl = null;
                setConsentUiState('settled');
            }
            bannerRemovalTimer = null;
        }, reducedMotion ? 0 : 500);
    }

    /* ===================== HANDLERS ===================== */
    function handleAccept() {
        setConsentUiState('closing');
        setConsent('granted');
        window['ga-disable-' + CONFIG.GA_ID] = false;
        initGA4();
        hideBanner();
        notifyConsentChange();
    }

    function handleDecline() {
        setConsentUiState('closing');
        setConsent('denied');
        updateGoogleConsent('denied');
        window['ga-disable-' + CONFIG.GA_ID] = true;
        clearAnalyticsCookies();
        clearSessionAttribution();
        hideBanner();
        notifyConsentChange();
        // A first-page decline prevents GA4 loading. If GA4 was loaded after an
        // earlier grant, Consent Mode plus ga-disable stop subsequent optional
        // measurement; the already executed script cannot be unloaded.
        if (CONFIG.GA_DEBUG) console.log('[Begapunk Analytics] User declined optional measurement');
    }

    /* ===================== PUBLIC API ===================== */
    window.BegapunkConsent = {
        /** Current consent state: 'granted' | 'denied' | null */
        get state() { return consentState; },

        /** Manually grant consent (e.g. from Privacy Policy page) */
        grant: function () {
            handleAccept();
        },

        /** Manually deny consent (e.g. from Privacy Policy page) */
        deny: function () {
            handleDecline();
        },

        /** Reset consent to show banner again */
        reset: function () {
            cancelBannerRemoval();
            try { localStorage.removeItem(CONFIG.STORAGE_KEY); } catch (e) {}
            consentState = null;
            updateGoogleConsent('denied');
            window['ga-disable-' + CONFIG.GA_ID] = true;
            clearAnalyticsCookies();
            clearSessionAttribution();
            showBanner();
            notifyConsentChange();
        },

        /** Check if GA4 is active */
        isGAActive: function () {
            return !!(window.gtag && window.gtag.loaded);
        },

        /** Get the GA4 ID being used */
        getGAId: function () {
            return CONFIG.GA_ID;
        }
    };

    /* ===================== INIT ===================== */
    function init() {
        consentState = getConsent();
        bindConversionTracking();
        bindSuccessfulInquiryTracking();

        if (consentState === 'granted') {
            setConsentUiState('settled');
            window['ga-disable-' + CONFIG.GA_ID] = false;
            initGA4();
            // Banner not shown
        } else if (consentState === 'denied') {
            setConsentUiState('settled');
            updateGoogleConsent('denied');
            window['ga-disable-' + CONFIG.GA_ID] = true;
            clearSessionAttribution();
            // Banner not shown, GA4 not loaded
        } else {
            clearSessionAttribution();
            // No decision yet — show banner when DOM is ready
            if (document.readyState === 'loading') {
                setConsentUiState('open');
                document.addEventListener('DOMContentLoaded', showBanner);
            } else {
                showBanner();
            }
        }
    }

    init();
})();
