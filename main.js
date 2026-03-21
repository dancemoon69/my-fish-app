const searchBtn = document.querySelector('#searchBtn');
const fishInput = document.querySelector('#fishName');
const resultDiv = document.querySelector('#result');

fishInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); searchBtn.click(); } });

// 💡 1. 維基百科描述 (按鈕觸發)
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
        targetDiv.innerHTML = `<div><p><strong>📖 百科摘要：</strong></p><p>${data.extract || '暫無詳細說明。'}</p><div style="text-align: right;"><a href="${data.content_urls.desktop.page}" target="_blank" style="color: #0077be; font-weight: bold; text-decoration: none;">➔ 閱讀全文</a></div></div>`;
        btnElement.style.display = 'none';
    } catch (error) {
        targetDiv.innerHTML = '⚠️ 無法取得該學名的百科資料。';
        btnElement.innerHTML = '📸 百科描述';
        btnElement.disabled = false;
    }
};

// 💡 2. 保育分級轉換
function getStatusHtml(code) {
    if (!code || code === 'null') return '<span style="color:#aaa">無紀錄</span>';
    const upper = code.toUpperCase();
    const map = { 'EX': '絕滅', 'EW': '野外絕滅', 'RE': '區域滅絕', 'CR': '極危', 'EN': '瀕危', 'VU': '易危', 'NT': '近危', 'LC': '無危', 'NCR': '極危', 'NEN': '瀕危', 'NVU': '易危', 'NNT': '近危', 'NLC': '無危', 'DD': '數據缺乏' };
    const label = map[upper] || upper;
    let color = '#4caf50';
    if (upper.includes('CR') || upper.includes('EN')) color = '#d32f2f';
    else if (upper.includes('VU')) color = '#ff9800';
    else if (upper.includes('NT')) color = '#8bc34a';
    return `<span style="background:${color}; color:white; padding:3px 10px; border-radius:15px; font-size:0.85em; font-weight:bold;">${label} (${upper})</span>`;
}

