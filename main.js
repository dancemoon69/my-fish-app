const searchBtn = document.querySelector('#searchBtn');
const fishInput = document.querySelector('#fishName');
const resultDiv = document.querySelector('#result');

searchBtn.addEventListener('click', async () => {
    const name = fishInput.value.trim();
    if (!name) return;

    resultDiv.innerHTML = '<p style="color: #0077be;">正在透過 TaiCOL 魚類專屬通道搜尋... 🐟</p>';

    // 💡 運用你提供的參數：bio_group=魚類 (確保不抓到植物), best=yes (取最準的一筆)
    const targetUrl = `https://api.taicol.tw/v2/nameMatch?name=${encodeURIComponent(name)}&bio_group=魚類&best=yes`;
    
    // 依然需要透過中轉站，否則瀏覽器會報 Failed to fetch
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;

    try {
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('中轉站連線失敗');

        const wrapper = await response.json();
        let data;

        // 解析資料 (處理可能的 Base64 編碼)
        if (wrapper.contents.startsWith('data:application/json')) {
            const base64 = wrapper.contents.split(',')[1];
            data = JSON.parse(atob(base64));
        } else {
            data = JSON.parse(wrapper.contents);
        }

        if (data.data && data.data.length > 0) {
            const fish = data.data[0];
            // 取得學名 (例如: Coryphaena hippurus)
            const sciName = fish.scientificName.split(' ').slice(0, 2).join(' ');
            
            resultDiv.innerHTML = `
                <div style="background: white; padding: 20px; border-radius: 15px; border: 2px solid #0077be; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                    <h2 style="color: #0077be; margin-top:0;">🐟 ${fish.commonName || name}</h2>
                    <p><strong>正式學名：</strong> <i style="color: #d32f2f;">${sciName}</i></p>
                    <p><strong>科別：</strong> ${fish.family || '讀取中'}</p>
                    <p style="font-size:0.85em; color:#888;">(類群：${fish.bioGroup || '魚類'})</p>
                    <hr style="border:0; border-top:1px solid #eee; margin:15px 0;">
                    <a href="https://www.fishbase.se/summary/${sciName.replace(/\s+/g, '-')}" 
                       target="_blank" 
                       style="display: block; background: #0077be; color: white; text-align: center; padding: 12px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                       ➔ 查看 FishBase 詳細圖鑑
                    </a>
                </div>
            `;
        } else {
            resultDiv.innerHTML = `❌ 在台灣魚類名錄中找不到「${name}」。`;
        }
    } catch (error) {
        console.error("詳細錯誤:", error);
        resultDiv.innerHTML = `
            <div style="color:red; border:1px solid red; padding:10px;">
                ⚠️ 連線失敗！原因：${error.message}<br>
                <small>這通常是中轉站不穩定，請稍後再試或換個網路。</small>
            </div>
        `;
    }
});