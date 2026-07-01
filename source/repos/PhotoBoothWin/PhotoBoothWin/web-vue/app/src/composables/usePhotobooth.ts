import { ref, computed, shallowRef } from 'vue'
import QRCode from 'qrcode'
import type { Template, ScreenName, FilterId, TemplateSlot } from '@/types/photobooth'
import { callHost } from './useHost'
import { useProjectVariant } from './useProjectVariant'


type StickerInstance = {
  id: string
  imageUrl: string
  /** X, Y 為「該格」內的相對座標（0～1），0.5 表示該格置中 */
  x: number
  y: number
  /**
   * 貼圖寬度比例：1 代表該格寬度的 20%。
   * 合成時在該格範圍內依此比例繪製。
   */
  scale: number
}

const { projectVariant, getChooseLayoutPreview, getQrCodePageFrame } = useProjectVariant()

/** 合成／預覽共用：圖片載入快取 */
const imageLoadCache = new Map<string, Promise<HTMLImageElement>>()

function clearImageLoadCache() {
  imageLoadCache.clear()
}

function getOutputJpegQuality(): number {
  const raw = import.meta.env.VITE_JPEG_QUALITY
  if (typeof raw === 'string' && raw.trim()) {
    const q = parseFloat(raw.trim())
    if (!Number.isNaN(q) && q > 0 && q <= 1) return q
  }
  return 0.95
}

function loadCachedImage(src: string): Promise<HTMLImageElement> {
  let pending = imageLoadCache.get(src)
  if (!pending) {
    pending = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = src
    })
    imageLoadCache.set(src, pending)
  }
  return pending
}

function isStickerEnabledEnv(): boolean {
  return (
    import.meta.env.VITE_STICKER_ENABLED === '1' ||
    String(import.meta.env.VITE_STICKER_ENABLED ?? '').toLowerCase() === 'true'
  )
}

export type RenderCompositeOptions = {
  captureUrls: string[]
  filterId: FilterId | null
  stickers: Record<number, StickerInstance[]>
  includeFrame?: boolean
  includeStickers?: boolean
}

/** 少於 slots 時循環補滿 capture URLs */
export function expandCaptureUrlsForSlots(captureUrls: string[], slotCount: number): string[] {
  const captureCycleLen = captureUrls.length
  if (captureCycleLen <= 0 || slotCount <= 0) return captureUrls
  if (captureCycleLen >= slotCount) return captureUrls.slice(0, slotCount)
  const expanded: string[] = []
  for (let i = 0; i < slotCount; i++) {
    expanded.push(captureUrls[i % captureCycleLen]!)
  }
  return expanded
}

const STAGE_V1 = { maxWidth: '1000px', maxHeight: 'calc(100vh - 200px)' } as const
const STAGE_V2 = { maxWidth: '500px', maxHeight: 'calc(100vh - 200px)' } as const

/** 1 號專案：bk01～bk06 合成格 */
const SLOTS_V1_BK01: TemplateSlot[] = [
  { x: 97, y: 951, w: 480, h: 360 },
  { x: 97, y: 1345, w: 480, h: 360 },
  { x: 627, y: 951, w: 480, h: 360 },
  { x: 627, y: 1345, w: 480, h: 360 },
]
const SLOTS_V1_BK02: TemplateSlot[] = [
  { x: 74, y: 159, w: 480, h: 360 },
  { x: 74, y: 588, w: 480, h: 360 },
  { x: 662, y: 159, w: 480, h: 360 },
  { x: 663, y: 596, w: 480, h: 360 },
]
const SLOTS_V1_BK03: TemplateSlot[] = [
  { x: 811, y: 89, w: 620, h: 460 },
  { x: 1094, y: 636, w: 620, h: 460 },
]
const SLOTS_V1_BK04: TemplateSlot[] = [
  { x: 97, y: 951, w: 480, h: 360 },
  { x: 97, y: 1345, w: 480, h: 360 },
  { x: 627, y: 951, w: 480, h: 360 },
  { x: 627, y: 1345, w: 480, h: 360 },
]
const SLOTS_V1_BK05: TemplateSlot[] = [
  { x: 102, y: 207, w: 500, h: 500 },
  { x: 102, y: 723, w: 500, h: 500 },
  { x: 611, y: 207, w: 500, h: 500 },
  { x: 611, y: 723, w: 500, h: 500 },
]
const SLOTS_V1_BK06: TemplateSlot[] = [
  { x: 63, y: 72, w: 500, h: 500 },
  { x: 62, y: 622, w: 500, h: 500 },
  { x: 650, y: 72, w: 500, h: 500 },
  { x: 650, y: 622, w: 500, h: 500 },
]

