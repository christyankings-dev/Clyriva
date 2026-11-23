import { requests } from '../state.js';
import { el, fmtDate, fmtMoney, status } from '../ui.js';
import { $, api } from '../api.js';
import { company } from '../selectors.js';
import { refresh } from './refresh.js';
import { temporaryAccess } from '../access/invite.js';
import { editCharge } from '../billing/form.js';
import { attachmentBlock } from '../documents/attachments.js';

function render() {
  const active = requests.state.companies.filter((x) => x.status !== 'inactive');
  for (const select of document.querySelectorAll('.company-select')) {
    const old = select.value;
    select.replaceChildren();
    const placeholder = el('option', 'Selecione a empresa');
    placeholder.value = '';
    select.append(placeholder);
    active.forEach((c) => {
      const option = el('option', c.name);
      option.value = c.id;
      select.append(option);
    });
    if (active.some((x) => x.id === old)) select.value = old;
  }
  const clientFilter = $('#billing-client-filter');
  if (clientFilter) {
    const selected = clientFilter.value;
    clientFilter.replaceChildren();
    const allOption = el('option', 'Todas as empresas');
    allOption.value = 'all';
    clientFilter.append(allOption);
    active.forEach((c) => {
      const op = el('option', c.name);
      op.value = c.id;
      clientFilter.append(op);
    });
    clientFilter.value = active.some((c) => c.id === selected) ? selected : 'all';
  }
  const access = $('#access-list');
  access.replaceChildren();
  if (!requests.state.grants.length)
    access.append(el('div', 'Nenhum cliente autorizado até agora.', 'empty'));
  for (const grant of requests.state.grants) {
    const card = el('article', null, 'notice-card');
    const top = el('div', null, 'between');
    top.append(
      el('strong', company(grant.client_id)),
      el('span', grant.enabled ? 'Ativo' : 'Revogado', grant.enabled ? 'pill' : 'meta'),
    );
    card.append(
      top,
      el('p', grant.email, 'small'),
      el(
        'p',
        grant.enabled
          ? grant.active_devices > 0
            ? 'Notificações ativas em ' + grant.active_devices + ' dispositivo(s)'
            : 'Nenhum celular com notificações inscritas ainda.'
          : 'Acesso desativado.',
        'meta',
      ),
    );
    if (grant.enabled) {
      const b = el('button', 'Revogar acesso', 'btn');
      b.type = 'button';
      b.addEventListener('click', async () => {
        if (
          !confirm(
            'Revogar o acesso de ' + grant.email + ' à empresa ' + company(grant.client_id) + '?',
          )
        )
          return;
        b.disabled = true;
        try {
          await api('revoke', {
            clientId: grant.client_id,
            email: grant.email,
          });
          status('#admin-feedback', 'Acesso revogado.');
          await refresh();
        } catch (e) {
          status('#admin-feedback', e.message, true);
        } finally {
          b.disabled = false;
        }
      });
      card.append(b);
      const reset = el('button', 'Redefinir senha do cliente', 'btn');
      reset.type = 'button';
      reset.style.margin = '8px';
      reset.addEventListener('click', async () => {
        if (
          !confirm(
            'Gerar nova senha provisória para ' +
              grant.email +
              '? A senha atual deixará de funcionar, inclusive se este e-mail acessar outras empresas.',
          )
        )
          return;
        reset.disabled = true;
        try {
          const result = await api('reset-access', {
            clientId: grant.client_id,
            email: grant.email,
          });
          temporaryAccess(result.email, result.temporaryPassword, result.loginUrl);
          status('#admin-feedback', 'Senha renovada. Envie o acesso de forma privada.');
        } catch (err) {
          status('#admin-feedback', err.message, true);
        } finally {
          reset.disabled = false;
        }
      });
      card.append(reset);
    }
    access.append(card);
  }
  const notices = $('#notices-list');
  notices.replaceChildren();
  const filterClient = $('#billing-client-filter')?.value || 'all';
  const scopedNotices = requests.state.notices.filter(
    (n) => filterClient === 'all' || n.client_id === filterClient,
  );
  const activeBills = scopedNotices.filter((x) => x.reminder_enabled && x.status === 'active');
  const dateParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const part = (type) => dateParts.find((x) => x.type === type)?.value;
  const now = part('year') + '-' + part('month') + '-' + part('day');
  const dueDays = (iso) =>
    Math.round((Date.parse(iso + 'T00:00:00Z') - Date.parse(now + 'T00:00:00Z')) / 86400000);
  const late = activeBills.filter((x) => dueDays(x.due_date) < 0),
    soon = activeBills.filter((x) => {
      const d = dueDays(x.due_date);
      return d >= 0 && d <= 3;
    });
  const summary = $('#billing-summary');
  if (summary) {
    summary.replaceChildren();
    for (const [name, value] of [
      ['Em aberto', activeBills.length],
      ['Vencem em até 3 dias', soon.length],
      ['Atrasadas', late.length],
      ['Pagas', scopedNotices.filter((n) => n.status === 'paid').length],
    ]) {
      const card = el('div', null, 'summary-item');
      card.append(el('strong', value), el('span', name));
      summary.append(card);
    }
  }
  const filter = $('#billing-filter')?.value || 'all';
  const filtered = scopedNotices
    .filter((n) => {
      if (filter === 'pending') return n.status === 'active' && n.reminder_enabled;
      if (filter === 'soon')
        return (
          n.status === 'active' &&
          n.reminder_enabled &&
          dueDays(n.due_date) >= 0 &&
          dueDays(n.due_date) <= 3
        );
      if (filter === 'late')
        return n.status === 'active' && n.reminder_enabled && dueDays(n.due_date) < 0;
      if (filter === 'paid') return n.status === 'paid';
      if (filter === 'messages') return !n.reminder_enabled;
      return true;
    })
    .sort((a, b) =>
      a.status === 'active' && b.status !== 'active'
        ? -1
        : a.status !== 'active' && b.status === 'active'
          ? 1
          : String(a.due_date || '9999').localeCompare(String(b.due_date || '9999')),
    );
  if (!filtered.length) notices.append(el('div', 'Nenhum aviso publicado ainda.', 'empty'));
  for (const n of filtered) {
    const bill = !!n.reminder_enabled,
      linked = Boolean(n.source_type && n.source_id);
    const card = el('article', null, 'notice-card'),
      top = el('div', null, 'between');
    const label =
      n.status === 'paid'
        ? 'Pago'
        : n.status === 'archived'
          ? 'Arquivado'
          : bill
            ? 'A vencer'
            : 'Publicado';
    top.append(
      el('strong', (bill ? n.notice_type + ' · ' : '') + n.title),
      el('span', label, n.status === 'paid' ? 'pill' : 'meta'),
    );
    card.append(top, el('p', n.body));
    if (linked)
      card.append(
        el(
          'div',
          'Vinculada à ficha do cliente: altere valor, vencimento e pagamento na guia original, no painel principal. Aqui você pode consultar documentos e arquivar a publicação.',
          'meta',
        ),
      );
    card.append(
      el(
        'div',
        company(n.client_id) +
          ' · Vencimento: ' +
          fmtDate(n.due_date) +
          (bill ? ' · ' + fmtMoney(n.amount_cents) : ''),
        'meta',
      ),
    );
    if (bill) {
      card.append(
        el(
          'div',
          n.last_delivery
            ? 'Último lembrete aceito pelo serviço: ' +
                fmtDate(n.last_delivery.date) +
                ' (D-' +
                n.last_delivery.daysBefore +
                ').'
            : 'Lembretes ainda não enviados para dispositivo inscrito.',
          'meta',
        ),
      );
    }
    if (bill && n.status === 'paid' && !linked) {
      const reopen = el('button', 'Reabrir cobrança', 'btn');
      reopen.type = 'button';
      reopen.addEventListener('click', async () => {
        if (!confirm('Reabrir esta cobrança? Ela voltará a enviar lembretes nos dias devidos.'))
          return;
        reopen.disabled = true;
        try {
          await api('reopen-charge', {
            noticeId: n.id,
          });
          status('#admin-feedback', 'Cobrança reaberta. Lembretes futuros retomados.');
          await refresh();
        } catch (e) {
          status('#admin-feedback', e.message, true);
        } finally {
          reopen.disabled = false;
        }
      });
      card.append(reopen);
    }
    if (bill && n.status === 'active') {
      const copyBill = el('button', 'Copiar lembrete', 'btn');
      copyBill.type = 'button';
      copyBill.style.margin = '8px 0 8px 0';
      copyBill.addEventListener('click', async () => {
        const txt =
          'Olá! Lembrete de ' +
          n.notice_type +
          ': ' +
          n.title +
          '\nValor: ' +
          fmtMoney(n.amount_cents) +
          '\nVencimento: ' +
          fmtDate(n.due_date) +
          '\n' +
          (n.body || 'Confira a guia e os dados de pagamento.');
        try {
          await navigator.clipboard.writeText(txt);
          status('#admin-feedback', 'Lembrete copiado para enviar ao cliente.');
        } catch {
          status('#admin-feedback', 'Não foi possível copiar automaticamente.', true);
        }
      });
      card.append(copyBill);
      if (!linked) {
        const edit = el('button', 'Editar cobrança', 'btn');
        edit.type = 'button';
        edit.addEventListener('click', () => editCharge(n));
        card.append(edit);
        const paid = el('button', 'Marcar como pago', 'btn');
        paid.type = 'button';
        paid.style.margin = '8px';
        paid.addEventListener('click', async () => {
          if (
            !confirm(
              'Confirmar o pagamento? Os lembretes futuros desta cobrança serão interrompidos.',
            )
          )
            return;
          paid.disabled = true;
          try {
            await api('mark-paid', {
              noticeId: n.id,
            });
            status('#admin-feedback', 'Cobrança marcada como paga. Lembretes futuros suspensos.');
            await refresh();
          } catch (e) {
            status('#admin-feedback', e.message, true);
          } finally {
            paid.disabled = false;
          }
        });
        card.append(paid);
      }
    }
    if (n.status !== 'archived') {
      const archive = el('button', 'Arquivar', 'btn');
      archive.type = 'button';
      archive.style.marginTop = '8px';
      archive.addEventListener('click', async () => {
        if (
          !confirm(
            'Arquivar este registro? Ele deixará de aparecer para o cliente e não enviará mais lembretes.',
          )
        )
          return;
        archive.disabled = true;
        try {
          await api('archive', {
            noticeId: n.id,
          });
          await refresh();
        } catch (e) {
          status('#admin-feedback', e.message, true);
        } finally {
          archive.disabled = false;
        }
      });
      card.append(archive);
    }
    card.append(attachmentBlock(n));
    notices.append(card);
  }
}

export { render };
