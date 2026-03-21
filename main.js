const searchBtn = document.querySelector('#searchBtn');
const fishInput = document.querySelector('#fishName');
const resultDiv = document.querySelector('#result');

searchBtn.addEventListener('click', async () => {
    const name = fishInput.value.trim();
    if (!name) return;

    resultDiv.innerHTML = `<p style="color: #0077be;">正在向 TaiCOL 申請資料中... 📡</p>`;

    // 💡 依照你提供的官方文件優化參數
    const targetUrl = `https://api.taicol.tw/v2/nameMatch?name=${encodeURIComponent(name)}&bio_group=魚類&best=yes`;
    
    // 💡 使用 corsproxy.io，這是一個目前對 GitHub Pages 支援度極高的中轉站
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

    try {
        const response = await fetch(proxyUrl);
        
        // 如果連線失敗 (例如 404 或 500)
        if (!response.ok) throw new Error(`中轉伺服器回應異常 (${response.status})`);

        const data = await response.json();
        console.log("成功取得資料：", data);

        if (data.data && data.data.length > 0) {
            const fish = data.data[0];
            
            // 安全處理學名，防止 split 報錯
            const rawSci = fish.scientificName || "N/A N/A";
            const cleanSci = rawSci.split(' ').slice(0, 2).join(' ');

            resultDiv.innerHTML = `
                <div style="background: white; padding: 20px; border-radius: 15px; border: 2px solid #0077be; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                    <h2 style="color: #0077be; margin-top:0;">🐟 ${fish.commonName || name}</h2>
                    <p style="font-size: 1.1em;"><strong>官方學名：</strong> <i style="color: #d32f2f;">${cleanSci}</i></p>
                    <p><strong>分類科別：</strong> ${fish.family || '（未分類）'}</p>
                    <hr style="border:0; border-top:1px solid #eee; margin:15px 0;">
                    <a href="https://www.fishbase.se/summary/${cleanSci.replace(/\s+/g, '-')}" 
                       target="_blank" 
                       style="display: block; background: #0077be; color: white; text-align: center; padding: 12px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                       ➔ 查看 FishBase 全球圖鑑
                    </a>
                </div>
            `;
        } else {
            resultDiv.innerHTML = `<p>❌ 在台灣魚類名錄中找不到「${name}」。</p>`;
        }
    } catch (error) {
        console.error("連線錯誤詳情:", error);
        resultDiv.innerHTML = `
            <div style="color: #d32f2f; padding: 15px; border: 1px solid #ffcdd2; background: #fff3f3; border-radius: 10px;">
                ⚠️ <strong>連線被攔截 (Failed to fetch)</strong><br>
                <p style="font-size: 0.85em; margin: 10px 0;">這通常是瀏覽器的安全設定或廣告阻擋器造成的。</p>
                <button onclick="location.reload()" style="background:#d32f2f; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;">重新整理網頁</button>
            </div>
        `;
    }
});