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
  chunkIdx: number | null // null for audio clips (no note-pattern chunk to point at)
  isAudio: boolean
  sampleName: string | null
  // Durasi asli sample (dalam ketuk), dibaca dari double ke-2 di CLHd — cuma
  // relevan buat klip audio. null kalau CLHd-nya gak kebaca / bukan audio.
  sampleLenBeats: number | null
  // Berapa kali sample-nya diulang buat ngisi penempatan (lenBeats) di
  // playlist. Dibaca dari sub-chunk "LINk" di dalam CLSm (lihat readClsmInfo).
  // 1 = main sekali/normal, >1 = di-loop. Default 1 buat klip non-audio.
  // TIDAK dipakai buat nentuin loop (lihat catatan di readClsmInfo) — cuma
  // disimpan siapa tau kepake nanti.
  repeatCount: number
  // Rasio time-stretch dari sub-chunk STRC di dalam CLSm (lihat
  // extractStretchRatio). null buat klip non-audio atau kalau STRC gak
  // ketemu (dianggap 1.0 / gak di-stretch oleh pemakainya).
  stretchRatio: number | null
}

export interface ParsedFlm {
  chunkResults: EVN2ChunkResult[]
  timelineClips: TimelineClipRaw[]
  bpm: number
  skippedAudioCount: number
  namedCount: number
  audioClipCount: number
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

// Generic tag+length chunk walker: scans [start, end) treating every
// 4-byte-ASCII-tag + 4-byte-LE-length as a chunk header, like the top-level
// EVN2/CLIP/TRKH tags but for the sub-chunks nested *inside* a CLIP's own
// data (CLHd, ZOOM, CLSm, and — inside CLSm — MAIN/LINk/STRC/STR1/PTH1/PRST/
// PRMS). Same "don't hardcode offsets, search for the tag" philosophy as the
// rest of this file, verified against a real calibration file with audio
// clips (see CLSm handling below).
interface SubChunk {
  offset: number
  tag: string
  length: number
  dataStart: number
  dataEnd: number
}

function walkChunks(bytes: Uint8Array, start: number, end: number): SubChunk[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const results: SubChunk[] = []
  let i = start
  while (i < end - 8) {
    let isTag = true
    for (let j = 0; j < 4; j++) {
      const b = bytes[i + j]
      if (b < 32 || b >= 127) {
        isTag = false
        break
      }
    }
    if (isTag) {
      const length = view.getUint32(i + 4, true)
      const dataStart = i + 8
      const dataEnd = dataStart + length
      if (length >= 0 && dataEnd > dataStart && dataEnd <= end + 16) {
        results.push({ offset: i, tag: String.fromCharCode(bytes[i], bytes[i + 1], bytes[i + 2], bytes[i + 3]), length, dataStart, dataEnd })
        i = dataEnd
        continue
      }
    }
    i++
  }
  return results
}

// Klip audio (bukan instrument/MIDI) selalu punya sub-chunk CLSm di antara
// ZOOM dan EVN2-nya (EVN2-nya sendiri kosong, cuma placeholder). Di dalam
// CLSm ada chunk MAIN yang isinya: 12 byte header numerik lalu nama sample
// yang ditampilin di FL Studio Mobile (mis. "Case 19 (Kick)"), di-null-pad
// sampai akhir chunk. Diambil string ASCII pertama yang cukup panjang di
// dalam MAIN, sama kayak trackNameFromRange() buat instrument name.
//
// CLSm juga punya sub-chunk "LINk" (4-byte int32). SEMPET dikira ini
// "berapa kali sample diulang buat ngisi penempatan clip di playlist"
// (loop count) — divalidasi manual terhadap file kalibrasi kecil isi 2
// klip dari sample yang sama persis, dan angkanya (1 lalu 2) kebetulan
// cocok sama clipLength/sampleLength.
//
// TERNYATA KELIRU. Dicek ulang pakai file project asli (33 instrumen/169
// sample, jauh lebih representatif dari file kalibrasi 2-klip): nilai
// LINk itu cuma counter urutan PEMAKAIAN sample tsb di SELURUH file (naik
// 1 tiap kali sample yang sama dipakai lagi di clip manapun — gak peduli
// clip itu di-loop atau nggak). Buktinya klip one-shot biasa yang ditaruh
// puluhan kali terpisah (mis. "Case 19 (Kick)", tiap instance PAS sama
// panjangnya kayak sample asli, jelas bukan loop) kebaca LINk naik terus
// 1..33 — dan klip yang beneran butuh loop malah sering kebaca LINk=1
// kalau kebetulan itu pemakaian pertamanya di file. Jadi field ini TETEP
// dibaca & disimpan di bawah (siapa tau kepake buat sesuatu yang lain di
// masa depan), tapi JANGAN dipakai lagi buat nentuin loop/repeat sample.
//
// Deteksi loop audio yang dipakai sekarang gak berangkat dari field
// binary itu sama sekali — lihat resolveWaveforms() di App.tsx, yang
// bandingin lengthBars (penempatan di playlist, dari CLHd) sama durasi
// asli sample HASIL DEKODE BENERAN (audioBuffer.duration), dikoreksi
// pakai stretchRatio (STRC, lihat extractStretchRatio di bawah) plus
// ambang minimal panjang biar transient pendek (kick/klap) gak
// ke-flag loop cuma karena ada gap sebelum hit berikutnya.
function readClsmInfo(bytes: Uint8Array, clsm: SubChunk): { sampleName: string | null; repeatCount: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const subs = walkChunks(bytes, clsm.dataStart, clsm.dataEnd)

  const main = subs.find((c) => c.tag === 'MAIN')
  const sampleName = main ? extractAsciiRuns(bytes, main.dataStart, main.dataEnd)[0]?.text ?? null : null

  let repeatCount = 1
  const link = subs.find((c) => c.tag === 'LINk')
  if (link && link.length >= 4 && link.dataStart + 4 <= bytes.length) {
    const candidate = view.getInt32(link.dataStart, true)
    if (candidate >= 1 && candidate <= 999) repeatCount = candidate
  }

  return { sampleName, repeatCount }
}

// Rasio time-stretch klip audio, dari sub-chunk STRC di dalam CLSm. Layout
// data STRC: [1 byte flag][float64 rasio stretch][float64 lain, biasanya
// 1.0][...]. Divalidasi manual terhadap project kalibrasi berisi 2 klip
// dari sample yang sama (KSHMR_Short_Drum_Fill_27_128.wav, native 128 BPM,
// project 140 BPM): klip yang diputer apa adanya (auto tempo-sync, gak
// di-override user) punya rasio persis 128/140 = 0.914286; klip ke-2 yang
// user SENGAJA slow-in 2x punya rasio persis 2x lipat dari itu (1.828571)
// — dan panjang penempatannya di CLHd juga otomatis dobel (4 beat -> 8
// beat), konsisten: durasi_hasil_stretch_detik = audioBuffer.duration *
// rasio_ini. Dipakai App.tsx buat ngoreksi durasi asli sample sebelum
// dibandingin ke panjang penempatan, biar klip yang di-stretch gak salah
// kedeteksi sebagai loop.
function extractStretchRatio(bytes: Uint8Array, clsm: SubChunk): number | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const subs = walkChunks(bytes, clsm.dataStart, clsm.dataEnd)
  const strc = subs.find((c) => c.tag === 'STRC')
  if (!strc || strc.length < 9 || strc.dataStart + 9 > bytes.length) return null
  const ratio = view.getFloat64(strc.dataStart + 1, true) // +1 byte buat skip flag byte
  if (!Number.isFinite(ratio) || ratio <= 0 || ratio > 1000) return null
  return ratio
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

// FL Studio Mobile nulis literal string ini di slot instrument/track/sample
// yang belum pernah diisi user — bukan hasil salah-parse, itu emang begitu
// di dalam file binary-nya. Klip/pattern yang namanya persis ini biasanya
// cuma sisa slot kosong, gak ada isinya yang perlu ditampilin di playlist.
const EMPTY_LITERAL = /^<\s*empty\s*>$/i
function isEmptyLiteral(s: string | null | undefined): boolean {
  return !!s && EMPTY_LITERAL.test(s.trim())
}

// Chunk tag codes used internally by the .flm format. A run that's just one
// of these (optionally with 1-2 junk bytes like "?" glued to the front,
// which happens when the tag itself gets swept into the ASCII scan) is
// structural noise, never a real instrument/track name — e.g. "?EVN2".
const KNOWN_CHUNK_TAGS = new Set([
  'EVN2', 'CLIP', 'TRKH', 'ZOOM', 'DESC', 'DES', 'CHHD', 'MASTER', 'FLHD', 'FLDT', 'MIXR', 'INSV', 'PATT', 'PLAY', 'TMPO',
])
function isChunkTagNoise(text: string): boolean {
  const cleaned = text.replace(/^[^A-Za-z0-9]+/, '').replace(/[^A-Za-z0-9]+$/, '').toUpperCase()
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
    const trimmed = cand.text.trim()
    if (!IGNORE_LABELS.test(trimmed) && !isChunkTagNoise(trimmed)) return cand.text
  }
  const filtered = raw.filter((r) => {
    const trimmed = r.text.trim()
    return !IGNORE_LABELS.test(trimmed) && !isChunkTagNoise(trimmed)
  })
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
  isAudio: boolean
  sampleName: string | null
  sampleLenBeats: number | null
  repeatCount: number
  stretchRatio: number | null
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
    let sampleLenBeats: number | null = null
    const clhdRel = findAllTagOffsets(bytes.subarray(dataStart, dataEnd), 'CLHd')
    if (clhdRel.length) {
      const clhdOff = dataStart + clhdRel[0]
      const clhdLen = view.getUint32(clhdOff + 4, true)
      const clhdDataStart = clhdOff + 8
      if (clhdLen >= 8 && clhdDataStart + 8 <= bytes.length) {
        const candidate = view.getFloat64(clhdDataStart, true)
        if (candidate > 0 && candidate <= 4096) lenBeats = candidate
      }
      // Double ke-2 di CLHd = durasi ASLI sample (beda dari double pertama
      // di atas, yang cuma panjang penempatan di playlist). Cuma dipakai
      // buat klip audio; untuk klip pattern nilainya diabaikan (dihitung
      // dari note asli di flmToTracks.ts, bukan dari sini).
      if (clhdLen >= 16 && clhdDataStart + 16 <= bytes.length) {
        const candidate2 = view.getFloat64(clhdDataStart + 8, true)
        if (candidate2 > 0 && candidate2 <= 4096) sampleLenBeats = candidate2
      }
    }

