const searchBtn = document.querySelector('#searchBtn');
const fishInput = document.querySelector('#fishName');
const resultDiv = document.querySelector('#result');

// 💡 1. 建立 FishBase 專用爬蟲引擎 (掛載到 window 供按鈕呼叫)
window.fetchFishBase = async function(sciName, btnElement) {
    const targetDiv = btnElement.nextElementSibling;
    const originalBtnText = btnElement.innerHTML;
    
    // 改變按鈕狀態，顯示載入中
    btnElement.innerHTML = '⏳ 正在潛入 FishBase 抓取...';
    btnElement.disabled = true;
    btnElement.style.background = '#999';
    targetDiv.style.display = 'block';
    targetDiv.innerHTML = '<div style="color:#666; font-size:0.9em; text-align:center;">正在跨海解析原文資料，這可能需要幾秒鐘...</div>';

    const cleanSciName = sciName.replace(/\s+/g, '-');
    const url = `https://www.fishbase.se/summary/${cleanSciName}`;
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;

    try {
        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error('連線被拒');
        const html = await res.text();
        
        // 將抓回來的 HTML 字串轉成虛擬的 DOM 元素進行解析
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // 萃取邏輯：針對 FishBase 老舊的 class 結構進行捕捉
        let maxLength = "無紀錄";
        let biology = "無紀錄";

        // 抓取體長
        const spans = doc.querySelectorAll('span.slabel');
        spans.forEach(span => {
            if (span.textContent.includes('Max length')) {
                // 體長通常跟在該標籤的父元素文字中
                maxLength = span.parentNode.textContent.replace('Max length :', '').replace(/\s+/g, ' ').trim();
            }
        });

        // 抓取生物學特徵 (Biology)
        const h1s = doc.querySelectorAll('h1.slabel');
        h1s.forEach(h1 => {
            if (h1.textContent.includes('Biology')) {
                // 抓取標題後面的文字節點
                let nextNode = h1.nextSibling;
                let bioText = "";
                while(nextNode && nextNode.nodeName !== 'H1' && nextNode.nodeName !== 'DIV') {
                    if (nextNode.textContent) bioText += nextNode.textContent;
                    nextNode = nextNode.nextSibling;
                }
                if(bioText.trim()) biology = bioText.trim();
            }
        });

        // 將抓下來的英文原文顯示在卡片內
        targetDiv.innerHTML = `
            <div style="font-size: 0.85em; color: #333; line-height: 1.6;">
                <p style="margin:5px 0; color:#0077be;"><strong>📏 體長與特徵 (Size & Info)：</strong><br> <span style="color:#444;">${maxLength}</span></p>
                <p style="margin:5px 0; color:#2e7d32;"><strong>🧬 生物學特性 (Biology)：</strong><br> <span style="color:#444;">${biology}</span></p>
                <div style="text-align:right; margin-top:8px;">
                    <a href="${url}" target="_blank" style="color:#888; text-decoration:underline; font-size:0.9em;">前往 FishBase 網站</a>
                </div>
            </div>
        `;
        btnElement.style.display = 'none'; // 抓取成功後隱藏按鈕

    } catch (error) {
        targetDiv.innerHTML = `<div style="color:#d32f2f; font-size:0.85em;">⚠️ FishBase 伺服器超時或阻擋了請求。<a href="${url}" target="_blank" style="color:#0077be;">請點此直接前往網站</a></div>`;
        btnElement.innerHTML = originalBtnText;
        btnElement.disabled = false;
        btnElement.style.background = '#0077be';
    }
};

// 💡 保育等級燈號轉換器 (維持不變)
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
    return { html: `<span style="display:inline-block; background:${config.bg}; color:${config.color}; border:1px solid ${config.border}; padding:3px 8px; border-radius:12px; font-size:0.85em; font-weight:bold; box-shadow:0 1px 3px rgba(0,0,0,0.1);">${config.label} (${upperCode})</span>` };
}

