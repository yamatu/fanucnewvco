# GeoScore 完整修复报告: www.vcocncspare.com

## 审计信息

- 生成时间: 2026-07-20T09:26:57.500Z
- 评分版本: 2.4.2
- 审计模式: url
- 目标: https://www.vcocncspare.com/

## 站点画像

- 站点类型: 本地商家
- 实体: Vcocnc
- 行业方向: 未知
- 业务模式: local_service
- 页面语言: en
- 根域名: vcocncspare.com

### 分类证据

- [site_structure] - https://www.vcocncspare.com/ - site_structure: Homepage LocalBusiness-compatible JSON-LD
- [json_ld] - https://www.vcocncspare.com/ - json_ld: LocalBusiness: Vcocnc

## 分数与评分限制

### 总分
- 最终分: 59/100
- 原始加权分: 87/100
- 覆盖率: 86%
- 置信度: 99%
- 最高分上限: 59/100
- 限制原因: major 失败上限 59/100 (seo.h1, seo.lab_performance, seo.lab_lcp); minor 失败上限 94/100 (seo.meta_description_length, seo.open_graph, seo.image_dimensions, seo.render_blocking, seo.form_labels, seo.descriptive_links, seo.skip_navigation); 证据覆盖率上限 89/100

### SEO
- 最终分: 59/100
- 原始加权分: 76/100
- 覆盖率: 86%
- 置信度: 99%
- 最高分上限: 59/100
- 限制原因: major 失败上限 59/100 (seo.h1, seo.lab_performance, seo.lab_lcp); minor 失败上限 94/100 (seo.meta_description_length, seo.open_graph, seo.image_dimensions, seo.render_blocking, seo.form_labels, seo.descriptive_links, seo.skip_navigation); 证据覆盖率上限 89/100

### GEO
- 最终分: 89/100
- 原始加权分: 100/100
- 覆盖率: 86%
- 置信度: 99%
- 最高分上限: 89/100
- 限制原因: 证据覆盖率上限 89/100

## 抽样页面

- **首页** - https://www.vcocncspare.com/ - 完成 - http

## 按页面与根因聚合的修复组

### 1. repair-parse-t756oj
- 阶段: parse
- 页面: https://www.vcocncspare.com/
- 严重度: major
- 检查项: `seo.h1`, `seo.meta_description_length`, `seo.render_blocking`, `seo.form_labels`, `seo.descriptive_links`, `seo.skip_navigation`, `seo.image_dimensions`
- 原始证据:
  - `seo.h1` @ https://www.vcocncspare.com/: 3 H1 elements
  - `seo.meta_description_length` @ https://www.vcocncspare.com/: 179 chars
  - `seo.render_blocking` @ https://www.vcocncspare.com/: 1 render-blocking scripts
  - `seo.form_labels` @ https://www.vcocncspare.com/: 1 input(s) missing label
  - `seo.descriptive_links` @ https://www.vcocncspare.com/: 2 generic link(s)
  - `seo.skip_navigation` @ https://www.vcocncspare.com/: Skip navigation link failed
  - `seo.image_dimensions` @ https://www.vcocncspare.com/: 7/7 images lack dimensions
- 修复任务:
  - **修复页面主标题结构** — 让每个页面保留一个描述该页核心主题的 H1，并将其他章节标题改为 H2/H3。 — 复验步骤: 检查渲染后的标题层级，确认只有一个 H1 后重新审计。
  - **修复Meta description 长度** — 只修改证据指向的字段：标题保持唯一且简洁，description 与可见内容一致，Open Graph 补齐核心字段，多语言页添加互相对应的 hreflang。 — 复验步骤: 检查最终 HTML head 中的对应标签和值，并重新审计目标页。
  - **优化阻塞渲染脚本** — 根据证据处理对应瓶颈：缓存或优化后端、为脚本添加 defer/async、启用 Brotli/Gzip、缩减初始 HTML 与不必要 DOM。 — 复验步骤: 重新抓取最终响应并比较响应时间、编码、文档体积、DOM 数或阻塞脚本数量。
  - **修复表单输入标签** — 为输入控件关联 label/ARIA 标签，使用 main/nav 地标，替换“点击这里”等泛化链接文字，并添加可聚焦的跳过导航链接。 — 复验步骤: 用键盘遍历页面并检查可访问性树，确认对应规则通过后重新审计。
  - **修复描述性链接文本** — 为输入控件关联 label/ARIA 标签，使用 main/nav 地标，替换“点击这里”等泛化链接文字，并添加可聚焦的跳过导航链接。 — 复验步骤: 用键盘遍历页面并检查可访问性树，确认对应规则通过后重新审计。
  - **修复跳过导航链接** — 为输入控件关联 label/ARIA 标签，使用 main/nav 地标，替换“点击这里”等泛化链接文字，并添加可聚焦的跳过导航链接。 — 复验步骤: 用键盘遍历页面并检查可访问性树，确认对应规则通过后重新审计。
  - **修复图片尺寸属性** — 为信息型图片写与内容一致的 alt，为装饰图使用空 alt；声明 width/height，并为大图提供 srcset/sizes。 — 复验步骤: 检查证据列出的 img 元素，确认属性已输出到最终 HTML 后重新审计。
