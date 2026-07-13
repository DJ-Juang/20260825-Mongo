const ITEMS_PER_PAGE = 9;
let currentPage = 1;
let filterMode = 'all'; // 'all'（全部）或 'favorites'（僅收藏）
let favorites = JSON.parse(localStorage.getItem('mongo_favorites')) || [];
let travelData = [];
let searchKeyword = '';

// 網頁載入完成後初始化
document.addEventListener("DOMContentLoaded", async () => {

  await loadTravelData();

  initCarousel();
  setupFilterTabs();
  setupSearch();

  renderGallery();
  renderPagination();
  updateStats();
  updateSearchResultInfo();

  setupModal();
  setupLightbox();
});

async function loadTravelData(){

  try{

    const response =
      await fetch("data.json");

    travelData =
      await response.json();

  }
  catch(error){

    console.error(
      "載入資料失敗",
      error
    );

    travelData = [];
  }
}

// 💡 輔助函式：自動解析 Google Drive 網址中的檔案 ID
function getGoogleDriveId(url) {
  if (!url) return null;
  const regId = /\/file\/d\/([a-zA-Z0-9_-]+)/;
  const regIdQuery = /[?&]id=([a-zA-Z0-9_-]+)/;
  
  const match1 = url.match(regId);
  if (match1 && match1[1]) return match1[1];
  
  const match2 = url.match(regIdQuery);
  if (match2 && match2[1]) return match2[1];
  
  return null;
}

// 💡 輔助函式：判斷是否為 Google Drive 資源
function isGoogleDriveMedia(url) {
  return getGoogleDriveId(url) !== null;
}

// 💡 輔助函式：根據影片或圖片網址，動態獲取最穩定的高畫質縮圖網址（僅限 Google Drive）
function getMediaThumbnail(item) {
  const driveId = getGoogleDriveId(item.url);
  if (driveId) {
    return `https://drive.google.com/thumbnail?sz=w1200&id=${driveId}`;
  }
  return item.url;
}

// 取得當前篩選模式下的資料列表
function getFilteredData() {

  let data =
    filterMode === 'all'
      ? travelData
      : travelData.filter(item =>
          favorites.includes(item.id)
        );

  // 搜尋條件
  if (searchKeyword.trim() !== '') {

    const query =
      searchKeyword.toLowerCase().trim();

    data = data.filter(item => {

      const text =
        [
          item.title || '',
          item.category || '',
          item.description || ''
        ]
        .join(' ')
        .toLowerCase();

      // AND 搜尋
      if (query.includes(' and ')) {

        const keywords =
          query.split(/\s+and\s+/i);

        return keywords.every(keyword =>
          text.includes(keyword.trim())
        );
      }

      // OR 搜尋
      if (query.includes(' or ')) {

        const keywords =
          query.split(/\s+or\s+/i);

        return keywords.some(keyword =>
          text.includes(keyword.trim())
        );
      }
      // 一般搜尋
      return text.includes(query);
    });
  }
  return data;
}

function updateSearchResultInfo() {
  const info =
    document.getElementById('searchResultInfo');
  if (!info) return;
  const count =
    getFilteredData().length;
  if (searchKeyword.trim() === '') {
    info.innerHTML =
      `共 ${count} 筆資料`;
  } else {
    info.innerHTML =
      `🔍 「${searchKeyword}」 找到 ${count} 筆資料`;
  }
}

