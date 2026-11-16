export interface HotlineEntry {
  code: string
  title: string
  description: string
  /** Single MP3 path or an array of MP3 paths for non-repeating shuffle playback. */
  file: string | string[]
  hint?: string
  isSecret?: boolean
  isRandom?: boolean
}

export const SPEED_DIALS: Record<string, HotlineEntry> = {
  '1': {
    code: '1',
    title: 'JOE: UNHINGED RANT',
    description: 'Classic Joe spiral',
    file: ['/audio/speed_1.mp3', '/audio/speed_1_2.mp3'],
  },
  '2': {
    code: '2',
    title: 'FRANK: BILLION DOLLAR IDEA',
    description: "Frankie's latest business pitch",
    file: ['/audio/speed_2.mp3', '/audio/speed_2_2.mp3'],
  },
  '3': {
    code: '3',
    title: 'FAKE SPONSOR READ',
    description: 'Off-the-rails ad break',
    file: ['/audio/speed_3.mp3', '/audio/speed_3_2.mp3'],
  },
  '4': {
    code: '4',
    title: 'STUDIO VOICEMAIL',
    description: 'Listener advice hotline',
    file: ['/audio/speed_4.mp3', '/audio/speed_4_2.mp3'],
  },
  '5': {
    code: '5',
    title: 'FRANK MISPRONOUNCING WORDS',
    description: 'English is optional',
    file: ['/audio/speed_5.mp3', '/audio/speed_5_2.mp3'],
  },
  '6': {
    code: '6',
    title: 'DANNY & BEHIND THE MIC',
    description: 'Producer booth interjections',
    file: ['/audio/speed_6.mp3', '/audio/speed_6_2.mp3'],
  },
  '7': {
    code: '7',
    title: 'JOE & FRANK LAUGH ATTACK',
    description: 'Contagious studio meltdowns',
    file: ['/audio/speed_7.mp3', '/audio/speed_7_2.mp3'],
  },
  '8': {
    code: '8',
    title: 'HOT TAKES & DEBATES',
    description: 'Pointless arguments at 110%',
    file: ['/audio/speed_8.mp3', '/audio/speed_8_2.mp3'],
  },
  '9': {
    code: '9',
    title: 'BASEMENT LORE & STORIES',
    description: 'Astoria & childhood flashbacks',
    file: ['/audio/speed_9.mp3', '/audio/speed_9_2.mp3'],
  },
  '*': {
    code: '*',
    title: 'OUT OF CONTEXT CLIPS',
    description: 'Zero context, maximum chaos',
    file: ['/audio/speed_star.mp3', '/audio/speed_star_2.mp3'],
  },
  '0': {
    code: '0',
    title: 'STUDIO OPERATOR',
    description: 'Random clip from all lines',
    file: 'RANDOM',
    isRandom: true,
  },
}

