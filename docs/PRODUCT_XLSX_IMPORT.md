# 产品 XLSX 批量导入（FANUC v1）

目标：你只需要维护一个 XLSX 表格（型号/价格/数量），上传后系统会自动把价格和库存导入到产品列表。

如果数据库里已经有该型号的产品，会自动匹配并更新价格/库存；
如果没有该型号产品（默认开启），会自动创建一个新产品，并为 FANUC 自动生成：

- 标题（name）
- 描述（description）
- SEO 三项（meta_title / meta_description / meta_keywords）
- 通过型号前缀推断类型并分配默认分类（Category）

你后续只需要去后台给这些产品补充图片即可。

## 1. 入口在哪里？

后台：`Admin -> Products` 页面右上角有 `Bulk Import` 按钮。

## 2. 下载模板

1) 点击 `Bulk Import`
2) 点击 `Download Template`

模板列：

- `型号(Model)`
- `价格(Price)`
- `数量(Quantity)`

## 3. 填写模板

从第 2 行开始填数据（第 1 行是表头）。示例：

| 型号(Model) | 价格(Price) | 数量(Quantity) |
|---|---:|---:|
| A02B-0120-C041 | 1200 | 5 |

注意：

- 价格支持整数或小数
- 数量支持整数（如果你填的是 `5.0` 这种也能识别）
- 空行会自动跳过

## 4. 上传导入

1) 点击 `Bulk Import`
2) 选择 `.xlsx` 文件
3) 可选项：

- `Create missing products`：
  - 开启：库里不存在型号时会自动创建产品（默认开启）
  - 关闭：库里不存在型号时跳过

- `Overwrite name/description/SEO`：
  - 关闭（默认）：只更新价格/库存；标题/描述/SEO 仅在为空时自动补齐
  - 开启：会用自动生成内容覆盖标题/描述/SEO（谨慎使用）

4) 点击 `Import`

导入完成后会显示：总行数、创建数量、更新数量、失败行等明细。

## 5. 匹配规则（如何找到“同一个产品”）

系统会按以下方式尝试匹配：

1) `sku` 精确匹配（支持你 SKU 前面带 `FANUC-` 的情况）
2) `model` 或 `part_number` 精确匹配
3) `sku/model/part_number` 前缀匹配（以型号开头）
4) 去掉 `-` 和 `/` 的 SKU 兜底匹配

因此建议你把“型号”直接作为 SKU 来使用（最稳定）。

## 6. FANUC 类型推断与默认分类

当前 v1 规则（后续可扩展）：

- `A02B / A16B / A20B ...` -> `PCB Boards`
- `A03B ...` -> `I/O Modules`
- `A06B ...` -> `Servo Motors`（本项目里该分类同时承载电机/驱动相关）
- `A14B ...` -> `Power Supplies`
- `A66x / CABLE / CONNECTOR ...` -> `Cables & Connectors`

如果无法识别，会默认归到 `PCB Boards`。

## 7. 自动生成内容是什么样？

当需要生成（创建新产品，或你开启了 Overwrite/字段为空）时：

- `name`：`FANUC <型号> <类型>`
- `description`：会生成带分段的文本（Overview / Compatibility / Why buy...），适合产品详情页展示
- SEO：会生成相对合理的标题/描述/关键词，并控制长度

## 8. 后续：补图片

导入只处理型号/价格/库存与文本内容。
图片请在后台产品编辑页使用现有的图片上传/媒体库功能补齐。

## 9. 为其他品牌预留

导入接口已支持 `brand` 参数（目前仅实现 `fanuc`）。后续要新增 Mitsubishi/Siemens 等品牌时，可以在后端扩展新的品牌生成器，并在前端下拉增加选项。
