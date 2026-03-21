const searchBtn = document.querySelector('#searchBtn');
const fishInput = document.querySelector('#fishName');
const resultDiv = document.querySelector('#result');

searchBtn.addEventListener('click', async () => {
    const name = fishInput.value.trim();
    if (!name) return;

    resultDiv.innerHTML = `<p style="color: #0077be; text-align:center;">🔍 正在比對物種名錄...</p>`;

    // --- 第一階段：使用 nameMatch 抓取可能性清單 ---
    // best=no 會列出所有模糊匹配的結果
    const matchUrl = `https://api.taicol.tw/v2/nameMatch?name=${encodeURIComponent(name)}&best=no&only_taiwan=yes`;
    const proxyMatch = `https://corsproxy.io/?${encodeURIComponent(matchUrl)}`;

    try {
        const matchRes = await fetch(proxyMatch);
        const matchData = await matchRes.json();
        
        const candidates = matchData.data || [];

        if (candidates.length === 0) {
            resultDiv.innerHTML = `❌ 找不到與「${name}」相關的學名紀錄。`;
            return;
        }

        resultDiv.innerHTML = `<p style="color: #0077be; text-align:center;">🧬 找到 ${candidates.length} 個可能學名，正在讀取詳細資料...</p>`;

        // --- 第二階段：拿著 taxon_id 串接詳細資料 ---
        const detailPromises = candidates.slice(0, 8).map(async (item) => {
            const tid = item.taxon_id;
            const detailUrl = `https://api.taicol.tw/v2/taxon/${tid}`;
            const proxyDetail = `https://corsproxy.io/?${encodeURIComponent(detailUrl)}`;
            
            try {
                const dRes = await fetch(proxyDetail);
                const dData = await dRes.json();
                // 處理 v2 回傳結構：資料通常在 .data 陣列的第一筆
                return dData.data ? (Array.isArray(dData.data) ? dData.data[0] : dData.data) : dData;
            } catch (e) {
                return null; // 失敗的跳過
            }
        });

        const settledResults = await Promise.all(detailPromises);
        const fishList = settledResults.filter(r => r !== null);

        // --- 第三階段：渲染結果 ---
        resultDiv.innerHTML = fishList.map(fish => {
            // 從學名中擷取前兩個單字 (屬名+種小名) 用於 FishBase
            const fullSci = fish.scientific_name || "Unknown";
            const cleanSci = fullSci.split(' ').slice(0, 2).join(' ');

            return `
                <div style="background: white; padding: 20px; border-radius: 15px; border: 2px solid #0077be; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div style="flex: 1;">
                            <h3 style="margin: 0 0 10px 0; color: #0077be;">🐟 ${fish.common_name_c || name}</h3>
                            <p style="margin: 5px 0;"><strong>科別：</strong> ${fish.family_c || ''} (${fish.family || '未分類'})</p>
                            <p style="margin: 5px 0; font-size: 0.9em; color: #d32f2f;"><strong>正式學名：</strong> <i>${fullSci}</i></p>
                            ${fish.common_name_e ? `<p style="margin: 5px 0; font-size: 0.85em; color: #666;">英文名：${fish.common_name_e}</p>` : ''}
                        </div>
                        <a href="https://www.fishbase.se/summary/${cleanSci.replace(/\s+/g, '-')}" 
                           target="_blank" 
                           style="background: #0077be; color: white; padding: 10px 15px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 0.9em; white-space: nowrap;">
                           FishBase
                        </a>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error("搜尋流程出錯:", error);
        resultDiv.innerHTML = `<div style="color:red; text-align:center; padding:20px;">⚠️ API 連線異常，請稍後再試。</div>`;
    }
});