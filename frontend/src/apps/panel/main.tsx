import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { must } from '../../shared/lib/dom.ts';
import { App } from './App.tsx';
import './index.css';
import { start } from './start.ts';

// A casca precisa existir no DOM antes de o painel ler os elementos por id.
flushSync(() => createRoot(must('#root')).render(<App />));
start();