- 复验步骤:
  - Inspect the rendered heading outline and re-audit after exactly one H1 remains.
  - Inspect the final HTML head for the exact tags and values, then re-audit the target page.
  - Fetch the final response again and compare latency, encoding, document size, DOM count, or blocking scripts.
  - Keyboard-test the page and inspect the accessibility tree, then re-audit until the rule passes.
  - Inspect the evidenced img elements in final HTML and re-run the audit.

### 2. repair-fetch-rwiaxh
- 阶段: fetch
- 页面: https://www.vcocncspare.com
- 严重度: major
- 检查项: `seo.lab_lcp`, `seo.lab_performance`
- 原始证据:
  - `seo.lab_lcp` @ https://www.vcocncspare.com: 5176.21113179556ms; <= 2500ms
  - `seo.lab_performance` @ https://www.vcocncspare.com: 76/100; >= 90/100
- 修复任务:
  - **改善实验室性能：LCP** — 以证据中的具体指标为目标：优化首屏关键资源与 LCP 元素，预留媒体尺寸减少 CLS，拆分长任务并降低主线程阻塞。 — 复验步骤: 重新运行 PageSpeed，并在有足够真实流量后复查 CrUX p75；确认该指标进入良好阈值。
  - **改善PageSpeed 实验室性能** — 以证据中的具体指标为目标：优化首屏关键资源与 LCP 元素，预留媒体尺寸减少 CLS，拆分长任务并降低主线程阻塞。 — 复验步骤: 重新运行 PageSpeed，并在有足够真实流量后复查 CrUX p75；确认该指标进入良好阈值。
- 复验步骤:
  - Re-run PageSpeed and later review CrUX p75 after sufficient traffic; confirm the metric reaches the good threshold.

### 3. repair-retrieval-1iq1uyu
- 阶段: retrieval
- 页面: https://www.vcocncspare.com/
- 严重度: minor
- 检查项: `seo.open_graph`
- 原始证据:
  - `seo.open_graph` @ https://www.vcocncspare.com/: Missing: og:image, og:type
- 修复任务:
  - **修复Open Graph 完整性** — 只修改证据指向的字段：标题保持唯一且简洁，description 与可见内容一致，Open Graph 补齐核心字段，多语言页添加互相对应的 hreflang。 — 复验步骤: 检查最终 HTML head 中的对应标签和值，并重新审计目标页。
- 复验步骤:
  - Inspect the final HTML head for the exact tags and values, then re-audit the target page.

## 全部失败项与修复方案

### 1. [MAJOR] H1 (`seo.h1`)
- 页面: https://www.vcocncspare.com/
- 检测来源: technical_seo
- 置信度: 100%
- 原始证据:
  - 3 H1 elements
- 失败原因: 页面没有且仅有一个可验证的 H1，主主题层级不清晰。
- 修改方法: 让每个页面保留一个描述该页核心主题的 H1，并将其他章节标题改为 H2/H3。
- 复验步骤: 检查渲染后的标题层级，确认只有一个 H1 后重新审计。

### 2. [MAJOR] 实验室性能：LCP (`seo.lab_lcp`)
- 页面: https://www.vcocncspare.com
- 检测来源: Google PageSpeed Insights API
- 置信度: 90%
- 原始证据:
  - 5176.21113179556ms; <= 2500ms
- 失败原因: CrUX 现场数据或 PageSpeed 实验室数据超过了良好体验阈值。
- 修改方法: 以证据中的具体指标为目标：优化首屏关键资源与 LCP 元素，预留媒体尺寸减少 CLS，拆分长任务并降低主线程阻塞。
- 复验步骤: 重新运行 PageSpeed，并在有足够真实流量后复查 CrUX p75；确认该指标进入良好阈值。

