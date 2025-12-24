lucide.createIcons();
const gallery = document.getElementById('gallery'), input = document.getElementById('walletInput');
const header = document.getElementById('mainHeader'), bottomNav = document.getElementById('bottomNav');
const modal = document.getElementById('detailModal'), sortSelect = document.getElementById('sortSelect');

let allNfts = [], continuation = null, currentWallet = "", isFetching = false, lastScrollY = 0;
let touchX = 0, touchY = 0;

const showToast = (msg) => {
    let t = document.querySelector('.loading-popup');
    if(!t) { t = document.createElement('div'); t.className = 'loading-popup'; document.body.appendChild(t); }
    t.innerText = msg; t.style.opacity = '1';
    setTimeout(() => { t.style.opacity = '0'; }, 2000);
};

// THEME TOGGLE
document.getElementById('themeToggle').onclick = () => {
    const doc = document.documentElement;
    const isDark = doc.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    doc.setAttribute('data-theme', newTheme);
    const icon = document.querySelector('#themeToggle i');
    icon.setAttribute('data-lucide', newTheme === 'light' ? 'moon' : 'sun');
    lucide.createIcons();
};

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

// SLIDER COUNTER LOGIC
function updateSliderCounter(slider) {
    const index = Math.round(slider.scrollLeft / window.innerWidth);
    const counter = slider.parentElement.querySelector('.collection-counter');
    const total = slider.children.length;
    if (counter) counter.innerText = `${index + 1} / ${total}`;
}

async function fetchArt(isNew = false) {
    currentWallet = input.value.trim();
    if (!currentWallet || isFetching) return;
    isFetching = true;
    if (isNew) { allNfts = []; continuation = null; gallery.innerHTML = ""; }
    try {
        const res = await fetch(`/api/view?wallet=${currentWallet}${continuation ? `&next=${continuation}` : ''}`);
        const data = await res.json();
        if (data.nfts) { 
            allNfts = [...allNfts, ...data.nfts]; 
            continuation = data.next; 
            document.getElementById('dynamicControls').classList.remove('hidden');
            bottomNav.classList.remove('hidden');
            renderAll(); 
            showToast("ALL ART LOADED");
        }
    } catch (e) {} finally { isFetching = false; }
}

function renderAll(filter = "") {
    gallery.innerHTML = "";
    const mode = document.documentElement.getAttribute('data-view');
    const sort = sortSelect.value;
    let list = allNfts.filter(n => (n.collection || "").toLowerCase().includes(filter.toLowerCase()));

    if (mode === 'snap') {
        const groups = {};
        list.forEach((n, i) => { const k = n.collection || i; if (!groups[k]) groups[k] = []; groups[k].push(n); });
        Object.keys(groups).sort(() => Math.random() - 0.5).forEach(k => {
            const items = groups[k], card = document.createElement('div'), slider = document.createElement('div');
            card.className = 'art-card'; slider.className = 'collection-slider';
            slider.onscroll = () => updateSliderCounter(slider);
            items.forEach((n, idx) => {
                const s = document.createElement('div'); s.className = 'collection-slide';
                s.innerHTML = `<div class="collection-counter">${idx + 1} / ${items.length}</div><img src="${n.image_url || n.display_image_url}">`;
                s.onclick = () => showDetails(n.contract, n.identifier, false);
                slider.appendChild(s);
            });
            card.appendChild(slider); gallery.appendChild(card);
        });
    } else {
        if (sort === 'project') list.sort((a,b) => (a.collection||"").localeCompare(b.collection||""));
        else if (sort === 'name') list.sort((a,b) => (a.name||"").localeCompare(b.name||""));
        let lastG = "";
        list.forEach(n => {
            const curG = sort === 'project' ? n.collection : sort === 'name' ? (n.name||"#")[0].toUpperCase() : "";
            if (sort !== 'none' && curG !== lastG) {
                const h = document.createElement('div'); h.className = 'grid-header'; h.innerText = curG || "UNKNOWN";
                gallery.appendChild(h); lastG = curG;
            }
            const c = document.createElement('div'); c.className = 'art-card';
            c.innerHTML = `<img src="${n.image_url || n.display_image_url}">`;
            c.onclick = () => showDetails(n.contract, n.identifier, true);
            gallery.appendChild(c);
        });
    }
    lucide.createIcons();
}

sortSelect.onchange = () => {
    let sc = document.getElementById('searchContainer');
    if (!sc) {
        sc = document.createElement('div'); sc.id = "searchContainer"; sc.className = "search-container hidden";
        sc.innerHTML = `<input type="text" id="projectSearch" placeholder="SEARCH PROJECTS...">`;
        document.querySelector('.controls-row').after(sc);
        document.getElementById('projectSearch').oninput = (e) => renderAll(e.target.value);
    }
    sc.classList.toggle('hidden', sortSelect.value !== 'project');
    renderAll();
};

async function showDetails(c, id, isTwoStep) {
    const modalContent = document.querySelector('.modal-content');
    modalContent.classList.remove('show-details');
    modal.classList.remove('hidden');
    const m = document.getElementById('modalData');
    try {
        const res = await fetch(`/api/view?address=${c}&id=${id}`);
        const data = await res.json(), n = data.nft;
        m.innerHTML = `<div class="modal-body"><div class="modal-img-container"><img src="${n.image_url || n.display_image_url}" id="modalMainImg"></div><div class="modal-text-content"><h2 style="font-weight:900;">${n.name || 'UNTITLED'}</h2><p style="opacity:0.5; font-size:12px;">${n.collection || ''}</p><p style="margin-top:15px; font-size:14px; opacity:0.8;">${n.description || ''}</p></div></div>`;
        m.querySelector('.modal-img-container').onclick = () => { if(isTwoStep) modalContent.classList.toggle('show-details'); };
        if(!isTwoStep) modalContent.classList.add('show-details');
    } catch (e) {}
}

function switchView(v) {
    document.documentElement.setAttribute('data-view', v);
    document.getElementById('navHome').classList.toggle('active', v === 'snap');
    document.getElementById('navGrid').classList.toggle('active', v === 'grid');
    gallery.scrollTo(0,0); renderAll();
}

document.getElementById('goBtn').onclick = () => fetchArt(true);
document.getElementById('shuffleBtn').onclick = () => { renderAll(); gallery.scrollTo({top:0, behavior:'smooth'}); };
document.querySelector('.close-btn').onclick = () => modal.classList.add('hidden');
document.getElementById('navHome').onclick = () => switchView('snap');
document.getElementById('navGrid').onclick = () => switchView('grid');
