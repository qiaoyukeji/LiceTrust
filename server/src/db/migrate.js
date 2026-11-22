/**
 * 迁移入口 —— 建表与索引由 migrate-generated.js（依据 schema.js 生成）完成
 *
 * 直接运行：node src/db/migrate.js
 * 应用启动时（app.js）自动调用。
 */
import { runMigration } from './migrate-generated.js'

export { runMigration }

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('db/migrate.js')) {
  runMigration()
    .then(() => {
      console.log('[migrate] 数据库结构就绪')
      process.exit(0)
    })
    .catch((e) => {
      console.error('[migrate] 失败:', e.message)
      process.exit(1)
    })
}
