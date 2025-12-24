lucide.createIcons();
const gallery = document.getElementById('gallery'), input = document.getElementById('walletInput');
const header = document.getElementById('mainHeader'), bottomNav = document.getElementById('bottomNav');
const modal = document.getElementById('detailModal'), sortSelect = document.getElementById('sortSelect');
const dynamicControls = document.getElementById('dynamicControls');

let allNfts = [], continuation = null, currentWallet = "", isFetching = false, lastScrollY = 0;
let touchStartX = 0, touchStartY = 0;

// BACK TO TOP BTN
const bttBtn = document.createElement('button');
bttBtn.className = "back-to-top hidden";
bttBtn.innerHTML = '<i data-lucide="arrow-up"></i>';
document.body.appendChild(bttBtn);
bttBtn.onclick = () => gallery.scrollTo({ top: 0, behavior: 'smooth' });

// GLOBAL SWIPE
document.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
}, {passive: true});

document.addEventListener('touchend', e => {
    const xDiff = e.changedTouches[0].screenX - touchStartX;
    const yDiff = e.changedTouches[0].screenY - touchStartY;
    const mode = document.documentElement.getAttribute('data-view');
    if (Math.abs(xDiff) > 100 && Math.abs(yDiff) < 50) {
        if (xDiff > 0 && mode === 'grid') switchView('snap');
        if (xDiff < 0 && mode === 'snap') switchView('grid');
    }
}, {passive: true});

document.getElementById('themeToggle').onclick = () => {
    const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    document.getElementById('themeToggle').innerHTML = `<i data-lucide="${theme === 'dark' ? 'sun' : 'moon'}"></i>`;
    lucide.createIcons();
};

document.getElementById('shuffleBtn').onclick = () => { if (allNfts.length > 0) renderAll(); gallery.scrollTo({ top: 0, behavior: 'smooth' }); };

gallery.onscroll = () => {
    const cur = gallery.scrollTop;
    if (cur > lastScrollY && cur > 100) hideUI(); else if (cur < lastScrollY) showUI();
    if (document.documentElement.getAttribute('data-view') === 'grid' && cur > 400) bttBtn.classList.remove('hidden');
    else bttBtn.classList.add('hidden');
    lastScrollY = cur;
    if (gallery.scrollTop + gallery.clientHeight >= gallery.scrollHeight - 1000 && continuation && !isFetching) fetchArt();
};

function hideUI() { header.classList.add('ui-hidden'); bottomNav.classList.add('ui-hidden'); }
function showUI() { header.classList.remove('ui-hidden'); bottomNav.classList.remove('ui-hidden'); }

async function fetchArt(isNew = false) {
    currentWallet = input.value.trim();
    if (!currentWallet || isFetching) return;
    isFetching = true;
    if (isNew) { allNfts = []; continuation = null; gallery.innerHTML = ""; }
    try {
        const res = await fetch(`/api/view?wallet=${currentWallet}${continuation ? `&next=${continuation}` : ''}`);
        const data = await res.json();
        if (data.nfts) { 
            const cleaned = data.nfts.map(n => ({
                ...n,
                display_artist: n.creator || (n.owners && n.owners[0]?.display_name) || "Unknown Artist"
            }));
            allNfts = [...allNfts, ...cleaned]; 
            continuation = data.next; 
            dynamicControls.classList.remove('hidden'); 
            bottomNav.classList.remove('hidden'); 
            renderAll(); 
        }
    } catch (e) {} finally { isFetching = false; }
}

