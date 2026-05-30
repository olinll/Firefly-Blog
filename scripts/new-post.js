/**
 * 新建文章脚本
 * 在 src/content/posts/ 下创建带 front-matter 的 Markdown 文件
 *
 * 模式切换（USE_FOLDER）：
 *   true  → 创建 fileName/index.md 文件夹结构（适合放图片等资源）
 *   false → 创建 fileName.md 单文件
 *
 * 使用方法：node scripts/new-post.js <filename>
 * 示例：node scripts/new-post.js my-new-post
 */

import fs from "fs"
import path from "path"

// ========== 配置 ==========
// true: 创建 fileName/index.md 文件夹结构
// false: 创建 fileName.md 单文件
const USE_FOLDER = true
// ==========================

function getDate() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, "0")
  const day = String(today.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

const args = process.argv.slice(2)

if (args.length === 0) {
  console.error(`Error: No filename argument provided
Usage: node scripts/new-post.js <filename>`)
  process.exit(1)
}

let fileName = args[0]

// Remove .md/.mdx extension if provided
const fileExtensionRegex = /\.(md|mdx)$/i
if (fileExtensionRegex.test(fileName)) {
  fileName = fileName.replace(fileExtensionRegex, "")
}

const targetDir = "./src/content/posts/"

let fullPath
if (USE_FOLDER) {
  fullPath = path.join(targetDir, fileName, "index.md")
} else {
  fullPath = path.join(targetDir, `${fileName}.md`)
}

if (fs.existsSync(fullPath)) {
  console.error(`Error: File ${fullPath} already exists`)
  process.exit(1)
}

// Create directory if needed
const dirPath = path.dirname(fullPath)
if (!fs.existsSync(dirPath)) {
  fs.mkdirSync(dirPath, { recursive: true })
}

const content = `---
title: ${fileName}
published: ${getDate()}
updated: ${getDate()}
description: ''
image: ''
tags: []
category: ''
draft: false
---
`

fs.writeFileSync(fullPath, content)

console.log(`Post created: ${fullPath}`)
