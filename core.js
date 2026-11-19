/* Regras compartilhadas pelo painel, pelo portal e pela edição local. */
(() => {
  'use strict';
  const groups = ['clients', 'invoices', 'cash', 'tasks', 'fees', 'taxes'];
  const labels = {clients:'Clientes', invoices:'Notas fiscais', cash:'Caixa', tasks:'Tarefas', fees:'Honorários', taxes:'Guias'};
  const empty = () => Object.fromEntries([['version', 1], ...groups.map(k => [k, []])]);
  const cents = v => {const t=String(v ?? 0);if(!/^[0-9]+(?:\.[0-9]{1,2})?$/.test(t))return NaN;const [whole,frac='']=t.split('.');return Number(whole)*100+Number(frac.padEnd(2,'0'));};
  const money = new Intl.NumberFormat('pt-BR', {style:'currency',currency:'BRL'});
  const sum = (rows, field) => rows.reduce((value, row) => value + cents(field(row)), 0) / 100;
  const brl = v => money.format(Number(v) || 0);
  const doc = v => String(v ?? '').trim().replace(/[.\/\-\s]/g, '').toUpperCase();
  const isCnpj = v => /^[A-Z0-9]{12}[0-9]{2}$/.test(doc(v));
  function validCnpj(value) {
    const c = doc(value);
    if (!isCnpj(c) || /^(.)\1{13}$/.test(c)) return false;
    const digits = Array.from(c, ch => ch.charCodeAt(0) - 48);
    for (const size of [12, 13]) {
      const total = digits.slice(0, size).reduce((s, x, i) => s + x * (2 + (size - 1 - i) % 8), 0);
      const remainder = total % 11;
      if (digits[size] !== (remainder < 2 ? 0 : 11 - remainder)) return false;
    }
    return true;
  }
  const validDate = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    !Number.isNaN(Date.parse(v+'T00:00:00Z')) && new Date(v+'T00:00:00Z').toISOString().slice(0,10) === v;
  const validMonth = v => typeof v === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
  const dateLabel = v => validDate(v) ? v.slice(8)+'/'+v.slice(5,7)+'/'+v.slice(0,4) : '—';
  const monthLabel = v => validMonth(v) ? v.slice(5)+'/'+v.slice(0,4) : '—';
  const amounts = {clients:['monthlyFee'], invoices:['value'], cash:['value'], tasks:[], fees:['expected','paid'], taxes:['value']};
  function workspace(raw) {
    if (!raw || raw.version !== 1) throw Error('Versão do arquivo de dados incompatível.');
    const {cofreCriptografado, exportedAt, localRevision, ...data} = raw;
    if (data.taxes === undefined) data.taxes = [];
    for (const group of groups) {
      const rows = data[group];
      if (!Array.isArray(rows)) throw Error('Lista inválida no backup: '+labels[group]+'.');
      const ids = new Set();
      rows.forEach((row, i) => {
        const fail = msg => { throw Error(labels[group]+', linha '+(i+1)+': '+msg+'.'); };
        if (!row || typeof row.id !== 'string' || !row.id.trim() || ids.has(row.id)) fail('identificador ausente ou duplicado');
        ids.add(row.id);
        if (group === 'clients' && (typeof row.name !== 'string' || !row.name.trim())) fail('nome ausente');
        for (const key of amounts[group]) {
          const value = row[key];
          if (value != null && ( !['string','number'].includes(typeof value) || !/^[0-9]+(?:\.[0-9]{1,2})?$/.test(String(value)) || !Number.isSafeInteger(cents(value)))) fail('valor inválido em '+key);
        }
        for (const key of ['date','dueDate','paidAt','start','openingDate']) {
          if (row[key] && !validDate(row[key])) fail('data inválida em '+key);
        }
        if (row.competence && !validMonth(row.competence)) fail('competência inválida');
      });
    }
    return data;
  }
  function checkLinks(data) {
    const clients = new Set(data.clients.map(c=>c.id));
    const invoices = new Map(data.invoices.map(i=>[i.id,i]));
    const receipts = new Map(), fees = new Set();
    for (const group of groups.slice(1)) {
      for (const row of data[group]) {
        const fail = message => {throw Error(labels[group]+' ('+row.id+'): '+message+'.');};
        if (!clients.has(row.clientId)) fail('cliente inexistente');
        if (group === 'fees') {
          const key = JSON.stringify([row.clientId,row.competence]);
          if (fees.has(key)) fail('honorários duplicados na competência');
          fees.add(key);
          if (cents(row.paid)>cents(row.expected)) fail('recebido maior que o devido');
        }
        if (group === 'cash' && row.invoiceId) {
          const invoice = invoices.get(row.invoiceId);
          if (!invoice || invoice.clientId !== row.clientId || invoice.status !== 'issued' || row.kind !== 'receipt') fail('vínculo de recebimento incompatível com a nota');
          const total = (receipts.get(invoice.id)||0)+cents(row.value);
          if (total>cents(invoice.value)) fail('recebimentos superiores ao valor da nota');
          receipts.set(invoice.id,total);
        }
      }
    }
  }
  function vault(blob) {
    if (blob === null || blob === undefined) return null;
    const encoded = (s, low, high) => {
      if (typeof s !== 'string' || s.length > Math.ceil(high / 3)*4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(s) || s.length%4) return false;
      try {const n=atob(s).length; return n >= low && n <= high;} catch {return false;}
    };
    if (Object.keys(blob).some(k=>!['version','alg','kdf','iterations','salt','iv','cipher'].includes(k)) ||
      blob.version !== 1 || (blob.alg && blob.alg !== 'AES-GCM') ||
      (blob.kdf && blob.kdf !== 'PBKDF2-SHA256') || !Number.isInteger(blob.iterations) ||
      blob.iterations < 100000 || blob.iterations > 2000000 || !encoded(blob.salt,16,16) ||
      !encoded(blob.iv,12,12) || !encoded(blob.cipher,16,16*1024*1024)) throw Error('Estrutura do cofre criptografado inválida. O original foi preservado.');
    return blob;
  }
  window.ClyrivaCore = Object.freeze({empty, cents, brl, sum, doc, isCnpj, validCnpj, validDate, validMonth, dateLabel, monthLabel, workspace, checkLinks, vault});
})();
