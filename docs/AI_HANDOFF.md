# AI Handoff / 项目渐进优化记录

目的：以后每次优化/加功能都把“做了什么、为什么、怎么验证、下一步”写在这里，避免上下文/记忆丢失。

## 项目概览（当前）

- 前端：`frontend/`（Next.js 15 + React 19，App Router，`output: 'standalone'`）
- 后端：`backend/`（Go + Gin + GORM，API 前缀 `/api/v1`，健康检查 `/health`）
- 数据库：MySQL 8（Docker Compose）
- 网关：Nginx（`docker/nginx.conf`，对外默认 `3006`；`/api/*` 转发到后端；其余到前端）

## 一键部署（Docker）

1) 复制环境变量：

```bash
cp .env.docker.example .env
```

2) 启动：

```bash
docker compose up -d --build
```

3) 验证：

```bash
curl -fsS http://localhost:3006/health
curl -fsS http://localhost:3006/api/v1/public/categories | head
```

默认端口：`3006`（Nginx 对外端口；可通过 `.env` 的 `NGINX_PORT` 修改）。

## 2026-01-16：Docker 跑通 & 修复项

### 变更

- 修复前端容器启动失败：Next.js standalone 的 `server.js` 位置不是固定在 `/app/server.js`，实际产物可能在 `/app/app/server.js`。
  - 改动：`frontend/Dockerfile` 的启动命令增加 fallback（优先 `/app/server.js`，否则 `/app/app/server.js`）。
- 修复生产容器“页面无样式/资源 404”：standalone 输出目录嵌套在 `/app/app` 时，Next 会从 `/app/app/.next/static` 读取静态资源。
  - 改动：`frontend/Dockerfile` 让 `/app/app/.next/static` 指向正确的静态目录。
- 修复 Nginx 在容器重建后可能继续使用旧 IP 导致 502：
  - 改动：`docker/nginx.conf` 增加 `resolver 127.0.0.11` + upstream `resolve`，让 upstream 通过 Docker DNS 动态解析。
- 修复“看起来没连上数据库”的根因：MySQL 已连接，但缺少关键表（如 `products/orders/...`），导致 `/api/v1/public/products` 500。
  - 根因：GORM `AutoMigrate(Product)` 会先触发一个“误把 unique index 当 FK 去 DROP”的 1091 错误；之前为了容错把它忽略了，结果该次 AutoMigrate 中止，表未创建。
  - 改动：`backend/config/database.go` 迁移逻辑改为：先 `HasTable`，缺表则 `CreateTable`，再 `AutoMigrate`（对 1091 drop 类错误继续容忍但不再阻断建表）。
- 修复后台登录 403（浏览器端）：后端 CORS 默认只允许 `http://localhost:3000`，但 Docker+Nginx 入口是 `http://localhost:3006`，浏览器带 `Origin` 会被 CORS 中间件拒绝。
  - 改动：`docker-compose.yml` 增加 `CORS_ORIGINS`（默认包含 `http://localhost:3006` 等）。
  - 改动：`backend/middleware/cors.go` 解析 `CORS_ORIGINS/CORS_METHODS/CORS_HEADERS` 时做 `TrimSpace`，避免因为 `.env` 里逗号后有空格导致“明明写了但仍 403”。
  - 改动：`backend/middleware/cors.go` 在 `GO_ENV!=production` 时放宽本地 `localhost/127.0.0.1/0.0.0.0` 的任意端口（减少迭代期 CORS 报错）。
  - 额外：加入 `docker-compose.dev.yml`，开发时可直接暴露前端/后端端口并默认不启 nginx（避免反代）。
- 新增本地运行需要的 `.env`（从 `.env.docker.example` 复制；已被 `.gitignore` 忽略）。

### 验证结果

- `docker compose ps`：mysql/backend/frontend/nginx 均为 `Up`
- `http://localhost:3006/health` 返回 `{"status":"ok"...}`
- `http://localhost:3006/` 返回 200（Next.js 页面）
- `http://localhost:3006/_next/static/css/*.css` 返回 200（页面样式正常）
- `http://localhost:3006/api/v1/public/products` 返回 200（不再 500；如果无商品数据则 `total=0` 属正常）

### 已知注意事项

- `.env` 里的默认密码/密钥仅用于本地；上生产必须替换：`MYSQL_ROOT_PASSWORD`、`MYSQL_PASSWORD`、`JWT_SECRET` 等。

## 2026-01-16：新增后台“图库/Media Library”

