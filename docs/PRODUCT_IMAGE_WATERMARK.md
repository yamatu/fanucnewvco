# 产品默认图片 + SKU 水印（FANUC/通用）

目标：

1) 当产品没有任何图片时，前台/后台列表自动显示“默认图片”，并在图片右下角叠加 SKU 水印。
2) 在媒体库里，你可以选择任意图片生成“带水印的拷贝”，水印文字可选择：从 SKU 导入或手动填写。

## 1. 更新代码并重启

```bash
git pull
```

后端需要重启一次，让数据库自动创建/迁移 `watermark_settings` 表：

```bash
cd backend
go run .
```

前端需要重新构建/重启：

```bash
cd frontend
npm run build
npm run start
```

## 2. 设置“默认水印底图”

1) 进入后台：`Admin -> Media Library`
2) 上传你想作为默认底图的图片（建议 1000x1000 或更大正方形）
3) 在媒体网格里点选该图片（只选 1 张）
4) 在页面上方的 `Default Product Image (Watermark)` 卡片里点击：`Set Selected As Base`

说明：

- 这个底图只用于“产品无图时”的默认占位图生成
- 你可以随时更换底图

## 3. 产品无图时自动显示 SKU 水印图

当产品 `image_urls` 为空时，系统会自动使用：

`/api/v1/public/products/default-image/<SKU>`

生成并返回一张 PNG（水印文字默认来自 SKU）。生成后的图片会存入媒体库 `watermarked-default` 文件夹，后续访问会复用。

## 4. 从媒体库生成“水印图片拷贝”（SKU/手动）

1) 进入 `Admin -> Media Library`
2) 点选一张图片（只选 1 张）
3) 在蓝色批量操作栏出现 `Watermark` 按钮，点击它
4) 在弹窗里选择：
   - `From SKU`：输入 SKU，作为水印文字
   - `Custom text`：输入任意文字
5) 点击 `Generate`

生成的图片会作为一张新的媒体库图片出现（文件夹 `watermarked`），你可以把它用在产品图片里。

## 5. 常见问题

- 我看不到默认水印图：请确认前端已重新 build/start，并且产品确实没有任何图片。
- 水印生成失败：可能是底图是 WebP 或其他不支持的格式（建议使用 PNG/JPG）。