function buildTemplatesProject1(): Template[] {
  return [
    {
      id: 'bk01',
      preview: getChooseLayoutPreview('bk01'),
      shotCount: 4,
      sizeKey: '4x6',
      captureW: 480,
      captureH: 360,
      stageSize: STAGE_V1,
      frameAspectRatio: '480/360',
      width: 1205,
      height: 1795,
      slots: SLOTS_V1_BK01,
      shootLayout: { layoutKey: 'bk01', captureW: 480, captureH: 360, previewScale: 1.6 },
    },
    {
      id: 'bk02',
      preview: getChooseLayoutPreview('bk02'),
      shotCount: 2,
      sizeKey: '4x6_2IN',
      captureW: 480,
      captureH: 360,
      stageSize: STAGE_V1,
      frameAspectRatio: '480/360',
      width: 1205,
      height: 1795,
      slots: SLOTS_V1_BK02,
      shootLayout: { layoutKey: 'bk02', captureW: 480, captureH: 360, previewScale: 1.6 },
    },
    {
      id: 'bk03',
      preview: getChooseLayoutPreview('bk03'),
      shotCount: 2,
      sizeKey: '4x6',
      captureW: 620,
      captureH: 460,
      stageSize: STAGE_V1,
      frameAspectRatio: '620/460',
      width: 1795,
      height: 1205,
      slots: SLOTS_V1_BK03,
      shootLayout: { layoutKey: 'bk03', captureW: 620, captureH: 460, previewScale: 1.2 },
    },
    {
      id: 'bk04',
      preview: getChooseLayoutPreview('bk04'),
      shotCount: 4,
      sizeKey: '4x6',
      captureW: 480,
      captureH: 360,
      stageSize: STAGE_V1,
      frameAspectRatio: '480/360',
      width: 1205,
      height: 1795,
      slots: SLOTS_V1_BK01,
      shootLayout: { layoutKey: 'bk04', captureW: 480, captureH: 360, previewScale: 1.6 },
    },
    {
      id: 'bk05',
      preview: getChooseLayoutPreview('bk05'),
      shotCount: 4,
      sizeKey: '4x6',
      captureW: 500,
      captureH: 500,
      stageSize: STAGE_V1,
      frameAspectRatio: '500/500',
      width: 1205,
      height: 1795,
      slots: SLOTS_V1_BK05,
      shootLayout: { layoutKey: 'bk05', captureW: 500, captureH: 500, previewScale: 1.4 },
    },
    {
      id: 'bk06',
      preview: getChooseLayoutPreview('bk06'),
      shotCount: 2,
      sizeKey: '4x6_2IN',
      captureW: 500,
      captureH: 500,
      stageSize: STAGE_V1,
      frameAspectRatio: '500/500',
      width: 1205,
      height: 1795,
      slots: SLOTS_V1_BK06,
      shootLayout: { layoutKey: 'bk06', captureW: 500, captureH: 500, previewScale: 1.4 },
    },
  ]
}

/** 2 號專案：bk01～bk04 共用 9 格 */
const SLOTS_V2_BK01_04: TemplateSlot[] = [
  { x: 26, y: 35, w: 383, h: 512 },
  { x: 26, y: 574, w: 383, h: 512 },
  { x: 26, y: 1057, w: 383, h: 512 },
  { x: 409, y: 35, w: 383, h: 512 },
  { x: 409, y: 547, w: 383, h: 512 },
  { x: 409, y: 1057, w: 383, h: 512 },
  { x: 791, y: 35, w: 383, h: 512 },
  { x: 791, y: 547, w: 383, h: 512 },
  { x: 791, y: 1057, w: 383, h: 512 },
]

/** 2 號專案：bk05～bk08 共用 8 格 */
const SLOTS_V2_BK05_08: TemplateSlot[] = [
  { x: 85, y: 162, w: 460, h: 330 },
  { x: 85, y: 528, w: 460, h: 330 },
  { x: 85, y: 892, w: 460, h: 330 },
  { x: 85, y: 1259, w: 460, h: 330 },
  { x: 669, y: 162, w: 460, h: 330 },
  { x: 669, y: 528, w: 460, h: 330 },
  { x: 669, y: 892, w: 460, h: 330 },
  { x: 669, y: 1259, w: 460, h: 330 },
]

/** 2 號專案 bk09：8 連拍、32 格（少於格數時循環補滿） */
const SLOTS_V2_BK09: TemplateSlot[] = [
  { x: 91, y: 106, w: 220, h: 150 },
  { x: 91, y: 260, w: 220, h: 150 },
  { x: 91, y: 414, w: 220, h: 150 },
  { x: 91, y: 568, w: 220, h: 150 },
  { x: 91, y: 762, w: 220, h: 150 },
  { x: 91, y: 916, w: 220, h: 150 },
  { x: 91, y: 1070, w: 220, h: 150 },
  { x: 91, y: 1224, w: 220, h: 150 },
  { x: 361, y: 106, w: 220, h: 150 },
  { x: 361, y: 260, w: 220, h: 150 },
  { x: 361, y: 414, w: 220, h: 150 },
  { x: 361, y: 568, w: 220, h: 150 },
  { x: 361, y: 762, w: 220, h: 150 },
  { x: 361, y: 916, w: 220, h: 150 },
  { x: 361, y: 1070, w: 220, h: 150 },
  { x: 361, y: 1224, w: 220, h: 150 },
  { x: 625, y: 125, w: 220, h: 150 },
  { x: 625, y: 260, w: 220, h: 150 },
  { x: 625, y: 414, w: 220, h: 150 },
  { x: 625, y: 568, w: 220, h: 150 },
  { x: 625, y: 762, w: 220, h: 150 },
  { x: 625, y: 916, w: 220, h: 150 },
  { x: 625, y: 1070, w: 220, h: 150 },
  { x: 625, y: 1224, w: 220, h: 150 },
  { x: 891, y: 106, w: 220, h: 150 },
  { x: 891, y: 260, w: 220, h: 150 },
  { x: 891, y: 414, w: 220, h: 150 },
  { x: 891, y: 568, w: 220, h: 150 },
  { x: 891, y: 762, w: 220, h: 150 },
  { x: 891, y: 916, w: 220, h: 150 },
  { x: 891, y: 1070, w: 220, h: 150 },
  { x: 891, y: 1224, w: 220, h: 150 },
]

