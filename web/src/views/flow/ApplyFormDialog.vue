<template>
  <el-dialog :model-value="modelValue" title="新申请（安装维护）" width="600px" destroy-on-close @update:model-value="(v) => emit('update:modelValue', v)">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
      <el-form-item label="计算机" prop="computer_id">
        <el-select v-model="form.computer_id" filterable style="width: 100%" placeholder="选择本人/权限内计算机">
          <el-option v-for="c in computers" :key="c.id" :label="c.computer_no + ' ' + (c.brand || '')" :value="c.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="申请类型" prop="apply_type">
        <el-radio-group v-model="form.apply_type">
          <el-radio v-for="(t, k) in APPLY_TYPE" :key="k" :value="Number(k)">{{ t }}</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="软件名称" prop="software_name">
        <el-input v-model="form.software_name" placeholder="可输入或从软件库选择后自动填充" />
      </el-form-item>
      <el-form-item label="软件库关联">
        <el-select v-model="form.software_id" clearable filterable style="width: 100%" placeholder="选填，关联软件资产库" @change="onSoftwareChange">
          <el-option v-for="s in softwares" :key="s.id" :label="s.software_name + '（' + s.software_no + '）'" :value="s.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="版本">
        <el-input v-model="form.version" placeholder="如 Windows 11 专业版" />
      </el-form-item>
      <template v-if="Number(form.apply_type) === 3">
        <el-form-item label="升级前版本">
          <el-input v-model="form.upgrade_from" />
        </el-form-item>
        <el-form-item label="升级后版本">
          <el-input v-model="form.upgrade_to" />
        </el-form-item>
      </template>
      <el-form-item label="申请理由" prop="reason">
        <el-input v-model="form.reason" type="textarea" :rows="3" placeholder="请说明安装/卸载/升级的必要性" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button :loading="saving" @click="onSave(true)">存草稿</el-button>
      <el-button type="primary" :loading="saving" @click="onSave(false)">提交申请</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
// 维护申请表单：安装/卸载/升级，支持草稿与直接提交（apply:create）
import { reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { get, post } from '../../api/request'
import { APPLY_TYPE } from '../../constants'

const props = defineProps({
  modelValue: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue', 'saved'])

const formRef = ref()
const saving = ref(false)
const computers = ref([])
const softwares = ref([])
const form = reactive({
  computer_id: null, apply_type: 1, software_id: null, software_name: '',
  version: '', upgrade_from: '', upgrade_to: '', reason: ''
})
const rules = {
  computer_id: [{ required: true, message: '请选择计算机', trigger: 'change' }],
  apply_type: [{ required: true, message: '请选择申请类型', trigger: 'change' }],
  software_name: [{ required: true, message: '请输入软件名称', trigger: 'blur' }],
  reason: [{ required: true, message: '请填写申请理由', trigger: 'blur' }]
}

watch(
  () => props.modelValue,
  (v) => {
    if (v) {
      resetForm()
      loadOptions()
    }
  }
)

function resetForm() {
  Object.assign(form, { computer_id: null, apply_type: 1, software_id: null, software_name: '', version: '', upgrade_from: '', upgrade_to: '', reason: '' })
}

async function loadOptions() {
  computers.value = (await get('/computers/options')) || []
  softwares.value = (await get('/softwares/options')) || []
}

function onSoftwareChange(id) {
  const s = softwares.value.find((x) => x.id === id)
  if (s) {
    form.software_name = s.software_name
    form.version = s.version || ''
  }
}

/** saveDraft=true 存草稿，否则直接提交进入审核 */
async function onSave(saveDraft) {
  await formRef.value.validate()
  saving.value = true
  try {
    await post('/maint-applies', { ...form, saveDraft })
    ElMessage.success(saveDraft ? '草稿已保存' : '提交成功，待部门负责人审核')
    emit('update:modelValue', false)
    emit('saved')
  } finally {
    saving.value = false
  }
}
</script>
