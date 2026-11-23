const changes = new EventTarget();

export function observeViewChanges(render) {
  changes.addEventListener('change', render);
}

export function invalidateView() {
  changes.dispatchEvent(new Event('change'));
}