// 1. 頂部無縫滾動 Banner (已修正：同時支援 Google Drive 影片與一般外部影片)
function initCarousel() {
  const track = document.getElementById('carousel-track');
  if (!track) return;

  const carouselItems = [...travelData, ...travelData, ...travelData];
  
  track.innerHTML = carouselItems.map(item => {
    const isDrive = isGoogleDriveMedia(item.url);
    
    // 如果是一般外部影片，則使用 <video> 標籤自動播放；其餘使用 <img> 標籤
    if (item.type === 'video' && !isDrive) {
      return `
        <div class="w-48 h-32 mx-2 flex-shrink-0 overflow-hidden rounded shadow-sm border border-stone-800 bg-stone-900 relative group">
          <video src="${item.url}" class="w-full h-full object-cover opacity-75 hover:opacity-100 transition-opacity duration-300" autoplay muted loop playsinline></video>
          <div class="absolute inset-0 flex items-center justify-center bg-black/30 text-white pointer-events-none">
            <i class="fa-solid fa-play text-xs opacity-70"></i>
          </div>
        </div>
      `;
    } else {
      const thumbnailUrl = getMediaThumbnail(item);
      return `
        <div class="w-48 h-32 mx-2 flex-shrink-0 overflow-hidden rounded shadow-sm border border-stone-800 bg-stone-900 relative group">
          <img src="${thumbnailUrl}" alt="${item.title}" class="w-full h-full object-cover opacity-75 hover:opacity-100 transition-opacity duration-300">
          ${item.type === 'video' 
            ? `<div class="absolute inset-0 flex items-center justify-center bg-black/30 text-white pointer-events-none">
                <i class="fa-solid fa-play text-xs opacity-70"></i>
               </div>`
            : ''
          }
        </div>
      `;
    }
  }).join('');
}

// 初始化篩選標籤的點擊事件與手勢樣式
function setupFilterTabs() {
  const totalBtn = document.getElementById('stat-total')?.parentElement;
  const favBtn = document.getElementById('stat-favorites')?.parentElement;

  if (totalBtn && favBtn) {
    totalBtn.className = "flex flex-col cursor-pointer transition-all duration-300 p-4 rounded-lg border border-transparent hover:bg-stone-50 select-none w-full md:w-auto";
    favBtn.className = "flex flex-col cursor-pointer transition-all duration-300 p-4 rounded-lg border border-transparent hover:bg-stone-50 select-none w-full md:w-auto";

    totalBtn.addEventListener('click', () => {
      if (filterMode !== 'all') {
        filterMode = 'all';
        currentPage = 1;
        renderGallery();
        renderPagination();
        updateStats();
        updateSearchResultInfo();
      }
    });

    favBtn.addEventListener('click', () => {
      if (filterMode !== 'favorites') {
        filterMode = 'favorites';
        currentPage = 1;
        renderGallery();
        renderPagination();
        updateStats();
        updateSearchResultInfo();
      }
    });
  }
}

function setupSearch() {
  const searchInput =
    document.getElementById('searchInput');

  if (!searchInput) return;

  searchInput.addEventListener('input', function () {
    searchKeyword = this.value;
    currentPage = 1;
    renderGallery();
    renderPagination();
    updateStats();
    updateSearchResultInfo();
  });
}

