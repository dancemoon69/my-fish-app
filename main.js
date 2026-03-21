const searchBtn = document.querySelector('#searchBtn');
const fishInput = document.querySelector('#fishName');
const resultDiv = document.querySelector('#result');

searchBtn.addEventListener('click', async () => {
    const name = fishInput.value.trim();
    if (!name) return;

    resultDiv.innerHTML = '<p style="color: #0077be;">正在連接 TaiCOL v2 官方通道... 🚢</p>';

    // 💡 參考官方文件優化的參數：
    // best=yes (只要最準的結果)
    // bio_group=魚類 (排除植物、昆蟲)
    const targetUrl = `https://api.taicol.tw/v2/nameMatch?name=${encodeURIComponent(name)}&best=yes&bio_group=魚類`;
    
    // 使用 corsproxy.io，它會直接回傳原始資料，不會像 allorigins 那樣包成 base64 導致 atob 錯誤
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

    try {
        const response = await fetch(proxyUrl);
        
        if (!response.ok) throw new Error('伺服器回應錯誤');

        const data = await response.json();
        console.log("TaiCOL 回傳資料：", data);

        // TaiCOL v2 的資料結構在 data 陣列裡
        if (data.data && data.data.length > 0) {
            const fish = data.data[0];
            // 處理學名，只取屬名和種小名 (例如: Coryphaena hippurus)
            const sciName = fish.scientificName.split(' ').slice(0, 2).join(' ');
            
            resultDiv.innerHTML = `
                <div style="background: white; padding: 20px; border-radius: 15px; border: 2px solid #0077be; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                    <h2 style="color: #0077be; margin-top:0;">🐟 ${fish.commonName || name}</h2>
                    <p style="font-size: 1.1em;"><strong>標準學名：</strong> <i style="color: #d32f2f;">${sciName}</i></p>
                    <p><strong>分類科別：</strong> ${fish.family || '讀取中'}</p>
                    <p style="font-size:0.85em; color:#888;">類群：${fish.bioGroup}</p>
                    <hr style="border:0; border-top:1px solid #eee; margin:15px 0;">
                    <a href="https://www.fishbase.se/summary/${sciName.replace(/\s+/g, '-')}" 
                       target="_blank" 
                       style="display: block; background: #0077be; color: white; text-align: center; padding: 12px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                       ➔ 前往 FishBase 全球圖鑑
                    </a>
                </div>
            `;
        } else {
            resultDiv.innerHTML = `❌ 在台灣名錄中找不到「${name}」的魚類紀錄。`;
        }
    } catch (error) {
        console.error("報錯詳情:", error);
        resultDiv.innerHTML = `
            <div style="color:red; border:1px solid red; padding:10px; background:#fff3f3; border-radius:10px;">
                ⚠️ 搜尋失敗！<br>
                原因：${error.message}<br>
                <small>這代表中轉站或 TaiCOL 目前拒絕瀏覽器直接連線。</small>
            </div>
        `;
    }
});