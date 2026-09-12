# Native-menu focus and pointer-audit synchronization

2026-09-12, AI-assisted engineering review under the existing release integration authorization.

Production workflow 34671083145 did not deploy. Its full Linux navigation gate inspected all 560 viewports and failed four mobile thank-you pages (de/fr/ja/ru): the Contact link's center was below the viewport after an attempted scroll. The corresponding Windows full run passed. All prior Linux gates, including 280 local-file pages and the public-header fixtures, passed; the failure is retained in the workflow audit artifact.

The application opens its native-enhanced menu and schedules focus on Home using requestAnimationFrame. The thank-you test previously scrolled to Contact immediately after clicking Menu, racing that scheduled focus. When focus ran afterward, the browser scrolled Home into view and moved Contact out of view. A real-browser regression with deliberately delayed frame scheduling and the unchanged production navigation script reproduces the old ordering: scroll Contact, wait for Home focus, then confirm Contact is not actionable.

The audit helper now clicks the real Menu control and waits for the actual expanded, rendered menu and focus inside it before scrolling/inspecting a lower item. It neither forces the menu open nor bypasses hit-testing. The regression then requires an actual pointer click to reach Contact. A negative test still times out when the application never opens its menu. Existing disabled/overlaid selector and page-error tests remain.

Only test/helper code and this evidence record change. No public HTML, CSS, JavaScript, PHP, download, SEO metadata, server policy or build input changes; the reviewed production artifact identity is expected to remain unchanged. A new candidate SHA, exact authorization binding and complete canonical Linux release run are still required. The failed attempt is not reclassified as PASS.
