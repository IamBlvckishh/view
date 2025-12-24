lucide.createIcons();
const gallery = document.getElementById('gallery'), input = document.getElementById('walletInput');
const header = document.getElementById('mainHeader'), bottomNav = document.getElementById('bottomNav');
const modal = document.getElementById('detailModal'), sortSelect = document.getElementById('sortSelect');

let allNfts = [], displayList = [], continuation = null, currentWallet = "", isFetching = false;
let touchStartX = 0, touchStartY = 0;

// FIXED PRECISION COUNTER
const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const slide = entry.target;
            const index = slide.getAttribute('data-index');
            const total = slide.getAttribute('data-total');
            const counter = slide.closest('.art-card').querySelector('.collection-counter');
            if (counter) counter.innerText = `${parseInt(index) + 1} / ${total}`;
        }
    });
}, { threshold: 0.6 });

// UNIVERSAL SWIPE & PULL-TO-REFRESH
gallery.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}, {passive: true});

gallery.addEventListener('touchmove', e => {
    const y = e.touches[0].clientY;
    if (gallery.scrollTop <= 0 && y > touchStartY + 50) {
        const ri = document.getElementById('refreshIndicator');
        ri.style.opacity = "1";
        ri.querySelector('span').innerText = y > touchStartY + 120 ? "RELEASE TO REFRESH" : "PULL TO REFRESH";
    }
}, {passive: true});

gallery.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;

    // Swipe logic
    if (Math.abs(dx) > 100 && Math.abs(dy) < 80) {
        const mode = document.documentElement.getAttribute('data-view');
        if (dx > 0 && mode === 'grid') switchView('snap');
        else if (dx < 0 && mode === 'snap') switchView('grid');
    }
    // Refresh logic
    if (gallery.scrollTop <= 0 && dy > 120) fetchArt(true);
    document.getElementById('refreshIndicator').style.opacity = "0";
}, {passive: true});

async function fetchArt(isNew = false) {
    currentWallet = input.value.trim();
    if (!currentWallet || isFetching) return;
    isFetching = true;
    if (isNew) { allNfts = []; displayList = []; gallery.innerHTML = ""; }
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
            const items = groups[k], card = document.createElement('div');
            card.className = 'art-card';
            card.innerHTML = `<div class="collection-counter">1 / ${items.length}</div>`;
            const slider = document.createElement('div'); slider.className = 'collection-slider';
            items.forEach((n, idx) => {
                const s = document.createElement('div'); s.className = 'collection-slide';
                s.setAttribute('data-index', idx); s.setAttribute('data-total', items.length);
                s.innerHTML = `<img src="${n.image_url || n.display_image_url}">`;
                s.onclick = () => showDetails(n.contract, n.identifier, false);
                slider.appendChild(s);
                counterObserver.observe(s);
            });
            card.appendChild(slider); gallery.appendChild(card);
        });
    } else {
        let groups = {};
        if (sort === 'none') groups["ALL"] = list;
        else {
            if (sort === 'project') list.sort((a,b) => (a.collection||"").localeCompare(b.collection||""));
            list.forEach(n => {
                const k = sort === 'project' ? n.collection : (n.name||"#")[0].toUpperCase();
                if (!groups[k]) groups[k] = []; groups[k].push(n);
            });
        }
        Object.keys(groups).forEach(k => {
            const groupDiv = document.createElement('div'); groupDiv.className = 'grid-group';
            if (sort !== 'none') {
                const h = document.createElement('div'); h.className = 'grid-header';
                h.innerHTML = `<span>${k}</span><span>—</span>`;
                h.onclick = () => {
                    const items = groupDiv.querySelector('.grid-items');
                    const isHid = items.style.display === 'none';
                    items.style.display = isHid ? 'grid' : 'none';
                    h.querySelector('span:last-child').innerText = isHid ? '—' : '+';
                };
                groupDiv.appendChild(h);
            }
            const itemsDiv = document.createElement('div'); itemsDiv.className = 'grid-items';
            groups[k].forEach(n => {
                const c = document.createElement('div'); c.className = 'art-card';
                c.innerHTML = `<img src="${n.image_url || n.display_image_url}">`;
                c.onclick = () => showDetails(n.contract, n.identifier, true);
                itemsDiv.appendChild(c);
            });
            groupDiv.appendChild(itemsDiv); gallery.appendChild(groupDiv);
        });
    }
    lucide.createIcons();
}

async function showDetails(c, id, isTwoStep) {
    modal.classList.remove('hidden');
    const m = document.getElementById('modalData');
    try {
        const res = await fetch(`/api/view?address=${c}&id=${id}`);
        const data = await res.json(), n = data.nft, imgUrl = n.image_url || n.display_image_url;
        m.innerHTML = `<div class="modal-body">
            <img src="${imgUrl}" id="modalMainImg">
            <div class="modal-text-content">
                <h2 style="font-weight:900;">${n.name || 'UNTITLED'}</h2>
                <p style="opacity:0.5; font-size:12px;">${n.collection || ''}</p>
                <p style="margin-top:10px; font-size:14px; opacity:0.8;">${n.description || ''}</p>
                <a href="${n.opensea_url}" target="_blank" class="os-btn">VIEW ON OPENSEA</a>
                <button class="save-btn" id="saveImageBtn">SAVE IMAGE</button>
            </div>
        </div>`;
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
document.querySelector('.close-btn').onclick = () => { modal.classList.add('hidden'); document.querySelector('.modal-content').classList.remove('show-details'); };
document.getElementById('navHome').onclick = () => switchView('snap');
document.getElementById('navGrid').onclick = () => switchView('grid');
