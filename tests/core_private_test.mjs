import assert from 'node:assert/strict';
import * as core from '../frontend/src/shared/domain/workspace.ts';
assert.strictEqual(core.cents('1.05'), 105);
assert.strictEqual(core.validCpf('529.982.247-25'), true);
assert.strictEqual(core.validCpf('111.444.777-35'), true);
assert.strictEqual(core.validCpf('52998224726'), false);
assert.strictEqual(core.validCpf('11111111111'), false);
assert.strictEqual(core.validCpf('1234567890'), false);
assert.strictEqual(core.cents('0.01'), 1);
assert.strictEqual(core.cents('0'), 0);
assert.ok(Number.isNaN(core.cents('0.145')));
assert.ok(Number.isNaN(core.cents('1e3')));
assert.ok(Number.isNaN(core.cents('0x10')));
assert.ok(Number.isNaN(core.cents(' 10 ')));
assert.ok(Number.isNaN(core.cents('-1')));
assert.throws(
  () =>
    core.workspace({
      version: 1,
      clients: [{ id: 'c', name: 'Teste', start: '2026-02-30' }],
      invoices: [],
      cash: [],
      tasks: [],
      fees: [],
      taxes: [],
    }),
  /data inválida/,
);
assert.throws(
  () =>
    core.workspace({
      version: 1,
      clients: [{ id: 'c', name: 'Teste', monthlyFee: 1.005 }],
      invoices: [],
      cash: [],
      tasks: [],
      fees: [],
      taxes: [],
    }),
  /valor inválido/,
);
console.log('OK — valores monetários, datas e validação do core');
