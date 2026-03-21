const searchBtn = document.querySelector('#searchBtn');
const fishInput = document.querySelector('#fishName');
const resultDiv = document.querySelector('#result');

searchBtn.addEventListener('click', async () => {
    const name = fishInput.value.trim();
    if (!name) return;

    resultDiv.innerHTML = `<p style="color: #0077be;">第一步：正在比對物種名稱... 🔍</p>`;

    // 1. Name Match API (符合官方參數)
    const matchUrl = `https://api.taicol.tw/v2/nameMatch?name=${encodeURIComponent(name)}&bio_group=魚類&best=yes`;
    const proxyMatch = `https://corsproxy.io/?${encodeURIComponent(matchUrl)}`;

    try {
        const matchRes = await fetch(proxyMatch);
        const matchData = await matchRes.json();
        
        if (matchData.data && matchData.data.length > 0) {
            const taxonId = matchData.data[0].taxon_id;
            const acceptedName = matchData.data[0].accepted_name || matchData.data[0].matched_name;

            resultDiv.innerHTML = `<p style="color: #0077be;">第二步：正在抓取物種 ID: ${taxonId} 的詳細資料... 🐟</p>`;

            // 2. Taxon API (依照官方規範格式: /v2/taxon/{taxon_id})
            const detailUrl = `https://api.taicol.tw/v2/taxon/${taxonId}`;
            const proxyDetail = `https://corsproxy.io/?${encodeURIComponent(detailUrl)}`;

            const detailRes = await fetch(proxyDetail);
            
            // 安全檢查：確保回傳的是 JSON 而不是 HTML 錯誤頁面
            const contentType = detailRes.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                throw new Error("API 回傳格式錯誤 (非 JSON)，可能是 ID 不存在或伺服器異常。");
            }

            const detailData = await detailRes.json();
            
            // 💡 處理 v2 回傳結構：有些版本資料會在 .data[0]，有些直接在根目錄
            const fish = detailData.data ? (Array.isArray(detailData.data) ? detailData.data[0] : detailData.data) : detailData;

            // 格式化學名
            const cleanSci = acceptedName.split(' ').slice(0, 2).join(' ');

            resultDiv.innerHTML = `
                <div style="background: white; padding: 20px; border-radius: 15px; border: 2px solid #0077be; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                    <h2 style="color: #0077be; margin-top:0;">🐟 ${fish.common_name_c || name}</h2>
                    <p style="font-size: 1.1em;"><strong>官方學名：</strong> <i style="color: #d32f2f;">${cleanSci}</i></p>
                    <p><strong>分類科別：</strong> ${fish.family_c || ''} (${fish.family || '未分類'})</p>
                    <p style="font-size: 0.8em; color: #888;">TaiCOL 物種編號：${taxonId}</p>
                    <hr style="border:0; border-top:1px solid #eee; margin:15px 0;">
                    <a href="https://www.fishbase.se/summary/${cleanSci.replace(/\s+/g, '-')}" 
                       target="_blank" 
                       style="display: block; background: #0077be; color: white; text-align: center; padding: 12px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                       ➔ 前往 FishBase 查看詳細圖鑑
                    </a>
                </div>
            `;
        } else {
            resultDiv.innerHTML = `❌ 在台灣魚類名錄中找不到「${name}」。`;
        }
    } catch (error) {
        console.error("錯誤詳情:", error);
        resultDiv.innerHTML = `
            <div style="color: #d32f2f; padding: 15px; border: 1px solid #ffcdd2; background: #fff3f3; border-radius: 10px;">
                ⚠️ <strong>搜尋失敗</strong><br>
                原因：${error.message}<br>
                <small>請檢查網路，或確認 API 路徑是否正確。</small>
            </div>
        `;
    }
});