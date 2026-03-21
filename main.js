const searchBtn = document.querySelector('#searchBtn');
const fishInput = document.querySelector('#fishName');
const resultDiv = document.querySelector('#result');

searchBtn.addEventListener('click', async () => {
    const name = fishInput.value.trim();
    if (!name) return;

    resultDiv.innerHTML = '<p style="color: #0077be;">正在大海中精確搜尋魚類資料... 🎣</p>';

    // GBIF API：增加過濾條件，限制在動物界 (kingdom=Animalia)
    const url = `https://api.gbif.org/v1/species/search?q=${encodeURIComponent(name)}&kingdom=Animalia&limit=20`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('資料庫回應錯誤');

        const data = await response.json();
        console.log("搜尋到的所有動物結果：", data.results);

        // 【精確過濾核心】
        // 在所有結果中，尋找 class 為「條鰭魚綱」(Actinopterygii) 或「軟骨魚綱」(Elasmobranchii) 的項目
        const fish = data.results.find(item => 
            item.class === 'Actinopterygii' || 
            item.class === 'Elasmobranchii' ||
            item.phylum === 'Chordata' && item.taxonomicStatus === 'ACCEPTED'
        );

        if (fish) {
            // 取得學名並修剪（只取前兩個單字，例如 Coryphaena hippurus）
            const sciName = fish.scientificName.split(' ').slice(0, 2).join(' ');
            
            // 鬼頭刀的正確學名應該是 Coryphaena hippurus
            resultDiv.innerHTML = `
                <div style="background: white; padding: 20px; border-radius: 15px; border: 2px solid #0077be; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                    <h2 style="color: #0077be; margin-top:0;">🐟 ${name} (結果最接近者)</h2>
                    <p style="font-size: 1.1em;"><strong>科學學名：</strong> <i style="color: #d32f2f;">${sciName}</i></p>
                    <p><strong>分類：</strong> ${fish.family || '讀取中'} / ${fish.class || '魚類'}</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 15px 0;">
                    <a href="https://www.fishbase.se/summary/${sciName.replace(/\s+/g, '-')}" 
                       target="_blank" 
                       style="display: block; background: #0077be; color: white; text-align: center; padding: 12px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                       ➔ 前往 FishBase 查看詳細圖鑑
                    </a>
                    <p style="font-size: 0.8em; color: #666; margin-top:10px;">註：若 FishBase 沒圖，代表學名匹配較廣，請點入查看其同物異名。</p>
                </div>
            `;
        } else {
            resultDiv.innerHTML = `❌ 找不到「${name}」的魚類紀錄。請嘗試更精確的名稱。`;
        }
    } catch (error) {
        console.error("錯誤詳情:", error);
        resultDiv.innerHTML = `<div style="color:red;">⚠️ 連線失敗：${error.message}</div>`;
    }
});