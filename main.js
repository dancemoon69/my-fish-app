const searchBtn = document.querySelector('#searchBtn');
const fishInput = document.querySelector('#fishName');
const resultDiv = document.querySelector('#result');

searchBtn.addEventListener('click', async () => {
    const name = fishInput.value.trim();
    if (!name) return;

    resultDiv.innerHTML = `<p style="text-align:center; color:#0077be;">🔍 正在比對物種名錄...</p>`;

    try {
        // --- 步驟一：使用 nameMatch 模糊比對 ---
        const matchUrl = `https://api.taicol.tw/v2/nameMatch?name=${encodeURIComponent(name)}&best=no`;
        const proxyMatch = `https://corsproxy.io/?${encodeURIComponent(matchUrl)}`;

        const matchRes = await fetch(proxyMatch);
        if (!matchRes.ok) throw new Error('連線失敗');
        const matchData = await matchRes.json();
        const candidates = matchData.data || [];

        if (candidates.length === 0) {
            resultDiv.innerHTML = `❌ 找不到與「${name}」相關的紀錄。`;
            return;
        }

        resultDiv.innerHTML = `<p style="text-align:center; color:#0077be;">🧬 找到 ${candidates.length} 個匹配項，正在整理資料...</p>`;

        // --- 步驟二：串聯詳細資料 (加入強大的失敗備援) ---
        const detailPromises = candidates.slice(0, 6).map(async (item) => {
            const tid = item.taxon_id;
            const detailUrl = `https://api.taicol.tw/v2/taxon/${tid}`;
            const proxyDetail = `https://corsproxy.io/?${encodeURIComponent(detailUrl)}`;
            
            try {
                const dRes = await fetch(proxyDetail);
                if (!dRes.ok) throw new Error();
                const dData = await dRes.json();
                const info = dData.data ? (Array.isArray(dData.data) ? dData.data[0] : dData.data) : dData;
                return { ...item, ...info, success: true };
            } catch (e) {
                // 💡 備援：如果詳細資料抓失敗，依然回傳基本比對資料
                return { ...item, success: false };
            }
        });

        const fishList = await Promise.all(detailPromises);

        // --- 步驟三：渲染結果 ---
        resultDiv.innerHTML = fishList.map(fish => {
            // 優先使用詳細資料的學名，失敗則用比對資料的學名
            const fullSci = fish.scientific_name || fish.accepted_name || fish.matched_name || "Unknown";
            const cleanSci = fullSci.split(' ').slice(0, 2).join(' ');
            
            // 判斷科別顯示
            const familyInfo = fish.success 
                ? `${fish.family_c || ''} (${fish.family || '未分類'})`
                : `<span style="color:#999;">(詳細科別載入失敗)</span>`;

            return `
                <div style="background: white; padding: 20px; border-radius: 15px; border: 2px solid #0077be; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div style="flex: 1;">
                            <h3 style="margin: 0 0 10px 0; color: #0077be;">🐟 ${fish.common_name_c || name}</h3>
                            <p style="margin: 5px 0; font-size: 0.95em;"><strong>科別：</strong> ${familyInfo}</p>
                            <p style="margin: 5px 0; font-size: 0.9em; color: #d32f2f;"><strong>學名：</strong> <i>${fullSci}</i></p>
                            ${fish.common_name_e ? `<p style="margin: 5px 0; font-size: 0.8em; color: #666;">英文名：${fish.common_name_e}</p>` : ''}
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
        resultDiv.innerHTML = `<div style="color:red; text-align:center; padding:20px;">⚠️ 伺服器繁忙，請稍後再試一次。</div>`;
    }
});