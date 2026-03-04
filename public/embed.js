/**
 * Trackbliss Returns Portal Embed Widget
 *
 * Usage:
 *   <script src="https://dpp-app.fambliss.eu/embed.js"></script>
 *   <div id="trackbliss-returns"></div>
 *   <script>
 *     Trackbliss.embed({
 *       tenant: 'my-tenant-slug',
 *       type: 'portal',           // 'portal' | 'register' | 'track'
 *       selector: '#trackbliss-returns',
 *       lang: 'de',               // optional, defaults to browser language
 *     });
 *   </script>
 */
(function () {
  'use strict';

  var ORIGIN = (function () {
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      var src = scripts[i].src || '';
      if (src.indexOf('embed.js') !== -1) {
        try {
          var url = new URL(src);
          return url.origin;
        } catch (e) {
          // fallback
        }
      }
    }
    return 'https://dpp-app.fambliss.eu';
  })();

  function embed(options) {
    if (!options || !options.tenant) {
      console.error('[Trackbliss] "tenant" is required');
      return;
    }

    var type = options.type || 'portal';
    var selector = options.selector || '#trackbliss-returns';
    var lang = options.lang || '';

    var container = document.querySelector(selector);
    if (!container) {
      console.error('[Trackbliss] Container not found: ' + selector);
      return;
    }

    // Build iframe URL
    var iframeSrc = ORIGIN + '/embed/' + type + '/' + encodeURIComponent(options.tenant);
    if (lang) {
      iframeSrc += '?lang=' + encodeURIComponent(lang);
    }

    // Create iframe
    var iframe = document.createElement('iframe');
    iframe.src = iframeSrc;
    iframe.style.width = '100%';
    iframe.style.height = '600px';
    iframe.style.border = 'none';
    iframe.style.display = 'block';
    iframe.style.overflow = 'hidden';
    iframe.style.colorScheme = 'light';
    iframe.setAttribute('allowtransparency', 'true');
    iframe.setAttribute('title', 'Trackbliss Returns Portal');

    container.innerHTML = '';
    container.appendChild(iframe);

    // Listen for messages from the iframe
    window.addEventListener('message', function (event) {
      if (!event.data || typeof event.data.type !== 'string') return;
      if (!event.data.type.startsWith('trackbliss:')) return;

      switch (event.data.type) {
        case 'trackbliss:ready':
        case 'trackbliss:resize':
          if (event.data.height && event.data.height > 0) {
            iframe.style.height = event.data.height + 'px';
          }
          break;

        case 'trackbliss:return_created':
          // Dispatch a custom event on the container so the host page can react
          var customEvent = new CustomEvent('trackbliss:return_created', {
            detail: { returnNumber: event.data.returnNumber },
            bubbles: true,
          });
          container.dispatchEvent(customEvent);
          break;
      }
    });
  }

  // Expose global API
  window.Trackbliss = window.Trackbliss || {};
  window.Trackbliss.embed = embed;
})();
