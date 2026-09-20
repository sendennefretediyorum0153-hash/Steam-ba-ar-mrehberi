require('dotenv').config();
const axios = require('axios');

const API_KEY = process.env.STEAM_API_KEY;
const STEAM_ID = process.env.STEAM_ID;

async function getOwnedGames() {
  const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/`;

  const response = await axios.get(url, {
    params: {
      key: API_KEY,
      steamid: STEAM_ID,
      format: 'json',
      include_appinfo: true, // oyun isimlerini de getirsin
    }
  });

  const games = response.data.response.games;
  console.log(`Toplam oyun sayısı: ${games.length}`);
  console.log(games.slice(0, 5)); // ilk 5 oyunu göster, hepsi çok kalabalık olmasın
}

getOwnedGames();
async function getPlayerAchievements(appId) {
  const url = `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/`;

  try {
    const response = await axios.get(url, {
      params: {
        key: API_KEY,
        steamid: STEAM_ID,
        appid: appId,
        l: 'turkish', // başarım isim/açıklamalarını Türkçe iste
      }
    });

    const achievements = response.data.playerstats.achievements;
    console.log(`Toplam başarım sayısı: ${achievements.length}`);
    const kazanilanlar = achievements.filter(a => a.achieved === 1);
    const kazanilmayanlar = achievements.filter(a => a.achieved === 0);

    console.log(`Kazanılan: ${kazanilanlar.length} / Toplam: ${achievements.length}`);
    console.log('--- KAZANILMAYAN BAŞARIMLAR ---');
    kazanilmayanlar.forEach(a => {
      console.log(`❌ ${a.name} — ${a.description}`);
    });
    console.log('--- TÜM BAŞARIMLAR (apiname | name) ---');
    achievements.forEach(a => {
      console.log(`${a.apiname} | ${a.name}`);
    });
  } catch (error) {
    console.log('Hata oluştu:', error.response?.data || error.message);
  }
}

getPlayerAchievements(1174180); // RDR2