const CACHE_NAME = 'by-hotline-v1'

const APP_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-phone.svg',
]

// Pre-cache all hotline audio clips and system tones when present
const AUDIO_ASSETS = [
  '/audio/dial_tone.mp3',
  '/audio/ringing.mp3',
  '/audio/hangup_click.mp3',
  '/audio/speed_1.mp3',
  '/audio/speed_2.mp3',
  '/audio/speed_3.mp3',
  '/audio/speed_4.mp3',
  '/audio/speed_5.mp3',
  '/audio/secret_birthday.mp3',
  '/audio/secret_anniversary.mp3',
  '/audio/secret_joke.mp3',
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
    caches.open(CACHE_NAME).then(async (cache) => {
      await safePrecache(cache, APP_SHELL_ASSETS)
      await safePrecache(cache, AUDIO_ASSETS)
    }),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
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
