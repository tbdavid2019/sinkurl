# CHANGELOG & Deployment Gotchas (開發與部署備忘錄)

本文件記錄了專案開發、部署及設定過程中遇到的一些關鍵「坑」與解決方案，供後續維護參考。

---

## 📅 [2026-09-03]

### 📌 儀表板執行期錯誤與即時分析修復 (Fix Dashboard 404 & Realtime Globe)

* **修復 `/dashboard/links` 拋出 404 錯誤**：
  * 在 [`app/components/dashboard/links/Editor.vue`](app/components/dashboard/links/Editor.vue) 中移除 JavaScript SFC `<script setup>` 內非法的 `<string | undefined>` TypeScript 泛型語法，避免瀏覽器將其視為變數比較運算並拋出 `ReferenceError: string is not defined` 導致 Nuxt 渲染 404 錯誤頁。
* **修復 `/dashboard/realtime` 3D 地球儀與即時日誌空白崩潰**：
  * 重建並補回遺失之 [`server/api/logs/events.get.ts`](server/api/logs/events.get.ts) 與 [`server/api/logs/locations.get.ts`](server/api/logs/locations.get.ts) 統計端點，並加入安全查詢與錯誤攔截。
  * 在 [`app/components/dashboard/realtime/Globe.vue`](app/components/dashboard/realtime/Globe.vue) 與 [`Logs.vue`](app/components/dashboard/realtime/Logs.vue) 加入 `try/catch` 容錯防護，即使 Analytics 資料集暫無數據也不會中斷 3D 地球儀初始化渲染。
* **客戶端 `/dashboard` 路由補齊**：
  * 新增 [`app/pages/dashboard/index.vue`](app/pages/dashboard/index.vue)，確保客戶端導航存取 `/dashboard` 時能正確跳轉至 `/dashboard/links`。
* **`Logs.vue` 陣列原地修改副作用修復**：
  * 在 [`app/components/dashboard/realtime/Logs.vue`](app/components/dashboard/realtime/Logs.vue) 中改以 `[...data].reverse()` 淺拷貝反轉陣列，避免 `Array.prototype.reverse()` 原地修改造成潛在副作用。
* **文件本機路徑 (Local file URIs) 清理**：
  * 清理 [`CHANGELOG.md`](CHANGELOG.md) 與 [`README.md`](README.md) 中所有的 `file:///Users/david/...` 本機絕對路徑，全數改為相對路徑。
* **API 降級可觀測性強化與 Cloudflare Workers Observability**：
  * 在 [`server/api/logs/events.get.ts`](server/api/logs/events.get.ts) 與 [`server/api/logs/locations.get.ts`](server/api/logs/locations.get.ts) 加入 `X-Sink-Status: degraded` 響應標頭，讓前端維持優雅降級不白屏的同時，邊緣端與開發者能清楚追蹤異常降級請求。
  * 在 [`wrangler.jsonc`](wrangler.jsonc) 配置 `"observability": { "enabled": true }`，啟用 Cloudflare Workers 100% 原生日誌串流與可觀測性追蹤。

---

### 📌 全面安全性稽核與漏洞修復 (Security Audit Remediation)

經過 Cloudflare `security-audit-skill` 6 階段深度稽核，全面修復發現的高風險與中風險安全弱點：

### ✅ 變更內容

* **URL 協議限制與 Stored DOM XSS 防禦**：
  * 在 [`schemas/link.ts`](schemas/link.ts) 中針對 `url` 與 `image` 加入協定限制驗證，強制僅允許 `http://` 與 `https://`，嚴格阻斷 `javascript:`、`data:` 與 `vbscript:` 偽協定。
  * 在 [`server/api/link/ai.get.ts`](server/api/link/ai.get.ts) 補齊 URL 最大長度與 `http`/`https` 驗證。
  * 在 [`server/middleware/1.redirect.ts`](server/middleware/1.redirect.ts) 執行重定向與渲染前強制檢查 `target` 協定。
