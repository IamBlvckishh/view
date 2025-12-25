lucide.createIcons();
const gallery = document.getElementById('gallery'), input = document.getElementById('walletInput');
const header = document.getElementById('mainHeader'), bottomNav = document.getElementById('bottomNav');
const modal = document.getElementById('detailModal'), sortSelect = document.getElementById('sortSelect');

let allNfts = [], displayList = [], currentWallet = "", isFetching = false, lastScrollY = 0;

// --- 1. CORE FUNCTIONALITY (SHUFFLE, SORT, THEME) ---
document.getElementById('themeToggle').onclick = () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const next = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    const icon = document.querySelector('#themeToggle i');
    icon.setAttribute('data-lucide', next === 'light' ? 'moon' : 'sun');
    lucide.createIcons();
};

document.getElementById('shuffleBtn').onclick = () => {
    displayList.sort(() => Math.random() - 0.5);
    renderAll();
    gallery.scrollTo(0,0);
};

sortSelect.onchange = () => {
    const val = sortSelect.value;
    if (val === 'project') {
        displayList.sort((a, b) => (a.collection || "").localeCompare(b.collection || ""));
    } else if (val === 'name') {
        displayList.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else {
        displayList = [...allNfts]; // Reset to original order
    }
    renderAll();
};

document.getElementById('santaBtn').onclick = () => {
    const toast = document.getElementById('santaToast');
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
};

// --- 2. DATA FETCHING ---
async function fetchArt(isNew = false) {
    currentWallet = input.value.trim();
    if (!currentWallet || isFetching) return;
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
    } catch (e) { console.error("Fetch failed", e); } finally { isFetching = false; }
}

// --- 3. RENDERING ENGINE ---
function renderAll() {
    gallery.innerHTML = "";
    const mode = document.documentElement.getAttribute('data-view');
    
    if (mode === 'snap') {
        const groups = {};
        displayList.forEach((n, i) => { 
            const k = n.collection || "Other"; 
            if(!groups[k]) groups[k] = []; 
            groups[k].push(n); 
        });
        Object.keys(groups).forEach(k => {
            const card = document.createElement('div'), slider = document.createElement('div');
            card.className = 'art-card'; slider.className = 'collection-slider';
            groups[k].forEach(n => {
                const s = document.createElement('div'); s.className = 'collection-slide';
                s.innerHTML = `<img src="${n.image_url || n.display_image_url}">`;
                s.onclick = () => showDetails(n.contract, n.identifier, false);
                slider.appendChild(s);
            });
            card.appendChild(slider); gallery.appendChild(card);
        });
    } else {
        const wrapper = document.createElement('div'); wrapper.className = 'grid-items-wrapper';
        displayList.forEach(n => {
            const c = document.createElement('div'); c.className = 'art-card';
            c.innerHTML = `<img src="${n.image_url || n.display_image_url}">`;
            c.onclick = () => showDetails(n.contract, n.identifier, true);
            wrapper.appendChild(c);
        });
        gallery.appendChild(wrapper);
    }
}

// --- 4. MODAL LOGIC ---
async function showDetails(c, id, isTwoStep) {
    modal.classList.remove('hidden');
    const m = document.getElementById('modalData');
    m.innerHTML = `<div class="modal-body"><div id="detailHint">TAP IMAGE FOR DETAILS</div><img src="" id="modalMainImg"><div class="modal-text-content"><h2 id="mName"></h2><p id="mDesc"></p></div></div>`;
    try {
        const res = await fetch(`/api/view?address=${c}&id=${id}`);
        const data = await res.json(), n = data.nft;
        const img = document.getElementById('modalMainImg');
        img.src = n.image_url || n.display_image_url;
        document.getElementById('mName').innerText = n.name || 'UNTITLED';
        document.getElementById('mDesc').innerText = n.description || '';
        const content = document.querySelector('.modal-content');
        if (isTwoStep) { 
            content.classList.add('show-hint'); 
            img.onclick = () => content.classList.toggle('show-details'); 
        } else { 
            content.classList.add('show-details'); 
        }
    } catch (e) { modal.classList.add('hidden'); }
}

// --- 5. UI CONTROLS ---
document.getElementById('goBtn').onclick = () => fetchArt(true);
document.querySelector('.close-btn').onclick = () => { 
    modal.classList.add('hidden'); 
    document.querySelector('.modal-content').classList.remove('show-details', 'show-hint'); 
};

document.getElementById('navHome').onclick = () => { 
    document.documentElement.setAttribute('data-view', 'snap'); 
    document.getElementById('navHome').classList.add('active'); 
    document.getElementById('navGrid').classList.remove('active'); 
    renderAll(); 
};

document.getElementById('navGrid').onclick = () => { 
    document.documentElement.setAttribute('data-view', 'grid'); 
    document.getElementById('navGrid').classList.add('active'); 
    document.getElementById('navHome').classList.remove('active'); 
    renderAll(); 
};

gallery.onscroll = () => {
    const cur = gallery.scrollTop;
    if (cur > lastScrollY && cur > 60) {
        header.classList.add('ui-hidden');
        bottomNav.classList.add('ui-hidden');
    } else if (cur < lastScrollY) {
        header.classList.remove('ui-hidden');
        bottomNav.classList.remove('ui-hidden');
    }
    lastScrollY = cur;
    document.getElementById('backToTop').classList.toggle('show', cur > 500);
};

// --- 6. SNOW EFFECT (SELF-CONTAINED) ---
(function initSnow(){
    const sc = document.createElement('div'); sc.id = 'snow-container'; document.body.appendChild(sc);
    setInterval(() => {
        const f = document.createElement('div'); f.className = 'snowflake'; f.innerHTML = '❄';
        f.style.left = Math.random() * 100 + 'vw'; f.style.fontSize = (Math.random() * 10 + 10) + 'px';
        f.style.animationDuration = (Math.random() * 3 + 3) + 's'; f.style.opacity = Math.random();
        sc.appendChild(f); setTimeout(() => f.remove(), 5000);
    }, 450);
})();
