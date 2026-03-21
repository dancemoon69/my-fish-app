const searchBtn = document.querySelector('#searchBtn');
const fishInput = document.querySelector('#fishName');
const resultDiv = document.querySelector('#result');

searchBtn.addEventListener('click', async () => {
    const keyword = fishInput.value.trim();
    if (!keyword) return;

    resultDiv.innerHTML = `<p style="text-align:center; color:#0077be;">🌊 正在深度檢索「${keyword}」相關的所有物種...</p>`;

    try {
        // --- 核心邏輯：同時發動兩組 API 進行聯集搜尋 ---
        // 1. nameMatch: 比對名稱地位
        const matchUrl = `https://api.taicol.tw/v2/nameMatch?name=${encodeURIComponent(keyword)}&best=no&bio_group=魚類`;
        // 2. taxon?q=: 全文檢索（包含別名與說明）
        const qUrl = `https://api.taicol.tw/v2/taxon?q=${encodeURIComponent(keyword)}&bio_group=魚類&limit=20`;

        const [matchRes, qRes] = await Promise.all([
            fetch(`https://corsproxy.io/?${encodeURIComponent(matchUrl)}`).then(r => r.json()),
            fetch(`https://corsproxy.io/?${encodeURIComponent(qUrl)}`).then(r => r.json())
        ]);

        // 合併兩邊的 taxon_id，並利用 Set 去除重複項
        const allIds = new Set([
            ...(matchRes.data || []).map(i => i.taxon_id),
            ...(qRes.data || []).map(i => i.taxon_id)
        ]);

        if (allIds.size === 0) {
            resultDiv.innerHTML = `❌ 找不到與「${keyword}」相關的紀錄。`;
            return;
        }

        resultDiv.innerHTML = `<p style="text-align:center; color:#0077be;">🧬 找到 ${allIds.size} 種相關物種，正在載入詳細分類資料...</p>`;

        // --- 批量抓取詳細資料 ---
        const detailPromises = Array.from(allIds).slice(0, 15).map(async (tid) => {
            const detailUrl = `https://api.taicol.tw/v2/taxon?taxon_id=${tid}`;
            try {
                const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(detailUrl)}`);
                const json = await res.json();
                return json.data ? json.data[0] : null;
            } catch (e) { return null; }
        });

        const fishList = (await Promise.all(detailPromises)).filter(f => f !== null);

        // --- 渲染結果清單 ---
        resultDiv.innerHTML = `
            <p style="margin-bottom:15px; color:#666; font-size:0.9em;">「${keyword}」的相關物種清單：</p>
            ${fishList.map(fish => {
                const mainName = fish.common_name_c || "未知俗名";
                const sciName = fish.simple_name || fish.scientific_name || "Unknown";
                const altNames = fish.alternative_name_c || "";
                
                // 依照你的要求顯示地位與外來性
                const statusTag = fish.alien_type === 'invasive' ? '⚠️ 入侵種' : 
                                 (fish.alien_type === 'cultured' ? '🏠 養殖種' : '🐟 原生種');
                
                const fishBaseUrl = `https://www.fishbase.se/summary/${sciName.replace(/\s+/g, '-')}`;

                return `
                    <div style="background: white; padding: 20px; border-radius: 15px; border: 2px solid #0077be; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <div style="flex: 1;">
                                <h3 style="margin: 0 0 8px 0; color: #0077be;">🐟 ${mainName}</h3>
                                <div style="font-size: 1em; color: #d32f2f; margin-bottom: 8px;"><i>${sciName}</i></div>
                                
                                <div style="font-size: 0.85em; color: #555; background: #f0f7ff; padding: 8px; border-radius: 8px; margin-bottom: 10px;">
                                    <strong>別名：</strong> ${altNames || '無'}
                                </div>

                                <div style="font-size: 0.8em; color: #666; line-height: 1.6;">
                                    <div><strong>地位：</strong> ${fish.taxon_status === 'accepted' ? '有效名' : '非有效名'}</div>
                                    <div><strong>階層：</strong> ${fish.rank} | <strong>界：</strong> ${fish.kingdom}</div>
                                    <div style="margin-top:5px;">
                                        <span style="background: ${fish.alien_type === 'invasive' ? '#ffebee' : '#e8f5e9'}; 
                                                     color: ${fish.alien_type === 'invasive' ? '#c62828' : '#2e7d32'}; 
                                                     padding: 2px 8px; border-radius: 4px; font-weight: bold;">
                                            ${statusTag}
                                        </span>
                                        ${fish.is_endemic ? '<span style="margin-left:5px; background:#fff3e0; color:#ef6c00; padding:2px 8px; border-radius:4px;">✨ 特有種</span>' : ''}
                                    </div>
                                </div>
                            </div>
                            <a href="${fishBaseUrl}" target="_blank" 
                               style="background: #0077be; color: white; padding: 10px 15px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 0.9em; margin-left: 10px;">
                               FishBase
                            </a>
                        </div>
                    </div>
                `;
            }).join('')}
        `;
    } catch (error) {
        console.error("搜尋錯誤:", error);
        resultDiv.innerHTML = `<div style="color:red; text-align:center; padding:20px;">⚠️ 搜尋中斷，請稍後再試。</div>`;
    }
});