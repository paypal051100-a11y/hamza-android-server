import os
from flask import Flask, request, send_from_directory, jsonify, abort
from werkzeug.utils import secure_filename

app = Flask(__name__)

# رمز سري ثابت، مكتوب هنا وفي كود التطبيقين الاثنين - المستخدم لا يراه أبداً
SHARED_TOKEN = "efa5e4a0ebd4c9522fc9ef8e5bb7b2768b1387e504d006cb"

MEDIA_DIR = "media"
os.makedirs(MEDIA_DIR, exist_ok=True)


@app.post("/upload")
def upload():
    if request.headers.get("X-Token") != SHARED_TOKEN:
        abort(403)
    f = request.files["file"]
    name = secure_filename(f.filename)
    f.save(os.path.join(MEDIA_DIR, name))
    return jsonify({"status": "ok"})


@app.get("/api/media")
def api_media():
    if request.headers.get("X-Token") != SHARED_TOKEN:
        abort(403)
    files = sorted(os.listdir(MEDIA_DIR), reverse=True)
    return jsonify([{"name": n, "url": f"/media/{n}"} for n in files])


@app.get("/media/<name>")
def media(name):
    # ملفات الوسائط نفسها بلا تحقق رمز، لتسهيل عرضها داخل التطبيق مباشرة
    return send_from_directory(MEDIA_DIR, name)


GALLERY_PAGE = """
<!DOCTYPE html>
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
  fetch('/api/media', { headers: { 'X-Token': TOKEN } })
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
    .catch(() => { document.getElementById('gallery').innerHTML = 'تعذر تحميل الصور — تأكد من الرابط.'; });
</script>
</body>
</html>
"""


@app.get("/")
def gallery_page():
    return GALLERY_PAGE


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
