# CHANGELOG & Deployment Gotchas (開發與部署備忘錄)

本文件記錄了專案開發、部署及設定過程中遇到的一些關鍵「坑」與解決方案，供後續維護參考。

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
