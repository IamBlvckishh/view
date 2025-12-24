lucide.createIcons();
const gallery = document.getElementById('gallery'), input = document.getElementById('walletInput');
const header = document.getElementById('mainHeader'), bottomNav = document.getElementById('bottomNav');
const modal = document.getElementById('detailModal'), sortSelect = document.getElementById('sortSelect'), backToTop = document.getElementById('backToTop');

// Asset Toast Setup
let toast = document.getElementById('assetToast');
if (!toast) {
    toast = document.createElement('div'); toast.id = 'assetToast';
    toast.innerText = 'NEW ASSETS LOADED'; document.body.appendChild(toast);
}

let allNfts = [], displayList = [], continuation = null, currentWallet = "", isFetching = false, lastScrollY = 0;
let touchStartX = 0, touchStartY = 0;
let snapPositions = {}; 

window.addEventListener('load', () => {
    const savedWallet = localStorage.getItem('savedWallet');
    const savedTheme = localStorage.getItem('theme');
    if (savedWallet) { input.value = savedWallet; fetchArt(true); }
    if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
});

function updateCounter(slider, collectionKey) {
    const idx = Math.round(slider.scrollLeft / window.innerWidth);
    const total = slider.children.length;
    const counter = slider.parentElement.querySelector('.collection-counter');
    if (counter) counter.innerText = `${idx + 1} / ${total}`;
    snapPositions[collectionKey] = slider.scrollLeft;
}

document.getElementById('themeToggle').onclick = () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const next = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    const icon = document.querySelector('#themeToggle i');
    icon.setAttribute('data-lucide', next === 'light' ? 'moon' : 'sun');
    lucide.createIcons();
};

sortSelect.onchange = () => renderAll();

const setUIHidden = (hidden) => {
    header.classList.toggle('ui-hidden', hidden);
    bottomNav.classList.toggle('ui-hidden', hidden);
    // Snug Header Logic
    document.querySelectorAll('.grid-header').forEach(h => {
        h.style.opacity = hidden ? "0" : "1";
        h.style.pointerEvents = hidden ? "none" : "auto";
    });
};

gallery.onscroll = () => {
    const cur = gallery.scrollTop;
    const mode = document.documentElement.getAttribute('data-view');
    if (cur > lastScrollY && cur > 60) setUIHidden(true);
    else if (cur < lastScrollY) setUIHidden(false);
    lastScrollY = cur;
    backToTop.classList.toggle('show', mode === 'grid' && cur > 500);
    if (cur + gallery.clientHeight >= gallery.scrollHeight - 1000 && continuation && !isFetching) fetchArt();
};

gallery.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; touchStartY = e.touches[0].clientY; }, {passive: true});
gallery.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > 100 && Math.abs(dy) < 80) {
        const mode = document.documentElement.getAttribute('data-view');
        if (dx > 0 && mode === 'grid') switchView('snap');
        else if (dx < 0 && mode === 'snap') switchView('grid');
    }
    if (gallery.scrollTop <= 0 && dy > 130) fetchArt(true);
}, {passive: true});

