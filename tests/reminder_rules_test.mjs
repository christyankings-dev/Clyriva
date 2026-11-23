import test from 'node:test';
import assert from 'node:assert/strict';
import {
  daysUntil,
  brazilDate,
  validISODate,
  parseBrlCents,
  moneyBRL,
  reminderText,
  CHARGE_TYPES,
} from '../edge-functions/clyriva-client/reminder-text.mjs';

const charge = {
  id: '77773333-1234-4444-bbbb-123456789098',
  notice_type: 'DAS',
  title: 'DAS MEI · novembro/2026',
  amount_cents: 8250,
  due_date: '2026-11-23',
};

test('notificações exclusivamente em D-3, D-2, D-1 e D0', () => {
  assert.equal(daysUntil('2026-11-23', '2026-11-20'), 3);
  assert.equal(daysUntil('2026-11-23', '2026-11-21'), 2);
  assert.equal(daysUntil('2026-11-23', '2026-11-22'), 1);
  assert.equal(daysUntil('2026-11-23', '2026-11-23'), 0);
  assert.equal(daysUntil('2026-11-23', '2026-11-19'), null);
  assert.equal(daysUntil('2026-11-23', '2026-11-24'), null);
});
test('textos para cada etapa com valor e vencimento', () => {
  assert.equal(reminderText(charge, 3, true, '2026-11-20').title, 'DAS vence em 3 dias');
  assert.equal(reminderText(charge, 2, true, '2026-11-21').title, 'DAS vence em 2 dias');
  assert.equal(reminderText(charge, 1, true, '2026-11-22').title, 'DAS vence amanhã');
  assert.equal(reminderText(charge, 0, true, '2026-11-23').title, 'DAS vence hoje');
  for (const stage of [3, 2, 1, 0]) {
    const msg = reminderText(charge, stage, true, '2026-11-' + String(23 - stage));
    assert.match(msg.body, /R\$ 82,50/);
    assert.match(msg.body, /23\/11\/2026/);
    assert.match(msg.body, /novembro\/2026/);
    assert.equal(msg.url, '/cliente.html');
  }
});
test('valor opcional oculto no celular', () => {
  const msg = reminderText(charge, 3, false, '2026-11-20');
  assert.ok(!msg.body.includes('R$'));
  assert.ok(msg.body.includes('DAS MEI'));
});
test('marcadores diferentes por dia e por cobrança', () => {
  const a = reminderText(charge, 3, true, '2026-11-20'),
    b = reminderText(charge, 2, true, '2026-11-21');
  assert.notEqual(a.tag, b.tag);
  assert.notEqual(a.tag, reminderText({ ...charge, id: 'other' }, 3, true, '2026-11-20').tag);
});
test('datas válidas e ano bissexto', () => {
  assert.equal(validISODate('2024-02-29'), true);
  assert.equal(validISODate('2025-02-29'), false);
  assert.equal(daysUntil('2024-03-01', '2024-02-27'), 3);
  assert.equal(daysUntil('2024-03-01', '2024-02-29'), 1);
  assert.equal(validISODate('2026-13-01'), false);
  assert.equal(daysUntil('2026-11-31', '2026-11-29'), null);
});
test('dia de Brasília durante transição de UTC', () => {
  assert.equal(brazilDate(new Date('2026-11-20T02:40:00Z')), '2026-11-19');
  assert.equal(brazilDate(new Date('2026-11-20T12:00:00Z')), '2026-11-20');
});
test('centavos exatos e formatos brasileiros', () => {
  assert.equal(parseBrlCents('82,50'), 8250);
  assert.equal(parseBrlCents('1.500,00'), 150000);
  assert.equal(parseBrlCents('1500.00'), 150000);
  assert.equal(parseBrlCents('0.01'), 1);
  assert.equal(moneyBRL(8250), 'R$ 82,50');
  assert.equal(moneyBRL(156750), 'R$ 1.567,50');
  assert.equal(parseBrlCents('0'), null);
  assert.equal(parseBrlCents('-1'), null);
  assert.equal(parseBrlCents('1.5.00'), null);
  assert.equal(parseBrlCents('foo'), null);
  assert.equal(parseBrlCents('1000.001'), null);
});
test('descrições e tipos de cobrança distintos', () => {
  assert.ok(CHARGE_TYPES.includes('Boleto'));
  assert.equal(
    reminderText({ ...charge, notice_type: 'Boleto' }, 0, true, '2026-11-23').title,
    'Boleto vence hoje',
  );
  assert.throws(() => reminderText(charge, 4));
});
