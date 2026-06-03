import { ref, computed } from 'vue'
import chooseLayoutBk01 from '@/assets/templates/chooselayout/bk01.png?url'
import chooseLayoutBk02 from '@/assets/templates/chooselayout/bk02.png?url'

export type ProjectVariant = '1' | '2'

const STORAGE_KEY = 'photobooth_project_variant'

/** 單例：1 = 預設專案，2 = Mount-Hua 2 號素材 */
const projectVariant = ref<ProjectVariant>(
  typeof localStorage !== 'undefined' &&
    (localStorage.getItem(STORAGE_KEY) === '1' || localStorage.getItem(STORAGE_KEY) === '2')
    ? (localStorage.getItem(STORAGE_KEY) as ProjectVariant)
    : '1'
)

const PROJECT1_PREVIEW: Record<string, string> = {
  bk01: chooseLayoutBk01,
  bk02: chooseLayoutBk02,
}

function p2(folder: string, file: string): string {
  return `/assets/templates/${folder}/2/${file}`
}

export function useProjectVariant() {
  const isProject2 = computed(() => projectVariant.value === '2')

  function setProjectVariant(variant: ProjectVariant) {
    projectVariant.value = variant
    try {
      localStorage.setItem(STORAGE_KEY, variant)
    } catch {
      // ignore
    }
  }

  /** 在專案 1 ↔ 專案 2 之間切換 */
  function toggleProjectVariant(): ProjectVariant {
    const next: ProjectVariant = projectVariant.value === '2' ? '1' : '2'
    setProjectVariant(next)
    return next
  }

  function getChooseLayoutPreview(templateId: string): string {
    if (projectVariant.value === '2') {
      return p2('chooselayout', `${templateId}.jpg`)
    }
    return PROJECT1_PREVIEW[templateId] ?? `/assets/templates/chooselayout/${templateId}.png`
  }

  function getChooseLayoutBackground(): string {
    return projectVariant.value === '2'
      ? p2('chooselayout', '底圖介面.png')
      : '/assets/templates/chooselayout/background.png'
  }

  function getChooseLayoutMsgbox(file: 'window.png' | 'confirm.png' | 'repeat.png'): string {
    return projectVariant.value === '2'
      ? p2('chooselayout', `msgbox/${file}`)
      : `/assets/templates/chooselayout/msgbox/${file}`
  }

  function getIdleCoverSlides(): string[] {
    if (projectVariant.value === '2') {
      return ['/assets/templates/IdlePage/cover/2/cover.png']
    }
    return ['cover/cover.png', 'cover/cover_2.png']
  }

  function getIdleBasePath(): string {
    return '/assets/templates/IdlePage'
  }

  function getQrCodePageBackground(): string {
    return projectVariant.value === '2'
      ? p2('QRcodePage', 'QR底圖.png')
      : '/assets/templates/QRcodePage/background.png'
  }

  function getQrCodePageFrame(templateId: string): string {
    return projectVariant.value === '2'
      ? p2('QRcodePage', `${templateId}.png`)
      : `/assets/templates/QRcodePage/${templateId}.png`
  }

  function getQrCodePagePrintButton(): string {
    return projectVariant.value === '2'
      ? p2('QRcodePage', '列印按鈕.png')
      : '/assets/templates/QRcodePage/printbutton.png'
  }

  function getNoQrCodePageBackground(): string {
    return projectVariant.value === '2'
      ? p2('NoQRcodePage', 'QR底圖.png')
      : '/assets/templates/NoQRcodePage/background.png'
  }

  function getNoQrCodePageButton(name: 'cancelbutton.png' | 'printbutton.png'): string {
    if (projectVariant.value === '2') {
      return name === 'printbutton.png'
        ? p2('NoQRcodePage', '列印按鈕.png')
        : p2('NoQRcodePage', name)
    }
    return `/assets/templates/NoQRcodePage/${name}`
  }

  function getUploadPageBackground(): string {
    return `/assets/templates/uploadPage/${projectVariant.value === '2' ? '2/' : ''}background.png`
  }

  function getUploadPageGif(): string {
    return projectVariant.value === '2'
      ? p2('uploadPage', 'uploadGif.gif')
      : '/assets/templates/uploadPage/uploadGif.gif'
  }

  function getPrintPageBackground(): string {
    return `/assets/templates/printPage/${projectVariant.value === '2' ? '2/' : ''}background.png`
  }

  function getPrintPageGif(): string {
    return projectVariant.value === '2'
      ? p2('printPage', 'printGif.gif')
      : '/assets/templates/printPage/printGif.gif'
  }

  /** @param isFilterMode 是否為濾鏡／貼圖確認頁（ScreenShoot 傳入 showFilterOptions） */
  function getShootPageBackground(isFilterMode: boolean): string {
    if (projectVariant.value === '2') {
      return p2('ShootPage', '底圖介面.png')
    }
    return isFilterMode
      ? '/assets/templates/ShootPage/Filters_background.png'
      : '/assets/templates/ShootPage/Shoot_background.png'
  }

  function getShootPageAsset(file: string): string {
    return projectVariant.value === '2'
      ? p2('ShootPage', file)
      : `/assets/templates/ShootPage/${file}`
  }

  function getShootFrameUrl(templateId: string, viewIndex: number): string {
    const num = String(viewIndex + 1).padStart(2, '0')
    if (projectVariant.value === '2') {
      return p2('ShootPage', `${templateId}/${templateId}_view${num}.png`)
    }
    return `/assets/templates/ShootPage/${templateId}/${templateId}_view${num}.png`
  }

  function getShootTexUrl(n: number): string {
    return getShootPageAsset(`tex${n}.png`)
  }

  return {
    projectVariant,
    isProject2,
    setProjectVariant,
    toggleProjectVariant,
    getChooseLayoutPreview,
    getChooseLayoutBackground,
    getChooseLayoutMsgbox,
    getIdleCoverSlides,
    getIdleBasePath,
    getQrCodePageBackground,
    getQrCodePageFrame,
    getQrCodePagePrintButton,
    getNoQrCodePageBackground,
    getNoQrCodePageButton,
    getUploadPageBackground,
    getUploadPageGif,
    getPrintPageBackground,
    getPrintPageGif,
    getShootPageBackground,
    getShootPageAsset,
    getShootFrameUrl,
    getShootTexUrl,
  }
}
