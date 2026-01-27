# 运费模板（按国家 + 重量kg）+ XLSX 批量导入（单 Sheet 版）

目标：你可以为不同国家配置“重量区间 + 每公斤费用 + 报价附加费”；结算时系统会根据购物车总重量自动计算运费，并加到订单总价。

## 1) 配置入口

后台：`Admin -> Shipping Rates`

支持：

- XLSX 批量导入（推荐）
- 批量删除（Delete Selected / Delete All）

## 2) XLSX 模板（你要的单 Sheet 格式）

点击 `Download XLSX Template` 下载模板。

模板只有 1 个 Sheet（默认叫 `Shipping` 或 `Sheet1`），里面分 2 个表：

### 表 A：`<21kg` 运费（按整数公斤直接取值）

你填的是“最终运费”，不是每公斤价格。

列按国家横向展开（3 列一组）：

- `US | 重量(kg) | 价格(运费)`
- `CN | 重量(kg) | 价格(运费)`
- ... 你有多少国家就继续往右加

说明：

- 下单/报价时如果 `重量 < 21kg`：系统会先向上取整到整数公斤（例：`15.6kg -> 16kg`），然后在表 A 里找 `重量=16` 的那一行，直接取对应的“价格(运费)”
- 表 A 建议填写 1~20（或你需要的范围）

### 表 B：`>=21kg` 区间（每公斤价格，用乘法算）

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

2) `total_weight_kg < 21kg`：从表 A 直接取“运费”

3) `total_weight_kg >= 21kg`：从表 B 匹配区间并按乘法算 `base_quote = billing_weight_kg × rate_per_kg`
3) （可选）从 `QuoteSurcharge` 里匹配 `base_quote` 对应的 `additional_fee`
4) `shipping_fee = base_quote + additional_fee`

提示：单 sheet 模板默认不包含 `QuoteSurcharge`（附加费）。如果你后续还要保留“报价->附加费”的逻辑，可以继续用旧模板的 `QuoteSurcharge` sheet（系统仍支持）。

## 4) 重新上传/替换

如果你每次调整运费都要重新上传：

- 勾选 `Replace existing rules` 后再导入，会先删除该国家旧规则，再写入新规则
- 或者用 `Delete Selected / Delete All` 先批量删除
