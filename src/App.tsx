import { useCallback, useEffect, useRef, useState } from 'react'
import { BookOpen, Delete, Phone, PhoneOff, Usb } from 'lucide-react'
import { DirectoryModal } from './components/DirectoryModal'
import {
  type HotlineEntry,
  SECRET_CODES,
  SPEED_DIALS,
  resolveHotlineEntry,
} from './data/hotlineDirectory'
import { useHandsetDetector } from './hooks/useHandsetDetector'
import {
  playHangupClick,
  playHotlineTrack,
  startRingback,
  stopAllCallAudio,
  stopRingback,
} from './utils/callAudio'
import { startDialTone, stopDialTone } from './utils/dialTone'
import { playControlTone, playDtmfTone } from './utils/dtmf'

interface KeypadKey {
  digit: string
  letters?: string
  accentRed?: boolean
}

const KEYPAD_KEYS: KeypadKey[] = [
  { digit: '1' },
  { digit: '2', letters: 'ABC' },
  { digit: '3', letters: 'DEF' },
  { digit: '4', letters: 'GHI' },
  { digit: '5', letters: 'JKL' },
  { digit: '6', letters: 'MNO' },
  { digit: '7', letters: 'PQRS' },
  { digit: '8', letters: 'TUV' },
  { digit: '9', letters: 'WXYZ' },
  { digit: '*', accentRed: true },
  { digit: '0', letters: 'OPER' },
  { digit: '#', accentRed: true },
]

const MAX_DIGITS = 16
const SPEED_DIAL_DELAY_MS = 1200
const RING_DURATION_MS = 1500
const WAVEFORM_HEIGHTS = [45, 85, 60, 100, 70, 92, 50, 80, 65, 95, 55, 75]

type CallPhase = 'idle' | 'ringing' | 'active'

