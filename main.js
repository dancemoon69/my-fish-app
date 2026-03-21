const searchBtn = document.querySelector('#searchBtn');
const fishInput = document.querySelector('#fishName');
const resultDiv = document.querySelector('#result');

searchBtn.addEventListener('click', async () => {
    const name = fishInput.value.trim();
    if (!name) return;

    resultDiv.innerHTML = `<p style="color: #0077be;">正在讀取 TaiCOL 官方資料... 🔍</p>`;

    // 💡 官方參數：bio_group=魚類, best=yes
    const targetUrl = `https://api.taicol.tw/v2/nameMatch?name=${encodeURIComponent(name)}&bio_group=魚類&best=yes`;
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

    try {
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('伺服器回應異常');

        const data = await response.json();
        
        // 💡 偵錯用：你可以按 F12 在 Console 看到完整的資料結構
        console.log("TaiCOL 原始回傳：", data);

        if (data.data && data.data.length > 0) {
            const fish = data.data[0];

            // 💡 TaiCOL v2 關鍵欄位對應 (嘗試多種可能)
            const commonName = fish.common_name_c || fish.common_name || fish.name || name;
            const sciNameFull = fish.scientific_name || fish.scientificName || "Unknown species";
            const familyName = fish.family || fish.family_c || "（未分類）";

            // 格式化學名：只取前兩個字 (屬名 種小名)
            const cleanSci = sciNameFull.split(' ').slice(0, 2).join(' ');

            resultDiv.innerHTML = `
                <div style="background: white; padding: 20px; border-radius: 15px; border: 2px solid #0077be; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                    <h2 style="color: #0077be; margin-top:0;">🐟 ${commonName}</h2>
                    <p style="font-size: 1.1em;"><strong>官方學名：</strong> <i style="color: #d32f2f;">${cleanSci}</i></p>
                    <p><strong>分類科別：</strong> ${familyName}</p>
                    <hr style="border:0; border-top:1px solid #eee; margin:15px 0;">
                    <a href="https://www.fishbase.se/summary/${cleanSci.replace(/\s+/g, '-')}" 
                       target="_blank" 
                       style="display: block; background: #0077be; color: white; text-align: center; padding: 12px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                       ➔ 查看 FishBase 全球詳細圖鑑
                    </a>
                    <p style="font-size: 0.75em; color: #999; margin-top: 10px; text-align: center;">資料來源：TaiCOL v2 API</p>
                </div>
            `;
        } else {
            resultDiv.innerHTML = `❌ 在台灣名錄中找不到「${name}」。`;
        }
    } catch (error) {
        console.error("連線錯誤:", error);
        resultDiv.innerHTML = `<div style="color:red;">⚠️ 連線失敗，請稍後再試。</div>`;
    }
});