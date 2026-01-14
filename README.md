# FANUC VCO 项目（fanucnewvco）

本仓库包含一个面向 FANUC 配件/备件销售站点的完整系统：

- `frontend/`：Next.js 15（React 19）前端站点与后台管理界面
- `backend/`：Go（Gin + GORM）后端 API（鉴权、产品/分类、订单、优惠券、工单、上传、SEO sitemap 等）
- `nginx.conf`：Nginx 参考配置（反向代理/静态资源/安全头等）
- `scripts/`：SEO 优化相关脚本与说明

## ✨ 主要功能概览

- 商品浏览/筛选/分页、分类页与产品详情
- 购物车与结账流程（含 PayPal 相关流程）
- 管理后台：产品/分类/横幅/公司信息/首页内容/订单/用户/客户/优惠券/工单等
- SEO：sitemap（前端与后端均有相关路由/端点）、robots、结构化数据等
- 客户体系：注册/登录、用户中心、订单查询、工单提交

## 🚀 本地启动（开发环境）

### 1) 启动后端（Go）

1. 复制并配置环境变量：将 `backend/.env.example` 复制为 `backend/.env`，按需修改数据库与 JWT 配置
2. 确保本地 MySQL 可用（`DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME`）
3. 启动服务：

```bash
cd backend
go run .
```

默认监听 `http://127.0.0.1:8080`（可通过 `HOST/PORT` 修改）。

### 2) 启动前端（Next.js）

1. 复制并配置环境变量：将 `frontend/.env.example` 复制为 `frontend/.env.local`
2. 安装依赖并启动：

```bash
cd frontend
npm ci
npm run dev
```

访问 `http://localhost:3000`。

## 🐳 Docker 部署（推荐）

> 说明：本环境里未安装 Docker，我已补齐配置文件；你在服务器/本机装好 Docker 后按下面步骤执行即可。

### 1) 准备环境变量

在仓库根目录：

```bash
cp .env.docker.example .env
```

然后按需修改 `.env`（至少把 `MYSQL_ROOT_PASSWORD`、`MYSQL_PASSWORD`、`JWT_SECRET` 改掉）。

### 2) 启动（包含 MySQL + 后端 + 前端 + Nginx）

```bash
docker compose up -d --build
```

默认对外端口：
- 站点入口：`http://<服务器IP或域名>/`（Nginx 容器监听 80）
- 后端 API：通过 Nginx 转发（浏览器端使用 `/api/v1`）
- 健康检查：`http://<服务器IP或域名>/health`

### 3) 常用命令

```bash
docker compose ps
docker compose logs -f nginx
docker compose logs -f backend
docker compose down
```

### 4) 关键文件

- `docker-compose.yml`：一键编排
- `docker/nginx.conf`：容器内反向代理（前端 + `/api/*` 转发到后端）
- `backend/Dockerfile`：后端镜像构建
- `frontend/Dockerfile`：前端 standalone 构建（通过 build args 注入必要环境变量）

## 📚 相关文档

- PayPal 沙箱配置：`PAYPAL_SANDBOX_SETUP.md`
- 支付流程说明：`PAYMENT_FLOW_GUIDE.md`
- 用户系统说明：`USER_SYSTEM_COMPLETE.md`、`USER_SYSTEM_IMPLEMENTATION.md`
- SEO 优化脚本：`scripts/README.md`

## ⚠️ 安全提醒（强烈建议阅读）

- 不要提交包含真实凭证的文件：`**/.env*`（仓库已通过 `.gitignore` 默认忽略）
- 后端默认管理员创建逻辑：
  - 开发环境未配置 `SEED_DEFAULT_ADMIN` 时会创建默认管理员（密码兜底为 `admin123`，不会在日志输出明文）
  - 生产环境需要显式设置 `SEED_DEFAULT_ADMIN=true` 且提供 `DEFAULT_ADMIN_PASSWORD`
  - 已存在管理员时默认不会重置密码，除非设置 `RESET_DEFAULT_ADMIN_PASSWORD=true`
