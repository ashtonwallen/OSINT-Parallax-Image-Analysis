'use client';
import Link from 'next/link';
import { useEffect, useRef, useState, useId } from 'react';
import { useInvestigation } from './investigation-provider';
import { useProviderSettings } from './provider-context';
import { configurationError, providerNames } from '@/lib/providers';
import { askAboutImage } from '@/lib/analyze-client';
import { analysisSchema } from '@/lib/schema';
import {
  conversationSchema,
  categoryQuestion,
  type Category,
  type ChatMessage,
} from '@/lib/conversation';
import { cropForAnalysis, type ImageRegion } from '@/lib/image-region';
import { RegionPicker } from './region-picker';

export function FollowUpChat({ disabled, category }: { disabled: boolean; category?: Category }) {
  const titleId = useId();
  const [region, setRegion] = useState<ImageRegion | null>(null);
  const [expanded, setExpanded] = useState(false);
  const { evidence, analysis, chat: allChat, setChat } = useInvestigation();
  const chat = allChat.filter((message) => message.category === category);
  const { settings } = useProviderSettings();
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState('');
  const [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  const log = useRef<HTMLDivElement>(null);
  const provider = providerNames[settings.provider];
  const configError = configurationError(settings);
  useEffect(
    () => () => {
      controller.current?.abort();
    },
    [evidence?.url, analysis],
  );
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [allChat, pending]);

  async function send(questionText = draft) {
    if (
      !evidence ||
      !analysis ||
      !questionText.trim() ||
      controller.current ||
      pending ||
      configError ||
      disabled
    )
      return;
    const question = questionText.trim();
    const imageNote = region
      ? `[Image region: left ${region.x}%, top ${region.y}%, width ${region.width}%, height ${region.height}% of the original. Only this crop is visible in this request.]`
      : '[Full image supplied in this request.]';
    setExpanded(true);
    const abort = new AbortController();
    controller.current = abort;
    setPending(question);
    setDraft('');
    setError('');
    const user: ChatMessage = {
      role: 'user',
      content: category ? `${question}\n\n${imageNote}` : question,
      ...(category ? { category } : {}),
    };
    // Send complete recent exchanges within the request budget; retain the full local transcript.
    let recent = chat.slice(-10).map(({ role, content }) => ({ role, content }));
    while (recent.reduce((n, m) => n + m.content.length, user.content.length) > 64000)
      recent = recent.slice(2);
    try {
      const image = region ? await cropForAnalysis(evidence.url, region) : evidence.aiData;
      if (abort.signal.aborted) return;
      const conversation = conversationSchema.parse({
        ...(category ? { category } : {}),
        findings: analysisSchema.parse(analysis),
        synthetic: Boolean(evidence.demo),
        messages: [...recent, { role: user.role, content: user.content }],
      });
      const answer = await askAboutImage(settings, image, conversation, abort.signal);
      if (!abort.signal.aborted)
        setChat((previous) => [
          ...previous,
          user,
          {
            role: 'assistant',
            ...(category ? { category } : {}),
            content: answer,
            provider: `${provider} / ${settings.profiles[settings.provider].model}`,
          },
        ]);
    } catch (error) {
      setDraft(question);
      if (!abort.signal.aborted)
        setError(
          error instanceof Error ? error.message : 'Could not get a reply. Retry your question.',
        );
    } finally {
      controller.current = null;
      setPending('');
    }
  }
  return (
    <section
      className={`follow-up ${category ? 'category-follow-up' : ''}`}
      aria-labelledby={titleId}
    >
      <h3 id={titleId}>
        {category ? `Inspect ${category.toLowerCase()}` : 'Discuss the findings'}
      </h3>
      {!category && (
        <p className="fine-print">
          Ask about a clue or the next verification step. Replies are unverified.
        </p>
      )}
      {category && (
        <>
          {evidence && (
            <RegionPicker
              url={evidence.url}
              value={region}
              onChange={setRegion}
              disabled={Boolean(pending) || disabled}
            />
          )}
          <p className="fine-print">
            Sends {region ? 'the selected crop' : 'the resized image'} and the findings for this
            category to {provider}. Provider data and billing policies apply.
          </p>
          <button
            className="button secondary"
            type="button"
            disabled={disabled || Boolean(pending) || Boolean(configError)}
            onClick={() => void send(categoryQuestion(category))}
          >
            {pending ? 'Analysing...' : 'Analyse further'}
          </button>
        </>
      )}
      {chat.length > 0 || pending ? (
        <div
          className="chat-log"
          ref={log}
          role="log"
          aria-label={category ? `${category} conversation` : 'Findings conversation'}
          aria-live="polite"
        >
          {chat.map((message, index) => (
            <article className={`chat-message ${message.role}`} key={index}>
              <div className="mini-label">
                {message.role === 'user'
                  ? 'You'
                  : `${message.provider || 'Assistant'} · Unverified`}
              </div>
              <p>{message.content}</p>
            </article>
          ))}
          {pending && (
            <>
              <article className="chat-message user">
                <div className="mini-label">You</div>
                <p>{pending}</p>
              </article>
              <p role="status">Waiting for {provider}…</p>
            </>
          )}
        </div>
      ) : !category ? (
        <div className="chat-suggestions">
          {[
            'Which clue is most useful, and why?',
            'What could contradict these findings?',
            'What should I verify next?',
          ].map((question) => (
            <button
              type="button"
              className="button secondary"
              onClick={() => setDraft(question)}
              key={question}
            >
              {question}
            </button>
          ))}
        </div>
      ) : null}
      {configError ? (
        <p className="notice">
          Configure a provider to ask follow-up questions.{' '}
          <Link href="/settings">Provider settings</Link>
        </p>
      ) : !category || expanded || chat.length > 0 ? (
        <p className="fine-print">
          Send shares {region ? 'the selected crop' : 'the resized image'},{' '}
          {category ? 'category findings' : 'current findings'} and up to five recent exchanges with{' '}
          {provider}. The full conversation saves in this browser. Provider retention policies
          apply.
        </p>
      ) : null}
      {(!category || expanded || chat.length > 0) && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <label className="field">
            {category ? `${category} follow-up question` : 'Follow-up question'}
            <textarea
              rows={3}
              maxLength={4000}
              value={draft}
              disabled={Boolean(pending)}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask about the image or its findings…"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
            />
          </label>
          <div className="chat-actions">
            <span className="fine-print">Enter to send · Shift + Enter for a new line</span>
            {pending ? (
              <button
                type="button"
                className="button secondary"
                onClick={() => controller.current?.abort()}
              >
                Stop reply
              </button>
            ) : (
              <button
                className="button primary"
                type="submit"
                disabled={disabled || Boolean(configError) || !draft.trim()}
              >
                Send question
              </button>
            )}
          </div>
          {error && (
            <p className="error-box" role="alert">
              {error}
            </p>
          )}
        </form>
      )}
    </section>
  );
}
