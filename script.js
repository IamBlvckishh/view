lucide.createIcons();

const gallery = document.getElementById('gallery');
const input = document.getElementById('walletInput');
const btn = document.getElementById('goBtn');
const themeBtn = document.getElementById('themeToggle');
const viewBtn = document.getElementById('viewToggle');
const topBtn = document.getElementById('backToTop');
const modal = document.getElementById('detailModal');
const modalData = document.getElementById('modalData');

let continuation = null;
let currentWallet = "";
let isFetching = false;
let favorites = JSON.parse(localStorage.getItem('view_favs')) || [];

// ENS RESOLVER
async function resolveENS(name) {
    const clean = name.trim().toLowerCase();
    if (clean.startsWith('0x') && clean.length === 42) return clean;
    if (clean.endsWith('.eth')) {
        try {
            const res = await fetch(`https://api.ensoul.xyz/resolve/${clean}`);
            const data = await res.json();
            return data.address || null;
        } catch (e) { return null; }
    }
    return null;
}

async function fetchArt(isNew = false) {
    if (!currentWallet || isFetching) return;
    isFetching = true;
    if (isNew) { gallery.innerHTML = ""; continuation = null; gallery.scrollTop = 0; }

    try {
        let url = `/api/view?wallet=${currentWallet}`;
        if (continuation) url += `&next=${continuation}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.nfts) {
            data.nfts.forEach(nft => renderCard(nft));
            continuation = data.next;
        }
    } catch (e) { console.error(e); }
    finally { isFetching = false; }
}

function renderCard(nft) {
    const img = nft.image_url || nft.display_image_url;
    if (!img) return;

    const card = document.createElement('div');
    card.className = 'art-card';
    card.innerHTML = `
        <div class="img-frame"><img src="${img}" loading="lazy"></div>
        <div class="action-bar">
            <button class="action-btn like-trigger" onclick="event.stopPropagation(); toggleLike(this)">
                <i data-lucide="heart"></i>
            </button>
            <button class="action-btn" onclick="event.stopPropagation(); toggleFav('${nft.identifier}')">
                <i data-lucide="bookmark"></i>
            </button>
            <button class="action-btn" onclick="event.stopPropagation(); shareNFT('${nft.opensea_url}')">
                <i data-lucide="share-2"></i>
            </button>
        </div>
    `;
    card.onclick = () => showDetails(nft.contract, nft.identifier);
    gallery.appendChild(card);
    lucide.createIcons();
}

// SOCIAL ACTIONS
window.toggleLike = (btn) => {
    btn.classList.toggle('liked');
    const icon = btn.querySelector('i');
    if (btn.classList.contains('liked')) {
        icon.setAttribute('data-lucide', 'heart');
        icon.style.fill = "#ff3b3b";
    } else {
        icon.style.fill = "none";
    }
    lucide.createIcons();
};

window.toggleFav = (id) => {
    if (favorites.includes(id)) {
        favorites = favorites.filter(f => f !== id);
        alert("Removed from favorites");
    } else {
        favorites.push(id);
        alert("Saved to favorites!");
    }
    localStorage.setItem('view_favs', JSON.stringify(favorites));
};

window.shareNFT = (url) => {
    if (navigator.share) {
        navigator.share({ title: 'Check this on VIEW', url: url });
    } else {
        navigator.clipboard.writeText(url);
        alert("Link copied to clipboard!");
    }
};

async function showDetails(contract, id) {
    modal.classList.remove('hidden');
    modalData.innerHTML = `<p style="text-align:center; padding:50px;">LOADING DATA...</p>`;
    try {
        const res = await fetch(`/api/view?address=${contract}&id=${id}`);
        const data = await res.json();
        const nft = data.nft;
        const eth = (Math.random() * 0.12).toFixed(3); // Mock live price

        modalData.innerHTML = `
            <span style="font-size:10px; font-weight:800; opacity:0.5;">${nft.collection.toUpperCase()}</span>
            <h2 style="font-size:28px; font-weight:900; margin:10px 0;">${nft.name || 'UNTITLED'}</h2>
            <div style="margin:20px 0;">
                <span style="font-size:36px; font-weight:900;">${eth} ETH</span>
                <p style="color:#888;">Approx. $${(eth * 2450).toLocaleString()}</p>
            </div>
            <p style="line-height:1.6; opacity:0.8; font-size:14px;">${nft.description || 'No description provided.'}</p>
            <a href="${nft.opensea_url}" target="_blank" style="display:block; width:100%; padding:20px; background:var(--text); color:var(--bg); text-align:center; border-radius:15px; text-decoration:none; font-weight:900; margin-top:30px;">BUY ON OPENSEA</a>
        `;
    } catch (e) { modalData.innerHTML = "<p>ERROR</p>"; }
}

// UI HANDLERS
viewBtn.onclick = () => {
    const isSnap = document.documentElement.getAttribute('data-view') === 'snap';
    document.documentElement.setAttribute('data-view', isSnap ? 'grid' : 'snap');
    viewBtn.innerHTML = `<i data-lucide="${isSnap ? 'layout-grid' : 'smartphone'}"></i>`;
    lucide.createIcons();
};

themeBtn.onclick = () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
    themeBtn.innerHTML = `<i data-lucide="${isDark ? 'moon' : 'sun'}"></i>`;
    lucide.createIcons();
};

topBtn.onclick = () => gallery.scrollTo({ top: 0, behavior: 'smooth' });

gallery.onscroll = () => {
    // Show/Hide Back to Top
    if (gallery.scrollTop > 1000) topBtn.classList.remove('hidden');
    else topBtn.classList.add('hidden');

    // Infinite Scroll
    if (gallery.scrollTop + gallery.clientHeight >= gallery.scrollHeight - 600) {
        if (continuation && !isFetching) fetchArt();
    }
};

async function startSearch() {
    const raw = input.value.trim();
    if (!raw) return;
    currentWallet = await resolveENS(raw);
    if (!currentWallet) { alert("Invalid Address"); return; }
    fetchArt(true);
}

btn.onclick = startSearch;
input.onkeydown = (e) => { if (e.key === 'Enter') startSearch(); };
document.querySelector('.close-btn').onclick = () => modal.classList.add('hidden');
document.querySelector('.modal-overlay').onclick = () => modal.classList.add('hidden');
