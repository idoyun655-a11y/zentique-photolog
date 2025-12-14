// Admin-only post detail page (served under /admin)
function fmtDate(ms){
  const d = new Date(ms);
  return d.toLocaleString(undefined, { year:'numeric', month:'short', day:'2-digit' });
}
async function getJSON(url){
  const r = await fetch(url, { headers: { 'Accept': 'application/json' }});
  if(!r.ok) throw new Error(await r.text());
  return r.json();
}
async function del(url){
  const r = await fetch(url, { method:'DELETE' });
  if(!r.ok) throw new Error(await r.text());
  try { return await r.json(); } catch { return {}; }
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

(async function(){
  const root = document.querySelector('#post');
  const id = new URL(location.href).searchParams.get('id');
  if(!id){
    root.innerHTML = '<div class="sub">Missing post id.</div>';
    return;
  }

  const data = await getJSON(`/api/posts/${encodeURIComponent(id)}`);
  const publicUrl = `/post.html?id=${encodeURIComponent(id)}`;
  const publicLink = document.getElementById('publicLink');
  if(publicLink) publicLink.href = publicUrl;

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

  const deleteBtn = document.getElementById('deleteBtn');
  deleteBtn?.addEventListener('click', async () => {
    const ok = confirm('Delete this post? This cannot be undone.');
    if(!ok) return;
    deleteBtn.disabled = true;
    try{
      await del(`/api/admin/posts/${encodeURIComponent(id)}`);
      alert('Deleted.');
      location.href = '/';
    }catch(e){
      alert('Delete failed: ' + (e.message || e));
      deleteBtn.disabled = false;
    }
  });
})().catch((e)=> {
  console.error(e);
  const root = document.querySelector('#post');
  if(root) root.innerHTML = `<div class="sub">Error: ${String(e.message||e)}</div>`;
});
