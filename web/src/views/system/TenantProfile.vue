<template>
  <el-card shadow="never" class="page-card">
    <el-alert
      title="企业信息用于租户标识与报表落款（附件3 单位名称等），修改后请点击保存提交"
      type="info"
      :closable="false"
      show-icon
      class="mb12"
    />
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="110px"
      style="max-width: 560px"
      v-loading="loading"
    >
      <el-form-item label="公司名称" prop="tenant_name">
        <el-input v-model="form.tenant_name" :disabled="!editable" maxlength="150" placeholder="企业全称" />
      </el-form-item>
      <el-form-item label="联系人" prop="contact_person">
        <el-input v-model="form.contact_person" :disabled="!editable" maxlength="50" placeholder="企业信息化负责人" />
      </el-form-item>
      <el-form-item label="联系电话" prop="contact_phone">
        <el-input v-model="form.contact_phone" :disabled="!editable" maxlength="30" placeholder="选填" />
      </el-form-item>
      <el-form-item label="公司地址" prop="address">
        <el-input v-model="form.address" :disabled="!editable" maxlength="200" placeholder="选填" />
      </el-form-item>
      <el-form-item label="所属行业" prop="industry">
        <el-input v-model="form.industry" :disabled="!editable" maxlength="50" placeholder="如：制造业 / 能源 / 金融" />
      </el-form-item>
      <el-form-item label="备注" prop="remark">
        <el-input v-model="form.remark" type="textarea" :rows="3" :disabled="!editable" maxlength="500" placeholder="选填" />
      </el-form-item>
      <el-form-item v-if="editable">
        <el-button type="primary" :loading="saving" @click="onSave">保存修改</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup>
// 企业信息（租户资料）：GET /tenant/profile 回显 + PUT /tenant/profile 保存（config:edit）
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { get, put } from '../../api/request'
import { useUserStore } from '../../stores/user'

const store = useUserStore()
const formRef = ref()
const loading = ref(false)
const saving = ref(false)
const editable = store.can('config:edit')

const form = reactive({
  tenant_name: '',
  contact_person: '',
  contact_phone: '',
  address: '',
  industry: '',
  remark: ''
})

const rules = {
  tenant_name: [{ required: true, message: '请输入公司名称', trigger: 'blur' }]
}

/** 回显当前企业资料 */
async function load() {
  loading.value = true
  try {
    const data = await get('/tenant/profile')
    const p = data || {}
    form.tenant_name = p.tenant_name || ''
    form.contact_person = p.contact_person || ''
    form.contact_phone = p.contact_phone || ''
    form.address = p.address || ''
    form.industry = p.industry || ''
    form.remark = p.remark || ''
  } finally {
    loading.value = false
  }
}

/** 保存企业资料 */
async function onSave() {
  if (!formRef.value) return
  await formRef.value.validate()
  saving.value = true
  try {
    await put('/tenant/profile', {
      tenant_name: form.tenant_name,
      contact_person: form.contact_person,
      contact_phone: form.contact_phone,
      address: form.address,
      industry: form.industry,
      remark: form.remark
    })
    ElMessage.success('企业信息已更新')
    load()
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.mb12 {
  margin-bottom: 12px;
}
</style>
