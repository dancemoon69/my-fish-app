const searchBtn = document.querySelector('#searchBtn');
const fishInput = document.querySelector('#fishName');
const resultDiv = document.querySelector('#result');

searchBtn.addEventListener('click', async () => {
    const name = fishInput.value.trim();
    if (!name) return;

    resultDiv.innerHTML = '<p style="color: #0077be;">正在大海中打撈資料... 🌊</p>';

    // 1. 加上隨機數防止瀏覽器一直讀取舊的錯誤暫存 (Cache Busting)
    const targetUrl = `https://api.taicol.tw/v2/nameMatch?name=${encodeURIComponent(name)}&t=${Date.now()}`;
    
    // 2. 使用 allorigins 中轉站（目前最穩定的）
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;

    try {
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('中轉伺服器沒有回應');

        const wrapper = await response.json();
        let finalData;

        // 3. 【關鍵解碼步驟】處理你遇到的 "data:application/json" 狀況
        if (wrapper.contents.startsWith('data:application/json')) {
            // 如果資料被轉成了 Data URL，我們直接再 fetch 它一次，瀏覽器會自動解碼
            const decodedResponse = await fetch(wrapper.contents);
            finalData = await decodedResponse.json();
        } else {
            // 如果是普通的字串，就直接解析
            finalData = JSON.parse(wrapper.contents);
        }

        console.log('成功解碼後的資料：', finalData);

        // 4. 顯示結果
        if (finalData.data && finalData.data.length > 0) {
            const fish = finalData.data[0];
            const sciName = fish.scientificName;
            
            resultDiv.innerHTML = `
                <div style="background: white; padding: 20px; border-radius: 15px; border: 2px solid #0077be; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                    <h2 style="color: #0077be; margin-top:0;">🐟 ${fish.commonName || name}</h2>
                    <p style="font-size: 1.1em;"><strong>學名：</strong> <i style="color: #d32f2f;">${sciName}</i></p>
                    <p><strong>分類科名：</strong> ${fish.family || '資料庫讀取中'}</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 15px 0;">
                    <a href="https://www.fishbase.se/summary/${sciName.replace(/\s+/g, '-')}" 
                       target="_blank" 
                       style="display: block; background: #0077be; color: white; text-align: center; padding: 12px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                       ➔ 前往 FishBase 全球魚類資料庫
                    </a>
                </div>
            `;
        } else {
            resultDiv.innerHTML = `❌ 找不到「${name}」，試試：鬼頭刀、虱目魚。`;
        }
    } catch (error) {
        console.error('Debug 詳情:', error);
        resultDiv.innerHTML = `
            <div style="color: #d32f2f; padding: 10px; border: 1px dashed red;">
                ⚠️ 搜尋失敗！<br>
                原因：${error.message}<br>
                <small>請確認您的網路是否連通，或嘗試關閉 AdBlock 廣告阻擋器。</small>
            </div>
        `;
    }
});