// 2. 渲染 3x3 照片卡片網格 (已修正：一般外部影片使用 <video> 原生播放，Drive 影片則使用輕量縮圖)
function renderGallery() {
  const grid = document.getElementById('gallery-grid');
  if (!grid) return;

  const activeData = getFilteredData();
  
  const totalPages = Math.ceil(activeData.length / ITEMS_PER_PAGE) || 1;
  if (currentPage > totalPages) {
    currentPage = totalPages;
  }

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const pageData = activeData.slice(startIndex, endIndex);

  grid.innerHTML = '';

  if (pageData.length === 0) {
    if (filterMode === 'favorites') {
      grid.innerHTML = `
        <div class="col-span-full text-center py-16 px-4 bg-stone-50 border border-dashed border-stone-200 rounded-lg">
          <i class="fa-regular fa-heart text-[#8C6239] opacity-40 text-4xl mb-4 block"></i>
          <p class="text-stone-600 font-light mb-1">您的「我的最愛」中目前空無一物</p>
          <p class="text-xs text-stone-400">點擊卡片右下角的愛心，就能將您心動的義瑞回憶珍藏在此！</p>
        </div>`;
    } else {
      grid.innerHTML = `<p class="col-span-full text-center text-stone-400 py-12">目前沒有任何紀錄資料。</p>`;
    }
    return;
  }

  pageData.forEach(item => {
    const isFav = favorites.includes(item.id);
    const card = document.createElement('div');
    card.className = "bg-white border border-stone-200 rounded overflow-hidden shadow-sm hover:shadow-md transition-all duration-500 transform hover:-translate-y-1 group flex flex-col justify-between";
    
    const displayId = String(item.id).padStart(2, '0');
    const isDrive = isGoogleDriveMedia(item.url);

    // 根據媒體來源決定預覽區的 HTML 結構
    let mediaHTML = '';
    if (item.type === 'video' && !isDrive) {
      // 1. 一般外部影片 (.mp4) 的預覽：使用原生 <video> 自動循環播放
      mediaHTML = `
        <video src="${item.url}" class="w-full h-full object-cover" muted loop autoplay playsinline></video>
        <div class="absolute inset-0 flex items-center justify-center bg-stone-900 bg-opacity-30 z-10 text-white transition-opacity duration-300">
          <div class="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <i class="fa-solid fa-play text-lg translate-x-0.5"></i>
          </div>
        </div>
      `;
    } else {
      // 2. Google Drive 影片（使用縮圖）或是一般圖片：使用 <img> 標籤
      const thumbnailUrl = getMediaThumbnail(item);
      mediaHTML = `
        <img src="${thumbnailUrl}" alt="${item.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out">
        ${item.type === 'video' 
          ? `
            <div class="absolute inset-0 flex items-center justify-center bg-stone-900 bg-opacity-30 z-10 text-white transition-opacity duration-300">
              <div class="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <i class="fa-solid fa-play text-lg translate-x-0.5"></i>
              </div>
            </div>
            `
          : ''
        }
      `;
    }

    card.innerHTML = `
      <!-- 上方預覽區：點擊原地觸發滿版燈箱 -->
      <div onclick="openLightbox(${item.id})" class="block relative aspect-[4/3] overflow-hidden bg-stone-100 cursor-pointer">
        ${mediaHTML}
        <!-- 左上方：#ID 編號 -->
        <span class="absolute top-3 left-3 bg-white/95 backdrop-blur-sm text-[10px] tracking-widest text-[#8C6239] px-2.5 py-1 uppercase rounded-sm font-bold z-10 shadow-sm border border-stone-100 font-serif">
          #${displayId}
        </span>
        <!-- 右上方：國家/景點分類 -->
        <span class="absolute top-3 right-3 bg-[#1A2535]/90 backdrop-blur-sm text-[10px] tracking-widest text-white px-2.5 py-1 uppercase rounded-sm font-semibold z-10 shadow-sm border border-white/10">
          ${item.category}
        </span>
      </div>
      
      <!-- 下方文字與收藏區 -->
       <div class="p-5 flex justify-between items-center bg-white border-t border-stone-50">
       ${(item.title || item.description) ? `
        <h3 class="text-sm font-bold text-black pr-4" title="${item.title || ''}">
            ${item.title ? `📍 ${item.title}` : ""}
            ${item.description ? `
             <br>
            <span class="text-xs font-semibold text-stone-600">
            🎯 ${item.description}
            </span>
            ` : ""}
        </h3>
       ` : ""}   
    
        <button onclick="toggleFavorite(${item.id})" class="text-stone-300 hover:text-red-400 transition-colors duration-300 p-1 focus:outline-none">
          <i class="${isFav ? 'fa-solid fa-heart text-red-500' : 'fa-regular fa-heart'} text-lg"></i>
        </button>
      </div>
    `;
        grid.appendChild(card);
  });
}

// 3. 分頁控制
function renderPagination() {
  const paginationNav = document.getElementById('pagination');
  if (!paginationNav) return;

  const activeData = getFilteredData();
  const totalPages = Math.ceil(activeData.length / ITEMS_PER_PAGE);
  paginationNav.innerHTML = '';

  if (totalPages <= 1) return;

  const createBtn = (label, targetPage, disabled = false, active = false) => {
    const btn = document.createElement('button');
    btn.innerHTML = label;
    btn.disabled = disabled;
    
    if (active) {
      btn.className = "w-8 h-8 flex items-center justify-center text-xs bg-[#1A2535] text-white rounded-full font-medium transition-all duration-300";
    } else if (disabled) {
      btn.className = "w-8 h-8 flex items-center justify-center text-xs text-stone-300 cursor-not-allowed";
    } else {
      btn.className = "w-8 h-8 flex items-center justify-center text-xs text-stone-600 hover:bg-stone-100 rounded-full transition-all duration-300";
    }

    btn.addEventListener('click', () => {
      currentPage = targetPage;
      renderGallery();
      renderPagination();
      window.scrollTo({ top: 350, behavior: 'smooth' });
    });

    return btn;
  };

  paginationNav.appendChild(createBtn('<i class="fa-solid fa-angles-left text-[9px]"></i>', 1, currentPage === 1));
  paginationNav.appendChild(createBtn('<i class="fa-solid fa-angle-left text-[9px]"></i>', currentPage - 1, currentPage === 1));

  for (let i = 1; i <= totalPages; i++) {
    paginationNav.appendChild(createBtn(i, i, false, currentPage === i));
  }

  paginationNav.appendChild(createBtn('<i class="fa-solid fa-angle-right text-[9px]"></i>', currentPage + 1, currentPage === totalPages));
  paginationNav.appendChild(createBtn('<i class="fa-solid fa-angles-right text-[9px]"></i>', totalPages, currentPage === totalPages));
}

