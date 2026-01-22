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

## 2026-01-17：Admin Categories 抽屉式编辑 + 移除 Auto Import from Site + SEO 配置修复

### 变更

- 分类管理 `/admin/categories`：新增/编辑不再用“小弹窗”，改为右侧抽屉（更好编辑、不会像“跳新页面”）
  - `frontend/src/app/admin/categories/page.tsx`
- 移除 “Auto Import from Site” 功能（产品新增/编辑/列表批量按钮都去掉；后端对应路由也下线）
  - 前端：`frontend/src/app/admin/products/new/page.tsx`
  - 前端：`frontend/src/app/admin/products/[id]/edit/page.tsx`
  - 前端：`frontend/src/app/admin/products/page.tsx`
  - 前端：`frontend/src/services/product.service.ts`
  - 后端：`backend/routes/routes.go`（移除 `/api/v1/admin/products/:id/auto-seo` 与 `/api/v1/admin/seo/*`）
- SEO/站点 URL 配置修复与简化
  - `NEXT_PUBLIC_SITE_URL` 的 docker 默认值修正为 `http://localhost:3006`
    - `.env.docker.example`
    - `docker-compose.yml`
  - `getSiteUrl()` 现在会正确处理 localhost（本地/容器里 sitemap/canonical 不再跑到生产域名）
    - `frontend/src/lib/url.ts`
  - 去掉 root metadata 强行写死 `alternates.canonical`，避免覆盖具体页面（产品/分类）自己的 canonical
    - `frontend/src/app/layout.tsx`
  - 统一 sitemap-products 入口：移除多余的 rewrite 与重复 API route，保留 `/sitemap-products-{page}.xml`
    - `frontend/next.config.ts`
    - 删除：`frontend/src/app/api/sitemap-products/[page]/route.ts`
  - `robots.txt` 移除不存在的 `xmlsitemap.php`，并清理 BOM
    - `frontend/src/app/robots.ts`

### 验证方式

1) Categories 抽屉：
   - 打开 `http://localhost:3006/admin/categories` → “Add Category / Edit” 应在右侧抽屉打开
2) 产品页不再出现 Auto Import：
   - `http://localhost:3006/admin/products/new` 与任意产品编辑页，不应再有 “Auto Import from Site”
3) SEO 基础检查（本地）：
   - `curl -fsS http://localhost:3006/robots.txt | head`
   - `curl -fsS http://localhost:3006/sitemap-products-index.xml | head`
   - `curl -fsS http://localhost:3006/sitemap-products-1.xml | head`

## 2026-01-17：后台 i18n 更彻底（admin 文案中英切换 + 组件优化）

### 变更

- i18n 基础能力增强：
  - `frontend/src/lib/admin-i18n.tsx`：
    - `t(key)` 缺失时会 fallback 到英文（避免部分 key 未补齐时出现 key 本身）
    - `t(key, fallback, vars)` 支持 `{var}` 插值（用于确认弹窗/计数文案）
    - 补齐更多 common/categories/products/media/seo/sitemap 的 key
- AdminLayout 优化：
  - `frontend/src/components/admin/AdminLayout.tsx`：子路由（如 `/admin/products/new`）顶部标题会正确匹配到父级菜单，并随语言切换
- 后台常用组件更彻底中文化：
  - `frontend/src/components/admin/SeoPreview.tsx`：SEO 预览文案随语言切换
  - `frontend/src/components/admin/MediaPickerModal.tsx`：搜索/分页/按钮/空态文案随语言切换
- 分类/产品页面补齐未翻译到的 toast/提示/确认文案：
  - `frontend/src/app/admin/categories/page.tsx`
  - `frontend/src/app/admin/products/page.tsx`
  - `frontend/src/app/admin/products/new/page.tsx`
  - `frontend/src/app/admin/products/[id]/edit/page.tsx`
  - `frontend/src/app/admin/sitemap/page.tsx`

### 验证方式

1) 进入后台任意页面（例如 `http://localhost:3006/admin/products`），切换 Language 为 `中文`
2) 跳转到其它页面（Products/Categories/Sitemap），顶部标题、分页/按钮、弹窗确认文案应保持中文
3) 冒烟：

```bash
docker compose up -d --build
curl -fsS http://localhost:3006/admin/categories >/dev/null
curl -fsS http://localhost:3006/admin/products >/dev/null
curl -fsS http://localhost:3006/admin/sitemap >/dev/null
```

