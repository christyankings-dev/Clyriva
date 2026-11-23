import { authFeedback } from '../../session/screen.ts';
import { useStore } from '../../../../shared/lib/store.ts';

/** Mensagem de status do acesso (#auth-feedback), atualizada por statusMessage(). */
export function AuthFeedbackMessage({ live = true }: { live?: boolean }) {
  const feedback = useStore(authFeedback);
  const content = feedback && (
    <div className={('notice ' + feedback.type).trim()}>{feedback.text}</div>
  );
  return live ? (
    <div id="auth-feedback" className="auth-msg" role="status" aria-live="polite">
      {content}
    </div>
  ) : (
    <div id="auth-feedback">{content}</div>
  );
}