// 4. 數據統計與「頁籤視覺高亮狀態」同步更新
function updateStats() {
  const totalStat = document.getElementById('stat-total');
  const favStat = document.getElementById('stat-favorites');
  
  if (totalStat) totalStat.innerHTML = `${travelData.length} <span class="text-sm text-stone-400">個回憶</span>`;
  if (favStat) favStat.innerHTML = `${favorites.length} <span class="text-sm text-stone-400">個最愛</span>`;

  const totalBtn = totalStat?.parentElement;
  const favBtn = favStat?.parentElement;

  if (totalBtn && favBtn) {
    if (filterMode === 'all') {
      totalBtn.classList.add('border-stone-300', 'bg-white', 'shadow-sm');
      totalBtn.classList.remove('border-transparent');
      favBtn.classList.remove('border-stone-300', 'bg-white', 'shadow-sm');
      favBtn.classList.add('border-transparent');
    } else {
      favBtn.classList.add('border-stone-300', 'bg-white', 'shadow-sm');
      favBtn.classList.remove('border-transparent');
      totalBtn.classList.remove('border-stone-300', 'bg-white', 'shadow-sm');
      totalBtn.classList.add('border-transparent');
    }
  }
}

// 5. 切換最愛狀態
window.toggleFavorite = function(id) {
  const index = favorites.indexOf(id);
  if (index === -1) {
    favorites.push(id);
  } else {
    favorites.splice(index, 1);
  }
  
  localStorage.setItem('mongo_favorites', JSON.stringify(favorites));
  renderGallery();
  renderPagination();
  updateStats();
};

// 6. 高級自訂二次確認彈出視窗 (Modal)
function setupModal() {
  const modal = document.getElementById('confirm-modal');
  const card = document.getElementById('modal-card');
  const btnReset = document.getElementById('btn-reset');
  const btnCancel = document.getElementById('modal-cancel');
  const btnConfirm = document.getElementById('modal-confirm');

  const openModal = () => {
    modal.classList.remove('hidden');
    setTimeout(() => {
      modal.classList.remove('opacity-0');
      card.classList.remove('scale-95');
    }, 10);
  };

  const closeModal = () => {
    modal.classList.add('opacity-0');
    card.classList.add('scale-95');
    setTimeout(() => {
      modal.classList.add('hidden');
    }, 300);
  };

  btnReset.addEventListener('click', openModal);
  btnCancel.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  btnConfirm.addEventListener('click', () => {
    favorites = [];
    localStorage.removeItem('mongo_favorites');
    filterMode = 'all';
    currentPage = 1;
    renderGallery();
    renderPagination();
    updateStats();
    closeModal();
  });
}

// 7. 滿版精緻相簿燈箱邏輯 (Lightbox)
function setupLightbox() {
  const lightbox = document.getElementById('lightbox');
  const closeBtn = document.getElementById('lightbox-close');

  closeBtn.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox || e.target.id === 'lightbox-content-box') {
      closeLightbox();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !lightbox.classList.contains('hidden')) {
      closeLightbox();
    }
  });
}

