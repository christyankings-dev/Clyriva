const ios =
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const standalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;

export { ios, standalone };
