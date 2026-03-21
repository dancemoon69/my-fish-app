const searchBtn = document.querySelector('#searchBtn');
const fishInput = document.querySelector('#fishName');
const resultDiv = document.querySelector('#result');

// 💡 0. 支援 Enter 鍵
fishInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault(); 
        searchBtn.click();
    }
});

// 💡 1. 百科摘要載入
window.fetchWikiData = async function(sciName, btnElement) {
    const targetDiv = btnElement.parentElement.nextElementSibling;
    const originalText = btnElement.innerHTML;
    
    btnElement.innerHTML = '⏳ 載入中...';
    btnElement.disabled = true;
    targetDiv.style.display = 'block';
    targetDiv.innerHTML = '正在載入百科描述...';

    try {
        const wikiTitle = sciName.replace(/\s+/g, '_');
        let res = await fetch(`https://zh.wikipedia.org/api/rest_v1/page/summary/${wikiTitle}`);
        if (!res.ok) res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${wikiTitle}`);
        const data = await res.json();
        
        targetDiv.innerHTML = `
            <div style="text-align: justify;">
                <p><strong>📖 百科摘要：</strong></p>
                <p>${data.extract || '暫無詳細說明。'}</p>
                <div style="text-align: right; margin-top: 10px;">
                    <a href="${data.content_urls.desktop.page}" target="_blank" style="color: #0077be; font-weight: bold; text-decoration: none;">➔ 閱讀全文</a>
                </div>
            </div>
        `;
        btnElement.style.display = 'none';
    } catch (error) {
        targetDiv.innerHTML = '⚠️ 無法取得該學名的百科資料。';
        btnElement.innerHTML = originalText;
        btnElement.disabled = false;
    }
};

// 💡 2. 保育分級轉換
function getStatusHtml(code) {
    if (!code || code === 'null') return '<span style="color:#aaa">無紀錄</span>';
    const upper = code.toUpperCase();
    const map = {
        'EX': '絕滅', 'EW': '野外絕滅', 'RE': '區域滅絕',
        'CR': '極危', 'EN': '瀕危', 'VU': '易危', 'NT': '近危', 'LC': '無危',
        'NCR': '極危', 'NEN': '瀕危', 'NVU': '易危', 'NNT': '近危', 'NLC': '無危', 'DD': '數據缺乏'
    };
    const label = map[upper] || upper;
    const color = (upper.includes('CR') || upper.includes('EN')) ? '#d32f2f' : (upper.includes('VU') ? '#ff9800' : '#4caf50');
    return `<span style="background:${color}; color:white; padding:3px 10px; border-radius:15px; font-size:0.85em; font-weight:bold;">${label} (${upper})</span>`;
}

// 💡 3. 主搜尋程式
searchBtn.addEventListener('click', async () => {
    const keyword = fishInput.value.trim();
    if (!keyword) return;

    searchBtn.disabled = true;
    resultDiv.innerHTML = '<p style="text-align:center;">🌊 正在檢索名錄資料與生態圖片...</p>';

    try {
        const matchUrl = `https://corsproxy.io/?${encodeURIComponent(`https://api.taicol.tw/v2/nameMatch?name=${keyword}&best=no&bio_group=魚類`)}`;
        const commonUrl = `https://corsproxy.io/?${encodeURIComponent(`https://api.taicol.tw/v2/taxon?common_name=${keyword}`)}`;
        const groupUrl = `https://corsproxy.io/?${encodeURIComponent(`https://api.taicol.tw/v2/taxon?taxon_group=${keyword}`)}`;

        const [mR, cR, gR] = await Promise.all([
            fetch(matchUrl).then(r => r.json()),
            fetch(commonUrl).then(r => r.json()),
            fetch(groupUrl).then(r => r.json())
        ]);

        const resultMap = new Map();
        const combine = (list) => {
            if (list) list.forEach(item => {
                if (!item.kingdom || item.kingdom === 'Animalia') resultMap.set(item.taxon_id, item);
            });
        };
        combine(cR.data); combine(gR.data);

        const ids = new Set();
        if (mR.data) mR.data.forEach(item => { if (!resultMap.has(item.taxon_id)) ids.add(item.taxon_id); });

        const details = await Promise.all(Array.from(ids).slice(0, 20).map(async (tid) => {
            const r = await fetch(`https://corsproxy.io/?${encodeURIComponent(`https://api.taicol.tw/v2/taxon?taxon_id=${tid}`)}`);
            const j = await r.json();
            return j.data ? j.data[0] : null;
        }));
        details.forEach(d => { if (d) resultMap.set(d.taxon_id, d); });

        // 排除昆蟲
        let list = Array.from(resultMap.values()).filter(f => {
            const str = JSON.stringify(f).toUpperCase();
            return !str.includes('INSECTA') && !str.includes('昆蟲');
        });

        if (list.length === 0) {
            resultDiv.innerHTML = '<p style="text-align:center; color:red;">❌ 找不到對應的資料。</p>';
            searchBtn.disabled = false;
            return;
        }

        // 渲染結果
        const cardsHtml = await Promise.all(list.map(async (fish) => {
            const sciName = fish.scientific_name || fish.simple_name;
            
            // 🖼️ 抓取縮圖
            let imageUrl = '';
            try {
                const wikiRes = await fetch(`https://zh.wikipedia.org/api/rest_v1/page/summary/${sciName.replace(/\s+/g, '_')}`);
                const wikiData = await wikiRes.json();
                if (wikiData.thumbnail) imageUrl = wikiData.thumbnail.source;
            } catch (e) {}

            const imgHtml = imageUrl 
                ? `<div class="fish-img-container"><img src="${imageUrl}" onerror="this.parentElement.style.display='none'"></div>`
                : '';

            const alienMap = { 'native': '原生', 'naturalized': '歸化', 'invasive': '入侵', 'cultured': '養殖' };
            
            return `
                <div class="fish-card">
                    ${imgHtml}
                    <div class="fish-info">
                        <h3 class="fish-title">🐟 ${fish.common_name_c || '未命名'}</h3>
                        <div class="fish-sci-name">${sciName}</div>
                        <div class="fish-aliases">別名：${fish.alternative_name_c || '無'}</div>
                        <div class="data-grid">
                            <div><strong>地位：</strong> ${fish.taxon_status === 'accepted' ? '有效名' : '非有效名'}</div>
                            <div><strong>性質：</strong> ${alienMap[fish.alien_type] || '未標示'}</div>
                            <div><strong>分布：</strong> ${fish.is_in_taiwan ? '✔ 臺灣' : '✖ 國外'}</div>
                            <div><strong>特有：</strong> ${fish.is_endemic ? '✔ 是' : '✖ 否'}</div>
                        </div>
                        <div class="conservation-box">
                            <div class="conservation-title">🛡️ 保育狀態</div>
                            <div class="conservation-tags">
                                <div class="tag-group"><span class="tag-label">IUCN</span>${getStatusHtml(fish.iucn)}</div>
                                <div class="tag-group"><span class="tag-label">紅皮書</span>${getStatusHtml(fish.redlist)}</div>
                            </div>
                        </div>
                        <div class="action-buttons">
                            <button class="btn btn-wiki" onclick="fetchWikiData('${sciName}', this)">📸 百科圖文</button>
                            <a class="btn btn-taicol" href="https://taicol.tw/taxon/${fish.taxon_id}" target="_blank">🏷️ TaiCOL</a>
                            <a class="btn btn-fishbase" href="https://www.fishbase.se/summary/${sciName.replace(/\s+/g, '-')}" target="_blank">➔ FishBase</a>
                        </div>
                        <div class="wiki-content"></div>
                    </div>
                </div>
            `;
        }));

        resultDiv.innerHTML = cardsHtml.join('');

    } catch (error) {
        resultDiv.innerHTML = '<p style="text-align:center; color:red;">⚠️ 連線失敗，請稍後再試。</p>';
    } finally {
        searchBtn.disabled = false;
    }
});