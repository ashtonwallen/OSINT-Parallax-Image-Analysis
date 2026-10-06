'use client';
import { LocationHypotheses } from './location-hypotheses';
import { FollowUpChat } from './follow-up-chat';
import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  ArrowRight,
  Upload,
  ScanLine,
  ShieldCheck,
  ImagePlus,
  FileText,
  Sparkles,
  Search,
  Sun,
  Camera,
  MapPin,
  Info,
  Maximize2,
  X,
  Check,
  RotateCcw,
  Languages,
  Trees,
  Car,
  Building2,
  CloudSun,
  Route,
  LoaderCircle,
  LockKeyhole,
  ChevronRight,
} from 'lucide-react';
import { useInvestigation } from './investigation-provider';
import { demos } from '@/lib/demo';
import { asset, categories } from '@/lib/schema';
import { useProviderSettings } from './provider-context';
import { configurationError, providerNames } from '@/lib/providers';
import { analyzeImage } from '@/lib/analyze-client';
import { estimateTime } from '@/lib/solar';
const tabs = [
  { name: 'Metadata', icon: Camera },
  { name: 'Reverse search', icon: Search },
  { name: 'Chronolocation', icon: Sun },
  { name: 'Visual clues', icon: ScanLine },
] as const;
const clueIcons = [Languages, Route, Building2, Trees, Car, CloudSun];
export function Workspace() {
  const { sessionId } = useInvestigation();
  return <WorkspaceSession key={sessionId} />;
}
function WorkspaceSession() {
  const ctx = useInvestigation();
  const { evidence, load, busy, error, setError } = ctx;
  const [tab, setTab] = useState<string>('Metadata'),
    [dragging, setDragging] = useState(false),
    [expanded, setExpanded] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  async function demo(id: string) {
    const selected = demos.find((d) => d.id === id)!;
    try {
      const response = await fetch(asset(selected.image));
      if (!response.ok) throw new Error();
      await load(
        new File([await response.blob()], `${id}-synthetic.jpg`, { type: 'image/jpeg' }),
        id,
      );
    } catch {
      setError('Could not load the sample image. Please try again.');
    }
  }
  useEffect(() => {
    if (!expanded) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false);
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [expanded]);
  return (
    <div className="workspace">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="accent-line" /> IMAGE VERIFICATION
          </div>
          <h1>Image evidence analysis</h1>
          <p>Open source image intelligence</p>
        </div>
        <Link href="/report" className="button secondary report-top">
          <FileText size={16} />
          View report
          <ArrowUpRight size={15} />
        </Link>
      </div>
      <div className="privacy-banner">
        <ShieldCheck size={16} />
        <span>
          Images are processed in your browser.
          {' Visual analysis sends a copy only when you run it with a configured provider.'}
        </span>
        <span className="privacy-badge">SAVED ON THIS DEVICE</span>
      </div>
      <div className="workspace-grid">
        <section className="evidence-column">
          <div className="panel image-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">01</span>
                <h2>Source image</h2>
              </div>
              <span className={`pill ${evidence?.demo ? 'amber' : ''}`}>
                {evidence?.demo ? 'SYNTHETIC DEMO' : evidence ? 'LOCAL FILE' : 'AWAITING IMAGE'}
              </span>
            </div>
            <div
              className={`image-stage ${dragging ? 'dragging' : ''} ${tab === 'Chronolocation' && evidence ? 'measuring' : ''}`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                const file = event.dataTransfer.files[0];
                if (file) void load(file);
              }}
            >
              {evidence ? (
                <div className="image-boundary">
                  <img src={evidence.url} alt="Current investigation source" draggable={false} />
                  {tab === 'Chronolocation' && (
                    <svg
                      className="measurement-layer"
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                      role="img"
                      aria-label="Click object base, object top, then shadow tip"
                      onClick={(event) => {
                        const rect = event.currentTarget.getBoundingClientRect();
                        if (ctx.points.length < 3) {
                          ctx.setPoints([
                            ...ctx.points,
                            {
                              x: (event.clientX - rect.left) / rect.width,
                              y: (event.clientY - rect.top) / rect.height,
                            },
                          ]);
                          ctx.setShadow(null);
                        }
                      }}
                    >
                      {ctx.points.length >= 2 && (
                        <line
                          x1={ctx.points[0].x * 100}
                          y1={ctx.points[0].y * 100}
                          x2={ctx.points[1].x * 100}
                          y2={ctx.points[1].y * 100}
                          stroke="#f5c278"
                          strokeWidth="0.35"
                        />
                      )}
                      {ctx.points.length === 3 && (
                        <line
                          x1={ctx.points[0].x * 100}
                          y1={ctx.points[0].y * 100}
                          x2={ctx.points[2].x * 100}
                          y2={ctx.points[2].y * 100}
                          stroke="#94b7e5"
                          strokeWidth="0.4"
                        />
                      )}
                      {ctx.points.map((point, i) => (
                        <g key={i}>
                          <circle
                            cx={point.x * 100}
                            cy={point.y * 100}
                            r="1.3"
                            fill={i === 1 ? '#f5c278' : '#94b7e5'}
                            stroke="#151515"
                            strokeWidth="0.3"
                          />
                          <text
                            x={point.x * 100 + 2}
                            y={point.y * 100 - 2}
                            fill="white"
                            fontSize="3"
                          >
                            {i + 1}
                          </text>
                        </g>
                      ))}
                    </svg>
                  )}
                </div>
              ) : (
                <div className="empty-stage">
                  <div className="viewfinder v1" />
                  <div className="viewfinder v2" />
                  <div className="viewfinder v3" />
                  <div className="viewfinder v4" />
                  <span className="upload-symbol">
                    <ImagePlus size={31} strokeWidth={1.4} />
                  </span>
                  <h3>Open an image</h3>
                  <p>Drop an image here to start investigating.</p>
                  <button className="button primary" onClick={() => input.current?.click()}>
                    <Upload size={16} />
                    Choose an image
                  </button>
                  <small>JPEG, PNG or WebP · Up to 20 MB</small>
                  <span className="or-divider">OR EXPLORE A SAMPLE BELOW</span>
                </div>
              )}
              {busy && (
                <div className="image-loading" role="status">
                  <LoaderCircle className="spin" />
                  Reading image locally…
                </div>
              )}
              {evidence && tab !== 'Chronolocation' && (
                <button
                  className="icon-button expand-button"
                  aria-label="Expand image"
                  onClick={() => setExpanded(true)}
                >
                  <Maximize2 size={16} />
                </button>
              )}
              {dragging && <div className="image-loading">Drop to inspect this image</div>}
            </div>
            <div className="image-toolbar">
              <div>
                <span className="file-icon">
                  <ImagePlus size={15} />
                </span>
                <span className="filename">
                  {evidence?.name || 'No image selected'}
                  <small>
                    {evidence
                      ? `${evidence.width} × ${evidence.height} px · ${(evidence.size / 1024 / 1024).toFixed(2)} MB`
                      : 'No sign-up. No image uploads to our servers.'}
                  </small>
                </span>
              </div>
              <button
                className="text-button"
                disabled={busy}
                onClick={() => input.current?.click()}
              >
                {evidence ? 'Replace' : 'Upload'}
                <Upload size={14} />
              </button>
              {evidence && (
                <button
                  className="text-button"
                  aria-label="Clear investigation"
                  title="Clear investigation"
                  onClick={ctx.clear}
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>
          <input
            ref={input}
            type="file"
            className="sr-only"
            aria-label="Upload investigation image"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void load(file);
              event.target.value = '';
            }}
          />
          {error && (
            <div className="error-box" role="alert">
              <Info size={16} />
              {error}
              <button aria-label="Dismiss error" onClick={() => setError('')}>
                <X size={16} />
              </button>
            </div>
          )}
          <div className="samples-heading">
            <h3>Sample images</h3>
            <span>
              LOAD SAMPLE <ArrowRight size={13} />
            </span>
          </div>
          <div className="sample-grid">
            {demos.map((item) => (
              <button
                key={item.id}
                disabled={busy}
                className={`sample-card ${evidence?.demo === item.id ? 'selected' : ''}`}
                onClick={() => void demo(item.id)}
              >
                <img src={asset(item.image)} alt={item.title} />
                <div className="sample-shade" />
                <span className="sample-tag">{item.tag}</span>
                <span className="sample-caption">
                  <strong>{item.title}</strong>
                  <small>{item.region}</small>
                </span>
                <span className="sample-arrow">
                  {evidence?.demo === item.id ? <Check size={15} /> : <ArrowUpRight size={16} />}
                </span>
              </button>
            ))}
          </div>
          <p className="sample-disclaimer">
            Self-generated scenes. Illustrative clues. No real event or location claims.
          </p>
          <div className="tip-card">
            <span className="tip-icon">
              <Camera size={18} />
            </span>
            <div>
              <h3>Check your own photos, too.</h3>
              <p>
                EXIF can reveal where and when a photo was taken. Inspect your image before sharing,
                and remove location tags with a trusted photo editor.
              </p>
            </div>
            <ArrowUpRight size={17} />
          </div>
        </section>
        <section className="analysis-column">
          <div className="panel tools-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">02</span>
                <h2>Investigate</h2>
              </div>
              <span className="muted small">Analysis tools</span>
            </div>
            <div className="tool-tabs" role="tablist" aria-label="Verification tools">
              {tabs.map(({ name, icon: Icon }) => (
                <button
                  key={name}
                  role="tab"
                  aria-selected={tab === name}
                  tabIndex={tab === name ? 0 : -1}
                  id={`tab-${name.replaceAll(' ', '-')}`}
                  aria-controls="tool-content"
                  className={tab === name ? 'selected' : ''}
                  onClick={() => setTab(name)}
                  onKeyDown={(event) => {
                    const index = tabs.findIndex((item) => item.name === name);
                    const next =
                      event.key === 'ArrowRight'
                        ? (index + 1) % tabs.length
                        : event.key === 'ArrowLeft'
                          ? (index + tabs.length - 1) % tabs.length
                          : event.key === 'Home'
                            ? 0
                            : event.key === 'End'
                              ? tabs.length - 1
                              : -1;
                    if (next < 0) return;
                    event.preventDefault();
                    setTab(tabs[next].name);
                    document.getElementById(`tab-${tabs[next].name.replaceAll(' ', '-')}`)?.focus();
                  }}
                >
                  <Icon size={16} />
                  <span>{name}</span>
                </button>
              ))}
            </div>
            <div
              id="tool-content"
              role="tabpanel"
              aria-labelledby={`tab-${tab.replaceAll(' ', '-')}`}
              className="tool-content"
            >
              {tab === 'Visual clues' ? (
                <VisualClues key={evidence?.url} />
              ) : tab === 'Metadata' ? (
                <MetadataPanel key={evidence?.url} />
              ) : tab === 'Reverse search' ? (
                <ReverseSearch />
              ) : (
                <Chronolocation key={evidence?.url} />
              )}
            </div>
          </div>
          <div className="report-callout">
            <div className="report-icon">
              <FileText size={22} />
            </div>
            <div>
              <h3>Verification report</h3>
              <p>Review findings and export PDF or Markdown.</p>
            </div>
            <Link href="/report" aria-label="Open verification report">
              <ArrowRight size={20} />
            </Link>
          </div>
        </section>
      </div>
      {expanded && evidence && (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Expanded source image"
          onKeyDown={(event) => {
            if (event.key === 'Tab') event.preventDefault();
          }}
          onClick={() => setExpanded(false)}
        >
          <button
            autoFocus
            className="icon-button"
            aria-label="Close expanded image"
            onClick={() => setExpanded(false)}
          >
            <X />
          </button>
          <img src={evidence.url} alt="Expanded investigation source" />
        </div>
      )}
    </div>
  );
}
function VisualClues() {
  const { settings } = useProviderSettings();
  const configError = configurationError(settings);
  const aiEnabled = !configError;
  const providerName = providerNames[settings.provider];
  const { evidence, analysis, setAnalysis, analysisSource, setAnalysisSource } = useInvestigation();
  const [running, setRunning] = useState(false),
    [error, setError] = useState(''),
    [consent, setConsent] = useState(false);
  const latest = useRef(evidence?.url);
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    latest.current = evidence?.url;
  }, [evidence?.url]);
  useEffect(
    () => () => {
      request.current?.abort();
    },
    [],
  );
  async function analyze() {
    if (!evidence || !consent || !aiEnabled) return;
    const url = evidence.url;
    setRunning(true);
    setError('');
    request.current = new AbortController();
    try {
      const data = await analyzeImage(settings, evidence.aiData, request.current.signal);
      if (latest.current === url) {
        setAnalysis({
          ...data,
          provenance: `${providerName} / ${settings.profiles[settings.provider].model}`,
        });
        setAnalysisSource('ai');
      }
    } catch (error) {
      if (latest.current === url && !(error instanceof Error && error.name === 'AbortError'))
        setError(error instanceof Error ? error.message : 'Analysis failed.');
    } finally {
      setRunning(false);
    }
  }
  return (
    <>
      <div className="section-intro">
        <span className="mini-label">
          <Sparkles size={13} /> VISUAL OBSERVATIONS
        </span>
        <h3>Visual clues</h3>
        <p>Observations grouped by category, with confidence and suggested regions.</p>
      </div>
      {!aiEnabled && (
        <div className="notice">
          <LockKeyhole size={16} />
          <div>
            <strong>No provider configured</strong>
            <p>
              Add your API key or connect a local vision model to analyze your images. Sample clues
              below are hand-authored examples.
            </p>
          </div>
        </div>
      )}
      <div className="provider-summary">
        <span>
          {aiEnabled
            ? `${providerName} / ${settings.profiles[settings.provider].model}`
            : 'Visual analysis needs a provider.'}
        </span>
        <Link className="text-button" href="/settings">
          Provider settings <ArrowUpRight size={14} />
        </Link>
      </div>
      {aiEnabled && (
        <div className="ai-consent">
          <label>
            <input
              type="checkbox"
              disabled={!evidence || running}
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
            />
            Send a resized, metadata-stripped image to {providerName}
            {settings.provider === 'local' || settings.provider === 'compatible'
              ? ` at ${settings.profiles[settings.provider].endpoint}`
              : ' through the Parallax server'}
            . Provider data and billing policies apply.
          </label>
          <button
            className="button primary"
            disabled={!evidence || !consent || running}
            onClick={() => void analyze()}
          >
            {running ? <LoaderCircle className="spin" size={16} /> : <Sparkles size={16} />}{' '}
            {running ? 'Reading visual clues…' : 'Analyze visual clues'}
          </button>
        </div>
      )}
      {error && (
        <p className="error-box" role="alert">
          {error}
        </p>
      )}
      {analysis ? (
        <>
          <div className="findings-header">
            <span>{analysis.clues.length} OBSERVATIONS</span>
            <span className="pill amber">
              {analysisSource === 'demo' ? 'ILLUSTRATIVE DEMO' : 'AI · UNVERIFIED'}
            </span>
          </div>
          <div className="clue-list">
            {categories.map((category, index) => {
              const clues = analysis.clues.filter((clue) => clue.category === category);
              const clue = clues[0];
              if (!clue) return null;
              const Icon = clueIcons[categories.indexOf(clue.category)];
              return (
                <details className="clue-card" key={index} open={index === 0 || undefined}>
                  <summary>
                    <span className="clue-symbol">
                      <Icon size={17} />
                    </span>
                    <span>
                      {clue.category}
                      <small>{clue.region}</small>
                    </span>
                    <span className={`confidence ${clue.confidence.toLowerCase()}`}>
                      <i />
                      {clue.confidence}
                    </span>
                    <ChevronRight className="clue-chevron" size={14} />
                  </summary>
                  <div className="clue-detail">
                    {clues.map((item, i) => (
                      <div key={i} className="category-observation">
                        <p>{item.observation}</p>
                        {item.language && (
                          <span className="language">Detected language: {item.language}</span>
                        )}
                        {clues.length > 1 && (
                          <p className="fine-print">
                            {item.confidence} observation confidence ? {item.region}
                          </p>
                        )}
                      </div>
                    ))}
                    <FollowUpChat disabled={running} category={category} />
                  </div>
                </details>
              );
            })}
          </div>
          <p className="fine-print">
            <Info size={13} />
            Confidence reflects an observation, not a verified location.
          </p>
          <LocationHypotheses analysis={analysis} />
          <FollowUpChat disabled={running} />
        </>
      ) : (
        <div className="empty-clues">
          <ScanLine size={30} strokeWidth={1.2} />
          <h4>{evidence ? 'No visual observations' : 'No image selected'}</h4>
          <p>
            {evidence
              ? 'Inspect metadata, search for earlier appearances, or test a shadow. Load a sample to explore example visual clues.'
              : 'Load a sample to inspect hand-authored example observations.'}
          </p>
          <div className="category-chips">
            {categories.map((category, i) => {
              const Icon = clueIcons[i];
              return (
                <span key={category}>
                  <Icon size={12} />
                  {category}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
function MetadataPanel() {
  const { evidence } = useInvestigation();
  const [map, setMap] = useState(false);
  if (!evidence)
    return (
      <ToolEmpty
        icon={Camera}
        title="Image metadata"
        text="Upload an image or choose a demo to inspect embedded metadata. Parsing happens entirely in your browser."
      />
    );
  return (
    <>
      <div className="section-intro">
        <span className="mini-label">
          <Camera size={13} /> FILE INSPECTION
        </span>
        <h3>EXIF & editing metadata</h3>
        <p>
          Metadata is a lead, not proof. It can be edited, removed, or copied from another file.
        </p>
      </div>
      {Object.keys(evidence.metadata).length ? (
        <dl className="metadata-list">
          {Object.entries(evidence.metadata).map(([key, value]) => (
            <div key={key}>
              <dt>{key}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <div className="notice">
          <Info size={17} />
          <div>
            <strong>No readable camera or editing metadata.</strong>
            <p>
              {evidence.metadataError ||
                'This image may have been exported without EXIF, or its metadata may have been stripped. Absence alone is not evidence of manipulation.'}
            </p>
          </div>
        </div>
      )}
      <p className="fine-print">
        Timestamps without an explicit UTC offset have an unknown time zone. Software tags do not
        establish deceptive editing.
      </p>
      <div className="subsection-heading">
        <MapPin size={16} />
        <h4>Location data</h4>
        <span className="pill">{evidence.gps ? 'GPS FOUND' : 'NO GPS'}</span>
      </div>
      {evidence.gps ? (
        <>
          <p className="coordinate-text">
            {evidence.gps.latitude.toFixed(6)}, {evidence.gps.longitude.toFixed(6)}
          </p>
          <p className="fine-print">
            Loading the map sends these coordinates and your IP to OpenStreetMap.
          </p>
          {map ? (
            <iframe
              title="EXIF location map"
              className="location-map"
              referrerPolicy="no-referrer"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${evidence.gps.longitude - 0.02}%2C${evidence.gps.latitude - 0.02}%2C${evidence.gps.longitude + 0.02}%2C${evidence.gps.latitude + 0.02}&layer=mapnik&marker=${evidence.gps.latitude}%2C${evidence.gps.longitude}`}
            />
          ) : (
            <button className="button secondary" onClick={() => setMap(true)}>
              <MapPin size={15} />
              Load location map
            </button>
          )}
        </>
      ) : (
        <p className="muted small">No readable GPS coordinates were found in this file.</p>
      )}
      <div className="subsection-heading">
        <ShieldCheck size={16} />
        <h4>File fingerprint</h4>
      </div>
      <span className="mini-label">SHA-256 · ORIGINAL FILE</span>
      <code className="hash">{evidence.hash}</code>
      <p className="fine-print">
        A fingerprint identifies these exact bytes. It does not prove authenticity.
      </p>
    </>
  );
}
function ReverseSearch() {
  const { evidence, searches, setSearches } = useInvestigation();
  const [url, setUrl] = useState('');
  let publicUrl = '';
  try {
    const parsed = new URL(url);
    if (['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password)
      publicUrl = parsed.href;
  } catch {
    /* Optional URL. */
  }
  const services = [
    {
      name: 'Google Lens',
      letter: 'G',
      subtitle: 'Find objects & matching pages',
      href: publicUrl
        ? `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(publicUrl)}`
        : 'https://lens.google/',
    },
    {
      name: 'Bing Visual Search',
      letter: 'b',
      subtitle: 'Compare visually similar images',
      href: publicUrl
        ? `https://www.bing.com/images/searchbyimage?cbir=sbi&imgurl=${encodeURIComponent(publicUrl)}`
        : 'https://www.bing.com/visualsearch',
    },
    {
      name: 'Yandex Images',
      letter: 'Y',
      subtitle: 'Explore another search index',
      href: publicUrl
        ? `https://yandex.com/images/search?rpt=imageview&url=${encodeURIComponent(publicUrl)}`
        : 'https://yandex.com/images/',
    },
    {
      name: 'TinEye',
      letter: 't',
      subtitle: 'Trace copies & earlier appearances',
      href: publicUrl
        ? `https://tineye.com/search?url=${encodeURIComponent(publicUrl)}`
        : 'https://tineye.com/',
    },
  ];
  return (
    <>
      <div className="section-intro">
        <span className="mini-label">
          <Search size={13} /> REVERSE IMAGE SEARCH
        </span>
        <h3>Search for earlier copies</h3>
        <p>
          Compare independent indexes. Look for earlier publication dates, alternate crops, and the
          original context.
        </p>
      </div>
      <label className="field">
        Public image URL <span className="muted">optional</span>
        <input
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://example.com/image.jpg"
        />
      </label>
      {url && !publicUrl && (
        <p className="error-text">Enter a full http or https image URL without credentials.</p>
      )}
      <div className="search-services">
        {services.map((service) => (
          <a
            key={service.name}
            href={service.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              if (!searches.includes(service.name)) setSearches([...searches, service.name]);
            }}
            className="search-service"
          >
            <span className="search-logo">{service.letter}</span>
            <span>
              <strong>{service.name}</strong>
              <small>{service.subtitle}</small>
            </span>
            {searches.includes(service.name) ? <Check size={16} /> : <ArrowUpRight size={16} />}
          </a>
        ))}
      </div>
      <div className="notice">
        <Info size={17} />
        <div>
          <strong>
            {publicUrl
              ? 'This URL will be shared with the search provider.'
              : 'Local files need one extra step.'}
          </strong>
          <p>
            {publicUrl
              ? 'The provider must be able to fetch the image without signing in. Parallax does not host your image or fetch this URL.'
              : `Open a service, choose its camera or upload button, and select ${evidence ? evidence.name : 'your original file'} again. A browser cannot pass a local file through a search link.`}
          </p>
        </div>
      </div>
      <p className="fine-print">
        If a service requires a URL, use the original public image address. Avoid hosting private
        photos just to search them. Opened links are recorded as handoffs, not completed searches.
      </p>
    </>
  );
}
function Chronolocation() {
  const { evidence, points, setPoints, shadow, setShadow } = useInvestigation();
  const [latitude, setLatitude] = useState(
      String(shadow?.latitude ?? evidence?.gps?.latitude ?? '38.7107'),
    ),
    [longitude, setLongitude] = useState(
      String(shadow?.longitude ?? evidence?.gps?.longitude ?? '-9.1355'),
    );
  const [date, setDate] = useState(shadow?.date ?? '2026-06-21'),
    [offset, setOffset] = useState(String(shadow?.offset ?? 0)),
    [north, setNorth] = useState(String(shadow?.north ?? 0)),
    [tolerance, setTolerance] = useState(String(shadow?.tolerance ?? 5)),
    [calibrated, setCalibrated] = useState(false),
    [error, setError] = useState('');
  function calculate() {
    setError('');
    if (!evidence) return;
    try {
      const result = estimateTime({
        points,
        width: evidence.width,
        height: evidence.height,
        latitude: number(latitude),
        longitude: number(longitude),
        date,
        offset: number(offset),
        north: number(north),
        tolerance: number(tolerance),
      });
      setShadow(result);
      if (!result)
        setError(
          'No daylight match within this tolerance. Recheck north, the date, location and perspective.',
        );
    } catch (error) {
      setShadow(null);
      setError(error instanceof Error ? error.message : 'Unable to calculate.');
    }
  }
  function number(value: string) {
    return value.trim() ? Number(value) : NaN;
  }
  function change(setter: (value: string) => void, value: string) {
    setter(value);
    setShadow(null);
  }
  return (
    <>
      <div className="section-intro">
        <span className="mini-label">
          <Sun size={13} /> SHADOW ANALYSIS
        </span>
        <h3>Chronolocation</h3>
        <p>Test a candidate location and date against an observed ground-shadow direction.</p>
      </div>
      <div className="form-grid">
        <label className="field">
          Latitude
          <input
            type="number"
            min="-90"
            max="90"
            step="any"
            value={latitude}
            onChange={(e) => change(setLatitude, e.target.value)}
          />
        </label>
        <label className="field">
          Longitude
          <input
            type="number"
            min="-180"
            max="180"
            step="any"
            value={longitude}
            onChange={(e) => change(setLongitude, e.target.value)}
          />
        </label>
        <label className="field">
          Candidate date
          <input type="date" value={date} onChange={(e) => change(setDate, e.target.value)} />
        </label>
        <label className="field">
          UTC offset (hours)
          <input
            type="number"
            min="-12"
            max="14"
            step="0.25"
            value={offset}
            onChange={(e) => change(setOffset, e.target.value)}
          />
        </label>
        <label className="field">
          North in image (° clockwise)
          <input
            type="number"
            min="0"
            max="360"
            value={north}
            onChange={(e) => change(setNorth, e.target.value)}
          />
        </label>
        <label className="field">
          Angle tolerance (±°)
          <input
            type="number"
            min="1"
            max="30"
            value={tolerance}
            onChange={(e) => change(setTolerance, e.target.value)}
          />
        </label>
      </div>
      <p className="fine-print">
        Example coordinates are a hypothesis, not a detected location. Set the date’s UTC offset
        yourself, including daylight saving.
      </p>
      <div className="measure-steps">
        <div>
          <h4>Mark three points on the image</h4>
          <button
            className="text-button"
            onClick={() => {
              setPoints([]);
              setShadow(null);
            }}
          >
            <RotateCcw size={13} />
            Reset
          </button>
        </div>
        {[
          'Object base / shadow origin',
          'Top of the same upright object',
          'Tip of its ground shadow',
        ].map((text, i) => (
          <span
            key={text}
            className={points.length > i ? 'done' : points.length === i ? 'current' : ''}
          >
            <b>{points.length > i ? <Check size={12} /> : i + 1}</b>
            {text}
          </span>
        ))}
      </div>
      <details className="manual-points">
        <summary>Or enter normalized points with a keyboard</summary>
        <p className="fine-print">
          X and Y range from 0 to 1, measured from the image’s top-left corner.
        </p>
        {points.length < 3 && (
          <button
            className="text-button"
            onClick={() => {
              setPoints([
                { x: 0.3, y: 0.7 },
                { x: 0.3, y: 0.2 },
                { x: 0.7, y: 0.85 },
              ]);
              setShadow(null);
            }}
          >
            Initialize editable points
          </button>
        )}
        {points.map((point, i) => (
          <div className="form-grid" key={i}>
            {(['x', 'y'] as const).map((axis) => (
              <label key={axis} className="field">
                Point {i + 1} {axis}
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={point[axis]}
                  onChange={(e) => {
                    setPoints(
                      points.map((p, index) =>
                        index === i
                          ? { ...p, [axis]: Math.min(1, Math.max(0, Number(e.target.value))) }
                          : p,
                      ),
                    );
                    setShadow(null);
                  }}
                />
              </label>
            ))}
          </div>
        ))}
      </details>
      <div className="notice">
        <Info size={16} />
        <div>
          <strong>Perspective matters.</strong>
          <p>
            Use a level ground plane rectified to a top-down view, with a known north direction. An
            ordinary oblique photograph can give a misleading result. The object top is recorded for
            context; image lengths are not used to infer sun elevation.
          </p>
        </div>
      </div>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={calibrated}
          onChange={(e) => {
            setCalibrated(e.target.checked);
            setShadow(null);
          }}
        />
        I have a ground-plane north reference and understand the perspective limitation.
      </label>
      <button
        className="button primary full-width"
        disabled={!evidence || points.length !== 3 || !calibrated}
        onClick={calculate}
      >
        <Sun size={16} />
        Estimate time window
      </button>
      {error && (
        <p className="error-box" role="alert">
          {error}
        </p>
      )}
      {shadow && (
        <div className="solar-result">
          <span className="mini-label">CANDIDATE MATCH · NOT A CAPTURE TIME</span>
          <strong>
            {new Date(Date.parse(shadow.utc) + shadow.offset * 3_600_000)
              .toISOString()
              .slice(11, 16)}{' '}
            <small>
              UTC{shadow.offset >= 0 ? '+' : ''}
              {shadow.offset}
            </small>
          </strong>
          <p>
            Sun azimuth {shadow.azimuth.toFixed(1)}° · altitude {shadow.altitude.toFixed(1)}°
          </p>
          <p>
            {shadow.matches} matching minute samples within ±{shadow.tolerance}°. Best angular
            residual: {shadow.error.toFixed(2)}°.
          </p>
          <p className="fine-print">
            Earliest / latest matching UTC samples: {shadow.windowStart.slice(11, 16)} /{' '}
            {shadow.windowEnd.slice(11, 16)}. Samples may be non-contiguous. Geometry uncertainty
            exceeds the one-minute sampling interval.
          </p>
        </div>
      )}
    </>
  );
}
function ToolEmpty({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Camera;
  title: string;
  text: string;
}) {
  return (
    <div className="empty-clues">
      <Icon size={30} />
      <h4>{title}</h4>
      <p>{text}</p>
    </div>
  );
}
