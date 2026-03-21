const searchBtn = document.querySelector('#searchBtn');
const fishInput = document.querySelector('#fishName');
const resultDiv = document.querySelector('#result');

searchBtn.addEventListener('click', async () => {
    const name = fishInput.value.trim();
    if (!name) return;

    resultDiv.innerHTML = `<p style="color: #0077be;">正在鎖定物種編號... 🎯</p>`;

    // 第一步：比對名稱拿到 taxon_id
    const matchUrl = `https://api.taicol.tw/v2/nameMatch?name=${encodeURIComponent(name)}&bio_group=魚類&best=yes`;
    const proxyMatch = `https://corsproxy.io/?${encodeURIComponent(matchUrl)}`;

    try {
        const matchRes = await fetch(proxyMatch);
        const matchData = await matchRes.json();
        
        if (matchData.data && matchData.data.length > 0) {
            const matchResult = matchData.data[0];
            // 💡 妳診斷出來的 Key：taxon_id 和 accepted_name
            const taxonId = matchResult.taxon_id;
            const sciNameFull = matchResult.accepted_name || matchResult.matched_name;

            resultDiv.innerHTML = `<p style="color: #0077be;">已找到物種，正在讀取詳細科別... 🐟</p>`;

            // 第二步：用 taxon_id 抓取詳細資料 (包含科名、中文名)
            const detailUrl = `https://api.taicol.tw/v2/taxon/${taxonId}`;
            const proxyDetail = `https://corsproxy.io/?${encodeURIComponent(detailUrl)}`;

            const detailRes = await fetch(proxyDetail);
            const detailData = await detailRes.json();
            const fish = detailData; // v2 的 taxon API 通常直接回傳物件

            // 格式化學名
            const cleanSci = sciNameFull.split(' ').slice(0, 2).join(' ');

            resultDiv.innerHTML = `
                <div style="background: white; padding: 20px; border-radius: 15px; border: 2px solid #0077be; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                    <h2 style="color: #0077be; margin-top:0;">🐟 ${fish.common_name_c || name}</h2>
                    <p style="font-size: 1.1em;"><strong>官方正式學名：</strong> <i style="color: #d32f2f;">${cleanSci}</i></p>
                    <p><strong>分類科別：</strong> ${fish.family_c || ''} (${fish.family || '未分類'})</p>
                    <p style="font-size: 0.8em; color: #888;">TaiCOL 物種編號：${taxonId}</p>
                    <hr style="border:0; border-top:1px solid #eee; margin:15px 0;">
                    <a href="https://www.fishbase.se/summary/${cleanSci.replace(/\s+/g, '-')}" 
                       target="_blank" 
                       style="display: block; background: #0077be; color: white; text-align: center; padding: 12px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                       ➔ 前往 FishBase 查看詳細數據
                    </a>
                </div>
            `;
        } else {
            resultDiv.innerHTML = `❌ 在台灣魚類名錄中找不到「${name}」。`;
        }
    } catch (error) {
        console.error("連線錯誤:", error);
        resultDiv.innerHTML = `<div style="color:red;">⚠️ 連線失敗。原因：${error.message}</div>`;
    }
});