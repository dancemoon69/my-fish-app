const searchBtn = document.querySelector('#searchBtn');
const fishInput = document.querySelector('#fishName');
const resultDiv = document.querySelector('#result');

searchBtn.addEventListener('click', async () => {
    const name = fishInput.value.trim();
    if (!name) return;

    resultDiv.innerHTML = `<p style="color: #0077be;">正在搜尋「${name}」的所有可能物種... 🔍</p>`;

    // 💡 關鍵變更：best=no (列出所有匹配項), only_taiwan=yes (限定台灣物種)
    const targetUrl = `https://api.taicol.tw/v2/nameMatch?name=${encodeURIComponent(name)}&best=no&only_taiwan=yes`;
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

    try {
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('中轉站連線失敗');

        const data = await response.json();
        console.log("全部比對結果:", data);

        if (data.data && data.data.length > 0) {
            // 💡 清空搜尋中提示，準備填入清單
            resultDiv.innerHTML = `<p style="margin-bottom:15px; color:#666;">找到 ${data.data.length} 個可能的匹配結果：</p>`;

            // 💡 使用 map 產生所有結果的 HTML 
            const htmlList = data.data.map(fish => {
                // 取得學名 (優先使用正式名 accepted_name)
                const fullSci = fish.accepted_name || fish.matched_name || "Unknown";
                // 格式化學名：只取前兩字 (屬名+種小名) 用於 FishBase 連結
                const cleanSci = fullSci.split(' ').slice(0, 2).join(' ');
                
                return `
                    <div style="background: white; padding: 15px; border-radius: 12px; border: 1px solid #ddd; margin-bottom: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <h3 style="margin: 0; color: #0077be; font-size: 1.1em;">🐟 ${name} (匹配名: ${fish.matched_name})</h3>
                                <p style="margin: 5px 0; font-size: 0.9em; color: #d32f2f;"><i>${fullSci}</i></p>
                                <span style="font-size: 0.75em; background: #eee; padding: 2px 6px; border-radius: 4px; color: #666;">
                                    ${fish.matched_name_usage || '物種紀錄'}
                                </span>
                            </div>
                            <a href="https://www.fishbase.se/summary/${cleanSci.replace(/\s+/g, '-')}" 
                               target="_blank" 
                               style="background: #0077be; color: white; text-align: center; padding: 8px 12px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 0.85em;">
                               FishBase
                            </a>
                        </div>
                    </div>
                `;
            }).join('');

            resultDiv.innerHTML += htmlList;

        } else {
            resultDiv.innerHTML = `❌ 找不到與「${name}」相關的紀錄，請試試其他俗名（如：鮪、鯛）。`;
        }
    } catch (error) {
        console.error("搜尋錯誤:", error);
        resultDiv.innerHTML = `<div style="color:red;">⚠️ 搜尋失敗：${error.message}</div>`;
    }
});