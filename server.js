require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

const API_KEY = process.env.STEAM_API_KEY;

function getGuide(appId) {
  const filePath = path.join(__dirname, 'guides', `${appId}.json`);
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  }
  return null;
}

async function resolveSteamId(input) {
  input = input.trim();

  if (/^\d{17}$/.test(input)) {
    return input;
  }

  const profileMatch = input.match(/profiles\/(\d{17})/);
  if (profileMatch) {
    return profileMatch[1];
  }

  let vanity = input;
  const idMatch = input.match(/id\/([^\/]+)/);
  if (idMatch) {
    vanity = idMatch[1];
  }

  const response = await axios.get('https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/', {
    params: {
      key: API_KEY,
      vanityurl: vanity,
    }
  });

  if (response.data.response.success === 1) {
    return response.data.response.steamid;
  }

  throw new Error('Steam profili bulunamadı');
}

const style = `
<style>
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    background-color: #1b2838;
    color: #c7d5e0;
    max-width: 800px;
    margin: 40px auto;
    padding: 0 20px;
  }
  h1 {
    color: #66c0f4;
    border-bottom: 2px solid #2a475e;
    padding-bottom: 10px;
  }
  h2 {
    color: #66c0f4;
  }
  ul {
    list-style: none;
    padding: 0;
  }
  li {
    background-color: #2a475e;
    margin: 8px 0;
    padding: 12px 16px;
    border-radius: 6px;
  }
  li:hover {
    background-color: #3a5a75;
  }
  a {
    color: #66c0f4;
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
  }
  .info {
    background-color: #2a475e;
    padding: 12px 16px;
    border-radius: 6px;
    display: inline-block;
    margin-bottom: 20px;
  }
  .kazanildi {
    .game-icon {
    width: 32px;
    height: 32px;
    border-radius: 4px;
    margin-right: 10px;
    vertical-align: middle;
  }
    .game-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    box-sizing: border-box;
  }
  .playtime {
    font-size: 13px;
    opacity: 0.7;
    margin-left: 10px;
    white-space: nowrap;
  }
      .baslik-satiri {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid #2a475e;
    padding-bottom: 10px;
  }
  .baslik-satiri h1 {
    border-bottom: none;
    padding-bottom: 0;
  }
  .playtime-buyuk {
    font-size: 15px;
    opacity: 0.8;
    white-space: nowrap;
  }
  .game-header {
    width: 100%;
    border-radius: 8px;
    margin-bottom: 10px;
  }
    opacity: 0.6;
    border-left: 4px solid #5c9e5c;
  }
</style>
`;

// Ana sayfa: profil linki isteyen form
app.get('/', (req, res) => {
  const html = style + `
    <h1>🎮 Steam Başarım Rehberi</h1>
       <p>Steam hesabındaki oyunlarını incele, eksik başarımlarını gör ve bazı popüler oyunlar için adım adım nasıl kazanılacağını öğren.</p>
    <p style="font-size: 14px; opacity: 0.8;">⚠️ Profilinin ve oyun ayrıntılarının "Herkese Açık" olması gerekiyor, aksi halde veri çekilemez.</p>
    <p>Steam profil linkini veya SteamID'ni gir:</p>
    <form action="/games" method="get">
      <input type="text" name="steamid" placeholder="örn: steamcommunity.com/id/kullaniciadi" 
             style="width: 100%; padding: 10px; border-radius: 6px; border: none; margin-bottom: 10px; box-sizing: border-box;">
      <button type="submit" 
              style="padding: 10px 20px; background-color: #66c0f4; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
        Oyunları Göster
      </button>
    </form>
  `;
  res.send(html);
});

