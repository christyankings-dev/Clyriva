import type { ReactNode } from 'react';

interface ModalProps {
  title: string;
  description: ReactNode;
  children: ReactNode;
}

/** Moldura dos diálogos do painel. Fechar usa `data-action="close-modal"` (tratado no painel). */
export function Modal({ title, description, children }: ModalProps) {
  return (
    <div className="modal-backdrop" id="modal-backdrop">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-head">
          <div>
            <h2 id="modal-title">{title}</h2>
            <p>{description}</p>
          </div>
          <button
            className="modal-close"
            type="button"
            data-action="close-modal"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ModalFoot({ submit, cancel = 'Cancelar' }: { submit?: string; cancel?: string }) {
  return (
    <div className="modal-foot">
      <button type="button" className="btn" data-action="close-modal">
        {cancel}
      </button>
      {submit && (
        <button className="btn primary" type="submit">
          {submit}
        </button>
      )}
    </div>
  );
}
