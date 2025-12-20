# LINE 點餐機器人系統 - 設定教學

本教學將引導您使用 Google Apps Script (GAS) 和 Google Sheets (試算表) 來部署飲料點餐系統。

## 1. Google Sheet (試算表) 設定
1. 建立一個新的 Google Sheet。
2. 記下 **Spreadsheet ID** (試算表 ID) (位於網址中：`https://docs.google.com/spreadsheets/d/您的試算表ID/edit`)。
3. 建立兩個工作表 (Sheet)，名稱必須完全一致：
    - `Menu`
    - `Orders`

### `Menu` 工作表格式
請在此輸入您的飲料菜單。
| 第一列 | Shop | Category | Item | Price |
|-------|------|----------|------|-------|
| 第二列 | 50嵐  | Tea      | 紅茶  | 30    |
| 第三列 | 50嵐  | Tea      | 綠茶  | 30    |
| 第四列 | 迷客夏 | Milk     | 拿鐵  | 60    |

### `Orders` 工作表格式
請留空 (除了標題列之外)，程式會自動將訂單寫入這裡。
| Timestamp | UserId | UserName | Shop | Item | Size | Sugar | Ice | Price |
|-----------|--------|----------|------|------|------|-------|-----|-------|

## 2. Google Apps Script 設定
1. 在您的 Google Sheet 中，點擊上方選單的 **擴充功能 (Extensions)** > **Apps Script**。
2. **Code.gs**: 將本專案提供的 `Code.gs` 內容複製並貼上到編輯器中的 `Code.gs` 檔案。
3. **index.html**: 在編輯器中建立一個新的 HTML 檔案，命名為 `index.html`，並將本專案提供的 `index.html` 內容複製貼上。

## 3. 設定參數
請修改 `Code.gs` 最上方的變數：
- `CHANNEL_ACCESS_TOKEN`: 您的 LINE Bot Channel Access Token (在 LINE Developers Console 取得)。
- `SPREADSHEET_ID`: 您在第 1 步記下的試算表 ID。

## 4. 部署 (Deployment)
1. 點擊右上角的 **部署 (Deploy)** > **新增部署 (New deployment)**。
2. 選取類型為 **網頁應用程式 (Web app)**。
3. **說明 (Description)**: `v1` (或任意說明)。
4. **執行身分 (Execute as)**: `我 (Me)` (您的 Google 帳號)。
5. **誰可以存取 (Who has access)**: **任何人 (Anyone)** (重要！這是為了讓 LINE 能夠傳送資料給您的程式)。
    - *注意*: 第一次部署時系統會要求您授權權限。
6. 點擊 **部署 (Deploy)**。
7. 複製 **網頁應用程式網址 (Web App URL)**。

## 5. LINE Bot 連線設定
1. 前往 LINE Developers Console。
2. 選擇您的 Channel。
3. 在 **Messaging API** 設定頁面中，將 **Webhook URL** 設定為您剛剛複製的 **Web App URL**。
4. 開啟 **Use webhook**。

## 6. LIFF 設定
1. 前往 LINE Developers Console > LIFF 標籤頁。
2. 建立一個新的 LIFF app。
3. **Size**: Full, Tall, 或 Compact (建議選 Tall)。
4. **Endpoint URL**: 貼上您剛剛複製的同一個 **Web App URL**。
5. 開啟 **Scan QR** 模組 (非必要，可選)。
6. 複製 **LIFF ID**。
7. **更新程式碼**:
    - 回到 GAS 編輯器的 `Code.gs`，找到 `replyShopSelection` 函式，將其中的 `YOUR_LIFF_ID` 替換為您的 LIFF ID。
    - 在 `index.html` 中，也可以解除註解 `liff.init` 並填入 `YOUR_LIFF_ID` (視情況而定，通常 LIFF 瀏覽器內建會自動處理，但建議填上)。
    - **重新部署**: 點擊 **部署 (Deploy)** > **管理部署 (Manage deployments)** > **編輯 (Edit)** > **新版本 (New version)** > **部署 (Deploy)**。(注意：修改程式碼後必須建立新版本才會生效)。

## 7. 測試
1. 將您的 Bot 加為好友。
2. 輸入 "點餐" -> 應該會出現店家選擇卡片。
3. 點擊 "去點餐" -> 應該會打開 LIFF 網頁。
4. 選擇飲料 -> 選擇規格 -> 送出。
5. 檢查 Google Sheet 的 `Orders` 工作表，確認是否有新資料寫入。
6. 輸入 "歷史紀錄" -> 應該會顯示您上一筆訂單。
