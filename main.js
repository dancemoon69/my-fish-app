const searchBtn = document.querySelector('#searchBtn');
const fishInput = document.querySelector('#fishName');
const resultDiv = document.querySelector('#result');

searchBtn.addEventListener('click', async () => {
    const name = fishInput.value.trim();
    if (!name) return;

    resultDiv.innerHTML = `<p style="color: #0077be;">正在連線 TaiCOL v2 官方 API... 🚢</p>`;

    // 💡 嚴格遵循官方說明書的參數
    // name: 搜尋字串, best: yes (取最優), bio_group: 魚類 (過濾掉植物)
    const targetUrl = `https://api.taicol.tw/v2/nameMatch?name=${encodeURIComponent(name)}&best=yes&bio_group=魚類`;
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

    try {
        const response = await fetch(proxyUrl);
        const data = await response.json();
        
        // 偵錯：在控制台印出整份結構
        console.log("TaiCOL v2 原始資料:", data);

        if (data.data && data.data.length > 0) {
            const fish = data.data[0];

            // 💡 依照 v2 官方文件對應欄位
            const sciNameFull = fish.scientific_name || "未找到學名欄位";
            const chineseName = fish.common_name_c || fish.common_name || name;
            const familyLatin = fish.family || "";
            const familyChinese = fish.family_c || "";
            
            // 格式化學名：只取前兩個單字 (例如: Coryphaena hippurus)
            const cleanSci = sciNameFull !== "未找到學名欄位" ? sciNameFull.split(' ').slice(0, 2).join(' ') : "Unknown";

            resultDiv.innerHTML = `
                <div style="background: white; padding: 20px; border-radius: 15px; border: 2px solid #0077be; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                    <h2 style="color: #0077be; margin-top:0;">🐟 ${chineseName}</h2>
                    <p style="font-size: 1.1em;"><strong>官方學名：</strong> <i style="color: #d32f2f;">${cleanSci}</i></p>
                    <p><strong>分類科別：</strong> ${familyChinese} (${familyLatin})</p>
                    <hr style="border:0; border-top:1px solid #eee; margin:15px 0;">
                    <a href="https://www.fishbase.se/summary/${cleanSci.replace(/\s+/g, '-')}" 
                       target="_blank" 
                       style="display: block; background: #0077be; color: white; text-align: center; padding: 12px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                       ➔ 查看 FishBase 詳細圖鑑
                    </a>

                    <div style="margin-top:20px; background:#f9f9f9; padding:10px; font-size:0.7em; border:1px solid #ddd;">
                        <p style="margin:0; font-weight:bold;">API 欄位診斷：</p>
                        <ul style="margin:5px 0; padding-left:20px;">
                            <li>回傳的 Key：${Object.keys(fish).join(', ')}</li>
                        </ul>
                    </div>
                </div>
            `;
        } else {
            resultDiv.innerHTML = `<p>❌ 在名錄中找不到「${name}」。</p>`;
        }
    } catch (error) {
        console.error("連線錯誤:", error);
        resultDiv.innerHTML = `<div style="color:red;">⚠️ 連線失敗，請檢查網路或中轉站。</div>`;
    }
});