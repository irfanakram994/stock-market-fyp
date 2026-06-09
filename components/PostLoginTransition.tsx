'use client';

import {
  Activity,
  Brain,
  CandlestickChart,
  Check,
  Network,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { usePathname } from 'next/navigation';
import type { ResolvedRole } from '@/lib/roleRouting';

type PostLoginTransitionRole = ResolvedRole;

type TransitionRequest = {
  role: PostLoginTransitionRole;
  destination: string;
  displayName?: string | null;
};

type TransitionState = TransitionRequest & {
  active: boolean;
  exiting: boolean;
  ready: boolean;
  runId: number;
  startedAt: number;
};

type PostLoginTransitionContextValue = {
  startTransition: (request: TransitionRequest) => void;
  markDestinationReady: (destination?: string) => void;
};

const MIN_TRANSITION_DURATION_MS = 700;
const EXIT_TRANSITION_DURATION_MS = 420;
const MAX_TRANSITION_DURATION_MS = 3000;

const loadingMessages = [
  'Preparing your AI workspace...',
  'Synchronizing market intelligence...',
  'Initializing forecasting agents...',
  'Connecting live market streams...',
  'Loading personalized insights...',
];

const statusBadges = [
  'Authentication Verified',
  'Profile Synced',
  'AI Workspace Ready',
];

const roleConfig: Record<
  PostLoginTransitionRole,
  {
    title: string;
    eyebrow: string;
    caption: string;
    accent: string;
    icon: typeof Brain;
  }
> = {
  user: {
    title: 'Welcome to User Dashboard',
    eyebrow: 'Personal AI Trading Workspace',
    caption: 'Your AI Trading Workspace is Ready',
    accent: '#38bdf8',
    icon: Brain,
  },
  admin: {
    title: 'Welcome to Admin Dashboard',
    eyebrow: 'Operational Intelligence Online',
    caption: 'Your AI Trading Workspace is Ready',
    accent: '#34d399',
    icon: ShieldCheck,
  },
  super_admin: {
    title: 'Welcome to Super Admin Dashboard',
    eyebrow: 'Enterprise Command Center',
    caption: 'Your AI Trading Workspace is Ready',
    accent: '#e879f9',
    icon: Network,
  },
};

const PostLoginTransitionContext = createContext<PostLoginTransitionContextValue | undefined>(
  undefined
);

function PostLoginTransitionOverlay({ state }: { state: TransitionState }) {
  const config = roleConfig[state.role];
  const Icon = config.icon;
  const [messageIndex, setMessageIndex] = useState(0);
  const displayName = state.displayName?.trim();
  const title = config.title;

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((current) => (current + 1) % loadingMessages.length);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      key={state.runId}
      className={`post-login-transition ${state.exiting ? 'post-login-transition--exiting' : ''}`}
      style={{ ['--entry-accent' as string]: config.accent }}
      aria-live="polite"
      aria-label={config.title}
    >
      <div className="post-login-transition__grid" />
      <div className="post-login-transition__scanline" />
      <div className="post-login-transition__ambient" aria-hidden="true">
        {Array.from({ length: 18 }).map((_, index) => (
          <span key={index} />
        ))}
      </div>

      <div className="post-login-transition__shell">
        <div className="post-login-transition__portal" aria-hidden="true">
          <div className="post-login-transition__ring post-login-transition__ring--outer" />
          <div className="post-login-transition__ring post-login-transition__ring--middle" />
          <div className="post-login-transition__ring post-login-transition__ring--inner" />
          <div className="post-login-transition__orbit">
            <span />
            <span />
            <span />
          </div>
          <div className="post-login-transition__core">
            <Icon className="h-9 w-9" />
          </div>
        </div>

        <div className="post-login-transition__content">
          <div className="post-login-transition__brand">
            <span className="post-login-transition__brand-mark">TF</span>
            <span>TradeFlux</span>
          </div>

          <p className="post-login-transition__eyebrow">{config.eyebrow}</p>
          {displayName && (
            <div className="post-login-transition__identity">
              <span>Identity confirmed</span>
              <strong>{displayName}</strong>
            </div>
          )}
          <h1>{title}</h1>
          <p className="post-login-transition__caption">{config.caption}</p>
          <p key={messageIndex} className="post-login-transition__loading-copy">
            {loadingMessages[messageIndex]}
          </p>

          <div className="post-login-transition__status" aria-hidden="true">
            {statusBadges.map((badge) => (
              <span key={badge}>
                <Check className="h-3.5 w-3.5" />
                {badge}
              </span>
            ))}
          </div>

          <div className="post-login-transition__progress" aria-hidden="true">
            <span />
          </div>
        </div>

        <div className="post-login-transition__market" aria-hidden="true">
          <div className="post-login-transition__market-head">
            <TrendingUp className="h-4 w-4" />
            <span>Forecast Stream</span>
          </div>
          <div className="post-login-transition__chart">
            {[36, 54, 42, 68, 58, 82, 76].map((height, index) => (
              <span key={index} style={{ height: `${height}%` }} />
            ))}
          </div>
          <div className="post-login-transition__metrics">
            <span>
              <Activity className="h-3.5 w-3.5" />
              Agents
            </span>
            <span>
              <CandlestickChart className="h-3.5 w-3.5" />
              Signals
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PostLoginTransitionProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [transitionState, setTransitionState] = useState<TransitionState | null>(null);
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const runIdRef = useRef(0);

  const clearCurrentTimers = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current = [];
  }, []);

  const schedule = useCallback((callback: () => void, delay: number) => {
    const timer = setTimeout(() => {
      timersRef.current = timersRef.current.filter((item) => item !== timer);
      callback();
    }, delay);
    timersRef.current.push(timer);
  }, []);

  const finishTransition = useCallback(
    (runId: number) => {
      setTransitionState((current) => {
        if (!current || current.runId !== runId) return current;
        return { ...current, exiting: true };
      });

      schedule(() => {
        setTransitionState((current) => (current?.runId === runId ? null : current));
      }, EXIT_TRANSITION_DURATION_MS);
    },
    [schedule]
  );

  const releaseWhenReady = useCallback(
    (state: TransitionState) => {
      const remainingMinimum = Math.max(
        MIN_TRANSITION_DURATION_MS - (Date.now() - state.startedAt),
        0
      );
      schedule(() => finishTransition(state.runId), remainingMinimum);
    },
    [finishTransition, schedule]
  );

  const startTransition = useCallback(
    (request: TransitionRequest) => {
      clearCurrentTimers();
      runIdRef.current += 1;
      const runId = runIdRef.current;
      const startedAt = Date.now();

      setTransitionState({
        ...request,
        active: true,
        exiting: false,
        ready: false,
        runId,
        startedAt,
      });

      schedule(() => {
        setTransitionState((current) => {
          if (!current || current.runId !== runId || current.ready || current.exiting) {
            return current;
          }

          const fallbackState = { ...current, ready: true };
          releaseWhenReady(fallbackState);
          return fallbackState;
        });
      }, MAX_TRANSITION_DURATION_MS);
    },
    [clearCurrentTimers, releaseWhenReady, schedule]
  );

  const markDestinationReady = useCallback(
    (destination?: string) => {
      setTransitionState((current) => {
        if (!current || current.exiting || current.ready) return current;
        if (destination && current.destination !== destination) return current;
        if (current.destination !== pathname && destination !== current.destination) return current;

        const readyState = { ...current, ready: true };
        releaseWhenReady(readyState);
        return readyState;
      });
    },
    [pathname, releaseWhenReady]
  );

  useEffect(() => clearCurrentTimers, [clearCurrentTimers]);

  const value = useMemo(
    () => ({ startTransition, markDestinationReady }),
    [markDestinationReady, startTransition]
  );

  return (
    <PostLoginTransitionContext.Provider value={value}>
      {children}
      {transitionState?.active && <PostLoginTransitionOverlay state={transitionState} />}
    </PostLoginTransitionContext.Provider>
  );
}

export function usePostLoginTransition() {
  const context = useContext(PostLoginTransitionContext);
  if (!context) {
    throw new Error('usePostLoginTransition must be used within PostLoginTransitionProvider');
  }
  return context;
}

export function usePostLoginDestinationReady(destination?: string) {
  const { markDestinationReady } = usePostLoginTransition();

  useEffect(() => {
    markDestinationReady(destination);
  }, [destination, markDestinationReady]);
}
