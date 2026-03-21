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

// 💡 1. 專業版：IUCN & 臺灣紅皮書 燈號轉換器
function getConservationStyleHtml(code) {
    if (!code || code === 'null') return '<span style="color:#ccc; font-weight:bold;">無紀錄</span>';
    const upperCode = code.toUpperCase();
    const styleMap = {
        'EX': { label: '絕滅', bg: '#000', color: '#fff', border: '#000' },
        'EW': { label: '野外絕滅', bg: '#4a148c', color: '#fff', border: '#4a148c' },
        'RE': { label: '區域滅絕', bg: '#311b92', color: '#fff', border: '#311b92' },
        'CR': { label: '極危', bg: '#d32f2f', color: '#fff', border: '#b71c1c' },
        'EN': { label: '瀕危', bg: '#f44336', color: '#fff', border: '#d32f2f' },
        'VU': { label: '易危', bg: '#ff9800', color: '#fff', border: '#f57c00' },
        'NT': { label: '近危', bg: '#8bc34a', color: '#000', border: '#689f38' },
        'LC': { label: '無危', bg: '#4caf50', color: '#fff', border: '#388e3c' },
        'NCR': { label: '極危', bg: '#d32f2f', color: '#fff', border: '#b71c1c' },
        'NEN': { label: '瀕危', bg: '#f44336', color: '#fff', border: '#d32f2f' },
        'NVU': { label: '易危', bg: '#ff9800', color: '#fff', border: '#f57c00' },
        'NNT': { label: '近危', bg: '#8bc34a', color: '#000', border: '#689f38' },
        'NLC': { label: '無危', bg: '#4caf50', color: '#fff', border: '#388e3c' },
        'DD': { label: '數據缺乏', bg: '#9e9e9e', color: '#fff', border: '#757575' }
    };
    const config = styleMap[upperCode] || { label: upperCode, bg: '#ffffff', color: '#000', border: '#ccc' };
    return `<span style="display:inline-block; background:${config.bg}; color:${config.color}; border:1px solid ${config.border}; padding:4px 10px; border-radius:20px; font-size:0.85em; font-weight:bold; box-shadow:0 1px 3px rgba(0,0,0,0.1);">${config.label} (${upperCode})</span>`;
}

