'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useRef, useState, useSyncExternalStore } from 'react';
import {
  Aperture,
  ScanLine,
  FileText,
  BookOpen,
  ArrowUpRight,
  ShieldCheck,
  Plus,
  Fingerprint,
  Settings2,
  History,
} from 'lucide-react';
import { useInvestigation } from './investigation-provider';
import { HistoryPane } from './history-pane';
const wideQuery = '(min-width: 1351px)';
function subscribeWidth(change: () => void) {
  const query = window.matchMedia(wideQuery);
  query.addEventListener('change', change);
  return () => query.removeEventListener('change', change);
}
export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { clear, evidence, load } = useInvestigation();
  const router = useRouter();
  const newFile = useRef<HTMLInputElement>(null);
  const wide = useSyncExternalStore(
    subscribeWidth,
    () => window.matchMedia(wideQuery).matches,
    () => false,
  );
  const [historyOverride, setShowHistory] = useState<boolean | null>(null);
  const showHistory = historyOverride ?? wide;
  function newInvestigation() {
    clear();
    newFile.current?.click();
    router.push('/');
  }
  return (
    <div className={`app-shell ${showHistory ? 'history-visible' : ''}`}>
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <Aperture size={25} />
          </span>
          parallax<span className="brand-dot">.</span>
        </Link>
        <div className="sidebar-body">
          <span className="eyebrow sidebar-caption">WORKSPACE</span>
          <nav aria-label="Main navigation">
            {[
              { href: '/', label: 'Investigation', icon: ScanLine },
              { href: '/report', label: 'Verification report', icon: FileText },
              { href: '/methodology', label: 'Methodology', icon: BookOpen },
              { href: '/settings', label: 'Provider settings', icon: Settings2 },
            ].map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`nav-item ${pathname === href ? 'active' : ''}`}
              >
                <Icon size={18} />
                {label}
                {pathname === href && <span className="nav-dot" />}
              </Link>
            ))}
          </nav>
          <button
            type="button"
            onClick={newInvestigation}
            className="new-case"
            aria-label="New investigation"
          >
            <Plus size={16} />
            New investigation
          </button>
          <div className="sidebar-note">
            <Fingerprint size={23} />
            <h3>Current session</h3>
            <p>{evidence ? evidence.name : 'No image loaded'}</p>
            <p>Saved automatically in this browser.</p>
            <Link href="/methodology">
              Methods & limitations <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>
        <div className="sidebar-footer">
          <ShieldCheck size={16} />
          <span>
            Browser processing<small>History stored on this device</small>
          </span>
          <span className="status-dot" />
        </div>
      </aside>
      <input
        ref={newFile}
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label="New investigation image"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void load(file);
          event.target.value = '';
        }}
      />
      <div className="main-shell">
        <header className="topbar">
          <span>
            <span className="status-dot" /> PARALLAX / OSINT WORKSPACE
          </span>
          <div>
            <button
              className="text-button history-toggle"
              onClick={() => setShowHistory(!showHistory)}
              aria-expanded={showHistory}
            >
              <History size={15} />
              History
            </button>
            <span className="version">BETA / V1.0</span>
            <Link href="/methodology">
              How it works <ArrowUpRight size={14} />
            </Link>
          </div>
        </header>
        <main id="main-content">{children}</main>
        <footer className="page-footer">
          <span>Parallax · Image verification toolkit</span>
          <span>For public & news imagery. Never for locating private individuals.</span>
        </footer>
      </div>
      {showHistory && <HistoryPane close={() => setShowHistory(false)} />}
    </div>
  );
}
