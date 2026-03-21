const searchBtn = document.querySelector('#searchBtn');
const fishInput = document.querySelector('#fishName');
const resultDiv = document.querySelector('#result');

// 💡 0. 支援 Enter 鍵直接搜尋
fishInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        e.preventDefault(); 
        searchBtn.click();
    }
});

// 💡 1. 百科圖鑑引擎 (保留原本功能)
window.fetchWikiData = async function(sciName, btnElement) {
    const targetDiv = btnElement.parentElement.nextElementSibling;
    const originalBtnText = btnElement.innerHTML;
    
    btnElement.innerHTML = '⏳ 載入中...';
    btnElement.disabled = true;
    targetDiv.style.display = 'block';
    targetDiv.innerHTML = '<div style="text-align:center; color:#666;">正在載入詳細文獻...</div>';

    const wikiTitle = sciName.replace(/\s+/g, '_');
    
    try {
        let res = await fetch(`https://zh.wikipedia.org/api/rest_v1/page/summary/${wikiTitle}`);
        if (!res.ok) res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${wikiTitle}`);
        if (!res.ok) throw new Error('Wiki查無資料');
        
        const data = await res.json();
        targetDiv.innerHTML = `
            <div style="text-align: justify; padding-top:10px;">
                <p style="margin: 0 0 8px 0; color: #2e7d32; font-weight:bold;">📖 百科深度摘要：</p>
                <p style="margin: 0;">${data.extract || '暫無詳細說明。'}</p>
                <div style="clear: both; text-align: right; margin-top: 15px;">
                    <a href="${data.content_urls.desktop.page}" target="_blank" style="color: #0077be; font-weight: bold; text-decoration: none;">➔ 閱讀完整百科</a>
                </div>
            </div>
        `;
        btnElement.style.display = 'none';
    } catch (error) {
        targetDiv.innerHTML = `<div style="color:#d32f2f; text-align:center;">⚠️ 百科資料庫中暫無此學名的詳細紀錄。</div>`;
        btnElement.innerHTML = originalBtnText;
        btnElement.disabled = false;
    }
};

// 💡 2. 圖片抓取輔助函式 (新功能)
async function getFishThumbnail(sciName) {
    try {
        const wikiTitle = sciName.replace(/\s+/g, '_');
        let res = await fetch(`https://zh.wikipedia.org/api/rest_v1/page/summary/${wikiTitle}`);
        if (!res.ok) res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${wikiTitle}`);
        const data = await res.json();
        return data.thumbnail ? data.thumbnail.source : null;
    } catch {
        return null;
    }
}

// 💡 3. 保育燈號轉換器 (保持不變)
function getConservationStyle(code) {
    if (!code || code === 'null') return { html: `<span style="display:inline-block; background:#f5f5f5; color:#aaa; border:1px solid #eee; padding:4px 10px; border-radius:20px; font-size:0.85em; font-weight:bold;">無紀錄</span>` };
    const upperCode = code.toUpperCase();
    const styleMap = {
        'EX': { label: '絕滅', bg: '#000', color: '#fff' },
        'EW': { label: '野外絕滅', bg: '#4a148c', color: '#fff' },
        'CR': { label: '極危', bg: '#d32f2f', color: '#fff' },
        'NCR': { label: '極危', bg: '#d32f2f', color: '#fff' },
        'EN': { label: '瀕危', bg: '#f44336', color: '#fff' },
        'NEN': { label: '瀕危', bg: '#f44336', color: '#fff' },
        'VU': { label: '易危', bg: '#ff9800', color: '#fff' },
        'NVU': { label: '易危', bg: '#ff9800', color: '#fff' },
        'NT': { label: '近危', bg: '#8bc34a', color: '#000' },
        'LC': { label: '無危', bg: '#4caf50', color: '#fff' }
    };
    const config = styleMap[upperCode] || { label: upperCode, bg: '#ffffff', color: '#000' };
    return { html: `<span style="display:inline-block; background:${config.bg}; color:${config.color}; padding:4px 10px; border-radius:20px; font-size:0.85em; font-weight:bold;">${config.label} (${upperCode})</span>` };
}

// 💡 4. 搜尋核心邏輯 (新增圖片整合)
searchBtn.addEventListener('click', async () => {
    const keyword = fishInput.value.trim();
    if (!keyword) return;

    searchBtn.disabled = true;
    resultDiv.innerHTML = `<p style="text-align:center; color:var(--primary-blue); font-weight:bold;">🌊 正在極速檢索圖鑑與影像資料...</p>`;

    try {
        const matchUrl = `https://corsproxy.io/?${encodeURIComponent(`https://api.taicol.tw/v2/nameMatch?name=${keyword}&best=no&bio_group=魚類`)}`;
        const commonUrl = `https://corsproxy.io/?${encodeURIComponent(`https://api.taicol.tw/v2/taxon?common_name=${keyword}`)}`;
        
        const [matchRes, commonRes] = await Promise.all([
            fetch(matchUrl).then(r => r.json()).catch(() => ({ data: [] })),
            fetch(commonUrl).then(r => r.json()).catch(() => ({ data: [] }))
        ]);

        const resultMap = new Map();
        if (commonRes.data) commonRes.data.forEach(item => { if (!item.kingdom || item.kingdom === 'Animalia') resultMap.set(item.taxon_id, item); });

        const matchIdsToFetch = new Set();
        if (matchRes.data) matchRes.data.forEach(item => { if (!resultMap.has(item.taxon_id)) matchIdsToFetch.add(item.taxon_id); });

        const detailPromises = Array.from(matchIdsToFetch).slice(0, 20).map(async (tid) => {
            try {
                const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(`https://api.taicol.tw/v2/taxon?taxon_id=${tid}`)}`);
                const json = await res.json();
                return json.data ? (Array.isArray(json.data) ? json.data[0] : json.data) : null;
            } catch (e) { return null; }
        });

        const fetchedDetails = await Promise.all(detailPromises);
        fetchedDetails.forEach(detail => { if (detail) resultMap.set(detail.taxon_id, detail); });

        let fishList = Array.from(resultMap.values());

        if (fishList.length === 0) {
            resultDiv.innerHTML = `<div style="padding:20px; text-align:center; background:#fff3f3; color:var(--danger-red); border-radius:12px;">❌ 找不到相關紀錄。</div>`;
            searchBtn.disabled = false;
            return;
        }

        // 渲染基礎卡片結構 (先顯示文字，圖片非同步載入)
        resultDiv.innerHTML = fishList.map(fish => {
            const sciName = fish.simple_name || fish.scientific_name || "Unknown";
            return `
                <div class="fish-card">
                    <div id="img-container-${fish.taxon_id}" style="width:100%; height:200px; background:#eee; border-radius:12px; margin-bottom:15px; overflow:hidden; display:flex; align-items:center; justify-content:center; color:#999; font-size:0.8em;">
                        ⏳ 影像載入中...
                    </div>

                    <h3 class="fish-title">🐟 ${fish.common_name_c || '未命名'}</h3>
                    <div class="fish-sci-name">${sciName}</div>
                    <div class="fish-aliases"><strong>別名：</strong> ${fish.alternative_name_c || '無'}</div>
                    
                    <div class="conservation-box">
                        <div class="conservation-title">🛡️ 保育狀態</div>
                        <div class="conservation-tags">
                            <div class="tag-group"><span class="tag-label">IUCN 全球</span>${getConservationStyle(fish.iucn).html}</div>
                            <div class="tag-group"><span class="tag-label">臺灣紅皮書</span>${getConservationStyle(fish.redlist).html}</div>
                        </div>
                    </div>
                    
                    <div class="action-buttons">
                        <button class="btn-wiki" onclick="fetchWikiData('${sciName}', this)">📸 百科詳解</button>
                        <a class="btn-taicol" href="https://taicol.tw/taxon/${fish.taxon_id}" target="_blank" style="background:#ef6c00; color:white; padding:12px; border-radius:10px; text-decoration:none; flex:1; text-align:center; font-weight:bold;">🏷️ TaiCOL</a>
                        <a class="btn-fishbase" href="https://www.fishbase.se/summary/${sciName.replace(/ /g, '-')}" target="_blank">➔ FishBase</a>
                    </div>
                    <div class="wiki-content"></div>
                </div>
            `;
        }).join('');

        // 💡 非同步載入每張卡片的圖片
        fishList.forEach(async (fish) => {
            const sciName = fish.simple_name || fish.scientific_name || "";
            const imgUrl = await getFishThumbnail(sciName);
            const container = document.getElementById(`img-container-${fish.taxon_id}`);
            if (imgUrl) {
                container.innerHTML = `<img src="${imgUrl}" style="width:100%; height:100%; object-fit:cover; transition: 0.3s;">`;
            } else {
                container.innerHTML = `<span>📷 暫無影像紀錄</span>`;
            }
        });

    } catch (error) {
        resultDiv.innerHTML = `<p style="color:red; text-align:center;">⚠️ 連線超時，請重試。</p>`;
    } finally {
        searchBtn.disabled = false;
    }
});