目标：后台有一个“图片资源库”，支持拖拽/批量上传、哈希（SHA-256）去重校验、批量编辑、批量删除；并能通过 Nginx 直接访问 `/uploads/*`。

### 变更

- 后端新增媒体表与接口：
  - 新增：`backend/models/media_asset.go`
  - 新增：`backend/controllers/media.go`
  - 改动：`backend/routes/routes.go` 增加 `/api/v1/admin/media/*`
  - 改动：`backend/config/database.go` 增加 `MediaAsset` 自动迁移
- 文件访问：让上传目录可通过 Nginx 访问：
  - 改动：`docker/nginx.conf` 增加 `location /uploads/` -> backend
- 前端后台新增图库页面（沿用现有 Tailwind 风格）：
  - 新增：`frontend/src/app/admin/media/page.tsx`
  - 新增：`frontend/src/services/media.service.ts`
  - 改动：`frontend/src/components/admin/AdminLayout.tsx`（侧边栏把 `Banners` 替换为 `Media Library`）
  - 改动：`frontend/src/app/admin/page.tsx`（Quick Actions 指向 Media Library）
  - 改动：`frontend/src/lib/react-query.tsx`、`frontend/src/services/index.ts`（注册 Media 相关 queryKey / service）

### API 约定

- 列表：`GET /api/v1/admin/media?page=1&page_size=24&q=&folder=`
- 上传（多文件）：`POST /api/v1/admin/media/upload`（multipart，字段 `files`，可选 `folder/tags`）
  - 后端会计算 `SHA-256`，若已存在相同 hash 则标记 `duplicate=true` 并复用记录（不重复写文件）
- 批量编辑：`PUT /api/v1/admin/media/batch`（JSON：`{ ids: [], folder?, tags?, title?, alt_text? }`）
- 批量删除：`DELETE /api/v1/admin/media/batch`（JSON：`{ ids: [] }`，同时 best-effort 删除磁盘文件）

### 验证结果（Docker）

- 登录后可访问 `http://localhost:3006/admin/media`
- 上传后能在列表看到图片，图片 URL 为 `/uploads/media/<sha256>.<ext>`
- `curl http://localhost:3006/uploads/media/<...>` 返回 200（经过 Nginx 转发到后端静态目录）
- 重复上传同一张图返回 `duplicate=true`（哈希去重生效）

## 2026-01-16：后台清理 + Homepage Content 增强 + 选图库 + Contacts 修复 + 中英文切换

### 变更

- 清理无后端的后台模块入口：
  - 删除：`frontend/src/app/admin/analytics/page.tsx`
  - 删除：`frontend/src/app/admin/settings/page.tsx`
  - 删除：`frontend/src/services/analytics.service.ts`
  - 删除：`frontend/src/services/settings.service.ts`
  - 改动：`frontend/src/components/admin/AdminLayout.tsx`（移除 Analytics/Settings 菜单）
  - 改动：`frontend/src/lib/react-query.tsx`、`frontend/src/services/index.ts`（移除 analytics/settings 相关导出与 queryKey）
- 后台中英文切换（先覆盖侧边栏菜单/退出等基础文案）：
  - 新增：`frontend/src/lib/admin-i18n.tsx`
  - 改动：`frontend/src/components/admin/AdminLayout.tsx`（右上角语言下拉，保存到 localStorage；侧边栏菜单随语言切换）
  - 修复：语言切换后立刻跳转页面会“变回英文”的问题：`frontend/src/lib/admin-i18n.tsx` 改为切换时同步写入 localStorage/cookie（不依赖 effect），并用 layoutEffect 初始化读取减少闪烁
  - 调整：新增 `frontend/src/app/admin/layout.tsx` 将 `AdminI18nProvider` 提升到路由 layout 层，页面可使用 `useAdminI18n()`（语言切换在页面跳转后也能保持）
- Homepage Content 后台页面重做（更“按区块”编辑）：
  - 改动：`frontend/src/app/admin/homepage/page.tsx`（左侧区块列表 + 右侧编辑器：标题/副标题/描述/图片/按钮/排序/启用）
  - 改动：`frontend/src/services/homepage.service.ts`（新增 `getAdminSections()` 读取后端预置区块列表）
  - 新增：`frontend/src/components/admin/MediaPickerModal.tsx`（通用“从图库选图”弹窗）
  - Homepage 图片字段支持一键从图库选择（写入 `image_url`）
