const searchBtn = document.querySelector('#searchBtn');
const fishInput = document.querySelector('#fishName');
const resultDiv = document.querySelector('#result');

searchBtn.addEventListener('click', async () => {
    const name = fishInput.value.trim();
    if (!name) return;

    // 💡 保持畫面有內容，避免讓使用者覺得當機
    resultDiv.innerHTML = `<div style="text-align:center; padding:20px;">
        <p style="color: #0077be; font-weight:bold;">🌊 正在撒網撈資料，請稍候...</p>
        <small style="color:#999;">正在比對官方名錄與調閱科別資訊...</small>
    </div>`;

    try {
        // Step 1: 名稱比對
        const matchUrl = `https://api.taicol.tw/v2/nameMatch?name=${encodeURIComponent(name)}&best=no&limit=10`;
        const proxyMatch = `https://corsproxy.io/?${encodeURIComponent(matchUrl)}`;
        
        const matchRes = await fetch(proxyMatch);
        const matchData = await matchRes.json();
        const candidates = matchData.data || [];

        if (candidates.length === 0) {
            resultDiv.innerHTML = `<p style="padding:20px; text-align:center;">❌ 找不到與「${name}」相關的紀錄。</p>`;
            return;
        }

        // Step 2: 抓取詳細資料 (改用 allSettled，一筆壞掉不影響全部)
        const detailPromises = candidates.map(async (item) => {
            const tid = item.taxon_id;
            const detailUrl = `https://api.taicol.tw/v2/taxon/${tid}`;
            const proxyDetail = `https://corsproxy.io/?${encodeURIComponent(detailUrl)}`;
            
            const dRes = await fetch(proxyDetail);
            const dData = await dRes.json();
            return dData.data ? (Array.isArray(dData.data) ? dData.data[0] : dData.data) : dData;
        });

        const settledResults = await Promise.allSettled(detailPromises);
        
        // 過濾出成功的結果
        const finalFishList = settledResults
            .filter(result => result.status === 'fulfilled' && result.value)
            .map(result => result.value);

        if (finalFishList.length === 0) {
            resultDiv.innerHTML = `<p style="padding:20px;">⚠️ 雖然找到了物種，但詳細資料調閱失敗。請再試一次。</p>`;
            return;
        }

        // Step 3: 渲染清單 (加上防呆檢查)
        resultDiv.innerHTML = finalFishList.map(fish => {
            const sciName = fish.scientific_name || "Unknown species";
            const cleanSci = sciName.split(' ').slice(0, 2).join(' ');
            const familyName = fish.family_c ? `${fish.family_c} (${fish.family || ''})` : (fish.family || '未分類');

            return `
                <div style="background: white; padding: 20px; border-radius: 15px; border: 2px solid #0077be; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                    <h3 style="margin: 0 0 10px 0; color: #0077be;">🐟 ${fish.common_name_c || name}</h3>
                    <p style="margin: 5px 0;"><strong>科別：</strong> ${familyName}</p>
                    <p style="margin: 5px 0; font-size: 0.9em; color: #d32f2f;"><i>${sciName}</i></p>
                    <div style="margin-top: 15px; display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 0.8em; color: #999;">ID: ${fish.taxon_id}</span>
                        <a href="https://www.fishbase.se/summary/${cleanSci.replace(/\s+/g, '-')}" 
                           target="_blank" 
                           style="background: #0077be; color: white; padding: 10px 18px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                           前往 FishBase
                        </a>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error("Critical Error:", error);
        resultDiv.innerHTML = `<div style="color:red; padding:20px; text-align:center;">
            ⚠️ 搜尋發生錯誤：${error.message}<br>
            <small>可能是中轉站暫時斷線，請重新點擊搜尋。</small>
        </div>`;
    }
});