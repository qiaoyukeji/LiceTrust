<template>
  <div class="backup-center">
    <!-- 功能区 a：全量备份（JSON 下载） -->
    <el-card shadow="never" class="page-card section-card">
      <template #header>
        <span class="section-title">全量备份</span>
      </template>
      <p class="section-desc">
        导出本企业全部台账数据（组织、部门、用户、软件资产、计算机、安装明细、采购授权、流程记录等）为 JSON 备份文件，建议定期下载并妥善保管。
      </p>
      <el-button v-perm="'config:edit'" type="primary" :icon="Download" :loading="exporting" @click="onExportBackup">下载备份文件</el-button>
    </el-card>

    <!-- 功能区 b：恢复备份（JSON 上传，危险操作） -->
    <el-card shadow="never" class="page-card section-card">
      <template #header>
        <span class="section-title">恢复备份</span>
      </template>
      <p class="section-desc">
        上传此前导出的 JSON 备份文件进行恢复。<b class="danger-text">恢复将清空当前企业数据并按备份文件重建</b>，请谨慎操作。
      </p>
      <el-upload
        :auto-upload="false"
        :show-file-list="false"
        accept=".json,application/json"
        :on-change="onBackupFileChange"
      >
        <el-button :icon="FolderOpened">选择备份 JSON 文件</el-button>
      </el-upload>
      <div v-if="backupName" class="chosen-file">
        已选择：<span class="file-name">{{ backupName }}</span>
        <el-link type="danger" :underline="false" class="file-remove" @click="clearBackupFile">移除</el-link>
      </div>
      <el-button
        v-perm="'config:edit'"
        type="danger"
        :icon="RefreshRight"
        :disabled="!backupData"
        :loading="restoring"
        class="restore-btn"
        @click="onRestore"
      >开始恢复</el-button>
    </el-card>

    <!-- 功能区 c：附件3 明细表（Excel 导出/导入） -->
    <el-card shadow="never" class="page-card section-card">
      <template #header>
        <span class="section-title">附件3 明细表</span>
      </template>
      <p class="section-desc">按《正版软件管理工作指南》附件3 格式导出/导入软件使用情况明细表。</p>
      <div class="att3-actions">
        <el-button v-perm="'report:export'" type="success" :icon="Download" :loading="attExporting" @click="onExportAttachment3">导出附件3 Excel</el-button>
        <el-upload
          :show-file-list="false"
          accept=".xls,.xlsx"
          :http-request="doImportAttachment3"
        >
          <el-button v-perm="'install:edit'" type="primary" :icon="Upload" :loading="attImporting">导入附件3 Excel</el-button>
        </el-upload>
      </div>

      <template v-if="attResult">
        <el-alert
          :title="'最近一次导入：成功 ' + attResult.success + ' 条，失败 ' + attResult.failed.length + ' 条'"
          :type="attResult.failed.length ? 'warning' : 'success'"
          :closable="false"
          show-icon
          class="att3-alert"
        />
        <el-table :data="attResult.failed" border stripe size="small" max-height="360">
          <el-table-column prop="row" label="Excel 行号" width="110" align="center" />
          <el-table-column prop="reason" label="失败原因" min-width="280" show-overflow-tooltip />
        </el-table>
      </template>
      <el-empty v-else description="暂无导入记录，导入后此处展示失败行明细" :image-size="72" />
    </el-card>
  </div>
</template>

<script setup>
// 数据备份中心：JSON 全量备份/恢复 + 附件3 明细表 Excel 导出导入（config:edit）
// 下载走 request.js 的 blob download；附件3 导入为 multipart FormData（file 字段）
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Download, Upload, FolderOpened, RefreshRight } from '@element-plus/icons-vue'
import { post, download } from '../../api/request'

/* ---------- a) 全量备份 ---------- */
const exporting = ref(false)

