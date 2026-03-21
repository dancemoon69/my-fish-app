const searchBtn = document.querySelector('#searchBtn');
const fishInput = document.querySelector('#fishName');
const resultDiv = document.querySelector('#result');

searchBtn.addEventListener('click', async () => {
    const name = fishInput.value.trim();
    if (!name) return;

    resultDiv.innerHTML = `<p style="text-align:center; color:#0077be;">🌊 依照官方規範查詢中...</p>`;

    try {
        // --- 1. 使用 nameMatch 取得 taxon_id 清單 ---
        const matchUrl = `https://api.taicol.tw/v2/nameMatch?name=${encodeURIComponent(name)}&best=no`;
        const proxyMatch = `https://corsproxy.io/?${encodeURIComponent(matchUrl)}`;

        const matchRes = await fetch(proxyMatch);
        const matchData = await matchRes.json();
        const candidates = matchData.data || [];

        if (candidates.length === 0) {
            resultDiv.innerHTML = `❌ 在名錄中找不到與「${name}」匹配的學名。`;
            return;
        }

        // --- 2. 依照說明書：使用 taxon?taxon_id={id} 取得詳細資料 ---
        const detailPromises = candidates.slice(0, 6).map(async (item) => {
            const tid = item.taxon_id;
            // 💡 依照妳提供的使用說明網址格式
            const detailUrl = `https://api.taicol.tw/v2/taxon?taxon_id=${tid}`;
            const proxyDetail = `https://corsproxy.io/?${encodeURIComponent(detailUrl)}`;
            
            try {
                const dRes = await fetch(proxyDetail);
                const dData = await dRes.json();
                // 官方回傳通常在 data 陣列裡
                return dData.data ? dData.data[0] : dData;
            } catch (e) {
                return null;
            }
        });

        const fishList = (await Promise.all(detailPromises)).filter(f => f !== null);

        // --- 3. 依照回傳欄位說明進行渲染 ---
        resultDiv.innerHTML = fishList.map(fish => {
            // 💡 官方回傳欄位對應
            const commonName = fish.common_name_c || "未知俗名";
            const otherNames = fish.alternative_name_c || "";
            const simpleName = fish.simple_name || ""; // 簡單學名 (無作者)
            const fullName = fish.formatted_name || fish.simple_name || "Unknown";
            
            // 💡 使用官方 simple_name 對接 FishBase，最準確！
            const fishBaseUrl = `https://www.fishbase.se/summary/${simpleName.replace(/\s+/g, '-')}`;

            return `
                <div style="background: white; padding: 20px; border-radius: 15px; border: 2px solid #0077be; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div style="flex: 1;">
                            <h3 style="margin: 0 0 10px 0; color: #0077be;">🐟 ${commonName}</h3>
                            <p style="margin: 5px 0; font-size: 0.9em; color: #d32f2f;"><strong>學名：</strong> <i>${fullName}</i></p>
                            ${otherNames ? `<p style="margin: 5px 0; font-size: 0.85em; color: #666;"><strong>別名：</strong> ${otherNames}</p>` : ''}
                            <p style="margin: 5px 0; font-size: 0.85em; color: #888;">
                                <strong>分類階層：</strong> ${fish.rank || 'Species'} | 
                                <strong>界名：</strong> ${fish.kingdom || 'Animalia'}
                            </p>
                        </div>
                        <a href="${fishBaseUrl}" target="_blank" 
                           style="background: #0077be; color: white; padding: 10px 15px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 0.9em; white-space: nowrap; margin-left: 10px;">
                           FishBase
                        </a>
                    </div>
                    <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee; font-size: 0.75em; color: #bbb;">
                        物種編號：${fish.taxon_id} | 更新日期：${fish.updated_at || 'N/A'}
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error("搜尋錯誤:", error);
        resultDiv.innerHTML = `<div style="color:red; text-align:center; padding:20px;">⚠️ API 連線異常，請稍後再試。</div>`;
    }
});