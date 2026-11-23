import type { ReactNode } from 'react';

function Highlight({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children: ReactNode;
}) {
  return (
    <div className="login-highlight">
      <span className="symbol" aria-hidden="true">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          {children}
        </svg>
      </span>
      <strong>{title}</strong>
      <small>{text}</small>
    </div>
  );
}

export function Hero() {
  return (
    <section className="login-hero">
      <div>
        <div className="brand">
          <span className="brand-logo">C</span>
          <span>
            Cly<em>riva</em>
          </span>
        </div>
        <p className="brand-sub">Sua gestão, mais organizada</p>
      </div>
      <div>
        <div className="login-eyebrow">Gestão contábil e financeira</div>
        <h1>
          Seus clientes em dia.
          <br />
          <span>Seu controle em um só lugar.</span>
        </h1>
        <p>
          Organize a sua carteira particular, acompanhe notas fiscais, faturamento, guias,
          obrigações e o histórico de cada empresa. Atenda solicitações dos seus clientes
          diretamente, com todas as informações organizadas em um único lugar.
        </p>
        <div className="login-highlights" aria-label="Recursos da plataforma">
          <Highlight
            title="Carteira de clientes"
            text="Cadastro, prioridade e informações organizadas"
          >
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </Highlight>
          <Highlight title="Rotina fiscal" text="Notas, guias, prazos e resumo mensal">
            <path d="M8 3h8l4 4v14H4V3h4z" />
            <path d="M15 3v5h5M8 13h8M8 17h6" />
          </Highlight>
          <Highlight title="Seu financeiro" text="Recebimentos, honorários e indicadores">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 6v12m3-9c-1-2-6-2-6 1s6 1 6 4-5 3-6 1" />
          </Highlight>
        </div>
      </div>
      <p className="hero-foot">
        Clientes consultam guias e documentos compartilhados pela gestão no aplicativo Clyriva
        Clientes.
      </p>
    </section>
  );
}
