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
  if (/^\d{17}$/.test(input)) return input;
  const profileMatch = input.match(/profiles\/(\d{17})/);
  if (profileMatch) return profileMatch[1];
  let vanity = input;
  const idMatch = input.match(/id\/([^\/]+)/);
  if (idMatch) vanity = idMatch[1];
  const response = await axios.get('https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/', {
    params: { key: API_KEY, vanityurl: vanity }
  });
  if (response.data.response.success === 1) return response.data.response.steamid;
  throw new Error('Steam profili bulunamadı');
}

const T = {
  tr: {
    homeTitle: '🎮 Steam Başarım Rehberi',
    homeDesc: 'Steam hesabındaki oyunlarını incele, eksik başarımlarını gör ve bazı popüler oyunlar için adım adım nasıl kazanılacağını öğren.',
    homeWarning: '⚠️ Profilinin ve oyun ayrıntılarının "Herkese Açık" olması gerekiyor, aksi halde veri çekilemez.',
    formLabel: 'Steam profil linkini veya SteamID\'ni gir:',
    formButton: 'Oyunları Göster',
    formPlaceholder: 'örn: steamcommunity.com/id/kullaniciadi',
    needProfile: 'Bir profil linki girmelisin.',
    goBack: '← Geri Dön',
    gamesTitle: '🎮 Oyunlar',
    searchPlaceholder: 'Oyun ara...',
    diffProfile: '← Farklı Profil Dene',
    gamesErrTitle: 'Bir sorun oluştu',
    gamesErrDesc: 'Bu profilin oyun listesi alınamadı. Olası sebepler:',
    gamesErrB1: 'Profil linki/ID hatalı olabilir',
    gamesErrB2: 'Bu profilin "Oyun ayrıntıları" gizli olabilir',
    lockedTitle: '🔒 Profil Gizli veya Boş',
    lockedDesc: 'Bu profilin oyun listesi görüntülenemedi. Muhtemel sebepler:',
    lockedB1: 'Profilin "Oyun Ayrıntıları" gizlilik ayarı kapalı olabilir',
    lockedB2: 'Bu hesapta hiç oyun kayıtlı olmayabilir',
    lockedFooter: 'Profil sahibinin şunu yapması gerekiyor: Steam → Profil → Gizlilik Ayarları → "Oyun Ayrıntıları" seçeneğini "Herkese Açık" yapmalı.',
    achTitle: '🏆 Başarımlar',
    kazanilan: 'Kazanılan',
    toplam: 'Toplam',
    eksikBaslik: 'Eksik Başarımlar',
    kazanilanBaslik: '✅ Kazanılan Başarımlar',
    backToGames: '← Oyun Listesine Dön',
    playtimeSuffix: 'saat oynandı',
    achErrTitle: 'Bir sorun oluştu',
    achErrDesc: 'Bu oyunun başarım verisi alınamadı. Olası sebepler:',
    achErrB1: 'Steam profilin gizli olabilir',
    achErrB2: 'Bu oyunda başarım sistemi olmayabilir'
  },
  en: {
    homeTitle: '🎮 Steam Achievement Guide',
    homeDesc: 'Browse the games in your Steam account, see your missing achievements, and learn step-by-step how to unlock them for select popular games.',
    homeWarning: '⚠️ Your profile and game details must be set to "Public", otherwise data cannot be fetched.',
    formLabel: 'Enter your Steam profile link or SteamID:',
    formButton: 'Show Games',
    formPlaceholder: 'e.g. steamcommunity.com/id/username',
    needProfile: 'You must enter a profile link.',
    goBack: '← Go Back',
    gamesTitle: '🎮 Games',
    searchPlaceholder: 'Search games...',
    diffProfile: '← Try a Different Profile',
    gamesErrTitle: 'Something went wrong',
    gamesErrDesc: 'This profile\'s game list could not be retrieved. Possible reasons:',
    gamesErrB1: 'The profile link/ID may be incorrect',
    gamesErrB2: 'This profile\'s "Game details" may be private',
    lockedTitle: '🔒 Profile Private or Empty',
    lockedDesc: 'This profile\'s game list could not be displayed. Possible reasons:',
    lockedB1: 'The profile\'s "Game Details" privacy setting may be off',
    lockedB2: 'This account may have no games',
    lockedFooter: 'The profile owner needs to: Steam → Profile → Privacy Settings → set "Game details" to "Public".',
    achTitle: '🏆 Achievements',
    kazanilan: 'Unlocked',
    toplam: 'Total',
    eksikBaslik: 'Missing Achievements',
    kazanilanBaslik: '✅ Unlocked Achievements',
    backToGames: '← Back to Game List',
    playtimeSuffix: 'hours played',
    achErrTitle: 'Something went wrong',
    achErrDesc: 'This game\'s achievement data could not be retrieved. Possible reasons:',
    achErrB1: 'Your Steam profile may be private',
    achErrB2: 'This game may not have an achievement system'
  }
};

