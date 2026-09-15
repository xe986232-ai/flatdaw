/**
 * Waveform peak generation + rendering.
 *
 * Adapted from openDAW (github.com/andremichelle/openDAW)
 * packages/lib/fusion/src/peaks/{Peaks,PeaksPainter,SamplePeakWorker}.ts
 * AGPL-3.0-or-later — check license compatibility before shipping this
 * in a closed-source build.
 *
 * The core idea (kept from the original):
 *   1. Pre-compute a multi-resolution "mipmap" of min/max peaks per channel,
 *      one stage per zoom level (stage.shift = how many samples one peak covers).
 *   2. At draw time, pick the stage whose resolution is closest to the current
 *      zoom (units-per-pixel), then draw one vertical min/max bar per pixel.
 *
 * Differences from the original (simplified for portability):
 *   - No Float16 bit-packing — peaks are stored as plain Float32Array pairs
 *     (min, max). Uses ~2x the memory of the original but needs zero custom
 *     bit-twiddling code.
 *   - No worker/messenger protocol — generateMultiResPeaks() is a plain function you
 *     can call directly or wrap in your own Web Worker.
 */

export interface PeakStage {
  readonly shift: number       // 1 peak covers 2^shift samples
  readonly numPeaks: number
  readonly dataOffset: number  // offset into the channel's Float32Array (in peak units, x2 for min/max)
  unitsEachPeak(): number
}

const makeStage = (shift: number, numPeaks: number, dataOffset: number): PeakStage => ({
  shift,
  numPeaks,
  dataOffset,
  unitsEachPeak: () => 1 << shift
})

export interface MultiResPeaks {
  readonly stages: ReadonlyArray<PeakStage>
  readonly data: ReadonlyArray<Float32Array> // one Float32Array per channel, laid out as [min0,max0,min1,max1,...]
  readonly numFrames: number
  readonly numChannels: number
  /** Returns the stage whose resolution best matches the current zoom level. */
  nearest(unitsPerPixel: number): PeakStage | null
}

/**
 * Picks a reasonable set of mipmap resolutions ("shifts") for a given
 * sample length and target display width, so the finest stage is roughly
 * 1 peak-per-pixel and coarser stages step down by SHIFT_PADDING bits.
 */
const findBestShiftsMultiRes = (numFrames: number, width: number = 1200): Uint8Array => {
  const ratio = numFrames / width
  if (ratio <= 1.0) return new Uint8Array(0)
  const SHIFT_PADDING = 3
  const maxShift = Math.floor(Math.log(ratio) / Math.LN2)
  const numStages = Math.max(1, Math.floor(maxShift / SHIFT_PADDING))
  return Uint8Array.from({length: numStages}, (_, i) => SHIFT_PADDING * (i + 1))
}

/**
 * Builds multi-resolution min/max peaks for one or more channels of audio.
 * Call this once per loaded sample/region and cache the result — it's the
 * expensive part. Safe to run off the main thread (e.g. inside a Worker),
 * since it only touches plain typed arrays.
 *
 * @param frames     one Float32Array (or any array-like of samples, -1..1) per channel
 * @param numFrames  number of samples per channel
 * @param width      approximate target render width in px, used to pick resolution stages
 */