// 💡 2. 新增：自動載入圖片功能 (從 Wikipedia 獲取)
async function setFishThumbnail(sciName, imgElementId) {
    const wikiTitle = sciName.replace(/ /g, '_');
    try {
        let res = await fetch(`https://zh.wikipedia.org/api/rest_v1/page/summary/${wikiTitle}`);
        let data = await res.json();
        if (data.thumbnail && data.thumbnail.source) {
            document.getElementById(imgElementId).src = data.thumbnail.source;
        } else {
            // 如果中文查不到，試試英文
            let resEn = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${wikiTitle}`);
            let dataEn = await resEn.json();
            if (dataEn.thumbnail && dataEn.thumbnail.source) {
                document.getElementById(imgElementId).src = dataEn.thumbnail.source;
            }
        }
    } catch (e) {
        console.log("圖片載入跳過");
    }
}

// 💡 3. 搜尋主邏輯
searchBtn.addEventListener('click', async () => {
    const keyword = fishInput.value.trim();
    if (!keyword) return;

    searchBtn.disabled = true;
    resultDiv.innerHTML = '<p>🌊 正在檢索圖鑑並載入圖片中...</p>';

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

        const detailPromises = Array.from(matchIdsToFetch).slice(0, 30).map(async (tid) => {
            try {
                const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(`https://api.taicol.tw/v2/taxon?taxon_id=${tid}`)}`);
                const json = await res.json();
                return json.data ? (Array.isArray(json.data) ? json.data[0] : json.data) : null;
            } catch (e) { return null; }
        });

        const fetchedDetails = await Promise.all(detailPromises);
        fetchedDetails.forEach(detail => { if (detail) resultMap.set(detail.taxon_id, detail); });

        let fishList = Array.from(resultMap.values()).filter(fish => {
            const str = JSON.stringify(fish).toUpperCase();
            return !(str.includes('INSECTA') || str.includes('昆蟲'));
        });

        if (fishList.length === 0) {
            resultDiv.innerHTML = `<div style="padding:20px; text-align:center; background:#fff3f3; color:var(--danger-red); border-radius:12px; border: 1px solid #ffcdd2;">❌ 找不到相關紀錄。</div>`;
            searchBtn.disabled = false;
            return;
        }

        // 💡 4. 渲染卡片結果 (加入圖片位置)
        let htmlContent = `<p style="margin-bottom:20px; text-align:left;">共找到 ${fishList.length} 筆資料：</p>`;
        
        htmlContent += fishList.map((fish, index) => {
            const sciName = fish.simple_name || fish.scientific_name || "Unknown";
            const imgId = `fish-img-${index}`;
            const alienMap = { 'native': '原生', 'naturalized': '歸化', 'invasive': '入侵', 'cultured': '栽培養殖' };
            const alienStatus = fish.alien_type ? (alienMap[fish.alien_type] || fish.alien_type) : '未標示';

            // 觸發異步載入圖片
            setFishThumbnail(sciName, imgId);

            return `
                <div class="fish-card">
                    <div style="display: flex; gap: 20px; align-items: flex-start;">
                        <img id="${imgId}" src="https://via.placeholder.com/150?text=Loading..." 
                             style="width: 150px; height: 150px; object-fit: cover; border-radius: 12px; background: #eee; border: 1px solid #ddd; flex-shrink: 0;">
                        
                        <div style="flex: 1;">
                            <h3 class="fish-title">🐟 ${fish.common_name_c || '未有中文名'}</h3>
                            <div class="fish-sci-name">${sciName}</div>
                            <div class="fish-aliases"><strong>別名：</strong> ${fish.alternative_name_c || '無'}</div>
                        </div>
                    </div>

                    <div style="font-size:0.9em; color:#444; margin:15px 0; display:grid; grid-template-columns: 1fr 1fr; gap:5px;">
                        <div><strong>地位：</strong> ${fish.taxon_status === 'accepted' ? '有效名' : '非有效名'}</div>
                        <div><strong>性質：</strong> ${alienStatus}</div>
                        <div><strong>臺灣分布：</strong> ${fish.is_in_taiwan ? '✔' : '✖'}</div>
                        <div><strong>特有種：</strong> ${fish.is_endemic ? '✔' : '✖'}</div>
                    </div>

                    <div class="conservation-box">
                        <div class="conservation-title">🛡️ 保育狀態</div>
                        <div class="conservation-tags">
                            <div class="tag-group"><span class="tag-label">IUCN 全球</span>${getConservationStyleHtml(fish.iucn)}</div>
                            <div class="tag-group"><span class="tag-label">臺灣紅皮書</span>${getConservationStyleHtml(fish.redlist)}</div>
                        </div>
                    </div>

                    <div class="action-buttons">
                        <button class="btn btn-wiki" onclick="loadWiki('${sciName}', this)">📸 百科詳解</button>
                        <a class="btn btn-taicol" href="https://taicol.tw/taxon/${fish.taxon_id}" target="_blank">🏷️ TaiCOL</a>
                        <a class="btn btn-fishbase" href="https://www.fishbase.se/summary/${sciName.replace(/ /g, '-')}" target="_blank">➔ FishBase</a>
                    </div>
                    <div class="wiki-content"></div>
                </div>
            `;
        }).join('');

        resultDiv.innerHTML = htmlContent;

    } catch (error) {
        resultDiv.innerHTML = '<p style="color:red; text-align:center;">⚠️ API 連線逾時，請重試。</p>';
    } finally {
        searchBtn.disabled = false;
    }
});

// 💡 5. 百科載入引擎 (保持原樣)
window.loadWiki = async function(name, btn) {
    const contentDiv = btn.parentElement.nextElementSibling;
    btn.innerText = '⏳ 載入中...';
    try {
        const wikiTitle = name.replace(/ /g, '_');
        let res = await fetch(`https://zh.wikipedia.org/api/rest_v1/page/summary/${wikiTitle}`);
        let data = await res.json();
        contentDiv.innerHTML = `<p style="margin: 0;">${data.extract || '暫無摘要。'}</p>
                                <div style="text-align: right;"><a href="${data.content_urls.desktop.page}" target="_blank">➔ 閱讀完整百科</a></div>`;
        contentDiv.style.display = 'block';
        btn.style.display = 'none';
    } catch {
        btn.innerText = '❌ 無法載入';
    }
};