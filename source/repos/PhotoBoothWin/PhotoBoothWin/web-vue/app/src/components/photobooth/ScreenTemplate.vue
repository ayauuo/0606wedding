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
  getChooseLayoutLabelImage,
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
const hScrollRef = ref<HTMLElement | null>(null)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)
const suppressCardClick = ref(false)
let stripResizeObs: ResizeObserver | null = null

const touchStrip = {
  active: false,
  startX: 0,
  startScroll: 0,
  moved: false,
}

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

function updateScrollButtons() {
  const el = hScrollRef.value
  if (!el) {
    canScrollLeft.value = false
    canScrollRight.value = false
    return
  }
  const max = el.scrollWidth - el.clientWidth
  if (max <= 1) {
    canScrollLeft.value = false
    canScrollRight.value = false
    return
  }
  canScrollLeft.value = el.scrollLeft > 2
  canScrollRight.value = el.scrollLeft < max - 2
}

function onStripScroll() {
  updateScrollButtons()
}

function scrollStrip(direction: -1 | 1) {
  const el = hScrollRef.value
  if (!el) return
  const step = Math.round(Math.max(380, el.clientWidth * 0.48))
  el.scrollBy({ left: direction * step, behavior: 'smooth' })
}

function onStripTouchStart(e: TouchEvent) {
  const touch = e.touches[0]
  if (!touch) return
  const el = hScrollRef.value
  if (!el) return
  touchStrip.active = true
  touchStrip.startX = touch.clientX
  touchStrip.startScroll = el.scrollLeft
  touchStrip.moved = false
}

function onStripTouchMove(e: TouchEvent) {
  if (!touchStrip.active) return
  const touch = e.touches[0]
  if (!touch) return
  const el = hScrollRef.value
  if (!el) return
  const dx = touch.clientX - touchStrip.startX
  if (Math.abs(dx) > 6) {
    touchStrip.moved = true
    e.preventDefault()
  }
  el.scrollLeft = touchStrip.startScroll - dx
}

function onStripTouchEnd() {
  if (touchStrip.moved) {
    suppressCardClick.value = true
    setTimeout(() => {
      suppressCardClick.value = false
    }, 100)
  }
  touchStrip.active = false
  touchStrip.moved = false
}

function onTemplatesWheel(e: WheelEvent) {
  const el = hScrollRef.value
  if (!el) return
  if (e.ctrlKey) return
  const max = el.scrollWidth - el.clientWidth
  if (max <= 0) return
  const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
  if (horizontal === 0) return
  const sl = el.scrollLeft
  if (horizontal > 0 && sl >= max - 0.5) return
  if (horizontal < 0 && sl <= 0.5) return
  e.preventDefault()
  el.scrollLeft = sl + horizontal
}

function onCardClick(t: Template) {
  if (suppressCardClick.value) return
  if (selectedTemplate.value?.id === t.id) {
    msgboxVisible.value = true
    return
  }
  selectTemplate(t)
}

function confirmTemplate() {
  unlockCountdownAudio()
  msgboxVisible.value = false
  showScreen('shoot')
}

function repeatChoose() {
  msgboxVisible.value = false
}

watch(selectedTemplate, (v) => {
  if (!v) msgboxVisible.value = false
})

watch(orderedTemplates, () => {
  nextTick(() => {
    const el = hScrollRef.value
    if (el) el.scrollLeft = 0
    updateScrollButtons()
  })
})

onMounted(() => {
  nextTick(() => {
    const el = hScrollRef.value
    el?.addEventListener('wheel', onTemplatesWheel, { passive: false })
    updateScrollButtons()
    if (typeof ResizeObserver !== 'undefined' && el) {
      stripResizeObs = new ResizeObserver(() => updateScrollButtons())
      stripResizeObs.observe(el)
    }
    window.addEventListener('resize', updateScrollButtons)
  })
})

onUnmounted(() => {
  const el = hScrollRef.value
  el?.removeEventListener('wheel', onTemplatesWheel)
  stripResizeObs?.disconnect()
  stripResizeObs = null
  window.removeEventListener('resize', updateScrollButtons)
})
</script>

