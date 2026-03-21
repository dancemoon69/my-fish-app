const searchBtn = document.querySelector('#searchBtn');
const fishInput = document.querySelector('#fishName');
const resultDiv = document.querySelector('#result');

searchBtn.addEventListener('click', async () => {
    const name = fishInput.value.trim();
    if (!name) return;

    resultDiv.innerHTML = '正在大海中搜尋... 🔍';

    // 1. 確保使用 https 協定
    const targetUrl = `https://api.taicol.tw/v2/nameMatch?name=${encodeURIComponent(name)}`;
    
    // 2. 換一個更強大的中轉站 corsproxy.io
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

    try {
        const response = await fetch(proxyUrl);
        
        if (!response.ok) throw new Error(`連線失敗 (${response.status})`);

        const data = await response.json();
        console.log('API 回傳資料：', data);

        if (data.data && data.data.length > 0) {
            const fish = data.data[0];
            const sciName = fish.scientificName;
            
            resultDiv.innerHTML = `
                <div style="background: white; padding: 20px; border-radius: 15px; border: 2px solid #0077be; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                    <h2 style="color: #0077be; margin-top:0;">🐟 ${fish.commonName || name}</h2>
                    <p><strong>學名：</strong> <i style="color: #d32f2f;">${sciName}</i></p>
                    <p><strong>科名：</strong> ${fish.family || '讀取中'}</p>
                    <hr style="border: 0.5px solid #eee;">
                    <a href="https://www.fishbase.se/summary/${sciName.replace(/\s+/g, '-')}" 
                       target="_blank" 
                       style="display: block; background: #0077be; color: white; text-align: center; padding: 12px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                       ➔ 查看 FishBase 全球數據
                    </a>
                </div>
            `;
        } else {
            resultDiv.innerHTML = '❌ 找不到這條魚，試試搜尋「鬼頭刀」或「虱目魚」。';
        }
    } catch (error) {
        console.error('詳細錯誤訊息：', error);
        // 這裡會顯示具體的錯誤原因
        resultDiv.innerHTML = `⚠️ 搜尋失敗！<br>原因：${error.message}<br><small>請確認您的瀏覽器是否開啟了廣告阻擋器 (AdBlock)。</small>`;
    }
});