/** 下载 JSON 全量备份文件（blob） */
async function onExportBackup() {
  exporting.value = true
  try {
    const name = await download('/tenant/backup/export')
    ElMessage.success('备份文件已下载：' + (name || 'backup.json'))
  } finally {
    exporting.value = false
  }
}

/* ---------- b) 恢复备份 ---------- */
const backupData = ref(null)
const backupName = ref('')
const restoring = ref(false)

/** 读取并解析备份 JSON（仅前端校验格式，不自动上传） */
function onBackupFileChange(file) {
  const raw = file && file.raw
  if (!raw) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const obj = JSON.parse(String(reader.result))
      if (!obj || !obj.version || !obj.tables) throw new Error('format')
      backupData.value = obj
      backupName.value = raw.name
      ElMessage.success('备份文件已就绪，请点击"开始恢复"提交')
    } catch (e) {
      clearBackupFile()
      ElMessage.error('备份文件格式不正确（需为平台导出的 JSON 备份文件）')
    }
  }
  reader.onerror = () => {
    clearBackupFile()
    ElMessage.error('文件读取失败，请重试')
  }
  reader.readAsText(raw)
}

/** 清除已选备份文件 */
function clearBackupFile() {
  backupData.value = null
  backupName.value = ''
}

/** 执行恢复（危险操作：清空当前数据并按备份重建） */
async function onRestore() {
  if (!backupData.value) {
    ElMessage.warning('请先选择备份 JSON 文件')
    return
  }
  const confirmed = await ElMessageBox.confirm(
    '恢复将清空当前数据并按备份重建，请确认备份文件来自本企业！此操作不可撤销，是否继续？',
    '危险操作确认',
    { type: 'warning', confirmButtonText: '确认恢复', cancelButtonText: '取消' }
  ).catch(() => null)
  if (!confirmed) return
  restoring.value = true
  try {
    const data = await post('/tenant/backup/import', backupData.value)
    ElMessage.success('数据恢复完成（' + ((data && data.restored) || 0) + ' 条记录），页面即将刷新')
    setTimeout(() => location.reload(), 1500)
  } finally {
    restoring.value = false
  }
}

/* ---------- c) 附件3 明细表 ---------- */
const attExporting = ref(false)
const attImporting = ref(false)
const attResult = ref(null)

/** 导出附件3 Excel（blob） */
async function onExportAttachment3() {
  attExporting.value = true
  try {
    const name = await download('/tenant/attachment3/export')
    ElMessage.success('附件3 已导出：' + (name || 'attachment3.xlsx'))
  } finally {
    attExporting.value = false
  }
}

/** el-upload 自定义上传：multipart FormData 提交附件3 Excel */
async function doImportAttachment3(options) {
  const file = options && options.file
  if (!file) return
  if (!/\.(xlsx|xls)$/i.test(file.name)) {
    ElMessage.error('仅支持 .xls / .xlsx 格式的附件3 明细表')
    return
  }
  attImporting.value = true
  try {
    const fd = new FormData()
    fd.append('file', file)
    const data = await post('/tenant/attachment3/import', fd)
    attResult.value = {
      success: (data && data.success) || 0,
      failed: (data && data.failed) || []
    }
    ElMessage.success(
      '导入完成：成功 ' + attResult.value.success + ' 条，失败 ' + attResult.value.failed.length + ' 条'
    )
  } finally {
    attImporting.value = false
  }
}
</script>

<style scoped>
.backup-center {
  max-width: 900px;
}
.section-card {
  margin-bottom: 16px;
}
.section-title {
  font-weight: bold;
  color: #1f2d3d;
}
.section-desc {
  margin: 0 0 14px;
  color: #606266;
  font-size: 13px;
  line-height: 1.8;
}
.danger-text {
  color: #f56c6c;
}
.chosen-file {
  margin: 10px 0;
  font-size: 13px;
  color: #606266;
}
.file-name {
  color: #1f5aa8;
  margin: 0 8px;
}
.restore-btn {
  margin-top: 6px;
}
.att3-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}
.att3-alert {
  margin-bottom: 12px;
}
</style>