function getLang(req) {
  return req.query.lang === 'en' ? 'en' : 'tr';
}

function qs(obj) {
  return Object.entries(obj).filter(([k, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
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
  h1 { color: #66c0f4; border-bottom: 2px solid #2a475e; padding-bottom: 10px; }
  h2 { color: #66c0f4; }
  ul { list-style: none; padding: 0; }
  li { background-color: #2a475e; margin: 8px 0; padding: 12px 16px; border-radius: 6px; }
  li:hover { background-color: #3a5a75; }
  a { color: #66c0f4; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .info { background-color: #2a475e; padding: 12px 16px; border-radius: 6px; display: inline-block; margin-bottom: 20px; }
  .kazanildi { opacity: 0.6; border-left: 4px solid #5c9e5c; }
  .game-icon { width: 32px; height: 32px; border-radius: 4px; margin-right: 10px; vertical-align: middle; }
  .game-item { display: flex; align-items: center; justify-content: space-between; width: 100%; box-sizing: border-box; }
  .game-header { width: 100%; border-radius: 8px; margin-bottom: 10px; }
  .baslik-satiri { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2a475e; padding-bottom: 10px; }
  .baslik-satiri h1 { border-bottom: none; padding-bottom: 0; }
  .playtime-buyuk { font-size: 15px; opacity: 0.8; white-space: nowrap; }
  .discord-float {
    position: fixed; bottom: 20px; right: 20px;
    background-color: #5865F2; color: white; padding: 12px 18px;
    border-radius: 50px; text-decoration: none; font-weight: bold;
    box-shadow: 0 4px 12px rgba(0,0,0,0.4); z-index: 1000;
    display: flex; align-items: center; gap: 8px;
    transition: transform 0.2s; font-size: 14px;
  }
  .discord-float:hover { transform: scale(1.05); text-decoration: none; }
  .lang-switch {
    position: fixed; bottom: 80px; right: 20px;
    display: flex; flex-direction: column; gap: 8px; z-index: 1000;
  }
  .lang-switch a {
    font-size: 22px; background-color: #2a475e; border-radius: 50%;
    width: 44px; height: 44px; display: flex; align-items: center;
    justify-content: center; text-decoration: none;
    box-shadow: 0 2px 8px rgba(0,0,0,0.4); transition: transform 0.2s;
  }
  .lang-switch a.active { border: 2px solid #66c0f4; }
  .lang-switch a:hover { transform: scale(1.1); text-decoration: none; }
</style>
`;

const discordButton = `
  <a href="https://discord.gg/D2w8wHjnS" target="_blank" class="discord-float">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.057c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
    Discord
  </a>
`;

function langSwitch(req) {
  const lang = getLang(req);
  const base = { ...req.query };
  base.lang = 'tr';
  const trUrl = `${req.path}?${qs(base)}`;
  base.lang = 'en';
  const enUrl = `${req.path}?${qs(base)}`;
  return `<div class="lang-switch">
    <a href="${trUrl}" class="${lang === 'tr' ? 'active' : ''}" title="Türkçe">🇹🇷</a>
    <a href="${enUrl}" class="${lang === 'en' ? 'active' : ''}" title="English">🇬🇧</a>
  </div>`;
}

app.get('/', (req, res) => {
  const lang = getLang(req);
  const t = T[lang];
  const html = style + `
    <h1>${t.homeTitle}</h1>
    <p>${t.homeDesc}</p>
    <p style="font-size: 14px; opacity: 0.8;">${t.homeWarning}</p>
    <p>${t.formLabel}</p>
    <form action="/games" method="get">
      <input type="hidden" name="lang" value="${lang}">
      <input type="text" name="steamid" placeholder="${t.formPlaceholder}" 
             style="width: 100%; padding: 10px; border-radius: 6px; border: none; margin-bottom: 10px; box-sizing: border-box;">
      <button type="submit" 
              style="padding: 10px 20px; background-color: #66c0f4; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
        ${t.formButton}
      </button>
    </form>
  `;
  res.send(html + discordButton + langSwitch(req));
});

app.get('/games', async (req, res) => {
  const lang = getLang(req);
  const t = T[lang];
  const userInput = req.query.steamid;

  if (!userInput) {
    return res.send(style + `<h1>${t.needProfile}</h1><a href="/?lang=${lang}">${t.goBack}</a>` + discordButton + langSwitch(req));
  }

  try {
    const steamId = await resolveSteamId(userInput);

    const response = await axios.get('https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/', {
      params: { key: API_KEY, steamid: steamId, format: 'json', include_appinfo: true }
    });

    const games = response.data.response.games || [];

    if (games.length === 0) {
      return res.send(style + `
        <h1>${t.lockedTitle}</h1>
        <p>${t.lockedDesc}</p>
        <ul>
          <li>${t.lockedB1}</li>
          <li>${t.lockedB2}</li>
        </ul>
        <p>${t.lockedFooter}</p>
        <a href="/?lang=${lang}">${t.diffProfile}</a>
      ` + discordButton + langSwitch(req));
    }

    const achievementGames = games.filter(g => g.has_community_visible_stats);

    let html = style + `<h1>${t.gamesTitle}</h1>`;
    html += `<input type="text" id="aramaKutusu" onkeyup="oyunAra()" placeholder="${t.searchPlaceholder}" 
             style="width: 100%; padding: 10px; border-radius: 6px; border: none; margin-bottom: 15px; box-sizing: border-box;">`;
    html += '<ul id="oyunListesi">';
    achievementGames.forEach(game => {
      const iconUrl = `https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`;
      const saat = (game.playtime_forever / 60).toFixed(1);
      html += `<li><a href="/game/${game.appid}?steamid=${steamId}&playtime=${saat}&lang=${lang}" class="game-item">
                 <img src="${iconUrl}" class="game-icon" onerror="this.style.display='none'">
                 <span>${game.name}</span>
               </a></li>`;
    });
    html += `</ul><a href="/?lang=${lang}">${t.diffProfile}</a>`;
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

    res.send(html + discordButton + langSwitch(req));
  } catch (error) {
    res.send(style + `
      <h1>${t.gamesErrTitle}</h1>
      <p>${t.gamesErrDesc}</p>
      <ul>
        <li>${t.gamesErrB1}</li>
        <li>${t.gamesErrB2}</li>
      </ul>
      <a href="/?lang=${lang}">${t.goBack}</a>
    ` + discordButton + langSwitch(req));
  }
});

app.get('/game/:appid', async (req, res) => {
  const lang = getLang(req);
  const t = T[lang];
  const appId = req.params.appid;

  try {
    const response = await axios.get('https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/', {
      params: {
        key: API_KEY,
        steamid: req.query.steamid,
        appid: appId,
        l: lang === 'en' ? 'english' : 'turkish',
      }
    });

    const achievements = response.data.playerstats.achievements || [];
    const guide = getGuide(appId);
    const kazanilanlar = achievements.filter(a => a.achieved === 1);
    const kazanilmayanlar = achievements.filter(a => a.achieved === 0);

    const headerUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`;
    const playtime = req.query.playtime;
    let html = style + `<img src="${headerUrl}" class="game-header" onerror="this.style.display='none'">`;
    html += `<div class="baslik-satiri"><h1>${t.achTitle}</h1>`;
    if (playtime) {
      html += `<span class="playtime-buyuk">🕒 ${playtime} ${t.playtimeSuffix}</span>`;
    }
    html += `</div>`;
    html += `<p class="info">${t.kazanilan}: ${kazanilanlar.length} / ${t.toplam}: ${achievements.length}</p>`;
    html += `<h2>${t.eksikBaslik}</h2>`;

    const chapterOrder = (guide && guide.chapterOrder) ? [...guide.chapterOrder, 'Diğer'] : ['Diğer'];

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

    html += `<h2>${t.kazanilanBaslik}</h2><ul>`;
    kazanilanlar.forEach(a => {
      html += `<li class="kazanildi"><strong>${a.name}</strong> — ${a.description}</li>`;
    });
    html += `</ul>`;

    html += `<a href="/games?steamid=${req.query.steamid}&lang=${lang}">${t.backToGames}</a>`;

    res.send(html + discordButton + langSwitch(req));

  } catch (error) {
    res.send(`
      ${style}
      <h1>${t.achErrTitle}</h1>
      <p>${t.achErrDesc}</p>
      <ul>
        <li>${t.achErrB1}</li>
        <li>${t.achErrB2}</li>
      </ul>
      <a href="/?lang=${lang}">${t.goBack}</a>
    ` + discordButton + langSwitch(req));
  }
});

app.listen(PORT, () => {
  console.log(`Sunucu çalışıyor: http://localhost:${PORT}`);
});