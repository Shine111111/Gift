import { useCallback, useEffect, useState } from 'react'
import { resumeAudioContext } from '../utils/dtmf'

const EXTERNAL_DEVICE_PATTERN =
  /\b(usb|wired|headset|headphone|earphone|handset|external|dongle|type-c|usb-c)\b/i
const BUILTIN_OR_BT_PATTERN =
  /\b(bluetooth|speakerphone|earpiece|built-in|internal|telephony)\b/i

function isExternalHandsetDevice(device: MediaDeviceInfo): boolean {
  if (device.kind !== 'audioinput' && device.kind !== 'audiooutput') {
    return false
  }

  const label = device.label.trim()
  if (!label) return false

  // Explicit USB/wired headset match (even if a combo label mentions other terms)
  if (/\b(usb|usb-c|type-c|wired)\b/i.test(label)) {
    return true
  }

  // Wired/external headset/handset keywords, excluding Bluetooth or built-in
  if (
    EXTERNAL_DEVICE_PATTERN.test(label) &&
    !BUILTIN_OR_BT_PATTERN.test(label)
  ) {
    return true
  }

  return false
}

export interface HandsetDetectorState {
  isHandsetConnected: boolean
  isConnected: boolean
  bypassMode: boolean
  isConnecting: boolean
  error: string | null
  connectReceiver: () => Promise<void>
  enableBypassMode: () => Promise<void>
}

export function useHandsetDetector(): HandsetDetectorState {
  const [isHandsetConnected, setIsHandsetConnected] = useState(false)
  const [bypassMode, setBypassMode] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkDevices = useCallback(async (): Promise<boolean> => {
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.enumerateDevices
    ) {
      setIsHandsetConnected(false)
      return false
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const detected = devices.some(isExternalHandsetDevice)
      setIsHandsetConnected(detected)
      return detected
    } catch {
      setIsHandsetConnected(false)
      return false
    }
  }, [])

  useEffect(() => {
    void checkDevices()

    const mediaDevices = navigator?.mediaDevices
    if (!mediaDevices) return

    const handleDeviceChange = () => {
      void checkDevices()
    }

    mediaDevices.ondevicechange = handleDeviceChange
    return () => {
      if (mediaDevices.ondevicechange === handleDeviceChange) {
        mediaDevices.ondevicechange = null
      }
    }
  }, [checkDevices])

  const connectReceiver = useCallback(async () => {
    setIsConnecting(true)
    setError(null)

    try {
      await resumeAudioContext()

      if (navigator?.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        })
        for (const track of stream.getTracks()) {
          track.stop()
        }
      }

      const detected = await checkDevices()
      if (!detected) {
        setError('No USB-C receiver detected yet. Plug in your handset or use Test Mode.')
      }
    } catch {
      setError('Audio permission was blocked. Allow microphone access or use Test Mode.')
    } finally {
      setIsConnecting(false)
    }
  }, [checkDevices])

  const enableBypassMode = useCallback(async () => {
    setError(null)
    try {
      await resumeAudioContext()
    } catch {
      // Ignore if AudioContext cannot resume
    }
    setBypassMode(true)
  }, [])

  return {
    isHandsetConnected,
    isConnected: isHandsetConnected || bypassMode,
    bypassMode,
    isConnecting,
    error,
    connectReceiver,
    enableBypassMode,
  }
}
