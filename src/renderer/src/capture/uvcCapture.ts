/**
 * Captures the ATEM's multiview output over USB. Lives in the renderer, not
 * main, for the same reason as MicWizard's usbAudio.ts: Electron's renderer
 * is a full Chromium page, so this is `navigator.mediaDevices.getUserMedia`
 * with `video` constraints (the switcher enumerates as a plain UVC webcam) —
 * no native addon needed.
 *
 * Requires the ATEM's USB output to be set to Multiview (not the default
 * Program) from the switcher's own control panel — this module has no way
 * to detect or change that setting, it just captures whatever the UVC
 * device is currently outputting.
 */

export async function listVideoInputs(): Promise<MediaDeviceInfo[]> {
  const devices = await navigator.mediaDevices.enumerateDevices()
  return devices.filter((d) => d.kind === 'videoinput')
}

export class UvcCapture {
  private stream: MediaStream | null = null

  async start(deviceId: string): Promise<MediaStream> {
    this.stop()
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        deviceId: { exact: deviceId },
        // ATEM multiview is typically 1920x1080 or 1280x720; request the
        // largest the device offers rather than pin an exact size, since
        // that varies by switcher model and layout.
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false
    })
    return this.stream
  }

  stop(): void {
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null
  }

  getStream(): MediaStream | null {
    return this.stream
  }

  /** The capture's actual resolution, once a track is live — used to key CalibrationProfile.resolutionKey. */
  getResolution(): { width: number; height: number } | null {
    const track = this.stream?.getVideoTracks()[0]
    if (!track) return null
    const settings = track.getSettings()
    if (!settings.width || !settings.height) return null
    return { width: settings.width, height: settings.height }
  }
}
