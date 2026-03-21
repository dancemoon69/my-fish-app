const searchBtn = document.querySelector('#searchBtn');
const fishInput = document.querySelector('#fishName');
const resultDiv = document.querySelector('#result');

searchBtn.addEventListener('click', async () => {
    const name = fishInput.value.trim();
    if (!name) return;

    resultDiv.innerHTML = '<p style="color: #0077be;">正在直接連線 TaiCOL 官方資料庫... 🚢</p>';

    // 直接呼叫 TaiCOL API，加上你提供的精確參數
    const url = `https://api.taicol.tw/v2/nameMatch?name=${encodeURIComponent(name)}&bio_group=魚類&best=yes`;

    try {
        // 💡 嘗試直接連線，不透過任何中轉站
        const response = await fetch(url);
        
        if (!response.ok) throw new Error(`API 伺服器回傳錯誤: ${response.status}`);

        const data = await response.json();
        
        if (data.data && data.data.length > 0) {
            const fish = data.data[0];
            const sciName = fish.scientificName.split(' ').slice(0, 2).join(' ');
            
            resultDiv.innerHTML = `
                <div style="background: white; padding: 20px; border-radius: 15px; border: 2px solid #0077be; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                    <h2 style="color: #0077be; margin-top:0;">🐟 ${fish.commonName || name}</h2>
                    <p><strong>學名：</strong> <i style="color: #d32f2f;">${sciName}</i></p>
                    <p><strong>科別：</strong> ${fish.family || '魚類'}</p>
                    <hr style="border:0; border-top:1px solid #eee; margin:15px 0;">
                    <a href="https://www.fishbase.se/summary/${sciName.replace(/\s+/g, '-')}" 
                       target="_blank" 
                       style="display: block; background: #0077be; color: white; text-align: center; padding: 12px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                       ➔ 查看 FishBase 詳細圖鑑
                    </a>
                </div>
            `;
        } else {
            resultDiv.innerHTML = `❌ 找不到「${name}」，請確認名稱是否正確。`;
        }
    } catch (error) {
        console.error("連線報錯：", error);
        
        // 💡 如果失敗，顯示最直白的錯誤原因
        resultDiv.innerHTML = `
            <div style="color: #d32f2f; padding: 15px; border: 1px solid #ffcdd2; background: #fff3f3; border-radius: 10px;">
                <p><strong>⚠️ 無法直接連線到資料庫</strong></p>
                <p style="font-size: 0.85em;">原因：${error.message}</p>
                <p style="font-size: 0.85em;">這通常是瀏覽器的安全限制 (CORS) 導致的。</p>
                <hr>
                <p style="font-size: 0.85em;"><strong>解決建議：</strong><br>
                1. 考慮將常用魚類資料直接存在 App 內 (離線模式)。<br>
                2. 使用支援跨域的 GBIF 資料庫。</p>
            </div>
        `;
    }
});