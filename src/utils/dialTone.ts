import { ensureAudioContext } from './dtmf'

const DIAL_TONE_URL = '/audio/dial_tone.mp3'
const DIAL_TONE_VOLUME = 0.25
const US_DIAL_TONE_FREQS = [350, 440] as const

let dialAudio: HTMLAudioElement | null = null
let activeOscillators: OscillatorNode[] = []
let activeGain: GainNode | null = null
let isDialTonePlaying = false

function startWebAudioFallback(): void {
  if (!isDialTonePlaying || activeOscillators.length > 0) return

  const ctx = ensureAudioContext()
  if (!ctx) return

  try {
    const now = ctx.currentTime
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.linearRampToValueAtTime(0.045, now + 0.03)
    gain.connect(ctx.destination)

    const oscs = US_DIAL_TONE_FREQS.map((freq) => {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now)
      osc.connect(gain)
      osc.start(now)
      return osc
    })

    activeGain = gain
    activeOscillators = oscs
  } catch {
    // Ignore Web Audio errors if context cannot start
  }
}

function stopWebAudioFallback(): void {
  if (activeOscillators.length === 0 && !activeGain) return

  const oscs = activeOscillators
  const gain = activeGain
  activeOscillators = []
  activeGain = null

  try {
    const ctx = ensureAudioContext()
    if (ctx && gain) {
      const now = ctx.currentTime
      gain.gain.cancelScheduledValues(now)
      gain.gain.setValueAtTime(gain.gain.value, now)
      gain.gain.linearRampToValueAtTime(0.0001, now + 0.025)
    }
  } catch {
    // Ignore ramp errors
  }

  window.setTimeout(() => {
    for (const osc of oscs) {
      try {
        osc.stop()
        osc.disconnect()
      } catch {
        // Already stopped
      }
    }
    try {
      gain?.disconnect()
    } catch {
      // Already disconnected
    }
  }, 30)
}

/**
 * Play /audio/dial_tone.mp3 on a seamless low-volume loop (0.25 volume),
 * falling back to a synthesized 350Hz + 440Hz US dial tone if unavailable.
 */
export function startDialTone(): void {
  if (isDialTonePlaying || typeof window === 'undefined') return
  isDialTonePlaying = true

  if (!dialAudio) {
    dialAudio = new Audio(DIAL_TONE_URL)
    dialAudio.loop = true
    dialAudio.volume = DIAL_TONE_VOLUME
    dialAudio.preload = 'auto'
  }

  const audio = dialAudio
  audio.currentTime = 0
  audio.volume = DIAL_TONE_VOLUME

  const triggerFallback = () => {
    if (!isDialTonePlaying) return
    audio.pause()
    startWebAudioFallback()
  }

  audio.onerror = triggerFallback

  const playPromise = audio.play()
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(triggerFallback)
  }
}

/** Stop the dial tone immediately (both MP3 loop and Web Audio fallback). */
export function stopDialTone(): void {
  if (!isDialTonePlaying) return
  isDialTonePlaying = false

  if (dialAudio) {
    dialAudio.onerror = null
    dialAudio.pause()
    dialAudio.currentTime = 0
  }

  stopWebAudioFallback()
}