function showToast() {
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

async function fetchArt(isNew = false) {
    currentWallet = input.value.trim();
    if (!currentWallet || isFetching) return;
    localStorage.setItem('savedWallet', currentWallet);
    isFetching = true;
    if (isNew) { allNfts = []; displayList = []; gallery.innerHTML = ""; snapPositions = {}; }
    try {
        const res = await fetch(`/api/view?wallet=${currentWallet}${continuation ? `&next=${continuation}` : ''}`);
        const data = await res.json();
        if (data.nfts) {
            allNfts = [...allNfts, ...data.nfts];
            displayList = isNew ? [...allNfts].sort(() => Math.random() - 0.5) : [...displayList, ...data.nfts];
            continuation = data.next;
            document.getElementById('dynamicControls').classList.remove('hidden');
            bottomNav.classList.remove('hidden');
            renderAll();
            if (!isNew) showToast(); 
        }
    } catch (e) {} finally { isFetching = false; }
}

function renderAll(filter = "") {
    gallery.innerHTML = '<div id="refreshIndicator"><div class="spinner"></div><span>PULL TO REFRESH</span></div>';
    const mode = document.documentElement.getAttribute('data-view'), sort = sortSelect.value;
    let list = [...displayList].filter(n => (n.collection || "").toLowerCase().includes(filter.toLowerCase()));

    if (mode === 'snap') {
        const groups = {};
        list.forEach((n, i) => { const k = n.collection || i; if (!groups[k]) groups[k] = []; groups[k].push(n); });
        Object.keys(groups).forEach(k => {
            const items = groups[k], card = document.createElement('div'), slider = document.createElement('div');
            card.className = 'art-card'; card.innerHTML = `<div class="collection-counter">1 / ${items.length}</div>`;
            slider.className = 'collection-slider';
            slider.addEventListener('scroll', () => updateCounter(slider, k), {passive: true});
            items.forEach((n) => {
                const s = document.createElement('div'); s.className = 'collection-slide';
                s.innerHTML = `<img src="${n.image_url || n.display_image_url}">`;
                s.onclick = () => showDetails(n.contract, n.identifier, false);
                slider.appendChild(s);
            });
            card.appendChild(slider); gallery.appendChild(card);
            if (snapPositions[k]) { setTimeout(() => { slider.scrollTo({ left: snapPositions[k] }); updateCounter(slider, k); }, 10); }
        });
    } else {
        let groups = {};
        if (sort === 'none') groups["ALL"] = list;
        else {
            if (sort === 'project') list.sort((a,b) => (a.collection||"").localeCompare(b.collection||""));
            list.forEach(n => { const k = sort === 'project' ? n.collection : (n.name||"#")[0].toUpperCase(); if (!groups[k]) groups[k] = []; groups[k].push(n); });
        }
        Object.keys(groups).forEach(k => {
            const container = document.createElement('div'), h = document.createElement('div'), itemsDiv = document.createElement('div');
            container.className = 'grid-group-container'; h.className = `grid-header ${sort === 'none' ? 'header-hidden' : ''}`;
            h.innerText = k || "UNKNOWN"; itemsDiv.className = 'grid-items-wrapper';
            groups[k].forEach(n => {
                const c = document.createElement('div'); c.className = 'art-card';
                c.innerHTML = `<img src="${n.image_url || n.display_image_url}">`;
                c.onclick = () => showDetails(n.contract, n.identifier, true);
                itemsDiv.appendChild(c);
            });
            h.onclick = () => { h.classList.toggle('collapsed'); itemsDiv.classList.toggle('collapsed-group'); };
            container.appendChild(h); container.appendChild(itemsDiv); gallery.appendChild(container);
        });
    }

    let sc = document.getElementById('searchContainer');
    if (sort === 'project') {
        if (!sc) {
            sc = document.createElement('div'); sc.id = "searchContainer"; sc.className = "search-container";
            sc.innerHTML = `<input type="text" id="projectSearch" placeholder="SEARCH PROJECTS...">`;
            document.getElementById('dynamicControls').appendChild(sc);
            document.getElementById('projectSearch').oninput = (e) => renderAll(e.target.value);
        }
    } else if (sc) { sc.remove(); }
    lucide.createIcons();
}

async function showDetails(c, id, isTwoStep) {
    modal.classList.remove('hidden');
    const m = document.getElementById('modalData');
    try {
        const res = await fetch(`/api/view?address=${c}&id=${id}`);
        const data = await res.json(), n = data.nft, imgUrl = n.image_url || n.display_image_url;
        m.innerHTML = `<div class="modal-body"><img src="${imgUrl}" id="modalMainImg"><div class="modal-text-content"><h2 style="font-weight:900;">${n.name || 'UNTITLED'}</h2><p style="opacity:0.5; font-size:12px;">${n.collection || ''}</p><p style="margin-top:10px; font-size:14px; opacity:0.8;">${n.description || ''}</p><a href="${n.opensea_url}" target="_blank" class="os-btn">VIEW ON OPENSEA</a><button class="save-btn" id="saveImageBtn">SAVE IMAGE</button></div></div>`;
        document.getElementById('saveImageBtn').onclick = () => downloadImage(imgUrl, n.name);
        m.querySelector('img').onclick = () => { if(isTwoStep) document.querySelector('.modal-content').classList.toggle('show-details'); };
        if(!isTwoStep) document.querySelector('.modal-content').classList.add('show-details');
    } catch (e) {}
}

async function downloadImage(url, name) {
    try {
        const res = await fetch(url); const blob = await res.blob();
        const bUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = bUrl; a.download = name || "art";
        document.body.appendChild(a); a.click(); a.remove();
    } catch (e) { window.open(url, '_blank'); }
}

function switchView(v) {
    document.documentElement.setAttribute('data-view', v);
    document.getElementById('navHome').classList.toggle('active', v === 'snap');
    document.getElementById('navGrid').classList.toggle('active', v === 'grid');
    renderAll();
}

document.getElementById('goBtn').onclick = () => fetchArt(true);
document.getElementById('shuffleBtn').onclick = () => { displayList.sort(() => Math.random() - 0.5); renderAll(); gallery.scrollTo(0,0); };
document.getElementById('backToTop').onclick = () => gallery.scrollTo({top:0, behavior:'smooth'});
document.querySelector('.close-btn').onclick = () => { modal.classList.add('hidden'); document.querySelector('.modal-content').classList.remove('show-details'); };
document.getElementById('navHome').onclick = () => switchView('snap');
document.getElementById('navGrid').onclick = () => switchView('grid');
