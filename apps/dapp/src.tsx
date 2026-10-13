import React from 'react';
import { createRoot } from 'react-dom/client';
import { DappExample } from '../web/src/components/DappExample';
import '../web/src/styles.css';
import '../web/src/components.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><header className="topbar"><a className="brand" href="http://localhost:5173">orvena / publisher example</a></header><main className="wallet-main"><div className="app-heading"><span className="eyebrow">INDEPENDENT ORIGIN · PROJECT-OWNED SDK INTEGRATION</span></div><section className="identity-panel" style={{ maxWidth: 620, margin: '30px auto' }}><DappExample /></section></main></React.StrictMode>);