* **過渡跳轉頁面 XSS 與腳本逃逸防護**：
  * 在 [`server/middleware/1.redirect.ts`](server/middleware/1.redirect.ts) 新增 `sanitizeTransitionHtml` 過濾器，清除 `transitionContent` 內的危險標籤（`<script>`、`<iframe>`、`<object>` 等）與 `on*` 事件屬性。
  * 新增 `safeJsonStringify` 序列化函式，將內聯 `<script>` 中的 `<` 逸出為 `\u003c`，杜絕藉由 `</script>` 標籤逃逸執行的 XSS。
* **Markdown 渲染 XSS 防禦**：
  * 在 [`app/pages/index.vue`](app/pages/index.vue) 與 [`app/components/dashboard/settings/Index.vue`](app/components/dashboard/settings/Index.vue) 的 `marked.parse` 輸出端新增 HTML 清洗函式，消除公開首頁與後台預覽區塊的代碼注入風險。
* **MCP 服務存取控制與防竄改強化**：
  * **Fail-Closed 驗證防護**：修正 [`server/utils/mcp.ts`](server/utils/mcp.ts) `isAuthorized`，當未配置站點金鑰時強制拒絕存取（fail-closed），杜絕空金鑰全開放漏洞。
  * **Demo 預覽模式保護**：在 MCP `delete_link` 工具中補齊 `previewMode` 判斷，阻斷 demo 站點利用公開 `SinkCool` 金鑰刪除短網址的越權操作。
  * **保留路由衝突防護**：在 MCP `shorten_url`、`server/api/link/create.post.ts` 與 `server/api/link/upsert.post.ts` 全面強制校驗 `appConfig.reserveSlug`，防止惡意佔用 `dashboard`、`api`、`mcp` 等系統核心路徑。
  * **未授權查詢脫敏**：未攜帶合法金鑰調用 MCP `lookup_link` 時自動過濾管理備註 `comment` 等機敏欄位。
* **Cloudflare Analytics Engine SQL 注入與錯誤洩漏修復**：
  * 在 [`server/api/stats/views.get.ts`](server/api/stats/views.get.ts) 中為 `clientTimezone` 加上嚴格的 IANA 時區正則校驗 `/^[A-Za-z0-9_/+ -]+$/`，並將 `unit` 限制為 enum，杜絕 ClickHouse 語法破出注入。
  * 在 [`server/api/stats/views.get.ts`](server/api/stats/views.get.ts)、[`metrics.get.ts`](server/api/stats/metrics.get.ts) 與 [`counters.get.ts`](server/api/stats/counters.get.ts) 將 `useWAE` 包裹於 `try/catch` 之中，遮蔽上游錯誤訊息，防止 `cfAccountId` 等帳號資訊外洩。
  * 在 `metrics.get.ts` 驗證 `query.type` 是否存在於 `logsMap` 鍵值中。
* **過渡頁面追蹤信標 401 錯誤修復**：
  * 調整 [`server/middleware/2.auth.ts`](server/middleware/2.auth.ts)，將 `/api/tracking/event` 納入身分驗證豁免清單，讓一般訪客於過渡跳轉頁面觸發的 GA4 / Meta Pixel / LINE 追蹤事件與 Token 驗證能正常傳輸。
* **測試覆蓋**：
  * 於 [`tests/api/link.spec.ts`](tests/api/link.spec.ts) 補充安全性迴歸測試（阻擋 `javascript:`、阻擋保留 slug、驗證追蹤信標），全數 51 個測試皆順利通過。

---

## 📅 [2026-08-19]

### 📌 新增 Model Context Protocol (MCP) 與 Cloudflare WebMCP 支援

### ✅ 變更內容

* **標準 JSON-RPC 2.0 MCP 端點**：新增 `/mcp` 與 `/api/mcp` 端點，支援 Model Context Protocol 標準協議規範（版本 `2024-11-05`），包含 `initialize`、`ping`、`tools/list`、`tools/call`、`resources/list` 與 `resources/read`。
* **提供 6 大核心 AI Tools**：
  1. `shorten_url`：建立短網址（支援自訂 slug、過期時間如 `1h`, `7d`、註解備註與 OG 卡片設定，自動支援隨機短網址重複使用）。
  2. `lookup_link`：查詢特定短網址之目的網址、過期時間與建立資訊。
  3. `list_links`：分頁查詢短網址清單（需帶 Site Token 驗證）。
  4. `delete_link`：刪除特定短網址與關聯索引（需帶 Site Token 驗證）。
  5. `get_link_analytics`：查詢短網址點擊分析與訪問指標（需帶 Site Token 驗證）。
  6. `get_service_info`：查詢 Sink 服務狀態、版本與 WebMCP 特性能力。
