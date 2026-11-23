const changes = new EventTarget();

export function observeViewChanges(render: () => void): void {
  changes.addEventListener('change', render);
}

export function invalidateView(): void {
  changes.dispatchEvent(new Event('change'));
}
