import type { TransactionReceipt, TransactionStage } from '../transactions';
const labels = { preparing: 'Preparing your request', signing: 'Waiting for the signature', submitted: 'Transaction submitted', confirmed: 'Confirmed onchain' };
export function TransactionProgress({ stage, hash }: { stage: TransactionStage; hash?: string }) {
  return <div className="transaction-progress" role="status" aria-live="polite"><span className="status-dot" /><div><strong>{labels[stage]}</strong>{hash && <code>{hash}</code>}</div><ol aria-label="Transaction steps">{Object.keys(labels).map((s, i) => <li key={s} aria-current={s === stage ? 'step' : undefined} className={i <= Object.keys(labels).indexOf(stage) ? 'complete' : ''}>{i + 1}</li>)}</ol></div>;
}
export function Receipt({ receipt }: { receipt: TransactionReceipt }) {
  return <article className="receipt"><div><span className="receipt-check">✓</span><strong>{receipt.label}</strong><span className="receipt-tag">Confirmed</span></div><code>{receipt.hash}</code><dl><div><dt>Sponsored fee</dt><dd>{Number(receipt.fee).toPrecision(4)} MON</dd></div><div><dt>Request → confirmation</dt><dd>{(receipt.elapsedMs / 1000).toFixed(2)} s</dd></div><div><dt>Block</dt><dd>{receipt.block}</dd></div></dl>{receipt.explorer ? <a href={receipt.explorer} target="_blank" rel="noreferrer">View transaction ↗</a> : <span className="field-help">Local EVM transaction · no public explorer</span>}</article>;
}
