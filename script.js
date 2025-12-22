lucide.createIcons();
const gallery = document.getElementById('gallery'), input = document.getElementById('walletInput');
const header = document.getElementById('mainHeader'), bottomNav = document.getElementById('bottomNav');
const modal = document.getElementById('detailModal'), sortSelect = document.getElementById('sortSelect');
const dynamicControls = document.getElementById('dynamicControls');
let allNfts = [], continuation = null, currentWallet = "", isFetching = false, lastScrollY = 0;
let tStartX = 0, tStartY = 0;

document.getElementById('themeToggle').onclick = () => {
    const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    document.getElementById('themeToggle').innerHTML = `<i data-lucide="${theme === 'dark' ? 'sun' : 'moon'}"></i>`;
    lucide.createIcons();
};

document.getElementById('shuffleBtn').onclick = () => {
    if (allNfts.length > 0) renderAll();
    gallery.scrollTo({ top: 0, behavior: 'smooth' });
};

// IMPROVED SWIPE LOGIC
gallery.addEventListener('touchstart', e => { 
    tStartX = e.changedTouches[0].screenX; 
    tStartY = e.changedTouches[0].screenY;
}, {passive: true});

gallery.addEventListener('touchend', e => {
    const tEndX = e.changedTouches[0].screenX;
    const tEndY = e.changedTouches[0].screenY;
    const xDiff = tEndX - tStartX;
    const yDiff = Math.abs(tEndY - tStartY);
    const mode = document.documentElement.getAttribute('data-view');

    // Universal Grid -> Home (Swipe Right anywhere)
    if (mode === 'grid' && xDiff > 100 && xDiff > yDiff) {
        switchView('snap');
    }
}, {passive: true});

gallery.onscroll = () => {
    const cur = gallery.scrollTop;
    if (cur > lastScrollY && cur > 100) { header.classList.add('ui-hidden'); bottomNav.classList.add('ui-hidden'); }
    else { header.classList.remove('ui-hidden'); bottomNav.classList.remove('ui-hidden'); }
    lastScrollY = cur;
    if (gallery.scrollTop + gallery.clientHeight >= gallery.scrollHeight - 1000 && continuation && !isFetching) fetchArt();
};

async function fetchArt(isNew = false) {
    currentWallet = input.value.trim();
    if (!currentWallet || isFetching) return;
    isFetching = true;
    if (isNew) { allNfts = []; continuation = null; gallery.innerHTML = ""; }
    try {
        const res = await fetch(`/api/view?wallet=${currentWallet}${continuation ? `&next=${continuation}` : ''}`);
        const data = await res.json();
        if (data.nfts) {
            allNfts = [...allNfts, ...data.nfts];
            continuation = data.next;
            dynamicControls.classList.remove('hidden');
            bottomNav.classList.remove('hidden');
            renderAll();
        }
    } catch (e) { } finally { isFetching = false; }
}

function renderAll() {
    gallery.innerHTML = "";
    const mode = document.documentElement.getAttribute('data-view');
    
    if (mode === 'snap') {
        const groups = {};
        allNfts.forEach(nft => {
            const slug = nft.collection || "Uncategorized";
            if (!groups[slug]) groups[slug] = [];
            groups[slug].push(nft);
        });

        Object.keys(groups).sort(() => Math.random() - 0.5).forEach(key => {
            const items = groups[key].sort(() => Math.random() - 0.5);
            const card = document.createElement('div');
            card.className = 'art-card';
            
            const slider = document.createElement('div');
            slider.className = 'collection-slider';
            
            // Home -> Grid Logic (Only at end of swipe)
            slider.onscroll = (e) => {
                const el = e.target;
                const isAtEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 5;
                el.ontouchend = (ev) => {
                    const finalDiff = tStartX - ev.changedTouches[0].screenX;
                    if (isAtEnd && finalDiff > 80) switchView('grid');
                };
            };

            items.forEach((nft, idx) => {
                const slide = document.createElement('div');
                slide.className = 'collection-slide';
                slide.innerHTML = `
                    <div class="collection-counter">${idx + 1} / ${items.length}</div>
                    <button class="quick-share" onclick="event.stopPropagation(); share('${nft.opensea_url}')"><i data-lucide="share-2"></i></button>
                    <img src="${nft.image_url || nft.display_image_url}" loading="lazy">
                `;
                slide.onclick = () => showDetails(nft.contract, nft.identifier);
                slider.appendChild(slide);
            });
            card.appendChild(slider);
            gallery.appendChild(card);
        });
    } else {
        let list = [...allNfts];
        if (sortSelect.value === 'project') list.sort((a,b) => (a.collection || "").localeCompare(b.collection || ""));
        else if (sortSelect.value === 'name') list.sort((a,b) => (a.name || "").localeCompare(b.name || ""));

        list.forEach(nft => {
            const card = document.createElement('div');
            card.className = 'art-card';
            card.innerHTML = `<img src="${nft.image_url || nft.display_image_url}" loading="lazy">`;
            card.onclick = () => showDetails(nft.contract, nft.identifier);
            gallery.appendChild(card);
        });
    }
    lucide.createIcons();
}

async function showDetails(contract, id) {
    modal.classList.remove('hidden');
    const mData = document.getElementById('modalData'), sBtn = document.getElementById('modalShareBtn');
    mData.innerHTML = `<p style="text-align:center; padding: 40px;">LOADING...</p>`;
    try {
        const res = await fetch(`/api/view?address=${contract}&id=${id}`);
        const data = await res.json(), nft = data.nft;
        sBtn.onclick = () => share(nft.opensea_url);
        mData.innerHTML = `
            <h2 style="font-size:24px; font-weight:900; margin-bottom:5px;">${nft.name || 'UNTITLED'}</h2>
            <p style="opacity:0.5; font-size:10px; margin-bottom:15px; letter-spacing:1px;">${nft.collection.toUpperCase()}</p>
            <p style="font-size:14px; opacity:0.8; line-height:1.6;">${nft.description || ''}</p>
            <a href="${nft.opensea_url}" target="_blank" rel="noopener" style="display:block; width:100%; padding:20px; background:var(--text); color:var(--bg); text-align:center; border-radius:14px; font-weight:900; margin-top:30px; text-decoration:none;">VIEW ON OPENSEA</a>
        `;
    } catch (e) { mData.innerHTML = "Error loading."; }
    lucide.createIcons();
}

window.share = (url) => {
    if (navigator.share) navigator.share({ title: 'VIEW', url: url });
    else {
        navigator.clipboard.writeText(url);
        const toast = document.getElementById('toast');
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 2000);
    }
};

document.getElementById('goBtn').onclick = () => fetchArt(true);
input.onkeydown = (e) => { if (e.key === 'Enter') fetchArt(true); };
document.querySelector('.close-btn').onclick = () => modal.classList.add('hidden');
document.querySelector('.modal-overlay').onclick = () => modal.classList.add('hidden');

function switchView(mode) {
    gallery.classList.add('view-transitioning');
    setTimeout(() => {
        document.documentElement.setAttribute('data-view', mode);
        document.getElementById('navHome').classList.toggle('active', mode === 'snap');
        document.getElementById('navGrid').classList.toggle('active', mode === 'grid');
        gallery.scrollTo(0,0);
        renderAll();
        gallery.classList.remove('view-transitioning');
    }, 150);
}
document.getElementById('navHome').onclick = () => switchView('snap');
document.getElementById('navGrid').onclick = () => switchView('grid');
sortSelect.onchange = () => renderAll();