<template>
  <div
    class="screen screen--template"
    role="region"
    aria-label="選版型畫面"
    :style="templateScreenStyle"
  >
    <h1 class="screen-template__title" aria-hidden="true">選擇版型</h1>
    <div class="screen-template__scroll">
      <div class="screen-template__strip">
        <button
          type="button"
          class="screen-template__scroll-btn screen-template__scroll-btn--prev"
          aria-label="向左顯示更多版型"
          :disabled="!canScrollLeft"
          @click.stop="scrollStrip(-1)"
        >
          ‹
        </button>
        <div
          ref="hScrollRef"
          class="screen-template__h-scroll"
          role="list"
          aria-label="版型列表；可手指左右滑動、或使用左右按鈕檢視"
          @scroll.passive="onStripScroll"
          @touchstart.passive="onStripTouchStart"
          @touchmove="onStripTouchMove"
          @touchend="onStripTouchEnd"
          @touchcancel="onStripTouchEnd"
        >
          <div
            class="screen-template__row"
            :class="{ 'has-selection': hasSelection }"
          >
            <div
              v-for="t in orderedTemplates"
              :key="t.id"
              class="screen-template__column"
              role="listitem"
              @click="onCardClick(t)"
            >
              <div class="screen-template__label-slot">
                <img
                  class="screen-template__label-img"
                  :src="getChooseLayoutLabelImage(t.id)"
                  :alt="`${t.id} 版型標籤`"
                  loading="lazy"
                  draggable="false"
                />
              </div>
              <div class="screen-template__card-slot">
                <div
                  class="screen-template__card"
                  :class="[getTemplateCardClass(t), { 'is-selected': selectedTemplate?.id === t.id }]"
                >
                  <div class="screen-template__card-preview">
                    <img
                      class="screen-template__card-img"
                      :src="t.preview"
                      :alt="t.id"
                      loading="lazy"
                      draggable="false"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <button
          type="button"
          class="screen-template__scroll-btn screen-template__scroll-btn--next"
          aria-label="向右顯示更多版型"
          :disabled="!canScrollRight"
          @click.stop="scrollStrip(1)"
        >
          ›
        </button>
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

:global(.photobooth-app:has(.screen--template.active) .app-footer) {
  display: none;
}

.screen--template {
  display: block;
  position: relative;
  min-height: 100vh;
  padding: 0;
  overflow: hidden;
  touch-action: pan-x pan-y;
  background-color: #4a1520;
  background-repeat: no-repeat;
  background-position: center center;
  background-size: cover;
}

.screen-template__scroll {
  position: absolute;
  left: 4%;
  right: 4%;
  top: 14%;
  bottom: 5%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 0;
  z-index: 1;
}

.screen-template__strip {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: clamp(10px, 1.4vw, 16px);
  width: 100%;
  min-width: 0;
}

.screen-template__scroll-btn {
  flex-shrink: 0;
  width: clamp(44px, 5.5vw, 60px);
  min-height: min(220px, 36vh);
  padding: 0;
  border: none;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.35);
  color: #4a3428;
  font-size: clamp(28px, 4vw, 40px);
  line-height: 1;
  cursor: pointer;
  transition: opacity 0.2s, background 0.2s;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.55);
  }

  &:disabled {
    opacity: 0.25;
    cursor: default;
  }
}

.screen-template__h-scroll {
  flex: 1;
  min-width: 0;
  min-height: 100%;
  display: flex;
  align-items: center;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
  touch-action: pan-x;
  padding-bottom: 8px;
  padding-inline: clamp(6px, 1.2vw, 16px);
  scroll-padding-inline: 12px;
}

.screen-template__row {
  --template-label-height: clamp(40px, 5.5vh, 72px);
  --template-preview-height: min(70vh, 680px);
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: flex-start;
  gap: clamp(24px, 3.5vw, 56px);
  width: max-content;
  margin-block: auto;

  &.has-selection .screen-template__card:not(.is-selected) {
    transform: scale(0.96);
    opacity: 0.88;
  }
}

.screen-template__column {
  --template-card-width: clamp(260px, 26vw, 400px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(12px, 2vh, 24px);
  flex: 0 0 auto;
  cursor: pointer;
  touch-action: pan-x;

  &:has(.screen-template__card--bk03) {
    --template-card-width: clamp(340px, 34vw, 520px);
  }
}

.screen-template__label-slot {
  flex: 0 0 auto;
  width: var(--template-card-width);
  height: var(--template-label-height);
  margin-top: 80px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.screen-template__label-img {
  display: block;
  width: auto;
  max-width: 100%;
  height: auto;
  max-height: 100%;
  object-fit: contain;
  object-position: center bottom;
  pointer-events: none;
  user-select: none;
  -webkit-user-drag: none;
}

.screen-template__card-slot {
  flex: 0 0 auto;
  width: var(--template-card-width);
  min-height: var(--template-preview-height);
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

.screen-template__column:has(.screen-template__card--bk03) .screen-template__card-slot {
  align-items: center;
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

.screen-template__card {
  border: none;
  border-radius: $radius-xl;
  background: transparent;
  padding: 0;
  cursor: pointer;
  transition: transform 0.3s ease, opacity 0.3s ease;
  z-index: 1;
  flex: 0 0 auto;
  display: block;
  touch-action: pan-x;

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
  width: var(--template-card-width);
  max-width: var(--template-card-width);
  height: auto;
}

.screen-template__card--bk03 .screen-template__card-preview {
  width: var(--template-card-width);
  max-width: var(--template-card-width);
}

.screen-template__card-img {
  width: 100%;
  height: auto;
  display: block;
  -webkit-user-drag: none;
  user-select: none;
}

.screen-template__card:not(.screen-template__card--bk03) .screen-template__card-img {
  max-height: min(70vh, 680px);
}

.screen-template__card--bk03 .screen-template__card-img {
  max-height: min(48vh, 500px);
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