* **WebMCP 瀏覽器端原生支援**：
  * **HTML Head 探索標籤**：新增 `<link rel="model-context" href="/mcp">` 與 `<meta name="model-context-protocol" content="/mcp">`。
  * **Nuxt 4 Client Plugin**：新增 [app/plugins/webmcp.client.ts](app/plugins/webmcp.client.ts)，當 Chrome 146+ 或 Cloudflare BrowserRun 啟用 `document.modelContext` / `navigator.modelContext` 時，自動向瀏覽器註冊工具。
  * **獨立 Bridge 腳本**：新增 [public/.webmcp/bridge.js](public/.webmcp/bridge.js) 橋接腳本（相容 ES Module 腳本中 `document.currentScript` 為 null 之情境，並具備精確選取器與 `/mcp` fallback），相容 Cloudflare WebMCP 邊緣注入與外部網頁嵌入。
* **雙路由端點架構**：統一由 `server/utils/mcp.ts` 導出 `handleMcpEvent`，供 `/mcp`（WebMCP 預設探索路徑）與 `/api/mcp`（標準 API 客戶端）共用並標註明確註解說明。
* **安全與權限隔離**：
  * 公開查詢與快速縮短支援無障礙調用。
  * 管理類 Tools（列表、刪除、統計數據）支援透過 HTTP `Authorization: Bearer <token>` 或 Tool 參數 `token` 進行多層次授權驗證。
* **保留路由更新**：於 [app/app.config.ts](app/app.config.ts) 的 `reserveSlug` 補上 `mcp`、`.webmcp` 與 `api`，避免短網址路由衝突。
* **測試覆蓋**：新增 [tests/mcp.spec.ts](tests/mcp.spec.ts)，完整覆蓋 MCP 初始化、工具清單、工具調用、未授權阻擋、Bearer 授權執行與刪除流程（11 個測試全數通過）。

---

## 📅 [2026-08-04]

### 📌 新增 OG 預覽透通模式 (Passthrough Mode) 支援

### ✅ 變更內容

* **新增 OG 預覽透通模式 (Passthrough Mode)**：當社群平台預覽爬蟲（Facebook、LINE、X/Twitter、Telegram、Discord 等）存取短網址時，支援選擇「透通模式」，使系統直接回應 302 重定向至原始目標網址，由爬蟲直接讀取目標頁面原始的 Open Graph 預覽資訊。
* **全域與單一連結獨立設定**：
  * **全域設定**：於 `Dashboard -> Settings -> Site SEO` 增加「全域社群預覽模式」選擇（`Custom` 自訂模式 或 `Passthrough` 透通模式）。
  * **單一連結設定**：於 `Dashboard -> Links Editor` 增加「OG Preview Mode」設定，支援 `Inherit` (繼承全域)、`Custom` (強制自訂) 與 `Passthrough` (強制透通)。
* **Schema 變更**：更新 `SeoSettingsSchema` (`ogMode: 'custom' | 'passthrough'`) 與 `LinkSchema` (`ogMode: 'inherit' | 'custom' | 'passthrough'`)。
* **重定向中間件更新**：在 `server/middleware/1.redirect.ts` 中新增爬蟲透通邏輯判斷與 302 直轉處理。
* **測試覆蓋**：於 `tests/redirect.spec.ts` 新增全域及單一連結在透通與自訂模式下的重定向與 HTML 渲染單元測試。

---

## 📅 [2026-07-30]

### 📌 隨機短網址重複使用與歷史資料 migration

### ✅ 變更內容