const SLOTS_V2_BK10: TemplateSlot[] = [
  { x: 79, y: 399, w: 270, h: 270 },
  { x: 79, y: 688, w: 270, h: 270 },
  { x: 79, y: 990, w: 270, h: 270 },
  { x: 468, y: 399, w: 270, h: 270 },
  { x: 468, y: 688, w: 270, h: 270 },
  { x: 468, y: 990, w: 270, h: 270 },
  { x: 857, y: 399, w: 270, h: 270 },
  { x: 857, y: 668, w: 460, h: 330 },
  { x: 857, y: 990, w: 460, h: 330 },
]

function p2Template(
  id: string,
  shotCount: number,
  sizeKey: string,
  captureW: number,
  captureH: number,
  slots: TemplateSlot[],
  previewScale: number
): Template {
  return {
    id,
    preview: getChooseLayoutPreview(id),
    shotCount,
    sizeKey,
    captureW,
    captureH,
    stageSize: STAGE_V2,
    frameAspectRatio: `${captureW}/${captureH}`,
    width: 1205,
    height: 1795,
    slots,
    shootLayout: { layoutKey: id, captureW, captureH, previewScale },
  }
}

/** 2 號專案：bk01～bk10 */
function buildTemplatesProject2(): Template[] {
  return [
    p2Template('bk01', 9, '4x6', 383, 512, SLOTS_V2_BK01_04, 1.35),
    p2Template('bk02', 9, '4x6', 383, 512, SLOTS_V2_BK01_04, 1.35),
    p2Template('bk03', 9, '4x6', 383, 512, SLOTS_V2_BK01_04, 1.35),
    p2Template('bk04', 9, '4x6', 383, 512, SLOTS_V2_BK01_04, 1.35),
    p2Template('bk05', 4, '4x6_2IN', 460, 330, SLOTS_V2_BK05_08, 1.8),
    p2Template('bk06', 4, '4x6_2IN', 460, 330, SLOTS_V2_BK05_08, 1.8),
    p2Template('bk07', 4, '4x6_2IN', 460, 330, SLOTS_V2_BK05_08, 1.8),
    p2Template('bk08', 4, '4x6_2IN', 460, 330, SLOTS_V2_BK05_08, 1.8),
    p2Template('bk09', 8, '4x6', 220, 150, SLOTS_V2_BK09, 2.5),
    p2Template('bk10', 9, '4x6', 270, 270, SLOTS_V2_BK10, 1.8),
  ]
}

function buildTemplates(): Template[] {
  return projectVariant.value === '2' ? buildTemplatesProject2() : buildTemplatesProject1()
}

// 單例狀態：所有元件共用同一份，測試面板的切換才會生效
const currentScreen = ref<ScreenName>('idle')
const selectedTemplate = shallowRef<Template | null>(null)
const loading = ref(false)
const captureResults = ref<string[]>([])
/** 最近一次寫入 captureResults 時的版型 id（與張數一併用於判斷是否可恢復預覽、略過連拍） */
const captureResultsTemplateId = ref<string | null>(null)
const finalFilePath = ref<string | null>(null)
const finalPreviewUrl = ref<string>('')
const qrImageUrl = ref<string>('')
const qrText = ref<string>('')
const autoPrint = ref(false)
const selectedFilter = ref<FilterId | null>(null)
/** 倒數拍攝過程錄下的影片 blob，合成後上傳並在 QR 頁提供下載 */
const captureVideoBlob = ref<Blob | null>(null)
const finalVideoUrl = ref<string>('')
/** 是否為測試模式（使用測試功能時設定，記錄資料會標記為測試資料） */
const isTestSession = ref(false)
/** 使用者在濾鏡畫面擺放的貼圖，依「格」分開（key = 格索引 0-based） */
const stickersBySlot = ref<Record<number, StickerInstance[]>>({})
const nextStickerId = ref(1)
const templates = computed(() => {
  void projectVariant.value
  return buildTemplates()
})

/** 結果畫面要顯示的圖：有合成圖用合成圖，否則依 env 顯示版型占位圖（左側大圖） */
const resultDisplayUrl = computed(() => {
  if (finalPreviewUrl.value) return finalPreviewUrl.value
  const showPlaceholder = import.meta.env.VITE_RESULT_SHOW_TEMPLATE_PLACEHOLDER
  if (showPlaceholder === '1' || showPlaceholder === 'true') {
    const tpl = selectedTemplate.value
    const id = tpl?.id ?? 'bk01'
    return getQrCodePageFrame(id)
  }
  return ''
})

/** 占位時顯示的 QR 圖與文字（尚無合成圖時用，非同步產生） */
const placeholderQrImageUrl = ref<string>('')
const PLACEHOLDER_QR_TEXT = 'https://example.com/download'
QRCode.toDataURL(PLACEHOLDER_QR_TEXT, { width: 600, margin: 2 })
  .then((url: string) => { placeholderQrImageUrl.value = url })
  .catch(() => {})

