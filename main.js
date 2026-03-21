const searchBtn = document.querySelector('#searchBtn');
const fishInput = document.querySelector('#fishName');
const resultDiv = document.querySelector('#result');

searchBtn.addEventListener('click', async () => {
    const name = fishInput.value.trim();
    if (!name) return;

    resultDiv.innerHTML = `<p style="color: #0077be;">正在海洋中廣域搜尋「${name}」... 🔍</p>`;

    // 💡 關鍵修正：使用 q= 進行全文檢索，這是對付俗名最有效的方法
    // 加上 bio_group=魚類 確保不會搜到奇怪的植物
    const targetUrl = `https://api.taicol.tw/v2/taxon?q=${encodeURIComponent(name)}&bio_group=魚類&limit=1`;
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

    try {
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error(`連線異常 (${response.status})`);

        const data = await response.json();
        console.log("TaiCOL v2 搜尋回傳：", data);

        if (data.data && data.data.length > 0) {
            const fish = data.data[0];

            // 💡 依照 v2 官方欄位對接
            const chineseName = fish.common_name_c || fish.common_name || name;
            const sciNameFull = fish.scientific_name || "Unknown";
            const familyC = fish.family_c || "";
            const familyL = fish.family || "";

            // 格式化學名 (取前兩個單字)
            const cleanSci = sciNameFull.split(' ').slice(0, 2).join(' ');

            resultDiv.innerHTML = `
                <div style="background: white; padding: 20px; border-radius: 15px; border: 2px solid #0077be; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                    <h2 style="color: #0077be; margin-top:0;">🐟 ${chineseName}</h2>
                    <p style="font-size: 1.1em;"><strong>標準學名：</strong> <i style="color: #d32f2f;">${cleanSci}</i></p>
                    <p><strong>分類科別：</strong> ${familyC} (${familyL})</p>
                    <hr style="border:0; border-top:1px solid #eee; margin:15px 0;">
                    <a href="https://www.fishbase.se/summary/${cleanSci.replace(/\s+/g, '-')}" 
                       target="_blank" 
                       style="display: block; background: #0077be; color: white; text-align: center; padding: 12px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                       ➔ 查看 FishBase 詳細數據
                    </a>
                    <p style="font-size: 0.75em; color: #999; margin-top: 10px; text-align: center;">資料來源：TaiCOL v2 全文檢索</p>
                </div>
            `;
        } else {
            resultDiv.innerHTML = `
                <div style="padding: 20px; background: #f8f9fa; border-radius: 10px;">
                    ❌ 找不到「${name}」。<br>
                    <small style="color: #888;">建議嘗試：鬼頭刀、虱目魚、白帶魚</small>
                </div>
            `;
        }
    } catch (error) {
        console.error("錯誤:", error);
        resultDiv.innerHTML = `<div style="color:red;">⚠️ 搜尋中斷，請稍後再試。</div>`;
    }
});