- 产品新增/编辑页接入图库选图：
  - 改动：`frontend/src/app/admin/products/new/page.tsx`（Images 区域新增 “Choose From Library”）
  - 改动：`frontend/src/app/admin/products/[id]/edit/page.tsx`（Images 区域新增 “Choose From Library”）
- Contacts 页面修复为与其他后台页面一致的布局，并补齐“可编辑”：
  - 改动：`frontend/src/app/admin/contacts/page.tsx`（使用 `AdminLayout`，查看弹窗里可编辑 status/priority/admin_notes 并保存；打开详情会请求 GET /admin/contacts/:id 以标记 read）

### 验证结果（Docker）

- `docker compose up -d --build` 前端构建通过
- 后台左侧菜单已去掉 Analytics/Settings
- `Homepage Content` 页面可编辑每个 section，并可从图库选择图片
- 产品 New/Edit 页面可从图库批量插入图片 URL
- `Contacts` 页面恢复左侧导航布局；详情弹窗可修改状态/优先级/管理员备注并保存

## 2026-01-16：Categories 优化（排序 + 图库选图 + 部分中文）

### 变更

- 分类列表按 `sort_order` 排序，并在卡片上显示 `sort_order`
- 新增“一键重置排序”按钮：把 `sort_order` 规整为 `1..N`（解决排序数字过大/混乱）
- 分类图片字段支持从图库选择（写入 `image_url`）：`frontend/src/app/admin/categories/page.tsx`
- 移除无用 Company Profile 后台入口（前端页面/服务已删除；后端接口暂保留，后续如确认不需要可再清理）
  - 删除：`frontend/src/app/admin/company/page.tsx`
  - 删除：`frontend/src/services/company.service.ts`

## 2026-01-16：后台菜单/标题中文覆盖（按你点名的模块）

目标：选择中文后，下面这些模块在侧边栏/页面标题处显示中文：
`Dashboard / Products / Orders / Customers / Support Tickets / Coupon Management / All Users / Contact Messages / Media Library / Homepage Content`

### 变更

- 补齐 i18n 字典：`frontend/src/lib/admin-i18n.tsx` 增加/调整对应的 `nav.*` 翻译（包含 `Coupon Management`、`All Users` 等更完整命名）
- 让各页面标题使用 `t('nav.*')`，避免标题仍是英文：
  - `frontend/src/app/admin/coupons/page.tsx`
  - `frontend/src/app/admin/users/page.tsx`
  - `frontend/src/app/admin/page.tsx`（Dashboard 的 Quick Actions 卡片标题也跟随 `nav.*`）

### 下一步

1) 如果你希望“全后台”文案都跟着中/英切换：我可以按页面逐步把标题/按钮/提示语抽成 i18n key（每次改 1-2 个页面，避免大爆炸）。
2) 如果你希望“内容”本身支持中/英两份（例如首页区块、产品描述）：需要后端表结构支持 language_code 或 translation 表，我可以按最小可行方案设计并迁移。

## 2026-01-16：Homepage Content 与前台首页联动（修复“没有获取到已有信息”）

问题：后台 `Homepage Content` 之前只是在改数据库表 `homepage_contents`，但前台首页仍然是写死的组件内容；另外数据库默认没有 seed 数据，导致后台看起来“拿不到已有网页信息”。

### 变更

- 后端 `homepage_contents` 增加 `data`（JSON）字段，用于存放结构化配置（轮播 slides / stats / services / workshop 等）
  - `backend/models/homepage_content.go`（新增 `Data datatypes.JSON`）
  - `backend/controllers/homepage_content.go`（create/update 支持 `data`；list 支持 `?include_inactive=1`）
  - `backend/database_setup.sql` / `backend/database_setup_postgresql.sql`（补齐建表字段）
- 后端补齐更“按区块”的管理接口（更符合后台编辑场景）：
  - `GET /api/v1/admin/homepage-content`：返回全部（包含 inactive）
  - `GET /api/v1/admin/homepage-content/section/:section_key`：按 key 获取（包含 inactive）
  - `PUT /api/v1/admin/homepage-content/section/:section_key`：按 key upsert（不存在则创建，存在则更新）
- 后台 `Homepage Content` 页面增强：
  - `frontend/src/app/admin/homepage/page.tsx`：新增 `Section Data (JSON)` 编辑器；当数据库没有对应记录时，会自动填充“当前网站默认值”（避免空白）
  - `frontend/src/lib/homepage-defaults.ts`：把当前前台首页的默认内容抽成默认数据（admin 也用它做初始化）
