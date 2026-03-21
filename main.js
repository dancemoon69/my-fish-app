const searchBtn = document.querySelector('#searchBtn');
const fishInput = document.querySelector('#fishName');
const resultDiv = document.querySelector('#result');

searchBtn.addEventListener('click', async () => {
    const name = fishInput.value.trim();
    if (!name) return;

    resultDiv.innerHTML = '<p style="color: #0077be;">正在連線至台灣物種資料庫... 🌊</p>';

    // 使用 allorigins 抓取原始資料
    const targetUrl = `https://api.taicol.tw/v2/nameMatch?name=${encodeURIComponent(name)}`;
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;

    try {
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('伺服器目前沒有回應');

        const wrapper = await response.json();
        const content = wrapper.contents;

        // 偵錯：在控制台印出原始內容
        console.log("原始內容:", content);

        // 檢查內容是否為空的或不正常的文字
        if (!content || content.includes('charset=') || content.startsWith('<!DOCTYPE')) {
            throw new Error('資料庫回傳了非格式化文字，請稍後再試。');
        }

        // 嘗試解析資料
        const finalData = JSON.parse(content);

        if (finalData.data && finalData.data.length > 0) {
            const fish = finalData.data[0];
            const sciName = fish.scientificName;
            
            resultDiv.innerHTML = `
                <div style="background: white; padding: 20px; border-radius: 15px; border: 2px solid #0077be; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                    <h2 style="color: #0077be; margin-top:0;">🐟 ${fish.commonName || name}</h2>
                    <p><strong>學名：</strong> <i style="color: #d32f2f;">${sciName}</i></p>
                    <p><strong>科名：</strong> ${fish.family || '資料讀取中'}</p>
                    <hr style="border:0; border-top:1px solid #eee; margin:15px 0;">
                    <a href="https://www.fishbase.se/summary/${sciName.replace(/\s+/g, '-')}" 
                       target="_blank" 
                       style="display: block; background: #0077be; color: white; text-align: center; padding: 12px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                       ➔ 查看 FishBase 詳細數據
                    </a>
                </div>
            `;
        } else {
            resultDiv.innerHTML = `❌ 找不到「${name}」，請嘗試搜尋「鬼頭刀」。`;
        }
    } catch (error) {
        console.error("詳細錯誤:", error);
        resultDiv.innerHTML = `
            <div style="color: #d32f2f; padding: 10px; border: 1px dashed red;">
                ⚠️ 搜尋失敗！<br>
                原因：系統目前繁忙或格式錯誤。<br>
                <small>錯誤代碼：${error.message}</small>
            </div>
        `;
    }
});