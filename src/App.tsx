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
const WAVEFORM_HEIGHTS = [35, 80, 55, 100, 65, 90, 45, 75, 60, 95]

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
      {/* Flat 2D Pixel Marquee Header */}
      <header className="relative z-10 w-full max-w-sm shrink-0 pt-0.5">
        <div className="pixel-marquee rounded-none px-3 py-2 text-center">
          <h1
            className="font-pixel pixel-marquee-title uppercase"
            style={{
              fontSize: 'clamp(0.68rem, 3.1vw, 0.88rem)',
              lineHeight: 1.45,
            }}
          >
            THE BASEMENT YARD HOTLINE
          </h1>
          <p className="font-lcd mt-0.5 text-sm tracking-[0.22em] text-[#ff4d6d] uppercase">
            STUDIO LINE • NYC
          </p>
        </div>
      </header>

      {/* 16-Bit Pixel Telephone Console */}
      <main className="relative z-10 flex min-h-0 w-full max-w-sm flex-1 flex-col justify-center py-2">
        <section
          aria-label="Hotline Telephone Keypad Console"
          className={`pixel-console relative flex h-full max-h-[580px] flex-col justify-between overflow-hidden rounded-none p-3 sm:p-3.5 ${
            isSecretActive ? 'pixel-console-secret' : ''
          }`}
        >
          {/* Interactive Console Content (inert while disconnected overlay is active) */}
          <div
            inert={!isConnected ? true : undefined}
            className="flex min-h-0 flex-1 flex-col justify-between"
          >
            {/* Top Housing Pixel Screws, Speaker Vent & Directory Button */}
            <div className="mb-2 flex shrink-0 items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-1 w-1 bg-[#0a0a0c] shadow-[1px_1px_0_#52525b]"
                />
                <div aria-hidden="true" className="flex items-center gap-1">
                  <span className="h-1 w-3 bg-[#0a0a0c]" />
                  <span className="h-1 w-5 bg-[#0a0a0c]" />
                  <span className="h-1 w-3 bg-[#0a0a0c]" />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsDirectoryOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={isDirectoryOpen}
                className="pixel-btn-small font-pixel flex min-h-[32px] cursor-pointer items-center gap-1.5 rounded-none px-2.5 py-1 text-[8px] text-[#f4ebd2] uppercase"
              >
                <BookOpen
                  aria-hidden="true"
                  className="h-3 w-3 text-[#ffb000]"
                />
                <span>DIRECTORY</span>
              </button>
            </div>

            {/* 2D Pixel LCD Caller-ID Display Bar */}
            <div className="pixel-lcd mb-2.5 shrink-0 rounded-none px-3 py-2">
              <div className="font-lcd flex items-center justify-between text-base leading-none tracking-wider text-[#ffb000] uppercase">
                <span className="flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className={`inline-block h-2 w-2 rounded-none ${
                      !isConnected
                        ? 'bg-[#3f3f46]'
                        : callPhase === 'active'
                          ? 'bg-[#ff2a55]'
                          : callPhase === 'ringing' || dialed
                            ? 'bg-[#d92638]'
                            : 'bg-[#ffb000]'
                    }`}
                  />
                  CALLER ID
                </span>
                <span
                  aria-live="polite"
                  className={
                    isSecretActive ? 'font-bold text-[#ff4d6d]' : undefined
                  }
                >
                  {statusText}
                </span>
              </div>

              <div
                role="status"
                aria-label="Caller ID display"
                className="font-lcd mt-1 flex min-h-[2.25rem] flex-col justify-center overflow-hidden text-[#ffb000]"
              >
                {callPhase === 'ringing' && activeEntry ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xl leading-none tracking-wider uppercase">
                      {activeEntry.title}
                    </span>
                    <span className="font-pixel shrink-0 text-[8px] text-[#ff4d6d] motion-safe:animate-pulse">
                      RINGING...
                    </span>
                  </div>
                ) : callPhase === 'active' && activeEntry ? (
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-lg leading-none tracking-wider text-[#ffb000] uppercase">
                        {activeEntry.title}
                      </div>
                      <div className="truncate text-sm leading-tight tracking-wide text-[#ff8fa3]">
                        {fallbackNotice || activeEntry.description}
                      </div>
                    </div>

                    {/* Blocky Square Pixel Audio Waveform Visualizer */}
                    <div
                      aria-hidden="true"
                      className="flex h-6 shrink-0 items-end gap-[3px] pr-0.5"
                    >
                      {WAVEFORM_HEIGHTS.map((height, idx) => (
                        <span
                          key={idx}
                          className={`waveform-bar w-[4px] rounded-none ${
                            isSecretActive ? 'bg-[#ff2a55]' : 'bg-[#ffb000]'
                          }`}
                          style={{
                            height: `${height}%`,
                            animationDelay: `${(idx % 5) * 0.1}s`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ) : dialed ? (
                  <div className="flex items-center justify-end text-3xl leading-none tracking-[0.16em]">
                    <span className="truncate">{dialed}</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-end text-xl leading-none tracking-[0.18em] text-[#ffb000]/45">
                    <span>ENTER NUMBER_</span>
                  </div>
                )}
              </div>
            </div>

            {/* Control Bar: CLEAR & Red HANG UP Pixel Buttons */}
            <div className="mb-3 grid shrink-0 grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleClear}
                disabled={callPhase !== 'idle'}
                className="pixel-btn-clear font-pixel flex min-h-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-none px-2 py-2 text-[9px] uppercase active:translate-y-[4px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Delete aria-hidden="true" className="h-4 w-4 shrink-0" />
                <span>CLEAR</span>
              </button>

              <button
                type="button"
                onClick={handleHangUp}
                className="pixel-btn-hangup font-pixel flex min-h-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-none px-2 py-2 text-[9px] uppercase active:translate-y-[4px] active:shadow-none"
              >
                <PhoneOff aria-hidden="true" className="h-4 w-4 shrink-0" />
                <span>HANG UP</span>
              </button>
            </div>

            {/* Recessed Keypad Well: Tactile 2D Pixel Push-Button Grid */}
            <div className="grid min-h-0 flex-1 grid-cols-3 grid-rows-4 gap-2.5 rounded-none border-4 border-[#0a0a0c] bg-[#141417] p-2.5 shadow-[inset_4px_4px_0_#09090b]">
              {KEYPAD_KEYS.map(({ digit, letters, accentRed }) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleDigitPress(digit)}
                  aria-label={letters ? `${digit} ${letters}` : digit}
                  className="pixel-btn-key flex min-h-[44px] cursor-pointer flex-col items-center justify-center rounded-none px-1 py-1 active:translate-y-[4px] active:shadow-none"
                >
                  <span
                    className={`font-pixel text-base leading-none ${
                      accentRed ? 'text-[#ff2a55]' : 'text-white'
                    }`}
                  >
                    {digit}
                  </span>
                  {letters && (
                    <span className="font-pixel mt-1.5 text-[7px] leading-none text-[#ff4d6d]">
                      {letters}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Bottom Housing Pixel Screws & Model Stamp */}
            <div className="mt-2 flex shrink-0 items-center justify-between px-0.5">
              <span
                aria-hidden="true"
                className="h-1 w-1 bg-[#0a0a0c] shadow-[1px_1px_0_#52525b]"
              />
              <span className="font-lcd text-sm leading-none tracking-[0.2em] text-[#71717a] uppercase">
                MODEL TBY-90S
              </span>
              <span
                aria-hidden="true"
                className="h-1 w-1 bg-[#0a0a0c] shadow-[1px_1px_0_#52525b]"
              />
            </div>
          </div>

          {/* Flat 2D Pixel Disconnected Overlay */}
          {!isConnected && (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="receiver-connect-heading"
              className="absolute inset-0 z-20 flex flex-col items-center justify-between rounded-none border-4 border-[#ff2a55] bg-[#141417]/95 px-5 py-6 text-center"
            >
              <div className="flex flex-1 flex-col items-center justify-center">
                {/* Pixel USB-C / Red Receiver Badge */}
                <div
                  aria-hidden="true"
                  className="mb-5 flex items-center gap-3 rounded-none border-4 border-black bg-[#252529] px-4 py-3 shadow-[4px_4px_0_#000000] motion-safe:animate-pulse"
                >
                  <Usb className="h-6 w-6 text-[#ffb000]" />
                  <span className="h-1 w-4 bg-[#ff2a55]" />
                  <Phone className="h-6 w-6 text-[#d92638]" />
                </div>

                <h2
                  id="receiver-connect-heading"
                  className="font-pixel max-w-[24ch] text-xs leading-relaxed text-white uppercase"
                >
                  PLUG IN YOUR RED RECEIVER TO CONNECT TO THE STUDIO
                </h2>

                <p className="font-lcd mt-3 max-w-[30ch] text-lg leading-tight text-stone-300">
                  Connect your USB-C handset, then tap below if the line
                  doesn&apos;t activate automatically.
                </p>

                {error && (
                  <p
                    role="alert"
                    className="font-lcd mt-3 max-w-[30ch] rounded-none border-2 border-[#ffb000] bg-[#181c10] px-3 py-1.5 text-base leading-tight text-[#ffb000]"
                  >
                    {error}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => void connectReceiver()}
                  disabled={isConnecting}
                  className="pixel-btn-hangup font-pixel mt-5 flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-none px-5 py-3 text-[10px] uppercase active:translate-y-[4px] active:shadow-none disabled:cursor-wait disabled:opacity-70"
                >
                  <Phone aria-hidden="true" className="h-4 w-4 shrink-0" />
                  <span>{isConnecting ? 'ACTIVATING...' : 'ACTIVATE LINE'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => void enableBypassMode()}
                className="font-lcd min-h-[44px] cursor-pointer px-3 py-2 text-lg tracking-wide text-stone-400 underline decoration-stone-500 underline-offset-4 hover:text-white"
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
