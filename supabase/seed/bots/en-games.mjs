// English content for the game rooms (see ./index.mjs).
const en = {
  "games-0": {
    greet: ["Sss… hi, {name}! 💚 Don't worry, I'm a friendly creeper. Minecraft questions — to me, !quiz — a quiz", "{name}, hi! Builder or survivor?"],
    topics: ["The best Minecraft update ever?", "What are you building right now?", "Hardcore — who has beaten the dragon without dying?"],
    addressed: ["Psst… I'm here 💚"],
    faq: [
      [["how", "kill", "dragon"], "Find a stronghold with Eyes of Ender, activate the End portal, destroy the crystals on the obsidian pillars and hit the dragon with a bow and a sword."],
      [["how", "nether"], "A Nether portal is an obsidian frame of at least 4×5 blocks, lit with flint and steel."],
      [["where", "diamond"], "Diamonds are most common around Y=-58 in the new generation (1.18+). You need an iron pickaxe or better."],
    ],
    quiz: [
      ["Which block is a Nether portal built from?", "Obsidian"],
      ["Which mob explodes next to the player?", "Creeper"],
      ["What do you need for an Eye of Ender besides blaze powder?", "Ender pearl", "Ender pearls"],
      ["What is the End's final boss?", "Ender Dragon", "Dragon"],
    ],
  },
  "games-11": {
    greet: ["Ehe! Hi, {name}! Paimon is not emergency food! 🍰 Genshin questions — to me", "{name}, hi! Who are you pulling for?"],
    topics: ["The best region of Teyvat?", "Who is your Genshin main?", "Your luckiest 50/50 ever?"],
    addressed: ["Paimon's here! Well, a Paimon-fan bot 😄"],
    faq: [
      [["how many", "region"], "The seven nations of Teyvat: Mondstadt, Liyue, Inazuma, Sumeru, Fontaine, Natlan and Snezhnaya."],
      [["pity"], "A 5★ character is guaranteed within 90 wishes; if you lose the 50/50, the next 5★ is the banner one."],
    ],
    quiz: [
      ["What is the Traveler's flying companion called?", "Paimon"],
      ["The Archon of which element rules Mondstadt?", "Anemo", "Wind"],
      ["What is the currency for wishes called?", "Primogems"],
    ],
  },
  "games-12": {
    greet: ["{name}, welcome aboard! 🚂 Star Rail questions — to me"],
    topics: ["Favourite Star Rail world?", "Who is your favourite Express crew member?"],
    addressed: ["Pom-pom! The Express is online 🚂"],
    faq: [
      [["who", "pom"], "Pom-Pom is the Astral Express conductor, who looks like a rabbit."],
      [["what", "path"], "Paths are the powers of the Aeons; characters follow one of them, such as Destruction or Harmony."],
    ],
    quiz: [
      ["What is the Express conductor called?", "Pom-Pom", "Pom Pom"],
      ["What weapon does March 7th use?", "A bow", "Bow"],
      ["What is the main character called?", "Trailblazer"],
    ],
  },
  "games-13": {
    greet: ["{name}, Tarnished, hi! ⚔️ Elden Ring questions — to me", "Try jumping, {name}… oops, that's a message 😄"],
    topics: ["The hardest Elden Ring boss?", "Which build did you play — magic or strength?", "Is Shadow of the Erdtree FromSoftware's best DLC?"],
    addressed: ["Summon… accepted! I'm here ⚔️"],
    faq: [
      [["malenia"], "Malenia, Blade of Miquella, is seen as the base game's hardest boss: her Waterfowl Dance needs well-timed dodges."],
      [["dlc", "how", "get"], "For Shadow of the Erdtree, defeat Radahn and Mohg, then touch the cocoon in Mohgwyn Palace."],
    ],
    quiz: [
      ["What is the tree at the centre of the Lands Between called?", "Erdtree", "The Erdtree"],
      ["What is the spectral steed called?", "Torrent"],
      ["Who developed Elden Ring?", "FromSoftware"],
    ],
  },
  "games-5": {
    greet: ["Hey, listen, {name}! 🧚 Zelda questions — to me"],
    topics: ["Breath of the Wild or Tears of the Kingdom?", "Favourite classic Zelda?"],
    addressed: ["Hey! Listen! I'm here 🧚"],
    faq: [
      [["hero", "name"], "The hero is Link. Zelda is the princess of Hyrule (a common mix-up!)."],
      [["where", "start"], "Breath of the Wild is a great start, then Tears of the Kingdom. The classic is Ocarina of Time."],
    ],
    quiz: [
      ["What is the main character of the Zelda series called?", "Link"],
      ["Who is the series' main villain?", "Ganon", "Ganondorf"],
      ["What is the sword that seals the darkness called?", "Master Sword", "The Master Sword"],
    ],
  },
  "games-3": {
    greet: ["Sul sul, {name}! 💎 The Sims questions — to me"],
    topics: ["Your favourite Sims challenge?", "The Sims 4 or The Sims 3?"],
    addressed: ["Sul sul! I'm here 💎"],
    faq: [
      [["cheat", "money"], "The Sims 4 money cheat: Ctrl+Shift+C → motherlode (50,000 simoleons) or kaching (1,000)."],
      [["what", "sul sul"], "'Sul sul' means 'hello' in Simlish, 'dag dag' means 'bye'."],
    ],
    quiz: [
      ["What is the Sims' language called?", "Simlish"],
      ["What colour is the crystal above a Sim's head?", "Green"],
      ["Which cheat gives 50,000 simoleons?", "motherlode"],
    ],
  },
  "games-21": {
    greet: ["{name}, wake up, samurai! 🌃 Cyberpunk 2077 questions — to me"],
    topics: ["The best Cyberpunk 2077 ending?", "Your favourite Night City character?"],
    addressed: ["Choom online 🌃"],
    faq: [
      [["phantom", "liberty"], "Phantom Liberty is a spy expansion in Dogtown, with a new ending for the game."],
      [["how many", "ending"], "Cyberpunk 2077 has several endings (about six, plus one more in Phantom Liberty), depending on choices and relationships."],
    ],
    quiz: [
      ["Who plays Johnny Silverhand?", "Keanu Reeves", "Reeves"],
      ["What is the protagonist called?", "V"],
      ["What is the legendary mercenary bar called?", "Afterlife", "The Afterlife"],
    ],
  },
  "games-20": {
    greet: ["{name}, welcome to the Vault! ☢️ Fallout questions — to me"],
    topics: ["Is New Vegas the best Fallout game?", "Did you like the Fallout series?"],
    addressed: ["The Pip-Boy says: I'm here ☢️"],
    faq: [
      [["series", "show"], "Amazon's Fallout series (since 2024): season 2 came out in December 2025 and is set in New Vegas."],
      [["order", "game"], "Fallout (1997) → Fallout 2 → Fallout 3 → New Vegas → Fallout 4 → Fallout 76. The stories are mostly separate."],
    ],
    quiz: [
      ["What is the wrist computer in Fallout called?", "Pip-Boy", "Pip Boy"],
      ["What is the currency of the Wasteland?", "Bottle caps", "Caps"],
      ["What is the series' mascot boy called?", "Vault Boy"],
    ],
  },
  "games-19": {
    greet: ["FUS RO DAH, {name}! 🐉 I mean, hi. Elder Scrolls questions — to me"],
    topics: ["Skyrim, Oblivion or Morrowind?", "Which race do you pick in Skyrim?"],
    addressed: ["I used to be a bot like you… then I took an arrow to the knee 🏹"],
    faq: [
      [["when", "elder scrolls 6"], "The Elder Scrolls VI was announced in 2018; there is no release date yet."],
      [["oblivion", "remaster"], "The Oblivion remaster came out in 2025 on Unreal Engine 5."],
    ],
    quiz: [
      ["Which village does the Dragonborn reach first after Helgen?", "Riverwood"],
      ["What are the Dovahkiin?", "Dragonborn"],
      ["What is the continent where the games take place?", "Tamriel"],
    ],
  },
  "games-23": {
    greet: ["{name}, hi from Dirtmouth 🪲 Hollow Knight questions — to me"],
    topics: ["Did Silksong live up to expectations?", "The hardest Hollow Knight boss?"],
    addressed: ["The little bug is here 🪲"],
    faq: [
      [["silksong"], "Hollow Knight: Silksong came out on 4 September 2025. Its heroine is Hornet."],
    ],
    quiz: [
      ["Who is the heroine of Silksong?", "Hornet"],
      ["What is the town on the surface called?", "Dirtmouth"],
      ["What is the fallen bug kingdom called?", "Hallownest"],
    ],
  },
  "games-24": {
    greet: ["{name}, you are filled with DETERMINATION ✨ Undertale questions — to me"],
    topics: ["Pacifist or genocide — how did you play first?", "Favourite track from the soundtrack?"],
    addressed: ["* The bot looks at you. The bot is ready to answer."],
    faq: [
      [["deltarune"], "Deltarune is Toby Fox's next game; chapters 1–4 are out, the rest are in the works."],
      [["ending"], "The main routes are Neutral, Pacifist and Genocide — it depends on whether you spare monsters."],
    ],
    quiz: [
      ["What is the joking skeleton called?", "Sans"],
      ["Who made Undertale?", "Toby Fox"],
      ["What is the goat mother who meets the player called?", "Toriel"],
    ],
  },
  "games-16": {
    greet: ["{name}, sit by the campfire 🔥 Baldur's Gate 3 questions — to me"],
    topics: ["Your favourite BG3 companion?", "Which class did you play first?"],
    addressed: ["Perception check — 20! I noticed someone called me 🎲"],
    faq: [
      [["how many", "act"], "Baldur's Gate 3 has three acts; a full playthrough takes 75–100+ hours."],
      [["rules"], "The game uses Dungeons & Dragons 5th edition rules."],
    ],
    quiz: [
      ["Who developed Baldur's Gate 3?", "Larian", "Larian Studios"],
      ["What is the vampire companion called?", "Astarion"],
      ["Which tabletop game's rules is BG3 based on?", "D&D", "Dungeons & Dragons"],
    ],
  },
  "games-1": {
    greet: ["{name}, hi! How's the harvest? 🌱 Stardew Valley questions — to me"],
    topics: ["Your favourite farm layout?", "Who did you marry in Stardew Valley?"],
    addressed: ["Here, watering the crops 🌱"],
    faq: [
      [["how", "marry"], "You need 8 hearts to give a bouquet, then 10 hearts and the Mermaid's Pendant from the Old Mariner on the beach."],
    ],
    quiz: [
      ["What is the town in Stardew Valley called?", "Pelican Town"],
      ["What do you give to propose marriage?", "Mermaid's Pendant", "Mermaid Pendant"],
      ["Who made Stardew Valley?", "ConcernedApe", "Eric Barone", "Barone"],
    ],
  },
  "games-14": {
    greet: ["{name}, the bonfire is lit 🔥 Dark Souls questions — to me"],
    topics: ["The hardest boss in the Dark Souls series?", "The best part: the first or the third?"],
    addressed: ["Praise the sun! ☀️ I'm here"],
    faq: [
      [["where", "start"], "Dark Souls Remastered — the first game — is a good start, then DS2 and DS3. The stories connect but stand alone."],
    ],
    quiz: [
      ["What do players light to rest and save?", "A bonfire", "Bonfire"],
      ["Ornstein and… which famous boss duo?", "Smough", "Smough the Executioner"],
      ["Who praises the sun?", "Solaire", "Solaire of Astora"],
    ],
  },
};
export default en;
