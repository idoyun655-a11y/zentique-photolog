document.addEventListener('contextmenu', (e) => {
  const t = e.target;
  if (t && t.tagName === 'IMG') e.preventDefault();
});

const $ = (q) => document.querySelector(q);

const filesEl = $('#files');
const captionEl = $('#caption');
const previewEl = $('#preview');
const btnEl = $('#upload');
const progOuter = $('#progOuter');
const progBar = $('#progBar');
const statusEl = $('#status');

let selected = [];

filesEl.addEventListener('change', () => {
  selected = Array.from(filesEl.files || []);
  renderPreviews();
});

function renderPreviews(){
  previewEl.innerHTML = '';
  for(const f of selected){
    const img = document.createElement('img');
    img.alt = '';
    img.draggable = false;
    img.src = URL.createObjectURL(f);
    previewEl.appendChild(img);
  }
  statusEl.textContent = selected.length ? `${selected.length} file(s) selected.` : 'No files selected.';
}

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

// Resize + watermark in-browser (no originals stored)
async function toWatermarkedJpeg(file, opts){
  const max = opts.maxSize ?? 1600;

  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { alpha: false });

  ctx.drawImage(bmp, 0, 0, w, h);

  // watermark: zentique (tiled, subtle)
  ctx.save();
  ctx.globalAlpha = 0.16;
  const fontSize = Math.max(18, Math.round(Math.min(w, h) * 0.06));
  ctx.font = `700 ${fontSize}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
  ctx.fillStyle = '#ffffff';

  ctx.translate(w/2, h/2);
  ctx.rotate(-18 * Math.PI / 180);

  const text = 'zentique';
  const metrics = ctx.measureText(text);
  const stepX = Math.max(180, metrics.width + 120);
  const stepY = Math.max(140, fontSize + 90);

  for(let y = -h*1.2; y <= h*1.2; y += stepY){
    for(let x = -w*1.2; x <= w*1.2; x += stepX){
      ctx.fillText(text, x, y);
    }
  }
  ctx.restore();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88));
  if(!blob) throw new Error('Failed to encode image');

  return { blob, width: w, height: h, mime: 'image/jpeg' };
}

async function postJSON(url, body){
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(body),
  });
  if(!r.ok) throw new Error(await r.text());
  return r.json();
}

async function postForm(url, form){
  const r = await fetch(url, { method:'POST', body: form });
  if(!r.ok) throw new Error(await r.text());
  return r.json();
}

function setProgress(p){
  progOuter.style.display = 'block';
  progBar.style.width = `${Math.max(0, Math.min(100, p))}%`;
}

btnEl.addEventListener('click', async () => {
  btnEl.disabled = true;
  try{
    const caption = (captionEl.value || '').trim();
    if(!caption && !selected.length) throw new Error('Write something or select at least one photo.');

    statusEl.textContent = 'Creating post...';
    setProgress(2);
    const post = await postJSON('/api/admin/posts', { caption });

    const total = selected.length;
    let done = 0;

    for(const f of selected){
      statusEl.textContent = `Processing ${done+1}/${total}...`;
      const processed = await toWatermarkedJpeg(f, { maxSize: 1600 });

      statusEl.textContent = `Uploading ${done+1}/${total}...`;
      const form = new FormData();
      form.append('file', new File([processed.blob], f.name.replace(/\.[^/.]+$/, '') + '.jpg', { type: processed.mime }));
      form.append('width', String(processed.width));
      form.append('height', String(processed.height));
      await postForm(`/api/admin/posts/${encodeURIComponent(post.id)}/media`, form);

      done++;
      setProgress(5 + Math.round((done/Math.max(1,total)) * 92));
      await sleep(80);
    }

    setProgress(100);
    statusEl.textContent = 'Done! Opening post...';
    await sleep(250);
    location.href = `/admin/post.html?id=${encodeURIComponent(post.id)}`;
  }catch(err){
    console.error(err);
    statusEl.textContent = `Error: ${err.message || err}`;
    setProgress(0);
    progOuter.style.display = 'none';
  }finally{
    btnEl.disabled = false;
  }
});