- 前台首页开始读取数据库内容（有数据则覆盖默认值，无数据则继续用默认值）：
  - `frontend/src/app/page.tsx`：服务端请求 `/api/v1/public/homepage-content`，把各 section 传给组件
  - `frontend/src/components/home/*`：支持接收 `content`，优先用 `content.data`（JSON），否则 fallback 到默认值
  - 同时前台会拉取 `include_inactive=1` 来尊重后台的 `Active` 开关（关闭则前台不渲染该区块）

### 使用方式（验证）

1) 进入后台：`http://localhost:3006/admin/homepage`
2) 选择区块（如 `hero_section / company_stats / featured_products / workshop_section / services_section`）
3) 直接修改字段或 `Section Data (JSON)`，点 `Save`
4) 刷新前台首页：`http://localhost:3006/`（应看到修改生效）
5) 可用 curl 冒烟验证（会返回已保存的 section）：

```bash
curl -fsS http://localhost:3006/api/v1/public/homepage-content | head
```

## 2026-01-16：/categories 背景变黑修复 + 首页修改“立即生效”

### 问题

- `/categories` 在系统深色模式下背景变黑（全站 `prefers-color-scheme: dark` 覆盖了 body 背景色）
- 修改 Homepage Content 后偶尔“看起来不生效”（HTML 被缓存；以及部分区块只改了简单字段但前台主要读取 `data`）

### 变更

- 固定前台为浅色背景（暂不启用暗色模式）：
  - `frontend/src/app/globals.css` 移除 `prefers-color-scheme: dark` 的背景变量覆写
- 开发期关闭 HTML 缓存，避免后台保存后前台还拿到旧页面：
  - `docker/nginx.conf`：`location /` 增加 `proxy_hide_header Cache-Control` + `Cache-Control: no-store`
- 兼容旧数据：当 `homepage_contents.data` 为空时，前台会用 `title/subtitle/description/button_*` 覆盖默认内容的一部分（让“只改简单字段”也能看到变化）：
  - `frontend/src/components/home/HeroSection.tsx`
  - `frontend/src/components/home/CompanyStats.tsx`
  - `frontend/src/components/home/WorkshopSection.tsx`
  - `frontend/src/components/home/ServicesSection.tsx`

## 下一步建议（按“渐进式”）

1) 建立“任务清单 + 验证脚本 + 回归点”（例如：启动/健康检查/API 冒烟测试）。
2) 明确要新增的功能优先级（你给我一个列表：必须/应该/可选），我再按小步提交：一次只做 1-2 个可验证的改动。

## 2026-01-17：Homepage 可视化编辑器完善（区块顺序可拖拽 + 前台按 sort_order 动态渲染）

目标：你不想再手写/编辑 JSON；同时希望“区块本身也能拖拽排序”，并且保存后前台首页顺序立即生效。

### 变更

- 前台首页改为“按数据库 sort_order 渲染”：
  - `frontend/src/app/page.tsx`：不再写死 5 个区块的固定顺序；现在会把区块合并成一个 renderQueue，并按 `sort_order` 排序渲染。
  - 仍保留默认区块（hero/company_stats/featured_products/workshop/services）作为 fallback：数据库无记录时照样展示默认内容；一旦后台创建/保存了记录，则按 DB 的 `sort_order/is_active` 控制显示与顺序。
- 增加“通用区块渲染器”（用于自定义/未知 section_key）：
  - 新增：`frontend/src/components/home/SimpleContentSection.tsx`
  - 行为：当 section 没有任何内容（title/subtitle/description/image/button/data 都为空）时自动不渲染，避免出现“空白块”。
- 后台 Homepage Content 增加“首页布局顺序”拖拽面板：
  - `frontend/src/app/admin/homepage/page.tsx`：左侧新增“Homepage Layout Order”，支持拖拽排序 + 保存顺序。
  - 保存方式：对拖拽后的区块逐个调用 `PUT /api/v1/admin/homepage-content/section/:section_key` 只更新 `sort_order`（没有记录会自动创建最小记录；前台仍会使用默认内容渲染，因此不会变空）。

### 验证方式

1) 打开后台：`http://localhost:3006/admin/homepage`
2) 左侧 `Homepage Layout Order`：拖动 `hero_section/company_stats/...` 调整顺序，点“保存顺序”
3) 刷新前台首页：`http://localhost:3006/`，确认区块顺序已变化

### 注意事项

- 如果你在后台创建了一个自定义 section_key（非 5 个主区块），前台会用 `SimpleContentSection` 渲染；但如果该记录内容为空，会自动跳过渲染（防止空白块占位）。
