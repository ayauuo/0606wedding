<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import type { Template } from '@/types/photobooth'
import { usePhotobooth } from '@/composables/usePhotobooth'
import { useProjectVariant } from '@/composables/useProjectVariant'
import { unlockCountdownAudio } from '@/composables/useTakePicture'

const { templates, selectedTemplate, selectTemplate, showScreen } = usePhotobooth()
const {
  getChooseLayoutBackground,
  getChooseLayoutMsgbox,
  projectVariant,
  isProject2,
} = useProjectVariant()

const templateScreenStyle = computed(() => {
  void projectVariant.value
  return {
    backgroundImage: `url('${getChooseLayoutBackground()}')`,
  }
})
const msgboxWindowUrl = computed(() => {
  void projectVariant.value
  return getChooseLayoutMsgbox('window.png')
})
const msgboxConfirmUrl = computed(() => {
  void projectVariant.value
  return getChooseLayoutMsgbox('confirm.png')
})
const msgboxRepeatUrl = computed(() => {
  void projectVariant.value
  return getChooseLayoutMsgbox('repeat.png')
})

const msgboxVisible = ref(false)
const templateListRef = ref<HTMLElement | null>(null)
/** 橫向版型列的捲動容器；需用非 passive 的 wheel 才能把垂直滾輪轉成左右捲動 */
const templateScrollRef = ref<HTMLElement | null>(null)
const hasSelection = computed(() => !!selectedTemplate.value)

/** 版型顯示順序：1 號專案 bk01～bk06；2 號專案 bk01、bk02 */
const orderedTemplates = computed(() => {
  void projectVariant.value
  const order = isProject2.value
    ? (['bk01', 'bk02'] as const)
    : (['bk01', 'bk02', 'bk03', 'bk04', 'bk05', 'bk06'] as const)
  const byId = new Map(templates.value.map((t) => [t.id, t] as const))
  const ordered = order.map((id) => byId.get(id)).filter((t): t is Template => !!t)
  const orderSet = new Set<string>(order)
  const rest = templates.value.filter((t) => !orderSet.has(t.id))
  return [...ordered, ...rest]
})

function getTemplateCardClass(t: Template) {
  return `screen-template__card--${t.id}`
}

function onCardClick(t: Template) {
  if (selectedTemplate.value?.id === t.id) {
    msgboxVisible.value = true
    return
  }
  selectTemplate(t)
}

function confirmTemplate() {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/60461173-9774-483b-a750-822bb1590c42', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'ScreenTemplate.vue:confirmTemplate', message: 'confirmTemplate_called', data: { hasSelection: !!selectedTemplate.value }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'H1' }) }).catch(() => {})
  // #endregion
  unlockCountdownAudio()
  msgboxVisible.value = false
  // 立即切到拍照頁；若仍用 nextTick 導致未切換，改同步呼叫確保進入拍攝畫面
  showScreen('shoot')
}

function repeatChoose() {
  msgboxVisible.value = false
}

watch(selectedTemplate, (v) => {
  if (!v) msgboxVisible.value = false
})

function onTemplateScrollWheel(e: WheelEvent) {
  const el = templateScrollRef.value
  if (!el || el.scrollWidth <= el.clientWidth) return
  const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
  if (horizontal === 0) return
  el.scrollLeft += horizontal
  e.preventDefault()
}

let templateScrollEl: HTMLElement | null = null
function scrollTemplateStripToStart() {
  const el = templateScrollRef.value
  if (el) el.scrollLeft = 0
}

onMounted(() => {
  templateScrollEl = templateScrollRef.value
  templateScrollEl?.addEventListener('wheel', onTemplateScrollWheel, { passive: false })
  scrollTemplateStripToStart()
})

onUnmounted(() => {
  templateScrollEl?.removeEventListener('wheel', onTemplateScrollWheel)
  templateScrollEl = null
})

watch(
  () => orderedTemplates.value.length,
  () => {
    nextTick(() => scrollTemplateStripToStart())
  }
)

// 相機改由 ScreenShoot.vue 進入拍照頁時才啟動，不在此預熱
</script>

