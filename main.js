const searchBtn = document.querySelector('#searchBtn');
const fishInput = document.querySelector('#fishName');
const resultDiv = document.querySelector('#result');

searchBtn.addEventListener('click', async () => {
    const name = fishInput.value.trim();
    if (!name) return;

    resultDiv.innerHTML = `<p style="color: #0077be;">正在比對「${name}」的官方學名... 🔍</p>`;

    // 💡 只使用 nameMatch API，不限制類群，讓模糊比對發揮最大效用
    const targetUrl = `https://api.taicol.tw/v2/nameMatch?name=${encodeURIComponent(name)}&best=yes`;
    
    // 使用 corsproxy.io (最乾淨的中轉站，不會有 atob 報錯)
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

    try {
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('中轉站回應異常');

        const data = await response.json();
        console.log("TaiCOL 比對結果:", data);

        if (data.data && data.data.length > 0) {
            const match = data.data[0];

            // 💡 取得「正式學名 (accepted_name)」或「比對到的學名 (matched_name)」
            const sciNameFull = match.accepted_name || match.matched_name || "Unknown";
            
            // 格式化學名：只取前兩個單字 (例如: Coryphaena hippurus)
            // 避免後面帶有作者名或括號影響 FishBase 搜尋
            const cleanSci = sciNameFull.split(' ').slice(0, 2).join(' ');

            resultDiv.innerHTML = `
                <div style="background: white; padding: 20px; border-radius: 15px; border: 2px solid #0077be; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                    <h2 style="color: #0077be; margin-top:0;">🐟 ${name}</h2>
                    <p style="font-size: 1.1em; margin-bottom: 20px;">
                        <strong>匹配學名：</strong> <br>
                        <i style="color: #d32f2f; font-size: 1.2em;">${cleanSci}</i>
                    </p>
                    
                    <a href="https://www.fishbase.se/summary/${cleanSci.replace(/\s+/g, '-')}" 
                       target="_blank" 
                       style="display: block; background: #0077be; color: white; text-align: center; padding: 15px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 1.1em;">
                       ➔ 前往 FishBase 全球圖鑑
                    </a>
                    
                    <p style="font-size: 0.7em; color: #999; margin-top: 15px; text-align: center;">
                        比對結果：${match.matched_name_usage || '正式名稱'}
                    </p>
                </div>
            `;
        } else {
            resultDiv.innerHTML = `❌ 找不到與「${name}」匹配的學名，請嘗試更精確的俗名。`;
        }
    } catch (error) {
        console.error("連線錯誤:", error);
        resultDiv.innerHTML = `
            <div style="color: #d32f2f; padding: 15px; border: 1px solid #ffcdd2; background: #fff3f3; border-radius: 10px;">
                ⚠️ <strong>比對失敗</strong><br>
                原因：${error.message}<br>
                <small>請確認網路連線，或稍後再試。</small>
            </div>
        `;
    }
});