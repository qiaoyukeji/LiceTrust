<template>
  <el-card shadow="never" class="page-card">
    <el-alert
      v-if="!isPlatform"
      title="系统参数/字典/角色为平台级设置，请联系平台运营方修改"
      type="warning"
      :closable="false"
      show-icon
      class="cfg-alert"
    />
    <el-alert
      v-if="isPlatform"
      title="系统参数即时生效，修改后请点击保存按钮提交"
      type="info"
      :closable="false"
      show-icon
      class="cfg-alert"
    />
    <div v-if="isPlatform" class="table-toolbar">
      <el-button v-perm="'config:edit'" type="primary" :icon="Check" :loading="saving" @click="onSave">保存修改</el-button>
    </div>
    <el-table :data="rows" v-loading="loading" border stripe>
      <el-table-column prop="config_key" label="参数键" min-width="180" />
      <el-table-column prop="config_name" label="参数名称" min-width="180" />
      <el-table-column label="参数值" min-width="200">
        <template #default="{ row }">
          <el-input v-if="editable" v-model="row.config_value" />
          <span v-else>{{ row.config_value }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="remark" label="说明" min-width="200" show-overflow-tooltip />
    </el-table>
  </el-card>
</template>

<script setup>
// 系统参数：可编辑表格统一保存（config:view / config:edit）
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Check } from '@element-plus/icons-vue'
import { get, put } from '../../api/request'
import { useUserStore } from '../../stores/user'

const store = useUserStore()
const loading = ref(false)
const saving = ref(false)
const rows = ref([])
/** 写操作仅平台运营账号（tenant_id=0）；普通租户只读展示 */
const isPlatform = !!(store.user && Number(store.user.tenant_id) === 0)
const editable = isPlatform && store.can('config:edit')

async function load() {
  loading.value = true
  try {
    rows.value = (await get('/configs')) || []
  } finally {
    loading.value = false
  }
}

async function onSave() {
  saving.value = true
  try {
    const items = rows.value.map((r) => ({ config_key: r.config_key, config_value: r.config_value }))
    await put('/configs', { items })
    ElMessage.success('保存成功')
    load()
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.cfg-alert {
  margin-bottom: 14px;
}
</style>