<template>
  <div
    class="screen screen--template"
    role="region"
    aria-label="選版型畫面"
    :style="templateScreenStyle"
  >
    <!-- 標題已繪於 background.png（選擇版型），不重複疊字 -->
    <h1 class="screen-template__title" aria-hidden="true">選擇版型</h1>
    <div ref="templateScrollRef" class="screen-template__scroll">
      <!-- <button
        v-show="hasSelection"
        type="button"
        class="screen-template__start-btn"
        @click="confirmTemplate"
      >
        開始拍照
      </button> -->
      <div class="screen-template__row-wrap">
        <div
          ref="templateListRef"
          class="screen-template__grid"
          :class="{
            'has-selection': hasSelection,
            'screen-template__grid--many': orderedTemplates.length > 2,
          }"
        >
          <button
            v-for="(t, index) in orderedTemplates"
            :key="t.id"
            type="button"
            class="screen-template__card"
            :class="[getTemplateCardClass(t), { 'is-selected': selectedTemplate?.id === t.id }]"
            @click="onCardClick(t)"
          >
            <div class="screen-template__card-preview">
              <img
                class="screen-template__card-img"
                :src="t.preview"
                :alt="t.id"
                loading="lazy"
              />
            </div>
          </button>
        </div>
      </div>
    </div>
    <div
      class="screen-template__msgbox"
      :class="{ 'screen-template__msgbox--hidden': !msgboxVisible }"
      role="dialog"
      aria-modal="true"
      aria-label="確認版型"
    >
      <div class="screen-template__msgbox-backdrop" @click="msgboxVisible = false" />
      <div class="screen-template__msgbox-window">
        <img
          class="screen-template__msgbox-window-bg"
          :src="msgboxWindowUrl"
          alt=""
        />
        <div class="screen-template__msgbox-btns">
          <button
            type="button"
            class="screen-template__msgbox-btn screen-template__msgbox-btn--confirm"
            aria-label="確認"
            @click="confirmTemplate"
          >
            <img :src="msgboxConfirmUrl" alt="確認" />
          </button>
          <button
            type="button"
            class="screen-template__msgbox-btn screen-template__msgbox-btn--repeat"
            aria-label="重選"
            @click="repeatChoose"
          >
            <img :src="msgboxRepeatUrl" alt="重選" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

/* 底圖已含右下角單位名稱，避免與全站 Footer 重疊 */
:global(.photobooth-app:has(.screen--template.active) .app-footer) {
  display: none;
}

.screen--template {
  display: block;
  position: relative;
  min-height: 100vh;
  padding: 0;
  overflow: hidden;
  background-color: #4a1520;
  background-repeat: no-repeat;
  background-position: center center;
  background-size: cover;
}

/* 右側版型區：對齊設計稿「選擇版型」標題下方、人物右側 */
.screen-template__scroll {
  position: absolute;
  left: 32%;
  right: 3%;
  top: 14%;
  bottom: 11%;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
  padding: 0 clamp(8px, 1vw, 16px);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  min-width: 0;
  z-index: 1;
}

.screen-template__row-wrap {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  width: max-content;
  min-width: 100%;
  height: 100%;
}

.screen-template__title {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.screen-template__start-btn {
  position: absolute;
  top: 140px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 5;
  padding: 16px 48px;
  font-size: 28px;
  font-weight: bold;
  color: #fff;
  background: var(--accent, #ff4d4f);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);

  &:hover {
    opacity: 0.95;
  }
}

.screen-template__grid {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap: clamp(10px, 1.6vw, 28px);
  width: max-content;
  padding: 0 clamp(4px, 0.5vw, 12px);

  &.has-selection :deep(.screen-template__card:not(.is-selected)) {
    transform: scale(0.96);
    opacity: 0.88;
  }

  /* 六個版型時略縮卡片，避免左側被 overflow 裁切 */
  &.screen-template__grid--many .screen-template__card-preview {
    width: clamp(150px, 13.5vw, 260px);
  }
}

.screen-template__card {
  border: none;
  border-radius: $radius-xl;
  background: transparent;
  padding: 0;
  cursor: pointer;
  transition: transform 0.3s ease;
  z-index: 1;
  flex: 0 0 auto;
  align-self: center;
  width: fit-content;
  height: fit-content;
  display: block;

  &.is-selected {
    transform: scale(1.04);
    z-index: 10;
    position: relative;

    .screen-template__card-preview {
      outline: 5px solid var(--accent, #ff4d4f);
      outline-offset: 3px;
      border-radius: $radius-lg;
    }
  }
}

.screen-template__card-preview {
  display: block;
  line-height: 0;
  transition: transform 0.3s ease;
  width: clamp(240px, 19.5vw, 380px);
  height: auto;
}

.screen-template__card-img {
  width: 100%;
  height: auto;
  max-height: min(78vh, 820px);
  display: block;
}

.screen-template__msgbox {
  position: absolute;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;

  &.screen-template__msgbox--hidden {
    display: none !important;
  }
}

.screen-template__msgbox-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
}

.screen-template__msgbox-window {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.screen-template__msgbox-window-bg {
  display: block;
  max-width: 100%;
  height: auto;
}

.screen-template__msgbox-btns {
  display: flex;
  gap: $spacing-5xl;
  justify-content: center;
  align-items: center;
  margin-top: -150px;
}

.screen-template__msgbox-btn {
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  display: block;
  transition: opacity 0.2s;

  img {
    display: block;
    width: auto;
    height: auto;
    max-height: 80px;
  }

  &:hover {
    opacity: 0.9;
  }
}
</style>
