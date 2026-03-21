const searchBtn = document.querySelector('#searchBtn');
const fishInput = document.querySelector('#fishName');
const resultDiv = document.querySelector('#result');

// 嘗試抓取資料的函式
async function fetchFishData(name) {
    const targetUrl = `https://api.taicol.tw/v2/nameMatch?name=${encodeURIComponent(name)}`;
    
    // 方案 A: 使用 allorigins (最穩定)
    const proxyA = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
    // 方案 B: 使用 corsproxy.io (備用)
    const proxyB = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

    console.log("嘗試方案 A...");
    try {
        const res = await fetch(proxyA);
        if (!res.ok) throw new Error("方案 A 失敗");
        const json = await res.json();
        
        // 處理那串討厭的 "data:application/json"
        if (json.contents.startsWith('data:application/json')) {
            const dataUrlRes = await fetch(json.contents);
            return await dataUrlRes.json();
        }
        return JSON.parse(json.contents);
    } catch (err) {
        console.warn("方案 A 失敗，切換至方案 B...", err);
        const res = await fetch(proxyB);
        if (!res.ok) throw new Error("所有連線方案都失敗了");
        return await res.json();
    }
}

searchBtn.addEventListener('click', async () => {
    const name = fishInput.value.trim();
    if (!name) return;

    resultDiv.innerHTML = '<p style="color: #0077be;">正在大海中搜尋... 🌊</p>';

    try {
        const data = await fetchFishData(name);
        console.log("最終抓到的資料：", data);

        if (data.data && data.data.length > 0) {
            const fish = data.data[0];
            const sciName = fish.scientificName;
            
            resultDiv.innerHTML = `
                <div style="background: white; padding: 20px; border-radius: 15px; border: 2px solid #0077be; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                    <h2 style="color: #0077be; margin-top:0;">🐟 ${fish.commonName || name}</h2>
                    <p><strong>學名：</strong> <i style="color: #d32f2f;">${sciName}</i></p>
                    <p><strong>科名：</strong> ${fish.family || '讀取中'}</p>
                    <hr style="border:0; border-top:1px solid #eee; margin:15px 0;">
                    <a href="https://www.fishbase.se/summary/${sciName.replace(/\s+/g, '-')}" 
                       target="_blank" 
                       style="display: block; background: #0077be; color: white; text-align: center; padding: 12px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                       ➔ 查看 FishBase 詳細數據
                    </a>
                </div>
            `;
        } else {
            resultDiv.innerHTML = `❌ 找不到「${name}」，試試：鬼頭刀。`;
        }
    } catch (error) {
        console.error("最終報錯內容:", error);
        resultDiv.innerHTML = `
            <div style="color: #d32f2f; padding: 10px; border: 1px dashed red;">
                ⚠️ 連線還是失敗了...<br>
                原因：${error.message}<br>
                <strong>💡 解決辦法：</strong><br>
                1. 請關閉 AdBlock 或 uBlock 廣告阻擋器。<br>
                2. 如果用手機，請關閉省電模式或嘗試用 4G/5G 網路。<br>
                3. 如果用 Brave 瀏覽器，請關閉「盾牌」。
            </div>
        `;
    }
});