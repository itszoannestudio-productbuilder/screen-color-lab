# Screen Color Lab

一個用來檢查網站色票對比度的 React 工具。貼上或輸入自己的 HEX 色票後，工具會檢查每兩個不同色票的組合，並依照 WCAG 對比度給出 AAA、AA、Large 或 Fail 評級。

## 功能

- 新增、編輯與移除色票
- 一次貼上多個 HEX 色碼
- 顯示所有色票兩兩配對的對比度矩陣
- 即時統計 AA 通過率、AAA 數量與最高對比度
- UI 預覽，感受色票放進介面後的效果
- 色票儲存在瀏覽器 localStorage
- 匯出成 JSON

## 開始使用

```bash
npm install
npm run dev
```

打開終端機顯示的本機網址即可使用。

## 建置

```bash
npm run build
npm run preview
```

這是一個純前端 Vite 網站，不需要資料庫或環境變數。部署到 Vercel 時，Framework 選擇 Vite，Build Command 使用 `npm run build`，Output Directory 使用 `dist`。