### 3. [MAJOR] PageSpeed 实验室性能 (`seo.lab_performance`)
- 页面: https://www.vcocncspare.com
- 检测来源: Google PageSpeed Insights API
- 置信度: 90%
- 原始证据:
  - 75/100; >= 90/100
- 失败原因: CrUX 现场数据或 PageSpeed 实验室数据超过了良好体验阈值。
- 修改方法: 以证据中的具体指标为目标：优化首屏关键资源与 LCP 元素，预留媒体尺寸减少 CLS，拆分长任务并降低主线程阻塞。
- 复验步骤: 重新运行 PageSpeed，并在有足够真实流量后复查 CrUX p75；确认该指标进入良好阈值。

### 4. [MINOR] 描述性链接文本 (`seo.descriptive_links`)
- 页面: https://www.vcocncspare.com/
- 检测来源: accessibility
- 置信度: 100%
- 原始证据:
  - 2 generic link(s)
- 失败原因: WCAG 结构证据显示表单、地标、链接文本或键盘跳转信息不完整。
- 修改方法: 为输入控件关联 label/ARIA 标签，使用 main/nav 地标，替换“点击这里”等泛化链接文字，并添加可聚焦的跳过导航链接。
- 复验步骤: 用键盘遍历页面并检查可访问性树，确认对应规则通过后重新审计。

### 5. [MINOR] 表单输入标签 (`seo.form_labels`)
- 页面: https://www.vcocncspare.com/
- 检测来源: accessibility
- 置信度: 100%
- 原始证据:
  - 1 input(s) missing label
- 失败原因: WCAG 结构证据显示表单、地标、链接文本或键盘跳转信息不完整。
- 修改方法: 为输入控件关联 label/ARIA 标签，使用 main/nav 地标，替换“点击这里”等泛化链接文字，并添加可聚焦的跳过导航链接。
- 复验步骤: 用键盘遍历页面并检查可访问性树，确认对应规则通过后重新审计。

### 6. [MINOR] 图片尺寸属性 (`seo.image_dimensions`)
- 页面: https://www.vcocncspare.com/
- 检测来源: on_page_seo
- 置信度: 100%
- 原始证据:
  - 7/7 images lack dimensions
- 失败原因: 已发现图片缺少替代文本、稳定尺寸或响应式候选，影响可访问性与加载稳定性。
- 修改方法: 为信息型图片写与内容一致的 alt，为装饰图使用空 alt；声明 width/height，并为大图提供 srcset/sizes。
- 复验步骤: 检查证据列出的 img 元素，确认属性已输出到最终 HTML 后重新审计。

### 7. [MINOR] Meta description 长度 (`seo.meta_description_length`)
- 页面: https://www.vcocncspare.com/
- 检测来源: technical_seo
- 置信度: 100%
- 原始证据:
  - 179 chars
- 失败原因: 当前 metadata 的长度、完整性或语言映射没有满足已验证条件，可能导致搜索摘要截断或页面关系不清晰。
- 修改方法: 只修改证据指向的字段：标题保持唯一且简洁，description 与可见内容一致，Open Graph 补齐核心字段，多语言页添加互相对应的 hreflang。
- 复验步骤: 检查最终 HTML head 中的对应标签和值，并重新审计目标页。

### 8. [MINOR] Open Graph 完整性 (`seo.open_graph`)
- 页面: https://www.vcocncspare.com/
- 检测来源: technical_seo
- 置信度: 100%
- 原始证据:
  - Missing: og:image, og:type
- 失败原因: 当前 metadata 的长度、完整性或语言映射没有满足已验证条件，可能导致搜索摘要截断或页面关系不清晰。
- 修改方法: 只修改证据指向的字段：标题保持唯一且简洁，description 与可见内容一致，Open Graph 补齐核心字段，多语言页添加互相对应的 hreflang。
- 复验步骤: 检查最终 HTML head 中的对应标签和值，并重新审计目标页。

### 9. [MINOR] 阻塞渲染脚本 (`seo.render_blocking`)
- 页面: https://www.vcocncspare.com/
- 检测来源: technical_seo
- 置信度: 100%
- 原始证据:
  - 1 render-blocking scripts
- 失败原因: 服务器响应或 HTML 交付证据超过了本检查的明确阈值。
- 修改方法: 根据证据处理对应瓶颈：缓存或优化后端、为脚本添加 defer/async、启用 Brotli/Gzip、缩减初始 HTML 与不必要 DOM。
- 复验步骤: 重新抓取最终响应并比较响应时间、编码、文档体积、DOM 数或阻塞脚本数量。

