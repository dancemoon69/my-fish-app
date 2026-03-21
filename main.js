const searchBtn = document.querySelector('#searchBtn');
const fishInput = document.querySelector('#fishName');
const resultDiv = document.querySelector('#result');

searchBtn.addEventListener('click', async () => {
    const keyword = fishInput.value.trim();
    if (!keyword) return;

    resultDiv.innerHTML = `<p style="text-align:center; color:#0077be;">🌊 正在依照官方規範進行名錄比對...</p>`;

    try {
        // --- 1. nameMatch (模糊比對學名/中文俗名) ---
        // 依照說明書：name={string} & best=no (不只取最佳結果)
        const matchUrl = `https://api.taicol.tw/v2/nameMatch?name=${encodeURIComponent(keyword)}&best=no&bio_group=魚類`;
        const proxyMatch = `https://corsproxy.io/?${encodeURIComponent(matchUrl)}`;

        const matchRes = await fetch(proxyMatch);
        const matchData = await matchRes.json();
        
        // 取得所有可能的 taxon_id
        const candidates = matchData.data || [];

        if (candidates.length === 0) {
            resultDiv.innerHTML = `❌ 在名錄中找不到與「${keyword}」匹配的資料。`;
            return;
        }

        resultDiv.innerHTML = `<p style="text-align:center; color:#0077be;">🧬 找到 ${candidates.length} 筆潛在紀錄，正在提取詳細資訊...</p>`;

        // --- 2. 使用 taxon?taxon_id={string} 取得詳細資料 ---
        // 這裡會抓到妳要的地位、外來性、階層、別名等
        const detailPromises = candidates.map(async (item) => {
            const tid = item.taxon_id;
            const detailUrl = `https://api.taicol.tw/v2/taxon?taxon_id=${tid}`;
            try {
                const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(detailUrl)}`);
                const json = await res.json();
                return json.data ? json.data[0] : null;
            } catch (e) { return null; }
        });

        const fishList = (await Promise.all(detailPromises)).filter(f => f !== null);

        // --- 3. 渲染清單 ---
        resultDiv.innerHTML = `
            <p style="margin-bottom:15px; color:#666; font-size:0.9em;">搜尋「${keyword}」的結果清單：</p>
            ${fishList.map(fish => {
                const sciName = fish.simple_name || fish.scientific_name || "Unknown";
                
                // 處理外來性文字轉換 (對應官方 alien_type 欄位)
                const alienMap = {
                    'native': '🐟 原生種',
                    'naturalized': '🌍 歸化種',
                    'invasive': '⚠️ 入侵種',
                    'cultured': '🏠 養殖種'
                };
                const alienStatus = alienMap[fish.alien_type] || '未知地位';

                return `
                    <div style="background: white; padding: 20px; border-radius: 12px; border: 1px solid #0077be; margin-bottom: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <div style="flex: 1;">
                                <h3 style="margin: 0 0 8px 0; color: #0077be;">🐟 ${fish.common_name_c || '未命名'}</h3>
                                <div style="font-size: 1em; color: #d32f2f; margin-bottom: 8px;"><i>${sciName}</i></div>
                                
                                <div style="font-size: 0.85em; color: #555; background: #f4f7f9; padding: 8px; border-radius: 6px; margin: 10px 0;">
                                    <strong>別名：</strong> ${fish.alternative_name_c || '無'}
                                </div>

                                <table style="width: 100%; font-size: 0.8em; color: #444; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 4px 0;"><strong>地位：</strong> ${fish.taxon_status === 'accepted' ? '有效名' : '非有效名'}</td>
                                        <td style="padding: 4px 0;"><strong>原生/外來：</strong> ${alienStatus}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 4px 0;"><strong>階層：</strong> ${fish.rank || 'Species'}</td>
                                        <td style="padding: 4px 0;"><strong>界：</strong> ${fish.kingdom || 'Animalia'}</td>
                                    </tr>
                                </table>
                            </div>
                            <a href="https://www.fishbase.se/summary/${sciName.replace(/\s+/g, '-')}" target="_blank" 
                               style="background: #0077be; color: white; padding: 8px 12px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 0.85em; margin-left: 10px; text-align: center;">
                               FishBase
                            </a>
                        </div>
                    </div>
                `;
            }).join('')}
        `;

    } catch (error) {
        console.error("API 串接錯誤:", error);
        resultDiv.innerHTML = `<div style="color:red; text-align:center; padding:20px;">⚠️ 無法取得資料，請檢查網路。</div>`;
    }
});