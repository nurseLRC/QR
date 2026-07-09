# LRC QR Scanner - GitHub Pages + Apps Script

## 1) Apps Script

นำไฟล์ในโฟลเดอร์ `lrc_qr_appscript` ไปใส่ใน Apps Script

- `Code.gs`
- `QrScanner.html` ไม่จำเป็นก็ได้ แต่ใส่ไว้ได้

จากนั้น Deploy เป็น Web App:

- Execute as: Me
- Who has access: Anyone หรือ Anyone with the link

จะได้ URL เช่น:

```text
https://script.google.com/macros/s/AKfycbxxxxxxxxxxxxxxxx/exec
```

ทดสอบ API:

```text
https://script.google.com/macros/s/AKfycbxxxxxxxxxxxxxxxx/exec?page=api&code=SUP-0001
```

## 2) GitHub Pages

นำไฟล์ในโฟลเดอร์ `lrc_qr_github` ขึ้น GitHub Pages

- `index.html`
- `style.css`
- `script.js`

เปิดไฟล์ `script.js` แล้วแก้บรรทัดนี้:

```javascript
const APPS_SCRIPT_API_URL = 'PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE';
```

เป็น URL Apps Script Web App จริง เช่น:

```javascript
const APPS_SCRIPT_API_URL = 'https://script.google.com/macros/s/AKfycbxxxxxxxxxxxxxxxx/exec';
```

## 3) รูปแบบ QR ที่แนะนำ

แบบเปิดข้อมูลตรงทันที:

```text
https://nurse-ram.github.io/lrc-qr/?code=SUP-0001
```

หรือ QR เก็บแค่รหัส:

```text
SUP-0001
```

## 4) ชีตที่ระบบค้นหา

- ASSET_MASTER
- SUPPLY_MASTER
- SUPPLY_GROUP_MASTER

ระบบใช้ `getSheetByName()` เท่านั้น
