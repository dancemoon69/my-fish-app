const searchBtn = document.querySelector('#searchBtn');
const fishInput = document.querySelector('#fishName');
const resultDiv = document.querySelector('#result');

// 💡 提醒：TaiCOL v2 現在大多需要 Token 才能穩定抓取資料
// 如果你還沒申請，可以先空著，但建議去 https://taicol.tw/zh-hant/api 申請一個
const TAICOL_TOKEN = ''; 

searchBtn.addEventListener('click', async () => {
    const name = fishInput.value.trim();
    if (!name) return;

    resultDiv.innerHTML = '正在大海中搜尋... 🔍';

    // 1. 正確的 TaiCOL v2 網址 (務必是 https)
    const targetUrl = `https://api.taicol.tw/v2/nameMatch?name=${encodeURIComponent(name)}`;
    
    // 2. 使用 allorigins 代理伺服器 (這個服務比 codetabs 穩定)
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;

    try {
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('連線中轉站失敗');

        const jsonWrapper = await response.json();
        
        // allorigins 會把結果包在 contents 字串裡，需要轉回物件
        const data = JSON.parse(jsonWrapper.contents);

        if (data.data && data.data.length > 0) {
            // 找到最匹配的第一筆資料
            const fish = data.data[0];
            const sciName = fish.scientificName;
            
            resultDiv.innerHTML = `
                <div style="background: white; padding: 20px; border-radius: 15px; border: 2px solid #0077be; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                    <h2 style="color: #0077be; margin-top:0;">🐟 ${fish.commonName || name}</h2>
                    <p><strong>學名：</strong> <i style="color: #d32f2f;">${sciName}</i></p>
                    <p><strong>科名：</strong> ${fish.family || '讀取中'}</p>
                    <hr>
                    <a href="https://www.fishbase.se/summary/${sciName.replace(/\s+/g, '-')}" 
                       target="_blank" 
                       style="display: block; background: #0077be; color: white; text-align: center; padding: 12px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                       ➔ 查看 FishBase 全球數據
                    </a>
                </div>
            `;
        } else {
            resultDiv.innerHTML = '❌ 在台灣名錄中找不到這條魚，請試試看其他名稱。';
        }
    } catch (error) {
        console.error('詳細錯誤：', error);
        resultDiv.innerHTML = `⚠️ 搜尋出錯了！原因：${error.message}<br>可能是 API 暫時限制連線。`;
    }
});