'use client';
import type { ChatMessage } from '@/lib/conversation';
import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  type Dispatch,
  type SetStateAction,
  type ReactNode,
} from 'react';
import type { Analysis, Evidence, Point, ShadowResult } from '@/lib/schema';
import { readImage } from '@/lib/image';
import { demoAnalysis } from '@/lib/demo';
import {
  saveInvestigation,
  listInvestigations,
  readInvestigation,
  removeInvestigation,
  type HistoryEntry,
  type InvestigationRecord,
} from '@/lib/history';
type Investigation = {
  chat: ChatMessage[];
  setChat: Dispatch<SetStateAction<ChatMessage[]>>;
  sessionId: number;
  activeId: string;
  history: HistoryEntry[];
  historyError: string;
  saveStatus: string;
  openSaved: (id: string) => Promise<void>;
  deleteSaved: (id: string) => Promise<void>;
  evidence: Evidence | null;
  analysis: Analysis | null;
  setAnalysis: (value: Analysis | null) => void;
  analysisSource: 'demo' | 'ai' | null;
  setAnalysisSource: (value: 'demo' | 'ai' | null) => void;
  shadow: ShadowResult | null;
  setShadow: (value: ShadowResult | null) => void;
  points: Point[];
  setPoints: (value: Point[]) => void;
  notes: string;
  setNotes: (value: string) => void;
  searches: string[];
  setSearches: (value: string[]) => void;
  busy: boolean;
  error: string;
  setError: (value: string) => void;
  load: (file: File, demo?: string) => Promise<void>;
  clear: () => void;
};
const Context = createContext<Investigation | null>(null);
export function InvestigationProvider({ children }: { children: ReactNode }) {
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState(0);
  const [activeId, setActiveId] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([]),
    [historyError, setHistoryError] = useState(''),
    [saveStatus, setSaveStatus] = useState('');
  const [evidence, setEvidence] = useState<Evidence | null>(null),
    [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analysisSource, setAnalysisSource] = useState<'demo' | 'ai' | null>(null),
    [shadow, setShadow] = useState<ShadowResult | null>(null);
  const [points, setPoints] = useState<Point[]>([]),
    [notes, setNotes] = useState(''),
    [searches, setSearches] = useState<string[]>([]);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const sequence = useRef(0);
  const currentUrl = useRef('');
  const saveQueue = useRef<Promise<unknown>>(Promise.resolve());
  const deleted = useRef(new Set<string>());
  const savedChat = useRef(chat);
  function snapshot(): InvestigationRecord | null {
    if (!evidence || !activeId) return null;
    const { url: _url, ...stored } = evidence;
    void _url;
    return {
      id: activeId,
      updatedAt: Date.now(),
      evidence: stored,
      analysis,
      analysisSource,
      shadow,
      points,
      notes,
      searches,
      chat,
    };
  }
  function persist(record: InvestigationRecord | null) {
    if (!record || deleted.current.has(record.id)) return Promise.resolve();
    setSaveStatus('Saving locally');
    saveQueue.current = saveQueue.current
      .catch(() => {})
      .then(async () => {
        if (deleted.current.has(record.id)) return;
        await saveInvestigation(record);
        setHistory(await listInvestigations());
        setHistoryError('');
        setSaveStatus('Saved in this browser');
      })
      .catch(() => {
        setHistoryError(
          'Local save failed. Browser storage may be unavailable or full. Export your report before closing.',
        );
        setSaveStatus('Not saved');
      });
    return saveQueue.current;
  }
  useEffect(() => {
    let live = true;
    listInvestigations()
      .then((items) => {
        if (live) setHistory(items);
      })
      .catch(() => {
        if (live)
          setHistoryError(
            'Browser storage is unavailable. Analyses will only last for this session.',
          );
      });
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    if (!evidence || !activeId) return;
    const { url: _url, ...stored } = evidence;
    void _url;
    const record = {
      id: activeId,
      updatedAt: Date.now(),
      evidence: stored,
      analysis,
      analysisSource,
      shadow,
      points,
      notes,
      searches,
      chat,
    };
    // Coalesce typing and pointer changes; switching cases flushes immediately.
    const save = () => {
      saveQueue.current = saveQueue.current
        .catch(() => {})
        .then(async () => {
          if (deleted.current.has(record.id)) return;
          await saveInvestigation(record);
          setHistory(await listInvestigations());
          setSaveStatus('Saved in this browser');
          setHistoryError('');
        })
        .catch(() => {
          setHistoryError('Local save failed. Export your report before closing.');
          setSaveStatus('Not saved');
        });
    };
    const chatChanged = savedChat.current !== chat;
    savedChat.current = chat;
    const timer = chatChanged ? undefined : setTimeout(save, 350);
    if (chatChanged) save();
    window.addEventListener('pagehide', save);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('pagehide', save);
    };
  }, [evidence, activeId, analysis, analysisSource, shadow, points, notes, searches, chat]);
  async function openSaved(id: string) {
    const sequenceId = ++sequence.current;
    await persist(snapshot());
    if (sequenceId !== sequence.current) return;
    setBusy(true);
    try {
      const record = await readInvestigation(id);
      if (!record) throw new Error('This saved analysis no longer exists.');
      if (sequenceId !== sequence.current) return;
      if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
      const url = URL.createObjectURL(record.evidence.originalBlob);
      currentUrl.current = url;
      setActiveId(record.id);
      setEvidence({ ...record.evidence, url });
      setAnalysis(record.analysis);
      setAnalysisSource(record.analysisSource);
      setShadow(record.shadow);
      setPoints(record.points);
      setNotes(record.notes);
      setSearches(record.searches);
      setChat(record.chat ?? []);
      setSessionId((value) => value + 1);
      setError('');
    } catch {
      setHistoryError('Could not reopen this analysis. Its stored image may be unavailable.');
    } finally {
      if (sequenceId === sequence.current) setBusy(false);
    }
  }
  async function deleteSaved(id: string) {
    deleted.current.add(id);
    await saveQueue.current;
    try {
      await removeInvestigation(id);
      setHistory(await listInvestigations());
      if (id === activeId) clear(false);
    } catch {
      deleted.current.delete(id);
      setHistoryError('Could not delete this analysis. Try again.');
    }
  }
  function reset() {
    setAnalysis(null);
    setAnalysisSource(null);
    setShadow(null);
    setPoints([]);
    setNotes('');
    setSearches([]);
    setChat([]);
  }
  async function load(file: File, demo?: string) {
    void persist(snapshot());
    const id = ++sequence.current;
    setBusy(true);
    setError('');
    try {
      const next = await readImage(file, demo);
      if (id !== sequence.current) {
        URL.revokeObjectURL(next.url);
        return;
      }
      if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
      currentUrl.current = next.url;
      reset();
      setActiveId(crypto.randomUUID());
      setSaveStatus('Saving locally');
      setEvidence(next);
      if (demo) {
        setAnalysis(demoAnalysis[demo]);
        setAnalysisSource('demo');
      }
    } catch (error) {
      if (id === sequence.current)
        setError(error instanceof Error ? error.message : 'Unable to read this image.');
    } finally {
      if (id === sequence.current) setBusy(false);
    }
  }
  function clear(save = true) {
    if (save) void persist(snapshot());
    setActiveId('');
    setSaveStatus('');
    setSessionId((value) => value + 1);
    sequence.current++;
    if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
    currentUrl.current = '';
    setEvidence(null);
    reset();
    setBusy(false);
    setError('');
  }
  useEffect(
    () => () => {
      if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
    },
    [],
  );
  return (
    <Context.Provider
      value={{
        sessionId,
        activeId,
        history,
        historyError,
        saveStatus,
        openSaved,
        deleteSaved,
        evidence,
        analysis,
        setAnalysis,
        analysisSource,
        setAnalysisSource,
        shadow,
        setShadow,
        points,
        setPoints,
        notes,
        setNotes: (value) => {
          setNotes(value);
          setSaveStatus('Saving locally');
        },
        searches,
        chat,
        setSearches,
        setChat,
        busy,
        error,
        setError,
        load,
        clear,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useInvestigation() {
  const context = useContext(Context);
  if (!context) throw new Error('Analysis context missing');
  return context;
}