### 10. [MINOR] 跳过导航链接 (`seo.skip_navigation`)
- 页面: https://www.vcocncspare.com/
- 检测来源: accessibility
- 置信度: 100%
- 原始证据:
  - Skip navigation link failed
- 失败原因: WCAG 结构证据显示表单、地标、链接文本或键盘跳转信息不完整。
- 修改方法: 为输入控件关联 label/ARIA 标签，使用 main/nav 地标，替换“点击这里”等泛化链接文字，并添加可聚焦的跳过导航链接。
- 复验步骤: 用键盘遍历页面并检查可访问性树，确认对应规则通过后重新审计。

## 未知与错误检查

这些项目没有计为失败，也没有按 0 分处理；它们只影响证据覆盖率。

- [error] `seo.html_conformance` - HTML 规范性 - W3C Nu HTML Checker - W3C_REQUEST_REJECTED: W3C Nu HTML Checker returned HTTP 403
- [unknown] `seo.cwv_lcp` - Core Web Vitals：LCP - Chrome UX Report - CrUX API error: 400
- [unknown] `seo.cwv_cls` - Core Web Vitals：CLS - Chrome UX Report - CrUX API error: 400
- [unknown] `seo.cwv_inp` - Core Web Vitals：INP - Chrome UX Report - CrUX API error: 400
- [unknown] `seo.cwv_fcp` - 现场性能：FCP - Chrome UX Report - CrUX API error: 400
- [unknown] `seo.cwv_ttfb` - 现场性能：TTFB - Chrome UX Report - CrUX API error: 400
- [unknown] `geo.knowledge_graph` - 已验证知识图谱实体 - authority - No domain-verified entity found
- [unknown] `geo.common_crawl_presence` - Common Crawl 收录证据 - Common Crawl Index - No matching HTTP 200 HTML capture was found in the latest collection CC-MAIN-2026-25

## 不适用与信息项

- [pass] `seo.sample_coverage` - 整站抽样覆盖 - site_sampler - 1/1 pages fetched
- [not_applicable] `seo.cross_page_titles` - 跨页面标题一致性 - site_sampler - https://www.vcocncspare.com/: FANUC Parts &amp; Industrial Automation Components | Vcocnc
- [not_applicable] `seo.hreflang` - 多语言 hreflang - technical_seo - One sampled language detected: en
- [fail] `seo.security_headers` - 安全响应头覆盖 - technical_seo - Header coverage score 50/100
- [not_applicable] `seo.rss_feed` - RSS 或 Atom 订阅源 - technical_seo - local_business does not require a feed
- [pass] `geo.ai_crawler_policy` - AI 爬虫策略 - technical_seo - No supported search/index crawler block was detected
- [not_applicable] `geo.entity_consistency` - 跨页面实体一致性 - json_ld - Fewer than two sampled pages expose a comparable typed entity
- [not_applicable] `geo.author_signal` - 作者归属信号 - json_ld - https://www.vcocncspare.com/: Vcocnc Founder
- [not_applicable] `geo.direct_answer` - 直接回答结构 - page_structure - No sampled page type or query-shaped content requires a direct answer
- [not_applicable] `geo.claim_source_support` - 声明与来源关联 - content_sources - No source-dependent claims were detected in sampled content
- [not_applicable] `geo.statistic_provenance` - 统计数据来源 - content_sources - No numeric or statistical claims were detected
- [not_applicable] `geo.freshness` - 内容时效信号 - metadata - No sampled article, documentation, or news page requires a freshness signal
- [not_applicable] `geo.cross_page_consistency` - 跨页面站点身份一致性 - page_metadata - Fewer than two sampled pages expose a comparable site identity label
- [not_applicable] `geo.source_links` - 来源与外部引用 - content_quality - No source-dependent claims require outbound citations
- [not_applicable] `geo.llms_txt` - llms.txt - technical_seo - llms.txt is optional and was not found

## 匿名审计未运行的可选能力

- `geo_predicted` - Deprecated for new audits: dated Evidence Map snapshots are separate from factual scoring
- `keywords` - Deprecated for new audits: dated Evidence Map snapshots are separate from factual scoring
- `ai_content_insights` - Deprecated for new audits: dated Evidence Map snapshots are separate from factual scoring
- `off_page_seo` - Skipped in the v2 anonymous audit to keep the Cloudflare Workers Free request budget deterministic
- `site_intel` - Skipped in the v2 anonymous audit to keep the Cloudflare Workers Free request budget deterministic
- `redirect_chain` - Skipped in the v2 anonymous audit to keep the Cloudflare Workers Free request budget deterministic
- `security_audit` - Skipped in the v2 anonymous audit to keep the Cloudflare Workers Free request budget deterministic
- `ssl_cert` - Skipped in the v2 anonymous audit to keep the Cloudflare Workers Free request budget deterministic
- `domain_intel` - Skipped in the v2 anonymous audit to keep the Cloudflare Workers Free request budget deterministic
- `broken_links` - Skipped in the v2 anonymous audit to keep the Cloudflare Workers Free request budget deterministic