// 💡 8. 打開燈箱 (已修正 iOS 播放 Google Drive 影片黑屏與時間軸錯位問題)
// 💡 8. 打開燈箱 (終極優化版：自動辨識 iOS 手機與 PC 電腦，完美解決兩端播放問題)
// 💡 8. 打開燈箱 (終極完美版：徹底解決 iPhone 播放鍵劃斜線與電腦 CORS 阻擋問題)
// 💡 8. 打開燈箱 (體驗終極版：防止 iOS 覆蓋網頁、確保 100% 順暢返回原卡片位置)
// 💡 8. 打開燈箱 (終極不迷路安全版：電腦原地看，手機分頁看並附帶防失蹤導航提示)
// 💡 8. 打開燈箱 (驚世大結局版：利用網址錨點記號，徹底解決手機黑屏與回不來卡片的世紀難題)
// 💡 8. 打開燈箱 (比照舊專案流暢體驗：手機看完影片，按左上角「完成/◀」自動回原卡片)
// 💡 8. 打開燈箱 (完美復刻舊專案黃金邏輯：手機免燈箱直接就地播放，看完點左上角秒回原卡片)
window.openLightbox = function(id) {
  const item = travelData.find(d => d.id === id);
  if (!item) return;

  const driveId = getGoogleDriveId(item.url);

  // 🚀 【手機端影音終極分流】判定使用者是否為 iPhone / iPad (iOS 系統)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  // 🎯 如果是影片，且使用者用的是 iPhone 手機
  if (item.type === 'video' && isIOS && driveId) {
    // 完全複製舊專案成功秘訣：不開燈箱、不開新分頁，直接在當前視窗就地跳轉到官方完美的播放頁面
    window.location.href = `https://drive.google.com/file/d/${driveId}/view?usp=drivesdk`;
    return; // 直接中斷後面開燈箱的動作！
  }

  // ----------------------------------------------------
  // 以下為【PC 電腦版影片】與【全平台照片】的正常燈箱邏輯
  // ----------------------------------------------------
  const lightbox = document.getElementById('lightbox');
  const contentBox = document.getElementById('lightbox-content-box');
  const titleText = document.getElementById('lightbox-title');
  const categoryText = document.getElementById('lightbox-category');

  titleText.innerText = item.title;
  categoryText.innerText = item.category;

  // 智能判定下載連結
  const downloadUrl = driveId 
    ? `https://drive.google.com/uc?export=download&id=${driveId}`
    : item.url;

  // 在標題下方動態注入下載按鈕
/* jdj
  let downloadBtn = document.getElementById('lightbox-download');
  if (!downloadBtn) {
    downloadBtn = document.createElement('a');
    downloadBtn.id = 'lightbox-download';
    downloadBtn.className = "mt-4 inline-flex items-center gap-2 px-5 py-2 border border-white/20 hover:border-white text-white hover:bg-white/10 text-xs tracking-widest rounded-sm transition-all duration-300 uppercase font-light cursor-pointer";
    titleText.parentNode.appendChild(downloadBtn);
  }
  downloadBtn.href = downloadUrl;
  downloadBtn.target = "_blank";
  downloadBtn.setAttribute('download', `${item.title}`); 
  downloadBtn.innerHTML = `<i class="fa-solid fa-arrow-down-to-bracket text-[10px]"></i> 下載此${item.type === 'video' ? '影片' : '照片'}`;
*/
  // 立即顯示燈箱
  lightbox.classList.remove('hidden');
  document.body.classList.add('overflow-hidden-lightbox');
  setTimeout(() => {
    lightbox.classList.remove('opacity-0');
  }, 10);

  if (item.type === 'video') {
    // 這裡只會是 PC 電腦版走進來：使用完美的 <iframe> 原地預覽播放器
    contentBox.innerHTML = `
      <iframe 
        src="https://drive.google.com/file/d/${driveId}/preview" 
        class="w-full max-w-4xl aspect-video rounded-lg shadow-2xl bg-black border-none" 
        allow="autoplay" 
        allowfullscreen>
      </iframe>
    `;
  } else {
    // 圖片項目（全平台共通）：使用 <img> 標籤
    const thumbnailUrl = getMediaThumbnail(item);
    contentBox.innerHTML = `
      <img src="${thumbnailUrl}" alt="${item.title}" class="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl">
    `;
  }
};

// 關閉燈箱
function closeLightbox() {
  const lightbox = document.getElementById('lightbox');
  const contentBox = document.getElementById('lightbox-content-box');

  lightbox.classList.add('opacity-0');
  document.body.classList.remove('overflow-hidden-lightbox');
  
  setTimeout(() => {
    lightbox.classList.add('hidden');
    contentBox.innerHTML = ''; 
  }, 300);
}
