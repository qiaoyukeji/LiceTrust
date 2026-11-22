<template>
  <van-popup v-model:show="visible" position="bottom" round style="padding: 14px 0 20px">
    <div class="qr-pop-title">扫描固定资产二维码</div>
    <div v-if="supported" class="video-box">
      <video ref="videoRef" autoplay playsinline muted class="cam"></video>
      <div class="scan-line"></div>
      <p class="cam-tip">将资产标签二维码对准取景框，识别后自动填入</p>
    </div>
    <div v-else class="qr-fallback">
      <van-notice-bar wrapable :scrollable="false" text="当前浏览器不支持摄像头识别，可用扫码枪对准输入框扫码，或手动输入" />
    </div>
    <van-cell-group inset style="margin-top: 12px">
      <van-field
        v-model="manualCode"
        label="资产编号"
        placeholder="扫码枪可对准本输入框直接扫码"
        clearable
      />
    </van-cell-group>
    <div style="padding: 14px 16px 0; display: flex; gap: 10px">
      <van-button block round @click="visible = false">取消</van-button>
      <van-button type="primary" block round @click="confirmManual">确定填入</van-button>
    </div>
  </van-popup>
</template>

<script setup>
// 移动端固定资产二维码扫描：摄像头实时识别（BarcodeDetector）+ 扫码枪/手动输入降级
import { ref, watch, onBeforeUnmount } from 'vue'

const emit = defineEmits(['detected'])
const visible = ref(false)
const supported = ref(false)
const manualCode = ref('')
const videoRef = ref(null)
let stream = null
let timer = null
let detector = null

function open() {
  visible.value = true
  manualCode.value = ''
  supported.value = typeof window !== 'undefined' && 'BarcodeDetector' in window
  if (supported.value) startCamera()
}

function close() {
  visible.value = false
  stopCamera()
}

async function startCamera() {
  try {
    detector = new window.BarcodeDetector({ formats: ['qr_code'] })
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 960 }, height: { ideal: 720 } }
    })
    setTimeout(async () => {
      const v = videoRef.value
      if (!v) return
      v.srcObject = stream
      await v.play().catch(() => {})
      timer = setInterval(detectLoop, 300)
    }, 250)
  } catch (e) {
    supported.value = false
  }
}

async function detectLoop() {
  const v = videoRef.value
  if (!v || !detector || v.readyState < 2) return
  try {
    const codes = await detector.detect(v)
    if (codes && codes.length && codes[0].rawValue) {
      emit('detected', String(codes[0].rawValue).trim())
      close()
    }
  } catch (ignore) {
    // 单帧识别失败忽略
  }
}

function stopCamera() {
  if (timer) { clearInterval(timer); timer = null }
  if (stream) {
    stream.getTracks().forEach((t) => t.stop())
    stream = null
  }
}

function confirmManual() {
  const code = manualCode.value.trim()
  if (!code) return
  emit('detected', code)
  close()
}

watch(visible, (v) => { if (!v) stopCamera() })
onBeforeUnmount(stopCamera)

defineExpose({ open, close })
</script>

<style scoped>
.qr-pop-title {
  text-align: center;
  font-size: 15px;
  font-weight: 600;
  color: #1f2d3d;
  padding: 2px 0 12px;
}
.video-box {
  position: relative;
  margin: 0 16px;
  height: 220px;
  background: #000;
  border-radius: 10px;
  overflow: hidden;
}
.cam {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.scan-line {
  position: absolute;
  left: 15%;
  width: 70%;
  height: 2px;
  background: #67c23a;
  box-shadow: 0 0 8px #67c23a;
  animation: scanmove 2s linear infinite;
}
@keyframes scanmove {
  0% { top: 22%; }
  50% { top: 76%; }
  100% { top: 22%; }
}
.cam-tip {
  position: absolute;
  bottom: 8px;
  width: 100%;
  text-align: center;
  color: #fff;
  font-size: 12px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
  margin: 0;
}
.qr-fallback {
  margin: 0 16px;
}
</style>
