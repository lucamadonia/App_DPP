/*!
 * Trackbliss Feedback Widget Loader
 *
 * Usage on any tenant homepage:
 *   <div id="trackbliss-feedback"
 *        data-tenant="my-tenant-slug"
 *        data-mode="carousel"
 *        data-product="optional-uuid"
 *        data-min-rating="4"></div>
 *   <script async src="https://dpp-app.fambliss.eu/widget.js"></script>
 *
 * The loader finds every matching div, creates an iframe that points
 * at /embed/feedback/:tenant, and auto-resizes via postMessage events
 * from the embed page. Supports multiple widgets per page.
 */
(function () {
  'use strict';
  if (window.__trackblissFeedbackLoaded__) return;
  window.__trackblissFeedbackLoaded__ = true;

  var BASE = (function () {
    var s = document.currentScript;
    if (!s || !s.src) return '';
    var u = new URL(s.src);
    return u.origin;
  })();

  function init() {
    var nodes = document.querySelectorAll('[id^="trackbliss-feedback"]');
    Array.prototype.forEach.call(nodes, mount);
  }

  function mount(host) {
    if (host.dataset.tbMounted === '1') return;
    host.dataset.tbMounted = '1';

    var tenant = host.dataset.tenant;
    if (!tenant) {
      host.innerHTML = '<div style="padding:8px;font:13px sans-serif;color:#a00">trackbliss-feedback: data-tenant attribute is required</div>';
      return;
    }

    var qs = new URLSearchParams();
    if (host.dataset.mode) qs.set('mode', host.dataset.mode);
    if (host.dataset.product) qs.set('product', host.dataset.product);
    if (host.dataset.minRating) qs.set('minRating', host.dataset.minRating);
    if (host.dataset.limit) qs.set('limit', host.dataset.limit);
    if (host.dataset.accent) qs.set('accent', host.dataset.accent);

    var src = BASE + '/embed/feedback/' + encodeURIComponent(tenant);
    var query = qs.toString();
    if (query) src += '?' + query;

    var iframe = document.createElement('iframe');
    iframe.src = src;
    iframe.title = 'Trackbliss verified reviews for ' + tenant;
    iframe.allow = 'fullscreen';
    iframe.setAttribute('loading', 'lazy');
    iframe.style.cssText = 'width:100%;border:0;background:transparent;display:block;min-height:240px;';
    iframe.dataset.tbTenant = tenant;

    host.innerHTML = '';
    host.appendChild(iframe);
  }

  // Listen for resize events from the embedded iframes
  window.addEventListener('message', function (event) {
    var d = event && event.data;
    if (!d || typeof d !== 'object') return;
    if (d.type !== 'trackbliss:resize' && d.type !== 'trackbliss:ready') return;
    if (typeof d.height !== 'number' || d.height <= 0) return;
    var frames = document.querySelectorAll('iframe[data-tb-tenant]');
    Array.prototype.forEach.call(frames, function (f) {
      if (f.contentWindow === event.source) {
        f.style.height = d.height + 'px';
      }
    });
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
