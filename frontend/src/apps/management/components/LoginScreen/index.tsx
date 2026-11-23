import type { ReactNode } from 'react';
import { Hero } from './components/Hero/index.tsx';
import { LoginCard } from './components/LoginCard/index.tsx';

/** Moldura das telas de acesso: apresentação à esquerda e o cartão (login ou nova senha). */
export function LoginLayout({ children }: { children: ReactNode }) {
  return (
    <div className="login">
      <Hero />
      <section className="login-main">{children}</section>
    </div>
  );
}

export function LoginScreen() {
  return (
    <LoginLayout>
      <LoginCard />
    </LoginLayout>
  );
}
