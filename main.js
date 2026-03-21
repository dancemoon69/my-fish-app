const searchBtn = document.querySelector('#searchBtn');
const fishInput = document.querySelector('#fishName');
const resultDiv = document.querySelector('#result');

fishInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); searchBtn.click(); } });

// 💡 1. 維基百科描述
window.fetchWikiData = async function(sciName, btnElement) {
    const targetDiv = btnElement.parentElement.nextElementSibling;
    btnElement.innerHTML = '⏳ 載入中...';
    btnElement.disabled = true;
    targetDiv.style.display = 'block';
    targetDiv.innerHTML = '正在載入百科描述...';

    try {
        const wikiTitle = sciName.replace(/\s+/g, '_');
        let res = await fetch(`https://zh.wikipedia.org/api/rest_v1/page/summary/${wikiTitle}`);
        if (!res.ok) res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${wikiTitle}`);
        const data = await res.json();
        targetDiv.innerHTML = `<div><p><strong>📖 百科摘要：</strong></p><p>${data.extract || '暫無詳細說明。'}</p><div style="text-align: right; margin-top:10px;"><a href="${data.content_urls.desktop.page}" target="_blank" style="color: #0077be; font-weight: bold; text-decoration: none;">➔ 閱讀完整百科</a></div></div>`;
        btnElement.style.display = 'none';
    } catch (error) {
        targetDiv.innerHTML = '⚠️ 無法取得該學名的百科資料。';
        btnElement.innerHTML = '📸 百科描述';
        btnElement.disabled = false;
    }
};

// 💡 2. 保育分級轉換器
function getStatusHtml(code) {
    if (!code || code === 'null') return '<span style="color:#aaa; font-weight:bold; font-size:0.85em; display:inline-block; padding:3px 0;">無紀錄</span>';
    const upper = code.toUpperCase();
    const map = { 'EX': '絕滅', 'EW': '野外絕滅', 'RE': '區域滅絕', 'CR': '極危', 'EN': '瀕危', 'VU': '易危', 'NT': '近危', 'LC': '無危', 'NCR': '極危', 'NEN': '瀕危', 'NVU': '易危', 'NNT': '近危', 'NLC': '無危', 'DD': '數據缺乏' };
    const label = map[upper] || upper;
    let color = '#4caf50'; 
    if (upper.includes('CR') || upper.includes('EN')) color = '#d32f2f'; 
    else if (upper.includes('VU')) color = '#ff9800'; 
    else if (upper.includes('NT')) color = '#8bc34a'; 
    else if (upper.includes('EX') || upper.includes('EW') || upper.includes('RE')) color = '#000';
    
    return `<span style="background:${color}; color:white; padding:4px 12px; border-radius:20px; font-size:0.85em; font-weight:bold; box-shadow: 0 2px 4px rgba(0,0,0,0.1); white-space: nowrap; display: inline-block;">${label} (${upper})</span>`;
}

// 💡 3. 主搜尋邏輯
searchBtn.addEventListener('click', async () => {
    const keyword = fishInput.value.trim();
    if (!keyword) return;

    searchBtn.disabled = true;
    resultDiv.innerHTML = '<p style="text-align:center; margin-top:50px; font-weight:bold; color:#0077be;">🌊 正在極速檢索圖鑑資料...</p>';

    try {
        const matchUrl = `https://corsproxy.io/?${encodeURIComponent(`https://api.taicol.tw/v2/nameMatch?name=${keyword}&best=no&bio_group=魚類`)}`;
        const commonUrl = `https://corsproxy.io/?${encodeURIComponent(`https://api.taicol.tw/v2/common_name=${keyword}`)}`;
        const groupUrl = `https://corsproxy.io/?${encodeURIComponent(`https://api.taicol.tw/v2/taxon?taxon_group=${keyword}`)}`;

        const [mR, cR, gR] = await Promise.all([
            fetch(matchUrl).then(r => r.json()).catch(() => ({data:[]})),
            fetch(commonUrl).then(r => r.json()).catch(() => ({data:[]})),
            fetch(groupUrl).then(r => r.json()).catch(() => ({data:[]}))
        ]);

        const resultMap = new Map();
        // 🚀 移除 Kingdom 過濾，全面放行
        const combine = (list) => { if (list) list.forEach(item => { resultMap.set(item.taxon_id, item); }); };
        combine(cR.data); combine(gR.data);

        const ids = new Set();
        if (mR.data) mR.data.forEach(item => { if (!resultMap.has(item.taxon_id)) ids.add(item.taxon_id); });

        const details = await Promise.all(Array.from(ids).slice(0, 25).map(async (tid) => {
            const r = await fetch(`https://corsproxy.io/?${encodeURIComponent(`https://api.taicol.tw/v2/taxon?taxon_id=${tid}`)}`);
            const j = await r.json();
            return j.data ? j.data[0] : null;
        }));
        details.forEach(d => { if (d) resultMap.set(d.taxon_id, d); });

        // 🚀 核心過濾：只保留「種」與「亞種」，移除所有其餘排除條件
        let list = Array.from(resultMap.values()).filter(f => {
            const rank = (f.rank || '').toLowerCase();
            const validRanks = ['species', 'subspecies', 'variety', 'form'];
            return validRanks.includes(rank);
        });

        if (list.length === 0) {
            resultDiv.innerHTML = '<p style="text-align:center; color:red; margin-top:50px;">❌ 找不到具體的種或亞種資料。</p>';
            searchBtn.disabled = false;
            return;
        }

        const alienMap = { 'native': '原生', 'naturalized': '歸化', 'invasive': '入侵', 'cultured': '養殖' };
        
        resultDiv.innerHTML = list.map(fish => {
            const sciName = fish.scientific_name || fish.simple_name;
            const citesTag = fish.cites ? `<span style="background:#1976d2; color:white; padding:4px 12px; border-radius:20px; font-size:0.85em; font-weight:bold; box-shadow: 0 2px 4px rgba(0,0,0,0.1); white-space: nowrap; display: inline-block;">附錄 ${fish.cites}</span>` : '<span style="color:#aaa; font-weight:bold; font-size:0.85em; display:inline-block; padding:3px 0;">無紀錄</span>';
            const rankLabel = (fish.rank || '').toLowerCase() === 'species' ? '種' : '亞種';
            
            // 🚀 生成外部連結
            const slug = sciName.replace(/\s+/g, '-');
            const fishBaseUrl = `https://www.fishbase.se/summary/${slug}`;
            const seaLifeUrl = `https://sealifebase.ca/summary/${slug}`;

            return `
                <div class="fish-card">
                    <div class="fish-img-container" id="img-${fish.taxon_id}">
                        <div style="color:#eee; font-size:0.8em;">圖片載入中...</div>
                    </div>
                    <div class="fish-info">
                        <h3 class="fish-title">🐟 ${fish.common_name_c || '未命名'}</h3>
                        <div class="fish-sci-name">${sciName}</div>
                        <div class="aliases-box">別名：${fish.alternative_name_c || '無'}</div>
                        <div class="data-grid">
                            <div class="data-item"><strong>階層</strong>${rankLabel}</div>
                            <div class="data-item"><strong>性質</strong>${alienMap[fish.alien_type] || '未標示'}</div>
                            <div class="data-item"><strong>分佈</strong>${fish.is_in_taiwan ? '✔ 臺灣' : '✖ 國外'}</div>
                            <div class="data-item"><strong>特有</strong>${fish.is_endemic ? '✔ 是' : '✖ 否'}</div>
                        </div>
                        
                        <div class="conservation-section">
                            <div class="conservation-tags">
                                <div class="tag-group">
                                    <span class="tag-label">IUCN 全球</span>
                                    ${getStatusHtml(fish.iucn)}
                                </div>
                                <div class="tag-group">
                                    <span class="tag-label">臺灣紅皮書</span>
                                    ${getStatusHtml(fish.redlist)}
                                </div>
                                <div class="tag-group">
                                    <span class="tag-label">華盛頓公約</span>
                                    ${citesTag}
                                </div>
                            </div>
                        </div>

                        <div class="action-buttons">
                            <button class="btn btn-wiki" onclick="fetchWikiData('${sciName}', this)">📸 百科描述</button>
                            <a class="btn btn-taicol" href="https://taicol.tw/taxon/${fish.taxon_id}" target="_blank">🏷️ TaiCOL</a>
                            <a class="btn btn-fishbase" href="${fishBaseUrl}" target="_blank">➔ FishBase</a>
                            <a class="btn btn-sealife" href="${seaLifeUrl}" target="_blank">➔ SeaLifeBase</a>
                        </div>
                        <div class="wiki-content"></div>
                    </div>
                </div>
            `;
        }).join('');

        // 圖片異步載入
        list.forEach(async (fish) => {
            const sciName = fish.scientific_name || fish.simple_name;
            const imgDiv = document.getElementById(`img-${fish.taxon_id}`);
            try {
                const res = await fetch(`https://zh.wikipedia.org/api/rest_v1/page/summary/${sciName.replace(/\s+/g, '_')}`);
                const data = await res.json();
                if (data.thumbnail) {
                    imgDiv.innerHTML = `<img src="${data.thumbnail.source}" alt="${sciName}" onerror="this.parentElement.style.display='none'">`;
                } else {
                    imgDiv.innerHTML = `<div style="color:#eee; font-size:0.7em;">無生態照</div>`;
                }
            } catch (e) { imgDiv.innerHTML = ``; }
        });

    } catch (error) {
        resultDiv.innerHTML = '<p style="text-align:center; color:red;">⚠️ 連線失敗，請檢查網路狀態。</p>';
    } finally {
        searchBtn.disabled = false;
    }
});