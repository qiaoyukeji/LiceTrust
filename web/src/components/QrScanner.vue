<template>
  <el-dialog v-model="visible" title="扫描固定资产二维码" width="520px" destroy-on-close @closed="stopCamera">
    <div class="qr-wrap">
      <div v-if="supported" class="video-box">
        <video ref="videoRef" autoplay playsinline muted class="cam"></video>
        <div class="scan-line"></div>
        <p class="cam-tip">将电脑资产标签二维码对准取景框，识别后自动填入</p>
      </div>
      <div v-else class="cam-fallback">
        <el-alert
          type="warning"
          :closable="false"
          show-icon
          title="当前浏览器不支持摄像头识别"
          description="可直接使用扫码枪对准输入框扫码，或在下方手动输入固定资产编号"
        />
      </div>
      <el-divider>或手动输入</el-divider>
      <el-input v-model="manualCode" placeholder="扫码枪可对准本输入框直接扫码，或手动填写" clearable>
        <template #append>
          <el-button type="primary" @click="confirmManual">确定</el-button>
        </template>
      </el-input>
    </div>
  </el-dialog>
</template>

<script setup>
// 固定资产二维码扫描：摄像头实时识别（BarcodeDetector）+ 扫码枪/手动输入降级
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
    // 等 dialog 渲染出 video 元素
    setTimeout(async () => {
      const v = videoRef.value
      if (!v) return
      v.srcObject = stream
      await v.play().catch(() => {})
      timer = setInterval(detectLoop, 300)
    }, 200)
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
.qr-wrap {
  min-height: 280px;
}
.video-box {
  position: relative;
  width: 100%;
  height: 260px;
  background: #000;
  border-radius: 8px;
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
  top: 50%;
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
.cam-fallback {
  padding: 8px 0;
}
</style>
