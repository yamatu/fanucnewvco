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
- 说明：模板默认提供 0.5kg ~ 20.5kg（每 0.5kg 一行，共 40 行）。
- `Over21Kg_Zones`：>=21kg，按 Zone + 区间 填“最终每公斤价格”

上传后系统会根据 `CountryZones` 把每个 Zone 的规则展开成“每个国家一套模板”，用于运费计算与查询。

### FedEx eBay 表（你现在这个 `Fedex价格表2025上ebay.xlsx`）怎么导入

你这个文件的费率在 sheet：`加过利润的所有运费（含旺季附加费）`。
系统已经支持直接从这个 sheet 读取费率（你不需要把费率再手工复制到 `Under21Kg_Zones/Over21Kg_Zones`）。

你需要做的只有一件事：在这个 Excel 里新增一个 sheet：`CountryZones`（国家 -> Zone 映射）。

1) 打开 `Fedex价格表2025上ebay.xlsx`
2) 新建 sheet，命名为 `CountryZones`
3) 第一行写表头（三列即可，第四列备注可选）：

   - `country_code`：ISO2，两位国家码，例如 `DE` `JP` `CA`
   - `country_name`：可写可不写（只是方便你看）
   - `zone`：对应 FedEx 的分区代码，例如 `K` `P` `N` `U` `1` `2`
   - `note`：可选，备注（系统会忽略）

4) 下面给你 10 个例子（这些 Zone 你仍然建议对照你选择的服务列确认一次）：

   - `CA` Canada -> `N`
   - `AU` Australia -> `U`
   - `DE` Germany -> `K`
   - `FR` France -> `K`
   - `IT` Italy -> `K`
   - `JP` Japan -> `P`
   - `BR` Brazil -> `G`
   - `IN` India -> `O`
   - `VN` Vietnam -> `B`
   - `TH` Thailand -> `R`

5) 去后台：Admin -> Shipping Rates -> 选择「按承运商」
6) 填：Carrier= `FEDEX`，ServiceCode= `IP`（你自己定义，用于区分多套模板），Currency= `USD` 或 `CNY`
7) 选择刚才改好的 XLSX 上传导入

### 常见坑

- 没有 `CountryZones`：会导入失败（因为系统不知道每个国家属于哪个 Zone）。
- `country_code` 必须是 ISO2（两位大写，例如 `DE`），不要写国家中文名。
- `zone` 必须和你价目表里的 Zone 一致（例如 `K` / `P` / `N` / `U` / `1` / `2`）。
- 美国经常会有 `1/2` 两种 Zone（按州/邮编划分）。当前系统是“按国家”计算，不支持按州/邮编；如果你需要更精细，我可以继续把系统扩展成“国家+州/邮编段”规则。

## 4) 重新上传/替换

如果你每次调整运费都要重新上传：

- 勾选 `Replace existing rules` 后再导入，会先删除该国家旧规则，再写入新规则
- 或者用 `Delete Selected / Delete All` 先批量删除