## 查询证据地图

- 尚未生成快照

## API 回答快照

- 尚未生成快照

## 监控历史

- 尚无监控历史

## 限制说明

- This is a prediction over sampled page evidence, not real ChatGPT, Perplexity, or Google AI citation monitoring.
- Predicted results never affect SEO, GEO, or overall scores.

## 交给开发 AI 的统一 Handoff Prompt

```text
请在网站代码库中一次性处理以下 GeoScore 2.4.2 失败项。先定位生成对应 URL 的源文件，保留现有框架和内容风格，只修改证据支持的部分。

1. seo.h1 on https://www.vcocncspare.com/: 让每个页面保留一个描述该页核心主题的 H1，并将其他章节标题改为 H2/H3。. Verify: 检查渲染后的标题层级，确认只有一个 H1 后重新审计。
2. seo.lab_lcp on https://www.vcocncspare.com: 以证据中的具体指标为目标：优化首屏关键资源与 LCP 元素，预留媒体尺寸减少 CLS，拆分长任务并降低主线程阻塞。. Verify: 重新运行 PageSpeed，并在有足够真实流量后复查 CrUX p75；确认该指标进入良好阈值。
3. seo.lab_performance on https://www.vcocncspare.com: 以证据中的具体指标为目标：优化首屏关键资源与 LCP 元素，预留媒体尺寸减少 CLS，拆分长任务并降低主线程阻塞。. Verify: 重新运行 PageSpeed，并在有足够真实流量后复查 CrUX p75；确认该指标进入良好阈值。
4. seo.descriptive_links on https://www.vcocncspare.com/: 为输入控件关联 label/ARIA 标签，使用 main/nav 地标，替换“点击这里”等泛化链接文字，并添加可聚焦的跳过导航链接。. Verify: 用键盘遍历页面并检查可访问性树，确认对应规则通过后重新审计。
5. seo.form_labels on https://www.vcocncspare.com/: 为输入控件关联 label/ARIA 标签，使用 main/nav 地标，替换“点击这里”等泛化链接文字，并添加可聚焦的跳过导航链接。. Verify: 用键盘遍历页面并检查可访问性树，确认对应规则通过后重新审计。
6. seo.image_dimensions on https://www.vcocncspare.com/: 为信息型图片写与内容一致的 alt，为装饰图使用空 alt；声明 width/height，并为大图提供 srcset/sizes。. Verify: 检查证据列出的 img 元素，确认属性已输出到最终 HTML 后重新审计。
7. seo.meta_description_length on https://www.vcocncspare.com/: 只修改证据指向的字段：标题保持唯一且简洁，description 与可见内容一致，Open Graph 补齐核心字段，多语言页添加互相对应的 hreflang。. Verify: 检查最终 HTML head 中的对应标签和值，并重新审计目标页。
8. seo.open_graph on https://www.vcocncspare.com/: 只修改证据指向的字段：标题保持唯一且简洁，description 与可见内容一致，Open Graph 补齐核心字段，多语言页添加互相对应的 hreflang。. Verify: 检查最终 HTML head 中的对应标签和值，并重新审计目标页。
9. seo.render_blocking on https://www.vcocncspare.com/: 根据证据处理对应瓶颈：缓存或优化后端、为脚本添加 defer/async、启用 Brotli/Gzip、缩减初始 HTML 与不必要 DOM。. Verify: 重新抓取最终响应并比较响应时间、编码、文档体积、DOM 数或阻塞脚本数量。
10. seo.skip_navigation on https://www.vcocncspare.com/: 为输入控件关联 label/ARIA 标签，使用 main/nav 地标，替换“点击这里”等泛化链接文字，并添加可聚焦的跳过导航链接。. Verify: 用键盘遍历页面并检查可访问性树，确认对应规则通过后重新审计。

不得虚构价格、套餐、服务、地址、实体、作者、统计来源或站点未公开的业务事实。不得自动发布。
完成后运行项目现有测试/构建，并逐项说明修改文件、证据对应关系与复验结果。
```
