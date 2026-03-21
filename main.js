const searchBtn = document.querySelector('#searchBtn');
const fishInput = document.querySelector('#fishName');
const resultDiv = document.querySelector('#result');

searchBtn.addEventListener('click', async () => {
    const keyword = fishInput.value.trim();
    if (!keyword) return;

    resultDiv.innerHTML = `<p style="text-align:center; color:#0077be;">🌊 正在搜尋所有名稱包含「${keyword}」的物種...</p>`;

    try {
        // --- 💡 依照說明書：使用 common_name 參數抓取所有符合俗名的物種 ---
        // 這是抓到「吉利慈鯛」這類別名中包含關鍵字物種的最佳路徑
        const taxonSearchUrl = `https://api.taicol.tw/v2/taxon?common_name=${encodeURIComponent(keyword)}&bio_group=魚類`;
        
        // --- 同時也保留 nameMatch 作為備援，確保模糊比對學名也能抓到 ---
        const nameMatchUrl = `https://api.taicol.tw/v2/nameMatch?name=${encodeURIComponent(keyword)}&best=no&bio_group=魚類`;

        const [taxonRes, nameRes] = await Promise.all([
            fetch(`https://corsproxy.io/?${encodeURIComponent(taxonSearchUrl)}`).then(r => r.json()),
            fetch(`https://corsproxy.io/?${encodeURIComponent(nameMatchUrl)}`).then(r => r.json())
        ]);

        // 合併兩邊的結果 (利用 taxon_id 去重)
        const resultMap = new Map();

        // 處理 taxon 搜尋結果 (這部分通常已經包含詳細資料)
        if (taxonRes.data) {
            taxonRes.data.forEach(item => resultMap.set(item.taxon_id, item));
        }

        // 處理 nameMatch 結果 (如果有的話，這些可能只有基本資料)
        if (nameRes.data) {
            for (const item of nameRes.data) {
                if (!resultMap.has(item.taxon_id)) {
                    // 如果這筆 ID 在第一步沒抓到，補抓它的詳細資料
                    const detail = await fetch(`https://corsproxy.io/?${encodeURIComponent(`https://api.taicol.tw/v2/taxon?taxon_id=${item.taxon_id}`)}`)
                        .then(r => r.json());
                    if (detail.data) resultMap.set(item.taxon_id, detail.data[0]);
                }
            }
        }

        const fishList = Array.from(resultMap.values());

        if (fishList.length === 0) {
            resultDiv.innerHTML = `❌ 找不到與「${keyword}」相關的魚類。`;
            return;
        }

        // --- 渲染清單 ---
        resultDiv.innerHTML = `
            <p style="margin-bottom:15px; color:#666; font-size:0.9em;">共找到 ${fishList.length} 種符合關鍵字的魚類：</p>
            ${fishList.map(fish => {
                const sciName = fish.simple_name || fish.scientific_name || "Unknown";
                const alienMap = {
                    'native': '🐟 原生種',
                    'naturalized': '🌍 歸化種',
                    'invasive': '⚠️ 入侵種',
                    'cultured': '🏠 養殖種'
                };

                return `
                    <div style="background: white; padding: 20px; border-radius: 12px; border: 2px solid #0077be; margin-bottom: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <div style="flex: 1;">
                                <h3 style="margin: 0 0 8px 0; color: #0077be;">🐟 ${fish.common_name_c || '未命名'}</h3>
                                <div style="font-size: 1em; color: #d32f2f; margin-bottom: 8px;"><i>${sciName}</i></div>
                                
                                <div style="font-size: 0.85em; color: #555; background: #f8f9fa; padding: 8px; border-radius: 6px; margin: 10px 0; border-left: 3px solid #0077be;">
                                    <strong>別名：</strong> ${fish.alternative_name_c || '無'}
                                </div>

                                <table style="width: 100%; font-size: 0.85em; color: #444;">
                                    <tr>
                                        <td><strong>地位：</strong> ${fish.taxon_status === 'accepted' ? '有效名' : '非有效名'}</td>
                                        <td><strong>性質：</strong> ${alienMap[fish.alien_type] || '原生'}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>階層：</strong> ${fish.rank || 'Species'}</td>
                                        <td><strong>界名：</strong> ${fish.kingdom || 'Animalia'}</td>
                                    </tr>
                                </table>
                            </div>
                            <a href="https://www.fishbase.se/summary/${sciName.replace(/\s+/g, '-')}" target="_blank" 
                               style="background: #0077be; color: white; padding: 10px 15px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 0.85em; margin-left: 10px; text-align: center;">
                               FishBase
                            </a>
                        </div>
                    </div>
                `;
            }).join('')}
        `;

    } catch (error) {
        console.error("搜尋錯誤:", error);
        resultDiv.innerHTML = `<div style="color:red; text-align:center; padding:20px;">⚠️ API 連線逾時，請重試。</div>`;
    }
});