/** 結果畫面要顯示的 QR 圖：有合成圖用真實 QR，否則占位時用預設 QR */
const qrDisplayUrl = computed(() => {
  if (finalPreviewUrl.value) return qrImageUrl.value
  const showPlaceholder = import.meta.env.VITE_RESULT_SHOW_TEMPLATE_PLACEHOLDER
  if (showPlaceholder === '1' || showPlaceholder === 'true') return placeholderQrImageUrl.value
  return ''
})

/** 結果畫面要顯示的 QR 文字：有合成圖用真實網址，否則占位時用預設網址 */
const qrDisplayText = computed(() => {
  if (finalPreviewUrl.value) return qrText.value
  const showPlaceholder = import.meta.env.VITE_RESULT_SHOW_TEMPLATE_PLACEHOLDER
  if (showPlaceholder === '1' || showPlaceholder === 'true') return PLACEHOLDER_QR_TEXT
  return ''
})

/** 是否顯示／產生 QR code（預設關閉；設 VITE_QRCODE_ENABLED=1 或 true 才啟用） */
const showQrCode = computed(() => {
  const v = import.meta.env.VITE_QRCODE_ENABLED
  return v === '1' || String(v).toLowerCase() === 'true'
})

const TEST_IMAGE_BASE = '/assets/templates/test'
async function setCaptureResultsFromTestImages() {
  // 標記為測試模式
  isTestSession.value = true
  const tplId = selectedTemplate.value?.id ?? 'bk01'
  try {
    const res = await callHost('load_test_captures', { templateId: tplId }) as { urls?: string[] }
    if (Array.isArray(res.urls) && res.urls.length > 0) {
      captureResults.value = res.urls
      captureResultsTemplateId.value = tplId
      return
    }
  } catch {
    // 無測試存檔時用預設測試圖
  }
  const tpl = selectedTemplate.value
  const n = tpl?.shotCount ?? 4
  captureResults.value = Array.from({ length: n }, (_, i) => `${TEST_IMAGE_BASE}/test${i}.jpg`)
  captureResultsTemplateId.value = tpl?.id ?? null
}

