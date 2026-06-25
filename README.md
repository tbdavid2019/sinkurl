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

---

## 🛠️ 首頁與網站資訊自訂方式

本專案的首頁、頁首、頁尾以及網站 Meta 資訊皆採用集中式設定。若要更改首頁顯示的文字與公司資訊，請修改 [app/app.config.ts](file:///Users/david/Documents/git/tbdavid2019/Sink/app/app.config.ts) 檔案。

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
  github: 'https://github.com/tbdavid2019/sink',
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
    addressEnglish: '9 F.-2, No. 171, Songde Rd., Xinyi Dist., Taipei City 110030, Taiwan (R.O.C.)'
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

### 部署至 Cloudflare Workers
1. 確保您本機已登入 Cloudflare 帳號：
   ```bash
   pnpm wrangler login
   ```
2. 設定您的 KV 命名空間 ID：
   - 確保在 [wrangler.jsonc](file:///Users/david/Documents/git/tbdavid2019/Sink/wrangler.jsonc) 中已填入正確的 `kv_namespaces.id`。
3. 執行部署指令：
   ```bash
   pnpm deploy:worker
   ```