export function App() {
  const {
    isConnected,
    bypassMode,
    isConnecting,
    error,
    connectReceiver,
    enableBypassMode,
  } = useHandsetDetector()

  const [dialed, setDialed] = useState('')
  const [callPhase, setCallPhase] = useState<CallPhase>('idle')
  const [activeEntry, setActiveEntry] = useState<HotlineEntry | null>(null)
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null)
  const [isDirectoryOpen, setIsDirectoryOpen] = useState(false)

  const speedDialTimerRef = useRef<number | null>(null)
  const ringTimerRef = useRef<number | null>(null)
  const callSessionRef = useRef(0)
  const isConnectedRef = useRef(isConnected)
  isConnectedRef.current = isConnected

  const clearPendingTimers = useCallback(() => {
    if (speedDialTimerRef.current !== null) {
      window.clearTimeout(speedDialTimerRef.current)
      speedDialTimerRef.current = null
    }
    if (ringTimerRef.current !== null) {
      window.clearTimeout(ringTimerRef.current)
      ringTimerRef.current = null
    }
  }, [])

  const finishCallAndReset = useCallback(
    (playClick: boolean) => {
      callSessionRef.current += 1
      clearPendingTimers()
      stopAllCallAudio()

      if (playClick) {
        playHangupClick()
      }

      setCallPhase('idle')
      setActiveEntry(null)
      setFallbackNotice(null)
      setDialed('')

      if (isConnectedRef.current) {
        startDialTone()
      } else {
        stopDialTone()
      }
    },
    [clearPendingTimers],
  )

  const startCallFlow = useCallback(
    (rawEntry: HotlineEntry) => {
      clearPendingTimers()
      stopDialTone()

      const entry = resolveHotlineEntry(rawEntry)
      const sessionId = ++callSessionRef.current

      setActiveEntry(entry)
      setFallbackNotice(null)
      setCallPhase('ringing')
      startRingback()

      ringTimerRef.current = window.setTimeout(() => {
        ringTimerRef.current = null
        if (callSessionRef.current !== sessionId || !isConnectedRef.current) {
          return
        }

        stopRingback()
        setCallPhase('active')

        playHotlineTrack({
          file: entry.file,
          onFallback: (filename) => {
            if (callSessionRef.current !== sessionId) return
            setFallbackNotice(`AUDIO FILE READY: ${filename}`)
          },
          onEnded: () => {
            if (callSessionRef.current !== sessionId) return
            finishCallAndReset(true)
          },
        })
      }, RING_DURATION_MS)
    },
    [clearPendingTimers, finishCallAndReset],
  )

  // Manage dial tone loop and clean shutdown when connection changes
  useEffect(() => {
    if (isConnected) {
      startDialTone()
    } else {
      const hadActiveSession =
        callPhase !== 'idle' || speedDialTimerRef.current !== null
      callSessionRef.current += 1
      clearPendingTimers()
      stopDialTone()
      stopAllCallAudio()
      if (hadActiveSession) {
        playHangupClick()
      }
      setCallPhase('idle')
      setActiveEntry(null)
      setFallbackNotice(null)
      setDialed('')
    }

    return () => {
      clearPendingTimers()
      stopDialTone()
      stopAllCallAudio()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected])

  const handleDigitPress = useCallback(
    (digit: string) => {
      if (!isConnected || callPhase !== 'idle') return

      stopDialTone()
      playDtmfTone(digit)

      if (speedDialTimerRef.current !== null) {
        window.clearTimeout(speedDialTimerRef.current)
        speedDialTimerRef.current = null
      }

      const nextDialed =
        dialed.length >= MAX_DIGITS ? dialed : `${dialed}${digit}`
      setDialed(nextDialed)

      // 1. Multi-digit secret codes trigger immediately and override single-digit timer
      const secretMatch = SECRET_CODES[nextDialed]
      if (secretMatch) {
        startCallFlow(secretMatch)
        return
      }

      // 2. Single-digit speed dials trigger 1.2s after pressing if no second key follows
      if (nextDialed.length === 1 && SPEED_DIALS[nextDialed]) {
        const entry = SPEED_DIALS[nextDialed]
        speedDialTimerRef.current = window.setTimeout(() => {
          speedDialTimerRef.current = null
          startCallFlow(entry)
        }, SPEED_DIAL_DELAY_MS)
      }
    },
    [callPhase, dialed, isConnected, startCallFlow],
  )

  const handleClear = useCallback(() => {
    if (!isConnected || callPhase !== 'idle') return
    if (speedDialTimerRef.current !== null) {
      window.clearTimeout(speedDialTimerRef.current)
      speedDialTimerRef.current = null
    }
    playControlTone('clear')
    setDialed('')
  }, [callPhase, isConnected])

  const handleHangUp = useCallback(() => {
    if (!isConnected) return
    finishCallAndReset(true)
  }, [finishCallAndReset, isConnected])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        isDirectoryOpen ||
        !isConnected ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      ) {
        return
      }
      if (/^[0-9*#]$/.test(event.key)) {
        event.preventDefault()
        handleDigitPress(event.key)
      } else if (event.key === 'Backspace') {
        if (callPhase !== 'idle') return
        event.preventDefault()
        if (speedDialTimerRef.current !== null) {
          window.clearTimeout(speedDialTimerRef.current)
          speedDialTimerRef.current = null
        }
        playControlTone('clear')
        setDialed((prev) => prev.slice(0, -1))
      } else if (event.key === 'Escape') {
        event.preventDefault()
        handleHangUp()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [callPhase, handleDigitPress, handleHangUp, isConnected, isDirectoryOpen])

  const isSecretActive = callPhase !== 'idle' && Boolean(activeEntry?.isSecret)

  const statusText = !isConnected
    ? 'NO RECEIVER'
    : callPhase === 'ringing'
      ? 'CONNECTING...'
      : callPhase === 'active'
        ? activeEntry?.isSecret
          ? '★ VIP SECRET LINE ★'
          : 'ON AIR • CONNECTED'
        : dialed
          ? 'LINE 1 • DIALING'
          : bypassMode
            ? 'LINE 1 • READY (TEST)'
            : 'LINE 1 • READY'

  return (
    <div className="brick-wall safe-viewport relative flex w-full flex-col items-center justify-between overflow-hidden select-none">
      {/* Subtle overhead studio tungsten cone */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 h-56 w-80 -translate-x-1/2 rounded-full bg-amber-500/15 blur-3xl"
      />

      {/* Glowing Red/Pink Neon Sign Header */}
      <header className="relative z-10 w-full max-w-sm shrink-0 pt-1">
        <div className="neon-frame rounded-xl border-2 border-rose-500/75 bg-[#160b0c]/85 px-3 py-2 text-center backdrop-blur-[2px]">
          <h1
            className="neon-sign-text font-black tracking-[0.12em] uppercase"
            style={{
              fontSize: 'clamp(1.05rem, 4.4vw, 1.35rem)',
              lineHeight: 1.15,
            }}
          >
            THE BASEMENT YARD HOTLINE
          </h1>
          <p className="neon-sign-sub mt-0.5 text-[10px] font-semibold tracking-[0.28em] uppercase">
            STUDIO LINE • NYC
          </p>
        </div>
      </header>

      {/* Retro 90s Brushed Dark-Metal Telephone Console */}
      <main className="relative z-10 flex min-h-0 w-full max-w-sm flex-1 flex-col justify-center py-2.5">
        <section
          aria-label="Hotline Telephone Keypad Console"
          className={`brushed-metal relative flex h-full max-h-[580px] flex-col justify-between overflow-hidden rounded-[1.75rem] border p-3.5 transition-shadow duration-300 sm:p-4 ${
            isSecretActive ? 'secret-console-glow' : 'border-white/10'
          }`}
        >
          {/* Interactive Console Content (inert while disconnected overlay is active) */}
          <div
            inert={!isConnected ? true : undefined}
            className="flex min-h-0 flex-1 flex-col justify-between"
          >
            {/* Top Housing Hardware Screws, Earpiece Vent & Directory Tab */}
            <div className="mb-1.5 flex shrink-0 items-center justify-between px-0.5">
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 rounded-full border border-black/80 bg-zinc-700 shadow-inner"
                />
                <div aria-hidden="true" className="flex items-center gap-1">
                  <span className="h-1 w-5 rounded-full bg-black/70 shadow-[0_1px_0_rgba(255,255,255,0.08)]" />
                  <span className="h-1 w-8 rounded-full bg-black/70 shadow-[0_1px_0_rgba(255,255,255,0.08)]" />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsDirectoryOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={isDirectoryOpen}
                className="flex min-h-[32px] cursor-pointer items-center gap-1.5 rounded-md border border-[#cbb994]/45 bg-[#e6d7b4]/15 px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.14em] text-[#f4ebd2] uppercase shadow-sm transition-transform hover:bg-[#e6d7b4]/25 active:scale-95"
              >
                <BookOpen aria-hidden="true" className="h-3 w-3 text-amber-300" />
                <span>DIRECTORY</span>
              </button>
            </div>

            {/* Retro Digital LCD/LED Caller-ID Display Bar */}
            <div
              className={`led-display mb-2.5 shrink-0 rounded-xl border px-3.5 py-2.5 ${
                isSecretActive ? 'border-amber-400/50' : 'border-stone-800'
              }`}
            >
              <div className="flex items-center justify-between font-mono text-[10px] tracking-widest text-amber-500/80 uppercase">
                <span className="flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className={`inline-block h-1.5 w-1.5 rounded-full ${
                      !isConnected
                        ? 'bg-stone-600'
                        : callPhase === 'active'
                          ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
                          : callPhase === 'ringing' || dialed
                            ? 'bg-red-500 shadow-[0_0_6px_#ef4444]'
                            : 'bg-amber-400 shadow-[0_0_6px_#fbbf24]'
                    }`}
                  />
                  CALLER ID
                </span>
                <span
                  aria-live="polite"
                  className={
                    isSecretActive ? 'font-bold text-amber-300' : undefined
                  }
                >
                  {statusText}
                </span>
              </div>

              <div
                role="status"
                aria-label="Caller ID display"
                className="led-amber-glow mt-1 flex min-h-[2.25rem] flex-col justify-center overflow-hidden font-mono"
              >
                {callPhase === 'ringing' && activeEntry ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-bold tracking-[0.12em]">
                      {activeEntry.title}
                    </span>
                    <span className="shrink-0 text-xs tracking-widest text-rose-400 motion-safe:animate-pulse">
                      RINGING...
                    </span>
                  </div>
                ) : callPhase === 'active' && activeEntry ? (
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-bold tracking-[0.12em] text-amber-300">
                        {activeEntry.title}
                      </div>
                      <div className="truncate text-[10px] tracking-[0.08em] text-rose-300/90">
                        {fallbackNotice || activeEntry.description}
                      </div>
                    </div>

                    {/* Animated CSS Audio Waveform Visualizer */}
                    <div
                      aria-hidden="true"
                      className="flex h-6 shrink-0 items-end gap-[3px] pr-0.5"
                    >
                      {WAVEFORM_HEIGHTS.map((height, idx) => (
                        <span
                          key={idx}
                          className={`waveform-bar w-[3px] rounded-full ${
                            isSecretActive
                              ? 'bg-gradient-to-t from-rose-500 to-amber-300'
                              : 'bg-amber-400'
                          }`}
                          style={{
                            height: `${height}%`,
                            animationDelay: `${(idx % 5) * 0.11}s`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ) : dialed ? (
                  <div className="flex items-center justify-end text-2xl font-bold tracking-[0.14em]">
                    <span className="truncate">{dialed}</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-end text-base tracking-[0.2em] text-amber-500/40">
                    <span>ENTER NUMBER_</span>
                  </div>
                )}
              </div>
            </div>

            {/* Control Bar: CLEAR & Red HANG UP Receiver Button */}
            <div className="mb-3 grid shrink-0 grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleClear}
                disabled={callPhase !== 'idle'}
                className="retro-key flex min-h-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold tracking-[0.16em] text-stone-100 uppercase transition-transform duration-75 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Delete aria-hidden="true" className="h-4 w-4 text-amber-400" />
                <span>CLEAR</span>
              </button>

              <button
                type="button"
                onClick={handleHangUp}
                className="hangup-key flex min-h-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-red-400/30 px-3 py-2 text-xs font-bold tracking-[0.16em] text-white uppercase transition-transform duration-75 active:scale-95"
              >
                <PhoneOff aria-hidden="true" className="h-4 w-4" />
                <span>HANG UP</span>
              </button>
            </div>

            {/* Recessed Keypad Well: Tactile 90s Push-Button Grid (1-9, *, 0, #) */}
            <div className="grid min-h-0 flex-1 grid-cols-3 grid-rows-4 gap-2.5 rounded-2xl border border-black/70 bg-[#121011]/90 p-2.5 shadow-[inset_0_3px_10px_rgba(0,0,0,0.85)]">
              {KEYPAD_KEYS.map(({ digit, letters, accentRed }) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleDigitPress(digit)}
                  aria-label={letters ? `${digit} ${letters}` : digit}
                  className="retro-key flex min-h-[44px] cursor-pointer flex-col items-center justify-center rounded-xl border border-white/10 px-2 py-1 transition-transform duration-75 active:scale-95"
                >
                  <span
                    className={`text-2xl leading-none font-extrabold tracking-tight ${
                      accentRed ? 'text-rose-400' : 'text-stone-50'
                    }`}
                  >
                    {digit}
                  </span>
                  {letters && (
                    <span className="mt-0.5 text-[9px] font-bold tracking-[0.18em] text-rose-400/95">
                      {letters}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Bottom Housing Rivets */}
            <div className="mt-2 flex shrink-0 items-center justify-between px-1">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 rounded-full border border-black/80 bg-zinc-700 shadow-inner"
              />
              <span className="font-mono text-[9px] tracking-[0.24em] text-stone-500 uppercase">
                MODEL TBY-90S
              </span>
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 rounded-full border border-black/80 bg-zinc-700 shadow-inner"
              />
            </div>
          </div>

          {/* Disconnected State Overlay */}
          {!isConnected && (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="receiver-connect-heading"
              className="absolute inset-0 z-20 flex flex-col items-center justify-between rounded-[1.75rem] bg-[#0e0909]/88 px-6 py-6 text-center backdrop-blur-sm"
            >
              <div className="flex flex-1 flex-col items-center justify-center">
                {/* Pulsing USB-C / Red Receiver Icon */}
                <div
                  aria-hidden="true"
                  className="mb-5 flex items-center gap-3 rounded-2xl border border-rose-500/40 bg-rose-950/40 px-4 py-3 shadow-[0_0_25px_rgba(244,63,94,0.28)] motion-safe:animate-pulse"
                >
                  <Usb className="h-7 w-7 text-amber-400" />
                  <span className="h-0.5 w-4 rounded-full bg-rose-400/70" />
                  <Phone className="h-7 w-7 text-rose-500" />
                </div>

                <h2
                  id="receiver-connect-heading"
                  className="max-w-[26ch] text-base font-extrabold tracking-[0.12em] text-stone-100 uppercase sm:text-lg"
                >
                  PLUG IN YOUR RED RECEIVER TO CONNECT TO THE STUDIO
                </h2>

                <p className="mt-2 max-w-[30ch] text-xs leading-relaxed text-stone-400">
                  Connect your USB-C handset, then tap below if the line
                  doesn&apos;t activate automatically.
                </p>

                {error && (
                  <p
                    role="alert"
                    className="mt-3 max-w-[30ch] rounded-lg border border-amber-500/30 bg-amber-950/50 px-3 py-1.5 text-[11px] text-amber-300"
                  >
                    {error}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => void connectReceiver()}
                  disabled={isConnecting}
                  className="hangup-key mt-5 flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-400/35 px-6 py-3 text-xs font-extrabold tracking-[0.18em] text-white uppercase transition-transform duration-75 active:scale-95 disabled:cursor-wait disabled:opacity-70"
                >
                  <Phone aria-hidden="true" className="h-4 w-4" />
                  <span>{isConnecting ? 'ACTIVATING...' : 'ACTIVATE LINE'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => void enableBypassMode()}
                className="min-h-[44px] cursor-pointer px-3 py-2 text-[11px] font-medium tracking-wide text-stone-400 underline decoration-stone-600 underline-offset-4 transition-colors hover:text-stone-200"
              >
                Test Without Handset
              </button>
            </div>
          )}
        </section>
      </main>

      <DirectoryModal
        isOpen={isDirectoryOpen}
        onClose={() => setIsDirectoryOpen(false)}
      />
    </div>
  )
}

export default App