// Girilen profile göre oyun listesini gösterir
app.get('/games', async (req, res) => {
  const userInput = req.query.steamid;

  if (!userInput) {
    return res.send(style + `<h1>Bir profil linki girmelisin.</h1><a href="/">← Geri Dön</a>`);
  }

  try {
    const steamId = await resolveSteamId(userInput);

    const response = await axios.get('https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/', {
      params: {
        key: API_KEY,
        steamid: steamId,
        format: 'json',
        include_appinfo: true,
      }
    });

      const games = response.data.response.games || [];

    if (games.length === 0) {
      return res.send(style + `
        <h1>🔒 Profil Gizli veya Boş</h1>
        <p>Bu profilin oyun listesi görüntülenemedi. Muhtemel sebepler:</p>
        <ul>
          <li>Profilin "Oyun Ayrıntıları" gizlilik ayarı kapalı olabilir</li>
          <li>Bu hesapta hiç oyun kayıtlı olmayabilir</li>
        </ul>
        <p>Profil sahibinin şunu yapması gerekiyor: Steam → Profil → Gizlilik Ayarları → "Oyun Ayrıntıları" seçeneğini "Herkese Açık" yapmalı.</p>
        <a href="/">← Farklı Profil Dene</a>
      `);
    }

    const achievementGames = games.filter(g => g.has_community_visible_stats);

    let html = style + '<h1>🎮 Oyunlar</h1>';
    html += `<input type="text" id="aramaKutusu" onkeyup="oyunAra()" placeholder="Oyun ara..." 
             style="width: 100%; padding: 10px; border-radius: 6px; border: none; margin-bottom: 15px; box-sizing: border-box;">`;
    html += '<ul id="oyunListesi">';
    achievementGames.forEach(game => {
      const iconUrl = `https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`;
      const saat = (game.playtime_forever / 60).toFixed(1);
         html += `<li><a href="/game/${game.appid}?steamid=${steamId}&playtime=${saat}" class="game-item">
                 <img src="${iconUrl}" class="game-icon" onerror="this.style.display='none'">
                 <span>${game.name}</span>
               </a></li>`;
    });
       html += '</ul><a href="/">← Farklı Profil Dene</a>';
    html += `
      <script>
        function oyunAra() {
          const girdi = document.getElementById('aramaKutusu').value.toLowerCase();
          const liste = document.getElementById('oyunListesi').getElementsByTagName('li');
          for (let i = 0; i < liste.length; i++) {
            const isim = liste[i].textContent.toLowerCase();
            liste[i].style.display = isim.includes(girdi) ? '' : 'none';
          }
        }
      </script>
    `;

    res.send(html);
  } catch (error) {
    res.send(style + `
      <h1>Bir sorun oluştu</h1>
      <p>Bu profilin oyun listesi alınamadı. Olası sebepler:</p>
      <ul>
        <li>Profil linki/ID hatalı olabilir</li>
        <li>Bu profilin "Oyun ayrıntıları" gizli olabilir</li>
      </ul>
      <a href="/">← Geri Dön</a>
    `);
  }
});

// Belirli bir oyunun başarımlarını gösterir
app.get('/game/:appid', async (req, res) => {
  const appId = req.params.appid;

  try {
    const response = await axios.get('https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/', {
      params: {
        key: API_KEY,
        steamid: req.query.steamid,
        appid: appId,
        l: 'turkish',
      }
    });

    const achievements = response.data.playerstats.achievements || [];
    const guide = getGuide(appId);
    const kazanilanlar = achievements.filter(a => a.achieved === 1);
    const kazanilmayanlar = achievements.filter(a => a.achieved === 0);
    const headerUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`;
    const playtime = req.query.playtime;
    let html = style + `<img src="${headerUrl}" class="game-header" onerror="this.style.display='none'">`;
    html += `<div class="baslik-satiri"><h1>🏆 Başarımlar</h1>`;
    if (playtime) {
      html += `<span class="playtime-buyuk">🕒 ${playtime} saat oynandı</span>`;
    }
    html += `</div>`;
    html += `<p class="info">Kazanılan: ${kazanilanlar.length} / Toplam: ${achievements.length}</p>`;
    html += `<h2>Eksik Başarımlar</h2>`;

          const chapterOrder = (guide && guide.chapterOrder) 
      ? [...guide.chapterOrder, 'Diğer'] 
      : ['Diğer'];

    const gruplar = {};
    kazanilmayanlar.forEach(a => {
      let chapter = 'Diğer';
      let howTo = '';
      if (guide && guide.achievements[a.name]) {
        chapter = guide.achievements[a.name].chapter || 'Diğer';
        howTo = `<br><em>💡 ${guide.achievements[a.name].howTo}</em>`;
      }
      if (!gruplar[chapter]) gruplar[chapter] = [];
      gruplar[chapter].push({ name: a.name, description: a.description, howTo });
    });

    chapterOrder.forEach(chapter => {
      if (gruplar[chapter] && gruplar[chapter].length > 0) {
        html += `<h2>${chapter}</h2><ul>`;
        gruplar[chapter].forEach(a => {
          html += `<li><strong>${a.name}</strong> — ${a.description}${a.howTo}</li>`;
        });
        html += `</ul>`;
      }
    });

    html += `<h2>✅ Kazanılan Başarımlar</h2><ul>`;
    kazanilanlar.forEach(a => {
      html += `<li class="kazanildi"><strong>${a.name}</strong> — ${a.description}</li>`;
    });
    html += `</ul>`;

    html += `<a href="/games?steamid=${req.query.steamid}">← Oyun Listesine Dön</a>`;

    res.send(html);

  } catch (error) {
    res.send(`
      ${style}
      <h1>Bir sorun oluştu</h1>
      <p>Bu oyunun başarım verisi alınamadı. Olası sebepler:</p>
      <ul>
        <li>Steam profilin gizli olabilir</li>
        <li>Bu oyunda başarım sistemi olmayabilir</li>
      </ul>
      <a href="/">← Oyun Listesine Dön</a>
    `);
  }
});

app.listen(PORT, () => {
  console.log(`Sunucu çalışıyor: http://localhost:${PORT}`);
});