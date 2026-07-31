# 升級：隨機短網址重複使用

本教學適用於既有 Sink 站台。升級後，完全相同的目的網址會重複使用既有隨機短網址，而不是建立新的 slug。

## 規則

- 比對使用完整目的網址字串；尾端斜線、query string 與 fragment 不同即視為不同網址。
- Dashboard 隨機按鈕產生的 slug 會重複使用同 URL 最早建立的隨機短網址。
- 手動輸入與 AI 產生的 slug 為自訂 slug，可與其他連結共用目的網址。
- 沒有 `isCustomSlug` 的歷史連結一律視為隨機 slug。

## 升級前確認

1. 先部署包含此功能的 Sink 版本。
2. 確認 `wrangler.jsonc` 的 `KV` binding 指向 production namespace。
3. 使用對目標帳號具 **Workers KV Storage Write** 權限的帳號登入：

   ```bash
   pnpm wrangler login
   ```

> migration 會更新 `link:` 記錄並新增 `url-index:` 記錄；請先確認 Cloudflare 帳號與 namespace 正確。

## 執行 migration

先以 Wrangler OAuth 執行唯讀 dry run：

```bash
CLOUDFLARE_ACCOUNT_ID="<account-id>" pnpm migrate:link-index -- --wrangler
```

確認輸出後，加入 `--apply` 正式寫入：

```bash
CLOUDFLARE_ACCOUNT_ID="<account-id>" pnpm migrate:link-index -- --wrangler --apply
```

在 CI 中也可改用具 Workers KV Storage Read／Write 權限的 `CLOUDFLARE_API_TOKEN`，並設定 `KV_NAMESPACE_ID`，省略 `--wrangler`。

大量歷史資料會受控並行讀取，最後以 KV bulk write 寫入；請等到出現 `Migration complete` 才結束指令。

## 驗證與回復

- `Scanned`、`Will mark`、`create` 與 `Migration complete` 分別顯示掃描、補標記、索引與實際寫入數量。
- 對既有 URL 用隨機 slug 再次建立，應回傳最早既有短網址；手動或 AI slug 應能建立另一筆。
- migration 可安全重跑；已標記資料不會重複補標記，索引會重新建立。
- 不要將 `KV` binding 替換為其他專案的 namespace；若需停用行為，先回復應用程式版本即可，`url-index:` 不影響舊版依 slug 轉址。
