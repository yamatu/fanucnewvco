# 前端（Next.js）

该目录是站点前端与后台管理界面（Next.js 15 + React 19）。

## ✅ 环境变量

1. 复制 `frontend/.env.example` 为 `frontend/.env.local`
2. 填写最关键的变量：
   - `NEXT_PUBLIC_API_BASE_URL`：后端 API 地址（开发默认 `http://127.0.0.1:8080`）
   - `NEXT_PUBLIC_PAYPAL_CLIENT_ID`：PayPal Client ID（沙箱/生产按需配置）

更多说明见：`frontend/ENV_SETUP_GUIDE.md`、`PAYPAL_SANDBOX_SETUP.md`。

## 🚀 本地开发

```bash
npm ci
npm run dev
```

默认访问：`http://localhost:3000`

## 🏗️ 构建与启动（生产）

```bash
npm ci
npm run build
npm run start
```

备注：
- 本项目 `start` 脚本使用 `.next/standalone/server.js` 启动（适合容器/服务器部署）
- 可参考 `frontend/Dockerfile`、`frontend/nginx.conf`、`frontend/ecosystem.config.js`
