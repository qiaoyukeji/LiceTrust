<template>
  <div class="page detail-page">
    <van-nav-bar title="一机一档" left-arrow fixed placeholder @click-left="goBack" />

    <template v-if="info.computer">
      <div class="gov-card">
        <p class="card-title">
          <span>{{ info.computer.computer_no }}</span>
          <van-tag :type="computerStatusType(info.computer.status)">
            {{ mapText(COMPUTER_STATUS_MAP, info.computer.status) }}
          </van-tag>
        </p>
        <van-cell-group inset :border="false" class="plain-cells">
          <van-cell title="品牌型号" :value="brandText" />
          <van-cell title="类型" :value="mapText(COMPUTER_TYPE_MAP, info.computer.computer_type)" />
          <van-cell title="序列号" :value="info.computer.sn || '-'" />
          <van-cell title="使用人" :value="info.computer.user_name || '未分配'" />
          <van-cell title="部门" :value="info.computer.dept_name || '-'" />
          <van-cell title="单位" :value="info.computer.org_name || '-'" />
          <van-cell title="位置" :value="info.computer.location || '-'" />
          <van-cell title="启用日期" :value="shortDate(info.computer.enable_date)" />
          <van-cell title="已装软件" :value="(info.installed.length + ' 款')" />
        </van-cell-group>
      </div>

      <van-tabs v-model:active="activeTab" sticky offset-top="46px">
        <!-- 已装软件 -->
        <van-tab title="已装软件">
          <div v-if="canEdit" class="sw-toolbar">
            <van-button type="primary" size="small" round icon="plus" @click="openAddSw">登记安装软件</van-button>
          </div>
          <template v-if="info.installed.length">
            <div v-for="s in info.installed" :key="s.id" class="gov-item">
              <p class="item-title">
                <span>{{ s.software_name }}</span>
                <van-tag plain type="primary">{{ mapText(CATEGORY_MAP, s.category) }}</van-tag>
              </p>
              <p class="item-meta">版本：{{ s.version || '-' }} · {{ mapText(SOFTWARE_TYPE_MAP, s.software_type) }}</p>
              <p class="item-meta">厂商：{{ s.vendor || '-' }}</p>
              <p class="item-meta">安装日期：{{ shortDate(s.install_date) }} · 授权期限：{{ s.license_term || '-' }}</p>
            </div>
            <p class="count-tip">共 {{ info.installed.length }} 款软件</p>
          </template>
          <van-empty v-else description="暂无安装记录，点击上方按钮登记" />
        </van-tab>

        <!-- 维护记录 -->
        <van-tab title="维护记录">
          <div v-if="info.logs.length" class="gov-card">
            <van-steps direction="vertical" :active="0" active-color="#1a66d0">
              <van-step v-for="l in info.logs" :key="l.id">
                <p class="log-title">{{ mapText(OP_TYPE_MAP, l.op_type) }} · {{ l.software_name || '-' }}</p>
                <p class="log-desc">{{ l.reason || '-' }}</p>
                <p class="log-time">
                  {{ shortTime(l.op_date) }} · 操作人：{{ l.operator_name || '-' }}
                  <template v-if="l.apply_no_display"> · 单号 {{ l.apply_no_display }}</template>
                </p>
              </van-step>
            </van-steps>
          </div>
          <van-empty v-else description="暂无维护记录" />
        </van-tab>
      </van-tabs>
    </template>

    <van-empty v-else-if="loaded" description="电脑不存在或已被删除" />
    <van-loading v-else class="empty-wrap" vertical>加载中...</van-loading>

    <!-- 登记安装软件弹层（信息录入：分类 → 预置正版软件 → 安装信息） -->
    <van-popup v-model:show="swDlg.visible" position="bottom" round style="padding: 16px 0">
      <div class="sw-form-title">登记安装软件</div>
      <van-cell-group inset border>
        <van-field
          label="软件分类"
          :model-value="swDlg.category ? mapText(CATEGORY_MAP, swDlg.category) : ''"
          placeholder="先选分类"
          readonly
          is-link
          @click="swDlg.catPicker = true"
        />
        <van-field
          label="软件名称"
          :model-value="swPickText"
          placeholder="该分类下的预置正版软件"
          readonly
          is-link
          @click="swDlg.category && (swDlg.swPicker = true)"
        />
        <van-field v-model="swDlg.version" label="安装版本" placeholder="选填，选软件后可改" />
        <van-field v-model="swDlg.license_term" label="许可期限" placeholder="选填，如 1年 / 长期" />
        <van-field
          label="安装日期"
          :model-value="swDlg.install_date"
          placeholder="点击选择"
          readonly
          is-link
          @click="swDlg.datePicker = true"
        />
        <van-field label="安装来源">
          <template #input>
            <van-radio-group v-model="swDlg.install_source" direction="horizontal">
              <van-radio name="统一部署">统一部署</van-radio>
              <van-radio name="个人申请">个人申请</van-radio>
              <van-radio name="补录">补录</van-radio>
            </van-radio-group>
          </template>
        </van-field>
      </van-cell-group>
      <div style="padding: 14px 16px">
        <van-button type="primary" round block :loading="swDlg.saving" @click="submitSw">登记到台账</van-button>
      </div>
    </van-popup>

    <van-popup v-model:show="swDlg.catPicker" position="bottom" round>
      <van-picker :columns="catColumns" @confirm="onCatPicked" @cancel="swDlg.catPicker = false" />
    </van-popup>
    <van-popup v-model:show="swDlg.swPicker" position="bottom" round>
      <van-picker :columns="swColumns" @confirm="onSwPicked" @cancel="swDlg.swPicker = false" />
    </van-popup>
    <van-popup v-model:show="swDlg.datePicker" position="bottom" round>
      <van-date-picker
        :min-date="new Date(2015, 0, 1)"
        :max-date="new Date(2030, 11, 31)"
        @confirm="onSwDatePicked"
        @cancel="swDlg.datePicker = false"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import { get, post } from '../../api/request'