// 💡 3. 主搜尋邏輯 (速度優化版)
searchBtn.addEventListener('click', async () => {
    const keyword = fishInput.value.trim();
    if (!keyword) return;

    searchBtn.disabled = true;
    resultDiv.innerHTML = '<p style="text-align:center;">🌊 正在極速檢索物種名錄...</p>';

    try {
        const matchUrl = `https://corsproxy.io/?${encodeURIComponent(`https://api.taicol.tw/v2/nameMatch?name=${keyword}&best=no&bio_group=魚類`)}`;
        const commonUrl = `https://corsproxy.io/?${encodeURIComponent(`https://api.taicol.tw/v2/taxon?common_name=${keyword}`)}`;
        const groupUrl = `https://corsproxy.io/?${encodeURIComponent(`https://api.taicol.tw/v2/taxon?taxon_group=${keyword}`)}`;

        const [mR, cR, gR] = await Promise.all([
            fetch(matchUrl).then(r => r.json()).catch(() => ({data:[]})),
            fetch(commonUrl).then(r => r.json()).catch(() => ({data:[]})),
            fetch(groupUrl).then(r => r.json()).catch(() => ({data:[]}))
        ]);

        const resultMap = new Map();
        const combine = (list) => { if (list) list.forEach(item => { if (!item.kingdom || item.kingdom === 'Animalia') resultMap.set(item.taxon_id, item); }); };
        combine(cR.data); combine(gR.data);

        const ids = new Set();
        if (mR.data) mR.data.forEach(item => { if (!resultMap.has(item.taxon_id)) ids.add(item.taxon_id); });

        // 批量獲取詳細資料 (TaiCOL)
        const details = await Promise.all(Array.from(ids).slice(0, 25).map(async (tid) => {
            const r = await fetch(`https://corsproxy.io/?${encodeURIComponent(`https://api.taicol.tw/v2/taxon?taxon_id=${tid}`)}`);
            const j = await r.json();
            return j.data ? j.data[0] : null;
        }));
        details.forEach(d => { if (d) resultMap.set(d.taxon_id, d); });

        // 核心過濾：只留 Species 與 Subspecies，排除昆蟲
        let list = Array.from(resultMap.values()).filter(f => {
            const rank = (f.rank || '').toLowerCase();
            const validRanks = ['species', 'subspecies', 'variety', 'form'];
            if (!validRanks.includes(rank)) return false;
            const str = JSON.stringify(f).toUpperCase();
            return !str.includes('INSECTA') && !str.includes('昆蟲');
        });

        if (list.length === 0) {
            resultDiv.innerHTML = '<p style="text-align:center; color:red;">❌ 找不到具體的物種資料。</p>';
            searchBtn.disabled = false;
            return;
        }

        // 💡 渲染文字內容 (先出文字，不等待圖片，速度才快)
        const alienMap = { 'native': '原生', 'naturalized': '歸化', 'invasive': '入侵', 'cultured': '養殖' };
        
        resultDiv.innerHTML = list.map(fish => {
            const sciName = fish.scientific_name || fish.simple_name;
            const citesTag = fish.cites ? `<span style="background:#1976d2; color:white; padding:3px 10px; border-radius:15px; font-size:0.85em; font-weight:bold;">附錄 ${fish.cites}</span>` : '<span style="color:#aaa">無紀錄</span>';
            // 💡 修正判斷：不分大小寫
            const rankLabel = (fish.rank || '').toLowerCase() === 'species' ? '物種' : '亞種';

            return `
                <div class="fish-card" data-sci="${sciName}">
                    <div class="fish-img-container" id="img-${fish.taxon_id}">
                        <div style="color:#ccc; font-size:0.8em;">圖片載入中...</div>
                    </div>
                    <div class="fish-info">
                        <h3 class="fish-title">🐟 ${fish.common_name_c || '未命名'}</h3>
                        <div class="fish-sci-name">${sciName}</div>
                        <div style="font-size:0.9em; color:#666; background:#f8f9fa; padding:8px; border-radius:8px; margin-bottom:10px;">別名：${fish.alternative_name_c || '無'}</div>
                        <div class="data-grid">
                            <div><strong>階層：</strong> ${rankLabel}</div>
                            <div><strong>性質：</strong> ${alienMap[fish.alien_type] || '未標示'}</div>
                            <div><strong>分布：</strong> ${fish.is_in_taiwan ? '✔ 臺灣' : '✖ 國外'}</div>
                            <div><strong>特有：</strong> ${fish.is_endemic ? '✔ 是' : '✖ 否'}</div>
                        </div>
                        <div class="conservation-box">
                            <div class="conservation-title">🛡️ 保育狀態與公約</div>
                            <div class="conservation-tags">
                                <div class="tag-group"><span class="tag-label">IUCN</span>${getStatusHtml(fish.iucn)}</div>
                                <div class="tag-group"><span class="tag-label">臺灣紅皮書</span>${getStatusHtml(fish.redlist)}</div>
                                <div class="tag-group"><span class="tag-label">華盛頓公約</span>${citesTag}</div>
                            </div>
                        </div>
                        <div class="action-buttons">
                            <button class="btn btn-wiki" onclick="fetchWikiData('${sciName}', this)">📸 百科描述</button>
                            <a class="btn btn-taicol" href="https://taicol.tw/taxon/${fish.taxon_id}" target="_blank">🏷️ TaiCOL</a>
                            <a class="btn btn-fishbase" href="https://www.fishbase.se/summary/${sciName.replace(/\s+/g, '-')}" target="_blank">➔ FishBase</a>
                        </div>
                        <div class="wiki-content"></div>
                    </div>
                </div>
            `;
        }).join('');

        // 💡 4. [異步批次抓圖] 搜尋結果顯示後，才去維基百科抓圖，且不卡住 UI
        list.forEach(async (fish) => {
            const sciName = fish.scientific_name || fish.simple_name;
            const imgDiv = document.getElementById(`img-${fish.taxon_id}`);
            try {
                const res = await fetch(`https://zh.wikipedia.org/api/rest_v1/page/summary/${sciName.replace(/\s+/g, '_')}`);
                const data = await res.json();
                if (data.thumbnail) {
                    imgDiv.innerHTML = `<img src="${data.thumbnail.source}" alt="${sciName}" onerror="this.parentElement.style.display='none'">`;
                } else {
                    imgDiv.innerHTML = `<div style="color:#ddd; font-size:0.7em;">暫無生態照</div>`;
                }
            } catch (e) {
                imgDiv.innerHTML = `<div style="color:#ddd; font-size:0.7em;">載入失敗</div>`;
            }
        });

    } catch (error) {
        resultDiv.innerHTML = '<p style="text-align:center; color:red;">⚠️ 連線失敗，請稍後再試。</p>';
    } finally {
        searchBtn.disabled = false;
    }
});