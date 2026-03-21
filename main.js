const searchBtn = document.querySelector('#searchBtn');
const fishInput = document.querySelector('#fishName');
const resultDiv = document.querySelector('#result');

searchBtn.addEventListener('click', async () => {
    const name = fishInput.value.trim();
    if (!name) return;

    resultDiv.innerHTML = `<p style="color: #0077be;">正在執行模糊比對並調閱物種資料... 🌊</p>`;

    try {
        // --- 第一步：使用 nameMatch 抓取可能的物種清單 ---
        // best=no 代表我們要模糊比對的所有可能性
        const matchUrl = `https://api.taicol.tw/v2/nameMatch?name=${encodeURIComponent(name)}&best=no`;
        const proxyMatch = `https://corsproxy.io/?${encodeURIComponent(matchUrl)}`;
        
        const matchRes = await fetch(proxyMatch);
        const matchData = await matchRes.json();

        let candidates = matchData.data || [];

        // 💡 備援機制：如果 nameMatch 沒抓到（有時俗名匹配較嚴格），改用關鍵字全文檢索
        if (candidates.length === 0) {
            console.log("nameMatch 沒結果，啟動關鍵字檢索...");
            const qUrl = `https://api.taicol.tw/v2/taxon?q=${encodeURIComponent(name)}&bio_group=魚類&limit=5`;
            const proxyQ = `https://corsproxy.io/?${encodeURIComponent(qUrl)}`;
            const qRes = await fetch(proxyQ);
            const qData = await qRes.json();
            candidates = qData.data || [];
        }

        if (candidates.length > 0) {
            resultDiv.innerHTML = `<p style="margin-bottom:15px; color:#666;">找到 ${candidates.length} 個匹配項目，正在讀取詳細科別...</p>`;

            // --- 第二步：針對每個 ID，去 taxon API 抓詳細資料 ---
            const detailPromises = candidates.slice(0, 6).map(async (item) => {
                const tid = item.taxon_id;
                const detailUrl = `https://api.taicol.tw/v2/taxon/${tid}`;
                const proxyDetail = `https://corsproxy.io/?${encodeURIComponent(detailUrl)}`;
                
                try {
                    const dRes = await fetch(proxyDetail);
                    const dData = await dRes.json();
                    // 格式檢查：v2 taxon API 有時資料在 .data[0]，有時直接是物件
                    return dData.data ? (Array.isArray(dData.data) ? dData.data[0] : dData.data) : dData;
                } catch (e) { return null; }
            });

            const finalResults = await Promise.all(detailPromises);

            // --- 第三步：渲染清單 ---
            resultDiv.innerHTML = finalResults.map(fish => {
                if (!fish) return '';
                const sciName = fish.scientific_name || "Unknown";
                const cleanSci = sciName.split(' ').slice(0, 2).join(' '); // 擷取 屬名 + 種小名

                return `
                    <div style="background: white; padding: 15px; border-radius: 12px; border: 2px solid #0077be; margin-bottom: 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <div style="flex: 1;">
                                <h3 style="margin: 0; color: #0077be;">🐟 ${fish.common_name_c || name}</h3>
                                <p style="margin: 5px 0; font-size: 0.95em;"><strong>科別：</strong> ${fish.family_c || fish.family || '未分類'}</p>
                                <p style="margin: 5px 0; font-size: 0.9em; color: #d32f2f;"><i>${sciName}</i></p>
                                ${fish.alternative_name_c ? `<p style="margin: 5px 0; font-size: 0.8em; color: #888;">別名：${fish.alternative_name_c}</p>` : ''}
                            </div>
                            <a href="https://www.fishbase.se/summary/${cleanSci.replace(/\s+/g, '-')}" 
                               target="_blank" 
                               style="background: #0077be; color: white; padding: 8px 12px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 0.85em; white-space: nowrap; margin-left: 10px;">
                               FishBase
                            </a>
                        </div>
                    </div>
                `;
            }).join('');

        } else {
            resultDiv.innerHTML = `❌ 在台灣資料庫中找不到與「${name}」相關的紀錄。`;
        }
    } catch (error) {
        console.error("搜尋錯誤:", error);
        resultDiv.innerHTML = `<div style="color:red; padding:10px;">⚠️ API 連線異常，請檢查網路。</div>`;
    }
});