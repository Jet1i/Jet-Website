// Intersection Observer to enable glitch and mouse interactions only when footer is visible
(function () {
  const footer = document.querySelector('.glitch-footer');
  if (!footer) return;

  let activated = false;
  let teardown = null;

  const activate = () => {
    if (activated) return;
    activated = true;
    // Dynamically load footer-glitch.js logic (or inline recreate minimal handler)
    // For simplicity and performance, we call into existing code by dispatching a custom event
    const evt = new CustomEvent('glitch:activate');
    window.dispatchEvent(evt);
  };

  const deactivate = () => {
    if (!activated) return;
    activated = false;
    const evt = new CustomEvent('glitch:deactivate');
    window.dispatchEvent(evt);
  };

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) activate();
        else deactivate();
      });
    },
    { root: null, threshold: 0.2 }
  );
  io.observe(footer);
})();
