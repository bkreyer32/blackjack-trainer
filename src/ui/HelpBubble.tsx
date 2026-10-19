import { useState } from 'react';
import { createPortal } from 'react-dom';
import { HELP, type HelpId } from './help';

/** Small (?) with a ≥44px hit area. Opens a popover sheet; tap outside (or ✕) to dismiss. */
export function HelpBubble({ id, label }: { id: HelpId; label?: string }) {
  const [open, setOpen] = useState(false);
  const h = HELP[id];
  return (
    <>
      <button type="button" className="help-q" data-help={id} aria-label={`Help: ${label ?? h.title}`}
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}><span>?</span></button>
      {open && createPortal(
        <div className="help-backdrop" onClick={(e) => { e.stopPropagation(); setOpen(false); }}>
          <div className="help-pop" role="dialog" aria-label={h.title} onClick={(e) => e.stopPropagation()}>
            <div className="help-head"><b>{h.title}</b><button type="button" className="help-x" aria-label="Close help" onClick={() => setOpen(false)}>✕</button></div>
            <p>{h.body}</p>
            {'when' in h && h.when && <p className="help-when"><b>When to use:</b> {h.when}</p>}
            <p className="muted small">Tap outside to close</p>
          </div>
        </div>, document.body
      )}
    </>
  );
}
