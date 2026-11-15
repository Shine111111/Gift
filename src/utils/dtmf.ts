const DTMF_FREQUENCIES: Record<string, [number, number]> = {
  '1': [697, 1209],
  '2': [697, 1336],
  '3': [697, 1477],
  '4': [770, 1209],
  '5': [770, 1336],
  '6': [770, 1477],
  '7': [852, 1209],
  '8': [852, 1336],
  '9': [852, 1477],
  '*': [941, 1209],
  '0': [941, 1336],
  '#': [941, 1477],
}

let audioCtx: AudioContext | null = null

export function ensureAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  if (!Ctx) return null
  if (!audioCtx) {
    audioCtx = new Ctx()
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume()
  }
  return audioCtx
}

/** Resume the shared Web Audio AudioContext from a user gesture. */
export async function resumeAudioContext(): Promise<void> {
  const ctx = ensureAudioContext()
  if (!ctx) return
  if (ctx.state === 'suspended') {
    await ctx.resume()
  }
}

/** Play a short 90s DTMF dual-tone beep for a keypad digit. */
export function playDtmfTone(digit: string): void {
  const freqs = DTMF_FREQUENCIES[digit]
  const ctx = ensureAudioContext()
  if (!freqs || !ctx) return

  try {
    const now = ctx.currentTime
    const duration = 0.11

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.001, now)
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration)
    gain.connect(ctx.destination)

    for (const freq of freqs) {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now)
      osc.connect(gain)
      osc.start(now)
      osc.stop(now + duration + 0.01)
    }
  } catch {
    // Ignore audio errors when autoplay/audio hardware is unavailable
  }
}

/** Play a brief low click/disconnect tone for Clear or Hang Up. */
export function playControlTone(type: 'clear' | 'hangup'): void {
  const ctx = ensureAudioContext()
  if (!ctx) return

  try {
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(type === 'hangup' ? 320 : 520, now)
    osc.frequency.exponentialRampToValueAtTime(
      type === 'hangup' ? 140 : 280,
      now + 0.09,
    )

    gain.gain.setValueAtTime(0.07, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.11)
  } catch {
    // Ignore audio errors
  }
}
