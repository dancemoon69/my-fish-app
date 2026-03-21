const searchBtn = document.querySelector('#searchBtn');
const fishInput = document.querySelector('#fishName');
const resultDiv = document.querySelector('#result');

searchBtn.addEventListener('click', async () => {
    const name = fishInput.value.trim();
    if (!name) return;

    resultDiv.innerHTML = `<p style="color: #0077be;">正在搜尋並抓取詳細物種資料... 🌊</p>`;

    // 1. 先進行模糊比對 (取前 8 筆最可能的，避免過多導致載入過慢)
    const matchUrl = `https://api.taicol.tw/v2/nameMatch?name=${encodeURIComponent(name)}&best=no&limit=8`;
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(matchUrl)}`;

    try {
        const response = await fetch(proxyUrl);
        const matchResult = await response.json();

        if (matchResult.data && matchResult.data.length > 0) {
            resultDiv.innerHTML = `<p style="margin-bottom:15px; color:#666;">找到 ${matchResult.data.length} 個可能物種，正在載入詳細資訊...</p>`;

            // 2. 核心技術：對每個結果同時發動 "詳細資料" 請求
            const detailPromises = matchResult.data.map(async (matchItem) => {
                const taxonId = matchItem.taxon_id;
                const detailUrl = `https://api.taicol.tw/v2/taxon/${taxonId}`;
                const detailProxy = `https://corsproxy.io/?${encodeURIComponent(detailUrl)}`;
                
                try {
                    const res = await fetch(detailProxy);
                    const detail = await res.json();
                    // TaiCOL v2 taxon API 有時直接回傳物件，有時包在 data 裡
                    return detail.data ? (Array.isArray(detail.data) ? detail.data[0] : detail.data) : detail;
                } catch (e) {
                    return null; // 失敗的跳過
                }
            });

            // 等待所有詳細資料抓取完成
            const detailedFishList = await Promise.all(detailPromises);

            // 3. 渲染美化後的結果
            const htmlContent = detailedFishList.map((fish, index) => {
                if (!fish) return ''; // 沒抓到資料的略過

                const matchInfo = matchResult.data[index];
                const sciNameFull = fish.scientific_name || matchInfo.accepted_name;
                const cleanSci = sciNameFull.split(' ').slice(0, 2).join(' '); // 乾淨學名供 FishBase 使用
                
                return `
                    <div style="background: white; padding: 20px; border-radius: 15px; border: 2px solid #0077be; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <div style="flex: 1;">
                                <h3 style="margin: 0 0 8px 0; color: #0077be;">🐟 ${fish.common_name_c || name}</h3>
                                <p style="margin: 4px 0; font-size: 0.95em;"><strong>學名：</strong> <i style="color: #d32f2f;">${sciNameFull}</i></p>
                                <p style="margin: 4px 0; font-size: 0.9em; color: #555;">
                                    <strong>科別：</strong> ${fish.family_c || ''} (${fish.family || '未分類'})
                                </p>
                                ${fish.alternative_name_c ? `<p style="margin: 4px 0; font-size: 0.85em; color: #777;"><strong>別名：</strong> ${fish.alternative_name_c}</p>` : ''}
                                <div style="margin-top: 10px;">
                                    <span style="font-size: 0.75em; background: #e3f2fd; color: #1976d2; padding: 3px 8px; border-radius: 20px; margin-right: 5px;">
                                        ${fish.alien_type || '原生種'}
                                    </span>
                                    <span style="font-size: 0.75em; background: #f1f8e9; color: #388e3c; padding: 3px 8px; border-radius: 20px;">
                                        ID: ${fish.taxon_id}
                                    </span>
                                </div>
                            </div>
                            <a href="https://www.fishbase.se/summary/${cleanSci.replace(/\s+/g, '-')}" 
                               target="_blank" 
                               style="background: #0077be; color: white; padding: 10px 15px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 0.9em; margin-left: 10px; white-space: nowrap;">
                               詳細圖鑑
                            </a>
                        </div>
                    </div>
                `;
            }).join('');

            resultDiv.innerHTML = htmlContent;

        } else {
            resultDiv.innerHTML = `❌ 找不到與「${name}」相關的紀錄。`;
        }
    } catch (error) {
        console.error("搜尋過程出錯:", error);
        resultDiv.innerHTML = `<div style="color:red; padding:10px;">⚠️ 載入失敗，請稍後再試。</div>`;
    }
});