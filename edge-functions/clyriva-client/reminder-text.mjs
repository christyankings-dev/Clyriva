/* Regras puras e testaveis dos lembretes: 3, 2, 1 e 0 dias no calendario brasileiro. */
export const CHARGE_TYPES = Object.freeze(['DAS','Boleto','DARF','FGTS','INSS','Guia','Outro']);

export function validISODate(s){
  if (typeof s!=='string'|| !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y,m,d]=s.split('-').map(Number);
  const dt=new Date(Date.UTC(y,m-1,d));
  return dt.getUTCFullYear()===y&&dt.getUTCMonth()===m-1&&dt.getUTCDate()===d;
}
export function daysUntil(due,today){
  if(!validISODate(due)||!validISODate(today))return null;
  const utc=s=>{const [y,m,d]=s.split('-').map(Number);return Date.UTC(y,m-1,d);};
  const days=Math.round((utc(due)-utc(today))/86400000);
  return [0,1,2,3].includes(days)?days:null;
}
export function brazilDate(date=new Date()){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const get=k=>parts.find(v=>v.type===k)?.value||'';
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function parseBrlCents(value){
  if(typeof value!=='string'&&typeof value!=='number')return null;
  let v=String(value).trim();
  if(v.includes(','))v=v.replace(/\./g,'').replace(',','.');
  if(!/^\d{1,9}(?:\.\d{1,2})?$/.test(v))return null;
  const [whole,frac='']=v.split('.');
  const cents=Number(whole)*100+Number(frac.padEnd(2,'0'));
  return Number.isSafeInteger(cents)&&cents>0&&cents<=99999999999?cents:null;
}
export function moneyBRL(cents){
  const n=Number(cents);
  if(!Number.isSafeInteger(n)||n<0)return '';
  const whole=Math.floor(n/100).toLocaleString('pt-BR');
  return `R$ ${whole},${String(n%100).padStart(2,'0')}`;
}
export function reminderText(notice,days,showAmount=true,today){
  if(![0,1,2,3].includes(days))throw Error('Etapa de lembrete invalida');
  const kind=CHARGE_TYPES.includes(notice.notice_type)?notice.notice_type:'Cobrança';
  const time=days===0?'vence hoje':days===1?'vence amanhã':`vence em ${days} dias`;
  const dd=String(notice.due_date).split('-');
  const due=`${dd[2]}/${dd[1]}/${dd[0]}`;
  const description=String(notice.title||kind).trim().slice(0,95);
  const amount=showAmount?` Valor: ${moneyBRL(notice.amount_cents)}.`:'';
  return {
    title:`${kind} ${time}`,
    body:`${description}.${amount} Vencimento: ${due}.`.replace(/\.\./g,'.'),
    tag:`cobranca-${notice.id}-${today||notice.due_date}`,
    url:'/cliente.html'
  };
}
