const CACHE_NAME = 'by-hotline-v2'
const AUDIO_CACHE_NAME = 'by-hotline-audio-v1'

const APP_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-phone.svg',
]

// Core system tones pre-cached if available; all /audio/*.mp3 clips are cached dynamically on first play
const CORE_TONE_ASSETS = [
  '/audio/dial_tone.mp3',
  '/audio/ringing.mp3',
  '/audio/hangup_click.mp3',
]

async function safePrecache(cache, urls) {
  await Promise.allSettled(
    urls.map(async (url) => {
      try {
        const response = await fetch(url, { cache: 'no-cache' })
        if (response.ok) {
          await cache.put(url, response)
        }
      } catch {
        // Ignore missing/offline assets during install
      }
    }),
  )
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => safePrecache(cache, APP_SHELL_ASSETS)),
      caches.open(AUDIO_CACHE_NAME).then((cache) => safePrecache(cache, CORE_TONE_ASSETS)),
    ]),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  const validCaches = new Set([CACHE_NAME, AUDIO_CACHE_NAME])
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !validCaches.has(key))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return

  // Runtime cache-first strategy for all /audio/*.mp3 files
  if (url.pathname.startsWith('/audio/') && url.pathname.endsWith('.mp3')) {
    event.respondWith(
      caches.open(AUDIO_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request)
        if (cached) return cached

        const response = await fetch(event.request)
        if (response.ok) {
          void cache.put(event.request, response.clone())
        }
        return response
      }),
    )
    return
  }

  // App shell & static assets: cache-first with network fallback
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached

      return fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              void cache.put(event.request, copy)
            })
          }
          return response
        })
        .catch(() => caches.match('/index.html')),
    }),
  )
})
