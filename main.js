const searchBtn = document.querySelector('#searchBtn');
const fishInput = document.querySelector('#fishName');
const resultDiv = document.querySelector('#result');

searchBtn.addEventListener('click', async () => {
    const keyword = fishInput.value.trim();
    if (!keyword) return;

    resultDiv.innerHTML = `<p style="text-align:center; color:#0077be;">🌊 正在依照官方規範進行多重檢索與調閱詳細數據...</p>`;

    try {
        // --- 1. 三路並行搜尋 ---
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
                    if (item.kingdom === 'Animalia') resultMap.set(item.taxon_id, item);
                });
            }
        };
        addTaxonData(commonRes.data);
        addTaxonData(groupRes.data);

        const matchIdsToFetch = [];
        if (matchRes.data) {
            matchRes.data.forEach(item => {
                if (!resultMap.has(item.taxon_id)) matchIdsToFetch.push(item.taxon_id);
            });
        }

        // 針對未取得詳細資料的 ID 進行反查 (取前 15 筆)
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

        // 💡 過濾出 Species 階層
        let fishList = Array.from(resultMap.values()).filter(fish => fish.rank === 'Species');

        if (fishList.length === 0) {
            resultDiv.innerHTML = `<div style="padding:20px; text-align:center; background:#f8f9fa; border-radius:10px;">
                    ❌ 找不到與「${keyword}」相關的物種 (Species) 紀錄。
                </div>`;
            return;
        }

        // --- 2. 渲染豐富數據結果 ---
        resultDiv.innerHTML = `
            <p style="margin-bottom:15px; color:#666; font-size:0.9em;">共找到 ${fishList.length} 筆物種資料：</p>
            ${fishList.map(fish => {
                const sciName = fish.simple_name || fish.scientific_name || "Unknown";
                
                // 處理外來性文字
                const alienMap = { 'native': '原生種', 'naturalized': '歸化種', 'invasive': '入侵種', 'cultured': '栽培豢養/養殖' };
                const alienStatus = fish.alien_type ? (alienMap[fish.alien_type] || fish.alien_type) : '未標示';

                // 處理棲地環境 (轉換 boolean 為陣列字串)
                const habitats = [];
                if (fish.is_terrestrial) habitats.push('陸生');
                if (fish.is_freshwater) habitats.push('淡水');
                if (fish.is_brackish) habitats.push('半鹹水');
                if (fish.is_marine) habitats.push('海洋');
                const habitatStr = habitats.length > 0 ? habitats.join('、') : '未知';

                // 處理保育狀態 (null 轉換為 '無')
                const citesStatus = fish.cites || '無';
                const iucnStatus = fish.iucn || '無';
                const redlistStatus = fish.redlist || '無';

                // 處理 Boolean 狀態
                const inTaiwan = fish.is_in_taiwan ? '<span style="color:#2e7d32;">是</span>' : '<span style="color:#d32f2f;">否</span>';
                const isEndemic = fish.is_endemic ? '<span style="color:#2e7d32; font-weight:bold;">是</span>' : '否';
                const isHybrid = fish.is_hybrid ? '是' : '否';
                const isFossil = fish.is_fossil ? '是' : '否';

                return `
                    <div style="background: white; padding: 20px; border-radius: 12px; border: 2px solid #0077be; margin-bottom: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <div style="flex: 1;">
                                <h3 style="margin: 0 0 8px 0; color: #0077be;">🐟 ${fish.common_name_c || '未知中文名'}</h3>
                                <div style="font-size: 1em; color: #d32f2f; margin-bottom: 8px;"><i>${sciName}</i></div>
                                
                                <div style="font-size: 0.85em; color: #555; background: #f8f9fa; padding: 8px; border-radius: 6px; margin: 10px 0; border-left: 3px solid #0077be;">
                                    <strong>別名：</strong> ${fish.alternative_name_c || '無'}
                                </div>

                                <table style="width: 100%; font-size: 0.85em; color: #444; margin-bottom: 10px;">
                                    <tr>
                                        <td style="padding: 3px 0; width: 50%;"><strong>階層：</strong> ${fish.rank}</td>
                                        <td style="padding: 3px 0; width: 50%;"><strong>棲地：</strong> <span style="color:#0277bd;">${habitatStr}</span></td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 3px 0;"><strong>地位：</strong> ${fish.taxon_status === 'accepted' ? '有效名' : '非有效名'}</td>
                                        <td style="padding: 3px 0;"><strong>原生/外來：</strong> ${alienStatus}</td>
                                    </tr>
                                </table>

                                <div style="background: #e3f2fd; padding: 10px; border-radius: 8px; font-size: 0.8em; color: #333; margin-bottom: 10px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 5px;">
                                    <div>📍 臺灣分布：${inTaiwan}</div>
                                    <div>✨ 特有種：${isEndemic}</div>
                                    <div>🧬 雜交種：${isHybrid}</div>
                                    <div>🦴 化石紀錄：${isFossil}</div>
                                </div>

                                <div style="background: #fff3e0; padding: 10px; border-radius: 8px; font-size: 0.8em; color: #5d4037; display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; text-align: center;">
                                    <div>
                                        <div style="font-weight: bold; margin-bottom: 2px;">CITES</div>
                                        <div>${citesStatus}</div>
                                    </div>
                                    <div style="border-left: 1px solid #ffcc80; border-right: 1px solid #ffcc80;">
                                        <div style="font-weight: bold; margin-bottom: 2px;">IUCN</div>
                                        <div>${iucnStatus}</div>
                                    </div>
                                    <div>
                                        <div style="font-weight: bold; margin-bottom: 2px;">臺灣紅皮書</div>
                                        <div>${redlistStatus}</div>
                                    </div>
                                </div>

                            </div>
                            <a href="https://www.fishbase.se/summary/${sciName.replace(/\s+/g, '-')}" target="_blank" 
                               style="background: #0077be; color: white; padding: 10px 15px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 0.85em; margin-left: 15px; text-align: center; white-space: nowrap; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
                               FishBase
                            </a>
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