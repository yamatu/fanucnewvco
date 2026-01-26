# 运费模板（按国家）+ XLSX 批量导入

目标：你可以为不同国家设置固定运费；结算时会自动把运费加到订单总价（不再加 10% tax）。

## 1) 更新并重启

```bash
git pull
```

后端重启（让数据库自动迁移新增表/字段）：

```bash
cd backend
go run .
```

前端重建/重启（后台新增 Shipping Rates 页面 & 结算页新增 Country）：

```bash
cd frontend
npm run build
npm run start
```

## 2) 在后台配置运费

后台入口：`Admin -> Shipping Rates`

你有两种方式：

### A. 手动新增/修改

- Code：国家二字码（ISO2），例如 `US` / `CN`
- Country name：国家名称
- Fee：运费（默认 USD）

### B. XLSX 批量导入

1) 点击 `Download Template` 下载模板
2) 填写后保存为 `.xlsx`
3) 点击 `Choose XLSX` 选择文件
4) 点击 `Import`

模板列：

- `Country Code (ISO2)`
- `Country Name`
- `Shipping Fee`
- `Currency`（默认 USD）

导入规则：

- 相同 `Country Code` 会自动更新（upsert）
- 没有则创建

## 3) 结算页如何计算

结算页新增 `Shipping Country` 下拉，选国家后：

`订单总价 = 商品小计 - 优惠 + 运费`

说明：优惠券只按商品小计计算，不参与运费。

## 4) 重要说明：已移除 10% tax

之前结算页有固定 `10% tax`（仅展示用），现在已删除，不再参与任何展示/支付金额。