## 2026-01-17：后台“备份与恢复”（数据库 + 图库 ZIP）

### 变更

- 后端新增 admin-only 备份/恢复接口（ZIP 传输格式）：
  - `GET /api/v1/admin/backup/db`：下载数据库备份（ZIP 内为 `db.sql`）
  - `POST /api/v1/admin/backup/db/restore?force=1`：上传 ZIP 恢复数据库（会覆盖数据）
  - `GET /api/v1/admin/backup/media`：下载图库/上传目录备份（ZIP）
  - `POST /api/v1/admin/backup/media/restore?force=1`：上传 ZIP 恢复图库（会覆盖 uploads）
  - 代码：`backend/controllers/backup.go`
  - 路由：`backend/routes/routes.go`
- 为了在容器内执行 `mysqldump/mysql`：
  - `backend/Dockerfile`：runner 镜像安装 `mariadb-client`（提供 `mysql/mysqldump` 或兼容命令）
- 构建镜像源可配置（避免部分网络下 Docker Hub / 镜像源不稳定）：
  - `backend/Dockerfile` / `frontend/Dockerfile` 支持 build arg：`BASE_REGISTRY`（默认 `docker.io`）
  - `docker-compose.yml` 已传递：`BASE_REGISTRY: ${BASE_REGISTRY:-docker.io}`
  - 可在 `.env` / `.env.docker.example` 设置 `BASE_REGISTRY=docker.io` / `dockerproxy.net` / `docker.m.daocloud.io`
- 上传限制与超时放宽（避免大 ZIP 上传/下载被截断）：
  - `backend/main.go`：`r.MaxMultipartMemory = 256 << 20`
  - `docker/nginx.conf`：`client_max_body_size 500m`，并将 `/api/` 的 proxy 超时提升到 1800s
- 后台新增页面与导航入口：
  - 页面：`frontend/src/app/admin/backup/page.tsx`
  - 菜单：`frontend/src/components/admin/AdminLayout.tsx`
  - i18n：`frontend/src/lib/admin-i18n.tsx`（`nav.backup` 与备份页面相关文案）

### 使用方式（后台）

1) 打开：`http://localhost:3006/admin/backup`
2) DB：点击 “Download DB Backup”，或选择 ZIP 后勾选确认并点击 “Restore Now”
3) 图库：同理（恢复会先清空 uploads 再恢复）

### 注意事项

- 两个 restore 接口都需要 `?force=1` 且 UI 里也要求勾选确认（避免误操作）。
- 如果 ZIP 来自系统自带压缩工具，可能会带一个顶层目录；图库 restore 会自动尝试“单目录根”展开一次。
- 备份/恢复是管理员专属：接口挂在 `AdminOnly()` 之下。

## 2026-01-17：修复“从图库选择的 /uploads 图片在首页不显示”（Next Image 与 /uploads）

### 原因

- `next/image` 对以 `/` 开头的图片会走“本地图片/优化器”逻辑；在 docker 架构里 `/uploads/*` 实际由 nginx -> backend 提供，而不是 Next 容器自己提供。
- 结果：Next 的 image optimizer 会尝试从 Next 容器自身去抓 `/uploads/*`，导致 404，页面上看起来就是图片不显示。

### 修复

- 对 `src` 以 `/uploads/` 开头的图片，统一加 `unoptimized`，让浏览器直接请求 `/uploads/*`（走 nginx 代理即可）。
  - `frontend/src/components/home/HeroSection.tsx`
  - `frontend/src/components/home/SimpleContentSection.tsx`
  - `frontend/src/components/home/WorkshopSection.tsx`
  - `frontend/src/components/home/FeaturedProducts.tsx`

## 2026-01-18：后台 Dashboard Recent Orders/Top Products/Stats 真实数据 + 统一口径 + 时间范围

目标：
- Dashboard 的 `Recent Orders`、`Top Products` 从静态 mock 改为真实 API 数据。
- 统一“成功订单”口径（本次按你选择的 delivered 口径执行）。
- `Top Products` 支持时间范围（最近 N 天 / 全部）。

口径说明（本次实现）：
- 成功订单：`payment_status=paid` 且 `status IN (delivered, completed)`（兼容旧数据的 `completed`）。
- Recent Orders：默认只显示成功订单；可用 `include_pending=1` 显示全部。
- Stats/Revenue：按成功订单统计。

### 变更

