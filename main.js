const searchBtn = document.querySelector('#searchBtn');
const fishInput = document.querySelector('#fishName');
const resultDiv = document.querySelector('#result');

searchBtn.addEventListener('click', async () => {
    const keyword = fishInput.value.trim();
    if (!keyword) return;

    resultDiv.innerHTML = `<p style="text-align:center; color:#0077be;">🌊 正在掃描全資料庫，尋找所有與「${keyword}」相關的魚類...</p>`;

    try {
        // 💡 關鍵策略：直接使用 v2/taxon 的 q 參數進行「全文廣域搜尋」
        // 不使用 bio_group=魚類 以防部分物種標籤分類不完整導致漏失
        // limit 設定為 50，確保所有模糊匹配的物種都能列出
        const targetUrl = `https://api.taicol.tw/v2/taxon?q=${encodeURIComponent(keyword)}&limit=50`;
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

        const response = await fetch(proxyUrl);
        const resData = await response.json();
        
        // 取得所有結果
        let fishList = resData.data || [];

        // 💡 再次過濾：確保回傳的結果中，界名是動物界 (Animalia)，且名稱中確實包含關鍵字
        // 這可以過濾掉非魚類的雜訊
        fishList = fishList.filter(fish => 
            fish.kingdom === 'Animalia' && 
            (
                (fish.common_name_c && fish.common_name_c.includes(keyword)) ||
                (fish.alternative_name_c && fish.alternative_name_c.includes(keyword)) ||
                (fish.simple_name && fish.simple_name.includes(keyword))
            )
        );

        if (fishList.length === 0) {
            resultDiv.innerHTML = `❌ 找不到與「${keyword}」相關的模糊匹配紀錄。`;
            return;
        }

        // 排序：將主要俗名完全符合的排在最前面
        fishList.sort((a, b) => {
            if (a.common_name_c === keyword) return -1;
            if (b.common_name_c === keyword) return 1;
            return 0;
        });

        resultDiv.innerHTML = `
            <p style="margin-bottom:15px; color:#666; font-size:0.9em;">
                找到 ${fishList.length} 筆包含「${keyword}」的物種紀錄：
            </p>
            ${fishList.map(fish => {
                const mainName = fish.common_name_c || "未知俗名";
                const sciName = fish.simple_name || fish.scientific_name || "Unknown";
                const altNames = fish.alternative_name_c || "無";
                
                // 外來種/原生種標籤邏輯
                let alienTag = '';
                if (fish.alien_type === 'invasive') alienTag = '<span style="background:#ffebee; color:#c62828; padding:2px 8px; border-radius:4px; font-weight:bold;">⚠️ 入侵種</span>';
                else if (fish.alien_type === 'cultured') alienTag = '<span style="background:#e3f2fd; color:#1565c0; padding:2px 8px; border-radius:4px; font-weight:bold;">🏠 養殖種</span>';
                else if (fish.alien_type === 'native') alienTag = '<span style="background:#e8f5e9; color:#2e7d32; padding:2px 8px; border-radius:4px; font-weight:bold;">🐟 原生種</span>';
                else if (fish.alien_type) alienTag = `<span style="background:#f5f5f5; color:#616161; padding:2px 8px; border-radius:4px; font-weight:bold;">${fish.alien_type}</span>`;

                const fishBaseUrl = `https://www.fishbase.se/summary/${sciName.replace(/\s+/g, '-')}`;

                return `
                    <div style="background: white; padding: 20px; border-radius: 15px; border: 2px solid #0077be; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <div style="flex: 1;">
                                <h3 style="margin: 0 0 8px 0; color: #0077be;">🐟 ${mainName}</h3>
                                <div style="font-size: 1em; color: #d32f2f; margin-bottom: 8px;"><i>${sciName}</i></div>
                                
                                <div style="font-size: 0.85em; color: #555; background: #f9f9f9; padding: 10px; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid #0077be;">
                                    <strong>別名：</strong> ${altNames}
                                </div>

                                <div style="font-size: 0.85em; color: #666; line-height: 1.6;">
                                    <div><strong>地位：</strong> ${fish.taxon_status === 'accepted' ? '有效名' : '非有效名'}</div>
                                    <div><strong>階層：</strong> ${fish.rank} | <strong>界：</strong> ${fish.kingdom}</div>
                                    <div style="margin-top:8px;">
                                        ${alienTag}
                                        ${fish.is_endemic ? '<span style="margin-left:5px; background:#fff3e0; color:#ef6c00; padding:2px 8px; border-radius:4px; font-weight:bold;">✨ 特有種</span>' : ''}
                                    </div>
                                </div>
                            </div>
                            <a href="${fishBaseUrl}" target="_blank" 
                               style="background: #0077be; color: white; padding: 10px 15px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 0.9em; margin-left: 10px; text-align:center;">
                               FishBase
                            </a>
                        </div>
                        <div style="margin-top: 10px; font-size: 0.7em; color: #ccc;">物種編號: ${fish.taxon_id}</div>
                    </div>
                `;
            }).join('')}
        `;
    } catch (error) {
        console.error("搜尋錯誤:", error);
        resultDiv.innerHTML = `<div style="color:red; text-align:center; padding:20px;">⚠️ 搜尋中斷，請稍後再試。</div>`;
    }
});