export function usePhotobooth() {

  const setLoading = (show: boolean) => {
    loading.value = show
  }

  function showScreen(name: ScreenName) {
    // #region agent log
    const prev = currentScreen.value
    try {
      const win = typeof window !== 'undefined' ? (window as unknown as { __logPhotobooth?: (p: unknown) => void }) : null
      if (win?.__logPhotobooth) win.__logPhotobooth({ showScreen: name, prev })
    } catch { /* noop */ }
    fetch('http://127.0.0.1:7242/ingest/60461173-9774-483b-a750-822bb1590c42', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'usePhotobooth.ts:showScreen', message: 'showScreen_called', data: { name, prev }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'H2,H3' }) }).catch(() => {})
    // #endregion
    // 切到選版型／待機前先 reset，避免使用者看到預設版型閃現
    if (name === 'template') {
      // #region agent log
      const isTestBeforeReset = isTestSession.value
      fetch('http://127.0.0.1:7242/ingest/60461173-9774-483b-a750-822bb1590c42', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'b8574e' }, body: JSON.stringify({ sessionId: 'b8574e', location: 'usePhotobooth.ts:showScreen:before_reset', message: 'template_screen_isTest_before_reset', data: { name, isTestSession: isTestBeforeReset }, timestamp: Date.now(), hypothesisId: 'H1', runId: 'post-fix' }) }).catch(() => {})
      // #endregion
      const preserveTestSession = isTestSession.value
      resetSession()
      if (preserveTestSession) isTestSession.value = true
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/60461173-9774-483b-a750-822bb1590c42', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'b8574e' }, body: JSON.stringify({ sessionId: 'b8574e', location: 'usePhotobooth.ts:showScreen:after_reset', message: 'template_screen_isTest_after_reset', data: { name, isTestSession: isTestSession.value }, timestamp: Date.now(), hypothesisId: 'H1', runId: 'post-fix' }) }).catch(() => {})
      // #endregion
      notifyBillAcceptorState(false)
    }
    if (name === 'idle') {
      resetSession()
      notifyBillAcceptorState(true)
    }
    currentScreen.value = name
  }

  function selectFilter(id: FilterId | null) {
    selectedFilter.value = id
  }

  function notifyBillAcceptorState(enabled: boolean) {
    try {
      const win = window as unknown as { chrome?: { webview?: { postMessage: (msg: string) => void } } }
      if (win.chrome?.webview) {
        win.chrome.webview.postMessage(
          JSON.stringify({ '@event': 'bill_acceptor_control', enabled })
        )
      }
    } catch {
      // ignore
    }
  }

  function getDefaultTemplateIndex(): number {
    const list = templates.value
    if (!list.length) return 0
    const raw = import.meta.env.VITE_DEFAULT_TEMPLATE_INDEX
    const idx = raw !== undefined && raw !== '' ? parseInt(raw, 10) : 0
    if (Number.isNaN(idx) || idx < 0) return 0
    return Math.min(idx, list.length - 1)
  }

  function selectTemplate(t: Template | null) {
    selectedTemplate.value = t
  }

  function setCaptureResults(urls: string[]) {
    captureResults.value = urls
    captureResultsTemplateId.value = selectedTemplate.value?.id ?? null
  }

  function setCaptureVideoBlob(blob: Blob | null) {
    captureVideoBlob.value = blob
  }

  function addSticker(slotIndex: number, imageUrl: string, x = 0.5, y = 0.5, scale = 1) {
    const id = `sticker-${nextStickerId.value++}`
    const clampedX = Math.max(0, Math.min(1, x))
    const clampedY = Math.max(0, Math.min(1, y))
    const clampedScale = Math.max(0.3, Math.min(3, scale))
    const list = stickersBySlot.value[slotIndex] ?? []
    stickersBySlot.value = {
      ...stickersBySlot.value,
      [slotIndex]: [...list, { id, imageUrl, x: clampedX, y: clampedY, scale: clampedScale }],
    }
  }

  function updateSticker(slotIndex: number, id: string, patch: Partial<Omit<StickerInstance, 'id'>>) {
    const list = stickersBySlot.value[slotIndex] ?? []
    const idx = list.findIndex((s) => s.id === id)
    if (idx === -1) return
    const prev = list[idx]
    if (!prev) return
    const next: StickerInstance = {
      id: prev.id,
      imageUrl: patch.imageUrl ?? prev.imageUrl,
      x: Math.max(0, Math.min(1, patch.x ?? prev.x)),
      y: Math.max(0, Math.min(1, patch.y ?? prev.y)),
      scale: Math.max(0.3, Math.min(3, patch.scale ?? prev.scale)),
    }
    const copy = list.slice()
    copy[idx] = next
    stickersBySlot.value = { ...stickersBySlot.value, [slotIndex]: copy }
  }

  function removeSticker(slotIndex: number, id: string) {
    const list = stickersBySlot.value[slotIndex] ?? []
    const next = list.filter((s) => s.id !== id)
    if (next.length === 0) {
      const { [slotIndex]: _, ...rest } = stickersBySlot.value
      stickersBySlot.value = rest
    } else {
      stickersBySlot.value = { ...stickersBySlot.value, [slotIndex]: next }
    }
  }

  function resetSession() {
    captureResults.value = []
    captureResultsTemplateId.value = null
    finalFilePath.value = null
    finalPreviewUrl.value = ''
    finalVideoUrl.value = ''
    qrImageUrl.value = ''
    qrText.value = ''
    captureVideoBlob.value = null
    selectedTemplate.value = null
    selectedFilter.value = null
    isTestSession.value = false
    stickersBySlot.value = {}
  }

  function setTestSession(isTest: boolean) {
    isTestSession.value = isTest
  }

  function setResultMock() {
    finalPreviewUrl.value = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='
    qrText.value = 'https://example.com/test'
    QRCode.toDataURL('https://example.com/test', { width: 600, margin: 2 })
      .then((url: string) => { qrImageUrl.value = url })
      .catch(() => { qrImageUrl.value = '' })
  }

  /**
   * 從 .env 讀取合成用座標（每格 寬,高,x,y 逗號串接），未設或格式錯誤則用 template.slots
   * 例：VITE_BK01_SYNTHESIS=544,471,43,244,544,471,42,1225,544,471,625,244,544,471,623,1061
   */
  function getSynthesisSlots(tpl: Template): TemplateSlot[] {
    const key = `VITE_${tpl.id.toUpperCase()}_SYNTHESIS` as keyof ImportMetaEnv
    const raw = import.meta.env[key]
    if (typeof raw !== 'string' || !raw.trim()) return tpl.slots
    const parts = raw.split(',').map((s) => parseInt(s.trim(), 10))
    const n = tpl.slots.length
    if (parts.length !== n * 4) return tpl.slots
    const slots: TemplateSlot[] = []
    for (let i = 0; i < n; i++) {
      const w = parts[i * 4 + 0] ?? NaN
      const h = parts[i * 4 + 1] ?? NaN
      const x = parts[i * 4 + 2] ?? NaN
      const y = parts[i * 4 + 3] ?? NaN
      if (Number.isNaN(w) || Number.isNaN(h) || Number.isNaN(x) || Number.isNaN(y)) return tpl.slots
      slots.push({ w, h, x, y })
    }
    return slots
  }

  const FILTER_CSS: Record<FilterId, string> = {
    'baby-pink':
      'brightness(1.17) contrast(0.88) saturate(1.11) hue-rotate(0deg) grayscale(0.14) sepia(0) invert(0) opacity(1) blur(0px) drop-shadow(0px 0px 0px rgba(0, 0, 0, 0))',
    'clear-blue':
      'brightness(1.11) contrast(1.1) saturate(0.87) hue-rotate(16deg) grayscale(0.36) sepia(0.04) invert(0.04) opacity(1) blur(0px) drop-shadow(0px 0px 0px rgba(0, 0, 0, 0))',
    'vintage-retro':
      'brightness(0.78) contrast(1.63) saturate(0.8) hue-rotate(-3.3deg) grayscale(0) sepia(0.39) invert(0.08) opacity(1) blur(0px) drop-shadow(0px 0px 0px rgba(0, 0, 0, 0))',
    'fresh-korean':
      'brightness(1.02) contrast(0.89) saturate(1.1) hue-rotate(-15deg) grayscale(0) sepia(0) invert(0) opacity(1) blur(0px) drop-shadow(0px 0px 0px rgba(0, 0, 0, 0))',
    'soft-milk-tea':
      'brightness(0.95) contrast(1) saturate(1.07) hue-rotate(0deg) grayscale(0.24) sepia(0.21) invert(0.03) opacity(1) blur(0px) drop-shadow(0px 0px 0px rgba(0, 0, 0, 0))',
    'neutral-gray':
      'brightness(1.09) contrast(1.11) saturate(1.84) hue-rotate(-15.7deg) grayscale(0.86) sepia(0.22) invert(0) opacity(1) blur(0px) drop-shadow(0px 0px 0px rgba(0, 0, 0, 0))',
  }

  const FILTER_COLOR_BALANCE: Record<FilterId, { deltaR: number; deltaG: number; deltaB: number }> = {
    'baby-pink': { deltaR: -20.48, deltaG: -11.52, deltaB: 7.68 },
    'clear-blue': { deltaR: -30.72, deltaG: -26.88, deltaB: 30.72 },
    'vintage-retro': { deltaR: 17.92, deltaG: 0, deltaB: -16.64 },
    'fresh-korean': { deltaR: -12.8, deltaG: 0, deltaB: 19.2 },
    'soft-milk-tea': { deltaR: 6.4, deltaG: -7.68, deltaB: 8.96 },
    'neutral-gray': { deltaR: -48.64, deltaG: -15.36, deltaB: 15.36 },
  }

  /** 選中濾鏡對應的 Canvas filter（合成／預覽時套用）；選濾鏡模式一律用 canvas 繪圖 */
  function getFilterCssForCanvas(filterId: FilterId | null): string {
    if (!filterId) return 'none'
    return FILTER_CSS[filterId] ?? 'none'
  }

  /** 若該濾鏡需套色彩平衡則回傳 { deltaR, deltaG, deltaB }，否則 null */
  function getColorBalanceForFilter(
    filterId: FilterId | null
  ): { deltaR: number; deltaG: number; deltaB: number } | null {
    if (!filterId) return null
    return FILTER_COLOR_BALANCE[filterId] ?? null
  }

  /** 色彩平衡（如 PS 青↔紅、洋紅↔綠、黃↔藍），直接修改 ImageData */
  function applyColorBalance(
    imageData: ImageData,
    deltaR: number,
    deltaG: number,
    deltaB: number
  ): void {
    const data = imageData.data
    const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
    for (let i = 0; i < data.length; i += 4) {
      data[i] = clamp((data[i] ?? 0) + deltaR)
      data[i + 1] = clamp((data[i + 1] ?? 0) + deltaG)
      data[i + 2] = clamp((data[i + 2] ?? 0) + deltaB)
    }
  }

  /** 在 ctx 上繪製完整合成（照片格＋濾鏡、外框、貼圖）；與 buildFinalOutput 共用 */
  async function renderComposite(
    ctx: CanvasRenderingContext2D,
    tpl: Template,
    options: RenderCompositeOptions
  ): Promise<void> {
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    const {
      captureUrls: rawUrls,
      filterId,
      stickers,
      includeFrame = true,
      includeStickers = true,
    } = options
    const synthesisSlots = getSynthesisSlots(tpl)
    const captureUrls = expandCaptureUrlsForSlots(rawUrls, synthesisSlots.length)
    const captureCycleLen = rawUrls.length
    const filterCss = getFilterCssForCanvas(filterId)

    for (let i = 0; i < Math.min(captureUrls.length, synthesisSlots.length); i++) {
      const url = captureUrls[i]
      const slot = synthesisSlots[i]
      if (url === undefined || url === '' || slot === undefined) continue
      const img = await loadCachedImage(url)
      ctx.save()
      ctx.beginPath()
      ctx.rect(slot.x, slot.y, slot.w, slot.h)
      ctx.clip()
      ctx.filter = filterCss
      const scale = Math.max(slot.w / img.naturalWidth, slot.h / img.naturalHeight)
      const drawW = img.naturalWidth * scale
      const drawH = img.naturalHeight * scale
      const dx = slot.x + (slot.w - drawW) / 2
      const dy = slot.y + (slot.h - drawH) / 2
      ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, dx, dy, drawW, drawH)
      const balance = getColorBalanceForFilter(filterId)
      if (balance) {
        const sx = Math.round(slot.x)
        const sy = Math.round(slot.y)
        const sw = Math.max(1, Math.round(slot.w))
        const sh = Math.max(1, Math.round(slot.h))
        const imageData = ctx.getImageData(sx, sy, sw, sh)
        applyColorBalance(imageData, balance.deltaR, balance.deltaG, balance.deltaB)
        ctx.putImageData(imageData, sx, sy)
      }
      ctx.restore()
    }

    if (includeFrame) {
      const qrBgUrl = getQrCodePageFrame(tpl.id)
      try {
        const bgImg = await loadCachedImage(qrBgUrl)
        ctx.drawImage(bgImg, 0, 0, tpl.width, tpl.height, 0, 0, tpl.width, tpl.height)
      } catch {
        // 無外框圖時不覆蓋
      }
    }

    if (includeStickers && isStickerEnabledEnv()) {
      const SLOT_STICKER_WIDTH_RATIO = 0.2
      for (let i = 0; i < synthesisSlots.length; i++) {
        const slot = synthesisSlots[i]
        if (!slot) continue
        const stickerSlot = captureCycleLen > 0 ? i % captureCycleLen : i
        const slotStickers = stickers[stickerSlot] ?? []
        for (const st of slotStickers) {
          try {
            const stImg = await loadCachedImage(st.imageUrl)
            const baseW = slot.w * SLOT_STICKER_WIDTH_RATIO * st.scale
            const aspect =
              stImg.naturalWidth > 0 && stImg.naturalHeight > 0
                ? stImg.naturalHeight / stImg.naturalWidth
                : 1
            const stDrawW = baseW
            const stDrawH = baseW * aspect
            const centerX = slot.x + slot.w * st.x
            const centerY = slot.y + slot.h * st.y
            const stDx = centerX - stDrawW / 2
            const stDy = centerY - stDrawH / 2
            ctx.drawImage(
              stImg,
              0,
              0,
              stImg.naturalWidth,
              stImg.naturalHeight,
              stDx,
              stDy,
              stDrawW,
              stDrawH
            )
          } catch {
            // 單張貼圖失敗時略過
          }
        }
      }
    }
  }

  function getPrintingShowSec(): number {
    const raw = import.meta.env.VITE_PRINTING_SHOW_SEC
    if (raw === undefined || raw === '') return 20
    const n = parseInt(raw, 10)
    return Number.isNaN(n) || n < 1 ? 20 : Math.min(120, n)
  }

  function getSkipPrint(): boolean {
    const v = import.meta.env.VITE_SKIP_PRINT
    return v === '1' || String(v).toLowerCase() === 'true'
  }

  function getReceiptAmount(): string {
    const v = import.meta.env.VITE_RECEIPT_AMOUNT
    return typeof v === 'string' && v !== '' ? v : '0'
  }

  function getLogPrintRecordWhenSkip(): boolean {
    const v = import.meta.env.VITE_LOG_PRINT_RECORD_WHEN_SKIP
    return v === '1' || String(v).toLowerCase() === 'true'
  }

  function getProjectName(): string {
    const v = import.meta.env.VITE_PROJECT_NAME
    return typeof v === 'string' ? v : ''
  }

  function getMachineName(): string {
    const v = import.meta.env.VITE_MACHINE_NAME
    return typeof v === 'string' ? v : ''
  }

  function getIsTestForPrint(): boolean {
    if (isTestSession.value) return true
    const v = import.meta.env.VITE_TEST_FAST_COUNTDOWN
    return v === '1' || String(v).toLowerCase() === 'true'
  }

  function getFinalFileName(): string {
    const path = finalFilePath.value
    if (!path) return ''
    return path.replace(/^.*[/\\]/, '') || ''
  }

  /** 送 DNP 列印 → 顯示列印等待 N 秒 → 回待機 */
  function goToPrintingThenIdle(options?: { alreadyOnProcessing?: boolean; copies?: number }) {
    const printingSec = getPrintingShowSec()
    const skipPrint = getSkipPrint()
    const copies = options?.copies ?? 1
    if (!options?.alreadyOnProcessing) {
      showScreen('processing')
    }
    if (!finalFilePath.value) {
      setTimeout(() => {
        autoPrint.value = false
        resetSession()
        showScreen('idle')
      }, printingSec * 1000)
      return
    }
    if (skipPrint) {
      if (getLogPrintRecordWhenSkip()) {
        callHost('log_print_record', {
          templateName: selectedTemplate.value?.id ?? 'unknown',
          printTime: new Date().toISOString(),
          amount: getReceiptAmount(),
          projectName: getProjectName(),
          machineName: getMachineName(),
          copies: 1,
          fileName: getFinalFileName(),
          isTest: getIsTestForPrint(),
        }).finally(() => {
          setTimeout(() => {
            autoPrint.value = false
            resetSession()
            showScreen('idle')
          }, printingSec * 1000)
        })
      } else {
        setTimeout(() => {
          autoPrint.value = false
          resetSession()
          showScreen('idle')
        }, printingSec * 1000)
      }
      return
    }
    callHost('print_hotfolder', {
      filePath: finalFilePath.value,
      sizeKey: selectedTemplate.value?.sizeKey ?? '4x6',
      copies,
    })
      .then(() =>
        callHost('log_print_record', {
          templateName: selectedTemplate.value?.id ?? 'unknown',
          printTime: new Date().toISOString(),
          amount: getReceiptAmount(),
          projectName: getProjectName(),
          machineName: getMachineName(),
          copies,
          fileName: getFinalFileName(),
          isTest: getIsTestForPrint(),
        })
      )
      .finally(() => {
        setTimeout(() => {
          autoPrint.value = false
          resetSession()
          showScreen('idle')
        }, printingSec * 1000)
      })
  }

  /** 從 C# 讀取相機原圖 URL（https://photos/…），供合成／濾鏡預覽使用 */
  async function reloadCaptureResultsFromHost(): Promise<boolean> {
    try {
      const res = (await callHost('load_captures', {})) as { urls?: string[] }
      if (Array.isArray(res.urls) && res.urls.length > 0 && res.urls.some((u) => !!u)) {
        clearImageLoadCache()
        captureResults.value = res.urls
        captureResultsTemplateId.value = selectedTemplate.value?.id ?? null
        return true
      }
    } catch {
      // ignore
    }
    return false
  }

  async function buildFinalOutput(options?: { alreadyOnProcessing?: boolean }) {
    const tpl = selectedTemplate.value
    if (!tpl) return
    const reloaded = await reloadCaptureResultsFromHost()
    if (!reloaded && !captureResults.value.length) return
    try {
      const canvas = document.createElement('canvas')
      canvas.width = tpl.width
      canvas.height = tpl.height
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      await renderComposite(ctx, tpl, {
        captureUrls: [...captureResults.value],
        filterId: selectedFilter.value,
        stickers: stickersBySlot.value,
        includeFrame: true,
        includeStickers: true,
      })

      const dataUrl = canvas.toDataURL('image/jpeg', getOutputJpegQuality())
      canvas.width = 1
      canvas.height = 1
      const saveRes = await callHost('save_image', { imageData: dataUrl }) as { filePath?: string }
      const filePath = saveRes.filePath ?? ''
      finalFilePath.value = filePath
      finalPreviewUrl.value = dataUrl

      callHost('result_image_ready', {
        filePath,
        imageData: dataUrl,
        sizeKey: tpl.sizeKey ?? '4x6',
      }).catch(() => {})

      if (showQrCode.value) {
        const basePage =
          typeof import.meta.env.VITE_DOWNLOAD_PAGE_BASE_URL === 'string' &&
          import.meta.env.VITE_DOWNLOAD_PAGE_BASE_URL
            ? import.meta.env.VITE_DOWNLOAD_PAGE_BASE_URL.replace(/\/$/, '')
            : ''

        let imageUrl = ''
        try {
          const uploadRes = await callHost('upload_file', { filePath }) as { url?: string }
          imageUrl = uploadRes?.url ?? ''
        } catch (e) {
          console.error('[拍貼機] 上傳合成圖失敗', e)
        }
        let videoUrl = ''
        if (captureVideoBlob.value) {
          const videoDataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(captureVideoBlob.value!)
          })
          try {
            const videoRes = await callHost('upload_video', { videoData: videoDataUrl }) as {
              url?: string
            }
            videoUrl = videoRes?.url ?? ''
            finalVideoUrl.value = videoUrl
          } catch (e) {
            console.error('[拍貼機] 上傳影片失敗', e)
          }
        }

        const qrUrl = basePage
          ? `${basePage}?img=${encodeURIComponent(imageUrl)}${videoUrl ? `&video=${encodeURIComponent(videoUrl)}` : ''}`
          : imageUrl || 'https://example.com/download'
        qrText.value = qrUrl
        QRCode.toDataURL(qrUrl, { width: 600, margin: 2 })
          .then((url) => {
            qrImageUrl.value = url
          })
          .catch(() => {
            qrImageUrl.value = ''
          })
        showScreen('result')
      } else {
        goToPrintingThenIdle({ alreadyOnProcessing: options?.alreadyOnProcessing })
      }

      const isTestMode = (v: string | undefined) => v === '1' || String(v).toLowerCase() === 'true'
      if (
        !isTestMode(import.meta.env.VITE_TEST_FAST_COUNTDOWN) &&
        isTestMode(import.meta.env.VITE_LOG_USAGE)
      ) {
        try {
          await callHost('append_usage_log', {
            folder: 'daily report',
            time: new Date().toISOString(),
            templateId: tpl.id,
            projectName: import.meta.env.VITE_PROJECT_NAME ?? '',
            isTest: isTestSession.value,
          })
        } catch {
          // ignore
        }
      }
    } catch (e) {
      console.error('[拍貼機] 合成失敗', e)
      if (!showQrCode.value) {
        const printingSec = getPrintingShowSec()
        setTimeout(() => {
          autoPrint.value = false
          resetSession()
          showScreen('idle')
        }, printingSec * 1000)
      }
    }
  }

  function runDevStartPage() {
    const filterDirect = String(import.meta.env.VITE_TEST_FILTER_DIRECT ?? '').trim()
    if (filterDirect === '1' || filterDirect.toLowerCase() === 'true') {
      showScreen('shoot')
      return
    }
    const raw = import.meta.env.VITE_DEV_START_PAGE
    const n = raw !== undefined && raw !== '' ? parseInt(raw, 10) : null
    if (n == null || n < 0 || n > 4) return
    const names: ScreenName[] = ['idle', 'template', 'shoot', 'result', 'processing']
    const name = names[n]
    if (name !== undefined) showScreen(name)
  }

  return {
    currentScreen,
    selectedTemplate,
    selectedFilter,
    loading,
    captureResults,
    captureResultsTemplateId,
    finalFilePath,
    finalPreviewUrl,
    resultDisplayUrl,
    finalVideoUrl,
    qrImageUrl,
    qrText,
    qrDisplayUrl,
    qrDisplayText,
    showQrCode,
    autoPrint,
    isTestSession,
    templates,
    setLoading,
    showScreen,
    getDefaultTemplateIndex,
    selectTemplate,
    selectFilter,
    getFilterCssForCanvas,
    getColorBalanceForFilter,
    applyColorBalance,
    setCaptureResults,
    setCaptureVideoBlob,
    resetSession,
    buildFinalOutput,
    reloadCaptureResultsFromHost,
    renderComposite,
    goToPrintingThenIdle,
    runDevStartPage,
    setResultMock,
    callHost,
    setCaptureResultsFromTestImages,
    setTestSession,
    // 貼圖相關（依格分開，key = 格索引 0-based）
    stickersBySlot,
    addSticker,
    updateSticker,
    removeSticker,
    /** 合成用格位（與 buildFinalOutput 一致），供預覽區對齊 slot 比例用 */
    getSynthesisSlots,
  }
}
