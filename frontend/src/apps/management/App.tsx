import { useStore } from '../../shared/lib/store.ts';
import { AccessFailure } from './components/AccessFailure/index.tsx';
import { AdminShell } from './components/AdminShell/index.tsx';
import { Dialogs } from './components/Dialogs/index.tsx';
import { LoginScreen } from './components/LoginScreen/index.tsx';
import { PwaTrigger } from './components/PwaTrigger/index.tsx';
import { ResetScreen } from './components/ResetScreen/index.tsx';
import { screen } from './session/screen.ts';

export function App() {
  const current = useStore(screen);
  return (
    <>
      {current.kind === 'login' && <LoginScreen key={current.key} />}
      {current.kind === 'reset' && <ResetScreen key={current.key} />}
      {current.kind === 'failure' && (
        <AccessFailure key={current.key} message={current.message} retry={current.retry} />
      )}
      {current.kind === 'admin' && <AdminShell key={current.key} />}
      <PwaTrigger />
      <Dialogs />
    </>
  );
}
