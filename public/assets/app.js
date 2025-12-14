// Disable casual saving (not a real protection)
document.addEventListener('contextmenu', (e) => {
  const t = e.target;
  if (t && (t.tagName === 'IMG' || t.classList?.contains('media'))) e.preventDefault();
});

function fmtDate(ms){
  const d = new Date(ms);
  return d.toLocaleString(undefined, { year:'numeric', month:'short', day:'2-digit' });
}

async function getJSON(url){
  const r = await fetch(url, { headers: { 'Accept': 'application/json' }});
  if(!r.ok) throw new Error(await r.text());
  return r.json();
}

function el(tag, attrs={}, children=[]){
  const n = document.createElement(tag);
  for(const [k,v] of Object.entries(attrs)){
    if(k === 'class') n.className = v;
    else if(k === 'html') n.innerHTML = v;
    else n.setAttribute(k, v);
  }
  for(const c of children){
    if(typeof c === 'string') n.appendChild(document.createTextNode(c));
    else if(c) n.appendChild(c);
  }
  return n;
}

async function renderTimeline(){
  const root = document.querySelector('#feed');
  if(!root) return;
  root.innerHTML = '';
  const data = await getJSON('/api/posts?limit=20');

  for(const p of data.items){
    const link = `/post.html?id=${encodeURIComponent(p.id)}`;

    const body = [];
    if(p.cover_url){
      const img = el('img', { class:'media', src: p.cover_url, alt:'', loading:'lazy' });
      img.draggable = false;
      body.push(el('a', { href: link }, [img]));
    }

    const card = el('div', { class:'card' }, [
      ...body,
      el('div', { class:'meta' }, [
        el('div', { class:'date' }, [fmtDate(p.created_at)]),
        el('div', { class:'badge' }, [`${p.media_count} photo${p.media_count === 1 ? '' : 's'}`])
      ]),
      el('div', { class:'caption' }, [p.caption || ''])
    ]);

    // Make the whole card clickable for text-only posts
    if(!p.cover_url){
      card.style.cursor = 'pointer';
      card.addEventListener('click', () => location.href = link);
    }

    root.appendChild(card);
  }

  if(data.items.length === 0){
    root.appendChild(el('div', { class:'sub' }, ['No posts yet. Go to /admin to upload.']));
  }
}

async function renderGrid(){
  const root = document.querySelector('#grid');
  if(!root) return;
  root.innerHTML = '';
  const data = await getJSON('/api/posts?limit=60');
  for(const p of data.items){
    if(!p.cover_url || (p.media_count ?? 0) <= 0) continue; // photos tab only
    const link = `/post.html?id=${encodeURIComponent(p.id)}`;
    const tile = el('a', { class:'tile', href: link }, [
      el('img', { src: p.cover_url, alt:'', loading:'lazy' }),
      el('div', { class:'count' }, [String(p.media_count)])
    ]);
    tile.querySelector('img').draggable = false;
    root.appendChild(tile);
  }
}

async function renderPost(){
  const root = document.querySelector('#post');
  if(!root) return;

  const id = new URL(location.href).searchParams.get('id');
  if(!id){
    root.innerHTML = '<div class="sub">Missing post id.</div>';
    return;
  }
  const data = await getJSON(`/api/posts/${encodeURIComponent(id)}`);

  const hasMedia = Array.isArray(data.media) && data.media.length > 0;
  const carousel = hasMedia ? el('div', { class:'carousel' }, data.media.map(m => {
    const img = el('img', { src: m.url, alt:'', loading:'lazy' });
    img.draggable = false;
    return img;
  })) : null;

  root.innerHTML = '';
  root.appendChild(el('div', { class:'detail' }, [
    ...(carousel ? [carousel] : []),
    el('div', { class:'meta' }, [
      el('div', { class:'date' }, [fmtDate(data.created_at)]),
      el('div', { class:'badge' }, [`${data.media.length} photo${data.media.length === 1 ? '' : 's'}`])
    ]),
    el('div', { class:'caption' }, [data.caption || ''])
  ]));
}

renderTimeline().catch(console.error);
renderGrid().catch(console.error);
renderPost().catch(console.error);