* 新增 `isCustomSlug` 標記，區分隨機 slug 與自訂 slug。
* 相同完整目的網址以隨機 slug 建立時，系統會回傳最早建立的既有短網址，不再重複產生新短碼。
* 手動輸入或 AI 產生的自訂 slug 可繼續指向相同目的網址，不受重複使用規則限制。
* 新增網址反向索引，並在建立、編輯、刪除及 upsert 時同步維護。
* 新增 `pnpm migrate:link-index`：將所有無標記歷史連結視為隨機 slug，補上 `isCustomSlug: false` 與網址索引；預設 dry run，需加上 `--apply` 才會寫入 KV。
* 升級步驟、驗證方式與回復注意事項請見[隨機短網址重複使用升級教學](docs/deployment/random-link-reuse-upgrade.md)。

### 💡 部署前後注意事項

1. 先部署程式碼，再依 README 的指令執行 migration。
2. migration 使用的 Cloudflare API Token 需具備 `Workers KV Storage Read` 和 `Workers KV Storage Write` 權限。
3. Cloudflare KV 為最終一致性儲存，migration 寫入後跨地區快取最多可能需要約 60 秒才完全反映。

---

## 📅 [2026-07-14]

### 📌 6. 修正全站 OG / SEO Meta 標籤與社群預覽圖

### ✅ 變更內容

修復 OG 分數 37/100 的多項 SEO 問題，包含社群預覽與搜尋引擎索引最佳化：