- 后端：Recent Orders 默认按“成功订单”过滤
  - 改动：`backend/controllers/dashboard.go`
    - `GET /api/v1/admin/dashboard/recent-orders?limit=5`：默认只返回 `paid + delivered/completed`。
    - 可选：`include_pending=1` 返回全部（用于排查/对账）。
    - 无数据时返回 `[]`（非 `null`）。
- 后端：Top Products 改为真实销量榜 + 支持时间范围
  - 改动：`backend/controllers/dashboard.go`
    - `GET /api/v1/admin/dashboard/top-products?limit=5&days=30`：最近 30 天成功订单的销量榜。
    - `days=0`：全部时间。
- 后端：Dashboard stats 与 revenue 统一口径
  - 改动：`backend/controllers/dashboard.go`
    - `total_orders/completed_orders/total_revenue/monthly_revenue/monthly_orders` 按成功订单口径统计。
    - `pending_orders` 统计“非 paid 且非 cancelled”的订单数量。

- 前端：Dashboard 接口参数对齐
  - 改动：`frontend/src/services/dashboard.service.ts`
    - `getRecentOrders(limit, includePending)` 支持传参。
    - `getTopProducts(limit, days)` 支持传参（默认 30 天）。
  - 改动：`frontend/src/app/admin/page.tsx`
    - Recent Orders 默认 `includePending=false`
    - Top Products 默认 `days=30`
    - 继续保留 loading/error/empty 展示。

### 验证方式

- 运行态检查（不改数据）：
  - `docker compose ps`
  - `curl -fsS http://localhost:3006/health`
- Admin API 冒烟（需要 token）：
  - `POST http://localhost:3006/api/v1/auth/login` 获取 token
  - Recent Orders：
    - `GET "http://localhost:3006/api/v1/admin/dashboard/recent-orders?limit=5"`
    - `GET "http://localhost:3006/api/v1/admin/dashboard/recent-orders?limit=5&include_pending=1"`
  - Top Products：
    - `GET "http://localhost:3006/api/v1/admin/dashboard/top-products?limit=5&days=30"`
    - `GET "http://localhost:3006/api/v1/admin/dashboard/top-products?limit=5&days=0"`
  - Stats：
    - `GET "http://localhost:3006/api/v1/admin/dashboard/stats"`
- 页面：登录后台后访问 `http://localhost:3006/admin`，Recent Orders/Top Products 使用真实数据（无数据则空态）。

### 注意事项 / 潜在风险 / 回滚

- 口径：本次按 `delivered` 口径统计，并兼容旧的 `completed`；如果你未来希望“只统计 delivered”或“confirmed+”，需要再统一调整 Where 条件。
- 时间范围：Top Products 默认 `days=30`；如果你希望在后台 UI 上可切换 7/30/90/0，我可以再加一个小下拉（不大改布局）。
- 回滚：
  - 后端：恢复 `backend/controllers/dashboard.go` 的查询逻辑（recent/top/stats/revenue）。
  - 前端：恢复 `frontend/src/app/admin/page.tsx` 的 mock fallback 或改回旧参数调用。

## 2026-01-18：修复 Admin Products 缩略图不显示（Next Image + /uploads）

### 问题

- 后台产品列表页（`/admin/products`）的缩略图部分图片加载不出来。
- 原因：图片路径是 `/uploads/*`（由 nginx -> backend 提供），但 `next/image` 默认会走 Next 的 image optimizer，docker 架构下会导致请求落到 Next 容器自身，出现 404/无法显示。

### 修复

- 对 `src` 以 `/uploads/` 开头的缩略图，增加 `unoptimized`，让浏览器直接请求 `/uploads/*`。
  - 改动：`frontend/src/app/admin/products/page.tsx`

### 验证方式

- 页面：登录后台后访问 `http://localhost:3006/admin/products`，产品缩略图应正常显示。
- 冒烟：
  - `curl -fsSI http://localhost:3006/admin/products | head`

### 回滚

- 回滚该行为：移除 `frontend/src/app/admin/products/page.tsx` 中 `Image` 的 `unoptimized` 条件。

## 2026-01-18：Admin Homepage Content 页面整理（大量区块时不再杂乱）

目标：当首页区块数据很多（包含自定义 section）时，左侧列表和布局排序面板不再“挤在一起”，更容易定位与管理。

### 变更

- 左侧增加区块筛选能力：搜索 + 过滤器
  - 改动：`frontend/src/app/admin/homepage/page.tsx`
    - 搜索框：按 name/key/description 模糊过滤
    - 过滤器：All / Primary / Custom / Active / Inactive
    - 顶部计数显示 `filtered/total`
