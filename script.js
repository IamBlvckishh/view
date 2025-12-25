lucide.createIcons();
const gallery = document.getElementById('gallery'), input = document.getElementById('walletInput');
const header = document.getElementById('mainHeader'), bottomNav = document.getElementById('bottomNav');
const modal = document.getElementById('detailModal'), sortSelect = document.getElementById('sortSelect');

let allNfts = [], displayList = [], currentWallet = "", isFetching = false, lastScrollY = 0;

// --- 1. MEMORY & THEME ---
window.addEventListener('load', () => {
    const saved = localStorage.getItem('savedWallet');
    if (saved) { input.value = saved; fetchArt(true); }
    initSnow();
});

document.getElementById('themeToggle').onclick = () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    const icon = document.querySelector('#themeToggle i');
    icon.setAttribute('data-lucide', next === 'light' ? 'moon' : 'sun');
    lucide.createIcons();
};

// --- 2. DATA ENGINE ---
async function fetchArt(isNew = false) {
    currentWallet = input.value.trim();
    if (!currentWallet || isFetching) return;
    localStorage.setItem('savedWallet', currentWallet);
    isFetching = true;
    if (isNew) { allNfts = []; displayList = []; gallery.innerHTML = ""; }
    try {
        const res = await fetch(`/api/view?wallet=${currentWallet}`);
        const data = await res.json();
        if (data.nfts) {
            allNfts = data.nfts;
            displayList = [...allNfts];
            document.getElementById('dynamicControls').classList.remove('hidden');
            bottomNav.classList.remove('hidden');
            renderAll();
        }
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
                const counter = card.querySelector('.collection-counter');
                if(counter) counter.innerText = `${idx + 1} / ${items.length}`;
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
        if (sort === 'none') { groups["ALL ASSETS"] = displayList; }
        else {
            displayList.forEach(n => {
                const k = sort === 'project' ? (n.collection || "OTHER") : (n.name ? n.name[0].toUpperCase() : "#");
                if (!groups[k]) groups[k] = []; groups[k].push(n);
            });
        }
        Object.keys(groups).sort().forEach(k => {
            const h = document.createElement('div'); h.className = 'grid-header'; h.innerText = k;
            const wrapper = document.createElement('div'); wrapper.className = 'grid-items-wrapper';
            groups[k].forEach(n => {
                const c = document.createElement('div'); c.className = 'art-card';
                c.innerHTML = `<img src="${n.image_url || n.display_image_url}">`;
                c.onclick = () => showDetails(n.contract, n.identifier, true);
                wrapper.appendChild(c);
            });
            gallery.appendChild(h); gallery.appendChild(wrapper);
        });
    }
}

// --- 3. MODAL & SAVE ---
async function showDetails(c, id, isTwoStep) {
    modal.classList.remove('hidden');
    const m = document.getElementById('modalData');
    m.innerHTML = `<div class="modal-body"><div style="padding:50px; font-weight:900;">LOADING...</div></div>`;
    try {
        const res = await fetch(`/api/view?address=${c}&id=${id}`);
        const data = await res.json(), n = data.nft;
        const imgUrl = n.image_url || n.display_image_url;

        m.innerHTML = `
            <div class="modal-body">
                <div id="detailHint">TAP IMAGE FOR DETAILS</div>
                <img src="${imgUrl}" id="modalMainImg">
                <div class="modal-text-content">
                    <h2 style="font-weight:900;">${n.name || 'UNTITLED'}</h2>
                    <p style="opacity:0.5; font-size:11px; margin: 5px 0 15px;">${n.collection || ''}</p>
                    <p style="font-size:14px; opacity:0.8; line-height:1.6;">${n.description || 'No description available.'}</p>
                    <a href="${n.opensea_url}" target="_blank" class="os-btn">VIEW ON OPENSEA</a>
                    <button class="save-btn" id="saveImageBtn">SAVE IMAGE</button>
                </div>
            </div>`;

        const btn = document.getElementById('saveImageBtn');
        btn.onclick = async () => {
            const oldText = btn.innerText; btn.innerText = "SAVING...";
            await downloadImage(imgUrl, n.name);
            btn.innerText = "✓ SAVED!"; btn.classList.add('success');
            setTimeout(() => { btn.innerText = oldText; btn.classList.remove('success'); }, 2000);
        };

        const content = modal.querySelector('.modal-content');
        const img = document.getElementById('modalMainImg');
        if (isTwoStep) { content.classList.add('show-hint'); img.onclick = () => content.classList.toggle('show-details'); }
        else { content.classList.add('show-details'); }
    } catch (e) { modal.classList.add('hidden'); }
}

async function downloadImage(url, name) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl; link.download = `${name || 'art'}.png`;
        document.body.appendChild(link); link.click();
        document.body.removeChild(link);
    } catch (e) { window.open(url, '_blank'); }
}

// --- 4. CONTROLS ---
document.getElementById('goBtn').onclick = () => fetchArt(true);
document.getElementById('shuffleBtn').onclick = () => { displayList.sort(() => Math.random() - 0.5); renderAll(); gallery.scrollTo(0,0); };
sortSelect.onchange = () => renderAll();
document.querySelector('.close-btn').onclick = () => { modal.classList.add('hidden'); modal.querySelector('.modal-content').classList.remove('show-details', 'show-hint'); };
document.getElementById('navHome').onclick = () => { document.documentElement.setAttribute('data-view', 'snap'); document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active')); document.getElementById('navHome').classList.add('active'); renderAll(); };
document.getElementById('navGrid').onclick = () => { document.documentElement.setAttribute('data-view', 'grid'); document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active')); document.getElementById('navGrid').classList.add('active'); renderAll(); };

gallery.onscroll = () => {
    const cur = gallery.scrollTop;
    if (cur > lastScrollY && cur > 60) { header.classList.add('ui-hidden'); bottomNav.classList.add('ui-hidden'); }
    else if (cur < lastScrollY) { header.classList.remove('ui-hidden'); bottomNav.classList.remove('ui-hidden'); }
    lastScrollY = cur;
};

// --- 5. SANTA & SNOW ---
document.getElementById('santaBtn').onclick = () => { const t = document.getElementById('santaToast'); t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 3000); };
function initSnow() {
    const sc = document.createElement('div'); sc.id = 'snow-container'; document.body.appendChild(sc);
    setInterval(() => {
        const f = document.createElement('div'); f.className = 'snowflake'; f.innerHTML = '❄';
        f.style.left = Math.random() * 100 + 'vw'; f.style.animationDuration = (Math.random() * 3 + 2) + 's';
        sc.appendChild(f); setTimeout(() => f.remove(), 4000);
    }, 500);
}
