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
      className="directory-dialog m-auto max-h-[88dvh] w-[calc(100%-2rem)] max-w-sm rounded-none border-0 bg-transparent p-0 text-[#1c140e]"
    >
      <div className="relative flex max-h-[88dvh] flex-col overflow-hidden rounded-none border-4 border-[#0a0a0c] bg-[#f4ebd2] shadow-[6px_6px_0_#000000]">
        {/* Top Pixel Card Header */}
        <div className="flex items-start justify-between gap-2 border-b-4 border-[#d92638] bg-[#e8dab8] px-3.5 pt-3 pb-2.5">
          <div>
            <p className="font-pixel text-[8px] tracking-wider text-[#b91c1c] uppercase">
              INDEX CARD #90-BY
            </p>
            <h2
              id="directory-card-title"
              className="font-pixel mt-1.5 text-[10px] leading-relaxed text-[#140d08] uppercase"
            >
              SANTAGATO STUDIOS — OFFICIAL EXTENSION LIST
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Studio Directory"
            className="flex min-h-[44px] min-w-[44px] shrink-0 cursor-pointer items-center justify-center rounded-none border-4 border-black bg-[#3a3a42] text-[#ffb000] shadow-[4px_4px_0_#000000] active:translate-y-[4px] active:shadow-none"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Pixel Index Card Body */}
        <div className="font-lcd overflow-y-auto px-4 py-3">
          <p className="font-pixel mb-2 text-[8px] tracking-wider text-[#5c4835] uppercase">
            SPEED DIAL EXTENSIONS (1 KEY)
          </p>

          <ul className="divide-y-2 divide-[#c8b691]">
            {ORDERED_SPEED_DIAL_KEYS.map((key) => {
              const entry = SPEED_DIALS[key]
              if (!entry) return null
              return (
                <li key={key} className="flex items-start gap-3 py-2">
                  <span className="font-pixel mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-none border-2 border-black bg-[#323238] text-[10px] text-white shadow-[2px_2px_0_#000000]">
                    {entry.code}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xl leading-none font-bold tracking-wide text-[#18100b] uppercase">
                      {entry.title}
                    </p>
                    <p className="mt-0.5 text-base leading-tight text-[#523f2f]">
                      {entry.description}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>

          {/* Classified / Unlisted Lines */}
          <div className="mt-4 border-t-4 border-dashed border-[#9e8964] pt-3">
            <p className="font-pixel mb-2.5 flex items-center gap-1.5 text-[8px] tracking-wider text-[#b91c1c] uppercase">
              <Lock aria-hidden="true" className="h-3 w-3 shrink-0" />
              <span>CLASSIFIED / UNLISTED LINES</span>
            </p>

            <ul className="space-y-2">
              {CLASSIFIED_HINTS.map((label, index) => (
                <li
                  key={index}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-none border-2 border-black bg-[#e8dab8] px-2.5 py-1.5 shadow-[3px_3px_0_#000000]"
                >
                  <span className="text-base leading-none font-bold tracking-wider text-[#3b2c20]">
                    {label}
                  </span>
                  <span className="font-pixel rounded-none border-2 border-[#b91c1c] bg-[#f4ebd2] px-1.5 py-1 text-[7px] text-[#b91c1c] uppercase">
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
