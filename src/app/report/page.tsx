'use client';
import Link from 'next/link';
import { LocationHypotheses } from '@/components/location-hypotheses';
import { useState } from 'react';
import { ArrowLeft, ArrowRight, FileDown, FileText, ShieldCheck, Info } from 'lucide-react';
import { useInvestigation } from '@/components/investigation-provider';
import { reportMarkdown, downloadFile, downloadPDF } from '@/lib/report';
export default function Report() {
  const context = useInvestigation();
  const { evidence, analysis, analysisSource, shadow, notes, setNotes, searches } = context;
  const [exporting, setExporting] = useState(false),
    [error, setError] = useState('');
  async function exportReport(pdf: boolean) {
    if (!evidence) return;
    setExporting(true);
    setError('');
    try {
      const markdown = reportMarkdown({
        evidence,
        analysis,
        analysisSource,
        shadow,
        notes,
        searches,
        chat: context.chat,
      });
      if (pdf) await downloadPDF(markdown);
      else
        downloadFile(
          new Blob([markdown], { type: 'text/markdown;charset=utf-8' }),
          'parallax-verification-report.md',
        );
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Export failed. Please try Markdown instead.',
      );
    } finally {
      setExporting(false);
    }
  }
  return (
    <div className="document-page">
      <Link href="/" className="text-button">
        <ArrowLeft size={14} />
        Back to investigation
      </Link>
      <div className="eyebrow" style={{ color: 'var(--accent)', marginTop: 30 }}>
        INVESTIGATION OUTPUT
      </div>
      <h1>Verification report</h1>
      <p className="document-lead">Export image details, observations, notes, and hypotheses.</p>
      {analysis && <LocationHypotheses analysis={analysis} />}
      {!evidence ? (
        <div className="panel report-empty">
          <FileText size={40} strokeWidth={1} />
          <h2>No investigation loaded</h2>
          <p>
            Upload an image or load a sample to create a report.
            <br />
            Reopen an existing case from the History pane, or upload a new image.
          </p>
          <Link href="/" className="button primary">
            Start investigating
            <ArrowRight size={15} />
          </Link>
        </div>
      ) : (
        <>
          <div className="notice">
            <Info size={17} />
            <div>
              <strong>Unverified findings · Not an authenticity certificate</strong>
              <p>
                {evidence.demo
                  ? 'This report uses a synthetic demo image. Its clues are illustrative.'
                  : 'Check independent sources before drawing conclusions.'}{' '}
                Review GPS and personal notes before sharing. This investigation is saved in your
                browser history.
              </p>
            </div>
          </div>
          <div className="report-actions">
            <button
              disabled={exporting}
              onClick={() => void exportReport(true)}
              className="button primary"
            >
              <FileDown size={16} />
              {exporting ? 'Preparing export…' : 'Download PDF'}
            </button>
            <button
              disabled={exporting}
              onClick={() => void exportReport(false)}
              className="button secondary"
            >
              <FileText size={16} />
              Download Markdown
            </button>
          </div>
          {error && (
            <p className="error-box" role="alert">
              {error}
            </p>
          )}
          <div className="report-layout">
            <div>
              <section className="report-section">
                <h2>01 / Source & metadata</h2>
                <p>
                  {evidence.name} · {evidence.width} × {evidence.height} px
                  <br />
                  {evidence.demo
                    ? 'Self-generated synthetic scene'
                    : 'Local image; provenance not independently verified'}
                </p>
                <dl className="metadata-list">
                  {Object.entries(evidence.metadata).map(([key, value]) => (
                    <div key={key}>
                      <dt>{key}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
                {!Object.keys(evidence.metadata).length && (
                  <p>No readable camera or editing metadata found. It may be absent or stripped.</p>
                )}
                <p>
                  {evidence.gps
                    ? `GPS: ${evidence.gps.latitude}, ${evidence.gps.longitude}`
                    : 'No readable GPS coordinates.'}
                </p>
                <code className="hash">SHA-256: {evidence.hash}</code>
              </section>
              <section className="report-section">
                <h2>02 / Reverse-search handoffs</h2>
                <p>
                  {searches.length
                    ? `${searches.join(', ')} opened. Search results have not been retrieved or verified by Parallax.`
                    : 'No reverse-search services opened yet.'}
                </p>
              </section>
              <section className="report-section">
                <h2>03 / Visual observations</h2>
                {analysis ? (
                  <>
                    <span className="pill amber">
                      {analysisSource === 'demo'
                        ? 'ILLUSTRATIVE DEMO · HAND-AUTHORED'
                        : 'AI GENERATED · UNVERIFIED'}
                    </span>
                    <p style={{ marginTop: 12 }}>{analysis.summary}</p>
                    {analysis.clues.map((clue, index) => (
                      <div className="report-clue" key={index}>
                        <strong>
                          {clue.category} · {clue.confidence} confidence
                        </strong>
                        <p>
                          {clue.observation}
                          <br />
                          Suggested region: {clue.region}
                          {clue.language ? ` · Language: ${clue.language}` : ''}
                        </p>
                      </div>
                    ))}
                  </>
                ) : (
                  <p>No visual analysis performed. Configure a provider to extract visual clues.</p>
                )}
              </section>
              <section className="report-section">
                <h2>04 / Chronolocation hypothesis</h2>
                {shadow ? (
                  <p>
                    Candidate location: {shadow.latitude}, {shadow.longitude}
                    <br />
                    Candidate date: {shadow.date} · UTC offset {shadow.offset}
                    <br />
                    Best match (UTC): {shadow.utc}
                    <br />
                    Sun azimuth {shadow.azimuth.toFixed(1)}° · altitude {shadow.altitude.toFixed(1)}
                    °<br />
                    Shadow bearing {shadow.shadowBearing.toFixed(1)}° · north in image{' '}
                    {shadow.north}°<br />
                    {shadow.matches} minute samples within ±{shadow.tolerance}°; angular residual{' '}
                    {shadow.error.toFixed(2)}°.
                    <br />
                    Earliest / latest matching UTC samples: {shadow.windowStart} /{' '}
                    {shadow.windowEnd}. Samples may be non-contiguous.
                    <br />
                    Assumes a rectified level ground plane and known north. This does not establish
                    capture time.
                  </p>
                ) : (
                  <p>No shadow hypothesis calculated.</p>
                )}
              </section>
              <section className="report-section">
                <label className="report-note-label">
                  05 / Investigator notes
                  <textarea
                    value={notes}
                    maxLength={10000}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Record source URLs, alternative explanations, corroborating evidence, and open questions…"
                  />
                </label>
                <p>
                  Notes are included in your export. {notes.length.toLocaleString()} / 10,000
                  characters.
                </p>
              </section>
            </div>
            <aside>
              <img className="report-preview" src={evidence.url} alt="Report source image" />
              <div className="report-summary">
                <ShieldCheck size={22} color="var(--accent)" />
                <h3 style={{ marginTop: 12 }}>Report limitations</h3>
                <p>
                  Keep observations separate from conclusions. Preserve the original file and cite
                  your independent sources.
                </p>
                <p style={{ marginTop: 10 }}>
                  Reports are generated locally. Your image is not embedded in the export.
                </p>
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
