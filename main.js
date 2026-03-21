const searchBtn = document.querySelector('#searchBtn');
const fishInput = document.querySelector('#fishName');
const resultDiv = document.querySelector('#result');

searchBtn.addEventListener('click', async () => {
    const name = fishInput.value.trim();
    if (!name) {
        alert('請先輸入魚的名字喔！');
        return;
    }

    resultDiv.innerHTML = '正在大海中搜尋... 🔍';

    // 1. TaiCOL API 原始網址 (一定要 https)
    const targetUrl = `https://api.taicol.tw/v2/nameMatch?name=${encodeURIComponent(name)}`;
    
    // 2. 使用 allorigins 的 raw 模式，直接拿原始資料
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;

    try {
        const response = await fetch(proxyUrl);
        
        if (!response.ok) throw new Error(`連線失敗: ${response.status}`);

        // 先拿回文字內容，我們來看看是不是真的 JSON
        const rawText = await response.text();
        console.log('原始回傳內容：', rawText);

        // 嘗試解析 JSON
        let data;
        try {
            data = JSON.parse(rawText);
        } catch (e) {
            // 如果解析失敗，看看是不是被轉成了 Data URL
            if (rawText.startsWith('data:application/json')) {
                const base64Data = rawText.split(',')[1];
                data = JSON.parse(atob(base64Data)); // 解碼 base64
            } else {
                throw new Error('回傳格式錯誤，不是有效的 JSON');
            }
        }

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
            resultDiv.innerHTML = `❌ 在名錄中找不到「${name}」。<br><small>建議試試：鬼頭刀、虱目魚、白帶魚</small>`;
        }
    } catch (error) {
        console.error('詳細錯誤：', error);
        resultDiv.innerHTML = `⚠️ 搜尋出錯！<br>原因：${error.message}<br><small>請確認您的網路環境或稍後再試。</small>`;
    }
});