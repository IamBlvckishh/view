lucide.createIcons();
const gallery = document.getElementById('gallery'), input = document.getElementById('walletInput');
const header = document.getElementById('mainHeader'), bottomNav = document.getElementById('bottomNav');
const modal = document.getElementById('detailModal'), sortSelect = document.getElementById('sortSelect'), backToTop = document.getElementById('backToTop');
const chainSelect = document.getElementById('chainSelect');

let toast = document.getElementById('assetToast') || document.createElement('div');
if (!toast.id) { toast.id = 'assetToast'; toast.innerText = 'NEW ASSETS LOADED'; document.body.appendChild(toast); }

let allNfts = [], displayList = [], continuation = null, isFetching = false, lastScrollY = 0;
let touchStartX = 0, touchStartY = 0;
let snapPositions = {}; 

window.addEventListener('load', () => {
    const savedWallet = localStorage.getItem('savedWallet'), savedTheme = localStorage.getItem('theme');
    if (savedWallet) { input.value = savedWallet; fetchArt(true); }
    if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
    initSnow();
});

chainSelect.onchange = () => fetchArt(true);

function updateCounter(slider, collectionKey) {
    const idx = Math.round(slider.scrollLeft / window.innerWidth);
    const total = slider.children.length;
    const counter = slider.parentElement.querySelector('.collection-counter');
    if (counter) counter.innerText = `${idx + 1} / ${total}`;
    snapPositions[collectionKey] = slider.scrollLeft;
}

const setUIHidden = (hidden) => {
    header.classList.toggle('ui-hidden', hidden);
    bottomNav.classList.toggle('ui-hidden', hidden);
    document.querySelectorAll('.grid-header').forEach(h => h.classList.toggle('ui-hidden', hidden));
};

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

gallery.onscroll = () => {
    const cur = gallery.scrollTop;
    if (cur > lastScrollY && cur > 60) setUIHidden(true);
    else if (cur < lastScrollY) setUIHidden(false);
    lastScrollY = cur;
    backToTop.classList.toggle('show', document.documentElement.getAttribute('data-view') === 'grid' && cur > 500);
    if (cur + gallery.clientHeight >= gallery.scrollHeight - 1000 && continuation && !isFetching) fetchArt();
};

gallery.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; touchStartY = e.touches[0].clientY; }, {passive: true});
gallery.addEventListener('touchmove', e => {
    const dx = Math.abs(e.touches[0].clientX - touchStartX);
    const dy = Math.abs(e.touches[0].clientY - touchStartY);
    if (dx > 10 && dx > dy) setUIHidden(true);
}, {passive: true});

// LAPTOP HORIZONTAL SCROLL HIDE
gallery.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) > 5) setUIHidden(true);
}, { passive: true });

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

async function fetchArt(isNew = false) {
    let walletQuery = input.value.trim();
    if (!walletQuery || isFetching) return;
    isFetching = true;
    localStorage.setItem('savedWallet', walletQuery);
    if (isNew) { allNfts = []; displayList = []; gallery.innerHTML = ""; snapPositions = {}; continuation = null; }
    const selectedChain = chainSelect.value;
    try {
        if (walletQuery.toLowerCase().endsWith('.eth')) {
            const ensRes = await fetch(`https://api.ensideas.com/ens/resolve/${walletQuery}`);
            const ensData = await ensRes.json();
            if (ensData.address) walletQuery = ensData.address;
        }
        const res = await fetch(`/api/view?wallet=${walletQuery}&chain=${selectedChain}${continuation ? `&next=${continuation}` : ''}`);
        const data = await res.json();
        if (data.nfts) {
            const taggedNfts = data.nfts.map(n => ({ ...n, chain: n.chain || selectedChain }));
            allNfts = [...allNfts, ...taggedNfts];
            displayList = isNew ? [...allNfts].sort(() => Math.random() - 0.5) : [...displayList, ...taggedNfts];
            continuation = data.next;
            document.getElementById('dynamicControls').classList.remove('hidden');
            bottomNav.classList.remove('hidden');
            renderAll();
            if (!isNew) { toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 3000); }
        }
    } catch (e) { console.error(e); } finally { isFetching = false; }
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
                s.onclick = () => showDetails(n.contract, n.identifier, false, n.chain);
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
                c.onclick = () => showDetails(n.contract, n.identifier, true, n.chain);
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

async function showDetails(c, id, isTwoStep, chain = 'ethereum') {
    modal.classList.remove('hidden');
    const m = document.getElementById('modalData');
    m.innerHTML = `<div class="modal-body" style="justify-content:center;"><div class="spinner"></div></div>`;
    try {
        const res = await fetch(`/api/view?address=${c}&id=${id}&chain=${chain}`);
        const data = await res.json(), n = data.nft, imgUrl = n.image_url || n.display_image_url;
        m.innerHTML = `
            <div class="modal-body">
                <div id="detailHint">TAP IMAGE FOR DETAILS</div>
                <img src="${imgUrl}" id="modalMainImg">
                <div class="modal-text-content">
                    <div style="display:flex; margin-bottom:8px;">
                        <span class="chain-badge badge-${chain.toLowerCase()}">${chain.toUpperCase()}</span>
                    </div>
                    <h2 style="font-weight:900;">${n.name || 'UNTITLED'}</h2>
                    <p style="opacity:0.5; font-size:12px;">${n.collection || ''}</p>
                    <p style="margin-top:10px; font-size:14px; opacity:0.8;">${n.description || ''}</p>
                    <a href="${n.opensea_url}" target="_blank" class="os-btn">VIEW ON OPENSEA</a>
                    <button class="save-btn" id="saveImageBtn">SAVE IMAGE</button>
                </div>
            </div>`;
        const content = document.querySelector('.modal-content');
        if (isTwoStep) {
            content.classList.add('show-hint');
            m.querySelector('img').onclick = () => content.classList.toggle('show-details');
        } else { content.classList.add('show-details'); }
        document.getElementById('saveImageBtn').onclick = () => downloadImage(imgUrl, n.name);
    } catch (e) { modal.classList.add('hidden'); }
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
document.querySelector('.close-btn').onclick = () => { modal.classList.add('hidden'); document.querySelector('.modal-content').classList.remove('show-details', 'show-hint'); };
document.getElementById('navHome').onclick = () => switchView('snap');
document.getElementById('navGrid').onclick = () => switchView('grid');

function initSnow() {
    const sc = document.createElement('div'); sc.id = 'snow-container'; document.body.appendChild(sc);
    setInterval(() => {
        const f = document.createElement('div'); f.className = 'snowflake'; f.innerHTML = '❄';
        f.style.left = Math.random() * 100 + 'vw'; f.style.opacity = Math.random();
        f.style.animationDuration = (Math.random() * 3 + 2) + 's';
        sc.appendChild(f); setTimeout(() => f.remove(), 4000);
    }, 500);
}