// 💡 2. 主搜尋邏輯
searchBtn.addEventListener('click', async () => {
    const keyword = fishInput.value.trim();
    if (!keyword) return;

    resultDiv.innerHTML = `<p style="text-align:center; color:#0077be;">🌊 正在檢索物種並載入保育評估資料...</p>`;

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
            resultDiv.innerHTML = `<div style="padding:20px; text-align:center; background:#f8f9fa; border-radius:10px;">❌ 找不到與「${keyword}」相關的物種 (Species) 紀錄。</div>`;
            return;
        }

        // 💡 3. 渲染結果 (替換原本的 href 按鈕為 onClick 爬蟲按鈕)
        resultDiv.innerHTML = `
            <p style="margin-bottom:15px; color:#666; font-size:0.9em;">共找到 ${fishList.length} 筆物種資料：</p>
            ${fishList.map(fish => {
                const sciName = fish.simple_name || fish.scientific_name || "Unknown";
                const alienMap = { 'native': '原生種', 'naturalized': '歸化種', 'invasive': '入侵種', 'cultured': '栽培豢養/養殖' };
                const alienStatus = fish.alien_type ? (alienMap[fish.alien_type] || fish.alien_type) : '未標示';

                const habitats = [];
                if (fish.is_terrestrial) habitats.push('陸生');
                if (fish.is_freshwater) habitats.push('淡水');
                if (fish.is_brackish) habitats.push('半鹹水');
                if (fish.is_marine) habitats.push('海洋');
                const habitatStr = habitats.length > 0 ? habitats.join('、') : '未知';

                const citesTag = fish.cites ? `<span style="display:inline-block; background:#1976d2; color:white; padding:3px 8px; border-radius:12px; font-size:0.85em; font-weight:bold;">附錄 ${fish.cites}</span>` : '<span style="color:#aaa; font-size:0.85em;">無紀錄</span>';
                const iucnTag = getConservationStyle(fish.iucn).html;
                const redlistTag = getConservationStyle(fish.redlist).html;

                const inTaiwan = fish.is_in_taiwan ? '<span style="color:#2e7d32; font-weight:bold;">✔</span>' : '<span style="color:#d32f2f; font-weight:bold;">✖</span>';
                const isEndemic = fish.is_endemic ? '<span style="color:#2e7d32; font-weight:bold;">✔</span>' : '<span style="color:#999;">✖</span>';

                return `
                    <div style="background: white; padding: 20px; border-radius: 12px; border: 2px solid #0077be; margin-bottom: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                        <h3 style="margin: 0 0 8px 0; color: #0077be;">🐟 ${fish.common_name_c || '未知中文名'}</h3>
                        <div style="font-size: 1em; color: #d32f2f; margin-bottom: 8px;"><i>${sciName}</i></div>
                        
                        <div style="font-size: 0.85em; color: #555; background: #f8f9fa; padding: 8px; border-radius: 6px; margin: 10px 0; border-left: 3px solid #0077be;">
                            <strong>別名：</strong> ${fish.alternative_name_c || '無'}
                        </div>

                        <table style="width: 100%; font-size: 0.85em; color: #444; margin-bottom: 10px;">
                            <tr>
                                <td style="padding: 3px 0; width: 50%;"><strong>地位：</strong> ${fish.taxon_status === 'accepted' ? '有效名' : '非有效名'}</td>
                                <td style="padding: 3px 0; width: 50%;"><strong>棲地：</strong> <span style="color:#0277bd;">${habitatStr}</span></td>
                            </tr>
                            <tr>
                                <td style="padding: 3px 0;"><strong>分布：</strong> ${inTaiwan} 臺灣 | ${isEndemic} 特有</td>
                                <td style="padding: 3px 0;"><strong>性質：</strong> ${alienStatus}</td>
                            </tr>
                        </table>

                        <div style="background: #fdfaf6; padding: 12px; border-radius: 8px; border: 1px solid #f0e6d2; margin-top: 10px;">
                            <div style="font-size: 0.8em; color: #795548; font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #f0e6d2; padding-bottom: 4px;">🛡️ 保育與受威脅狀態</div>
                            <div style="display: flex; gap: 15px; align-items: center; flex-wrap: wrap;">
                                <div style="display:flex; flex-direction:column; gap:4px;"><span style="font-size:0.7em; color:#888;">IUCN 紅皮書</span>${iucnTag}</div>
                                <div style="display:flex; flex-direction:column; gap:4px; border-left: 1px solid #eee; padding-left: 15px;"><span style="font-size:0.7em; color:#888;">臺灣紅皮書</span>${redlistTag}</div>
                                <div style="display:flex; flex-direction:column; gap:4px; border-left: 1px solid #eee; padding-left: 15px;"><span style="font-size:0.7em; color:#888;">華盛頓公約</span>${citesTag}</div>
                            </div>
                        </div>

                        <div style="margin-top: 15px; border-top: 1px dashed #ccc; padding-top: 15px; text-align: center;">
                            <button onclick="fetchFishBase('${sciName}', this)" style="background: #0077be; color: white; border:none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor:pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.2); transition: 0.3s;">
                                ⬇️ 展開 FishBase 摘要資料
                            </button>
                            <div class="fb-content" style="display:none; margin-top: 15px; padding: 15px; background: #f0f7ff; border-radius: 8px; border-left: 4px solid #0077be; text-align: left;"></div>
                        </div>
                    </div>
                `;
            }).join('')}
        `;

    } catch (error) {
        console.error("搜尋錯誤:", error);
        resultDiv.innerHTML = `<div style="color:red; text-align:center; padding:20px;">⚠️ API 連線逾時，請重試。</div>`;
    }
});