import { useUser, hasPerm } from '../../composables/user'
import {
  CATEGORY_MAP,
  SOFTWARE_TYPE_MAP,
  COMPUTER_TYPE_MAP,
  COMPUTER_STATUS_MAP,
  OP_TYPE_MAP,
  mapText,
  computerStatusType
} from '../../constants'

const route = useRoute()
const router = useRouter()
const canEdit = computed(() => hasPerm('install:edit'))

const info = ref({ computer: null, installed: [], logs: [] })
const loaded = ref(false)
const activeTab = ref(0)

// ===== 登记安装软件（信息录入）=====
const swDlg = reactive({
  visible: false,
  saving: false,
  catPicker: false,
  swPicker: false,
  datePicker: false,
  category: null,
  software_id: null,
  version: '',
  license_term: '',
  install_date: '',
  install_source: '个人申请'
})
const swOptions = ref([])

const catColumns = computed(() =>
  Object.keys(CATEGORY_MAP).map((k) => ({ text: CATEGORY_MAP[k], value: Number(k) }))
)
const swColumns = computed(() =>
  swOptions.value.map((s) => ({ text: s.software_name + (s.version ? '（' + s.version + '）' : ''), value: s.id }))
)
const swPickText = computed(() => {
  const s = swOptions.value.find((x) => x.id === swDlg.software_id)
  return s ? s.software_name : ''
})

function openAddSw() {
  Object.assign(swDlg, {
    visible: true, saving: false, catPicker: false, swPicker: false, datePicker: false,
    category: null, software_id: null, version: '', license_term: '', install_date: today(), install_source: '个人申请'
  })
  swOptions.value = []
}

function today() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}

async function onCatPicked({ selectedOptions }) {
  if (selectedOptions && selectedOptions[0]) {
    swDlg.category = selectedOptions[0].value
    swDlg.software_id = null
    const all = (await get('/softwares/options')) || []
    swOptions.value = all.filter((s) => Number(s.category) === Number(swDlg.category))
  }
  swDlg.catPicker = false
}

function onSwPicked({ selectedOptions }) {
  if (selectedOptions && selectedOptions[0]) {
    swDlg.software_id = selectedOptions[0].value
    const s = swOptions.value.find((x) => x.id === swDlg.software_id)
    if (s && s.version) swDlg.version = s.version
  }
  swDlg.swPicker = false
}

function onSwDatePicked({ selectedValues }) {
  swDlg.install_date = selectedValues.join('-')
  swDlg.datePicker = false
}

async function submitSw() {
  if (!swDlg.category) return showToast('请选择软件分类')
  if (!swDlg.software_id) return showToast('请选择软件')
  swDlg.saving = true
  try {
    await post('/install-records', {
      computer_id: Number(route.params.id),
      software_id: swDlg.software_id,
      version: swDlg.version,
      license_term: swDlg.license_term,
      install_date: swDlg.install_date,
      install_source: swDlg.install_source
    })
    showToast.success('软件登记成功，台账已更新')
    swDlg.visible = false
    await reload()
  } finally {
    swDlg.saving = false
  }
}

async function reload() {
  const data = await get('/computers/' + route.params.id)
  info.value = {
    computer: (data && data.computer) || null,
    installed: (data && data.installed) || [],
    logs: (data && data.logs) || []
  }
}

const brandText = computed(() => {
  const c = info.value.computer
  if (!c) return '-'
  return (c.brand || '-') + (c.model ? ' ' + c.model : '')
})

function shortDate(val) {
  if (!val) return '-'
  return String(val).slice(0, 10)
}

function shortTime(val) {
  if (!val) return '-'
  return String(val).slice(0, 16)
}

function goBack() {
  router.back()
}

onMounted(async () => {
  const id = route.params.id
  try {
    const data = await get('/computers/' + id)
    info.value = {
      computer: (data && data.computer) || null,
      installed: (data && data.installed) || [],
      logs: (data && data.logs) || []
    }
  } catch (e) {
    info.value = { computer: null, installed: [], logs: [] }
  } finally {
    loaded.value = true
  }
})
</script>

<style scoped>
.detail-page {
  padding-top: 0;
}
.plain-cells {
  background: transparent;
}
.plain-cells .van-cell {
  padding-left: 0;
  padding-right: 0;
  background: transparent;
}
.log-title {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 4px;
}
.log-desc {
  font-size: 12px;
  color: #4e5d6c;
  margin: 0 0 4px;
}
.log-time {
  font-size: 12px;
  color: #8492a6;
  margin: 0;
}
.count-tip {
  text-align: center;
  color: #8492a6;
  font-size: 12px;
  padding: 8px 0 16px;
  margin: 0;
}
.sw-toolbar {
  padding: 10px 16px 2px;
}
.sw-form-title {
  text-align: center;
  font-size: 15px;
  font-weight: 600;
  color: #1f2d3d;
  padding: 4px 0 12px;
}
</style>
