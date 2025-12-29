lucide.createIcons();
const gallery = document.getElementById('gallery'), input = document.getElementById('walletInput');
const header = document.getElementById('mainHeader'), bottomNav = document.getElementById('bottomNav');
const modal = document.getElementById('detailModal'), chainSelect = document.getElementById('chainSelect');

let allNfts = [], displayList = [], continuation = null, isFetching = false, lastScrollY = 0;

window.addEventListener('load', () => {
    const saved = localStorage.getItem('savedWallet');
    if (saved) { input.value = saved; fetchArt(true); }
    initSnow();
});

function initSnow() {
    const sc = document.createElement('div'); sc.id = 'snow-container'; document.body.appendChild(sc);
    setInterval(() => {
        const f = document.createElement('div'); f.className = 'snowflake'; f.innerHTML = '❄';
        f.style.left = Math.random() * 100 + 'vw'; 
        f.style.animationDuration = (Math.random() * 3 + 2) + 's';
        f.style.opacity = Math.random();
        sc.appendChild(f); setTimeout(() => f.remove(), 4000);
    }, 450);
}

async function fetchArt(isNew = false) {
    let wallet = input.value.trim();
    if (!wallet || isFetching) return;
    isFetching = true;
    if (isNew) { allNfts = []; gallery.innerHTML = ""; continuation = null; }

    const chain = chainSelect.value;
    const chainsToFetch = chain === 'all' ? ['ethereum', 'base', 'shape'] : [chain];

    try {
        const requests = chainsToFetch.map(c => 
            fetch(`/api/view?wallet=${wallet}&chain=${c}${continuation ? `&next=${continuation}` : ''}`)
            .then(r => r.json())
        );

        const results = await Promise.all(requests);
        results.forEach((data, i) => {
            if (data.nfts) {
                const tagged = data.nfts.map(n => ({ ...n, chain: chainsToFetch[i] }));
                allNfts = [...allNfts, ...tagged];
            }
            if (data.next) continuation = data.next;
        });

        displayList = [...allNfts];
        document.getElementById('dynamicControls').classList.remove('hidden');
        bottomNav.classList.remove('hidden');
        renderAll();
    } catch (e) { console.error(e); } finally { isFetching = false; }
}

function renderAll() {
    gallery.innerHTML = '';
    const mode = document.documentElement.getAttribute('data-view');
    
    if (mode === 'snap') {
        displayList.forEach(n => {
            const card = document.createElement('div'); card.className = 'art-card';
            card.innerHTML = `<img src="${n.image_url || n.display_image_url}">`;
            card.onclick = () => showDetails(n.contract, n.identifier, n.chain);
            gallery.appendChild(card);
        });
    } else {
        const grid = document.createElement('div'); grid.className = 'grid-items-wrapper';
        displayList.forEach(n => {
            const item = document.createElement('div'); item.className = 'art-card';
            item.innerHTML = `<img src="${n.image_url || n.display_image_url}">`;
            item.onclick = () => showDetails(n.contract, n.identifier, n.chain);
            grid.appendChild(item);
        });
        gallery.appendChild(grid);
    }
}

async function showDetails(contract, id, chain) {
    modal.classList.remove('hidden');
    const m = document.getElementById('modalData');
    m.innerHTML = `<div class="spinner"></div>`;
    const res = await fetch(`/api/view?address=${contract}&id=${id}&chain=${chain}`);
    const data = await res.json();
    const n = data.nft;
    m.innerHTML = `
        <div class="modal-body show-details">
            <img src="${n.image_url || n.display_image_url}">
            <div class="modal-text-content">
                <h2>${n.name || 'UNTITLED'}</h2>
                <p>${n.collection}</p>
                <a href="${n.opensea_url}" target="_blank" class="os-btn">OPENSEA</a>
            </div>
        </div>`;
}

document.getElementById('goBtn').onclick = () => fetchArt(true);
document.getElementById('navHome').onclick = () => { document.documentElement.setAttribute('data-view', 'snap'); renderAll(); };
document.getElementById('navGrid').onclick = () => { document.documentElement.setAttribute('data-view', 'grid'); renderAll(); };
document.querySelector('.close-btn').onclick = () => modal.classList.add('hidden');
