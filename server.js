const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();

// ⚠️ نفس الرمز الموجود بالضبط في ملف UploadWorker.kt (TOKEN)
const SHARED_TOKEN = "efa5e4a0ebd4c9522fc9ef8e5bb7b2768b1387e504d006cb";

const MEDIA_DIR = path.join(__dirname, "media");
if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, MEDIA_DIR),
  filename: (req, file, cb) => cb(null, Date.now() + "_" + file.originalname),
});
const upload = multer({ storage });

function checkToken(req, res, next) {
  const token = req.headers["x-token"] || req.query.t;
  if (token !== SHARED_TOKEN) return res.status(403).json({ error: "forbidden" });
  next();
}

// حالة السيرفر
app.get("/health", (req, res) => res.json({ status: "ok" }));

// رفع ملف من تطبيق المرسل
app.post("/upload", checkToken, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "no file" });
  res.json({ status: "ok", name: req.file.filename });
});

// قائمة الملفات (JSON) تستخدمها صفحة المعرض
app.get("/api/media", checkToken, (req, res) => {
  const files = fs.readdirSync(MEDIA_DIR).sort().reverse();
  res.json(files.map((n) => ({ name: n, url: "/media/" + n })));
});

// تقديم الملفات نفسها (صور/فيديو)
app.use("/media", express.static(MEDIA_DIR));

// صفحة المعرض (تُفتح من المتصفح برابط فيه ?t=الرمز)
app.get("/", (req, res) => {
  res.set("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>معرضي</title>
<style>
  body { font-family: sans-serif; background:#111; color:#eee; margin:0; padding:16px; }
  #gallery { display:grid; grid-template-columns:repeat(auto-fill, minmax(160px,1fr)); gap:10px; }
  #gallery img, #gallery video { width:100%; border-radius:8px; }
</style>
</head>
<body>
<h2>صوري وفيديوهاتي</h2>
<div id="gallery">جاري التحميل...</div>
<script>
  const TOKEN = new URLSearchParams(location.search).get('t') || '';
  fetch('/api/media?t=' + encodeURIComponent(TOKEN))
    .then(r => r.json())
    .then(items => {
      const g = document.getElementById('gallery');
      g.innerHTML = '';
      if (!items.length) { g.innerHTML = 'لا توجد ملفات بعد.'; return; }
      for (const it of items) {
        const isVideo = /\\.(mp4|mov|webm)$/i.test(it.name);
        const el = document.createElement(isVideo ? 'video' : 'img');
        el.src = it.url;
        if (isVideo) el.controls = true;
        g.appendChild(el);
      }
    })
    .catch(() => { document.getElementById('gallery').innerHTML = 'تعذر تحميل الصور — تأكد من الرابط والرمز.'; });
</script>
</body>
</html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});
