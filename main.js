const searchBtn = document.querySelector('#searchBtn');
const fishInput = document.querySelector('#fishName');
const resultDiv = document.querySelector('#result');

searchBtn.addEventListener('click', async () => {
    const name = fishInput.value.trim();
    if (!name) return;

    resultDiv.innerHTML = `<p style="color: #0077be;">正在 TaiCOL 資料庫搜尋「${name}」... 🌊</p>`;

    // 💡 嚴格遵循官方文件參數：bio_group=魚類 (排除植物), best=yes (精確比對)
    const targetUrl = `https://api.taicol.tw/v2/nameMatch?name=${encodeURIComponent(name)}&bio_group=魚類&best=yes`;
    
    // 依然需要中轉站來解決 GitHub Pages 的 CORS 限制
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;

    try {
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('中轉站連線失敗');

        const wrapper = await response.json();
        let data;

        // 1. 解析 TaiCOL 回傳的內容 (處理可能的 Base64 編碼)
        try {
            const rawContent = wrapper.contents;
            data = rawContent.startsWith('data:application/json') 
                ? JSON.parse(atob(rawContent.split(',')[1])) 
                : JSON.parse(rawContent);
        } catch (e) {
            console.error("解析失敗，原始內容為:", wrapper.contents);
            throw new Error('資料格式解析失敗，可能是 API 回傳了錯誤網頁');
        }

        // 2. 檢查是否有回傳資料
        if (data && data.data && data.data.length > 0) {
            const fish = data.data[0];

            // 💡 安全檢查：確保有學名才進行處理，避免 split 報錯
            const rawSciName = fish.scientificName || "學名資料缺失";
            // 只取前兩個單字 (屬名+種小名)，並過濾掉可能的括號或作者名
            const cleanSciName = rawSciName.split(' ').slice(0, 2).join(' ').replace(/[^a-zA-Z ]/g, "");
            
            resultDiv.innerHTML = `
                <div style="background: white; padding: 20px; border-radius: 15px; border: 2px solid #0077be; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                    <h2 style="color: #0077be; margin-top:0;">🐟 ${fish.commonName || name}</h2>
                    <p style="font-size: 1.1em;"><strong>標準學名：</strong> <i style="color: #d32f2f;">${cleanSciName}</i></p>
                    <p><strong>分類科別：</strong> ${fish.family || '（未分類）'}</p>
                    <p style="font-size: 0.85em; color: #666;">類群：${fish.bioGroup || '魚類'}</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 15px 0;">
                    <a href="https://www.fishbase.se/summary/${cleanSciName.replace(/\s+/g, '-')}" 
                       target="_blank" 
                       style="display: block; background: #0077be; color: white; text-align: center; padding: 12px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                       ➔ 查看 FishBase 全球詳細數據
                    </a>
                </div>
            `;
        } else {
            resultDiv.innerHTML = `
                <div style="padding: 20px; background: #f8f9fa; border-radius: 10px; text-align: center;">
                    ❌ 在台灣魚類名錄中找不到「${name}」。<br>
                    <small style="color: #888;">請確認名稱是否正確（例如：白帶魚、虱目魚）</small>
                </div>
            `;
        }
    } catch (error) {
        console.error("Debug Error:", error);
        resultDiv.innerHTML = `
            <div style="color: #d32f2f; padding: 15px; border: 1px solid #ffcdd2; background: #fff3f3; border-radius: 10px;">
                ⚠️ <strong>搜尋失敗</strong><br>
                原因：${error.message}<br>
                <small>請檢查網路連線，或嘗試重新搜尋。</small>
            </div>
        `;
    }
});