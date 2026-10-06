'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Upload, Settings2, Eye, EyeOff } from 'lucide-react';
import { useProviderSettings } from '@/components/provider-context';
import {
  configurationError,
  defaultSettings,
  providerIds,
  providerNames,
  settingsSchema,
  type ProviderSettings,
  type ProviderId,
} from '@/lib/providers';
import { downloadFile } from '@/lib/report';

export default function SettingsPage() {
  const { hydrated } = useProviderSettings();
  return hydrated ? (
    <SettingsForm />
  ) : (
    <div className="document-page" role="status">
      Loading provider settings...
    </div>
  );
}
function SettingsForm() {
  const { settings, setSettings, clearSettings, persistenceError } = useProviderSettings();
  const [draft, setDraft] = useState<ProviderSettings>(settings),
    [message, setMessage] = useState(''),
    [error, setError] = useState(''),
    [visible, setVisible] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const profile = draft.profiles[draft.provider];
  function change(field: 'model' | 'apiKey' | 'endpoint', value: string) {
    setMessage('');
    setDraft({
      ...draft,
      profiles: { ...draft.profiles, [draft.provider]: { ...profile, [field]: value } },
    });
  }
  function apply() {
    const error = configurationError(draft);
    setError(error);
    if (!error) {
      setSettings(draft);
      setMessage(
        `${providerNames[draft.provider]} selected. Ready for image analysis; credentials have not been tested.`,
      );
    }
  }
  function save() {
    downloadFile(
      new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' }),
      'parallax-provider-config.json',
    );
    setMessage('Config downloaded. It contains your API keys in plain text.');
  }
  async function load(file: File) {
    setError('');
    setMessage('');
    try {
      if (file.size > 64 * 1024) throw new Error();
      const parsed = settingsSchema.parse(JSON.parse(await file.text()));
      setDraft(parsed);
      setVisible(false);
      setMessage('Config loaded. Review the provider and endpoint, then choose Use provider.');
    } catch {
      setError(
        'Invalid config file. Choose a Parallax provider config JSON file smaller than 64 KB.',
      );
    }
  }
  return (
    <div className="document-page settings-page">
      <Link href="/" className="text-button">
        <ArrowLeft size={14} />
        Back to investigation
      </Link>
      <h1>Provider settings</h1>
      <p className="document-lead">
        Choose a vision model and enter your own API key. No account is required by Parallax.
      </p>
      <p className="fine-print">
        Use provider saves all profiles, including keys, in this browser on this device. They are
        unencrypted in browser storage and are never written to the project folder or included in
        reports.
      </p>
      {persistenceError && (
        <p className="error-box" role="alert">
          {persistenceError}
        </p>
      )}
      <div className="panel settings-form">
        <label className="field">
          Provider
          <select
            value={draft.provider}
            onChange={(event) => {
              setDraft({ ...draft, provider: event.target.value as ProviderId });
              setVisible(false);
              setMessage('');
              setError('');
            }}
          >
            {providerIds.map((id) => (
              <option key={id} value={id}>
                {providerNames[id]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Model ID
          <input
            value={profile.model}
            onChange={(event) => change('model', event.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <p className="fine-print">
          Use a model with image input and JSON output support. Model availability depends on your
          account or local installation.
        </p>
        {(draft.provider === 'local' || draft.provider === 'compatible') && (
          <label className="field">
            API base URL
            <input
              type="url"
              value={profile.endpoint}
              onChange={(event) => change('endpoint', event.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </label>
        )}
        <div className="field">
          <label htmlFor="provider-api-key">
            API key{' '}
            {draft.provider === 'local' || draft.provider === 'compatible' ? '(optional)' : ''}
          </label>
          <div className="key-input">
            <input
              id="provider-api-key"
              type={visible ? 'text' : 'password'}
              value={profile.apiKey}
              onChange={(event) => change('apiKey', event.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder="Enter your API key"
            />
            <button
              type="button"
              className="icon-button"
              aria-label={visible ? 'Hide API key' : 'Show API key'}
              onClick={() => setVisible(!visible)}
            >
              {visible ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>
        <div className="notice">
          <Settings2 size={17} />
          <div>
            <strong>
              {draft.provider === 'local' || draft.provider === 'compatible'
                ? 'Direct browser connection'
                : 'Cloud provider connection'}
            </strong>
            <p>
              {draft.provider === 'local' || draft.provider === 'compatible'
                ? 'Your image and optional key go directly to the endpoint above. Allow this site in the server’s CORS settings. Local servers must use localhost or a loopback address. No request is made until you run analysis.'
                : `When you run analysis, your key and a resized image pass through the Parallax server to ${providerNames[draft.provider]}. The Parallax server does not save or log either. The provider’s data and billing policies apply.`}
            </p>
          </div>
        </div>
        {draft.provider === 'local' && (
          <p className="fine-print">
            Ollama example: pull llama3.2-vision, then allow this site using OLLAMA_ORIGINS on your
            Ollama server. LM Studio also works with its OpenAI-compatible server, CORS enabled, and
            a loaded vision model. Browser local-network permissions may apply.
          </p>
        )}
        <button className="button primary" onClick={apply}>
          Use provider
        </button>
        {error && (
          <p className="error-box" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="status-line" role="status">
            {message}
          </p>
        )}
      </div>
      <section className="panel settings-form">
        <h2>Configuration file</h2>
        <p>
          Export your provider profiles and keys as a backup or to use in another browser. The file
          is unencrypted and includes keys in plain text; keep it out of shared folders and Git.
        </p>
        <div className="report-actions">
          <button className="button secondary" onClick={save}>
            <Download size={16} />
            Save config file (includes keys)
          </button>
          <button className="button secondary" onClick={() => fileInput.current?.click()}>
            <Upload size={16} />
            Load config file
          </button>
          <button
            className="text-button"
            onClick={() => {
              setDraft(defaultSettings);
              clearSettings();
              setMessage(
                'Provider settings cleared from this browser. Downloaded files are unchanged.',
              );
              setError('');
            }}
          >
            Clear keys & settings
          </button>
        </div>
        <input
          ref={fileInput}
          className="sr-only"
          type="file"
          accept="application/json,.json"
          aria-label="Import provider config"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void load(file);
            event.target.value = '';
          }}
        />
        <p className="fine-print">
          Applied settings restore automatically when you reopen this site in the same browser.
          Clearing site data removes them. Downloading a config file is optional; keys are never
          included in investigation reports.
        </p>
      </section>
    </div>
  );
}
