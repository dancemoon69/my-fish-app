const searchBtn = document.querySelector('#searchBtn');
const fishInput = document.querySelector('#fishName');
const resultDiv = document.querySelector('#result');

// 💡 1. 維基百科 API 萃取引擎
window.fetchWikiData = async function(sciName, btnElement) {
    const targetDiv = btnElement.parentElement.nextElementSibling;
    const originalBtnText = btnElement.innerHTML;
    
    btnElement.innerHTML = '⏳ 載入中...';
    btnElement.disabled = true;
    btnElement.style.opacity = '0.7';
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
            <div style="text-align: justify; overflow: hidden; padding-top:10px;">
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
        btnElement.style.opacity = '1';
    }
};

// 💡 保育等級燈號轉換器
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

    resultDiv.innerHTML = `<p style="text-align:center; color:var(--primary-blue); font-weight:bold;">🌊 正在擴展搜尋網並排除重複紀錄...</p>`;

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
            if (dataList) {
                dataList.forEach(item => { 
                    if (!item.kingdom || item.kingdom === 'Animalia') {
                        resultMap.set(item.taxon_id, item); 
                    }
                });
            }
        };
        addTaxonData(commonRes.data);
        addTaxonData(groupRes.data);

        // 💡 關鍵修復：使用 Set() 來確保 ID 絕對不重複
        const matchIdsToFetch = new Set();
        if (matchRes.data) {
            matchRes.data.forEach(item => { 
                if (!resultMap.has(item.taxon_id)) {
                    matchIdsToFetch.add(item.taxon_id); 
                }
            });
        }

        // 把乾淨、不重複的 ID 拿去調閱詳細資料 (確保 30 個名額都是不同物種)
        const detailPromises = Array.from(matchIdsToFetch).slice(0, 30).map(async (tid) => {
            const detailUrl = `https://api.taicol.tw/v2/taxon?taxon_id=${tid}`;
            try {
                const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(detailUrl)}`);
                const json = await res.json();
                return json.data ? json.data[0] : null;
            } catch (e) { return null; }
        });

        const fetchedDetails = await Promise.all(detailPromises);
        fetchedDetails.forEach(detail => {
            if (detail && (!detail.kingdom || detail.kingdom === 'Animalia')) {
                resultMap.set(detail.taxon_id, detail);
            }
        });

        // 💡 核心過濾器：科學化防蟲，不濫殺無辜
        let fishList = Array.from(resultMap.values()).filter(fish => {
            // 1. 容許「種」與「亞種」
            const validRanks = ['species', 'subspecies', 'variety', 'form'];
            const currentRank = fish.rank ? fish.rank.toLowerCase() : '';
            if (currentRank && !validRanks.includes(currentRank)) return false;

            // 2. 利用綱 (Class) 與門 (Phylum) 精準殺蟲殺鳥
            const classStr = (fish.class_c || '') + (fish.class || '');
            const phylumStr = (fish.phylum_c || '') + (fish.phylum || '');
            
            const nonFishClasses = ['鳥', '哺乳', '爬蟲', '兩棲', '昆蟲', '蛛形', '軟甲', '腹足', '雙殼', '頭足', 'Aves', 'Mammalia', 'Reptilia', 'Amphibia', 'Insecta'];
            if (nonFishClasses.some(c => classStr.includes(c))) return false;
            
            const nonFishPhylums = ['節肢動物', '軟體動物', '環節動物', '棘皮動物', '刺絲胞', 'Arthropoda', 'Mollusca'];
            if (nonFishPhylums.some(p => phylumStr.includes(p))) return false;

            // 3. 棲地絕對防線 (純陸生直接出局)
            if (fish.is_terrestrial && !fish.is_freshwater && !fish.is_marine && !fish.is_brackish) return false;

            // 4. 俗名防呆排除 (名字有魚但不是魚的生物)
            const fakeFishes = ['鯨', '鱷', '墨魚', '魷魚', '鮑魚', '章魚', '甲魚', '海豚', '儒艮'];
            const nameStr = (fish.family_c || '') + (fish.common_name_c || '');
            if (fakeFishes.some(w => nameStr.includes(w))) return false;

            return true;
        });

        if (fishList.length === 0) {
            resultDiv.innerHTML = `<div style="padding:20px; text-align:center; background:#fff3f3; color:var(--danger-red); border-radius:12px; border: 1px solid #ffcdd2;">❌ 找不到與「${keyword}」相關的「魚類」紀錄。<br><small style="color:#888;">請確認輸入的名稱是否正確，或嘗試其他俗名。</small></div>`;
            return;
        }

        // 💡 3. 渲染卡片結果
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
                    
                    <div class="fish-aliases">
                        <strong>別名：</strong> ${fish.alternative_name_c || '無'}
                    </div>

                    <div class="data