import Link from 'next/link';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Methodology',
  description:
    'How image metadata, reverse search, visual clues, and shadow geometry support responsible image verification.',
};
export default function Methodology() {
  return (
    <div className="document-page">
      <Link href="/" className="text-button">
        <ArrowLeft size={14} />
        Back to analysis
      </Link>
      <div className="eyebrow" style={{ color: 'var(--accent)', marginTop: 32 }}>
        REFERENCE
      </div>
      <h1>Methodology & limitations</h1>
      <p className="document-lead">
        Image verification is a process of testing claims against independent evidence. Parallax
        brings four complementary techniques into one workspace, while keeping their assumptions in
        view.
      </p>
      <div className="method-grid">
        <article className="method-card">
          <span>01 / METADATA</span>
          <h2>Metadata inspection</h2>
          <p>
            Camera files may contain EXIF fields describing the device, exposure, capture time and
            GPS position. Editing applications can add software tags. Parallax uses{' '}
            <a href="https://github.com/MikeKovarik/exifr" target="_blank" rel="noreferrer">
              exifr
            </a>{' '}
            to decode these fields entirely in your browser, alongside supported XMP and IPTC data.
          </p>
          <h3>Why it helps</h3>
          <p>
            Compare metadata against a claim: a date, camera model or coordinate may support a lead
            or expose a contradiction. The SHA-256 fingerprint lets you distinguish the exact
            original bytes from a recompressed copy.
          </p>
          <h3>Where it stops</h3>
          <p>
            Metadata can be changed or copied. Social platforms often remove it, and an empty
            metadata panel is not evidence of deception. A software tag does not prove misleading
            editing. Most EXIF timestamps have no time zone unless a separate offset is present.
          </p>
        </article>
        <article className="method-card">
          <span>02 / REVERSE IMAGE SEARCH</span>
          <h2>Reverse image search</h2>
          <p>
            Search indexes compare visual patterns to find copies, crops and similar scenes. Use
            multiple providers because their coverage differs. An older appearance can show that an
            image predates the event attached to it.
          </p>
          <h3>A practical sequence</h3>
          <p>
            Open a provider, upload the original image, and inspect the oldest relevant results.
            Compare crops and captions. Record the original page URL, publication date and an
            archived copy in your report notes.
          </p>
          <h3>Where it stops</h3>
          <p>
            Parallax opens the search service; it cannot transfer a local file in a URL or read its
            results. Public-image URLs can be passed directly. Search rankings and publication dates
            are not capture dates. No matches does not mean an image is new or authentic.
          </p>
        </article>
        <article className="method-card">
          <span>03 / VISUAL CLUES</span>
          <h2>Visual clue analysis</h2>
          <p>
            Language, road markings, architecture, plants, vehicles and weather may narrow a region.
            Look for independent clues that agree, and actively search for alternate explanations.
            Vehicles travel; architectural styles cross borders.
          </p>
          <h3>Inspect details and compare hypotheses</h3>
          <p>
            Each category has an Analyse further action and a separate conversation. Selecting a
            region crops the original image before resizing, which retains available detail that can
            disappear in a whole-scene overview. A crop cannot recover pixels missing from the
            original. Candidate identifications should cite visible features and alternatives;
            identifying a cultivated flower does not establish its native range as the location.
          </p>
          <p>
            Location and capture-time candidates use qualitative labels: Likely means distinctive
            evidence favors the candidate; Plausible means compatible but not distinguishing;
            Unlikely means contradicted by a visible clue. Unresolved records missing evidence.
            These are model judgments, not verified matches or calibrated probabilities. The model
            has no browsing or map tools. Compare independent reference images before accepting a
            location, and avoid inferring a calendar date from season or daylight alone.
          </p>
          <h3>AI is optional</h3>
          <p>
            Configure Anthropic, OpenAI, Gemini, or a local/OpenAI-compatible vision model in
            Provider settings. Supply your own key and explicitly run analysis. Cloud requests pass
            through Parallax; local and compatible requests go directly from the browser to your
            endpoint. Demo scenes use hand-authored example observations. Keys can be saved in an
            unencrypted local config file or browser storage and are never included in reports or
            analysis history.
          </p>
          <h3>Where it stops</h3>
          <p>
            AI can misread text, invent observations or overstate a regional pattern. Confidence
            labels are qualitative, not calibrated probabilities of location. Plate observations are
            limited to region; identifying people and transcribing plate numbers are excluded.
          </p>
        </article>
        <article className="method-card">
          <span>04 / CHRONOLOCATION</span>
          <h2>Shadow geometry</h2>
          <p>
            For a candidate latitude, longitude and date,{' '}
            <a
              href="https://github.com/mourner/suncalc/tree/v1.9.0"
              target="_blank"
              rel="noreferrer"
            >
              SunCalc 1.9
            </a>{' '}
            estimates the sun’s direction throughout the day. A vertical object’s ground shadow
            points opposite the sun’s horizontal bearing.
          </p>
          <h3>What Parallax calculates</h3>
          <p>
            Mark the object base, its top and the shadow tip. Calibrate north clockwise from
            image-up. Parallax uses the base-to-shadow-tip bearing, scans the candidate day at
            one-minute intervals, and returns daylight matches within your angular tolerance. The
            entered UTC offset defines that day. Sun altitude is predicted for the selected match,
            not measured from image lengths.
          </p>
          <h3>The essential limitation</h3>
          <p>
            A normal oblique photograph distorts ground angles. Use a level ground plane rectified
            to a top-down view with independently known north. The object top is recorded only for
            context; it does not correct perspective. Sloped ground, leaning objects, artificial
            lights and uncertain shadow endpoints can invalidate the estimate. Earliest and latest
            matches need not form a continuous interval. A match is a hypothesis, not a timestamp.
          </p>
        </article>
      </div>
      <div className="method-note">
        <strong>Privacy is part of the method.</strong>
        <p>
          Use Parallax for public and news imagery, never to locate private individuals. Images and
          findings are saved in this browser using IndexedDB and can be reopened from History.
          Delete a case to remove its local record; clearing site data removes all history. No image
          is stored on the Parallax server. Explicit analysis requests send a resized,
          metadata-stripped copy to the selected provider. Provider retention policies apply; for
          example, Anthropic’s{' '}
          <a
            className="inline-link"
            href="https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-data"
            target="_blank"
            rel="noreferrer"
          >
            API retention policy
          </a>{' '}
          applies. Map loading is opt-in and shares coordinates with OpenStreetMap. Search links
          share public URLs with their providers.
        </p>
        <p>
          Check your own photos before posting: GPS metadata may reveal a home, workplace or travel
          route. Remove location tags with a trusted editor, re-open the exported file, and check it
          again. Review exported reports before sharing; they may contain the GPS and notes you
          chose to include.
        </p>
      </div>
      <div className="method-note">
        <strong>About the samples.</strong>
        <p>
          Both bundled scenes were self-generated with an image model specifically for this project.
          They depict fictional places, carry no camera/GPS metadata, and do not document real
          events. Their illustrative observations demonstrate a workflow; they are not forensic
          ground truth or calibrated shadow examples.
        </p>
      </div>
      <Link href="/" className="button primary" style={{ marginTop: 25 }}>
        Open workspace
        <ArrowUpRight size={16} />
      </Link>
    </div>
  );
}