- 布局排序面板默认收起
  - 改动：`frontend/src/app/admin/homepage/page.tsx`
    - 新增 `Layout` 切换按钮，按需展开“Homepage Layout Order”拖拽面板

### 验证方式

- 登录后台后打开：`http://localhost:3006/admin/homepage`
  - 使用搜索/过滤器定位区块
  - 点击 `Layout` 展开/收起拖拽排序面板，保存顺序仍生效

### 回滚

- 回滚：恢复 `frontend/src/app/admin/homepage/page.tsx` 里新增的 search/filter/layout toggle 相关 UI。

## 2026-01-18：Admin Homepage 编辑器进一步去杂乱（折叠分组 + 隐藏空白区块）

目标：
- 右侧编辑器内容多时不“铺满一页”，改为按模块折叠。
- 左侧列表支持隐藏“完全空白”的自定义区块（避免历史残留 section_key 太多）。

### 变更

- 左侧：增加“隐藏空白自定义区块”开关（默认开启）
  - 改动：`frontend/src/app/admin/homepage/page.tsx`
  - 判定逻辑：custom section 且 title/subtitle/description/image/button/data 都为空（或 data 为 `{}`/`[]`/`null`）时隐藏。
- 右侧：SimpleSectionEditor 增加折叠分组（Basics/Image/Button/Advanced JSON）
  - 新增：`frontend/src/components/admin/homepage/EditorPanel.tsx`
  - 改动：`frontend/src/components/admin/homepage/editors/SimpleSectionEditor.tsx`
    - Advanced 支持编辑 `data`（JSON 文本）

### 验证方式

- 登录后台访问 `http://localhost:3006/admin/homepage`
  - 左侧勾选/取消“隐藏空白自定义区块”，列表数量应变化
  - 选择一个 custom section，右侧编辑器应可折叠展开，并可在 Advanced 编辑 data JSON

### 注意事项 / 回滚

- `data_json` 为空时会保存 `data=null`（等价于清空 data）。
- 回滚：移除 `EditorPanel` 及 `SimpleSectionEditor` 的分组 UI，并删除左侧的 hide-empty 过滤开关。

## 2026-01-18：改为宿主机 Nginx（不在 docker-compose 里跑 nginx）

目标：不再在 docker-compose 内启动 nginx 容器，方便在宿主机直接配置证书（acme/letsencrypt）与反向代理。

### 变更

- `docker-compose.yml`
  - `backend` / `frontend` 增加端口绑定到宿主机 `127.0.0.1`：
    - `BACKEND_PORT`（默认 8080）
    - `FRONTEND_PORT`（默认 3000）
  - `nginx` 服务改为可选 profile：`internal-nginx`
    - 默认 `docker compose up -d` 不会启动 nginx
    - 如确实需要容器 nginx，可用：`docker compose --profile internal-nginx up -d nginx`
- `.env.docker.example`
  - `NEXT_PUBLIC_SITE_URL` / `SITE_URL` 默认改为 `http://localhost:3000`
  - 新增 `FRONTEND_PORT` / `BACKEND_PORT`
- 新增宿主机 Nginx 配置示例：`docs/host-nginx.conf.example`
  - 将 upstream 指向 `127.0.0.1:3000` 和 `127.0.0.1:8080`
  - 需你自行填入域名与 ssl 证书路径

### 验证方式

- 仅起三件套（无 docker nginx）：
  - `docker compose up -d --build mysql backend frontend`
  - `curl -fsS http://127.0.0.1:8080/health`
  - `curl -fsSI http://127.0.0.1:3000/ | head`
- 使用宿主机 Nginx 后：
  - 访问 `https://<your-domain>/`（前端）
  - `https://<your-domain>/api/v1/...`（后端）
  - `https://<your-domain>/uploads/...`（上传文件）

### 注意事项 / 回滚

- 安全：compose 里端口只绑定到 `127.0.0.1`，避免直接暴露在公网。
- CORS：你需要把 `CORS_ORIGINS` 配成你的真实域名（例如 `https://www.example.com`）。
- 回滚：删除 `backend/frontend` 的 ports 绑定，并恢复原本 docker nginx 服务的默认启用。

## 2026-01-18：修复“上传图片加载不出来”（去掉硬编码 BASE_URL + /uploads 代理）

### 问题

