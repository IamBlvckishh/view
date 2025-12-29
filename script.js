lucide.createIcons();
const gallery = document.getElementById('gallery'), input = document.getElementById('walletInput');
const header = document.getElementById('mainHeader'), bottomNav = document.getElementById('bottomNav');
const modal = document.getElementById('detailModal'), chainSelect = document.getElementById('chainSelect');

let allNfts = [], displayList = [], continuation = null, isFetching = false;

window.addEventListener('load', () => {
    const savedWallet = localStorage.getItem('savedWallet');
    if (savedWallet) { input.value = savedWallet; fetchArt(true); }
    initSnow(); // Snow mechanism restored
});

// SNOW MECHANISM
function initSnow() {
    const sc = document.createElement('div'); sc.id = 'snow-container'; document.body.appendChild(sc);
    setInterval(() => {
        const f = document.createElement('div'); f.className = 'snowflake'; f.innerHTML = '❄';
        f.style.left = Math.random() * 100 + 'vw'; 
        f.style.animationDuration = (Math.random() * 3 + 2) + 's';
        sc.appendChild(f); setTimeout(() => f.remove(), 4000);
    }, 500);
}

// MULTI-CHAIN FETCH
async function fetchArt(isNew = false) {
    let wallet = input.value.trim();
    if (!wallet || isFetching) return;
    isFetching = true;
    localStorage.setItem('savedWallet', wallet);
    
    if (isNew) { allNfts = []; gallery.innerHTML = ""; continuation = null; }

    const chain = chainSelect.value; // Respects the selector

    try {
        const res = await fetch(`/api/view?wallet=${wallet}&chain=${chain}${continuation ? `&next=${continuation}` : ''}`);
        const data = await res.json();
        
        if (data.nfts) {
            const tagged = data.nfts.map(n => ({ ...n, chain: chain }));
            allNfts = [...allNfts, ...tagged];
            displayList = [...allNfts];
            if (data.next) continuation = data.next;
            
            document.getElementById('dynamicControls').classList.remove('hidden');
            bottomNav.classList.remove('hidden');
            renderAll();
        }
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

async function showDetails(c, id, chain) {
    modal.classList.remove('hidden');
    const m = document.getElementById('modalData');
    m.innerHTML = `<div class="spinner"></div>`;
    try {
        const res = await fetch(`/api/view?address=${c}&id=${id}&chain=${chain}`);
        const data = await res.json();
        const n = data.nft;
        m.innerHTML = `
            <div class="modal-body show-details">
                <img src="${n.image_url || n.display_image_url}">
                <div class="modal-text-content">
                    <h2>${n.name || 'UNTITLED'}</h2>
                    <p>${n.collection || ''}</p>
                    <a href="${n.opensea_url}" target="_blank" class="os-btn">VIEW ON OPENSEA</a>
                </div>
            </div>`;
    } catch (e) { modal.classList.add('hidden'); }
}

document.getElementById('goBtn').onclick = () => fetchArt(true);
chainSelect.onchange = () => fetchArt(true);
document.getElementById('navHome').onclick = () => { document.documentElement.setAttribute('data-view', 'snap'); renderAll(); };
document.getElementById('navGrid').onclick = () => { document.documentElement.setAttribute('data-view', 'grid'); renderAll(); };
document.querySelector('.close-btn').onclick = () => modal.classList.add('hidden');
