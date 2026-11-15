import { useEffect, useRef } from 'react'
import { Lock, X } from 'lucide-react'
import { SPEED_DIALS } from '../data/hotlineDirectory'

interface DirectoryModalProps {
  isOpen: boolean
  onClose: () => void
}

const ORDERED_SPEED_DIAL_KEYS = ['1', '2', '3', '4', '5', '0'] as const

const CLASSIFIED_HINTS = [
  'SPECIAL OCCASION • EXT. [????]',
  'STUDIO ARCHIVE • EXT. [????]',
  'VAULT TAPE • EXT. [????]',
] as const

export function DirectoryModal({ isOpen, onClose }: DirectoryModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen && !dialog.open) {
      dialog.showModal()
    } else if (!isOpen && dialog.open) {
      dialog.close()
    }
  }, [isOpen])

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) {
          onClose()
        }
      }}
      aria-labelledby="directory-card-title"
      className="directory-dialog m-auto max-h-[88dvh] w-[calc(100%-2rem)] max-w-sm rounded-xl border-0 bg-transparent p-0 text-stone-900 shadow-2xl"
    >
      <div className="index-card relative flex max-h-[88dvh] flex-col overflow-hidden rounded-xl border-2 border-[#cbb994] shadow-[0_24px_50px_rgba(0,0,0,0.85)]">
        {/* Vintage Red Index Card Top Margin */}
        <div className="flex items-start justify-between gap-2 border-b-2 border-rose-700/65 bg-[#efe3c4]/90 px-4 pt-3.5 pb-2.5">
          <div>
            <p className="font-mono text-[9px] font-bold tracking-[0.22em] text-rose-800 uppercase">
              INDEX CARD #90-BY
            </p>
            <h2
              id="directory-card-title"
              className="mt-0.5 font-mono text-sm leading-snug font-extrabold tracking-[0.06em] text-[#2a1d17] uppercase"
            >
              SANTAGATO STUDIOS — OFFICIAL EXTENSION LIST
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Studio Directory"
            className="flex min-h-[44px] min-w-[44px] shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[#b9a57e] bg-[#e6d7b4] text-[#3a2920] transition-transform active:scale-95"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Ruled Card Body */}
        <div className="overflow-y-auto px-4 py-3 font-mono">
          <p className="mb-2 text-[10px] font-bold tracking-[0.18em] text-[#6d5843] uppercase">
            SPEED DIAL EXTENSIONS (PRESS 1 KEY)
          </p>

          <ul className="divide-y divide-[#b8a581]/55">
            {ORDERED_SPEED_DIAL_KEYS.map((key) => {
              const entry = SPEED_DIALS[key]
              if (!entry) return null
              return (
                <li key={key} className="flex items-start gap-3 py-2">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded border border-[#8c7553] bg-[#e6d6b3] text-xs font-extrabold text-[#2a1d17]">
                    {entry.code}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs leading-tight font-bold tracking-wide text-[#241812]">
                      {entry.title}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-[#5b4736]">
                      {entry.description}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>

          {/* Classified / Unlisted Lines */}
          <div className="mt-4 border-t-2 border-dashed border-[#a68f68] pt-3">
            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-extrabold tracking-[0.18em] text-rose-900 uppercase">
              <Lock aria-hidden="true" className="h-3 w-3" />
              <span>CLASSIFIED / UNLISTED LINES</span>
            </p>

            <ul className="space-y-1.5">
              {CLASSIFIED_HINTS.map((label, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between gap-2 rounded border border-[#c0ab84] bg-[#e8dab8]/75 px-2.5 py-1.5"
                >
                  <span className="truncate text-[10px] font-bold tracking-wider text-[#544030]">
                    {label}
                  </span>
                  <span className="shrink-0 -rotate-2 rounded border border-rose-800/75 bg-rose-900/10 px-1.5 py-0.5 text-[9px] font-black tracking-widest text-rose-900 uppercase">
                    [REDACTED — TRY SPECIAL DATES]
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </dialog>
  )
}
