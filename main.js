const searchBtn = document.querySelector('#searchBtn');
const fishInput = document.querySelector('#fishName');
const resultDiv = document.querySelector('#result');

searchBtn.addEventListener('click', async () => {
    const keyword = fishInput.value.trim();
    if (!keyword) return;

    resultDiv.innerHTML = `<p style="text-align:center; color:#0077be;">🌊 正在依照官方規範進行多重檢索...</p>`;

    try {
        // --- 嚴格遵守官方說明書的三路並行搜尋 ---
        
        // 路徑 1: nameMatch 模糊比對
        const matchUrl = `https://api.taicol.tw/v2/nameMatch?name=${encodeURIComponent(keyword)}&best=no&bio_group=魚類`;
        
        // 路徑 2: taxon 精確俗名比對 (抓取別名完全相符者)
        const commonUrl = `https://api.taicol.tw/v2/taxon?common_name=${encodeURIComponent(keyword)}`;
        
        // 路徑 3: taxon_group 分類群比對
        const groupUrl = `https://api.taicol.tw/v2/taxon?taxon_group=${encodeURIComponent(keyword)}`;

        // 同時發送請求
        const [matchRes, commonRes, groupRes] = await Promise.all([
            fetch(`https://corsproxy.io/?${encodeURIComponent(matchUrl)}`).then(r => r.json()).catch(() => ({ data: [] })),
            fetch(`https://corsproxy.io/?${encodeURIComponent(commonUrl)}`).then(r => r.json()).catch(() => ({ data: [] })),
            fetch(`https://corsproxy.io/?${encodeURIComponent(groupUrl)}`).then(r => r.json()).catch(() => ({ data: [] }))
        ]);

        const resultMap = new Map();

        // 整理路徑 2 & 3 的資料
        const addTaxonData = (dataList) => {
            if (dataList) {
                dataList.forEach(item => {
                    // 確認是動物界
                    if (item.kingdom === 'Animalia') {
                        resultMap.set(item.taxon_id, item);
                    }
                });
            }
        };
        addTaxonData(commonRes.data);
        addTaxonData(groupRes.data);

        // 整理路徑 1 的資料 (只拿到 ID，需反查)
        const matchIdsToFetch = [];
        if (matchRes.data) {
            matchRes.data.forEach(item => {
                if (!resultMap.has(item.taxon_id)) {
                    matchIdsToFetch.push(item.taxon_id);
                }
            });
        }

        // 針對未取得詳細資料的 ID 進行反查 (避免請求過多，取前 15 筆)
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
            if (detail && detail.kingdom === 'Animalia') {
                resultMap.set(detail.taxon_id, detail);
            }
        });

        // 💡 核心過濾器：將整理好的清單，嚴格篩選出 rank 等於 'Species' 的項目
        let fishList = Array.from(resultMap.values());
        fishList = fishList.filter(fish => fish.rank === 'Species');

        if (fishList.length === 0) {
            resultDiv.innerHTML = `
                <div style="padding:20px; text-align:center; background:#f8f9fa; border-radius:10px;">
                    ❌ 找不到與「${keyword}」完全相符的「物種 (Species)」紀錄。<br>
                    <small style="color:#888;">提示：資料庫中可能只有科(Family)或屬(Genus)的紀錄，或者請嘗試輸入完整的俗名。</small>
                </div>`;
            return;
        }

        // --- 渲染結果 ---
        resultDiv.innerHTML = `
            <p style="margin-bottom:15px; color:#666; font-size:0.9em;">共找到 ${fishList.length} 筆物種 (Species) 資料：</p>
            ${fishList.map(fish => {
                const sciName = fish.simple_name || fish.scientific_name || "Unknown";
                
                const alienMap = {
                    'native': '🐟 原生種',
                    'naturalized': '🌍 歸化種',
                    'invasive': '⚠️ 入侵種',
                    'cultured': '🏠 養殖種'
                };
                const alienStatus = alienMap[fish.alien_type] || '未標示';
                const endemicTag = fish.is_endemic ? '<span style="color:#ef6c00; font-weight:bold; background:#fff3e0; padding:2px 6px; border-radius:4px; margin-left:5px;">✨ 特有種</span>' : '';

                return `
                    <div style="background: white; padding: 20px; border-radius: 12px; border: 2px solid #0077be; margin-bottom: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <div style="flex: 1;">
                                <h3 style="margin: 0 0 8px 0; color: #0077be;">🐟 ${fish.common_name_c || '未知中文名'}</h3>
                                <div style="font-size: 1em; color: #d32f2f; margin-bottom: 8px;"><i>${sciName}</i></div>
                                
                                <div style="font-size: 0.85em; color: #555; background: #f8f9fa; padding: 8px; border-radius: 6px; margin: 10px 0; border-left: 3px solid #0077be;">
                                    <strong>別名：</strong> ${fish.alternative_name_c || '無'}
                                </div>

                                <table style="width: 100%; font-size: 0.85em; color: #444;">
                                    <tr>
                                        <td style="padding: 3px 0;"><strong>地位：</strong> ${fish.taxon_status === 'accepted' ? '有效名' : '非有效名'}</td>
                                        <td style="padding: 3px 0;"><strong>性質：</strong> ${alienStatus} ${endemicTag}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 3px 0;"><strong>階層：</strong> <span style="color:#2e7d32; font-weight:bold;">${fish.rank}</span></td>
                                        <td style="padding: 3px 0;"><strong>界名：</strong> ${fish.kingdom || 'Animalia'}</td>
                                    </tr>
                                </table>
                            </div>
                            <a href="https://www.fishbase.se/summary/${sciName.replace(/\s+/g, '-')}" target="_blank" 
                               style="background: #0077be; color: white; padding: 10px 15px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 0.85em; margin-left: 10px; text-align: center; white-space: nowrap;">
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