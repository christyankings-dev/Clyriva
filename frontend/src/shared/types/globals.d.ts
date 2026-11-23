import type { createClient } from '@supabase/supabase-js';
import type { ClyrivaConfig, PanelHost, PushTestStore, PwaSession } from './bridges.ts';

declare global {
  interface Window {
    CLYRIVA_CONFIG?: Partial<ClyrivaConfig>;
    /** SDK embutido em /vendor/supabase.js (mesma versão dos tipos instalados). */
    supabase: { createClient: typeof createClient };
    ClyrivaPanelHost?: PanelHost;
    ClyrivaPwaSession?: PwaSession;
    ClyrivaPwa?: { open(): void };
  }
  var ClyrivaPushTest: PushTestStore;
}
