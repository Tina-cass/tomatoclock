import { ArrowRight, Check, Coffee, Leaf, Pause, Play, RotateCcw, Timer } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";

type Mode = "focus" | "break";

const DURATIONS: Record<Mode, number> = {
  focus: 25 * 60,
  break: 5 * 60,
};

const STORAGE_KEY = "tomato-focus-timer";

type StoredState = {
  mode: Mode;
  remaining: number;
  isRunning: boolean;
  savedAt: number;
};

function loadState(): StoredState {
  const fallback: StoredState = {
    mode: "focus",
    remaining: DURATIONS.focus,
    isRunning: false,
    savedAt: Date.now(),
  };

  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;

    const saved = JSON.parse(raw) as Partial<StoredState>;
    const mode: Mode = saved.mode === "break" ? "break" : "focus";
    const max = DURATIONS[mode];
    const elapsed = saved.isRunning && saved.savedAt ? Math.floor((Date.now() - saved.savedAt) / 1000) : 0;
    const remaining = Math.min(max, Math.max(0, Number(saved.remaining) - elapsed));

    return {
      mode,
      remaining: Number.isFinite(remaining) ? remaining : max,
      isRunning: Boolean(saved.isRunning) && remaining > 0,
      savedAt: Date.now(),
    };
  } catch {
    return fallback;
  }
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainder = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

function App() {
  const initial = loadState();
  const [mode, setMode] = useState<Mode>(initial.mode);
  const [remaining, setRemaining] = useState(initial.remaining);
  const [isRunning, setIsRunning] = useState(initial.isRunning);
  const [notice, setNotice] = useState("");

  const duration = DURATIONS[mode];
  const progress = Math.min(100, Math.max(0, ((duration - remaining) / duration) * 100));
  const isBreak = mode === "break";
  const ringStyle = {
    "--progress": `${progress}%`,
  } as CSSProperties;

  useEffect(() => {
    if (!isRunning) return;

    const interval = window.setInterval(() => {
      setRemaining((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isRunning]);

  useEffect(() => {
    if (!isRunning || remaining !== 0) return;

    const nextMode: Mode = mode === "focus" ? "break" : "focus";
    setIsRunning(false);
    setMode(nextMode);
    setRemaining(DURATIONS[nextMode]);
    setNotice(mode === "focus" ? "专注完成，进入休息。" : "休息结束，准备开始下一轮。");
  }, [isRunning, mode, remaining]);

  useEffect(() => {
    const nextState: StoredState = {
      mode,
      remaining,
      isRunning,
      savedAt: Date.now(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  }, [isRunning, mode, remaining]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 5000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const selectMode = (nextMode: Mode) => {
    setMode(nextMode);
    setRemaining(DURATIONS[nextMode]);
    setIsRunning(false);
    setNotice("");
  };

  const toggleTimer = () => {
    setIsRunning((running) => !running);
    setNotice("");
  };

  const resetTimer = () => {
    setIsRunning(false);
    setRemaining(DURATIONS[mode]);
    setNotice("");
  };

  return (
    <div className={`app-shell${isBreak ? " break-mode" : ""}`}>
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            <Timer size={19} strokeWidth={2.4} />
          </span>
          <div>
            <strong>番茄专注</strong>
            <span>Tomato Focus</span>
          </div>
        </div>
        <div className="topbar-status">
          <span className="status-dot" aria-hidden="true" />
          本地计时
        </div>
      </header>

      <main className="page-main">
        <section className="timer-layout" aria-label="番茄钟">
          <div className="intro-copy">
            <p className="eyebrow"><span aria-hidden="true" />专注工作台</p>
            <h1>番茄专注</h1>
            <p className="intro-description">把注意力留给眼前这一件事。</p>
            <div className="mode-summary" aria-label="计时模式说明">
              <div className="summary-item">
                <span className="summary-icon focus-icon"><Timer size={16} /></span>
                <span><small>专注</small><strong>25 分钟</strong></span>
              </div>
              <ArrowRight className="summary-arrow" size={16} aria-hidden="true" />
              <div className="summary-item">
                <span className="summary-icon break-icon"><Leaf size={16} /></span>
                <span><small>休息</small><strong>5 分钟</strong></span>
              </div>
            </div>
          </div>

          <div className="timer-surface">
            <div className="mode-switch" role="tablist" aria-label="选择计时模式">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "focus"}
                className={mode === "focus" ? "active" : ""}
                onClick={() => selectMode("focus")}
              >
                <Timer size={16} /> 专注
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "break"}
                className={mode === "break" ? "active" : ""}
                onClick={() => selectMode("break")}
              >
                <Coffee size={16} /> 休息
              </button>
            </div>

            <div
              className="timer-ring"
              style={ringStyle}
              role="timer"
              aria-label={`${isBreak ? "休息" : "专注"}剩余 ${formatTime(remaining)}`}
            >
              <div className="timer-ring-inner">
                <span>{isBreak ? "休息中" : "专注中"}</span>
                <strong>{formatTime(remaining)}</strong>
                <em>{isRunning ? "进行中" : "准备开始"}</em>
              </div>
            </div>

            <div className="timer-actions">
              <Button className="timer-action" onClick={toggleTimer}>
                {isRunning ? <Pause size={18} /> : <Play size={18} />}
                {isRunning ? "暂停" : "开始"}
              </Button>
              <Button variant="outline" className="reset-action" onClick={resetTimer}>
                <RotateCcw size={16} />
                重置
              </Button>
            </div>

            <div className={`timer-notice${notice ? " visible" : ""}`} aria-live="polite">
              {notice && <><Check size={15} /><span>{notice}</span></>}
            </div>
          </div>
        </section>

        <section className="info-strip" aria-label="当前计时信息">
          <div className="info-item">
            <Timer size={18} />
            <span><small>当前模式</small><strong>{isBreak ? "休息" : "专注"}</strong></span>
          </div>
          <div className="info-item">
            <Leaf size={18} />
            <span><small>下一阶段</small><strong>{isBreak ? "专注 25 分钟" : "休息 5 分钟"}</strong></span>
          </div>
          <div className="info-caption">状态自动保存在当前浏览器</div>
        </section>
      </main>
    </div>
  );
}

export default App;
