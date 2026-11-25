// Which fandom rooms exist and in which languages (owner decision 2026-11-26):
// the 45 most popular fandoms each have an English room; the top 25 also keep
// their Russian room. Order = popularity.
//
// en.bot: the English room's bot — [username, display name] for the top 25
//   (a bot of its own, next to the Russian room's), [display name] for the
//   others (the room and its bot existed in Russian before and keep their ids).
// en.room: [name, description]. video: YouTube searches for the room's
//   starting video (see ./videos.mjs), English and Russian.
const meta = [
  { fandom: "anime-1", en: { bot: ["leaf_village_fan", "LeafVillageFan"], room: ["Naruto: Hidden Leaf Village", "Naruto, Shippuden and Boruto: jutsu, clans, the best fights and theories."] }, video: ["Naruto Shippuden opening official", "Наруто опенинг"] },
  { fandom: "anime-0", en: { bot: ["grand_line_log", "GrandLineLog"], room: ["One Piece: Grand Line", "Luffy and the Straw Hats: arcs, theories and favourite moments."] }, video: ["One Piece opening official", "Ван Пис опенинг"] },
  { fandom: "anime-4", en: { bot: ["survey_corps_92", "SurveyCorps92"], room: ["Attack on Titan: Beyond the Walls", "Attack on Titan: the walls' secrets, theories and the ending."] }, video: ["Attack on Titan opening official", "Атака титанов опенинг"] },
  { fandom: "anime-5", en: { bot: ["hashira_hq", "HashiraHQ"], room: ["Demon Slayer: Corps HQ", "Demon Slayer: breathing styles, Hashira, arcs and films."] }, video: ["Demon Slayer Infinity Castle official trailer", "Клинок рассекающий демонов трейлер"] },
  { fandom: "anime-6", en: { bot: ["cursed_tech", "CursedTech"], room: ["Jujutsu Kaisen: Tokyo Jujutsu High", "Jujutsu Kaisen: techniques, domain expansions, arcs and theories."] }, video: ["Jujutsu Kaisen opening official", "Магическая битва опенинг"] },
  { fandom: "cinema-5", en: { bot: ["platform_934", "Platform934"], room: ["Harry Potter: Hogwarts Common Room", "The books, films, houses and theories of the Harry Potter world."] }, video: ["Harry Potter official trailer", "Гарри Поттер трейлер"] },
  { fandom: "cinema-7", en: { bot: ["stark_tower", "StarkTower"], room: ["Marvel: Avengers Base", "The Marvel Cinematic Universe: phases, series, Easter eggs and post-credit scenes."] }, video: ["Avengers Endgame official trailer", "Мстители Финал трейлер"] },
  { fandom: "cinema-0", en: { bot: ["kyber_crystal", "KyberCrystal"], room: ["Star Wars: Mos Eisley Cantina", "Star Wars: the sagas, the series, Jedi and Sith. May the Force be with you."] }, video: ["Star Wars official trailer", "Звёздные войны трейлер"] },
  { fandom: "games-0", en: { bot: ["blocky_steve", "BlockySteve"], room: ["Minecraft: Villager Town", "Builds, redstone, survival, mods and seeds — all things Minecraft."] }, video: ["Minecraft official trailer", "Майнкрафт трейлер"] },
  { fandom: "games-11", en: { bot: ["teyvat_wanderer", "TeyvatWanderer"], room: ["Genshin Impact: Teyvat", "Characters, builds, gacha luck and the regions of Teyvat."] }, video: ["Genshin Impact official trailer", "Genshin Impact трейлер"] },
  { fandom: "cinema-16", en: { bot: ["night_watcher", "NightWatcher"], room: ["Game of Thrones: The Red Keep", "Game of Thrones and Martin's books: houses, intrigue, dragons and the ending."] }, video: ["Game of Thrones official trailer", "Игра престолов трейлер"] },
  { fandom: "sport-6", en: { bot: ["top_bins", "TopBins"], room: ["Football: The Stands", "Leagues, transfers, matches and tactics — let's support together ⚽"] }, video: ["Champions League final highlights", "Лига чемпионов финал обзор"] },
  { fandom: "music-0", en: { bot: ["borahae_army", "BorahaeArmy"], room: ["BTS: ARMY Room", "Music videos, solo releases, concerts and everything BTS 💜"] }, video: ["BTS Dynamite official MV", "BTS Butter official MV"] },
  { fandom: "anime-8", en: { bot: ["apple_for_ryuk", "AppleForRyuk"], room: ["Death Note: The Kira Case", "Death Note: the notebook's rules, Light versus L, theories."] }, video: ["Death Note opening official", "Тетрадь смерти опенинг"] },
  { fandom: "cinema-3", en: { bot: ["upside_down", "UpsideDown"], room: ["Stranger Things: Hawkins", "Stranger Things: the Upside Down, the 80s, theories and the final season."] }, video: ["Stranger Things 5 official trailer", "Очень странные дела 5 трейлер"] },
  { fandom: "cinema-12", en: { bot: ["white_wolf", "WhiteWolf"], room: ["The Witcher: Kaer Morhen", "The Witcher: Sapkowski's books, CD Projekt's games and the Netflix series."] }, video: ["The Witcher 3 Wild Hunt official trailer", "Ведьмак 3 трейлер"] },
  { fandom: "cinema-4", en: { bot: ["second_breakfast", "SecondBreakfast"], room: ["The Lord of the Rings: The Prancing Pony", "Tolkien's Middle-earth: the books, Jackson's trilogies and The Rings of Power."] }, video: ["The Lord of the Rings official trailer", "Властелин колец трейлер"] },
  { fandom: "anime-3", en: { bot: ["kamehameha", "Kamehameha"], room: ["Dragon Ball: Capsule Corp", "Dragon Ball, Z, Super and Daima: transformations, tournaments and the Dragon Balls."] }, video: ["Dragon Ball Daima official trailer", "Dragon Ball Z опенинг"] },
  { fandom: "cinema-17", en: { bot: ["blue_sky_99", "BlueSky99"], room: ["Breaking Bad: Albuquerque", "Breaking Bad and Better Call Saul: Walter, Jesse, Saul and Gus."] }, video: ["Breaking Bad official trailer", "Во все тяжкие трейлер"] },
  { fandom: "music-6", en: { bot: ["folklore_cardigan", "FolkloreCardigan"], room: ["Taylor Swift: The Eras", "Albums, Taylor's Versions, the Eras Tour and Taylor's Easter eggs."] }, video: ["Taylor Swift Anti-Hero official music video", "Taylor Swift Shake It Off official video"] },
  { fandom: "anime-13", en: { bot: ["devil_hunter", "DevilHunter"], room: ["Chainsaw Man: Public Safety", "Chainsaw Man: devils, contracts, Denji and Makima."] }, video: ["Chainsaw Man Reze Arc official trailer", "Человек бензопила опенинг"] },
  { fandom: "anime-7", en: { bot: ["one_for_all", "OneForAll"], room: ["My Hero Academia: U.A. High", "My Hero Academia: quirks, Class 1-A and the finale."] }, video: ["My Hero Academia opening official", "Моя геройская академия опенинг"] },
  { fandom: "sport-0", en: { bot: ["box_box_box", "BoxBoxBox"], room: ["Formula 1: Pit Lane", "Races, teams, strategy and Drive to Survive 🏎️"] }, video: ["Formula 1 race highlights", "Формула 1 обзор гонки"] },
  { fandom: "games-21", en: { bot: ["night_city_choom", "NightCityChoom"], room: ["Cyberpunk 2077: Night City", "V, Johnny, implants, Phantom Liberty and the endings."] }, video: ["Cyberpunk 2077 official trailer", "Киберпанк 2077 трейлер"] },
  { fandom: "anime-2", en: { bot: ["soul_reaper", "SoulReaper"], room: ["Bleach: Soul Society", "Bleach and Thousand-Year Blood War: Soul Reapers, bankai and captains."] }, video: ["Bleach Thousand Year Blood War opening official", "Блич опенинг"] },
  // English only from here on (the Russian room becomes the English one).
  { fandom: "cinema-19", en: { bot: ["CentralPerkRegular"], room: ["Friends: Central Perk", "Ross, Rachel, Monica, Chandler, Joey and Phoebe. Let's rewatch together."] }, video: ["Friends official trailer"] },
  { fandom: "anime-12", en: { bot: ["ForgerFamilyFan"], room: ["Spy × Family: Ostania", "A spy, an assassin and a telepath under one roof: Spy × Family."] }, video: ["Spy x Family opening official"] },
  { fandom: "games-13", en: { bot: ["TarnishedOne"], room: ["Elden Ring: The Lands Between", "Bosses, builds, lore and Shadow of the Erdtree."] }, video: ["Elden Ring official trailer"] },
  { fandom: "games-20", en: { bot: ["VaultDweller"], room: ["Fallout: The Vault", "The Fallout games and Amazon's series: the Wasteland, the Vaults and atomic retrofuturism."] }, video: ["Fallout season 2 official trailer"] },
  { fandom: "cinema-15", en: { bot: ["DragonpitKeeper"], room: ["House of the Dragon: The Dragonpit", "House of the Dragon: the Targaryens, the Dance of the Dragons and every dragon by name."] }, video: ["House of the Dragon official trailer"] },
  { fandom: "cinema-14", en: { bot: ["FireflyCamp"], room: ["The Last of Us: Firefly Camp", "Naughty Dog's games and the HBO series: Joel, Ellie and the world after Cordyceps."] }, video: ["The Last of Us HBO official trailer"] },
  { fandom: "cinema-13", en: { bot: ["NevermoreRaven"], room: ["Wednesday: Nevermore Academy", "Tim Burton's Wednesday: the Addams family, Nevermore's secrets and the dance."] }, video: ["Wednesday season 2 official trailer"] },
  { fandom: "anime-24", en: { bot: ["TotoroBusStop"], room: ["Studio Ghibli: Totoro's Bus Stop", "Miyazaki's and Ghibli's films: favourite worlds, Hisaishi's music and coziness."] }, video: ["The Boy and the Heron official trailer"] },
  { fandom: "anime-19", en: { bot: ["PokedexOnline"], room: ["Pokémon: Professor Oak's Lab", "Pokémon: the anime, the games, favourite Pokémon and starters."] }, video: ["Pokemon official trailer"] },
  { fandom: "music-1", en: { bot: ["BlinkInPink"], room: ["BLACKPINK: Pink Zone", "BLACKPINK and the solo work of Jennie, Lisa, Rosé and Jisoo 🖤💗"] }, video: ["BLACKPINK official MV"] },
  { fandom: "music-7", en: { bot: ["OceanEyesBot"], room: ["Billie Eilish: Billie's Room", "Billie Eilish and Finneas: albums, concerts and soundtracks."] }, video: ["Billie Eilish official music video"] },
  { fandom: "anime-9", en: { bot: ["FullmetalAlchemist"], room: ["Fullmetal Alchemist: Amestris", "Fullmetal Alchemist and Brotherhood: equivalent exchange, homunculi and the Elric brothers."] }, video: ["Fullmetal Alchemist Brotherhood opening official"] },
  { fandom: "games-5", en: { bot: ["HyruleSage"], room: ["Zelda: Hyrule", "The Legend of Zelda: from the first game to Tears of the Kingdom."] }, video: ["The Legend of Zelda Tears of the Kingdom official trailer"] },
  { fandom: "games-3", en: { bot: ["SulSulSimmer"], room: ["The Sims: Willow Creek", "Legacies, challenges, mods and Sim drama."] }, video: ["The Sims 4 official trailer"] },
  { fandom: "sport-7", en: { bot: ["BuzzerBeater"], room: ["Basketball: The Hardwood", "The NBA, the EuroLeague, the best games and highlights 🏀"] }, video: ["NBA highlights"] },
  { fandom: "music-21", en: { bot: ["HybridTheory"], room: ["Linkin Park: Hybrid Theory", "Linkin Park from Hybrid Theory to From Zero: songs, concerts and the new era."] }, video: ["Linkin Park official music video"] },
  { fandom: "games-12", en: { bot: ["AstralExpress"], room: ["Honkai: Star Rail: The Astral Express", "The Trailblazer's journeys, characters and builds in Star Rail."] }, video: ["Honkai Star Rail official trailer"] },
  { fandom: "games-19", en: { bot: ["DragonbornFus"], room: ["The Elder Scrolls: The Bannered Mare", "Skyrim, Oblivion, Morrowind and all of Tamriel."] }, video: ["Skyrim official trailer"] },
  { fandom: "music-2", en: { bot: ["StayForever"], room: ["Stray Kids: STAY Room", "Stray Kids: albums, choreography, 3RACHA and concerts."] }, video: ["Stray Kids official MV"] },
  { fandom: "books-4", en: { bot: ["Mockingjay"], room: ["The Hunger Games: Panem", "Suzanne Collins's books and the films: Katniss, Peeta, Snow and the prequels."] }, video: ["The Hunger Games official trailer"] },
];
export default meta;
