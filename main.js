const searchBtn = document.querySelector('#searchBtn');
const fishInput = document.querySelector('#fishName');
const resultDiv = document.querySelector('#result');

searchBtn.addEventListener('click', async () => {
    const name = fishInput.value.trim();
    if (!name) return;

    resultDiv.innerHTML = `<p style="color: #0077be;">正在連線 TaiCOL v2 官方資料庫... 🚢</p>`;

    // 💡 依照官方文件：直接使用 /v2/taxon 搜尋物種
    // 參數說明：name (中文名), bio_group (魚類), limit (1)
    const targetUrl = `https://api.taicol.tw/v2/taxon?name=${encodeURIComponent(name)}&bio_group=魚類&limit=1`;
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

    try {
        const response = await fetch(proxyUrl);
        
        // 檢查是否成功連線
        if (!response.ok) throw new Error(`伺服器回應異常 (${response.status})`);

        const data = await response.json();
        console.log("TaiCOL v2 搜尋結果:", data);

        // v2 的搜尋結果通常放在 data 陣列中
        if (data.data && data.data.length > 0) {
            const fish = data.data[0];

            // 💡 依照官方 v2 欄位精確對接
            const chineseName = fish.common_name_c || name;
            const sciNameFull = fish.scientific_name || "Unknown";
            const familyChinese = fish.family_c || "";
            const familyLatin = fish.family || "";

            // 格式化學名：只取前兩個單字
            const cleanSci = sciNameFull.split(' ').slice(0, 2).join(' ');

            resultDiv.innerHTML = `
                <div style="background: white; padding: 20px; border-radius: 15px; border: 2px solid #0077be; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                    <h2 style="color: #0077be; margin-top:0;">🐟 ${chineseName}</h2>
                    <p style="font-size: 1.1em;"><strong>官方學名：</strong> <i style="color: #d32f2f;">${cleanSci}</i></p>
                    <p><strong>分類科別：</strong> ${familyChinese} (${familyLatin})</p>
                    <hr style="border:0; border-top:1px solid #eee; margin:15px 0;">
                    <a href="https://www.fishbase.se/summary/${cleanSci.replace(/\s+/g, '-')}" 
                       target="_blank" 
                       style="display: block; background: #0077be; color: white; text-align: center; padding: 12px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                       ➔ 查看 FishBase 詳細數據
                    </a>
                </div>
            `;
        } else {
            resultDiv.innerHTML = `❌ 在台灣名錄中找不到「${name}」的魚類紀錄。`;
        }
    } catch (error) {
        console.error("錯誤詳情:", error);
        resultDiv.innerHTML = `
            <div style="color: #d32f2f; padding: 15px; border: 1px solid #ffcdd2; background: #fff3f3; border-radius: 10px;">
                ⚠️ <strong>連線失敗</strong><br>
                原因：${error.message}<br>
                <small>API 可能暫時限制連線，或是中轉站服務異常。</small>
            </div>
        `;
    }
});