/* SYNCYR approved reveal: same-origin iframe sizing. No libraries or requests. */
(function () {
  'use strict';
  function setup(frame) {
    if (frame.dataset.syncyrSized === 'true') return;
    frame.dataset.syncyrSized = 'true';
    var queued = false, observer = null, currentRoot = null;
    function fallbackHeight() {
      var width = frame.getBoundingClientRect().width || 320;
      return Math.ceil(Math.min(width, 1600) * 9 / 16 + 190);
    }
    function measure() {
      queued = false;
      var height = fallbackHeight();
      try {
        var doc = frame.contentDocument;
        var root = doc && doc.getElementById('syncyr-signal-reveal');
        if (root) {
          var actual = root.getBoundingClientRect().height;
          if (actual > 0) height = Math.ceil(actual);
          if (root !== currentRoot && typeof ResizeObserver === 'function') {
            if (observer) observer.disconnect();
            observer = new ResizeObserver(schedule);
            observer.observe(root);
            currentRoot = root;
          }
        }
      } catch (_) {
        // Cross-origin embeds cannot be measured; retain generous visible space.
      }
      var px = height + 'px';
      if (frame.style.height !== px) frame.style.height = px;
    }
    function schedule() {
      if (queued) return;
      queued = true;
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(measure);
      else setTimeout(measure, 0);
    }
    frame.addEventListener('load', schedule);
    window.addEventListener('resize', schedule, {passive: true});
    window.addEventListener('orientationchange', schedule, {passive: true});
    if (typeof ResizeObserver === 'function') {
      // Observing the iframe also handles CMS column-width changes without a
      // browser-window resize. Height writes settle after one unchanged pass.
      new ResizeObserver(schedule).observe(frame);
    }
    measure();
  }
  function init() {
    document.querySelectorAll('iframe[data-syncyr-reveal]').forEach(setup);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once: true});
  else init();
})();
