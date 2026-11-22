/** 文件上传接口（合同/授权书/证据照片，文档 4.6 文件存储） */
import { Router } from 'express'
import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
import config from '../config/index.js'
import { ok, ApiError, asyncH } from '../utils/response.js'

const router = Router()

const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.zip']

const storage = multer.diskStorage({
  destination(req, file, cb) {
    fs.mkdirSync(config.uploadDir, { recursive: true })
    cb(null, config.uploadDir)
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase()
    const name = crypto.randomBytes(8).toString('hex') + ext
    cb(null, name)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase()
    if (ALLOWED_EXT.includes(ext)) cb(null, true)
    else cb(new ApiError('不支持的文件类型: ' + ext, 400))
  }
})

// POST /api/uploads — multipart 上传，返回可访问 URL
router.post('/', upload.single('file'), asyncH(async (req, res) => {
  if (!req.file) throw new ApiError('未接收到文件', 400)
  ok(res, {
    file_name: req.file.originalname,
    file_url: '/uploads/' + req.file.filename,
    file_size: req.file.size
  }, '上传成功')
}))

export default router
