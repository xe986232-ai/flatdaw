// Parser binary untuk file project .flm (FL Studio Mobile).
//
// PORTING NOTE: seluruh logic di file ini adalah port 1:1 dari
// flm_piano_roll_tool.html (yang sudah divalidasi terhadap file kalibrasi
// asli) — tidak ada perubahan algoritma/formula, cuma dipisah dari DOM dan
// dikasih tipe TypeScript supaya bisa dipakai di flatdaw.

export interface EVN2Note {
  pos_ticks: number
  pos_beats: number
  dur_raw: number
  dur_beats: number
  pitch: number
  vel: number
}

export interface EVN2ChunkResult {
  offset: number
  length: number
  headerSkip?: number
  notes: EVN2Note[]
  error: string | null
  instrumentName?: string | null
  displayName?: string
}

export interface TimelineClipRaw {
  clipOffset: number
  posBeats: number
  lenBeats: number
  evn2Offset: number | null
  trkhOffset: number
  trackName: string | null
  chunkIdx: number
}

export interface ParsedFlm {
  chunkResults: EVN2ChunkResult[]
  timelineClips: TimelineClipRaw[]
  bpm: number
  skippedAudioCount: number
  namedCount: number
}

export type ParseFlmResult = { ok: true; data: ParsedFlm } | { ok: false; error: string }

/* ============ BINARY PARSER (port 1:1 dari tool HTML) ============ */

function findAllTagOffsets(bytes: Uint8Array, tag: string): number[] {
  const t = [...tag].map((c) => c.charCodeAt(0))
  const offsets: number[] = []
  for (let i = 0; i <= bytes.length - t.length; i++) {
    let match = true
    for (let j = 0; j < t.length; j++) {
      if (bytes[i + j] !== t[j]) {
        match = false
        break
      }
    }
    if (match) offsets.push(i)
  }
  return offsets
}

function findLastBefore(sortedOffsets: number[], limit: number): number {
  let best = -1
  for (const o of sortedOffsets) {
    if (o < limit) best = o
    else break
  }
  return best
}

function extractAsciiRuns(bytes: Uint8Array, start: number, end: number): { start: number; text: string }[] {
  const runs: { start: number; text: string }[] = []
  let cur: number[] = []
  let curStart = -1
  for (let i = start; i < end; i++) {
    const b = bytes[i]
    if (b >= 32 && b < 127) {
      if (cur.length === 0) curStart = i
      cur.push(b)
    } else {
      if (cur.length >= 3) runs.push({ start: curStart, text: String.fromCharCode(...cur) })
      cur = []
    }
  }
  if (cur.length >= 3) runs.push({ start: curStart, text: String.fromCharCode(...cur) })
  return runs
}

const IGNORE_LABELS = /^(Default(\/Default)?|Level|DESc?|CHHD|MASTER|TRKH.?)$/i

// Chunk tag codes used internally by the .flm format. A run that's just one
// of these (optionally with 1-2 junk bytes like "?" glued to the front,
// which happens when the tag itself gets swept into the ASCII scan) is
// structural noise, never a real instrument/track name — e.g. "?EVN2".
const KNOWN_CHUNK_TAGS = new Set([
  'EVN2', 'CLIP', 'TRKH', 'ZOOM', 'DESC', 'DES', 'CHHD', 'MASTER', 'FLHD', 'FLDT', 'MIXR', 'INSV', 'PATT', 'PLAY', 'TMPO',
])
function isChunkTagNoise(text: string): boolean {
  const cleaned = text.replace(/^[^A-Za-z0-9]+/, '').toUpperCase()
  return KNOWN_CHUNK_TAGS.has(cleaned)
}

// Heuristic: each EVN2 note-chunk is preceded by CLIP -> ZOOM -> EVN2, and the
// CLIP is preceded by a TRKH chunk whose data holds a DESc sub-chunk with a
// human-readable track/instrument name right before the padding. Walking
// backwards from EVN2 to the nearest CLIP, then to the nearest TRKH before
// that CLIP, and grabbing the last real ASCII string in between recovers the
// instrument name (e.g. "SuperSaw 1", "GMSynth 2") without hardcoding offsets.
function trackNameFromRange(bytes: Uint8Array, trkh: number, clip: number): string | null {
  const raw = extractAsciiRuns(bytes, trkh, clip)
  const descIdx = raw.findIndex((r) => /^DESc?\s*$/i.test(r.text))
  if (descIdx !== -1 && descIdx + 1 < raw.length) {
    const cand = raw[descIdx + 1]
    if (!IGNORE_LABELS.test(cand.text) && !isChunkTagNoise(cand.text)) return cand.text
  }
  const filtered = raw.filter((r) => !IGNORE_LABELS.test(r.text) && !isChunkTagNoise(r.text))
  return filtered.length ? filtered[filtered.length - 1].text : null
}

