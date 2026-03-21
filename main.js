const searchBtn = document.querySelector('#searchBtn');
const fishInput = document.querySelector('#fishName');
const resultDiv = document.querySelector('#result');

fishInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); searchBtn.click(); } });

// 💡 1. 維基百科雙語描述 (zh -> en)
window.fetchWikiData = async function(sciName, btnElement) {
    const targetDiv = btnElement.parentElement.nextElementSibling;
    btnElement.innerHTML = '⏳ 檢索中...';
    btnElement.disabled = true;
    targetDiv.style.display = 'block';
    targetDiv.innerHTML = '正在跨語言檢索百科描述...';

    const slug = sciName.replace(/\s+/g, '_');
    
    try {
        let res = await fetch(`https://zh.wikipedia.org/api/rest_v1/page/summary/${slug}`);
        let langLabel = "中文版";
        
        if (!res.ok) {
            res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`);
            langLabel = "英文版";
        }

        if (!res.ok) throw new Error('雙語 Wiki 均查無資料');
        
        const data = await res.json();
        targetDiv.innerHTML = `
            <div>
                <p><strong>📖 百科摘要 (<span style="color:var(--primary-blue)">${langLabel}</span>)：</strong></p>
                <p>${data.extract || '暫無詳細說明。'}</p>
                <div style="text-align: right; margin-top:10px;">
                    <a href="${data.content_urls.desktop.page}" target="_blank" style="color: #0077be; font-weight: bold; text-decoration: none;">➔ 閱讀完整百科</a>
                </div>
            </div>
        `;
        btnElement.style.display = 'none';
    } catch (error) {
        targetDiv.innerHTML = '⚠️ 抱歉，中英文維基百科中暫無此物種的直接文獻。';
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

        // 🚀 核心過濾器 (排除病毒與非特定階層)
        let list = Array.from(resultMap.values()).filter(f => {
            const rank = (f.rank || '').toLowerCase();
            const validRanks = ['species', 'subspecies', 'variety', 'form'];
            if (!validRanks.includes(rank)) return false;

            const dataStr = JSON.stringify(f).toLowerCase();
            const forbiddenTerms = ['fungi', 'archaea', 'bacteria', 'virus', 'viruses', 'duplodnaviria', 'monodnaviria', 'riboviria', 'ribozyviria', 'varidnaviria', 'incertae sedis'];
            if (forbiddenTerms.some(term => dataStr.includes(term))) return false;

            return true;
        });

        if (list.length === 0) {
            resultDiv.innerHTML = '<p style="text-align:center; color:red; margin-top:50px;">❌ 找不到符合條件的物種資料。</p>';
            searchBtn.disabled = false;
            return;
        }

        const alienMap = { 'native': '原生', 'naturalized': '歸化', 'invasive': '入侵', 'cultured': '養殖' };
        
        resultDiv.innerHTML = list.map(fish => {
            const sciName = fish.scientific_name || fish.simple_name;
            const citesTag = fish.cites ? `<span style="background:#1976d2; color:white; padding:3px 10px; border-radius:20px; font-size:0.85em; font-weight:bold; box-shadow: 0 2px 4px rgba(0,0,0,0.1); white-space: nowrap; display: inline-block;">附錄 ${fish.cites}</span>` : '<span style="color:#aaa; font-weight:bold; font-size:0.85em; display:inline-block; padding:3px 0;">無紀錄</span>';
            const rankLabel = (fish.rank || '').toLowerCase() === 'species' ? '種' : '亞種';
            
            // 🚀 生成外部連結
            const slug = sciName.replace(/\s+/g, '-');
            const fishDbUrl = `https://fishdb.sinica.edu.tw/chi/species.php?science=${sciName.replace(/\s+/g, '+')}`;
            const faoUrl = `https://www.fao.org/fishery/en/aqspecies/search?commonName=&scientificName=${encodeURIComponent(sciName)}`; // 🚀 新增 FAO 連結

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
                            <a class="btn btn-fishdb" href="${fishDbUrl}" target="_blank">🏛️ FishDB</a>
                            <a class="btn btn-fishbase" href="https://www.fishbase.se/summary/${slug}" target="_blank">➔ FishBase</a>
                            <a class="btn btn-sealife" href="https://sealifebase.ca/summary/${slug}" target="_blank">➔ SeaLifeBase</a>
                            <a class="btn btn-fao" href="${faoUrl}" target="_blank">🔱 FAO</a>
                        </div>
                        <div class="wiki-content"></div>
                    </div>
                </div>
            `;
        }).join('');

        // 圖片載入
        list.forEach(async (fish) => {
            const sciName = fish.scientific_name || fish.simple_name;
            const imgDiv = document.getElementById(`img-${fish.taxon_id}`);
            const slug = sciName.replace(/\s+/g, '_');
            try {
                let wikiRes = await fetch(`https://zh.wikipedia.org/api/rest_v1/page/summary/${slug}`);
                if (!wikiRes.ok) wikiRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`);
                const data = await wikiRes.json();
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