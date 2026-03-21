const searchBtn = document.querySelector('#searchBtn');
const fishInput = document.querySelector('#fishName');
const resultDiv = document.querySelector('#result');

// 💡 1. 維基百科 API 萃取引擎 (移除 inline styles，改用 class)
window.fetchWikiData = async function(sciName, btnElement) {
    const targetDiv = btnElement.parentElement.nextElementSibling;
    const originalBtnText = btnElement.innerHTML;
    
    btnElement.innerHTML = '⏳ 載入中...';
    btnElement.disabled = true;
    targetDiv.style.display = 'block';
    targetDiv.innerHTML = '<div style="text-align:center; color:#666;">正在載入百科文獻與影像...</div>';

    const wikiTitle = sciName.replace(/\s+/g, '_');
    
    try {
        let res = await fetch(`https://zh.wikipedia.org/api/rest_v1/page/summary/${wikiTitle}`);
        if (!res.ok) res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${wikiTitle}`);
        if (!res.ok) throw new Error('Wiki API 查無資料');
        
        const data = await res.json();
        
        let imgHtml = '';
        if (data.thumbnail && data.thumbnail.source) {
            imgHtml = `<img src="${data.thumbnail.source}" style="width: 120px; height: 120px; object-fit: cover; border-radius: 8px; float: right; margin: 0 0 10px 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">`;
        }

        targetDiv.innerHTML = `
            <div style="text-align: justify; overflow: hidden;">
                ${imgHtml}
                <p style="margin: 0 0 8px 0; color: #2e7d32; font-weight:bold;">📖 百科摘要 (${data.title})：</p>
                <p style="margin: 0;">${data.extract || '該物種目前暫無詳細文字描述。'}</p>
                <div style="clear: both; text-align: right; margin-top: 15px;">
                    <a href="${data.content_urls.desktop.page}" target="_blank" style="color: #0077be; font-weight: bold; text-decoration: none;">➔ 閱讀完整百科</a>
                </div>
            </div>
        `;
        btnElement.style.display = 'none';

    } catch (error) {
        targetDiv.innerHTML = `<div style="color:#d32f2f; text-align:center;">⚠️ 百科資料庫中暫無此學名的直接紀錄。</div>`;
        btnElement.innerHTML = originalBtnText;
        btnElement.disabled = false;
    }
};

// 💡 保育等級燈號轉換器 (維持燈號的行內樣式以確保顏色準確)
function getConservationStyle(code) {
    if (!code || code === 'null') return { label: '無紀錄', bg: '#f5f5f5', color: '#aaa', border: '#eee' };
    const upperCode = code.toUpperCase();
    const cleanCode = upperCode.replace(/^N/, ''); 
    const styleMap = {
        'EX': { label: '絕滅', bg: '#000000', color: '#fff', border: '#000' },
        'EW': { label: '野外絕滅', bg: '#4a148c', color: '#fff', border: '#4a148c' },
        'RE': { label: '區域滅絕', bg: '#311b92', color: '#fff', border: '#311b92' },
        'CR': { label: '極危', bg: '#d32f2f', color: '#fff', border: '#b71c1c' },
        'EN': { label: '瀕危', bg: '#f44336', color: '#fff', border: '#d32f2f' },
        'VU': { label: '易危', bg: '#ff9800', color: '#fff', border: '#f57c00' },
        'CD': { label: '依賴保育', bg: '#c0ca33', color: '#000', border: '#afb42b' },
        'NT': { label: '近危', bg: '#8bc34a', color: '#000', border: '#689f38' },
        'LC': { label: '無危', bg: '#4caf50', color: '#fff', border: '#388e3c' },
        'DD': { label: '數據缺乏', bg: '#9e9e9e', color: '#fff', border: '#757575' },
        'NE': { label: '未予評估', bg: '#e0e0e0', color: '#000', border: '#bdbdbd' },
        'NA': { label: '不適用', bg: '#e0e0e0', color: '#000', border: '#bdbdbd' }
    };
    const config = styleMap[cleanCode] || { label: upperCode, bg: '#ffffff', color: '#000', border: '#ccc' };
    return { html: `<span style="display:inline-block; background:${config.bg}; color:${config.color}; border:1px solid ${config.border}; padding:4px 10px; border-radius:20px; font-size:0.85em; font-weight:bold; box-shadow:0 1px 3px rgba(0,0,0,0.1);">${config.label} (${upperCode})</span>` };
}

// 💡 2. 主搜尋邏輯
searchBtn.addEventListener('click', async () => {
    const keyword = fishInput.value.trim();
    if (!keyword) return;

    resultDiv.innerHTML = `<p style="text-align:center; color:var(--primary-blue); font-weight:bold;">🌊 正在檢索物種並載入保育評估資料...</p>`;

    try {
        const matchUrl = `https://api.taicol.tw/v2/nameMatch?name=${encodeURIComponent(keyword)}&best=no&bio_group=魚類`;
        const commonUrl = `https://api.taicol.tw/v2/taxon?common_name=${encodeURIComponent(keyword)}`;
        const groupUrl = `https://api.taicol.tw/v2/taxon?taxon_group=${encodeURIComponent(keyword)}`;

        const [matchRes, commonRes, groupRes] = await Promise.all([
            fetch(`https://corsproxy.io/?${encodeURIComponent(matchUrl)}`).then(r => r.json()).catch(() => ({ data: [] })),
            fetch(`https://corsproxy.io/?${encodeURIComponent(commonUrl)}`).then(r => r.json()).catch(() => ({ data: [] })),
            fetch(`https://corsproxy.io/?${encodeURIComponent(groupUrl)}`).then(r => r.json()).catch(() => ({ data: [] }))
        ]);

        const resultMap = new Map();
        const addTaxonData = (dataList) => {
            if (dataList) dataList.forEach(item => { if (item.kingdom === 'Animalia') resultMap.set(item.taxon_id, item); });
        };
        addTaxonData(commonRes.data);
        addTaxonData(groupRes.data);

        const matchIdsToFetch = [];
        if (matchRes.data) {
            matchRes.data.forEach(item => { if (!resultMap.has(item.taxon_id)) matchIdsToFetch.push(item.taxon_id); });
        }

        const detailPromises = matchIdsToFetch.slice(0, 15).map(async (tid) => {
            const detailUrl = `https://api.taicol.tw/v2/taxon?taxon_id=${tid}`;
            try {
                const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(detailUrl)}`);
                const json = await res.json();
                return json.data ? json.data[0] : null;
            } catch (e) { return null; }
        });

        const fetchedDetails = await Promise.all(detailPromises);
        fetchedDetails.forEach(detail => {
            if (detail && detail.kingdom === 'Animalia') resultMap.set(detail.taxon_id, detail);
        });

        let fishList = Array.from(resultMap.values()).filter(fish => fish.rank === 'Species');

        if (fishList.length === 0) {
            resultDiv.innerHTML = `<div style="padding:20px; text-align:center; background:#fff3f3; color:var(--danger-red); border-radius:12px; border: 1px solid #ffcdd2;">❌ 找不到與「${keyword}」相關的物種 (Species) 紀錄。</div>`;
            return;
        }

        // 💡 3. 使用乾淨的 Class 渲染 HTML，並在底部加入資料來源
        let htmlContent = `<p style="margin-bottom:20px; color:var(--text-muted); font-weight:bold;">共找到 ${fishList.length} 筆物種資料：</p>`;
        
        htmlContent += fishList.map(fish => {
            const sciName = fish.simple_name || fish.scientific_name || "Unknown";
            const alienMap = { 'native': '原生種', 'naturalized': '歸化種', 'invasive': '入侵種', 'cultured': '栽培豢養/養殖' };
            const alienStatus = fish.alien_type ? (alienMap[fish.alien_type] || fish.alien_type) : '未標示';

            const habitats = [];
            if (fish.is_terrestrial) habitats.push('陸生');
            if (fish.is_freshwater) habitats.push('淡水');
            if (fish.is_brackish) habitats.push('半鹹水');
            if (fish.is_marine) habitats.push('海洋');
            const habitatStr = habitats.length > 0 ? habitats.join('、') : '未知';

            const citesTag = fish.cites ? `<span style="display:inline-block; background:#1976d2; color:white; padding:4px 10px; border-radius:20px; font-size:0.85em; font-weight:bold;">附錄 ${fish.cites}</span>` : '<span style="color:#aaa; font-size:0.85em;">無紀錄</span>';
            const iucnTag = getConservationStyle(fish.iucn).html;
            const redlistTag = getConservationStyle(fish.redlist).html;

            const inTaiwan = fish.is_in_taiwan ? '<span style="color:#2e7d32; font-weight:bold;">✔</span>' : '<span style="color:var(--danger-red); font-weight:bold;">✖</span>';
            const isEndemic = fish.is_endemic ? '<span style="color:#2e7d32; font-weight:bold;">✔</span>' : '<span style="color:#999;">✖</span>';

            return `
                <div class="fish-card">
                    <h3 class="fish-title">🐟 ${fish.common_name_c || '未知中文名'}</h3>
                    <div class="fish-sci-name">${sciName}</div>
                    
                    <div class="fish-aliases">
                        <strong>別名：</strong> ${fish.alternative_name_c || '無'}
                    </div>

                    <div class="data-grid">
                        <div class="data-item"><strong>地位：</strong> ${fish.taxon_status === 'accepted' ? '有效名' : '非有效名'}</div>
                        <div class="data-item"><strong>棲地：</strong> <span style="color:var(--primary-blue); font-weight:500;">${habitatStr}</span></div>
                        <div class="data-item"><strong>分布：</strong> ${inTaiwan} 臺灣 | ${isEndemic} 特有</div>
                        <div class="data-item"><strong>性質：</strong> ${alienStatus}</div>
                    </div>

                    <div class="conservation-box">
                        <div class="conservation-title">🛡️ 保育與受威脅狀態</div>
                        <div class="conservation-tags">
                            <div class="tag-group"><span class="tag-label">IUCN 紅皮書</span>${iucnTag}</div>
                            <div class="tag-group"><span class="tag-label">臺灣紅皮書</span>${redlistTag}</div>
                            <div class="tag-group"><span class="tag-label">華盛頓公約</span>${citesTag}</div>
                        </div>
                    </div>

                    <div class="action-buttons">
                        <button class="btn-wiki" onclick="fetchWikiData('${sciName}', this)">📸 百科圖文</button>
                        <a class="btn-fishbase" href="https://www.fishbase.se/summary/${sciName.replace(/\s+/g, '-')}" target="_blank">➔ 前往 FishBase</a>
                    </div>
                    <div class="wiki-content"></div>
                </div>
            `;
        }).join('');

        // 💡 加入專業的版權與資料來源宣告
        htmlContent += `
            <div class="data-credits">
                資料來源：<a href="https://taicol.tw/" target="_blank">臺灣物種名錄 (TaiCOL)</a> | 
                <a href="https://www.fishbase.se/" target="_blank">世界魚類資料庫 (FishBase)</a> | 
                <a href="https://zh.wikipedia.org/" target="_blank">維基百科 (Wikipedia)</a>
                <br><br>
                <small>※ 系統透過開放 API 介接，實際物種資訊請以官方發布為準。</small>
            </div>
        `;

        resultDiv.innerHTML = htmlContent;

    } catch (error) {
        console.error("搜尋錯誤:", error);
        resultDiv.innerHTML = `<div style="color:red; text-align:center; padding:20px;">⚠️ API 連線逾時，請重試。</div>`;
    }
});