export const generateMultiResPeaks = (
  frames: ReadonlyArray<Float32Array>,
  numFrames: number,
  width: number = 1200
): MultiResPeaks => {
  const numChannels = frames.length
  const shifts = findBestShiftsMultiRes(numFrames, width)
  const numShifts = shifts.length

  // Lay out stages back-to-back in a single flat buffer per channel.
  let dataOffsetPeaks = 0
  const stages: PeakStage[] = Array.from({length: numShifts}, (_, i) => {
    const shift = shifts[i]
    const numPeaks = Math.ceil(numFrames / (1 << shift))
    const stage = makeStage(shift, numPeaks, dataOffsetPeaks)
    dataOffsetPeaks += numPeaks
    return stage
  })

  // Each peak stores 2 floats (min, max) -> buffer is 2x peak count.
  const data: Float32Array[] = Array.from({length: numChannels}, () => new Float32Array(dataOffsetPeaks * 2))

  if (numShifts === 0) {
    return {stages, data, numFrames, numChannels, nearest: () => null}
  }

  const finestMask = (1 << stages[0].shift) - 1

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = data[channel]
    const channelFrames = frames[channel]
    const stageMin = new Float32Array(numShifts).fill(Number.POSITIVE_INFINITY)
    const stageMax = new Float32Array(numShifts).fill(Number.NEGATIVE_INFINITY)
    const stageIndex = new Int32Array(numShifts)

    let min = Number.POSITIVE_INFINITY
    let max = Number.NEGATIVE_INFINITY
    let position = 0

    for (let i = 0; i < numFrames; i++) {
      const frame = channelFrames[i]
      if (frame < min) min = frame
      if (frame > max) max = frame

      if ((++position & finestMask) === 0) {
        for (let j = 0; j < numShifts; j++) {
          const stage = stages[j]
          if (min < stageMin[j]) stageMin[j] = min
          if (max > stageMax[j]) stageMax[j] = max
          if ((((1 << stage.shift) - 1) & position) === 0) {
            const peakIdx = stage.dataOffset + stageIndex[j]++
            channelData[peakIdx * 2] = stageMin[j]
            channelData[peakIdx * 2 + 1] = stageMax[j]
            stageMin[j] = Number.POSITIVE_INFINITY
            stageMax[j] = Number.NEGATIVE_INFINITY
          }
        }
        min = Number.POSITIVE_INFINITY
        max = Number.NEGATIVE_INFINITY
      }
    }
  }

  const nearest = (unitsPerPixel: number): PeakStage | null => {
    const shift = Math.floor(Math.log(Math.abs(unitsPerPixel)) / Math.LN2)
    for (let i = stages.length - 1; i >= 0; i--) {
      if (shift >= stages[i].shift) return stages[i]
    }
    return stages[0]
  }

  return {stages, data, numFrames, numChannels, nearest}
}

export interface WaveformLayout {
  x0: number; x1: number // screen-space horizontal range (px)
  u0: number; u1: number // sample-space range being displayed (frame indices)
  y0: number; y1: number // screen-space vertical range (px)
  v0: number; v1: number // amplitude range, typically -1..1
}

/**
 * Draws one channel's waveform into a canvas as vertical min/max bars,
 * one bar per pixel column. Picks the peak stage closest to the current
 * zoom level automatically — cheap enough to call every frame/redraw.
 *
 * Usage:
 *   const ctx = canvas.getContext('2d')!
 *   ctx.fillStyle = '#4ade80'
 *   renderMultiResWaveform(ctx, peaks, 0, { x0: 0, x1: canvas.width, u0: 0, u1: peaks.numFrames,
 *                                   y0: 0, y1: canvas.height, v0: -1, v1: 1 })
 */
export const renderMultiResWaveform = (
  ctx: CanvasRenderingContext2D,
  peaks: MultiResPeaks,
  channelIndex: number,
  {x0, x1, u0, u1, y0, y1, v0, v1}: WaveformLayout
): void => {
  const unitsEachPixel = (u1 - u0) / (x1 - x0)
  const stage = peaks.nearest(unitsEachPixel)
  if (stage === null) return

  const scale = (y1 - y0 - 1.0) / (v1 - v0)
  const unitsEachPeak = stage.unitsEachPeak()
  const pixelOverflow = x0 - Math.floor(x0)
  const peaksEachPixel = unitsEachPixel / unitsEachPeak
  const data = peaks.data[channelIndex]

  let from = (u0 - pixelOverflow * unitsEachPixel) / unitsEachPixel * peaksEachPixel
  let indexFrom = Math.floor(from)
  let min = 0.0
  let max = 0.0

  for (let x = Math.floor(x0); x < Math.floor(x1); x++) {
    const to = from + peaksEachPixel
    const indexTo = Math.floor(to)
    let touched = false
    while (indexFrom < indexTo) {
      const peakIdx = stage.dataOffset + indexFrom++
      const peakMin = data[peakIdx * 2]
      const peakMax = data[peakIdx * 2 + 1]
      if (peakMin < min) min = peakMin
      if (peakMax > max) max = peakMax
      touched = true
    }
    const yMin = y0 + Math.floor((min - v0) * scale)
    const yMax = y0 + Math.floor((max - v0) * scale)
    const ry0 = Math.max(y0, Math.min(yMin, yMax))
    const ry1 = Math.min(y1, Math.max(yMin, yMax))
    ctx.fillRect(x, ry0, 1, ry1 === ry0 ? 1 : ry1 - ry0)
    if (touched) { const t = max; max = min; min = t }
    from = to
    indexFrom = indexTo
  }
}

/**
 * Convenience: build peaks straight from a Web Audio AudioBuffer.
 */
export const generateMultiResPeaksFromAudioBuffer = (buffer: AudioBuffer, width: number = 1200): MultiResPeaks => {
  const frames: Float32Array[] = []
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    frames.push(buffer.getChannelData(c))
  }
  return generateMultiResPeaks(frames, buffer.length, width)
}
