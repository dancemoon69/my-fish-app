const searchBtn = document.querySelector('#searchBtn');
const fishInput = document.querySelector('#fishName');
const resultDiv = document.querySelector('#result');

searchBtn.addEventListener('click', async () => {
    const name = fishInput.value.trim();
    if (!name) return;

    resultDiv.innerHTML = '<p style="color: #0077be;">正在連線全球生物資料庫 (GBIF)... 🌍</p>';

    // GBIF API：直接搜尋，支援中文，且不需要中轉站！
    const url = `https://api.gbif.org/v1/species/search?q=${encodeURIComponent(name)}&language=zh`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('資料庫回應錯誤');

        const data = await response.json();
        console.log("GBIF 資料：", data);

        // 找尋結果中屬於「魚類」的資料 (Animalia 界, Chordata 門)
        const fish = data.results.find(item => 
            item.kingdom === 'Animalia' && 
            (item.class === 'Actinopterygii' || item.class === 'Elasmobranchii')
        ) || data.results[0]; // 如果找不到精確的，就抓第一筆

        if (fish) {
            const sciName = fish.scientificName.split(' ').slice(0, 2).join(' '); // 簡化學名
            
            resultDiv.innerHTML = `
                <div style="background: white; padding: 20px; border-radius: 15px; border: 2px solid #0077be; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                    <h2 style="color: #0077be; margin-top:0;">🐟 ${fish.vernacularName || name}</h2>
                    <p><strong>科學學名：</strong> <i style="color: #d32f2f;">${sciName}</i></p>
                    <p><strong>分類階層：</strong> ${fish.family || '讀取中'} / ${fish.class || ''}</p>
                    <hr style="border:0; border-top:1px solid #eee; margin:15px 0;">
                    <a href="https://www.fishbase.se/summary/${sciName.replace(/\s+/g, '-')}" 
                       target="_blank" 
                       style="display: block; background: #0077be; color: white; text-align: center; padding: 12px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                       ➔ 前往 FishBase 全球魚類圖鑑
                    </a>
                </div>
            `;
        } else {
            resultDiv.innerHTML = `❌ 找不到「${name}」的相關魚類紀錄。`;
        }
    } catch (error) {
        console.error("錯誤詳情:", error);
        resultDiv.innerHTML = `<div style="color:red;">⚠️ 連線失敗：${error.message}</div>`;
    }
});