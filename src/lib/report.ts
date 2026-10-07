import type { ChatMessage } from './conversation';
import type { Analysis, Evidence, ShadowResult } from './schema';
type ReportInput = {
  chat?: ChatMessage[];
  evidence: Evidence;
  analysis: Analysis | null;
  analysisSource: 'demo' | 'ai' | null;
  shadow: ShadowResult | null;
  notes: string;
  searches: string[];
};
export function reportMarkdown({
  evidence,
  analysis,
  analysisSource,
  shadow,
  notes,
  searches,
  chat = [],
}: ReportInput) {
  const clean = (text: string) =>
    text
      .replace(/[\r\n]+/g, ' ')
      .replace(/[<>]/g, '')
      .replace(/([\\`*_[\]#|])/g, '\\$1');
  return [
    '# Parallax — Verification report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '**Status: Unverified. This report records observations and hypotheses; it does not certify authenticity.**',
    '',
    '## Source image',
    `- File: ${clean(evidence.name)}`,
    `- Dimensions: ${evidence.width} × ${evidence.height} px`,
    `- Size: ${evidence.size} bytes`,
    `- SHA-256: ${evidence.hash}`,
    `- Source: ${evidence.demo ? 'Self-generated synthetic demo; not a real event or location.' : 'User-provided local file; provenance not independently verified.'}`,
    '',
    '## Embedded metadata',
    ...Object.entries(evidence.metadata).map(([key, value]) => `- ${key}: ${clean(value)}`),
    ...(!Object.keys(evidence.metadata).length
      ? [
          evidence.metadataError ||
            'No readable camera or editing metadata. It may be absent or stripped; absence is not proof of manipulation.',
        ]
      : []),
    evidence.gps
      ? `GPS: ${evidence.gps.latitude}, ${evidence.gps.longitude}`
      : 'GPS: No readable coordinates.',
    'Metadata is editable. Timestamps without an offset have an unknown time zone.',
    '',
    '## Reverse-search handoffs',
    searches.length
      ? searches
          .map((name) => `- ${name}: opened; results were not retrieved or verified by Parallax.`)
          .join('\n')
      : 'No search services opened.',
    '',
    '## Visual observations',
    ...(analysis?.warnings || []).map((warning) => `Note: ${clean(warning)}`),
    analysis
      ? `Source: ${analysisSource === 'demo' ? 'Hand-authored illustrative demo clues, not AI analysis.' : `${clean(analysis.provenance || 'AI analysis')}; unverified.`}`
      : 'No visual analysis performed.',
    ...(analysis
      ? [
          '',
          clean(analysis.summary),
          '',
          ...analysis.clues.flatMap((clue) => [
            `### ${clue.category}`,
            clean(clue.observation),
            `Confidence: ${clue.confidence} (observation only). Suggested region: ${clean(clue.region)}.${clue.language ? ` Language: ${clean(clue.language)}.` : ''}`,
            '',
          ]),
        ]
      : []),
    ...(chat.length
      ? [
          '## Findings conversation (unverified)',
          '',
          ...chat.flatMap((message) => [
            `### ${message.role === 'user' ? 'Analyst' : clean(message.provider || 'Assistant')}`,
            ...(message.category ? [`Category: ${clean(message.category)}`] : []),
            clean(message.content),
            '',
          ]),
        ]
      : []),
    ...(analysis?.hypotheses
      ? [
          '## Location and capture-time hypotheses',
          'Qualitative likelihood judgments, not verified matches. Likely: distinctive support. Plausible: compatible but not distinctive. Unlikely: contradicted by evidence.',
          ...(['location', 'captureTime'] as const).flatMap((key) => [
            `### ${key === 'location' ? 'Locations' : 'Capture dates / times'}`,
            ...analysis.hypotheses![key].candidates.flatMap((candidate) => [
              `- ${clean(candidate.label)}: ${candidate.likelihood}`,
              `  Supporting clues: ${clean(candidate.supportingEvidence)}`,
              `  Contradictions / limits: ${clean(candidate.limitations)}`,
              `  Next check: ${clean(candidate.nextCheck)}`,
            ]),
            `Unresolved: ${clean(analysis.hypotheses![key].unresolved)}`,
          ]),
          '',
        ]
      : []),
    '## Chronolocation hypothesis',
    shadow
      ? [
          `Candidate location: ${shadow.latitude}, ${shadow.longitude}. Candidate date: ${shadow.date}. UTC offset: ${shadow.offset}.`,
          `Best match: ${shadow.utc}. Sun azimuth: ${shadow.azimuth.toFixed(2)}° clockwise from north. Sun altitude: ${shadow.altitude.toFixed(2)}°.`,
          `Shadow bearing: ${shadow.shadowBearing.toFixed(2)}°. North in image: ${shadow.north}° clockwise from up. Tolerance: ±${shadow.tolerance}°. Angular residual: ${shadow.error.toFixed(2)}°.`,
          `${shadow.matches} matching minute samples; earliest ${shadow.windowStart}; latest ${shadow.windowEnd}. Matching samples may be non-contiguous.`,
          'Assumes a rectified, level ground plane, vertical object, direct sunlight, and known north. An oblique photograph invalidates image-plane bearing. The object top is recorded but image lengths do not estimate altitude. This is not a verified capture time.',
        ].join('\n\n')
      : 'No shadow hypothesis calculated.',
    '',
    '## Analysis notes',
    notes.trim() || 'No notes recorded.',
    '',
    '## Limitations & ethics',
    'Corroborate with independent sources. AI and synthetic examples can be wrong. Reverse-search publication dates do not necessarily establish capture dates. Do not use this tool to locate private individuals. For verifying public and news imagery only.',
    'Images and analysis state are saved locally in this browser. An explicit visual-analysis request sends a resized, metadata-stripped image to the selected provider; provider retention policies apply. Reports and analysis history contain no API keys. Review metadata and notes before sharing.',
    '',
  ].join('\n');
}
export function downloadFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function downloadPDF(markdown: string) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF();
  const fontResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/fonts/report.ttf`);
  if (!fontResponse.ok) throw new Error('Report font could not load. Try Markdown export.');
  const fontBytes = new Uint8Array(await fontResponse.arrayBuffer());
  let binary = '';
  for (const byte of fontBytes) binary += String.fromCharCode(byte);
  pdf.addFileToVFS('report.ttf', btoa(binary));
  pdf.addFont('report.ttf', 'Report', 'normal');
  pdf.setFont('Report');
  let y = 23;
  pdf.setTextColor(30, 39, 23);
  for (const line of markdown.split('\n')) {
    const heading = line.startsWith('#');
    if (heading && y > 252) {
      pdf.addPage();
      y = 22;
    }
    const text = line
      .replace(/^#+ /, '')
      .replace(/\*\*/g, '')
      .replace(/\\([\\`*_[\]#|])/g, '$1');
    pdf.setFontSize(heading ? (line.startsWith('# ') ? 22 : 13) : 10);
    const lines = pdf.splitTextToSize(text || ' ', 170) as string[];
    for (const wrapped of lines) {
      if (y > 275) {
        pdf.addPage();
        y = 22;
      }
      pdf.text(wrapped, 20, y);
      y += heading ? 8 : 5.5;
    }
    if (heading) y += 3;
  }
  for (let page = 1; page <= pdf.getNumberOfPages(); page++) {
    pdf.setPage(page);
    pdf.setFontSize(8);
    pdf.setTextColor(110);
    pdf.text(
      `PARALLAX / UNVERIFIED FINDINGS                                      ${page} / ${pdf.getNumberOfPages()}`,
      20,
      289,
    );
  }
  pdf.save('parallax-verification-report.pdf');
}
