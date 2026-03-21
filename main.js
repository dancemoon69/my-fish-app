const searchBtn = document.querySelector('#searchBtn');
const fishInput = document.querySelector('#fishName');
const resultDiv = document.querySelector('#result');

searchBtn.addEventListener('click', async () => {
    const name = fishInput.value.trim();
    if (!name) return;

    // 1. 初始化畫面
    resultDiv.innerHTML = `<div id="status-box" style="padding:20px; text-align:center; color:#0077be;">
        <p id="status-text">正在連線 TaiCOL 進行名稱比對... 🔍</p>
    </div>`;
    const statusText = document.querySelector('#status-text');

    try {
        // --- 步驟一：使用 nameMatch 模糊比對抓出 taxon_id ---
        const matchUrl = `https://api.taicol.tw/v2/nameMatch?name=${encodeURIComponent(name)}&best=no`;
        // 使用 allorigins 的 raw 模式，這能直接拿回原始 JSON
        const proxyMatch = `https://api.allorigins.win/raw?url=${encodeURIComponent(matchUrl)}`;

        const matchRes = await fetch(proxyMatch);
        if (!matchRes.ok) throw new Error('名稱比對連線失敗');
        const matchData = await matchRes.json();
        
        const candidates = matchData.data || [];
        if (candidates.length === 0) {
            resultDiv.innerHTML = `❌ 找不到與「${name}」相關的學名紀錄。`;
            return;
        }

        statusText.innerText = `找到 ${candidates.length} 個可能物種，正在調閱詳細資料... 🧬`;

        // --- 步驟二：串聯 taxon API 抓取中英文詳細資料 ---
        // 我們取前 5 筆，避免過多請求導致被封鎖
        const detailPromises = candidates.slice(0, 5).map(async (item) => {
            const tid = item.taxon_id;
            const detailUrl = `https://api.taicol.tw/v2/taxon/${tid}`;
            const proxyDetail = `https://api.allorigins.win/raw?url=${encodeURIComponent(detailUrl)}`;
            
            try {
                const dRes = await fetch(proxyDetail);
                const dData = await dRes.json();
                // 確保抓到正確的層級 (v2 有時資料在 .data[0])
                return dData.data ? (Array.isArray(dData.data) ? dData.data[0] : dData.data) : dData;
            } catch (e) {
                console.warn(`ID ${tid} 讀取失敗:`, e);
                return null;
            }
        });

        const detailedList = await Promise.all(detailPromises);
        const fishList = detailedList.filter(f => f !== null && f.scientific_name);

        if (fishList.length === 0) {
            resultDiv.innerHTML = `❌ 無法取得這些物種的詳細資料。`;
            return;
        }

        // --- 步驟三：渲染清單並連接 FishBase ---
        resultDiv.innerHTML = fishList.map(fish => {
            const sciName = fish.scientific_name;
            // 擷取屬名與種小名 (FishBase 連結標準)
            const cleanSci = sciName.split(' ').slice(0, 2).join(' ');

            return `
                <div style="background: white; padding: 20px; border-radius: 15px; border: 2px solid #0077be; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div style="flex: 1;">
                            <h3 style="margin: 0 0 10px 0; color: #0077be;">🐟 ${fish.common_name_c || name}</h3>
                            <p style="margin: 5px 0;"><strong>科別：</strong> ${fish.family_c || fish.family || '未分類'}</p>
                            <p style="margin: 5px 0; font-size: 0.9em; color: #d32f2f;"><strong>正式學名：</strong> <i>${sciName}</i></p>
                            <p style="margin: 5px 0; font-size: 0.8em; color: #666;">英文俗名：${fish.common_name_e || 'N/A'}</p>
                        </div>
                        <a href="https://www.fishbase.se/summary/${cleanSci.replace(/\s+/g, '-')}" 
                           target="_blank" 
                           style="background: #0077be; color: white; padding: 10px 15px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 0.9em; white-space: nowrap; margin-left:10px;">
                           FishBase
                        </a>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error("搜尋崩潰:", error);
        resultDiv.innerHTML = `
            <div style="color: #d32f2f; padding: 15px; border: 1px solid #ffcdd2; background: #fff3f3; border-radius: 10px; text-align:center;">
                ⚠️ <strong>系統輸出錯誤</strong><br>
                原因：${error.message}<br>
                <small>請在電腦按 F12 查看 Console 紀錄。</small>
            </div>
        `;
    }
});