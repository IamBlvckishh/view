lucide.createIcons();

const gallery = document.getElementById('gallery');
const input = document.getElementById('walletInput');
const btn = document.getElementById('goBtn');
const viewControls = document.getElementById('viewControls');
const sortSelect = document.getElementById('sortSelect');
const modal = document.getElementById('detailModal');
const modalData = document.getElementById('modalData');

let allNfts = [];
let continuation = null;
let currentWallet = "";
let isFetching = false;

// VIEW & THEME TOGGLES
document.getElementById('viewToggle').onclick = () => {
    const current = document.documentElement.getAttribute('data-view');
    document.documentElement.setAttribute('data-view', current === 'snap' ? 'grid' : 'snap');
    renderAll();
};

document.getElementById('themeToggle').onclick = () => {
    const current = document.documentElement.getAttribute('data-theme');
    document.documentElement.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark');
};

// SORTING LOGIC
sortSelect.onchange = () => renderAll();

async function fetchArt(isNew = false) {
    if (!currentWallet || isFetching) return;
    isFetching = true;
    if (isNew) { allNfts = []; continuation = null; }

    try {
        let url = `/api/view?wallet=${currentWallet}`;
        if (continuation) url += `&next=${continuation}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.nfts) {
            allNfts = [...allNfts, ...data.nfts];
            continuation = data.next;
            viewControls.classList.remove('hidden');
            renderAll();
        }
    } catch (e) { alert("Address Error"); }
    finally { isFetching = false; }
}

function renderAll() {
    gallery.innerHTML = "";
    const viewMode = document.documentElement.getAttribute('data-view');
    let displayList = [...allNfts];

    // Randomize for Snap Mode
    if (viewMode === 'snap') {
        displayList = displayList.sort(() => Math.random() - 0.5);
    } 
    
    // Sort for Grid Mode
    if (viewMode === 'grid') {
        const sortBy = sortSelect.value;
        if (sortBy === 'project') displayList.sort((a, b) => a.collection.localeCompare(b.collection));
        if (sortBy === 'name') displayList.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }

    displayList.forEach(nft => {
        const img = nft.image_url || nft.display_image_url;
        if (!img) return;

        const card = document.createElement('div');
        card.className = 'art-card';
        card.innerHTML = `
            <div class="img-frame"><img src="${img}" loading="lazy"></div>
            ${viewMode === 'snap' ? `
            <div class="action-bar">
                <button class="action-btn" onclick="event.stopPropagation(); share('${nft.opensea_url}')"><i data-lucide="share-2"></i></button>
            </div>` : ''}
        `;
        card.onclick = () => showDetails(nft.contract, nft.identifier);
        gallery.appendChild(card);
    });
    lucide.createIcons();
}

async function showDetails(contract, id) {
    modal.classList.remove('hidden');
    modalData.innerHTML = `<p style="text-align:center; padding:50px;">LOADING...</p>`;
    try {
        const res = await fetch(`/api/view?address=${contract}&id=${id}`);
        const data = await res.json();
        const nft = data.nft;
        const eth = (Math.random() * 0.1).toFixed(3);

        modalData.innerHTML = `
            <h2 style="font-size:24px; font-weight:900;">${nft.name || 'UNTITLED'}</h2>
            <p style="opacity:0.5; font-size:10px; margin-bottom:20px;">${nft.collection.toUpperCase()}</p>
            <div style="margin-bottom:20px;">
                <span style="font-size:32px; font-weight:900;">${eth} ETH</span>
            </div>
            <p style="font-size:14px; opacity:0.8; line-height:1.5;">${nft.description || 'Shape Original.'}</p>
            <a href="${nft.opensea_url}" target="_blank" style="display:block; width:100%; padding:18px; background:var(--text); color:var(--bg); text-align:center; border-radius:12px; text-decoration:none; font-weight:900; margin-top:25px;">BUY ON OPENSEA</a>
        `;
    } catch (e) { modalData.innerHTML = "<p>ERROR</p>"; }
}

window.share = (url) => { navigator.clipboard.writeText(url); alert("Link Copied!"); };

btn.onclick = () => { currentWallet = input.value.trim(); fetchArt(true); };
input.onkeydown = (e) => { if (e.key === 'Enter') { currentWallet = input.value.trim(); fetchArt(true); } };
document.querySelector('.close-btn').onclick = () => modal.classList.add('hidden');
document.querySelector('.modal-overlay').onclick = () => modal.classList.add('hidden');

gallery.onscroll = () => {
    if (gallery.scrollTop + gallery.clientHeight >= gallery.scrollHeight - 800) {
        if (continuation && !isFetching) fetchArt();
    }
};
