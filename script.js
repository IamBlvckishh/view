lucide.createIcons();
const gallery = document.getElementById('gallery'), input = document.getElementById('walletInput');
const header = document.getElementById('mainHeader'), bottomNav = document.getElementById('bottomNav');
const modal = document.getElementById('detailModal'), sortSelect = document.getElementById('sortSelect');

let allNfts = [], displayList = [], currentWallet = "", isFetching = false, lastScrollY = 0;
let touchStartX = 0, touchStartY = 0, snapPositions = {};

// 1. HOLIDAY LOGIC
const initChristmas = () => {
    const today = new Date();
    const isXmas = today.getMonth() === 11 && today.getDate() === 25;
    if (isXmas) {
        const h1 = document.querySelector('.logo-row h1');
        h1.innerText = "MERRY XMAS";
        h1.style.color = "#ff4d4d";
    }
    const container = document.createElement('div');
    container.id = 'snow-container';
    document.body.appendChild(container);

    const createFlake = (x = null) => {
        const f = document.createElement('div');
        f.className = 'snowflake'; f.innerHTML = '❄';
        const duration = Math.random() * 3 + 3;
        f.style.left = (x || Math.random() * window.innerWidth) + 'px';
        f.style.fontSize = (Math.random() * 10 + 10) + 'px';
        f.style.opacity = Math.random();
        f.style.animationDuration = duration + 's';
        container.appendChild(f);
        setTimeout(() => f.remove(), duration * 1000);
    };
    setInterval(createFlake, 400);
    gallery.addEventListener('touchstart', (e) => {
        for(let i=0; i<3; i++) createFlake(e.touches[0].clientX + (Math.random() * 30 - 15));
    }, {passive:true});
};

// 2. CORE APP LOGIC
window.addEventListener('load', () => {
    initChristmas();
    if (localStorage.getItem('savedWallet')) { input.value = localStorage.getItem('savedWallet'); fetchArt(true); }
});

const setUIHidden = (hidden) => {
    header.classList.toggle('ui-hidden', hidden);
    bottomNav.classList.toggle('ui-hidden', hidden);
    document.querySelectorAll('.grid-header').forEach(h => h.classList.toggle('ui-hidden', hidden));
};

gallery.onscroll = () => {
    const cur = gallery.scrollTop;
    if (cur > lastScrollY && cur > 60) setUIHidden(true);
    else if (cur < lastScrollY) setUIHidden(false);
    lastScrollY = cur;
};

gallery.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; touchStartY = e.touches[0].clientY; }, {passive:true});
gallery.addEventListener('touchmove', e => {
    const dx = Math.abs(e.touches[0].clientX - touchStartX), dy = Math.abs(e.touches[0].clientY - touchStartY);
    if (dx > 10 && dx > dy) setUIHidden(true);
}, {passive:true});

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
            displayList = isNew ? [...allNfts].sort(() => Math.random() - 0.5) : allNfts;
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
        displayList.forEach((n, i) => { const k = n.collection || i; if(!groups[k]) groups[k] = []; groups[k].push(n); });
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
        const wrapper = document.createElement('div');
        wrapper.className = 'grid-items-wrapper';
        displayList.forEach(n => {
            const c = document.createElement('div'); c.className = 'art-card';
            c.innerHTML = `<img src="${n.image_url || n.display_image_url}">`;
            c.onclick = () => showDetails(n.contract, n.identifier, true);
            wrapper.appendChild(c);
        });
        gallery.appendChild(wrapper);
    }
}

async function showDetails(c, id, isTwoStep) {
    modal.classList.remove('hidden');
    const m = document.getElementById('modalData');
    m.innerHTML = `<div class="modal-body">
        <div id="detailHint">TAP IMAGE FOR DETAILS</div>
        <img src="" id="modalMainImg">
        <div class="modal-text-content">
            <h2 id="mName"></h2><p id="mDesc"></p>
        </div>
    </div>`;
    try {
        const res = await fetch(`/api/view?address=${c}&id=${id}`);
        const data = await res.json(), n = data.nft;
        document.getElementById('modalMainImg').src = n.image_url || n.display_image_url;
        document.getElementById('mName').innerText = n.name || 'UNTITLED';
        document.getElementById('mDesc').innerText = n.description || '';
        const content = document.querySelector('.modal-content');
        if (isTwoStep) { content.classList.add('show-hint'); document.getElementById('modalMainImg').onclick = () => content.classList.toggle('show-details'); }
        else { content.classList.add('show-details'); }
    } catch (e) { modal.classList.add('hidden'); }
}

document.querySelector('.close-btn').onclick = () => { modal.classList.add('hidden'); document.querySelector('.modal-content').classList.remove('show-details', 'show-hint'); };
document.getElementById('navHome').onclick = () => { document.documentElement.setAttribute('data-view', 'snap'); renderAll(); };
document.getElementById('navGrid').onclick = () => { document.documentElement.setAttribute('data-view', 'grid'); renderAll(); };
document.getElementById('goBtn').onclick = () => fetchArt(true);