function renderAll() {
    gallery.innerHTML = "";
    const mode = document.documentElement.getAttribute('data-view');
    if (mode === 'snap') {
        const groups = {};
        allNfts.forEach((n, i) => { const s = n.collection || `unique-${i}`; if (!groups[s]) groups[s] = []; groups[s].push(n); });
        Object.keys(groups).sort(() => Math.random() - 0.5).forEach(k => {
            const items = groups[k], card = document.createElement('div'), slider = document.createElement('div');
            card.className = 'art-card'; slider.className = 'collection-slider';
            items.forEach((n, idx) => {
                const s = document.createElement('div'); s.className = 'collection-slide';
                s.innerHTML = `<div class="collection-counter">${idx + 1}/${items.length}</div><button class="quick-share" onclick="event.stopPropagation(); share('${n.opensea_url}')"><i data-lucide="share-2"></i></button><img src="${n.image_url || n.display_image_url}" loading="lazy">`;
                s.onclick = () => showDetails(n.contract, n.identifier, false);
                slider.appendChild(s);
            });
            card.appendChild(slider); gallery.appendChild(card);
        });
    } else {
        const sort = sortSelect.value;
        let list = [...allNfts];
        if (sort === 'project') list.sort((a,b) => (a.collection||"").localeCompare(b.collection||""));
        else if (sort === 'artist') list.sort((a,b) => (a.display_artist).localeCompare(b.display_artist));
        else if (sort === 'name') list.sort((a,b) => (a.name||"#").localeCompare(b.name||"#"));

        let lastG = "";
        list.forEach(n => {
            const curG = sort === 'project' ? n.collection : sort === 'artist' ? n.display_artist : (n.name||"#").charAt(0).toUpperCase();
            if (sort !== 'none' && curG !== lastG) { appendHeader(curG || "UNKNOWN"); lastG = curG; }
            const c = document.createElement('div'); c.className = 'art-card';
            c.innerHTML = `<img src="${n.image_url || n.display_image_url}" loading="lazy">`;
            c.onclick = () => showDetails(n.contract, n.identifier, true);
            gallery.appendChild(c);
        });
    }
    lucide.createIcons();
}

function appendHeader(text) {
    const h = document.createElement('div'); h.className = 'grid-header'; h.innerText = text;
    h.onclick = () => { h.classList.toggle('collapsed'); let next = h.nextElementSibling; while (next && !next.classList.contains('grid-header')) { next.classList.toggle('collapsed-group'); next = next.nextElementSibling; } };
    gallery.appendChild(h);
}

async function showDetails(c, id, isTwoStep) {
    const modalContent = document.querySelector('.modal-content');
    modalContent.classList.remove('show-details');
    modal.classList.remove('hidden');
    const m = document.getElementById('modalData');
    m.innerHTML = `<p style="color:white; text-align:center; padding: 100px;">LOADING...</p>`;
    try {
        const res = await fetch(`/api/view?address=${c}&id=${id}`);
        const data = await res.json(), n = data.nft;
        document.getElementById('modalShareBtn').onclick = () => share(n.opensea_url);
        m.innerHTML = `<div class="modal-body"><div class="modal-img-container"><img src="${n.image_url || n.display_image_url}" id="modalMainImg">${isTwoStep ? '<p class="tap-hint">TAP IMAGE FOR DETAILS</p>' : ''}</div><div class="modal-text-content"><h2 style="font-weight:900;">${n.name || 'UNTITLED'}</h2><p style="opacity:0.5; font-size:10px; letter-spacing:1px; text-transform:uppercase;">${n.collection || ''}</p><p style="margin-top:20px; line-height:1.6; font-size:14px; opacity:0.8;">${n.description || 'No description available.'}</p><a href="${n.opensea_url}" target="_blank" style="display:block; padding:18px; background:white; color:black; text-align:center; border-radius:12px; font-weight:900; margin-top:30px; text-decoration:none; font-size:12px;">OPENSEA</a></div></div>`;
        if (isTwoStep) m.querySelector('.modal-img-container').onclick = () => modalContent.classList.toggle('show-details');
        else modalContent.classList.add('show-details');
    } catch (e) { m.innerHTML = "Error."; }
    lucide.createIcons();
}

function switchView(mode) {
    document.documentElement.setAttribute('data-view', mode);
    document.getElementById('navHome').classList.toggle('active', mode === 'snap');
    document.getElementById('navGrid').classList.toggle('active', mode === 'grid');
    bttBtn.classList.add('hidden');
    showUI(); gallery.scrollTo(0,0); renderAll();
}

window.share = (u) => { if (navigator.share) navigator.share({ url: u }); else { navigator.clipboard.writeText(u); const t = document.getElementById('toast'); t.classList.remove('hidden'); setTimeout(() => t.classList.add('hidden'), 2000); } };
document.getElementById('goBtn').onclick = () => fetchArt(true);
document.querySelector('.close-btn').onclick = () => modal.classList.add('hidden');
document.querySelector('.modal-overlay').onclick = () => modal.classList.add('hidden');
document.getElementById('navHome').onclick = () => switchView('snap');
document.getElementById('navGrid').onclick = () => switchView('grid');
sortSelect.onchange = () => renderAll();