- 在不使用 docker 内置 nginx、改为宿主机 Nginx 的方案下，部分新上传图片 URL 会变成 `http://localhost:8080/uploads/...`（或历史遗留），导致：
  - 线上 https 站点出现 mixed-content
  - 或者图片绕过反代域名，浏览器访问不到
- 同时，在本地直接访问 Next（:3000）时，`/uploads/*` 没有反代的话也会 404。

### 修复

- 后端：上传接口返回相对路径 `/uploads/...`（避免写死 BASE_URL）
  - 改动：`backend/controllers/upload.go`
- 前端：在“无外部 Nginx”场景下，让 Next 直接代理 `/uploads/*` 到后端
  - 改动：`frontend/next.config.ts`
  - `rewrites` 增加：`/uploads/:path* -> {API_BASE}/uploads/:path*`
- 前端：统一图片 URL 处理逻辑
  - 改动：`frontend/src/lib/utils.ts`
  - 如果是 `http(s)://.../uploads/...` 会归一化成 `/uploads/...`；浏览器端优先用相对路径。

### 验证方式

- 直接验证后端静态：
  - `curl -fsSI http://127.0.0.1:8080/uploads/media/<file>.jpg | head`
- 直接访问 Next（无外部 Nginx）验证代理：
  - `curl -fsSI http://127.0.0.1:3000/uploads/media/<file>.jpg | head`
- 页面：后台 Media Library / Products / Homepage 等引用上传图的地方应恢复显示。

### 回滚

- 回滚后端：恢复 `backend/controllers/upload.go` 的 BASE_URL 拼接。
- 回滚前端：移除 `frontend/next.config.ts` 的 `/uploads` rewrite，及 `frontend/src/lib/utils.ts` 的 URL 归一化逻辑。

## 2026-01-21：管理员账号管理（禁用不需要的管理员 + 支持修改密码）

### 背景

- `admin_users` 表里存在两个 admin：
  - `admin`（full_name=System Administrator）
  - `yamatu`
- 需求：可以在后台修改管理员密码，并可禁用/删除不需要的管理员账号；同时避免把自己锁出系统。

### 代码改动

- 后端：增加安全校验，避免“最后一个 active admin”被删除/禁用，也避免用户禁用/删除自己
  - 改动：`backend/controllers/user.go`
    - UpdateUser：禁止对自己 `is_active=false`，并阻止禁用最后一个 active admin
    - DeleteUser：禁止删除自己，并阻止删除最后一个 active admin
- 前端：管理员编辑页增加“重置密码”输入框（可选，留空不修改）
  - 改动：`frontend/src/app/admin/users/[id]/edit/page.tsx`

### 数据库变更（本地已执行）

- 保留 `admin` 作为主账号（id=1），禁用 `yamatu`（id=2）：
  - `UPDATE admin_users SET is_active=0 WHERE id=2;`

### 验证方式

- DB 检查：
  - `SELECT id, username, is_active, role FROM admin_users ORDER BY id;`
- API：
  - `POST http://127.0.0.1:8080/api/v1/auth/login`（admin 登录应成功）
  - `POST http://127.0.0.1:8080/api/v1/auth/login`（yamatu 登录应返回 401）
- 页面：
  - `http://127.0.0.1:3000/admin/users` 列表中 yamatu 显示为 Inactive
  - `http://127.0.0.1:3000/admin/users/1/edit` 可设置新密码

### 回滚

- 把 `yamatu` 重新启用：
  - `UPDATE admin_users SET is_active=1 WHERE id=2;`

## 2026-01-21：前端 Docker Node 升级到 20（修复 cross-env@10 Node>=20 警告）

### 背景

- `frontend` 构建时出现：`cross-env@10.0.0 required node >=20`，而镜像是 Node 18。
- 虽然可能暂时不阻塞 build，但属于不稳定因素，建议直接升级到 Node 20。

### 变更

- `frontend/Dockerfile`：基础镜像从 `node:18-alpine` 升级到 `node:20-alpine`。

### 验证方式

- `docker compose build frontend`（应不再出现 cross-env 的 EBADENGINE 警告）
- `docker compose up -d frontend`
- `curl -fsSI http://127.0.0.1:3000/ | head`

### 注意事项

- `npm audit` 报告的 vulnerabilities 需要单独评估/升级依赖（不建议直接 `npm audit fix --force`）。

## 2026-01-22：升级 React 到 19.2.3（修复 RSC 安全漏洞区间）

### 背景

- React Server Components 相关组件在 19.0.0 ~ 19.2.1 区间存在高危漏洞风险（DoS / 信息泄露）。
- 本项目前端使用 `react` / `react-dom` 19.x（Next 15）。

