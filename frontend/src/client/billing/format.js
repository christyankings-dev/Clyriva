function money(cents) {
  return (
    'R$ ' +
    (Number(cents) / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function daysRemaining(iso) {
  if (!iso) return null;
  const d = Date.UTC(...iso.split('-').map((v, i) => (i === 1 ? Number(v) - 1 : Number(v))));
  const now = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date()),
    get = (k) => Number(now.find((v) => v.type === k)?.value || 0),
    today = Date.UTC(get('year'), get('month') - 1, get('day'));
  return Math.round((d - today) / 86400000);
}

export { daysRemaining, money };
