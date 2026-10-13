import { useEffect, useRef, useState } from 'react';
import { approvalProtocol, contentCommitment, zeroApprovalId, type ApprovalPackage } from '@orvena/sdk';
import { isAddress, type Address, type Hex } from 'viem';
import { authError, clearMetadata, createIdentity, loginIdentity, rpId, type IdentitySession } from './auth';
import { approvalsAddress, chainId, registryAddress } from './chain';
import { IdentityStory } from './components/IdentityStory';
import { DeveloperGuide } from './components/DeveloperGuide';
import { DappExample } from './components/DappExample';
import { ApprovalWorkspace, type ApprovalRequest } from './components/ApprovalWorkspace';
import { ApprovalVerifier } from './components/ApprovalVerifier';
function Fingerprint() { return <svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M12 27v-4a12 12 0 0 1 24 0v4M7 25v-2a17 17 0 0 1 34 0M17 29v-6a7 7 0 0 1 14 0v9M22 36V23a2 2 0 0 1 4 0v15M11 33l-1 5M16 35l-2 7M31 38l-1 5M36 32v5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>; }
type Health = { sponsorshipReady: boolean; approvals: string | null; chainId: number };
export function App() {
  const [session, setSession] = useState<IdentitySession | null>(null), sessionRef = useRef<IdentitySession | null>(null), operation = useRef(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [health, setHealth] = useState<Health | null>(null), [request, setRequest] = useState<ApprovalRequest | null>(null);
  const [healthLoaded, setHealthLoaded] = useState(false);
  const path = window.location.pathname, publicView = ['/example', '/verify', '/developer'].includes(path), dappView = path === '/example';
  const requestId = new URLSearchParams(window.location.search).get('request'), popupView = path === '/approve' && Boolean(requestId);
  async function refreshHealth() { try { const response = await fetch('/api/health'); if (!response.ok) throw new Error(); setHealth(await response.json()); } catch { setHealth(null); } finally { setHealthLoaded(true); } }
  useEffect(() => { void refreshHealth(); return () => sessionRef.current?.end(); }, []);
  useEffect(() => { if (path === '/wallet' || path.startsWith('/profile/')) window.location.replace('/#app'); }, [path]);
  useEffect(() => { if (!session) return; const timer = window.setInterval(() => { if (!session.isActive()) { session.end(); sessionRef.current = null; setSession(null); setNotice('Session ended. Choose your existing passkey to continue.'); } }, 1000); return () => window.clearInterval(timer); }, [session]);
  useEffect(() => {
    if (!popupView || !requestId || !/^[0-9a-f-]{36}$/i.test(requestId) || !window.opener) return;
    const opener = window.opener; let accepted = false, responded = false;
    const ready = () => { if (!accepted) opener.postMessage({ protocol: approvalProtocol, type: 'ready', id: requestId }, '*'); };
    const timer = window.setInterval(ready, 500);
    function receive(event: MessageEvent) {
      if (accepted || event.source !== opener || !/^https?:\/\//.test(event.origin) || event.data?.protocol !== approvalProtocol || event.data.type !== 'request' || event.data.id !== requestId) return;
      const respond = (result?: ApprovalPackage, responseError?: string) => { if (responded) return; responded = true; opener.postMessage({ protocol: approvalProtocol, type: 'response', id: requestId, result, error: responseError }, event.origin); };
      try { contentCommitment(event.data.content, zeroApprovalId); if (!event.data.content.length) throw new Error('Empty content is not supported.'); if (event.data.expectedOwner && !isAddress(event.data.expectedOwner)) throw new Error('Invalid expected approver.'); if (event.data.parentId && !/^0x[0-9a-fA-F]{64}$/.test(event.data.parentId)) throw new Error('Invalid previous-version ID.'); accepted = true; window.clearInterval(timer); setRequest({ content: event.data.content, expectedOwner: event.data.expectedOwner as Address | undefined, parentId: event.data.parentId as Hex | undefined, origin: event.origin, expiresAt: Date.now() + 5 * 60 * 1000, respond }); }
      catch (e) { accepted = true; window.clearInterval(timer); respond(undefined, e instanceof Error ? e.message : 'Invalid request.'); setError('The application sent an invalid approval request.'); }
    }
    window.addEventListener('message', receive); ready();
    return () => { window.removeEventListener('message', receive); window.clearInterval(timer); };
  }, [popupView, requestId]);
  async function authenticate(create: boolean) { if (operation.current) return; operation.current = true; setBusy(true); setError(''); setNotice(''); try { const identity = await (create ? createIdentity() : loginIdentity()); sessionRef.current?.end(); sessionRef.current = identity; setSession(identity); setNotice(create ? 'Passkey ready. Review content before giving approval.' : 'Your approval account is unlocked.'); await refreshHealth(); } catch (e) { setError(authError(e)); } finally { operation.current = false; setBusy(false); } }
  function logout() { sessionRef.current?.end(); sessionRef.current = null; setSession(null); setNotice('Signed out. Your passkey stays with your provider.'); setError(''); }
  function clear() { try { clearMetadata(); logout(); setNotice('Credential metadata cleared. Your passkey and downloaded approvals remain usable.'); } catch { setError('Local storage is unavailable.'); } }
  return <>
    <a className="skip-link" href="#app">Skip to the application</a>
    <header className="topbar"><a className="brand" href="/" aria-label="Orvena identity"><span className="brand-mark">o</span>orvena</a><nav aria-label="Main navigation"><a href="/#app">Approvals</a><a href="/verify" aria-current={path === '/verify' ? 'page' : undefined}>Verify</a><a href="/developer" aria-current={path === '/developer' ? 'page' : undefined}>Developers</a></nav><a className="nav-app" href="/#app">Open app <span aria-hidden="true">↗</span></a></header>
    <main>
      {!publicView && !popupView && <IdentityStory />}
      <div id="app" className={`app-main ${publicView || popupView ? 'public-main' : ''}`} tabIndex={-1}>
        <div className="app-heading"><div className="eyebrow"><span className="tiny-diamond" />{publicView ? 'THE OPEN SIDE OF APPROVAL' : 'YOUR NEXT CHAPTER STARTS HERE'}</div><span className="network"><span />{chainId === 31337 ? 'Local development chain' : 'Monad testnet'}</span></div>
        <div className="workspace"><section className="intro">
          {dappView ? <h1 className="app-title">Your approval.<br /><em>In a real app.</em></h1> : publicView ? <h1 className="app-title">Trust.<br /><em>In the open.</em></h1> : <h2 className="app-title">Your passkey.<br /><em>Your approval.</em></h2>}
          <p className="lede">{dappView ? 'An application prepares a draft. Orvena asks you to approve its exact version. The application verifies your approval before publishing.' : publicView ? 'Verify exact content and its approver. Check current revocation state. Build with portable passkey approvals.' : 'AI can prepare the draft. Your passkey approves the exact version. Any application can verify it on Monad.'}</p>
          <div className="principles"><div><span>01</span><p><strong>Review the content</strong>Read the exact version you will approve.</p></div><div><span>02</span><p><strong>Confirm with passkey</strong>Your approval is verified onchain.</p></div><div><span>03</span><p><strong>Keep control</strong>Verify, revise or revoke the approval.</p></div></div>
          <a className="text-link" href={publicView ? '/#app' : '/example'}>{publicView ? 'Open your approval account' : 'See what another app can do'} <span aria-hidden="true">↗</span></a>
          {!publicView && !popupView && <div className="next-app"><span className="eyebrow">YOUR APPROVAL, CARRIED FORWARD</span><h3>From a draft to a trusted version.</h3><p>A passkey approval can travel between applications. Changed content needs a new approval.</p><a className="pill-button" href="/example">Try the publishing example ↗</a></div>}
        </section><section className="identity-panel" aria-label={publicView ? 'Orvena approval tools' : 'Your Orvena approval account'}>
          <div className="panel-top"><span className="eyebrow">{dappView ? 'PUBLISH WITH ORVENA' : publicView ? 'PORTABLE APPROVAL PROTOCOL' : 'YOUR ORVENA ID'}</span><span className="panel-symbol" aria-hidden="true">✳</span></div>
          {publicView ? dappView ? <DappExample /> : path === '/developer' ? <DeveloperGuide /> : <ApprovalVerifier /> : session ? <ApprovalWorkspace key={session.account.address} session={session} request={request} onLogout={logout} onClear={clear} /> : <div className="panel-body"><div className="fingerprint"><Fingerprint /></div><h2>A familiar way<br />to begin.</h2><p>Create your approval account with a passkey.<br />No wallet extension or seed phrase to manage.</p>{request && <div className="sign-in-consent"><strong>Approval requested by {new URL(request.origin).host}</strong><p>Sign in to review the full content. Creating an account does not approve it.</p></div>}<button className="primary" disabled={busy} onClick={() => void authenticate(true)}>{busy ? 'Waiting for your passkey…' : 'Create your passkey'}<span aria-hidden="true">↗</span></button><button className="text-button" disabled={busy} onClick={() => void authenticate(false)}>I already have a passkey</button><div className="privacy-note"><span aria-hidden="true">⌑</span><p>Only your key and approval commitments go onchain. Your content stays offchain.</p></div></div>}
          <div className="panel-bottom"><span>POWERED BY MERA</span><span>BUILT ON MONAD <span className="network-square" /></span></div>
        </section></div>
        <div className="feedback" aria-live="polite" role="status">{busy && <p>Complete the request on your device. You can cancel and try again.</p>}{notice && <p className="notice">{notice}</p>}</div>{error && <p className="error" role="alert">{error}</p>}
        {!publicView && !health?.sponsorshipReady && <p className="field-help">{!healthLoaded ? 'Checking the protocol connection…' : 'The gas sponsor is unavailable. Refresh the connection below before approving.'}</p>}
        <section className="foundation"><div><span className="eyebrow">ONE VERSION. YOUR APPROVAL.</span><h2>Yours to control.<br /><em>Open to build on.</em></h2></div><div><p>Orvena is a passkey approval protocol for AI applications. Every approval and revocation is verified with WebAuthn/P256. Integrate the SDK to verify exact content and current consent without depending on one platform's database.</p><a className="text-link" href="/developer">Build with the SDK <span aria-hidden="true">↗</span></a></div></section>
        <details className="development"><summary>Connection details</summary><dl><div><dt>Passkey domain</dt><dd>{rpId}</dd></div><div><dt>Key registry</dt><dd>{registryAddress || 'Not configured'}</dd></div><div><dt>Approval protocol</dt><dd>{approvalsAddress || 'Not configured'}</dd></div><div><dt>Gas sponsorship</dt><dd>{health?.sponsorshipReady ? 'Configured' : 'Not configured'}</dd></div></dl><p>Content approvals use a fresh P256 assertion bound to the exact commitment. Passkey control is not proof of legal identity or factual accuracy.</p><button className="text-button" disabled={busy} onClick={() => void refreshHealth()}>Refresh connection</button></details>
      </div>
    </main>
    <footer><a className="footer-brand" href="/">orvena</a><span>A familiar touch. An open foundation.</span><div><a href="/developer">Developers ↗</a><span>Monad Metropolis · 2026</span></div></footer>
  </>;
}