### 变更

- `frontend/package.json`：
  - `react`：`19.1.0` -> `19.2.3`
  - `react-dom`：`19.1.0` -> `19.2.3`
- `frontend/package-lock.json`：随 `npm install` 更新

### 验证方式

- 本地依赖验证：
  - `cd frontend && npm ls react react-dom --depth=0`
- 容器构建验证（需要 Docker daemon 正常）：
  - `docker compose build frontend`

### 注意事项

- 这不是针对“xmrig 挖矿”类入侵的修复；若生产出现挖矿日志，需要按安全事件处理。

## 2026-01-22：引入 Redis（限流 + Public API 缓存）

目标：
- 抗攻击：登录接口按 IP 限流（默认 10 req/min/IP）。
- 抗压力：对常用 public GET 接口加 Redis 缓存，减少 DB 压力。
- 双保险：Nginx 侧也加基础限流（在到达 Go/Redis 之前先挡一层）。

### 变更

- Docker：新增 `redis` 服务（仅内部网络）
  - 改动：`docker-compose.yml`
  - 新增 volume：`redis_data`
- 后端：Redis client + 限流中间件 + 缓存中间件
  - 新增：`backend/config/redis.go`
  - 新增：`backend/middleware/rate_limit.go`（`/api/v1/auth/login` 限流）
  - 新增：`backend/middleware/cache.go`（public GET 缓存）
  - 改动：`backend/main.go`（启动时 `ConnectRedis()`）
  - 改动：`backend/routes/routes.go`
    - `POST /api/v1/auth/login`：加 `LoginRateLimitMiddleware()`
    - 缓存：
      - `GET /api/v1/public/categories`
      - `GET /api/v1/public/products`
      - `GET /api/v1/public/homepage-content`
- Nginx：增加基础限流（login 更严格）
  - 改动：`nginx.conf`

- 配置示例：补齐 Redis/限流/缓存 TTL 环境变量
  - 改动：`.env.docker.example`

### 验证方式

- 依赖：
  - `docker compose up -d redis`
- 限流验证（需要 Redis 生效）：
  - 连续请求 `POST /api/v1/auth/login` 超过 10 次/分钟应返回 `429`。
- 缓存验证：
  - `GET /api/v1/public/categories` / `products` / `homepage-content`
  - 第二次请求应更快，且响应头可看到 `X-Cache: HIT`（命中缓存时）。

### 注意事项 / 回滚

- Redis 连接不通时：中间件会自动降级为 no-op（不会阻断请求），但限流/缓存功能不会生效。
- 回滚：移除 `docker-compose.yml` 的 redis 服务与相关 env，并删除上述后端中间件/配置改动。

## 2026-01-18：后台“选择图库图片”弹窗支持批量上传 + 拖拽上传（产品/分类/首页通用）

### 变更

- `MediaPickerModal` 增强：
  - 弹窗内支持 `Upload` 多选上传
  - 支持拖拽图片到弹窗区域上传（批量）
  - 上传成功后会刷新列表，并自动把新上传的资源加入“已选择”
  - `frontend/src/components/admin/MediaPickerModal.tsx`
- i18n 文案补齐：
  - `frontend/src/lib/admin-i18n.tsx`

### 413 排查（上传图片报 Request Entity Too Large）

- Nginx 默认 `client_max_body_size` 是 `1m`，手机/相机照片很容易超过导致 413。
- Docker 场景：已在 `docker/nginx.conf` 提升到 `500m`（同时对 `/api/` location 显式设置）。
  - 注意：修改挂载的 nginx.conf 后，需要 reload/recreate nginx 容器才会生效：
    - `docker exec fanuc_nginx nginx -s reload`
    - 或 `docker compose up -d --force-recreate nginx`
- 线上自建 Nginx（仓库根目录 `nginx.conf`）也已加入 `client_max_body_size 500m`（以及 /api 超时放宽）。

### 支持的图片格式

- 后端允许的扩展名已扩展：jpg/jpeg/png/gif/webp/svg/avif/bmp/tif/tiff/heic/heif
  - `backend/utils/helpers.go`

### 覆盖范围

- 分类管理：选择分类图片时（`/admin/categories`）
- 产品创建/编辑：选择产品图片时（`/admin/products/new`、`/admin/products/:id/edit`）
- 首页内容编辑：各区块选择图片时（`/admin/homepage`）