* **修正 OG Image 過小問題**：預設 OG 圖片從 `https://blog.david888.com/banner.png` (404) 改為 `/banner.png` (本地 2400×1260px，部署於 `https://glsoft.ai/banner.png`)；Dashboard 後台設定的 OG Image 若指向 SVG logo (94×23px) 需手動更新。
* **補齊遺漏的 OG / Twitter 標籤**：`og:url`、`og:locale` (zh_TW)、`og:image:width` (1200)、`og:image:height` (630)、`og:image:alt`、`twitter:site` (@oobwei)，同時寫入 `app/app.vue` 與 `app/pages/index.vue`。
* **新增 SEO 實用標籤**：`<link rel="canonical">`、`<link rel="manifest">`、`<meta name="theme-color">` (#10b981)、32×32 PNG favicon、SVG favicon、JSON-LD 結構化資料 (WebSite Schema)。
* **修正預設 Description 過長**：`app/app.config.ts` description 從 `'短網址'` 改為完整描述 (`'Sink - 快速短網址服務，支援自訂短網址、訪問分析與團隊管理'`)，Dashboard 後台設定若仍為舊值需手動更新。
* **Loading 狀態補上 H1**：首頁載入中狀態新增 `<h1>` 標籤，讓搜尋引擎爬蟲能讀到頁面主題。

### 💡 部署後手動設定
部署後請進入 `Dashboard -> Settings -> Site SEO`，確認以下欄位：

* **OG Image URL** → `https://glsoft.ai/banner.png`
* **Description** → 建議 110–160 字元的簡短描述
* **Site Title** → 建議 `glsoft.ai` 或 `Sink`

---



## 📅 [2026-07-08]

### 📌 5. 最佳化中轉頁跳轉與追蹤時序、防止 SEO 被索引與重複 LIFF 跳轉

### ✅ 變更內容

為了解決中轉頁（Transition Page）在追蹤與跳轉時的體驗與合規性問題，進行了以下調整：

* **爬蟲與 SEO 最佳化**：
  * 新增 `isGeneralBot` 用於過濾搜尋引擎爬蟲（如 `Googlebot`、`Bingbot` 等），搜尋引擎爬蟲將繞過中轉頁直接執行 302 重導向，防止資源浪費。
  * 社交預覽爬蟲與中轉頁面均新增 `<meta name="robots" content="noindex, nofollow">` 以及 `X-Robots-Tag: noindex, nofollow` 回應標頭，防止短網址頁面被搜尋引擎索引而稀釋目標網址的 SEO。
* **解決「回上一頁無限迴圈（Back Button Trap）」與「追蹤被取消」問題**：
  * 轉址方式從 `window.location.href = target` 改為 `window.location.replace(target)`，避免中轉頁殘留在歷史紀錄中導致使用者點擊回上一頁時卡死。
  * 對於自動跳轉（`redirect_auto`）與點擊跳轉（`redirect_now`），在執行 `location.replace` 前引進了 150ms 延遲，以確保 GA4 (`gtag`) 和 Meta Pixel (`fbq`) 等非同步第三方 SDK 在頁面卸載（unload）前有足夠的時間完成發送。
* **避免 LINE/LIFF 雙重登入跳轉**：
  * 中轉頁初始化 LIFF SDK 前會先檢查 Target URL。若 Target URL 本身就是 LIFF 連結（包含 `liff.line.me` 或 `line://` 協定），中轉頁將跳過 LIFF 認證，避免重複授權造成的白畫面與延遲。

---

## 📅 [2026-07-03]

### 📌 4. 短網址支援 LINE / 社群 Open Graph 預覽

### ✅ 變更內容

短網址 route 原本會直接 301/302 到目的地，因此 LINE、Facebook 等預覽 crawler 讀不到 `og:title`、`og:description`、`og:image`。

本次調整 redirect middleware：

* 一般使用者打開短網址時，仍照原本規則 redirect 或顯示 transition page。
* 社群預覽 crawler 打開短網址時，回傳 200 HTML，內含 OG / Twitter meta。
* 短網址自己的 `title`、`description`、`image` 優先於 Site SEO；未填時才 fallback 到 `Dashboard -> Settings -> Site SEO`。

---

### 📌 3. 修正 Default Transition Mode 會誤開中轉頁

### ✅ 變更內容

修正 **Global Transition Mode = Default** 的 redirect 判斷：

* 短連結明確設為 `on` 時，才顯示 transition page。
* 短連結為 `inherit` 或未設定 transition mode 時，直接跳轉。
* 全域 `Force All Links` 仍會強制所有短連結顯示 transition page。

本次也補上測試，覆蓋 `Default` + link `inherit` 必須直接跳轉的行為，並更新後台與 README 文案。

---

### 📌 2. Site SEO / OG Meta 改為後台可設定

### ✅ 變更內容
原本全站 `title`、`description`、`og:title`、`og:site_name`、`og:description`、`og:image`、Twitter card 等資訊只吃 `app/app.config.ts` 的硬編碼 fallback，導致部署後無法由使用者自行修改。

本次新增：

* `SeoSettingsSchema`，管理 Site Title、Description、OG Image、OG Site Name。
* `GET /api/public/settings/seo`，供前台 runtime 讀取 SEO/OG 設定。
* `POST /api/settings/seo`，供後台儲存 SEO/OG 設定。
* `Dashboard -> Settings -> Site SEO` 設定頁。
* `app/app.vue` 改為優先讀 KV 設定，空值才 fallback 到 `app.config.ts`。
* 移除首頁 `/` 的 prerender，避免 crawler 讀到 build-time 固化的舊 OG meta。

### 💡 使用方式
進入後台：

`Dashboard -> Settings -> Site SEO`

填入 Site Title、Description、OG / Twitter Image URL、OG Site Name 後儲存即可。

---

### 📌 1. Transition Page 新增 GA4、Meta Pixel 與 LINE LIFF 登入追蹤

### ✅ 變更內容
中轉頁現在可在跳轉前送出第三方追蹤事件，並支援需要 LINE 身份識別的客戶流程。

本次新增：

* `TrackingSettingsSchema`，管理 GA4、Meta Pixel、LINE LIFF、LINE Channel ID、強制 LINE Login 與跳轉倒數秒數。
* `GET /api/public/settings/tracking`，供後台與中轉頁讀取追蹤設定。
* `POST /api/settings/tracking`，供後台儲存追蹤設定。
* `POST /api/tracking/event`，供中轉頁回報追蹤事件與 LINE ID token。
* 中轉頁會依設定注入 GA4 `gtag.js`、Meta Pixel、LINE LIFF SDK。
* LINE LIFF 登入成功後，前端傳送 `liff.getIDToken()`，後端再呼叫 LINE `oauth2/v2.1/verify` 驗證，不直接信任瀏覽器送出的 profile。
* 中轉頁目的 URL 輸出補上 HTML escaping，避免特殊 URL 破壞頁面結構。

### 💡 使用方式
進入後台：

`Dashboard -> Settings -> Transition Page -> Tracking Integrations`

可填入：

* **GA4 Measurement ID**：例如 `G-XXXXXXXXXX`。
* **Meta Pixel ID**：例如 `123456789012345`。
* **LINE LIFF ID**：例如 `1234567890-AbcdEfgh`。
* **LINE Channel ID**：LINE Login Channel 的 Channel ID。
* **Require LINE Login before redirect**：開啟後，訪客需完成 LINE LIFF / LINE Login 授權後才會繼續跳轉。
* **Redirect Delay Seconds**：中轉頁自動跳轉倒數秒數。

### 🔍 補充說明
第三方像素追蹤只會在顯示 Transition Page 時執行；如果短網址直接 302 跳轉，瀏覽器不會執行 GA、Meta 或 LIFF SDK。需要 LINE 身份識別的客戶，請在 LINE Developers Console 的 LIFF app scopes 開啟 `openid`，需要基本 profile 時再加 `profile`。

---

## 📅 [2026-06-29]

### 📌 1. Dashboard Links 頁面新增短網址總數顯示

### ✅ 變更內容
`/dashboard/links` 原本只會用分頁方式載入短網址卡片，畫面上看得到目前已載入的資料，但無法直接知道站內一共有多少筆短網址。

本次新增：

* `GET /api/link/count` API，用來統計 KV 中 `link:` 前綴的全部短網址數量。
* Dashboard Links 頁面上的「短網址總數」卡片。
* 建立或刪除短網址後，前端會同步更新總數，避免使用者還要手動重新整理。

### 💡 使用方式
進入後台：

`Dashboard -> Links`

在建立按鈕與搜尋列下方，現在會看到目前站內的短網址總數。

### 🔍 補充說明
因為原本的 `/api/link/list` 是分頁清單 API，只會回傳當頁資料與 cursor，不會回傳完整總數，所以需要額外補一支 count API 才能正確顯示。

---

## 📅 [2026-06-26]

### 📌 1. Transition Page 新增全域強制模式

### ✅ 變更內容
Transition Page 的全域設定由原本單純的開關，調整為三種模式：

* `Disabled`：全域不啟用 transition page。
* `Default`：不全域強制顯示；只有短連結明確設為 `on` 才會顯示。
* `Force All Links`：強制所有短連結都先進入 transition page，不接受個別短連結關閉。

### 💡 使用方式
進入後台 `Dashboard -> Settings -> Transition Page`：

1. 將 **Global Transition Mode** 設成 `Default`，表示由各短連結自行決定。
2. 將 **Global Transition Mode** 設成 `Force All Links`，表示所有短連結都一定會經過 transition page。
3. 如果只想讓少數短連結生效，請將全域設成 `Disabled` 或 `Default`，再到該短連結編輯頁將 `Interstitial Page Mode` 設為 `on`。

---

### 📌 2. 個別短連結剛修改 transition 設定時，可能短時間內看起來沒生效

### ❌ 遇到問題
例如將 `glsoft.ai/104` 設為要顯示 transition page，但實測時仍直接跳轉到目的網址。

### 🔍 原因分析
原本 redirect middleware 在讀取短連結資料時使用了 KV 快取 TTL。這會導致：

* 短連結剛被修改後，邊緣節點仍可能在一段時間內讀到舊資料。
* `transitionMode`、`transitionHtml` 等欄位即使已在後台儲存完成，前台訪問該短連結時仍可能繼續沿用舊的 redirect 行為。

### 💡 解決方法
已將 redirect 路徑上的短連結讀取改為直接讀最新 KV，不再對短連結目標資料使用快取 TTL。現在：

* 個別短連結的 `on / off / inherit` 設定會更快反映。
* 全域 transition 模式調整後，使用者再次訪問短連結時會更接近即時生效。

---

## 📅 [2026-06-25]

### 📌 1. Cloudflare Pages 與 Workers 的編譯預設差異 (API 404 問題)

### ❌ 遇到問題
在執行部署後，訪問 `https://glsoft.ai/dashboard/login` 登入或點擊任何 API 時，瀏覽器回傳 `[GET] "/api/verify": 404` 錯誤。

### 🔍 原因分析
* 本專案同時支援 Cloudflare Workers（執行 `wrangler deploy`）與 Cloudflare Pages（執行 `wrangler pages deploy`）部署。
* 預設情況下，Nuxt/Nitro 在本地打包時會將編譯目標偵測為 `cloudflare-module` (用於 Worker)，並將後端編譯至 `dist/server/index.mjs`。
* 當把 `dist` 目錄部署到 **Cloudflare Pages** 時，Pages 找不到專屬的 `_worker.js` 入口檔案（也無 `functions` 目錄），因此 Pages 會將其作為**純靜態網站**進行部署，導致所有 `/api/*` 的動態路由全部遺失，回傳 404。

### 💡 解決方法
部署至 Pages 時，必須強制指定 Nitro 的 Preset（編譯預設值）：
```bash
# 1. 指定 cloudflare-pages 預設編譯（這會在 dist 下產出 _worker.js 與 _routes.json）
NITRO_PRESET=cloudflare-pages pnpm build

# 2. 部署至 Pages 專案
npx wrangler pages deploy dist --project-name sink
```

---

## 📌 2. Cloudflare Pages 環境變數與加密密碼 (Secrets) 的生效機制

### ❌ 遇到問題
在 Cloudflare 控制台或使用 `wrangler pages secret put` 修改、刪除了 `NUXT_SITE_TOKEN` 或 `NUXT_HOME_URL` 等環境變數後，線上網頁依然在使用舊的值。

### 🔍 原因分析
* 與 Cloudflare Workers 的環境變數即時生效不同，**Cloudflare Pages 的環境變數是與特定的「部署版本 (Deployment)」綁定的**。
* 在控制台更新環境變數或加密密碼後，這些變數**不會**自動注入到目前已經在線上運行的舊部署中。

### 💡 解決方法
修改任何環境變數/加密密碼後，**必須重新進行一次編譯與部署**，新的變數才會在最新生成的部署中生效：
```bash
NITRO_PRESET=cloudflare-pages pnpm build
npx wrangler pages deploy dist --project-name sink
```

---

## 📌 3. 登入頁面無限重定向迴圈 (Infinite Redirect Loop)

### ❌ 遇到問題
當未登入或 token 過期時，打開儀表板會進入無限重新整理、無限跳轉登入頁的死循環。

### 🔍 原因分析
* 在客戶端全域路由守衛 `app/middleware/auth.global.ts` 中，只要路由為 `/dashboard/login`，便會發起驗證請求 `useAPI('/api/verify')`。
* 當未登入（`localStorage` 中無 token）時，`/api/verify` 必定回傳 `401 Unauthorized`。
* `useAPI` 攔截器捕獲到 `401` 錯誤時，會清除 token 並執行 `navigateTo('/dashboard/login')`，此動作再次觸發路由守衛，從而形成無限請求與重定向迴圈。

### 💡 解決方法
優化 `app/middleware/auth.global.ts`，**僅在客戶端本地儲存有 token 時**才調用驗證接口。如果沒有 token，則直接停留在登入頁面，防止死循環。

---

## 📌 4. 網站名稱 `glsoft.ai` 與預設公司資訊的來源

### ❓ 常見疑問
網站首頁、頁尾以及瀏覽器分頁標題上顯示的 `glsoft.ai` 與 `資旅軟體開發有限公司` 是在哪裡設定的？

### 💡 設定檔案
這些全域變數是靜態配置在 **[app/app.config.ts](app/app.config.ts)** 中：
* `title`: 網站品牌標題（如 `glsoft.ai`），被 Header、Footer 和麵包屑組件共同使用。
* `company`: 預設的公司統編、代表人、地址及版權宣告（`company.name`）。
* **自訂方法**：直接編輯該檔案中的對應欄位，重新編譯部署即可全局更新。
