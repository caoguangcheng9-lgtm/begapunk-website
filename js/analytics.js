/**
 * Begapunk Analytics & Cookie Consent Manager
 * GDPR / CCPA baseline compliance for B2B industrial websites
 * 
 * Features:
 * - Cookie consent banner (accept / decline)
 * - Conditional GA4 loading (only after consent)
 * - Consent state persisted in localStorage
 * - No third-party cookie consent libraries (zero dependencies)
 * - Lightweight (~3 KB minified)
 * 
 * Usage:
 * 1. Replace GA_MEASUREMENT_ID below with your real GA4 ID (G-XXXXXXXXXX)
 * 2. Include this script in <head> of every page: <script src="js/analytics.js"></script>
 * 3. Banner HTML is auto-injected before </body> by this script
 */

(function () {
    'use strict';

    /* ===================== CONFIG ===================== */
    const CONFIG = {
        // TODO: Replace with your actual GA4 Measurement ID
        GA_ID: 'G-XXXXXXXXXX',
        GA_DEBUG: false,               // Set true to log GA events to console
        STORAGE_KEY: 'begapunk_cookie_consent',
        BANNER_VERSION: '1.0',
        COOKIE_MAX_AGE_DAYS: 365,
        // CSS class names used by the banner (prefix to avoid collisions)
        PREFIX: 'bp-consent-'
    };

    /* ===================== STATE ===================== */
    let bannerEl = null;
    let consentState = null; // 'granted' | 'denied' | null

    /* ===================== UTILITIES ===================== */
    function getConsent() {
        try {
            const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
            if (!raw) return null;
            const data = JSON.parse(raw);
            // Validate structure
            if (data && (data.value === 'granted' || data.value === 'denied')) {
                return data.value;
            }
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

    /* ===================== GA4 LOADER ===================== */
    function initGA4() {
        if (!CONFIG.GA_ID || CONFIG.GA_ID === 'G-XXXXXXXXXX') {
            console.warn('[Begapunk Analytics] GA4 ID not configured. Set CONFIG.GA_ID in js/analytics.js');
            return;
        }

        // Prevent double-init
        if (window.gtag && window.gtag.loaded) return;

        window.dataLayer = window.dataLayer || [];
        function gtag() { dataLayer.push(arguments); }
        window.gtag = gtag;
        gtag.loaded = true;
        gtag('js', new Date());
        gtag('config', CONFIG.GA_ID, {
            send_page_view: true,
            cookie_flags: 'SameSite=None;Secure',
            cookie_expires: CONFIG.COOKIE_MAX_AGE_DAYS * 24 * 60 * 60,
            // B2B-specific: longer session timeout (30 min)
            session_duration: 1800000,
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
        gtag('event', 'cookie_consent_granted', {
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
                max-width: 1200px;
                margin: 0 auto;
                padding: 16px 24px;
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
                    padding: 14px 16px;
                    gap: 14px;
                }
                #bp-consent-banner .bp-actions {
                    width: 100%;
                    justify-content: stretch;
                }
                #bp-consent-banner button {
                    flex: 1;
                    text-align: center;
                }
            }
        `;
        const style = document.createElement('style');
        style.id = 'bp-consent-styles';
        style.textContent = css;
        document.head.appendChild(style);
    }

    function createBanner() {
        if (document.getElementById('bp-consent-banner')) return;

        injectStyles();

        const banner = document.createElement('div');
        banner.id = 'bp-consent-banner';
        banner.setAttribute('role', 'dialog');
        banner.setAttribute('aria-label', 'Cookie consent');
        banner.innerHTML = `
            <div class="bp-inner">
                <div class="bp-text">
                    <strong>Cookie Preferences</strong>
                    We use cookies to analyze site traffic and improve your experience. 
                    Essential cookies are always active. You can accept or decline analytics cookies.
                    <a href="privacy.html">Privacy Policy</a>
                </div>
                <div class="bp-actions">
                    <button class="bp-btn-secondary" id="bp-decline-btn" type="button">Decline</button>
                    <button class="bp-btn-primary" id="bp-accept-btn" type="button">Accept All</button>
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
    }

    function showBanner() {
        if (!bannerEl) createBanner();
        // Small delay to ensure CSS transition works
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                bannerEl.classList.add('bp-visible');
            });
        });
    }

    function hideBanner() {
        if (bannerEl) {
            bannerEl.classList.remove('bp-visible');
            // Remove from DOM after animation
            setTimeout(function () {
                if (bannerEl && bannerEl.parentNode) {
                    bannerEl.parentNode.removeChild(bannerEl);
                    bannerEl = null;
                }
            }, 500);
        }
    }

    /* ===================== HANDLERS ===================== */
    function handleAccept() {
        setConsent('granted');
        initGA4();
        hideBanner();
    }

    function handleDecline() {
        setConsent('denied');
        hideBanner();
        // Ensure no GA4 scripts are loaded
        if (CONFIG.GA_DEBUG) console.log('[Begapunk Analytics] User declined analytics cookies');
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
            try { localStorage.removeItem(CONFIG.STORAGE_KEY); } catch (e) {}
            consentState = null;
            showBanner();
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

        if (consentState === 'granted') {
            initGA4();
            // Banner not shown
        } else if (consentState === 'denied') {
            // Banner not shown, GA4 not loaded
        } else {
            // No decision yet — show banner when DOM is ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', showBanner);
            } else {
                showBanner();
            }
        }
    }

    init();
})();
