import type { Analysis } from '@/lib/schema';
export function LocationHypotheses({ analysis }: { analysis: Analysis }) {
  const hypotheses = analysis.hypotheses;
  return (
    <section className="location-hypotheses" aria-label="Location and capture-time hypotheses">
      <h3>Location & capture time</h3>
      <p className="fine-print">
        Qualitative model judgments, not verified matches. Likely: distinctive support. Plausible:
        fits but lacks distinguishing evidence. Unlikely: contradicted by a visible clue.
      </p>
      {!hypotheses ? (
        <p className="fine-print">
          No ranked hypotheses recorded. Run visual analysis to request candidates; older results
          and demo clues do not contain likelihood assessments.
        </p>
      ) : (
        (['location', 'captureTime'] as const).map((key) => {
          const distribution = hypotheses[key];
          return (
            <div className="hypothesis-group" key={key}>
              <h4>
                {key === 'location' ? 'Possible locations' : 'Possible capture dates / times'}
              </h4>
              {[...distribution.candidates]
                .sort(
                  (a, b) =>
                    ['Likely', 'Plausible', 'Unlikely'].indexOf(a.likelihood) -
                    ['Likely', 'Plausible', 'Unlikely'].indexOf(b.likelihood),
                )
                .map((candidate, i) => (
                  <details className="hypothesis-card" key={i}>
                    <summary>
                      <span>{candidate.label}</span>
                      <strong>{candidate.likelihood}</strong>
                    </summary>
                    <dl>
                      <dt>Supporting clues</dt>
                      <dd>{candidate.supportingEvidence}</dd>
                      <dt>Contradictions / limits</dt>
                      <dd>{candidate.limitations}</dd>
                      <dt>Next check</dt>
                      <dd>{candidate.nextCheck}</dd>
                    </dl>
                  </details>
                ))}
              <div className="hypothesis-unknown">
                <div>
                  <strong>Unresolved</strong>
                  <p>{distribution.unresolved}</p>
                </div>
              </div>
            </div>
          );
        })
      )}
    </section>
  );
}
