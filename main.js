const searchBtn = document.querySelector('#searchBtn');
const fishInput = document.querySelector('#fishName');
const resultDiv = document.querySelector('#result');

searchBtn.addEventListener('click', async () => {
    const name = fishInput.value.trim();
    if (!name) return;

    resultDiv.innerHTML = `<div style="text-align:center; padding:20px; color:#0077be;">
        <p>🔍 正在名錄中模糊比對「${name}」...</p>
    </div>`;

    try {
        // --- 第一階段：nameMatch 模糊比對 ---
        // best=no: 找出所有可能性 | bio_group=魚類: 過濾掉無關物種
        const matchUrl = `https://api.taicol.tw/v2/nameMatch?name=${encodeURIComponent(name)}&best=no&bio_group=魚類`;
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(matchUrl)}`;

        const matchRes = await fetch(proxyUrl);
        const matchData = await matchRes.json();
        const candidates = matchData.data || [];

        if (candidates.length === 0) {
            resultDiv.innerHTML = `❌ 找不到與「${name}」關鍵字符合的魚類紀錄。`;
            return;
        }

        resultDiv.innerHTML = `<p style="text-align:center; color:#0077be;">🧬 找到 ${candidates.length} 個可能物種，正在載入詳細資料...</p>`;

        // --- 第二階段：依照說明書 taxon?taxon_id={id} 抓取深度資料 ---
        // 我們取前 8 筆結果，確保搜尋速度
        const detailPromises = candidates.slice(0, 8).map(async (item) => {
            const tid = item.taxon_id;
            const detailUrl = `https://api.taicol.tw/v2/taxon?taxon_id=${tid}`;
            const proxyDetail = `https://corsproxy.io/?${encodeURIComponent(detailUrl)}`;
            
            try {
                const dRes = await fetch(proxyDetail);
                const dData = await dRes.json();
                // 依照說明書回傳通常在 data 陣列
                return dData.data ? dData.data[0] : null;
            } catch (e) {
                return null;
            }
        });

        const fishList = (await Promise.all(detailPromises)).filter(f => f !== null);

        // --- 第三階段：渲染結果清單 ---
        resultDiv.innerHTML = `
            <p style="margin-bottom:15px; color:#666; font-size:0.9em;">關鍵字「${name}」的搜尋結果：</p>
            ${fishList.map(fish => {
                // 取得官方說明的欄位
                const mainName = fish.common_name_c || "未知俗名";
                const altName = fish.alternative_name_c ? `別名: ${fish.alternative_name_c}` : "";
                const sciName = fish.simple_name || fish.scientific_name || "Unknown";
                const displaySci = fish.formatted_name || `<i>${sciName}</i>`;
                
                // FishBase 連結 (使用 simple_name)
                const fishBaseUrl = `https://www.fishbase.se/summary/${sciName.replace(/\s+/g, '-')}`;

                return `
                    <div style="background: white; padding: 18px; border-radius: 12px; border: 2px solid #0077be; margin-bottom: 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <div style="flex: 1;">
                                <h3 style="margin: 0 0 5px 0; color: #0077be;">🐟 ${mainName}</h3>
                                <div style="font-size: 0.9em; color: #d32f2f; margin-bottom: 8px;">${displaySci}</div>
                                ${altName ? `<div style="font-size: 0.8em; color: #777; margin-bottom: 8px;">${altName}</div>` : ''}
                                <div style="font-size: 0.75em; color: #aaa;">
                                    物種編號: ${fish.taxon_id} | 階層: ${fish.rank || 'Species'}
                                </div>
                            </div>
                            <a href="${fishBaseUrl}" target="_blank" 
                               style="background: #0077be; color: white; padding: 10px 15px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 0.85em; white-space: nowrap; margin-left: 10px;">
                               FishBase
                            </a>
                        </div>
                    </div>
                `;
            }).join('')}
        `;

    } catch (error) {
        console.error("搜尋錯誤:", error);
        resultDiv.innerHTML = `<div style="color:red; text-align:center; padding:20px;">⚠️ API 連線失敗，請檢查網路。</div>`;
    }
});