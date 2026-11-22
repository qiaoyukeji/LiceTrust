<script>
/**
 * 小程序应用入口（预留骨架占位）
 * 二期接入：onLaunch 中调用 wx.login 获取 code，请求后端换取 token（单点登录），
 * 之后所有请求与 mobile/src/api/request.js 同规范（Authorization: Bearer licetrust_token）。
 */
export default {
  onLaunch() {
    // 占位提示：骨架阶段无业务逻辑
    uni.showToast({
      title: '小程序骨架已启动，业务待二期接入',
      icon: 'none',
      duration: 2000
    })
  },
  onShow() {},
  onHide() {}
}
</script>

<style>
/* 全局公共样式（蓝白政务风，与 mobile 一致） */
page {
  background-color: #f3f7fc;
  color: #1f2d3d;
  font-size: 28rpx;
}
.stub-card {
  background: #ffffff;
  border-radius: 20rpx;
  margin: 24rpx;
  padding: 32rpx;
  box-shadow: 0 2rpx 8rpx rgba(26, 102, 208, 0.08);
}
.stub-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a66d0;
  margin-bottom: 16rpx;
}
.stub-desc {
  font-size: 26rpx;
  color: #8492a6;
  line-height: 1.7;
}
</style>