export const SECRET_CODES: Record<string, HotlineEntry> = {
  '2012': {
    code: '2012',
    title: 'VIP BIRTHDAY LINE (2 TAPES)',
    description: 'Happy Birthday',
    hint: 'The day the birthday queen was born (DDMM)',
    file: ['audio/birthday_1.mp3', 'audio/birthday_2.mp3'],
    isSecret: true,
  },
  '1711': {
    code: '1711',
    title: 'ANNIVERSARY LINE (2 TAPES)',
    description: 'Happy Anniversary',
    hint: 'Our special day on the calendar (DDMM)',
    file: ['audio/anniversary_1.mp3', 'audio/anniversary_2.mp3'],
    isSecret: true,
  },
  '2006': {
    code: '2006',
    title: 'MY BIRTHDAY?!',
    description: 'Nice try...',
    hint: "Someone else's birthday (DDMM)",
    file: 'audio/my_birthday.mp3',
    isSecret: true,
  },
  '2512': {
    code: '2512',
    title: 'NORTH POLE HOTLINE',
    description: 'Merry Christmas',
    hint: "Santa's favorite day (DDMM)",
    file: 'audio/christmas_1.mp3',
    isSecret: true,
  },
  '1402': {
    code: '1402',
    title: "VALENTINE'S LINE",
    description: 'Be my Valentine',
    hint: "Roses, chocolates, Cupid's day (DDMM)",
    file: 'audio/valentines_1.mp3',
    isSecret: true,
  },
  '0101': {
    code: '0101',
    title: "NEW YEAR'S LINE",
    description: 'Countdown message',
    hint: 'Fresh start after midnight countdown (DDMM)',
    file: 'audio/new_year_1.mp3',
    isSecret: true,
  },
  '6969': {
    code: '6969',
    title: 'CLASSIFIED LINE 6969',
    description: 'Nice.',
    hint: 'Nice. Twice.',
    file: 'audio/secret_6969.mp3',
    isSecret: true,
  },
  '420': {
    code: '420',
    title: 'STUDIO VAULT 420',
    description: 'Classified tape',
    hint: 'Blaze it (3 digits)',
    file: 'audio/secret_420.mp3',
    isSecret: true,
  },
  '742926': {
    code: '742926',
    title: 'DIRECT LINE: SHAYAN',
    description: 'Personal message',
    hint: "Spell your boyfriend's name on the keypad",
    file: 'audio/shayan.mp3',
    isSecret: true,
  },
  '5376462': {
    code: '5376462',
    title: 'VIP LINE: KERMINA',
    description: 'For Kermina only',
    hint: 'Spell your own name on the keypad',
    file: 'audio/kermina.mp3',
    isSecret: true,
  },
  '7399': {
    code: '7399',
    title: 'HOTLINE: SEXY',
    description: 'Private message',
    hint: '4-letter compliment on T9 keys',
    file: 'audio/sexy.mp3',
    isSecret: true,
  },
  '773889': {
    code: '773889',
    title: 'HOTLINE: PRETTY',
    description: 'Private message',
    hint: '6-letter compliment on T9 keys',
    file: 'audio/pretty.mp3',
    isSecret: true,
  },
  '1738': {
    code: '1738',
    title: 'REMZ BOYZ 1738',
    description: 'Secret code',
    hint: "Fetty Wap's favorite number",
    file: 'audio/secret_1738.mp3',
    isSecret: true,
  },
  '6789998212': {
    code: '6789998212',
    title: 'KISS ME THRU THE PHONE',
    description: 'Baby you know that I miss you',
    hint: "Soulja Boy's famous 10-digit phone number",
    file: 'audio/kiss_me_thru_the_phone.mp3',
    isSecret: true,
  },
  '5683': {
    code: '5683',
    title: 'LOVE LINE',
    description: 'I love you',
    hint: 'Spell L-O-V-E on the keypad',
    file: 'audio/love.mp3',
    isSecret: true,
  },
  '911': {
    code: '911',
    title: 'STUDIO EMERGENCY',
    description: '911 dispatch',
    hint: 'Dial in case of emergency',
    file: 'audio/secret_911.mp3',
    isSecret: true,
  },
}

const shuffleQueues = new Map<string, string[]>()
const lastPlayedTrack = new Map<string, string>()

function shuffleArray<T>(items: readonly T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/**
 * Pick the next track for an entry using a non-repeating shuffle queue
 * so every clip in the pool plays before any clip repeats.
 */
function pickFromShuffleQueue(queueKey: string, pool: string[]): string {
  if (pool.length === 0) return ''
  if (pool.length === 1) return pool[0]

  let queue = shuffleQueues.get(queueKey)
  if (!queue || queue.length === 0) {
    queue = shuffleArray(pool)
    const prev = lastPlayedTrack.get(queueKey)
    if (prev && queue[queue.length - 1] === prev && queue.length > 1) {
      ;[queue[0], queue[queue.length - 1]] = [
        queue[queue.length - 1],
        queue[0],
      ]
    }
  }

  const nextTrack = queue.pop()!
  shuffleQueues.set(queueKey, queue)
  lastPlayedTrack.set(queueKey, nextTrack)
  return nextTrack
}

function getAllSpeedDialTracks(): Array<{ file: string; source: HotlineEntry }> {
  const tracks: Array<{ file: string; source: HotlineEntry }> = []
  for (const entry of Object.values(SPEED_DIALS)) {
    if (entry.isRandom) continue
    const files = Array.isArray(entry.file) ? entry.file : [entry.file]
    for (const file of files) {
      tracks.push({ file, source: entry })
    }
  }
  return tracks
}

/** Resolve a HotlineEntry to a concrete entry + single MP3 file path. */
export function resolveHotlineTrack(entry: HotlineEntry): {
  entry: HotlineEntry
  file: string
} {
  if (entry.isRandom) {
    const allTracks = getAllSpeedDialTracks()
    const pickedFile = pickFromShuffleQueue(
      '__operator__',
      allTracks.map((t) => t.file),
    )
    const match = allTracks.find((t) => t.file === pickedFile)
    return {
      entry: {
        ...entry,
        description: match ? match.source.title : entry.description,
      },
      file: pickedFile,
    }
  }

  const pool = Array.isArray(entry.file) ? entry.file : [entry.file]
  const file = pickFromShuffleQueue(entry.code, pool)
  return { entry, file }
}
