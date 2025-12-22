lucide.createIcons();

const gallery = document.getElementById('gallery');
const input = document.getElementById('walletInput');
const btn = document.getElementById('goBtn');
const bottomNav = document.getElementById('bottomNav');
const sortSelect = document.getElementById('sortSelect');
const modal = document.getElementById('detailModal');

let allNfts = [];
let continuation = null;
let currentWallet = "";
let isFetching = false;

// SWIPE DETECTION
let touchstartX = 0;
let touchendX = 0;

function handleGesture() {
    if (touchendX < touchstartX - 100) switchView('grid'); // Swipe Left
    if (touchendX > touchstartX + 100) switchView('snap'); // Swipe Right
}

window.addEventListener('touchstart', e => touchstartX = e.changedTouches[0].screenX);
window.addEventListener('touchend', e => {
    touchendX = e.changedTouches[0].screenX;
    handleGesture();
});

function switchView(mode) {
    document.documentElement.setAttribute('data-view', mode);
    document.getElementById('navHome').classList.toggle('active', mode === 'snap');
    document.getElementById('navGrid').classList.toggle('active', mode === 'grid');
    renderAll();
}

// NAV CLICKS
document.getElementById('navHome').onclick = () => switchView('snap');
document.getElementById('navGrid').onclick = () => switchView('grid');

document.getElementById('themeToggle').onclick = () => {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    document.getElementById('themeToggle').innerHTML = `<i data-lucide="${newTheme === 'dark' ? 'sun' : 'moon'}"></i><span>THEME</span>`;
    lucide.createIcons();
};

sortSelect.onchange = () => renderAll();

async function fetchArt(isNew = false) {
    if (!input.value.trim() || isFetching) return;
    currentWallet = input.value.trim();
    isFetching = true;
    if (isNew) { allNfts = []; continuation = null; }

    try {
        let url = `/api/view?wallet=${currentWallet}${continuation ? `&next=${continuation}` : ''}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.nfts) {
            allNfts = [...allNfts, ...data.nfts];
            continuation = data.next;
            document.getElementById('viewControls').classList.remove('hidden');
            bottomNav.classList.remove('hidden');
            renderAll();
        }
    } catch (e) { console.error(e); } finally { isFetching = false; }
}

function renderAll() {
    gallery.innerHTML = "";
    const viewMode = document.documentElement.getAttribute('data-view');
    let list = [...allNfts];

    if (viewMode === 'snap') list = list.sort(() => Math.random() - 0.5);
    if (viewMode === 'grid') {
        if (sortSelect.value === 'project') list.sort((a, b) => (a.collection || "").localeCompare(b.collection || ""));
        if (sortSelect.value === 'name') list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }

    list.forEach(nft => {
        const img = nft.image_url || nft.display_image_url;
        if (!img) return;
        const card = document.createElement('div');
        card.className = 'art-card';
        card.innerHTML = `
            <div class="img-frame"><img src="${img}" loading="lazy"></div>
            <button class="share-action" onclick="event.stopPropagation(); share('${nft.opensea_url}')"><i data-lucide="share-2"></i></button>
        `;
        card.onclick = () => showDetails(nft.contract, nft.identifier);
        gallery.appendChild(card);
    });
    lucide.createIcons();
}

async function showDetails(contract, id) {
    modal.classList.remove('hidden');
    document.getElementById('modalData').innerHTML = `<p style="text-align:center; padding:50px;">LOADING...</p>`;
    try {
        const res = await fetch(`/api/view?address=${contract}&id=${id}`);
        const data = await res.json();
        const nft = data.nft;
        document.getElementById('modalData').innerHTML = `
            <h2 style="font-size:24px; font-weight:900;">${nft.name || 'UNTITLED'}</h2>
            <p style="opacity:0.5; font-size:10px; margin-bottom:20px;">${nft.collection.toUpperCase()}</p>
            <p style="font-size:14px; opacity:0.8;">${nft.description || 'Shape Original.'}</p>
            <a href="${nft.opensea_url}" target="_blank" style="display:block; width:100%; padding:18px; background:var(--text); color:var(--bg); text-align:center; border-radius:12px; text-decoration:none; font-weight:900; margin-top:25px;">VIEW ON OPENSEA</a>
        `;
    } catch (e) { }
}

window.share = (url) => { navigator.clipboard.writeText(url); alert("Link Copied!"); };
btn.onclick = () => fetchArt(true);
input.onkeydown = (e) => { if (e.key === 'Enter') fetchArt(true); };
document.querySelector('.close-btn').onclick = () => modal.classList.add('hidden');
