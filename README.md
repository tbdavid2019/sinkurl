# ⚡ Sink

一個基於 Cloudflare 運行的簡單、快速且安全的短網址服務，具備完整的数据統計與分析功能。

> 💖 **致謝**：本專案基於 [miantiao-me/Sink](https://github.com/miantiao-me/Sink) 進行開發，感謝原作者的開源貢獻！

---

## ✨ 核心特色

- **短網址縮短**：輕鬆將冗長的網址壓縮成簡短易記的連結。
- **詳細數據分析**：即時監控連結的點擊次數、地理位置、瀏覽器、作業系統等數據。
- **Serverless 架構**：100% 運行於 Cloudflare 生態系，部署簡單、運行成本極低且無須管理伺服器。
- **自訂後綴 (Slug)**：支援自定義短網址後綴，並支援大小寫區分。
- **AI 智慧後綴**：整合 AI 服務，自動生成具備語意且好記的短網址後綴。
- **連結過期設定**：支援為特定的短網址設定到期時間，逾期自動失效。
- **Transition Page**：支援全域或單一短連結顯示中介跳轉頁，可放安全提示、自訂 HTML 或廣告內容。
- **Dashboard 總數可視化**：`Dashboard -> Links` 會直接顯示目前站內短網址總數，方便快速掌握規模。

## 🧱 技術棧

- **前端框架**：[Nuxt 4](https://nuxt.com/)
- **資料庫/儲存**：[Cloudflare Workers KV](https://developers.cloudflare.com/kv/)
- **分析引擎**：[Cloudflare Workers Analytics Engine](https://developers.cloudflare.com/analytics/)
- **UI 組件**：[shadcn-vue](https://www.shadcn-vue.com/) & [Tailwind CSS](https://tailwindcss.com/)
- **部署平台**：[Cloudflare](https://www.cloudflare.com/)

---

## 🚀 安裝與設定方式

### 系統需求

- **Node.js**: `>= 20.11`
- **套件管理器**: `pnpm`

### 1. 安裝相依套件

在專案根目錄下執行以下指令：

```bash
pnpm install
```

### 2. 設定環境變數

將專案根目錄下的 `.env.example` 複製一份並命名為 `.env`：

```bash
cp .env.example .env
```

並修改其中的設定（例如管理後台的登入密碼等）：

- `NUXT_SITE_TOKEN`: 後台登入密碼（不支援純數字，多個密碼可用逗號 `,` 分開）。
- `NUXT_HOME_URL`: 首頁預設跳轉的 URL。
- `NUXT_CF_ACCOUNT_ID` 與 `NUXT_CF_API_TOKEN`: 用於讀取 Cloudflare 分析數據的帳號 ID 與 API Token。

### 3. 本地開發與預覽

啟動本地開發伺服器：

```bash
pnpm dev
```

> 💡 **本地開發是如何運行的？**
> 本地開發時，Wrangler 會在您的電腦中自動**模擬（Emulate）** Cloudflare 運行環境（包含 KV 資料庫與 AI 綁定）。它會將模擬的 KV 資料儲存在專案根目錄下的 `.data`（或 `.wrangler`）資料夾中，因此您不需要連線到線上 Cloudflare 即可在 `http://localhost:3000` 進行完整的短網址新增、查詢及後台測試，且不會影響到您線上的真實數據。

---

## 🧭 Transition Page 用法

Transition Page 是短連結在真正跳轉前的中介頁。它適合拿來放：

- 外部網站安全提醒
- 廣告或導流內容
- 品牌說明
- 活動公告

### 1. 全域設定

進入後台：

`Dashboard -> Settings -> Transition Page`

你會看到 **Global Transition Mode**，共有三種模式：

- `Disabled`：全域關閉 transition page。只有個別短連結明確設成 `on` 才會顯示。
- `Default`：不全域強制顯示。只有個別短連結明確設成 `on` 才會顯示；`inherit` 會直接跳轉。
- `Force All Links`：強制所有短連結都先顯示 transition page。

### 2. 個別短連結設定

進入後台：

`Dashboard -> Links -> Edit Link`

在編輯器裡可設定 **Interstitial Page Mode**：

- `inherit`：跟隨全域模式。全域為 `Default` 時直接跳轉；全域為 `Force All Links` 時顯示 transition page。
- `on`：這個短連結一定顯示 transition page
- `off`：這個短連結不顯示 transition page

若全域模式為 `Force All Links`，則個別短連結的 `off` 不會生效。

### 3. 自訂顯示內容

可在兩個地方填入自訂內容：

- 全域設定中的 **Transition Page Content (HTML/Markdown)**
- 單一短連結中的 **Transition Page HTML**

優先順序如下：

1. 單一短連結自己的 `Transition Page HTML`
2. 全域 `Transition Page Content`
3. 系統預設的離站提醒畫面

### 4. 生效規則

目前 transition page 的判斷規則如下：

1. 如果全域模式是 `Force All Links`，所有短連結都顯示 transition page。
2. 否則，如果該短連結設為 `on`，就顯示 transition page。
3. 其他情況直接跳轉。也就是說，全域 `Default` + 短連結 `inherit` 不會顯示 transition page。

### 5. 設定何時會生效

短連結的 transition 設定現在會直接讀取最新 KV 資料，不再依賴短連結目的地快取 TTL。也就是說：

- 剛改完某個短連結的 `Interstitial Page Mode`
- 剛改完全域 `Global Transition Mode`

再次打開短連結時，應該就會反映最新設定，不需要再等舊快取過期。

### 6. GA4 / Meta Pixel / LINE LIFF 追蹤設定

Transition Page 也支援在跳轉前送出追蹤事件。進入後台：

`Dashboard -> Settings -> Transition Page -> Tracking Integrations`

可設定下列欄位：

- **Tracking Integrations**：啟用或停用中轉頁追蹤。
- **GA4 Measurement ID**：填入 Google Analytics 4 Measurement ID，例如 `G-XXXXXXXXXX`。
- **Meta Pixel ID**：填入 Meta Pixel ID，例如 `123456789012345`。
- **LINE LIFF ID**：填入 LINE Developers Console 產生的 LIFF ID，例如 `1234567890-AbcdEfgh`。
- **LINE Channel ID**：填入同一個 LINE Login Channel 的 Channel ID，用於後端驗證 ID token。
- **Require LINE Login before redirect**：開啟後，訪客會先進入 LINE LIFF / LINE Login 授權流程，登入完成才繼續跳轉。
- **Redirect Delay Seconds**：中轉頁自動跳轉倒數秒數，範圍為 1 到 30 秒。

目前會送出的事件包含：

- `transition_view`：訪客看到中轉頁。
- `redirect_auto`：倒數結束後自動跳轉。
- `redirect_now`：訪客點擊立即跳轉。
- `redirect_stopped`：訪客停止自動跳轉。
- `line_login_success`：LIFF 登入完成且取得 ID token。
- `line_login_error`：LIFF 初始化或登入流程失敗。

GA4 會透過 `gtag('event', ...)` 送出事件；Meta Pixel 會送出 `ShortlinkRedirect` 自訂事件；LINE LIFF 登入成功後，前端只會把 `liff.getIDToken()` 傳到後端，由後端呼叫 LINE `https://api.line.me/oauth2/v2.1/verify` 驗證，避免直接信任瀏覽器送來的 user profile。

#### LINE LIFF 設定注意事項

在 LINE Developers Console 建立或編輯 LIFF app 時：

1. 使用 LINE Login Channel 建立 LIFF app。
2. Endpoint URL 必須設為本服務的 HTTPS 網域。
3. Scopes 至少開啟 `openid`；如果客戶需要使用基本 profile 欄位，請同時開啟 `profile`。
4. 將 LIFF ID 填入後台的 **LINE LIFF ID**。
5. 將 Channel ID 填入後台的 **LINE Channel ID**。

若未開啟 **Require LINE Login before redirect**，系統只會在使用者已登入 LIFF 時嘗試驗證 LINE ID token；若開啟，未登入訪客會先被導入 LINE 授權流程。

---

## ⚙️ 首次部署 Cloudflare Workers 的參數與設定步驟

如果您是**第一次**將本專案部署到您的 Cloudflare 帳戶，必須完成以下幾個關鍵的資源建立與參數配置：

### 1. 建立 KV 命名空間 (KV Namespace)

本專案的短網址數據需要存放在 Cloudflare KV 中：

1. 登入您的 Cloudflare 控制台，前往 **Storage & Databases (存儲與資料庫)** -> **KV**。
2. 點擊 **Create a namespace (建立命名空間)**，將其命名（例如：`KV`）。
3. 建立後複製生成的 **Namespace ID**（一串 32 位的英數混合字串）。
4. 開啟專案根目錄的 [wrangler.jsonc](file:///Users/david/Documents/git/tbdavid2019/Sink/wrangler.jsonc)，找到 `kv_namespaces`，將 ID 填入：
   ```json
   {
     "kv_namespaces": [
       {
         "binding": "KV",
         "id": "請在此處填入您複製的 Namespace ID"
       }
     ]
   }
   ```

### 2. 啟用 Cloudflare Analytics Engine (分析引擎)

為了讓網站能記錄並顯示短網址的點擊數據：

1. 在 Cloudflare 控制台首頁，點擊右側面板的 **Account details (帳戶詳情)**。
2. 找到 **Analytics Engine (分析引擎)**，點擊 **Set up (設定)** 啟用免費額度（Free tier）。
   - _註：本專案預設使用名為 `sink` 的數據集與 `ANALYTICS` 綁定，此設定已在 `wrangler.jsonc` 配置完畢。_

### 3. 部署並設定環境變數與機密 (Secrets)

當您使用 `pnpm deploy:worker` 部署上線後，請前往 **Workers & Pages** -> 選擇您的 Worker 專案 -> 進入 **Settings (設定)** -> **Variables (變數)** -> 點擊 **Add (新增變數)**，並設定以下 3 個關鍵參數：

| 環境變數名稱             | 類型                | 說明                                                                                                                   |
| :----------------------- | :------------------ | :--------------------------------------------------------------------------------------------------------------------- |
| **`NUXT_SITE_TOKEN`**    | **機密 (Secret)**   | **【必填】** 後台登入密碼，長度必須**大於等於 8 個字元**（且不能為純數字）。                                           |
| **`NUXT_CF_ACCOUNT_ID`** | **變數 (Variable)** | **【統計分析必填】** 您的 Cloudflare 帳戶 ID（可在首頁右側面板或網址中找到）。                                         |
| **`NUXT_CF_API_TOKEN`**  | **機密 (Secret)**   | **【統計分析必填】** 您的 Cloudflare API Token。建立時必須賦予 **`Account.Account Analytics` (讀取帳戶分析)** 的權限。 |

_(選填)_：如果您不希望訪客直接訪問您的短網址根域名首頁，您也可以額外新增一個變數 `NUXT_HOME_URL`，設定為您主站的 URL，訪客訪問根域名時便會自動跳轉。

---

## 🔐 進入後台與密碼設定

### 1. 如何進入管理後台

- **本地開發**：打開瀏覽器訪問 `http://localhost:3000/dashboard`。
- **線上部署**：訪問 `https://您的網域/dashboard`。
- 進入該路徑後，系統會引導您至登入頁面，您需要輸入設定的 **Site Token（即後台密碼）** 即可登入管理面板。

### 2. 如何設定後台密碼 (Site Token)

後台密碼是透過環境變數 `NUXT_SITE_TOKEN` 來進行設定的（不支援純數字，多個密碼可用英文逗號 `,` 分隔，例如 `Password1,Password2`）：

#### 💡 本地開發環境：

直接修改專案根目錄下的 `.env` 檔案：

```env
NUXT_SITE_TOKEN="您的自訂密碼"
```

#### 🌐 生產環境 (Cloudflare Workers)：

您可以使用以下兩種方式之一來設定線上環境的密碼：

- **方法 A：透過 Cloudflare 網頁控制台設定（推薦，安全度高）**
  如上方的表格所述，直接在 **Settings -> Variables** 中新增 `NUXT_SITE_TOKEN` 并點擊右側的 **Encrypt (加密)**。
- **方法 B：使用 Wrangler 命令列設定**
  您也可以直接在終端機中運行以下指令上傳密碼：
  ```bash
  # 如果您有多個 Cloudflare 帳戶，請在指令前帶上 CLOUDFLARE_ACCOUNT_ID
  CLOUDFLARE_ACCOUNT_ID="您的帳號ID" pnpm wrangler secret put NUXT_SITE_TOKEN
  ```
  依終端機提示輸入您要設定的密碼即可。

---

## 🛠️ 首頁與網站資訊自訂方式 (包含網站標題 `glsoft.ai` 來源)

本專案的網頁標題、OG / Twitter 分享卡片資訊可在後台設定，不需要改程式碼。

進入後台：

`Dashboard -> Settings -> Site SEO`

可設定：

- **Site Title**：網站標題，會用於 `<title>`、`og:title`、`twitter:title`。
- **Description**：網站描述，會用於 `description`、`og:description`、`twitter:description`。
- **OG / Twitter Image URL**：分享卡片圖片，會用於 `og:image`、`twitter:image`。
- **OG Site Name**：會用於 `og:site_name`；留空時使用 Site Title。

如果後台未設定，系統才會 fallback 到 [app/app.config.ts](file:///Users/david/Documents/git/tbdavid2019/Sink/app/app.config.ts) 的預設值。

**注意**：首頁 `/` 已改為 runtime SSR 回應，避免社群 crawler 只讀到 build-time 的舊 OG meta。

### 短網址分享預覽

短網址本身是 redirect response，一般瀏覽器打開時會直接跳轉；但 LINE、Facebook、Twitter、Slack、Discord、Telegram 等社群預覽 crawler 需要讀到 HTML meta 才能產生預覽卡片。

當社群 crawler 讀取 `https://your-domain/{slug}` 時，系統會回傳一個只包含 OG / Twitter meta 的 HTML：

1. 優先使用該短連結自己的 `title`、`description`、`image`。
2. 如果短連結沒有填，fallback 到 `Dashboard -> Settings -> Site SEO`。
3. 一般使用者點擊短網址時仍照常 redirect，不會停在 OG 頁。

### 靜態 fallback 設定

如果您在網站各處（如瀏覽器分頁標題、頁首或頁尾左側）看到預設的 `glsoft.ai` 或公司版權資訊，這是 fallback 設定的來源。

若要更改首頁顯示的文字、網站標題與公司資訊，請直接修改 [app/app.config.ts](file:///Users/david/Documents/git/tbdavid2019/Sink/app/app.config.ts) 檔案。

### 配置選項說明：

- **`title`**: 網站主標題（顯示在頁尾、首頁 Hero 標題等位置）。
- **`description`**: 網站描述（用於 SEO Meta 標籤）。
- **`email`**: 聯絡信箱（顯示於頁尾）。
- **`github` / `twitter` / `telegram` / `discord` / `blog`**: 各社群平台的連結（會自動渲染在頁尾與首頁社群圖標）。
- **`company`**: 公司相關詳細資訊（顯示於首頁底部及頁尾）：
  - `name`: 公司名稱（如：`資旅軟體開發有限公司`）。
  - `nameEnglish`: 英文名稱或維護者信箱資訊。
  - `taxId`: 統一編號。
  - `representative`: 代表人名稱。
  - `address`: 公司地址。
  - `addressEnglish`: 公司英文地址。

### 配置範例：

```ts
// app/app.config.ts
export default defineAppConfig({
  title: 'glsoft.ai',
  email: '104@david888.com',
  github: 'https://github.com/tbdavid2019/sinkurl',
  twitter: 'https://x.com/oobwei',
  telegram: 'https://t.me/a6a7a8a9abc',
  discord: 'https://discord.gg/9BCGcgCWpj',
  blog: 'https://blog.david888.com',
  description: '短網址',
  image: 'https://blog.david888.com/banner.png',
  company: {
    name: '資旅軟體開發有限公司',
    nameEnglish: 'glsoft.ai / 維護者信箱 104@david888.com',
    taxId: '90867427',
    representative: 'HUNG FUNG CHAK',
    address: '臺北市信義區松德路171號9樓之2',
    addressEnglish: '9 F.-2, No. 171, Songde Rd., Xinyi Dist., Taipei City 110030, Taiwan (R.O.C.)',
  },
  previewTTL: 300,
  slugRegex: /^[a-z0-9]+(?:-[a-z0-9]+)*$/i,
  reserveSlug: [
    'dashboard',
  ],
})
```

---

## 📦 部署方式

如果你想先看「Pages 和 Workers 差在哪、該選哪個」，可先讀：

- [docs/deployment/install-options.md](/Users/david/Documents/git/tbdavid2019/Sink/docs/deployment/install-options.md)

### 部署至 Cloudflare Workers

1. 確保您本機已登入 Cloudflare 帳號：
   ```bash
   pnpm wrangler login
   ```
2. 設定您的 KV 命名空間 ID：
   - 確保在 [wrangler.jsonc](file:///Users/david/Documents/git/tbdavid2019/Sink/wrangler.jsonc) 中已填入正確的 `kv_namespaces.id`（請參考上方的首次部署步驟）。
3. 執行部署指令：
   ```bash
   pnpm deploy:worker
   ```

---

## 📝 開發與部署備忘錄 (CHANGELOG)

如果您在開發、部署（例如 Cloudflare Pages API 404 問題）或登入設定中遇到任何問題，請參考根目錄下的 [CHANGELOG.md](file:///Users/david/Documents/git/tbdavid2019/Sink/CHANGELOG.md) 檔案，裡面詳細記錄了常見的「踩坑」經驗與解決方案。
