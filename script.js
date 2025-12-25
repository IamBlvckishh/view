lucide.createIcons();
const gallery = document.getElementById('gallery'), input = document.getElementById('walletInput');
const header = document.getElementById('mainHeader'), bottomNav = document.getElementById('bottomNav');
const modal = document.getElementById('detailModal'), sortSelect = document.getElementById('sortSelect');

let allNfts = [], displayList = [], currentWallet = "", isFetching = false, lastScrollY = 0;

window.addEventListener('load', () => {
    const saved = localStorage.getItem('savedWallet');
    if (saved) { input.value = saved; fetchArt(true); }
    initSnow();
});

document.getElementById('themeToggle').onclick = () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    renderAll();
};

// --- PAGINATED FETCH ENGINE ---
async function fetchArt(isNew = false) {
    currentWallet = input.value.trim();
    if (!currentWallet || isFetching) return;
    localStorage.setItem('savedWallet', currentWallet);
    isFetching = true;

    if (isNew) {
        allNfts = [];
        gallery.innerHTML = `<div id="loader" style="padding:100px; text-align:center; font-weight:900;">LOADING ASSETS... <span id="lCount">0</span></div>`;
    }

    let cursor = "";
    try {
        do {
            const res = await fetch(`/api/view?wallet=${currentWallet}${cursor ? `&cursor=${cursor}` : ''}`);
            const data = await res.json();
            if (data.nfts) {
                allNfts = [...allNfts, ...data.nfts];
                displayList = [...allNfts];
                const lCount = document.getElementById('lCount');
                if (lCount) lCount.innerText = allNfts.length;
                document.getElementById('dynamicControls').classList.remove('hidden');
                bottomNav.classList.remove('hidden');
            }
            cursor = data.next_cursor || data.next || "";
        } while (cursor); // KEEP FETCHING UNTIL FINISHED
        renderAll();
    } catch (e) { console.error(e); } finally { isFetching = false; }
}

function renderAll() {
    gallery.innerHTML = "";
    const mode = document.documentElement.getAttribute('data-view');
    const sort = sortSelect.value;

    if (mode === 'snap') {
        const groups = {};
        displayList.forEach(n => { const k = n.collection || "OTHER"; if(!groups[k]) groups[k] = []; groups[k].push(n); });
        Object.keys(groups).forEach(k => {
            const items = groups[k], card = document.createElement('div'), slider = document.createElement('div');
            card.className = 'art-card'; slider.className = 'collection-slider';
            card.innerHTML = `<div class="collection-counter">1 / ${items.length}</div>`;
            slider.onscroll = () => {
                const idx = Math.round(slider.scrollLeft / window.innerWidth);
                const cnt = card.querySelector('.collection-counter');
                if(cnt) cnt.innerText = `${idx + 1} / ${items.length}`;
            };
            items.forEach(n => {
                const s = document.createElement('div'); s.className = 'collection-slide';
                s.innerHTML = `<img src="${n.image_url || n.display_image_url}">`;
                s.onclick = () => showDetails(n.contract, n.identifier, false);
                slider.appendChild(s);
            });
            card.appendChild(slider); gallery.appendChild(card);
        });
    } else {
        let groups = {};
        if (sort === 'none') groups["ASSETS"] = displayList;
        else displayList.forEach(n => {
            const k = sort === 'project' ? (n.collection || "OTHER") : (n.name ? n.name[0].toUpperCase() : "#");
            if (!groups[k]) groups[k] = []; groups[k].push(n);
        });
        Object.keys(groups).sort().forEach(k => {
            const h = document.createElement('div'); h.className = 'grid-header'; h.innerText = k;
            const w = document.createElement('div'); w.className = 'grid-items-wrapper';
            groups[k].forEach(n => {
                const c = document.createElement('div'); c.className = 'art-card';
                c.innerHTML = `<img src="${n.image_url || n.display_image_url}">`;
                c.onclick = () => showDetails(n.contract, n.identifier, true);
                w.appendChild(c);
            });
            gallery.appendChild(h); gallery.appendChild(w);
        });
    }
    lucide.createIcons();
}

async function showDetails(c, id, isTwoStep) {
    modal.classList.remove('hidden');
    const m = document.getElementById('modalData');
    m.innerHTML = `<div style="padding:100px; text-align:center; color:#fff;">LOADING...</div>`;
    try {
        const res = await fetch(`/api/view?address=${c}&id=${id}`);
        const data = await res.json(), n = data.nft;
        const imgUrl = n.image_url || n.display_image_url;
        m.innerHTML = `
            <div class="modal-body">
                <img src="${imgUrl}" id="modalMainImg" style="width:100%;">
                <div class="modal-text-content">
                    <h2>${n.name || 'UNTITLED'}</h2>
                    <p style="opacity:0.6; font-size:12px;">${n.collection || ''}</p>
                    <p style="margin-top:10px;">${n.description || ''}</p>
                    <a href="${n.opensea_url}" target="_blank" class="os-btn">OPENSEA</a>
                    <button class="save-btn" id="saveBtn">SAVE IMAGE</button>
                </div>
            </div>`;
        const sb = document.getElementById('saveBtn');
        sb.onclick = async () => {
            sb.innerText = "SAVING...";
            await downloadImg(imgUrl, n.name);
            sb.innerText = "✓ SAVED!"; sb.classList.add('success');
            setTimeout(() => { sb.innerText = "SAVE IMAGE"; sb.classList.remove('success'); }, 2000);
        };
        if (isTwoStep) { 
            document.getElementById('modalMainImg').onclick = () => modal.querySelector('.modal-content').classList.toggle('show-details'); 
        } else { modal.querySelector('.modal-content').classList.add('show-details'); }
    } catch (e) { modal.classList.add('hidden'); }
}

async function downloadImg(u, n) {
    const r = await fetch(u); const b = await r.blob();
    const l = document.createElement('a'); l.href = URL.createObjectURL(b); l.download = `${n}.png`;
    l.click();
}

document.getElementById('goBtn').onclick = () => fetchArt(true);
document.getElementById('shuffleBtn').onclick = () => { displayList.sort(() => Math.random() - 0.5); renderAll(); };
sortSelect.onchange = () => renderAll();
document.querySelector('.close-btn').onclick = () => { modal.classList.add('hidden'); modal.querySelector('.modal-content').classList.remove('show-details'); };
document.getElementById('navHome').onclick = () => { document.documentElement.setAttribute('data-view', 'snap'); renderAll(); };
document.getElementById('navGrid').onclick = () => { document.documentElement.setAttribute('data-view', 'grid'); renderAll(); };

document.getElementById('santaBtn').onclick = () => {
    const t = document.getElementById('santaToast');
    t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 3000);
};

function initSnow() {
    const sc = document.createElement('div'); sc.id = 'snow-container'; document.body.appendChild(sc);
    setInterval(() => {
        const f = document.createElement('div'); f.className = 'snowflake'; f.innerHTML = '❄';
        f.style.left = Math.random() * 100 + 'vw'; f.style.animationDuration = (Math.random() * 3 + 2) + 's';
        sc.appendChild(f); setTimeout(() => f.remove(), 4000);
    }, 500);
}
