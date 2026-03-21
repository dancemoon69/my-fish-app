const searchBtn = document.querySelector('#searchBtn');
const fishInput = document.querySelector('#fishName');
const resultDiv = document.querySelector('#result');

// 💡 百科圖鑑引擎 (直連版)
window.fetchWikiData = async function(sciName, btnElement) {
    const targetDiv = btnElement.parentElement.nextElementSibling;
    const originalBtnText = btnElement.innerHTML;
    
    btnElement.innerHTML = '⏳ 載入中...';
    btnElement.disabled = true;
    targetDiv.style.display = 'block';
    targetDiv.innerHTML = '<div style="text-align:center; color:#666;">正在載入百科文獻...</div>';

    const wikiTitle = sciName.replace(/\s+/g, '_');
    
    try {
        let res = await fetch(`https://zh.wikipedia.org/api/rest_v1/page/summary/${wikiTitle}`);
        if (!res.ok) res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${wikiTitle}`);
        if (!res.ok) throw new Error('Wiki查無資料');
        
        const data = await res.json();
        let imgHtml = (data.thumbnail && data.thumbnail.source) 
            ? `<img src="${data.thumbnail.source}" style="width: 120px; height: 120px; object-fit: cover; border-radius: 8px; float: right; margin: 0 0 10px 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">` 
            : '';

        targetDiv.innerHTML = `
            <div style="text-align: justify; overflow: hidden; padding-top:10px;">
                ${imgHtml}
                <p style="margin: 0 0 8px 0; color: #2e7d32; font-weight:bold;">📖 百科摘要 (${data.title})：</p>
                <p style="margin: 0;">${data.extract || '暫無詳細說明。'}</p>
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

// 💡 燈號轉換器
function getConservationStyle(code) {
    if (!code || code === 'null') return { label: '無紀錄', bg: '#f5f5f5', color: '#aaa', border: '#eee' };
    const upperCode = code.toUpperCase().replace(/^N/, ''); 
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
        'NE': { label: '未評估', bg: '#e0e0e0', color: '#000', border: '#bdbdbd' },
        'NA': { label: '不適用', bg: '#e0e0e0', color: '#000', border: '#bdbdbd' }
    };
    const config = styleMap[upperCode] || { label: upperCode, bg: '#ffffff', color: '#000', border: '#ccc' };
    return { html: `<span style="display:inline-block; background:${config.bg}; color:${config.color}; border:1px solid ${config.border}; padding:4px 10px; border-radius:20px; font-size:0.85em; font-weight:bold;">${config.label} (${upperCode})</span>` };
}

// 💡 核心搜尋邏輯
searchBtn.addEventListener('click', async () => {
    const keyword = fishInput.value.trim();
    if (!keyword) {
        console.log("⚠️ 搜尋框是空的");
        return;
    }

    console.log(`🚀 開始搜尋關鍵字: ${keyword}`);
    searchBtn.disabled = true;
    resultDiv.innerHTML = `<p style="text-align:center; color:var(--primary-blue); font-weight:bold;">🌊 正在直連 TaiCOL 資料庫進行檢索...</p>`;

    try {
        // 🚨 拔除所有 corsproxy，改為直接連線官方 API
        const matchUrl = `https://api.taicol.tw/v2/nameMatch?name=${encodeURIComponent(keyword)}&best=no&bio_group=魚類`;
        const commonUrl = `https://api.taicol.tw/v2/taxon?common_name=${encodeURIComponent(keyword)}`;
        const groupUrl = `https://api.taicol.tw/v2/taxon?taxon_group=${encodeURIComponent(keyword)}`;

        console.log("📡 正在發送 API 請求...");
        
        const [matchRes, commonRes, groupRes] = await Promise.all([
            fetch(matchUrl).then(r => r.json()).catch(() => ({ data: [] })),
            fetch(commonUrl).then(r => r.json()).catch(() => ({ data: [] })),
            fetch(groupUrl).then(r => r.json()).catch(() => ({ data: [] }))
        ]);

        const resultMap = new Map();
        
        if (commonRes.data) commonRes.data.forEach(item => { if (!item.kingdom || item.kingdom === 'Animalia') resultMap.set(item.taxon_id, item); });
        if (groupRes.data) groupRes.data.forEach(item => { if (!item.kingdom || item.kingdom === 'Animalia') resultMap.set(item.taxon_id, item); });

        const matchIdsToFetch = new Set();
        if (matchRes.data) {
            matchRes.data.forEach(item => { 
                if (!resultMap.has(item.taxon_id)) matchIdsToFetch.add(item.taxon_id); 
            });
        }

        console.log(`🔍 需要反查詳細資料的 ID 數量: ${matchIdsToFetch.size}`);

        const detailPromises = Array.from(matchIdsToFetch).slice(0, 30).map(async (tid) => {
            try {
                const res = await fetch(`https://api.taicol.tw/v2/taxon?taxon_id=${tid}`);
                const json = await res.json();
                return json.data ? json.data[0] : null;
            } catch (e) { return null; }
        });

        const fetchedDetails = await Promise.all(detailPromises);
        fetchedDetails.forEach(detail => {
            if (detail && (!detail.kingdom || detail.kingdom === 'Animalia')) resultMap.set(detail.taxon_id, detail);
        });

        console.log(`✅ 成功取得所有資料，開始進行過濾，總數: ${resultMap.size}`);

        // 💡 科學防蟲過濾器
        let fishList = Array.from(resultMap.values()).filter(fish => {
            const validRanks = ['species', 'subspecies', 'variety', 'form'];
            const currentRank = fish.rank ? fish.rank.toLowerCase() : '';
            if (currentRank && !validRanks.includes(currentRank)) return false;

            const classStr = (fish.class_c || '') + (fish.class || '');
            const phylumStr = (fish.phylum_c || '') + (fish.phylum || '');
            if (['鳥', '哺乳', '爬蟲', '兩棲', '昆蟲', '蛛形', '軟甲', '腹足', '雙殼', '頭足'].some(c => classStr.includes(c))) return false;
            if (['節肢動物', '軟體動物', '環節動物', '棘皮動物', '刺絲胞'].some(p => phylumStr.includes(p))) return false;

            if (fish.is_terrestrial && !fish.is_freshwater && !fish.is_marine && !fish.is_brackish) return false;

            const nameStr = (fish.family_c || '') + (fish.common_name_c || '');
            if (['鯨', '鱷', '墨魚', '魷魚', '鮑魚', '章魚', '甲魚', '海豚', '儒艮'].some(w => nameStr.includes(w))) return false;

            return true;
        });

        if (fishList.length === 0) {
            resultDiv.innerHTML = `<div style="padding:20px; text-align:center; background:#fff3f3; color:var(--danger-red); border-radius:12px; border: 1px solid #ffcdd2;">❌ 找不到與「${keyword}」相關的「魚類」紀錄。<br><small style="color:#888;">請確認輸入的名稱是否正確，或嘗試其他俗名。</small></div>`;
            searchBtn.disabled = false;
            return;
        }

        // 💡 渲染畫面
        let htmlContent = `<p style="margin-bottom:20px; color:var(--text-muted); font-weight:bold;">共過濾出 ${fishList.length} 筆魚類資料：</p>`;
        
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
                    <div class="fish-aliases"><strong>別名：</strong> ${fish.alternative_name_c || '無'}</div>
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
                    <div class="action-buttons" style="display: flex; gap: 10px; border-top: 1px dashed #e0e0e0; padding-top: 20px; flex-wrap: wrap;">
                        <button class="btn-wiki" onclick="fetchWikiData('${sciName}', this)" style="flex: 1; min-width: 100px; padding: 12px; border-radius: 8px; font-weight: bold; background: var(--primary-blue); color: white; border: none; cursor: pointer;">📸 百科</button>
                        <a href="https://taicol.tw/taxon/${fish.taxon_id}" target="_blank" style="flex: 1; min-width: 100px; padding: 12px; border-radius: 8px; font-weight: bold; background: #ef6c00; color: white; text-align: center; text-decoration: none;">🏷️ TaiCOL</a>
                        <a href="https://www.fishbase.se/summary/${sciName.replace(/\s+/g, '-')}" target="_blank" style="flex: 1; min-width: 100px; padding: 12px; border-radius: 8px; font-weight: bold; background: var(--accent-green); color: white; text-align: center; text-decoration: none;">➔ FishBase</a>
                    </div>
                    <div class="wiki-content"></div>
                </div>
            `;
        }).join('');

        resultDiv.innerHTML = htmlContent;

    } catch (error) {
        console.error("❌ 搜尋發生嚴重錯誤:", error);
        resultDiv.innerHTML = `<div style="color:red; text-align:center; padding:20px; background:#fff3f3; border-radius:12px;">⚠️ 系統連線錯誤，請確認網路狀態或稍後再試。</div>`;
    } finally {
        searchBtn.disabled = false;
    }
});