    const evn2 = evn2Results.find((r) => r.offset > clipOff && r.offset < dataEnd)
    const trkh = findLastBefore(trkhOffsets, clipOff)
    const trackName = trkh !== -1 ? trackNameFromRange(bytes, trkh, clipOff) : null

    // Klip audio (bukan pattern instrument) punya sub-chunk CLSm nangkring
    // di antara ZOOM dan EVN2 kosongnya. Kalau ada, ini bukan pattern MIDI.
    const subChunks = walkChunks(bytes, dataStart, dataEnd)
    const clsm = subChunks.find((c) => c.tag === 'CLSm')
    const isAudio = !!clsm
    const clsmInfo = clsm ? readClsmInfo(bytes, clsm) : null
    const sampleName = clsmInfo?.sampleName ?? null
    const repeatCount = clsmInfo?.repeatCount ?? 1
    const stretchRatio = clsm ? extractStretchRatio(bytes, clsm) : null

    clips.push({
      clipOffset: clipOff,
      posBeats,
      lenBeats,
      evn2Offset: evn2 ? evn2.offset : null,
      trkhOffset: trkh,
      trackName,
      isAudio,
      sampleName,
      sampleLenBeats: isAudio ? sampleLenBeats : null,
      repeatCount,
      stretchRatio: isAudio ? stretchRatio : null,
    })
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

// Baca BPM asli project dari chunk HEAD (chunk paling depan file, ditandai
// prefix magic "10LF" sebelum tag "HEAD" itu sendiri — beda dari chunk-chunk
// kecil "HEAD" lain yang nempel di tiap track/instrumen buat data lain).
// Divalidasi manual terhadap 1 file kalibrasi (BPM asli 129, dikonfirmasi
// user): layout isi chunk HEAD dari awal datanya adalah
//   [0:8]    int64 — belum jelas fungsinya, bukan bagian tempo
//   [8:264]  nama project, 256 byte, null-padded (mis. "New Song")
//   [264:272] BPM asli project, disimpan sebagai float64 (double)
//   [272:280] 0.0 di file kalibrasi — belum jelas (mungkin master pitch)
//   [280:288] 100.0 di file kalibrasi — kemungkinan besar Master Volume %
// Kalau strukturnya gak cocok (versi format beda / chunk gak ketemu / nilai
// di luar rentang BPM wajar), fallback ke guessBPM(filename) biar tetep ada
// angka yang masuk akal daripada gagal total.
const HEAD_NAME_FIELD_SIZE = 256
const HEAD_INT_HEADER_SIZE = 8
const HEAD_BPM_OFFSET = HEAD_INT_HEADER_SIZE + HEAD_NAME_FIELD_SIZE // 264

function parseProjectBpm(bytes: Uint8Array, filename: string): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const headOffsets = findAllTagOffsets(bytes, 'HEAD')
  // Chunk HEAD project-level selalu yang pertama muncul di file (paling
  // depan, langsung setelah 4-byte magic "10LF") — chunk "HEAD" lain (satu
  // per track/instrumen) selalu muncul jauh lebih belakang dan lebih pendek.
  const headOffset = headOffsets.length ? headOffsets[0] : -1

