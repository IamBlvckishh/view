lucide.createIcons();
const gallery = document.getElementById('gallery'), input = document.getElementById('walletInput');
const header = document.getElementById('mainHeader'), bottomNav = document.getElementById('bottomNav');
const modal = document.getElementById('detailModal'), sortSelect = document.getElementById('sortSelect');
let allNfts = [], continuation = null, currentWallet = "", isFetching = false, lastScrollY = 0;

// PULL REFRESH
let touchstartY = 0;
gallery.addEventListener('touchstart', e => { touchstartY = e.touches[0].pageY; }, { passive: true });
gallery.addEventListener('touchmove', e => {
    const pullDist = e.touches[0].pageY - touchstartY;
    if (gallery.scrollTop <= 0 && pullDist > 80) document.body.classList.add('pulling');
}, { passive: true });
gallery.addEventListener('touchend', () => {
    if (document.body.classList.contains('pulling')) {
        document.body.classList.remove('pulling');
        if (allNfts.length > 0) renderAll();
    }
}, { passive: true });

// SCROLL UI
gallery.onscroll = () => {
    const cur = gallery.scrollTop;
    if (cur > lastScrollY && cur > 100) { header.classList.add('ui-hidden'); bottomNav.classList.add('ui-hidden'); }
    else { header.classList.remove('ui-hidden'); bottomNav.classList.remove('ui-hidden'); }
    lastScrollY = cur;
    if (gallery.scrollTop + gallery.clientHeight >= gallery.scrollHeight - 1000 && continuation && !isFetching) fetchArt();
};

// SWIPE
let tstartX = 0;
window.addEventListener('touchstart', e => tstartX = e.changedTouches[0].screenX);
window.addEventListener('touchend', e => {
    let tendX = e.changedTouches[0].screenX;
    if (tendX < tstartX - 100) switchView('grid');
    if (tendX > tstartX + 100) switchView('snap');
});

function switchView(mode) {
    if (document.documentElement.getAttribute('data-view') === mode) return;
    gallery.classList.add('view-switching');
    setTimeout(() => {
        document.documentElement.setAttribute('data-view', mode);
        document.getElementById('navHome').classList.toggle('active', mode === 'snap');
        document.getElementById('navGrid').classList.toggle('active', mode === 'grid');
        renderAll();
        gallery.classList.remove('view-switching');
    }, 300);
}

document.getElementById('navHome').onclick = () => switchView('snap');
document.getElementById('navGrid').onclick = () => switchView('grid');
sortSelect.onchange = () => renderAll();

document.getElementById('themeToggle').onclick = () => {
    const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    document.getElementById('themeToggle').innerHTML = `<i data-lucide="${theme === 'dark' ? 'sun' : 'moon'}"></i>`;
    lucide.createIcons();
};

async function fetchArt(isNew = false) {
    currentWallet = input.value.trim();
    if (!currentWallet || isFetching) return;
    isFetching = true;
    if (isNew) { allNfts = []; continuation = null; }
    try {
        const res = await fetch(`/api/view?wallet=${currentWallet}${continuation ? `&next=${continuation}` : ''}`);
        const data = await res.json();
        if (data.nfts) {
            allNfts = [...allNfts, ...data.nfts];
            continuation = data.next;
            document.getElementById('viewControls').classList.remove('hidden');
            bottomNav.classList.remove('hidden');
            renderAll();
        }
    } catch (e) { } finally { isFetching = false; }
}

function renderAll() {
    gallery.innerHTML = "";
    const mode = document.documentElement.getAttribute('data-view');
    let list = (mode === 'snap') ? [...allNfts].sort(() => Math.random() - 0.5) : [...allNfts];
    if (mode === 'grid' && sortSelect.value !== 'none') {
        if (sortSelect.value === 'project') list.sort((a,b) => (a.collection || "").localeCompare(b.collection || ""));
        else list.sort((a,b) => (a.name || "").localeCompare(b.name || ""));
    }
    list.forEach(nft => {
        const img = nft.image_url || nft.display_image_url;
        if (!img) return;
        const card = document.createElement('div');
        card.className = 'art-card';
        card.innerHTML = `<div class="img-frame"><img src="${img}" loading="lazy"></div>
            ${mode === 'snap' ? `<button class="share-action" onclick="event.stopPropagation(); share('${nft.opensea_url}')"><i data-lucide="share-2"></i></button>` : ''}`;
        card.onclick = () => showDetails(nft.contract, nft.identifier);
        gallery.appendChild(card);
    });
    lucide.createIcons();
}

async function showDetails(contract, id) {
    modal.classList.remove('hidden');
    const mData = document.getElementById('modalData'), sBtn = document.getElementById('modalShareBtn');
    const iFrameCont = document.getElementById('iframeContainer'), osFrame = document.getElementById('osFrame');
    const backBtn = document.getElementById('backToDetails'), loadBar = document.getElementById('loadBar');
    
    mData.classList.remove('hidden'); iFrameCont.classList.add('hidden'); backBtn.classList.add('hidden');
    mData.innerHTML = `<p style="text-align:center;">LOADING...</p>`;

    try {
        const res = await fetch(`/api/view?address=${contract}&id=${id}`);
        const data = await res.json(), nft = data.nft;
        sBtn.onclick = () => share(nft.opensea_url);
        mData.innerHTML = `<h2 style="font-size:24px; font-weight:900;">${nft.name || 'UNTITLED'}</h2>
            <p style="opacity:0.5; font-size:10px; margin-bottom:15px;">${nft.collection.toUpperCase()}</p>
            <p style="font-size:14px; opacity:0.8; line-height:1.5;">${nft.description || 'No description.'}</p>
            <button id="openInternal" style="display:block; width:100%; padding:18px; background:var(--text); color:var(--bg); text-align:center; border-radius:12px; border:none; font-weight:900; margin-top:25px;">VIEW ON OPENSEA</button>`;
        
        document.getElementById('openInternal').onclick = () => {
            loadBar.style.width = "30%";
            osFrame.src = nft.opensea_url;
            mData.classList.add('hidden');
            iFrameCont.classList.remove('hidden');
            backBtn.classList.remove('hidden');
            
            osFrame.onload = () => { loadBar.style.width = "100%"; setTimeout(() => loadBar.style.width = "0%", 500); };
        };

        backBtn.onclick = () => { mData.classList.remove('hidden'); iFrameCont.classList.add('hidden'); backBtn.classList.add('hidden'); osFrame.src = ""; };
    } catch (e) { }
    lucide.createIcons();
}

window.share = (url) => {
    if (navigator.share) navigator.share({ title: 'VIEW', url: url });
    else { navigator.clipboard.writeText(url); alert("Link Copied!"); }
};

document.getElementById('goBtn').onclick = () => fetchArt(true);
input.onkeydown = (e) => { if (e.key === 'Enter') fetchArt(true); };
document.querySelector('.close-btn').onclick = () => { modal.classList.add('hidden'); document.getElementById('osFrame').src = ""; };
