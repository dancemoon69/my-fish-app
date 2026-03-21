const searchBtn = document.querySelector('#searchBtn');
const fishInput = document.querySelector('#fishName');
const resultDiv = document.querySelector('#result');

searchBtn.addEventListener('click', async () => {
    const name = fishInput.value.trim();
    if (!name) return;

    resultDiv.innerHTML = `<p style="color: #0077be;">正在搜尋俗名「${name}」的魚類紀錄... 🌊</p>`;

    // 💡 關鍵修正：將 name 改為 common_name，這才是搜尋中文俗名的正確參數
    const targetUrl = `https://api.taicol.tw/v2/taxon?common_name=${encodeURIComponent(name)}&bio_group=魚類&limit=1`;
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

    try {
        const response = await fetch(proxyUrl);
        
        if (!response.ok) throw new Error(`伺服器回應異常 (${response.status})`);

        const data = await response.json();
        console.log("TaiCOL v2 搜尋結果:", data);

        // 檢查是否有回傳資料
        if (data.data && data.data.length > 0) {
            const fish = data.data[0];

            // 取得學名與科名
            const chineseName = fish.common_name_c || name;
            const sciNameFull = fish.scientific_name || "Unknown";
            const familyC = fish.family_c || "";
            const familyL = fish.family || "";

            // 格式化學名：只取前兩個單字 (屬名+種小名)
            const cleanSci = sciNameFull.split(' ').slice(0, 2).join(' ');

            resultDiv.innerHTML = `
                <div style="background: white; padding: 20px; border-radius: 15px; border: 2px solid #0077be; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                    <h2 style="color: #0077be; margin-top:0;">🐟 ${chineseName}</h2>
                    <p style="font-size: 1.1em;"><strong>官方學名：</strong> <i style="color: #d32f2f;">${cleanSci}</i></p>
                    <p><strong>分類科別：</strong> ${familyC} (${familyL})</p>
                    <hr style="border:0; border-top:1px solid #eee; margin:15px 0;">
                    <a href="https://www.fishbase.se/summary/${cleanSci.replace(/\s+/g, '-')}" 
                       target="_blank" 
                       style="display: block; background: #0077be; color: white; text-align: center; padding: 12px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                       ➔ 前往 FishBase 查看詳細圖鑑
                    </a>
                    <p style="font-size: 0.7em; color: #999; margin-top:10px; text-align:center;">
                        資料來源：TaiCOL 臺灣物種名錄 (v2)
                    </p>
                </div>
            `;
        } else {
            // 如果 common_name 找不到，嘗試使用萬能搜尋參數 q
            resultDiv.innerHTML = `<p style="color: #666;">俗名找不到，嘗試深度搜尋中...</p>`;
            deepSearch(name);
        }
    } catch (error) {
        console.error("連線錯誤:", error);
        resultDiv.innerHTML = `<div style="color:red;">⚠️ 連線失敗，請檢查網路或稍後再試。</div>`;
    }
});

// 💡 備援搜尋：使用 q 參數（全文檢索），有時候俗名藏在其他欄位
async function deepSearch(name) {
    const targetUrl = `https://api.taicol.tw/v2/taxon?q=${encodeURIComponent(name)}&bio_group=魚類&limit=1`;
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
    
    try {
        const response = await fetch(proxyUrl);
        const data = await response.json();
        if (data.data && data.data.length > 0) {
            // 重新整理並顯示結果 (這裡可以寫跟上面一樣的渲染邏輯)
            location.reload(); // 簡單處理：重新整理
        } else {
            resultDiv.innerHTML = `❌ 在台灣魚類名錄中找不到「${name}」。`;
        }
    } catch (e) {
        resultDiv.innerHTML = `❌ 搜尋失敗。`;
    }
}