const searchBtn = document.querySelector('#searchBtn');
const fishInput = document.querySelector('#fishName');
const resultDiv = document.querySelector('#result');

searchBtn.addEventListener('click', async () => {
    const name = fishInput.value.trim();
    if (!name) return;

    // 1. 初始化搜尋狀態
    resultDiv.innerHTML = `
        <div style="text-align:center; padding:20px; color:#0077be;">
            <p>🔍 正在比對物種名錄...</p>
        </div>`;

    try {
        // --- 步驟一：使用 nameMatch 模糊比對抓出可能的學名與 ID ---
        const matchUrl = `https://api.taicol.tw/v2/nameMatch?name=${encodeURIComponent(name)}&best=no`;
        
        // 💡 更換代理為 corsproxy.io (目前對 GitHub Pages 最穩定)
        const proxyMatch = `https://corsproxy.io/?${encodeURIComponent(matchUrl)}`;

        const matchRes = await fetch(proxyMatch);
        if (!matchRes.ok) throw new Error('無法連線至名稱比對伺服器');
        
        const matchData = await matchRes.json();
        const candidates = matchData.data || [];

        if (candidates.length === 0) {
            resultDiv.innerHTML = `❌ 找不到與「${name}」相關的學名紀錄。`;
            return;
        }

        resultDiv.innerHTML = `
            <div style="text-align:center; padding:20px; color:#0077be;">
                <p>🧬 找到 ${candidates.length} 個匹配項，正在調閱詳細資料...</p>
            </div>`;

        // --- 步驟二：串聯 taxon API 抓取中英文詳細資料 ---
        // 我們取前 6 筆，避免請求過多
        const detailPromises = candidates.slice(0, 6).map(async (item) => {
            const tid = item.taxon_id;
            // 💡 依照官方規範格式: /v2/taxon/{taxon_id}
            const detailUrl = `https://api.taicol.tw/v2/taxon/${tid}`;
            const proxyDetail = `https://corsproxy.io/?${encodeURIComponent(detailUrl)}`;
            
            try {
                const dRes = await fetch(proxyDetail);
                const dData = await dRes.json();
                // 確保抓到正確層級 (v2 有時資料在 .data[0])
                return dData.data ? (Array.isArray(dData.data) ? dData.data[0] : dData.data) : dData;
            } catch (e) {
                return null;
            }
        });

        const settledResults = await Promise.all(detailPromises);
        const fishList = settledResults.filter(f => f !== null && f.scientific_name);

        if (fishList.length === 0) {
            resultDiv.innerHTML = `❌ 無法取得詳細物種資料，請稍後再試。`;
            return;
        }

        // --- 步驟三：渲染清單並連接 FishBase ---
        resultDiv.innerHTML = fishList.map(fish => {
            const fullSci = fish.scientific_name || "Unknown";
            // 擷取前兩個單字 (屬名+種小名) 以符合 FishBase 連結格式
            const cleanSci = fullSci.split(' ').slice(0, 2).join(' ');

            return `
                <div style="background: white; padding: 20px; border-radius: 15px; border: 2px solid #0077be; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div style="flex: 1;">
                            <h3 style="margin: 0 0 10px 0; color: #0077be;">🐟 ${fish.common_name_c || name}</h3>
                            <p style="margin: 5px 0;"><strong>科別：</strong> ${fish.family_c || ''} (${fish.family || '未分類'})</p>
                            <p style="margin: 5px 0; font-size: 0.9em; color: #d32f2f;"><strong>正式學名：</strong> <i>${fullSci}</i></p>
                            <p style="margin: 5px 0; font-size: 0.8em; color: #666;">英文俗名：${fish.common_name_e || 'N/A'}</p>
                        </div>
                        <a href="https://www.fishbase.se/summary/${cleanSci.replace(/\s+/g, '-')}" 
                           target="_blank" 
                           style="background: #0077be; color: white; padding: 10px 15px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 0.9em; white-space: nowrap; margin-left: 10px;">
                           FishBase
                        </a>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error("搜尋崩潰:", error);
        resultDiv.innerHTML = `
            <div style="color: #d32f2f; padding: 15px; border: 1px solid #ffcdd2; background: #fff3f3; border-radius: 10px; text-align:center;">
                ⚠️ <strong>連線失敗 (CORS Error)</strong><br>
                原因：${error.message}<br>
                <small>請嘗試關閉 AdBlock 或換個網路環境後再試。</small>
            </div>
        `;
    }
});