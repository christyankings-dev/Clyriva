import { createRoot } from 'react-dom/client';
import { must } from '../../shared/lib/dom.ts';
import { App } from './App.tsx';
import { boot } from './boot.ts';
import './index.css';
import './session/pushBridge.ts';
import './workspace/panelBridge.ts';

boot();
createRoot(must('#root')).render(<App />);
