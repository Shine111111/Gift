import { ensureAudioContext } from './dtmf'

const RINGING_URL = '/audio/ringing.mp3'
const HANGUP_CLICK_URL = '/audio/hangup_click.mp3'

let ringAudio: HTMLAudioElement | null = null
let ringOscillators: OscillatorNode[] = []
let ringGain: GainNode | null = null
let isRingingActive = false

let trackAudio: HTMLAudioElement | null = null
let trackFallbackTimer: number | null = null

/** Start ringing (/audio/ringing.mp3 with 440Hz+480Hz US ringback fallback). */
export function startRingback(): void {
  stopRingback()
  if (typeof window === 'undefined') return
  isRingingActive = true

  if (!ringAudio) {
    ringAudio = new Audio(RINGING_URL)
    ringAudio.loop = true
    ringAudio.volume = 0.35
  }

  const audio = ringAudio
  audio.currentTime = 0

  const triggerFallback = () => {
    if (!isRingingActive || ringOscillators.length > 0) return
    audio.pause()
    const ctx = ensureAudioContext()
    if (!ctx) return

    try {
      const now = ctx.currentTime
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.linearRampToValueAtTime(0.055, now + 0.03)
      gain.connect(ctx.destination)

      const oscs = [440, 480].map((freq) => {
        const osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now)
        osc.connect(gain)
        osc.start(now)
        return osc
      })

      ringGain = gain
      ringOscillators = oscs
    } catch {
      // Ignore Web Audio errors
    }
  }

  audio.onerror = triggerFallback
  const p = audio.play()
  if (p && typeof p.catch === 'function') {
    p.catch(triggerFallback)
  }
}

/** Stop any active ringback audio or synthesized oscillators. */
export function stopRingback(): void {
  isRingingActive = false

  if (ringAudio) {
    ringAudio.onerror = null
    ringAudio.pause()
    ringAudio.currentTime = 0
  }

  if (ringOscillators.length > 0) {
    for (const osc of ringOscillators) {
      try {
        osc.stop()
        osc.disconnect()
      } catch {
        // Already stopped
      }
    }
    ringOscillators = []
  }

  if (ringGain) {
    try {
      ringGain.disconnect()
    } catch {
      // Already disconnected
    }
    ringGain = null
  }
}

function playFallbackChime(): void {
  const ctx = ensureAudioContext()
  if (!ctx) return

  try {
    const now = ctx.currentTime
    const notes = [523.25, 659.25, 783.99] // C5 -> E5 -> G5
    notes.forEach((freq, idx) => {
      const start = now + idx * 0.11
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, start)
      gain.gain.setValueAtTime(0.001, start)
      gain.gain.exponentialRampToValueAtTime(0.07, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 0.3)
    })
  } catch {
    // Ignore Web Audio errors
  }
}

export interface PlayTrackOptions {
  file: string
  onFallback: (filename: string) => void
  onEnded: () => void
}

/** Play a mapped hotline MP3 track, or a pleasant chime + fallback timer if missing. */
export function playHotlineTrack({
  file,
  onFallback,
  onEnded,
}: PlayTrackOptions): void {
  stopHotlineTrack()
  if (typeof window === 'undefined') return

  const audio = new Audio(file)
  audio.volume = 0.85
  trackAudio = audio

  let settled = false

  const triggerFallback = () => {
    if (settled || trackAudio !== audio) return
    settled = true
    audio.onerror = null
    audio.onended = null
    audio.pause()

    const filename = file.split('/').pop() || file
    playFallbackChime()
    onFallback(filename)

    trackFallbackTimer = window.setTimeout(() => {
      trackFallbackTimer = null
      onEnded()
    }, 3600)
  }

  audio.onended = () => {
    if (settled || trackAudio !== audio) return
    settled = true
    onEnded()
  }

  audio.onerror = triggerFallback

  const p = audio.play()
  if (p && typeof p.catch === 'function') {
    p.catch(triggerFallback)
  }
}

/** Stop any playing hotline MP3 track or fallback timer. */
export function stopHotlineTrack(): void {
  if (trackFallbackTimer !== null) {
    window.clearTimeout(trackFallbackTimer)
    trackFallbackTimer = null
  }

  if (trackAudio) {
    trackAudio.onerror = null
    trackAudio.onended = null
    trackAudio.pause()
    trackAudio.currentTime = 0
    trackAudio = null
  }
}

/** Stop all ringing and track audio immediately. */
export function stopAllCallAudio(): void {
  stopRingback()
  stopHotlineTrack()
}

/** Play /audio/hangup_click.mp3 with a quick Web Audio mechanical click fallback. */
export function playHangupClick(): void {
  if (typeof window === 'undefined') return

  const playWebClick = () => {
    const ctx = ensureAudioContext()
    if (!ctx) return
    try {
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'square'
      osc.frequency.setValueAtTime(190, now)
      osc.frequency.exponentialRampToValueAtTime(65, now + 0.045)
      gain.gain.setValueAtTime(0.09, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.055)
    } catch {
      // Ignore Web Audio errors
    }
  }

  try {
    const audio = new Audio(HANGUP_CLICK_URL)
    audio.volume = 0.65
    audio.onerror = playWebClick
    const p = audio.play()
    if (p && typeof p.catch === 'function') {
      p.catch(playWebClick)
    }
  } catch {
    playWebClick()
  }
}
