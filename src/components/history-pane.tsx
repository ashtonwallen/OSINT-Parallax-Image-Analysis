'use client';
import { useRouter } from 'next/navigation';
import { FileImage, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useInvestigation } from './investigation-provider';
export function HistoryPane({ close, overlay }: { close: () => void; overlay: boolean }) {
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (overlay) closeButton.current?.focus();
  }, [overlay]);
  const { history, activeId, openSaved, deleteSaved, historyError, saveStatus, busy } =
    useInvestigation();
  const router = useRouter();
  const [deleting, setDeleting] = useState('');
  return (
    <aside id="investigation-history" className="history-pane" aria-label="Analysis history">
      <div className="history-heading">
        <h2>Analyses</h2>
        <button
          ref={closeButton}
          className="text-button"
          aria-label="Close history"
          onClick={close}
        >
          <X size={17} />
        </button>
      </div>
      <p className="history-storage">Saved on this device</p>
      <div className="history-items">
        {history.map((item) => (
          <div key={item.id} className={`history-item ${activeId === item.id ? 'active' : ''}`}>
            <button
              className="history-open"
              disabled={busy}
              aria-current={activeId === item.id ? 'true' : undefined}
              title={item.name}
              onClick={async () => {
                await openSaved(item.id);
                router.push('/');
                if (overlay) close();
              }}
            >
              <FileImage size={17} />
              <span>
                <strong>{item.name}</strong>
                <small>
                  {new Date(item.updatedAt).toLocaleDateString()} · {item.observations} clues
                </small>
              </span>
            </button>
            {deleting === item.id ? (
              <div className="history-confirm">
                <span>Delete local copy?</span>
                <button
                  className="text-button"
                  onClick={async () => {
                    await deleteSaved(item.id);
                    setDeleting('');
                  }}
                >
                  Delete
                </button>
                <button className="text-button" onClick={() => setDeleting('')}>
                  Cancel
                </button>
              </div>
            ) : (
              <button
                className="history-delete"
                aria-label={`Delete ${item.name}`}
                onClick={() => setDeleting(item.id)}
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        ))}
        {history.length === 0 && (
          <p className="history-empty">
            No saved analyses.
            <br />
            Open an image to start one.
          </p>
        )}
      </div>
      <div className="history-bottom">
        <p role="status">{saveStatus || 'Images and findings save automatically.'}</p>
        {historyError && (
          <p role="alert" className="error-text">
            {historyError}
          </p>
        )}
        <p>
          Images, findings and notes stay in this browser. Clearing site data deletes this history.
          API keys are not included.
        </p>
      </div>
    </aside>
  );
}
