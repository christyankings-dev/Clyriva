/* O último teste deste navegador. O worker só confirma a tentativa que o cliente iniciou. */
(() => {
  'use strict';
  const maxAge = 24 * 60 * 60 * 1000;
  const validId = id => typeof id === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

  function change(edit) {
    return new Promise((resolve, reject) => {
      const open = indexedDB.open('clyriva-teste-do-aparelho', 1);
      open.onupgradeneeded = () => open.result.createObjectStore('tentativa');
      open.onerror = () => reject(open.error);
      open.onblocked = () => reject(Error('Armazenamento local indisponível.'));
      open.onsuccess = () => {
        const db = open.result;
        const tx = db.transaction('tentativa', 'readwrite');
        const store = tx.objectStore('tentativa');
        const get = store.get('atual');
        let next;
        get.onsuccess = () => {
          const old = get.result;
          const fresh = old && Date.now() - old.started < maxAge ? old : null;
          next = edit(fresh);
          if (next === old) return;
          if (next) store.put(next, 'atual');
          else if (old) store.delete('atual');
        };
        tx.oncomplete = () => { db.close(); resolve(next); };
        tx.onabort = () => { db.close(); reject(tx.error || Error('Falha no armazenamento local.')); };
      };
    });
  }

  globalThis.ClyrivaPushTest = {
    validId,
    async read(owner) {
      const row = await change(current => current);
      return owner && row?.owner === owner ? row : null;
    },
    start: row => change(() => row),
    mark: (id, state, time = Date.now()) => change(current => {
      if (!current || current.id !== id || current.state === 'shown') return current;
      return {...current, state, shownAt: state === 'shown' ? time : null};
    }),
    forget: id => change(current => current?.id === id ? null : current)
  };
})();
