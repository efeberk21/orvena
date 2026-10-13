import { useRef, useState } from 'react';
import { createApprovalReader, parseApprovalPackage, requestContentApproval, type ApprovalPackage, type ApprovalVerification } from '@orvena/sdk';
import { isAddress } from 'viem';
import { approvalsAddress, chainId } from '../chain';
import { downloadPackage } from './ApprovalWorkspace';
export function DappExample() {
  const [content, setContent] = useState('Our new support hours start on Monday. You can reach our team between 09:00 and 18:00. Existing requests will continue to receive a response.');
  const [expectedOwner, setExpectedOwner] = useState(''), [packageText, setPackageText] = useState('');
  const [proof, setProof] = useState<ApprovalPackage | null>(null), [result, setResult] = useState<ApprovalVerification | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [published, setPublished] = useState<string | null>(null);
  const operation = useRef(false);
  const approvalUrl = import.meta.env.VITE_ORVENA_APPROVAL_URL || (window.location.port === '5180' ? 'http://localhost:5173' : window.location.origin);
  const reader = approvalsAddress ? createApprovalReader({ address: approvalsAddress, chainId, rpcUrl: import.meta.env.VITE_MONAD_RPC_URL }) : null;
  async function run(work: () => Promise<void>) { if (operation.current) return; operation.current = true; setBusy(true); setError(''); setNotice(''); try { await work(); } catch (e) { setError(e instanceof Error ? e.message : 'Request failed.'); } finally { operation.current = false; setBusy(false); } }
  function owner() { if (!isAddress(expectedOwner)) throw new Error('Set your trusted approver address before requesting approval.'); return expectedOwner; }
  async function request() { const expected = owner(); const approved = await requestContentApproval({ approvalUrl, content, expectedOwner: expected }); setProof(approved); setPackageText(JSON.stringify(approved, null, 2)); setResult(null); setNotice('Approval received. Check it against the current draft before publishing.'); }
  async function check(publish = false) { if (!reader) throw new Error('Approval deployment is not configured.'); const approved = parseApprovalPackage(packageText); const verdict = await reader.verifyApproval({ content, approvalPackage: approved, expectedOwner: owner() }); setProof(approved); setResult(verdict); if (publish) { if (verdict.status !== 'valid') { setNotice('Publishing blocked. This version has no valid approval from the expected account.'); return; } setPublished(content); setNotice('Published in this demo after a fresh onchain approval check.'); } }
  return <div className="panel-body public-reader"><span className="small-label">PROJECT-OWNED SDK INTEGRATION</span><h2>A draft.<br />A decision.</h2><p>A publishing application uses Orvena to request approval and verify exact content before release.</p>
    <p className="field-help">This is a prepared example AI draft. No live model is connected. Your content goes only to the Orvena approval window, never to the sponsor or chain.</p>
    <label htmlFor="publisher-approver">Trusted approver address</label><input id="publisher-approver" value={expectedOwner} disabled={busy} onChange={e => { setExpectedOwner(e.target.value); setResult(null); }} placeholder="Copy your approval account address" />
    <label htmlFor="publisher-content">Draft being published</label><textarea id="publisher-content" rows={6} value={content} disabled={busy} onChange={e => { setContent(e.target.value); setResult(null); setNotice('Draft changed. Check whether it still matches the receipt.'); }} />
    <button className="primary" disabled={busy || !reader || !content} onClick={() => void run(request)}>{busy ? 'Waiting for Orvena…' : 'Request passkey approval'}<span>↗</span></button>
    <div className="dapp-actions"><h3>Verify the publishing gate</h3><label htmlFor="publisher-receipt">Approval receipt JSON</label><textarea id="publisher-receipt" rows={3} disabled={busy} value={packageText} onChange={e => { setPackageText(e.target.value); setResult(null); }} placeholder="Or paste a downloaded receipt" /><div className="note-actions"><button className="secondary" disabled={busy || !packageText} onClick={() => void run(() => check())}>Check current approval</button><button className="secondary" disabled={busy || !packageText} onClick={() => void run(() => check(true))}>Verify & publish</button>{proof && <button className="text-button" disabled={busy} onClick={() => downloadPackage(proof)}>Download receipt ↓</button>}</div>
    {result && <div className={`verification-result ${result.status === 'valid' ? 'match' : 'mismatch'}`} role="status"><strong>{result.status === 'valid' ? '✓ Publishing permitted for these exact bytes' : `× Publishing blocked: ${result.status}`}</strong><p>Change a word and check again, or revoke the approval in Orvena and repeat the check.</p></div>}</div>
    {published !== null && <div className="public-result"><h3>Published in this demo</h3><p style={{ whiteSpace: 'pre-wrap' }}>{published}</p><p className="field-help">Published content cannot be recalled by revoking its historical approval.</p></div>}
    {notice && <p className="notice" role="status">{notice}</p>}{error && <p className="error" role="alert">{error}</p>}<p className="field-help">Approval origin: {approvalUrl}. This example is built by us; it is not independent customer adoption.</p>
  </div>;
}