function guessInstrumentName(bytes: Uint8Array, evn2Offset: number, clipOffsets: number[], trkhOffsets: number[]): string | null {
  const clip = findLastBefore(clipOffsets, evn2Offset)
  if (clip === -1) return null
  const trkh = findLastBefore(trkhOffsets, clip)
  if (trkh === -1) return null
  return trackNameFromRange(bytes, trkh, clip)
}

interface RawClip {
  clipOffset: number
  posBeats: number
  lenBeats: number
  evn2Offset: number | null
  trkhOffset: number
  trackName: string | null
}

// Tiap CLIP di playlist = 1 penempatan pattern di timeline. Struktur:
// CLIP(tag+len) -> [4 byte posisi, dalam tick, skala sama kayak EVN2: 128 tick
// = 1 ketuk] -> ... -> CLHd(tag+len) -> [double posisi?, double panjang(ketuk),
// double lain, ...] -> ZOOM -> EVN2 (note pattern-nya). Field posisi tick di
// awal data CLIP udah divalidasi manual terhadap screenshot playlist asli
// (bar 1/2/3 -> tick 0/512/1024). Field panjang diambil dari double ke-2 di
// CLHd (konsisten = panjang 1 bar di file kalibrasi).
function parseClips(bytes: Uint8Array, evn2Results: EVN2ChunkResult[], clipOffsets: number[], trkhOffsets: number[]): RawClip[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const clips: RawClip[] = []
  clipOffsets.forEach((clipOff) => {
    if (clipOff + 8 > bytes.length) return
    const clipLen = view.getUint32(clipOff + 4, true)
    const dataStart = clipOff + 8
    const dataEnd = dataStart + clipLen
    if (clipLen < 4 || dataEnd > bytes.length) return

    const posTicks = view.getUint32(dataStart, true)
    const posBeats = posTicks / 128

    let lenBeats = 4 // fallback: 1 bar (4/4)
    const clhdRel = findAllTagOffsets(bytes.subarray(dataStart, dataEnd), 'CLHd')
    if (clhdRel.length) {
      const clhdOff = dataStart + clhdRel[0]
      const clhdLen = view.getUint32(clhdOff + 4, true)
      const clhdDataStart = clhdOff + 8
      if (clhdLen >= 8 && clhdDataStart + 8 <= bytes.length) {
        const candidate = view.getFloat64(clhdDataStart, true)
        if (candidate > 0 && candidate <= 4096) lenBeats = candidate
      }
    }

    const evn2 = evn2Results.find((r) => r.offset > clipOff && r.offset < dataEnd)
    const trkh = findLastBefore(trkhOffsets, clipOff)
    const trackName = trkh !== -1 ? trackNameFromRange(bytes, trkh, clipOff) : null
    clips.push({ clipOffset: clipOff, posBeats, lenBeats, evn2Offset: evn2 ? evn2.offset : null, trkhOffset: trkh, trackName })
  })
  return clips.sort((a, b) => a.posBeats - b.posBeats)
}

function parseEVN2Chunk(bytes: Uint8Array, tagOffset: number): EVN2ChunkResult {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const length = view.getUint32(tagOffset + 4, true)
  const dataStart = tagOffset + 8
  if (dataStart + length > bytes.length) {
    return { offset: tagOffset, length, notes: [], error: 'Panjang chunk melebihi ukuran file (kemungkinan bukan format yang sama).' }
  }
  const chunk = bytes.subarray(dataStart, dataStart + length)

  // auto-detect header skip (0, 2, or other) so remaining bytes divide evenly by 20
  let headerSkip = -1
  for (let s = 0; s < 20; s++) {
    if (chunk.length - s >= 0 && (chunk.length - s) % 20 === 0) {
      headerSkip = s
      break
    }
  }
  if (headerSkip === -1 || chunk.length - headerSkip === 0) {
    return {
      offset: tagOffset,
      length,
      notes: [],
      error: `Panjang data chunk (${length} byte) gak bisa dibagi rapi jadi record 20-byte. Formatnya mungkin beda dari yang udah divalidasi.`,
    }
  }

  const body = chunk.subarray(headerSkip)
  const dv = new DataView(body.buffer, body.byteOffset, body.byteLength)
  const notes: EVN2Note[] = []
  for (let i = 0; i + 20 <= body.length; i += 20) {
    const pos = dv.getUint32(i, true)
    const dur_raw = dv.getFloat32(i + 8, true)
    const pitch = dv.getInt16(i + 12, true)
    const vel = dv.getInt16(i + 14, true)
    const pos_beats = pos / 128
    const dur_beats = Math.pow(2, 8 * (dur_raw - 1.875))
    notes.push({ pos_ticks: pos, pos_beats, dur_raw, dur_beats, pitch, vel })
  }
  return { offset: tagOffset, length, headerSkip, notes, error: null }
}

