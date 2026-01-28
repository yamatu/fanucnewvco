# 运费模板（按国家 + 重量kg）+ XLSX 批量导入（两张表，支持多国家）

目标：你可以为不同国家配置“重量区间 + 每公斤费用 + 报价附加费”；结算时系统会根据购物车总重量自动计算运费，并加到订单总价。

## 1) 配置入口

后台：`Admin -> Shipping Rates`

支持：

- XLSX 批量导入（推荐）
- 批量删除（Delete Selected / Delete All）

## 2) XLSX 模板（推荐：Sheet1 + Sheet2）

点击 `Download XLSX Template` 下载模板。

模板包含 2 个 Sheet：

### Sheet1：`Under21Kg`（<21kg 运费，按整数公斤直接取值）

你填的是“最终运费”，不是每公斤价格。

列按国家横向展开（共享同一列“重量(kg)”）：

- A 列：`重量(kg)`（建议填 1 ~ 20）
- B 列开始：每一列就是一个国家简写（ISO2），例如 `US`、`CN`、`DE`...

示例表头：

- `重量(kg) | US | CN | ...`

说明：

下单/报价时如果 `重量 < 21kg`：系统会先向上取整到整数公斤（例：`15.6kg -> 16kg`），然后在 Sheet1 里找 `重量=16` 的那一行，读取对应国家列的“运费”。

### Sheet2：`Over21Kg`（>=21kg 区间，每公斤价格，用乘法算）

3 列，按行填写：

- `国家代码`：例如 `US`
- `重量区间(kg)`：例如 `21.0 - 44.0`
- `每公斤价格`：例如 `10`

说明：

- 下单/报价时如果 `重量 >= 21kg`：会根据区间匹配 `每公斤价格`，然后 `运费 = 重量 × 每公斤价格`

兼容：系统仍兼容旧的 `WeightKg/QuoteSurcharge` 双 sheet 模板；但推荐你统一用本单 sheet 格式。

## 3) 运费计算逻辑

下单时系统会统计购物车总重量：

`total_weight_kg = Σ(商品重量kg × 数量)`

然后根据国家模板计算：

1) 计费重量（billing weight）：

- `total_weight_kg < 21kg`：向上取整到整数公斤（例：`15.6kg -> 16kg`）
- `total_weight_kg >= 21kg`：使用实际重量

2) `total_weight_kg < 21kg`：从 `Under21Kg` 直接取“运费”

3) `total_weight_kg >= 21kg`：从 `Over21Kg` 匹配区间并按乘法算 `base_quote = billing_weight_kg × rate_per_kg`
3) （可选）从 `QuoteSurcharge` 里匹配 `base_quote` 对应的 `additional_fee`
4) `shipping_fee = base_quote + additional_fee`

提示：如果你后续还要保留“报价->附加费”的逻辑，可以继续额外带上旧模板的 `QuoteSurcharge` sheet（系统仍支持，非必填）。

## 2.1) 承运商模板（FedEx/DHL：按 Zone 导入）

如果你有类似 FedEx/DHL 的“分区(Zone) + 重量”的价目表，并希望在后台维护多套承运商运费（例如同时维护 FEDEX、DHL），可以使用承运商模板。

下载承运商模板：后台 `Shipping Rates` 页面切换到「按承运商」，点击「下载承运商模板」。

模板包含 4 个 Sheet：

- `CarrierMeta`：承运商/服务/币种（例如 `Carrier=FEDEX`, `ServiceCode=IP`, `Currency=USD`）
- `CountryZones`：国家 ISO2（例如 US、CN）对应的 Zone
- `Under21Kg_Zones`：<21kg（支持 0.5kg 步进），按 Zone 填“最终运费”（不是每公斤）
- `Over21Kg_Zones`：>=21kg，按 Zone + 区间 填“最终每公斤价格”

上传后系统会根据 `CountryZones` 把每个 Zone 的规则展开成“每个国家一套模板”，用于运费计算与查询。

## 4) 重新上传/替换

如果你每次调整运费都要重新上传：

- 勾选 `Replace existing rules` 后再导入，会先删除该国家旧规则，再写入新规则
- 或者用 `Delete Selected / Delete All` 先批量删除
