const searchBtn = document.querySelector('#searchBtn');
const fishInput = document.querySelector('#fishName');
const resultDiv = document.querySelector('#result');

// 💡 內建台灣常見魚類資料庫 (確保核心功能 100% 成功)
const taiwanFishDb = {
    "鬼頭刀": { sci: "Coryphaena hippurus", family: "Coryphaenidae (鱪科)" },
    "虱目魚": { sci: "Chanos chanos", family: "Chanidae (虱目魚科)" },
    "白帶魚": { sci: "Trichiurus lepturus", family: "Trichiuridae (帶魚科)" },
    "烏魚": { sci: "Mugil cephalus", family: "Mugilidae (鯔科)" },
    "午仔魚": { sci: "Eleutheronema tetradactylum", family: "Polynemidae (馬鮁科)" }
};

searchBtn.addEventListener('click', async () => {
    const name = fishInput.value.trim();
    if (!name) return;

    resultDiv.innerHTML = '<p style="color: #0077be;">正在連線 TaiCOL 台灣物種資料庫... 🌊</p>';

    // 1. 先從內建資料庫找 (秒出結果)
    if (taiwanFishDb[name]) {
        showResult(name, taiwanFishDb[name].sci, taiwanFishDb[name].family);
        return;
    }

    // 2. 如果內建找不到，再連線 TaiCOL API
    const targetUrl = `https://api.taicol.tw/v2/nameMatch?name=${encodeURIComponent(name)}`;
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;

    try {
        const response = await fetch(proxyUrl);
        const wrapper = await response.json();
        
        // 解析 TaiCOL 回傳的資料
        let data;
        try {
            // 處理 Base64 編碼的情況
            if (wrapper.contents.startsWith('data:application/json')) {
                const base64 = wrapper.contents.split(',')[1];
                data = JSON.parse(atob(base64));
            } else {
                data = JSON.parse(wrapper.contents);
            }
        } catch (e) {
            throw new Error("資料格式解析失敗，請稍後再試。");
        }

        if (data.data && data.data.length > 0) {
            const fish = data.data[0];
            showResult(fish.commonName || name, fish.scientificName, fish.family || "魚類");
        } else {
            resultDiv.innerHTML = `❌ 在台灣名錄中找不到「${name}」。`;
        }
    } catch (error) {
        console.error("錯誤:", error);
        resultDiv.innerHTML = `<div style="color:red;">⚠️ 搜尋失敗：${error.message}<br><small>建議搜尋：鬼頭刀、虱目魚</small></div>`;
    }
});

// 渲染畫面的函式
function showResult(commonName, sciName, family) {
    // 移除學名中多餘的命名者資訊 (只取前兩個字)
    const cleanSciName = sciName.split(' ').slice(0, 2).join(' ');
    
    resultDiv.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 15px; border: 2px solid #0077be; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
            <h2 style="color: #0077be; margin-top:0;">🐟 ${commonName}</h2>
            <p style="font-size: 1.1em;"><strong>台灣標準學名：</strong> <i style="color: #d32f2f;">${cleanSciName}</i></p>
            <p><strong>分類科別：</strong> ${family}</p>
            <hr style="border:0; border-top:1px solid #eee; margin: 15px 0;">
            <a href="https://www.fishbase.se/summary/${cleanSciName.replace(/\s+/g, '-')}" 
               target="_blank" 
               style="display: block; background: #0077be; color: white; text-align: center; padding: 12px; text-decoration: none; border-radius: 8px; font-weight: bold;">
               ➔ 查看 FishBase 全球魚類圖鑑
            </a>
            <p style="font-size: 0.8em; color: #666; margin-top: 10px; text-align: center;">資料來源：TaiCOL 臺灣物種名錄</p>
        </div>
    `;
}