function guessBPM(filename: string): number {
  const m = filename.match(/\((\d{2,3})\)/) || filename.match(/[_\s-](\d{2,3})[_\s.-]/)
  if (m) {
    const v = parseInt(m[1], 10)
    if (v >= 40 && v <= 260) return v
  }
  return 120
}

// Kalau beberapa pattern kedetect punya instrumentName yang sama persis
// (mis. 2 chunk EVN2 sama-sama "PL Mute Guitars"), tandain urutannya biar
// bisa dibedain: "PL Mute Guitars (1)", "PL Mute Guitars (2)", dst. Pattern
// tanpa nama (instrumentName null) tetap jatuh ke fallback "Pattern #N".
function assignDisplayNames(list: EVN2ChunkResult[]): void {
  const total: Record<string, number> = {}
  list.forEach((c) => {
    if (c.instrumentName) total[c.instrumentName] = (total[c.instrumentName] || 0) + 1
  })
  const seen: Record<string, number> = {}
  list.forEach((c, i) => {
    if (c.instrumentName && total[c.instrumentName] > 1) {
      seen[c.instrumentName] = (seen[c.instrumentName] || 0) + 1
      c.displayName = `${c.instrumentName} (${seen[c.instrumentName]})`
    } else {
      c.displayName = c.instrumentName || `Pattern #${i + 1}`
    }
  })
}

/* ============ ENTRY POINT ============ */

// Port dari handleFile() di tool HTML — logic-nya sama persis, cuma bagian
// manipulasi DOM (dropzone, filebar, dst) dibuang karena gak relevan lagi.
export function parseFlmFile(bytes: Uint8Array, filename: string): ParseFlmResult {
  const tagOffsets = findAllTagOffsets(bytes, 'EVN2')
  if (tagOffsets.length === 0) {
    return { ok: false, error: 'Gak nemu chunk EVN2 di file ini. Kemungkinan bukan project .flm, atau versi formatnya beda dari yang udah dianalisis/divalidasi.' }
  }

  const clipOffsets = findAllTagOffsets(bytes, 'CLIP')
  const trkhOffsets = findAllTagOffsets(bytes, 'TRKH')
  const AUDIO_TRACK_NAME = /^Audio\s*\d+$/i

  const allResults: EVN2ChunkResult[] = tagOffsets.map((off) => {
    const r = parseEVN2Chunk(bytes, off)
    r.instrumentName = guessInstrumentName(bytes, off, clipOffsets, trkhOffsets)
    return r
  })

  // Buang chunk placeholder klip Audio (chunk EVN2 yang length-nya < 20 byte
  // gak mungkin muat 1 note record pun — ini selalu klip Audio kosong, bukan
  // piano roll beneran) dan chunk yang track-nya kedetect sebagai "Audio <n>".
  const isEmptyAudioPlaceholder = (c: EVN2ChunkResult) => c.length < 20
  const isAudioTrackByName = (c: EVN2ChunkResult) => !!c.instrumentName && AUDIO_TRACK_NAME.test(c.instrumentName)

  const skippedAudioCount = allResults.filter((c) => isEmptyAudioPlaceholder(c) || isAudioTrackByName(c)).length
  const chunkResults = allResults.filter((c) => !(isEmptyAudioPlaceholder(c) || isAudioTrackByName(c)))

  if (chunkResults.length === 0) {
    return { ok: false, error: `Semua ${allResults.length} chunk EVN2 di file ini kedetect sebagai track audio/kosong. Gak ada pattern instrumen/VST yang tersisa buat ditampilin.` }
  }

  assignDisplayNames(chunkResults)

  const offsetToChunkIdx: Record<number, number> = {}
  chunkResults.forEach((c, i) => {
    offsetToChunkIdx[c.offset] = i
  })
  const parsedClips = parseClips(bytes, allResults, clipOffsets, trkhOffsets)
  const timelineClips: TimelineClipRaw[] = parsedClips
    .filter((cl) => cl.evn2Offset !== null && Object.prototype.hasOwnProperty.call(offsetToChunkIdx, cl.evn2Offset))
    .map((cl) => ({ ...cl, chunkIdx: offsetToChunkIdx[cl.evn2Offset as number] }))

  const namedCount = chunkResults.filter((c) => c.instrumentName).length
  const bpm = guessBPM(filename)

  return { ok: true, data: { chunkResults, timelineClips, bpm, skippedAudioCount, namedCount } }
}
