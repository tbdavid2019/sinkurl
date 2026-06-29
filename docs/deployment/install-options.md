# Sink 安裝 / 部署方式總覽

本專案目前支援兩種正式安裝 / 部署方式：

1. **Cloudflare Pages**
2. **Cloudflare Workers**

兩種方式都可以正常運行短網址、Dashboard、KV、Analytics、Workers AI 等功能，但部署流程與產物不同。

---

## 1. 選哪一種比較合適

### 選 Cloudflare Pages，如果你：

- 已經習慣用 Pages 綁 GitHub 自動部署
- 想把網站和部署流程維持在 Pages 專案裡
- 希望每次 push 後自動觸發建置與上線

### 選 Cloudflare Workers，如果你：

- 想直接把整個 Nuxt/Nitro server 當成 Worker 部署
- 想避免 Pages preset / `_worker.js` / build target 的差異問題
- 想用比較直接的 `wrangler deploy` 工作流

---

## 2. Cloudflare Pages 安裝方式

### 控制台安裝

1. fork 或 clone 本 repo
2. 在 Cloudflare Pages 建立專案
3. 連接 GitHub repository
4. 建置時務必使用 **Pages 專用輸出**

### 重要

Pages 不能直接拿 Worker 產物部署。若你是在本地手動 build 再 deploy，請使用：

```bash
NITRO_PRESET=cloudflare-pages pnpm build
npx wrangler pages deploy dist --project-name <your-pages-project-name>
```

如果沒有指定 `NITRO_PRESET=cloudflare-pages`，可能會出現：

- `dist` 內沒有 `_worker.js`
- `/api/*` 路由在 Pages 上變成 404

### Pages 需要的 Binding / 設定

- `KV` -> Cloudflare KV Namespace
- `ANALYTICS` -> Analytics Engine dataset
- `AI` -> Workers AI（可選）
- Compatibility flag: `nodejs_compat`

### Pages 需要的環境變數

- `NUXT_SITE_TOKEN`
- `NUXT_CF_ACCOUNT_ID`
- `NUXT_CF_API_TOKEN`
- 其他需要的 `.env` 變數

參考：

- [pages.md](/Users/david/Documents/git/tbdavid2019/Sink/docs/deployment/pages.md)
- [configuration.md](/Users/david/Documents/git/tbdavid2019/Sink/docs/configuration.md)

---

## 3. Cloudflare Workers 安裝方式

### CLI / Wrangler 安裝

1. 建立 KV Namespace
2. 將 KV namespace ID 填入 [`wrangler.jsonc`](/Users/david/Documents/git/tbdavid2019/Sink/wrangler.jsonc)
3. 設定 Worker 的 Variables / Secrets
4. build 後執行 deploy

```bash
pnpm build
pnpm deploy:worker
```

### Workers 需要的設定

- `wrangler.jsonc` 中的 `kv_namespaces`
- `analytics_engine_datasets`
- `ai.binding`
- `compatibility_flags: ["nodejs_compat"]`

### Workers 需要的環境變數

- `NUXT_SITE_TOKEN`
- `NUXT_CF_ACCOUNT_ID`
- `NUXT_CF_API_TOKEN`
- 其他需要的 `.env` 變數

參考：

- [workers.md](/Users/david/Documents/git/tbdavid2019/Sink/docs/deployment/workers.md)
- [configuration.md](/Users/david/Documents/git/tbdavid2019/Sink/docs/configuration.md)

---

## 4. 目前 repo 實際檢查結果

以下是依照目前 repo 內容做的檢查結論。

### 已確認支援 Cloudflare Workers

理由：

- [`package.json`](/Users/david/Documents/git/tbdavid2019/Sink/package.json) 有 `deploy:worker`
- [`wrangler.jsonc`](/Users/david/Documents/git/tbdavid2019/Sink/wrangler.jsonc) 以 Worker 入口 `dist/server/index.mjs` 為主
- [`docs/deployment/workers.md`](/Users/david/Documents/git/tbdavid2019/Sink/docs/deployment/workers.md) 已存在 Workers 安裝說明

可直接使用：

```bash
pnpm build
pnpm deploy:worker
```

### 已確認支援 Cloudflare Pages

理由：

- [`package.json`](/Users/david/Documents/git/tbdavid2019/Sink/package.json) 有 `deploy:pages`
- [`docs/deployment/pages.md`](/Users/david/Documents/git/tbdavid2019/Sink/docs/deployment/pages.md) 已存在 Pages 安裝說明
- [`CHANGELOG.md`](/Users/david/Documents/git/tbdavid2019/Sink/CHANGELOG.md) 已記錄 Pages preset 差異與常見 404 問題

### 檢查發現的注意事項

#### 1. `pnpm deploy` 預設其實是 Pages

目前 [`package.json`](/Users/david/Documents/git/tbdavid2019/Sink/package.json) 內：

```json
"deploy": "npm run deploy:pages"
```

也就是說：

- `pnpm deploy` = Pages
- `pnpm deploy:worker` = Workers

如果使用者沒有注意，很容易以為 `deploy` 是通用部署指令。

#### 2. `deploy:pages` 本身不會自動切到 Pages preset

目前 [`package.json`](/Users/david/Documents/git/tbdavid2019/Sink/package.json) 內：

```json
"deploy:pages": "wrangler pages deploy dist"
```

這代表它只負責把 `dist` 上傳出去，不負責保證 `dist` 是用 `cloudflare-pages` preset build 出來的。

所以若是本地手動部署 Pages，正確流程應該是：

```bash
NITRO_PRESET=cloudflare-pages pnpm build
npx wrangler pages deploy dist --project-name <your-pages-project-name>
```

#### 3. `wrangler.jsonc` 目前是偏向 Workers 路徑的設定

目前 [`wrangler.jsonc`](/Users/david/Documents/git/tbdavid2019/Sink/wrangler.jsonc) 包含：

- `main: "dist/server/index.mjs"`
- `assets.directory: "dist/public"`

這是 Worker 部署路徑需要的設定，不是 Pages 專案本身的設定檔格式。這是正常的，但也代表：

- `wrangler.jsonc` 不能被理解成「Pages 與 Workers 完全共用同一套 deploy 入口」
- Pages 仍需要走自己的 build target 與 deploy 指令

---

## 5. 建議給使用者的簡短結論

如果只是要快速上線，建議這樣理解：

- **想接 GitHub 自動部署站點**：用 **Cloudflare Pages**
- **想用最直接、最穩定的 Nitro Worker 部署路徑**：用 **Cloudflare Workers**

若沒有特殊理由，且你重視部署行為單純可控，**Workers 通常比較直接**。

---

## 6. 推薦操作指令

### 本地開發

```bash
pnpm install
cp .env.example .env
pnpm dev
```

### 部署到 Workers

```bash
pnpm build
pnpm deploy:worker
```

### 部署到 Pages

```bash
NITRO_PRESET=cloudflare-pages pnpm build
npx wrangler pages deploy dist --project-name <your-pages-project-name>
```