  if (headOffset !== -1 && headOffset + 8 <= bytes.length) {
    const length = view.getUint32(headOffset + 4, true)
    const dataStart = headOffset + 8
    const dataEnd = dataStart + length
    const bpmFieldStart = dataStart + HEAD_BPM_OFFSET
    if (length > 0 && dataEnd <= bytes.length && bpmFieldStart + 8 <= dataEnd) {
      const candidate = view.getFloat64(bpmFieldStart, true)
      if (Number.isFinite(candidate) && candidate >= 20 && candidate <= 999) {
        return Math.round(candidate * 100) / 100
      }
    }
  }

  return guessBPM(filename)
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
    const guessed = guessInstrumentName(bytes, off, clipOffsets, trkhOffsets)
    // Nama literal "<empty>" bukan nama beneran — nol-in biar fallback ke
    // "Pattern #N" (lihat assignDisplayNames), bukan nampilin "<empty>" apa
    // adanya sebagai label pattern.
    r.instrumentName = isEmptyLiteral(guessed) ? null : guessed
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

  // Buang klip yang beneran gak ada isinya:
  // - klip audio yang sample-nya literal "<empty>" (slot belum pernah diisi
  //   sample apa pun — gak ada audio buat digambar/dicocokin ke zip)
  // - klip pattern yang trackName-nya "<empty>" DAN pattern-nya sendiri emang
  //   nol note (bukan cuma belum dikasih nama tapi beneran gak ada isinya)
  // Klip pattern yang trackName-nya "<empty>" tapi PUNYA note tetap
  // dipertahankan (isinya nyata, cuma track-nya belum pernah dikasih nama),
  // hanya nama tracknya di-null-in biar gak nampilin "<empty>" apa adanya.
  const cleanedClips = parsedClips
    .filter((cl) => {
      if (cl.isAudio) return !isEmptyLiteral(cl.sampleName)
      const chunk = allResults.find((r) => r.offset === cl.evn2Offset)
      const isBlankPattern = !chunk || chunk.notes.length === 0
      return !(isEmptyLiteral(cl.trackName) && isBlankPattern)
    })
    .map((cl) => (isEmptyLiteral(cl.trackName) ? { ...cl, trackName: null } : cl))

  const timelineClips: TimelineClipRaw[] = cleanedClips
    .filter((cl) => cl.isAudio || (cl.evn2Offset !== null && Object.prototype.hasOwnProperty.call(offsetToChunkIdx, cl.evn2Offset)))
    .map((cl) => ({
      ...cl,
      chunkIdx: !cl.isAudio && cl.evn2Offset !== null ? offsetToChunkIdx[cl.evn2Offset] : null,
    }))

  const namedCount = chunkResults.filter((c) => c.instrumentName).length
  const audioClipCount = timelineClips.filter((cl) => cl.isAudio).length
  const bpm = parseProjectBpm(bytes, filename)

  return { ok: true, data: { chunkResults, timelineClips, bpm, skippedAudioCount, namedCount, audioClipCount } }
}
