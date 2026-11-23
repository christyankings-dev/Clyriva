import type { ReactNode } from 'react';
import type { PageName } from '../../types.ts';

export interface NavItem {
  page: PageName;
  label: string;
  icon: ReactNode;
}

/** Itens do grupo "Gestão" do menu lateral, na ordem exibida. */
export const mainNav: NavItem[] = [
  {
    page: 'dashboard',
    label: 'Visão geral',
    icon: (
      <>
        <rect x="3" y="3" width="8" height="8" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="11" width="7" height="10" rx="1.5" />
        <rect x="3" y="14" width="8" height="7" rx="1.5" />
      </>
    ),
  },
  {
    page: 'clients',
    label: 'Meus clientes',
    icon: (
      <>
        <path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 20v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
  },
  {
    page: 'vault',
    label: 'Cofre de acessos',
    icon: (
      <>
        <rect x="3" y="10" width="18" height="11" rx="2" />
        <path d="M7 10V7a5 5 0 1 1 10 0v3" />
        <circle cx="12" cy="15" r="1" />
      </>
    ),
  },
  {
    page: 'invoices',
    label: 'Notas fiscais',
    icon: <path d="M7 3h9l5 5v13H3V3h4zM16 3v5h5M7 13h10M7 17h8" />,
  },
  {
    page: 'cash',
    label: 'Financeiro dos clientes',
    icon: (
      <>
        <rect x="2" y="5" width="20" height="14" rx="3" />
        <path d="M2 10h20M7 15h4" />
      </>
    ),
  },
  {
    page: 'fees',
    label: 'Meus honorários',
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 6v12m3-9c-1-2-6-2-6 1s6 1 6 4-5 3-6 1" />
      </>
    ),
  },
  {
    page: 'taxes',
    label: 'Guias e tributos',
    icon: <path d="M3 10L12 4l9 6M4 10h16M5 20h14M7 11v8m5-8v8m5-8v8" />,
  },
  {
    page: 'service',
    label: 'Atendimentos',
    icon: (
      <>
        <path d="M3 4h18v13H8l-5 4V4z" />
        <path d="M7 9h10M7 13h6" />
      </>
    ),
  },
  {
    page: 'tasks',
    label: 'Obrigações e pendências',
    icon: (
      <>
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M8 2v4m8-4v4M3 10h18m-14 5 2 2 4-4" />
      </>
    ),
  },
  {
    page: 'reports',
    label: 'Relatórios',
    icon: <path d="M4 20V10M10 20V5M16 20v-8M22 20V3" />,
  },
];

/** Itens do grupo "Preferências". */
export const preferenceNav: NavItem[] = [
  {
    page: 'settings',
    label: 'Dados e backup',
    icon: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l-2.8 2.8a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6h-4a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-2.8-2.8a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1v-4a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l2.8-2.8a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6h4a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l2.8 2.8a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1v4a1.7 1.7 0 0 0-1.6 1z" />
      </>
    ),
  },
];
