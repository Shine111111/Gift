export interface HotlineEntry {
  code: string
  title: string
  description: string
  file: string
  isSecret?: boolean
  isRandom?: boolean
}

export const SPEED_DIALS: Record<string, HotlineEntry> = {
  '1': {
    code: '1',
    title: 'JOE: UNHINGED RANT',
    description: 'Classic Joe spiral',
    file: '/audio/speed_1.mp3',
  },
  '2': {
    code: '2',
    title: 'FRANK: BILLION DOLLAR IDEA',
    description: "Frankie's latest business pitch",
    file: '/audio/speed_2.mp3',
  },
  '3': {
    code: '3',
    title: 'FAKE SPONSOR READ',
    description: 'Off-the-rails ad break',
    file: '/audio/speed_3.mp3',
  },
  '4': {
    code: '4',
    title: 'STUDIO VOICEMAIL',
    description: 'Listener advice hotline',
    file: '/audio/speed_4.mp3',
  },
  '5': {
    code: '5',
    title: 'FRANK MISPRONOUNCING WORDS',
    description: 'English is optional',
    file: '/audio/speed_5.mp3',
  },
  '0': {
    code: '0',
    title: 'STUDIO OPERATOR (RANDOM BIT)',
    description: 'Random studio clip',
    file: 'RANDOM',
    isRandom: true,
  },
}

export const SECRET_CODES: Record<string, HotlineEntry> = {
  // TODO: Replace with GF's MMDD birthday
  '0615': {
    code: '0615',
    title: 'VIP BIRTHDAY LINE',
    description: 'Special studio message',
    file: '/audio/secret_birthday.mp3',
    isSecret: true,
  },
  // TODO: Replace with anniversary MMDD
  '1024': {
    code: '1024',
    title: 'PRIVATE LINE',
    description: 'For your ears only',
    file: '/audio/secret_anniversary.mp3',
    isSecret: true,
  },
  '#420': {
    code: '#420',
    title: 'CLASSIFIED STUDIO TAPE',
    description: 'Basement vault tape',
    file: '/audio/secret_joke.mp3',
    isSecret: true,
  },
}

const RANDOM_POOL_CODES = ['1', '2', '3', '4', '5'] as const

/** Resolve a HotlineEntry, picking a random clip 1-5 when isRandom is true. */
export function resolveHotlineEntry(entry: HotlineEntry): HotlineEntry {
  if (!entry.isRandom) return entry
  const randomCode =
    RANDOM_POOL_CODES[Math.floor(Math.random() * RANDOM_POOL_CODES.length)]
  const picked = SPEED_DIALS[randomCode]
  return {
    ...picked,
    title: `${picked.title}`,
  }
}
