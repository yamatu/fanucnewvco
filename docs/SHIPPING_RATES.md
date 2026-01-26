# 运费模板（按国家 + 重量kg）+ XLSX 批量导入

目标：你可以为不同国家配置“重量区间 + 每公斤费用 + 报价附加费”；结算时系统会根据购物车总重量自动计算运费，并加到订单总价。

## 1) 配置入口

后台：`Admin -> Shipping Rates`

支持：

- XLSX 批量导入（推荐）
- 批量删除（Delete Selected / Delete All）

## 2) XLSX 模板

点击 `Download XLSX Template` 下载模板。

模板包含 2 个 sheet：

### Sheet: `WeightKg`

必填（每个国家至少要有 1 行）：

- `国家代码(Country Code)`：ISO2，例如 `US`
- `国家(Country Name)`：例如 `United States`
- `最小公斤(Min Kg)`
- `最大公斤(Max Kg)`：填 `0` 或留空表示“无上限”
- `每公斤费用(Rate Per Kg)`
- `币种(Currency)`：默认 `USD`

`Min/Max` 也支持直接写区间：

- `21.0 - 44.0`

### Sheet: `QuoteSurcharge`（可选）

用于配置“报价 -> 附加费”的阶梯表（可不填）。

- `国家代码(Country Code)`
- `国家(Country Name)`
- `报价(Quote)`
- `附加费(Additional Fee)`
- `币种(Currency)`

## 3) 运费计算逻辑

下单时系统会统计购物车总重量：

`total_weight_kg = Σ(商品重量kg × 数量)`

然后根据国家模板计算：

1) 先用 `WeightKg` 匹配重量区间，拿到 `rate_per_kg`
2) `base_quote = total_weight_kg × rate_per_kg`
3) （可选）从 `QuoteSurcharge` 里匹配 `base_quote` 对应的 `additional_fee`
4) `shipping_fee = base_quote + additional_fee`

## 4) 重新上传/替换

如果你每次调整运费都要重新上传：

- 勾选 `Replace existing rules` 后再导入，会先删除该国家旧规则，再写入新规则
- 或者用 `Delete Selected / Delete All` 先批量删除
