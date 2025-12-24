lucide.createIcons();
const gallery = document.getElementById('gallery'), input = document.getElementById('walletInput');
const header = document.getElementById('mainHeader'), bottomNav = document.getElementById('bottomNav');
const modal = document.getElementById('detailModal'), sortSelect = document.getElementById('sortSelect');

let allNfts = [], continuation = null, currentWallet = "", isFetching = false, lastScrollY = 0;
let touchX = 0, touchY = 0;

// UNIVERSAL SWIPE
document.addEventListener('touchstart', e => { touchX = e.changedTouches[0].screenX; touchY = e.changedTouches[0].screenY; }, {passive: true});
document.addEventListener('touchend', e => {
    const xDiff = e.changedTouches[0].screenX - touchX, yDiff = Math.abs(e.changedTouches[0].screenY - touchY);
    if (Math.abs(xDiff) > 100 && yDiff < 60) {
        const mode = document.documentElement.getAttribute('data-view');
        if (xDiff > 0 && mode === 'grid') switchView('snap');
        if (xDiff < 0 && mode === 'snap') switchView('grid');
    }
}, {passive: true});

// HIDE UI ON SCROLL
gallery.onscroll = () => {
    const cur = gallery.scrollTop;
    if (cur > lastScrollY && cur > 100) { header.classList.add('ui-hidden'); bottomNav.classList.add('ui-hidden'); }
    else if (cur < lastScrollY) { header.classList.remove('ui-hidden'); bottomNav.classList.remove('ui-hidden'); }
    lastScrollY = cur;
    if (gallery.scrollTop + gallery.clientHeight >= gallery.scrollHeight - 1000 && continuation && !isFetching) fetchArt();
};

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
                artist: n.creator || (n.collection && n.collection.includes('by ') ? n.collection.split('by ')[1] : "Unknown Artist")
            }));
            allNfts = [...allNfts, ...cleaned]; 
            continuation = data.next; 
            document.getElementById('dynamicControls').classList.remove('hidden');
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
        allNfts.forEach((n, i) => { const k = n.collection || i; if (!groups[k]) groups[k] = []; groups[k].push(n); });
        Object.keys(groups).sort(() => Math.random() - 0.5).forEach(k => {
            const items = groups[k], card = document.createElement('div'), slider = document.createElement('div');
            card.className = 'art-card'; slider.className = 'collection-slider';
            items.forEach((n, idx) => {
                const s = document.createElement('div'); s.className = 'collection-slide';
                s.innerHTML = `<div class="loader-ring"></div><div class="collection-counter">${idx + 1} / ${items.length}</div><img src="${n.image_url || n.display_image_url}" onload="this.previousElementSibling.previousElementSibling.style.display='none'">`;
                s.onclick = () => showDetails(n.contract, n.identifier, false);
                slider.appendChild(s);
            });
            card.appendChild(slider); gallery.appendChild(card);
        });
    } else {
        const sort = sortSelect.value;
        let list = [...allNfts];
        if (sort === 'artist') list.sort((a,b) => a.artist.localeCompare(b.artist));
        else if (sort === 'project') list.sort((a,b) => (a.collection||"").localeCompare(b.collection||""));
        else if (sort === 'name') list.sort((a,b) => (a.name||"").localeCompare(b.name||""));

        let lastG = "";
        list.forEach(n => {
            const curG = sort === 'artist' ? n.artist : sort === 'project' ? n.collection : sort === 'name' ? (n.name||"#")[0].toUpperCase() : "";
            if (sort !== 'none' && curG !== lastG) {
                const h = document.createElement('div'); h.className = 'grid-header'; h.innerText = curG || "UNKNOWN";
                gallery.appendChild(h); lastG = curG;
            }
            const c = document.createElement('div'); c.className = 'art-card';
            c.innerHTML = `<div class="loader-ring"></div><img src="${n.image_url || n.display_image_url}" onload="this.previousElementSibling.style.display='none'">`;
            c.onclick = () => showDetails(n.contract, n.identifier, true);
            gallery.appendChild(c);
        });
    }
    lucide.createIcons();
}

async function showDetails(c, id, isTwoStep) {
    const modalContent = document.querySelector('.modal-content');
    modalContent.classList.remove('show-details');
    modal.classList.remove('hidden');
    const m = document.getElementById('modalData');
    m.innerHTML = `<div class="loader-ring"></div>`;
    try {
        const res = await fetch(`/api/view?address=${c}&id=${id}`);
        const data = await res.json(), n = data.nft;
        document.getElementById('modalShareBtn').onclick = () => { if(navigator.share) navigator.share({url: n.opensea_url}); };
        m.innerHTML = `<div class="modal-body"><div class="modal-img-container"><img src="${n.image_url || n.display_image_url}" id="modalMainImg"></div><div class="modal-text-content"><h2 style="font-weight:900;">${n.name || 'UNTITLED'}</h2><p style="opacity:0.5; font-size:12px;">${n.collection || ''}</p><p style="margin-top:15px; font-size:14px; opacity:0.8;">${n.description || ''}</p><a href="${n.opensea_url}" target="_blank" style="display:block; padding:15px; background:white; color:black; text-align:center; border-radius:10px; font-weight:900; margin-top:20px; text-decoration:none;">OPENSEA</a></div></div>`;
        m.querySelector('.modal-img-container').onclick = () => { if(isTwoStep) modalContent.classList.toggle('show-details'); };
        if(!isTwoStep) modalContent.classList.add('show-details');
    } catch (e) { m.innerHTML = "Error."; }
}

function switchView(mode) {
    document.documentElement.setAttribute('data-view', mode);
    document.getElementById('navHome').classList.toggle('active', mode === 'snap');
    document.getElementById('navGrid').classList.toggle('active', mode === 'grid');
    gallery.scrollTo(0,0); renderAll();
}

document.getElementById('goBtn').onclick = () => fetchArt(true);
document.getElementById('shuffleBtn').onclick = () => { if(allNfts.length) renderAll(); gallery.scrollTo({top:0, behavior:'smooth'}); };
document.querySelector('.close-btn').onclick = () => modal.classList.add('hidden');
document.getElementById('navHome').onclick = () => switchView('snap');
document.getElementById('navGrid').onclick = () => switchView('grid');
sortSelect.onchange = () => renderAll();
