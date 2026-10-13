import { useEffect, useRef } from 'react';
import type { Sculpture } from '../visuals/identity-sculpture';
import { fingerprintCanvas, keyholeSvgPath, keySvgPath, renderFingerprint } from '../visuals/fingerprint-pattern';
import { stage } from '../visuals/story-timeline';

const clamp = (v: number) => Math.max(0, Math.min(1, v));
const ease = (v: number) => { const t = clamp(v); return t * t * (3 - 2 * t); };
const chapters = ['A familiar touch', 'Your key, your way in', 'An identity of your own'];

export function IdentityStory() {
  const root = useRef<HTMLElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const chapterButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const jumpImmediately = useRef(false);
  const fallbackArt = useRef<SVGImageElement>(null);
  useEffect(() => {
    const element = root.current!, canvasHost = host.current!;
    // Lightweight static artwork for the SVG fallback (and while WebGL is loading).
    fallbackArt.current?.setAttribute('href', fingerprintCanvas(renderFingerprint(240), 'ink').toDataURL());
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let sculpture: Sculpture | undefined, sculptureReady = false, alive = true, visible = true, frame = 0;
    let target = 0, progress = 0, velocity = 0, lastTime = 0;
    let targetX = 0, targetY = 0, x = 0, y = 0;
    const paint = () => {
      const identity = ease(stage(progress, 'identity')), portable = ease(stage(progress, 'portable'));
      element.style.setProperty('--identity', identity.toFixed(4));
      element.style.setProperty('--portable', portable.toFixed(4));
      element.style.setProperty('--progress', progress.toFixed(4));
      element.style.setProperty('--key-opacity', (ease(stage(progress, 'reveal')) * (1 - identity)).toFixed(4));
      element.style.setProperty('--key-insert', ease((progress - 0.18) / 0.36).toFixed(4));
      element.style.setProperty('--key-turn', ease(stage(progress, 'turn')).toFixed(4));
      element.style.setProperty('--unlock', ease((progress - 0.64) / 0.14).toFixed(4));
      element.dataset.lock = progress < 0.42 ? 'approaching' : progress < 0.54 ? 'inserting' : progress < 0.64 ? 'turning' : 'open';
      const phase = progress < 0.30 ? 0 : progress < 0.80 ? 1 : 2;
      element.dataset.phase = String(phase);
      element.querySelectorAll('.story-chapter').forEach((chapter, i) => chapter.setAttribute('aria-hidden', String(i !== phase)));
      chapterButtons.current.forEach((button, i) => { if (button) { button.setAttribute('aria-pressed', String(i === phase)); } });
      const sceneProgress = media.matches ? (phase === 0 ? 0 : phase === 1 ? (progress < 0.64 ? 0.53 : 0.78) : 1) : progress;
      if (sculptureReady) sculpture?.pose(sceneProgress, media.matches ? 0 : x, media.matches ? 0 : y);
    };
    const tick = (now: number) => {
      frame = 0;
      if (!visible || document.hidden || !alive) return;
      const dt = Math.min((now - (lastTime || now - 16)) / 1000, 0.032); lastTime = now;
      if (media.matches) { progress = target; velocity = 0; x = y = 0; }
      else {
        // Critically damped spring, re-targeted from its current position/velocity.
        velocity += ((target - progress) * 180 - velocity * 27) * dt;
        progress = clamp(progress + velocity * dt);
        x += (targetX - x) * Math.min(dt * 12, 1); y += (targetY - y) * Math.min(dt * 12, 1);
      }
      paint();
      if (!media.matches && (Math.abs(target - progress) > 0.00015 || Math.abs(velocity) > 0.00015 || Math.abs(x - targetX) + Math.abs(y - targetY) > 0.001)) frame = requestAnimationFrame(tick);
    };
    const schedule = () => { if (!frame && visible && !document.hidden) { lastTime = 0; frame = requestAnimationFrame(tick); } };
    const measure = () => {
      const rect = element.getBoundingClientRect();
      target = clamp(-rect.top / Math.max(element.offsetHeight - window.innerHeight, 1));
      if (jumpImmediately.current) { progress = target; velocity = 0; jumpImmediately.current = false; paint(); }
      schedule();
    };
    const resize = () => { sculpture?.resize(); measure(); };
    const pointer = (event: PointerEvent) => {
      if (media.matches || event.pointerType !== 'mouse') return;
      const rect = canvasHost.getBoundingClientRect();
      targetX = clamp((event.clientX - rect.left) / rect.width) * 2 - 1;
      targetY = clamp((event.clientY - rect.top) / rect.height) * 2 - 1;
      schedule();
    };
    const leave = () => { targetX = targetY = 0; schedule(); };
    const visibility = () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else measure(); };
    const contextLost = () => { if (alive) { sculptureReady = false; element.dataset.webgl = 'fallback'; } };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) measure(); else { cancelAnimationFrame(frame); frame = 0; } });
    observer.observe(element);
    const sizes = new ResizeObserver(resize); sizes.observe(canvasHost);
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', resize);
    element.addEventListener('pointermove', pointer); element.addEventListener('pointerleave', leave);
    canvasHost.addEventListener('webglcontextlost', contextLost, true);
    document.addEventListener('visibilitychange', visibility); media.addEventListener('change', measure);
    measure();
    // Keep WebGL in a separate chunk; the app and the static artwork remain usable without it.
    void import('../visuals/identity-sculpture').then(({ createIdentitySculpture }) => {
      if (!alive) return;
      try { sculpture = createIdentitySculpture(canvasHost); sculptureReady = true; element.dataset.webgl = 'ready'; paint(); }
      catch { element.dataset.webgl = 'fallback'; }
    }).catch(() => { if (alive) element.dataset.webgl = 'fallback'; });
    return () => {
      alive = false; cancelAnimationFrame(frame); observer.disconnect(); sizes.disconnect(); sculpture?.dispose();
      window.removeEventListener('scroll', measure); window.removeEventListener('resize', resize);
      element.removeEventListener('pointermove', pointer); element.removeEventListener('pointerleave', leave);
      canvasHost.removeEventListener('webglcontextlost', contextLost, true);
      document.removeEventListener('visibilitychange', visibility); media.removeEventListener('change', measure);
    };
  }, []);

  function jump(chapter: number, keyboard: boolean) {
    const element = root.current!;
    const fractions = [0, 0.62, 0.995];
    jumpImmediately.current = keyboard;
    window.scrollTo({ top: window.scrollY + element.getBoundingClientRect().top + fractions[chapter] * (element.offsetHeight - window.innerHeight), behavior: keyboard || window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }
  return <section ref={root} id="story" className="identity-story" aria-label="The Orvena story" data-phase="0">
    <div className="story-sticky">
      <div className="story-inner">
        <div className="story-copy">
          <span className="story-eyebrow"><span className="status-light" /> A MORE HUMAN WAY IN</span>
          <div className="story-headlines">
            <div className="story-chapter chapter-touch"><h1>A touch.<br />An account.<br /><em>Entirely yours.</em></h1><p>Open your account with a passkey.<br />Your content. Your decision. Your approval.</p></div>
            <div className="story-chapter chapter-identity"><h2>A familiar key.<br />A new way in.<br /><em>Open your world.</em></h2><p>The same passkey opens the same account.<br />Approve an exact version. Keep control.</p></div>
            <div className="story-chapter chapter-world"><h2>Made by you.<br />Carried into<br /><em>what comes next.</em></h2><p>Your approval travels between applications.<br />Verify the content. Revoke when you need to.</p></div>
          </div>
          <div className="story-actions"><a className="pill-button" href="/#app">Open app <span aria-hidden="true">↗</span></a><a className="story-secondary" href="/example">Try the publishing app <span aria-hidden="true">↗</span></a></div>
          <div className="story-assurance"><span>NO SEED PHRASE</span><span>NO WALLET EXTENSION</span></div>
        </div>
        <div className="sculpture-stage" aria-hidden="true">
          <div className="sculpture-aura" /><div className="sculpture-ground" />
          <div ref={host} className="sculpture-canvas" />
          <svg className="sculpture-fallback" viewBox="0 0 300 380" fill="none"><defs><mask id="fingerprint-aperture" maskUnits="userSpaceOnUse" x="0" y="0" width="300" height="380"><rect width="300" height="380" fill="white" /><path d={keyholeSvgPath} fill="black" /></mask></defs><path d={`M150 48 C210 48 254 98 254 150 V230 C254 292 210 332 150 332 C90 332 46 292 46 230 V150 C46 98 90 48 150 48 Z ${keyholeSvgPath}`} fill="#29231d" stroke="#7e6b57" fillRule="evenodd" /><g mask="url(#fingerprint-aperture)"><image ref={fallbackArt} x="61" y="71" width="178" height="238" preserveAspectRatio="none" /></g></svg>
          <svg className="sculpture-fallback-key" viewBox="0 0 300 380" aria-hidden="true"><path d={keySvgPath} fill="#eddfd0" fillRule="evenodd" stroke="#f8f0e8" strokeWidth=".7" /></svg>
          <div className="illustrated-profile"><div className="illustrated-profile-top"><span>orvena</span><span>PUBLIC IDENTITY</span></div><div className="illustrated-avatar">y<span>↗</span></div><strong>You, carried forward.</strong><p>A little about you. A world to build on.</p><div className="illustrated-profile-bottom"><span>PROFILE · PROOF · RECEIPTS</span><span>↗</span></div></div>
          <svg className="connection-lines" viewBox="0 0 700 600" fill="none"><path d="M350 305 C440 305 430 145 570 145 M350 320 C220 320 270 455 115 455" stroke="currentColor" strokeWidth="1" /><circle cx="570" cy="145" r="3" fill="currentColor" /><circle cx="115" cy="455" r="3" fill="currentColor" /></svg>
          <div className="story-app-node node-assistant"><span className="node-icon">✳</span><div><strong>Your AI application</strong><span>Draft. Review. Approve.</span></div><span className="node-arrow">↗</span></div>
          <div className="story-app-node node-receipt"><span className="node-icon">≋</span><div><strong>Your chosen data</strong><span>Verify a receipt</span></div><span className="node-arrow">↗</span></div>
          <div className="sculpture-caption"><span className="caption-line" /><span className="caption-touch">01 / A FAMILIAR GESTURE</span><span className="caption-identity"><span className="lock-insert">02 / YOUR KEY, YOUR WAY IN</span><span className="lock-turn">02 / A QUARTER TURN</span><span className="lock-open">02 / AN OPEN FOUNDATION</span></span><span className="caption-world">03 / YOUR IDENTITY, CARRIED FORWARD</span></div>
          <span className="artwork-note">ARTWORK ONLY · NO BIOMETRIC COLLECTION</span>
        </div>
      </div>
      <div className="story-bottom"><span className="scroll-invitation">SCROLL TO UNFOLD <span aria-hidden="true">↓</span></span><div className="story-chapters" role="group" aria-label="Story chapters">{chapters.map((chapter, index) => <button key={chapter} ref={node => { chapterButtons.current[index] = node; }} aria-label={`0${index + 1} ${chapter}`} aria-pressed={index === 0} onClick={event => jump(index, event.detail === 0)}><span>0{index + 1}</span><span>{chapter}</span><i /></button>)}</div><span className="story-endnote">BUILT ON MONAD ↗</span></div>
    </div>
  </section>;
}
