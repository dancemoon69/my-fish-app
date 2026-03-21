const searchBtn = document.querySelector('#searchBtn');
const fishInput = document.querySelector('#fishName');
const resultDiv = document.querySelector('#result');

searchBtn.addEventListener('click', async () => {
    const name = fishInput.value.trim();
    if (!name) return;

    resultDiv.innerHTML = `<p style="color: #0077be;">正在解碼 TaiCOL 官方數據... 🔍</p>`;

    const targetUrl = `https://api.taicol.tw/v2/nameMatch?name=${encodeURIComponent(name)}&bio_group=魚類&best=yes`;
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

    try {
        const response = await fetch(proxyUrl);
        const data = await response.json();
        
        // 💡 關鍵偵錯：這行會在瀏覽器 Console (F12) 印出完整的資料結構
        console.log("TaiCOL 回傳完整物件:", data);

        if (data.data && data.data.length > 0) {
            const fish = data.data[0];

            // 💡 自動尋找學名 (嘗試所有可能的欄位名稱)
            const sciNameFull = fish.scientificName || fish.scientific_name || fish.scientific_name_full || fish.name || "Unknown";
            
            // 💡 自動尋找中文名
            const commonName = fish.commonName || fish.common_name_c || fish.common_name || name;

            // 💡 自動尋找科名
            const familyName = fish.family || fish.family_c || fish.family_name || "（未分類）";

            // 格式化學名 (只取前兩個字，例如 Coryphaena hippurus)
            const cleanSci = sciNameFull !== "Unknown" ? sciNameFull.split(' ').slice(0, 2).join(' ') : "Unknown";

            resultDiv.innerHTML = `
                <div style="background: white; padding: 20px; border-radius: 15px; border: 2px solid #0077be; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                    <h2 style="color: #0077be; margin-top:0;">🐟 ${commonName}</h2>
                    <p style="font-size: 1.1em;"><strong>官方學名：</strong> <i style="color: #d32f2f;">${cleanSci}</i></p>
                    <p><strong>分類科別：</strong> ${familyName}</p>
                    <hr style="border:0; border-top:1px solid #eee; margin:15px 0;">
                    <a href="https://www.fishbase.se/summary/${cleanSci.replace(/\s+/g, '-')}" 
                       target="_blank" 
                       style="display: block; background: #0077be; color: white; text-align: center; padding: 12px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                       ➔ 前往 FishBase 查看詳細圖鑑
                    </a>
                </div>
            `;
        } else {
            resultDiv.innerHTML = `❌ 找不到「${name}」，請確認名稱是否正確。`;
        }
    } catch (error) {
        console.error("連線錯誤:", error);
        resultDiv.innerHTML = `<div style="color:red;">⚠️ 連線失敗，請稍後再試。</div>`;
    }
});