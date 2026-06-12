# GRE 图像记忆单词系统（适合 ADHD 等）

这是一个面向 GRE 高频背词、填空训练和阅读机经复盘的本地学习网站。它尤其考虑 ADHD、注意力容易漂移、执行功能压力较大、前额叶调控较弱，或需要更强视觉线索的学习者。

当前项目不使用 GitHub Pages，也不保留 `index_1.html` 静态预览页。完整体验请在本地启动 Next.js，然后打开：

```text
http://localhost:3000
```

## 安装与启动

环境要求：Git、Node.js 22 或更新版本、pnpm 11.5.2。

```bash
git clone https://github.com/bhsversion7-byte/GRE-ADHD-.git
cd GRE-ADHD-
corepack enable
corepack prepare pnpm@11.5.2 --activate
pnpm install
pnpm dev
```

启动后打开：

```text
http://localhost:3000
```

Windows 用户也可以运行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-windows.ps1
```

如果已经安装过依赖，之后通常只需要：

```bash
cd GRE-ADHD-
pnpm dev
```

## 浏览器插件提示

如果开发模式弹出 hydration warning，并且提示里出现 `data-new-gr-c-s-check-loaded` 或 `data-gr-ext-installed`，通常是 Grammarly 等浏览器插件在 React 加载前修改了页面属性。这个问题不影响学习功能；项目已加入兼容处理。如果仍出现，可以临时关闭相关插件或用无痕窗口打开 `http://localhost:3000`。

## 测试页为空时

当前版本会用新的 `datasetVersion` 自动重新导入 `public/data/gre-vocab-extracted.local.json`。这个文件包含张巍填空题库的题干、选项和答案。如果“测试”页仍显示没有题目，先刷新页面；如果仍不恢复，可以清除浏览器 `localStorage` 里的 `gre-visual-memory-trainer`，再重新打开 `http://localhost:3000`。

## 当前功能

- 每日 200-500 词学习节奏
- 图像记忆单词卡
- GRE 常见中英文意思、例句、同义词、反义词、词根线索
- 本地图像资产和开放许可图片
- 填空题库、阅读题库、同义词等价题
- 拖拽/点击选项进入空格
- 提交后显示对错、正确答案和解析
- 题目错误库
- 毫无印象单词库
- 用户笔记区
- Excel 可打开格式导出
- dark mode
- 本地进度保存

## 数据说明

仓库不包含用户上传的原始 PDF 文件。当前保留的是处理后的本地 JSON 数据、项目代码和图片资产。

## 项目定位

这个项目不是简单的单词表，而是一个为高强度 GRE 学习设计的视觉记忆系统。目标是让用户更容易开始、更容易继续、更容易复盘，也更容易在大量抽象词中建立可回想的画面线索。
