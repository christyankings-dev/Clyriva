import { panelWorkspace } from '../../state/workspace.ts';

/** `<option>`s do seletor de empresa; a opção "Todos" vem primeiro. */
export function CompanyOptions() {
  return (
    <>
      <option value="all">Todos os clientes</option>
      {panelWorkspace.data.clients.map((client) => (
        <option key={client.id} value={client.id}>
          {client.name}
        </option>
      ))}
    </>
  );
}
