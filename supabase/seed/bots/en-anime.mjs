// English content for the anime rooms (see ./index.mjs). Quizzes line up with
// the Russian ones by position: their accepted answers are merged.
const en = {
  "anime-0": {
    greet: ["Yo-ho-ho, {name}! Welcome aboard the Thousand Sunny ⛵ Ask me about One Piece or play: !quiz", "{name}, hi! Which arc is your favourite? Mine is Enies Lobby 🏴‍☠️"],
    topics: ["Which One Piece arc hits hardest emotionally?", "Who is your favourite Straw Hat and why?", "Whose Devil Fruit would you want?"],
    addressed: ["Here, captain! Ask me about One Piece — or !quiz for a quiz."],
    faq: [
      [["how many", "episode"], "The One Piece anime has run since 1999 — over 1,100 episodes. Eiichiro Oda's manga started in 1997."],
      [["where", "start"], "Start from episode 1 or the manga. For a faster pace there is the fan edit One Pace, without filler."],
      [["filler"], "One Piece has little filler (about 90 episodes), such as the G-8 and Warship Island arcs. Safe to skip."],
      [["luffy", "father"], "Luffy's father is Monkey D. Dragon, leader of the Revolutionary Army.", true],
      [["who", "killed", "ace"], "Ace was killed by Admiral Akainu at Marineford, shielding Luffy.", true],
    ],
    quiz: [
      ["What is the Straw Hats' first ship called?", "Going Merry", "Merry"],
      ["Which fruit did Luffy eat (as it was first called)?", "Gum-Gum", "Gomu Gomu"],
      ["Who is the Straw Hats' cook?", "Sanji"],
      ["What is the name of the three-sword swordsman?", "Zoro", "Roronoa Zoro"],
    ],
  },
  "anime-1": {
    greet: ["Believe it, {name}! 🍥 I answer questions about Naruto here. Try !quiz", "{name}, hi! Team 7 or the Akatsuki — who are you rooting for?"],
    topics: ["Best fight in Naruto: Naruto vs Pain or Itachi vs Sasuke?", "Whose story in Naruto is the saddest?", "Which clan would you pick: Uchiha, Hyuga or Nara?"],
    addressed: ["Here — a bit late, like Kakashi 😄 Ask away!"],
    faq: [
      [["how many", "episode"], "Naruto has 220 episodes, Naruto Shippuden 500, followed by Boruto."],
      [["order", "watch"], "Order: Naruto (220), then Shippuden (500), then Boruto. Films are optional; canon ones are The Last and Boruto: The Movie."],
      [["filler"], "Naruto and Shippuden have a lot of filler — about 40%. Canon episode lists help."],
      [["naruto", "father"], "Naruto's father is Minato Namikaze, the Fourth Hokage.", true],
      [["why", "itachi"], "Itachi wiped out the Uchiha clan on the village's orders to stop a coup, and spared Sasuke.", true],
    ],
    quiz: [
      ["What is the nine-tailed fox's name?", "Kurama", "Kyubi"],
      ["What is Naruto's favourite food?", "Ramen"],
      ["Who taught Team 7?", "Kakashi", "Kakashi Hatake"],
      ["Which organisation wears cloaks with red clouds?", "Akatsuki"],
    ],
  },
  "anime-2": {
    greet: ["{name}, welcome to the Soul Society ⚔️ Ask about Bleach, or warm up with !quiz", "Hi, {name}! Whose bankai looks the coolest to you?"],
    topics: ["Whose bankai in Bleach is the strongest?", "Is the Thousand-Year Blood War arc the best of Bleach?", "Who is the best Gotei 13 captain?"],
    addressed: ["Bankai! I mean — hi 😄 How can I help?"],
    faq: [
      [["how many", "episode"], "The original Bleach has 366 episodes (2004–2012). Thousand-Year Blood War started in 2022 and adapts the manga's final arc."],
      [["filler"], "Bleach has quite a lot of filler — the Bount and Zanpakuto Rebellion arcs, for example. You can skip them."],
      [["thousand", "year"], "Thousand-Year Blood War continues right after the Lost Agent arc (episode 366)."],
      [["ichigo", "mother"], "Ichigo's mother, Masaki, was a Quincy.", true],
    ],
    quiz: [
      ["What is Ichigo's zanpakuto called?", "Zangetsu"],
      ["How many divisions does the Gotei 13 have?", "13", "thirteen"],
      ["Who is the captain of the 6th division?", "Byakuya", "Byakuya Kuchiki"],
      ["What are Hollow hunters like Uryu called?", "Quincy"],
    ],
  },
  "anime-3": {
    greet: ["{name}, hi! Collected all 7 Dragon Balls? 🐉 Dragon Ball questions — to me, quiz — !quiz", "Ka-me-ha-me-HA! Hi, {name} 👊"],
    topics: ["Which of Goku's transformations looks best?", "Vegeta or Goku — who is closer to you?", "Best Dragon Ball villain — Frieza, Cell or Buu?"],
    addressed: ["My power level is over nine thousand! Ask away 😄"],
    faq: [
      [["order", "watch"], "Order: Dragon Ball → Dragon Ball Z → Dragon Ball Super. GT is not canon. Kai is a shorter cut of Z without filler."],
      [["kai"], "Dragon Ball Kai is a re-edit of Z: less filler, faster pace, new voice track."],
      [["how many", "dragon ball"], "There are seven Dragon Balls. Whoever gathers them summons Shenron and makes a wish."],
      [["who", "killed", "frieza"], "Goku beats Frieza on Namek as a Super Saiyan; Future Trunks finishes him off later on Earth.", true],
    ],
    quiz: [
      ["What is the wish-granting dragon called?", "Shenron", "Shenlong"],
      ["What is Goku's Saiyan name?", "Kakarot"],
      ["What is the Potara fusion of Goku and Vegeta called?", "Vegito"],
      ["Who taught young Goku the Kamehameha?", "Master Roshi", "Roshi"],
    ],
  },
  "anime-4": {
    greet: ["Dedicate your heart, {name}! 🫡 Attack on Titan questions — to me. I hide spoilers.", "{name}, hi! Are you with Eren or Armin?"],
    topics: ["What do you think of Attack on Titan's ending?", "The most shocking twist of the series?", "Is Levi humanity's strongest soldier or overrated?"],
    addressed: ["On duty at Wall Maria. What do you need?"],
    faq: [
      [["how many", "season"], "Four seasons; the last is split into parts and The Final Chapters (2023). About 90 episodes in all."],
      [["order", "watch"], "Watch seasons 1 → 2 → 3 → 4 (including The Final Chapters). OVAs are optional."],
      [["who", "colossal"], "The Colossal Titan is Bertholdt Hoover; its power later passes to Armin.", true],
      [["who", "armored"], "The Armored Titan is Reiner Braun.", true],
    ],
    quiz: [
      ["What is the outer wall that falls first called?", "Maria", "Wall Maria"],
      ["Who is the Survey Corps captain, humanity's strongest?", "Levi", "Levi Ackerman"],
      ["What do titans eat?", "People", "Humans"],
      ["What is the gear for flying between buildings called?", "ODM gear", "ODM", "3D maneuver gear"],
    ],
  },
  "anime-5": {
    greet: ["{name}, welcome to the Corps! 🗡️ Ask about Demon Slayer or press !quiz", "Hi, {name}! Which breathing style would you choose?"],
    topics: ["Who is your favourite Hashira?", "Best arc: Entertainment District or Swordsmith Village?", "Whose fight animation is the most beautiful?"],
    addressed: ["Bot breathing, first form — answering questions! Listening 🙂"],
    faq: [
      [["order", "watch"], "Order: season 1 → Mugen Train film (or its series version) → Entertainment District → Swordsmith Village → Hashira Training → Infinity Castle."],
      [["how many", "season"], "Four seasons are out, plus the Mugen Train film and the Infinity Castle trilogy, the final arc."],
      [["who", "nezuko"], "Nezuko is Tanjiro's sister, turned into a demon. She does not eat people and fights on her brother's side."],
      [["who", "dies", "train"], "Flame Hashira Kyojuro Rengoku dies in Mugen Train.", true],
    ],
    quiz: [
      ["What is the main character of Demon Slayer called?", "Tanjiro", "Tanjiro Kamado"],
      ["What does Nezuko wear in her mouth?", "Bamboo", "A bamboo muzzle"],
      ["Who is the progenitor of all demons?", "Muzan", "Muzan Kibutsuji"],
      ["Which breathing does Zenitsu use?", "Thunder", "Thunder Breathing"],
    ],
  },
  "anime-6": {
    greet: ["{name}, hi! Domain Expansion: fan room ✋ Ask about JJK, play — !quiz", "Yo, {name}! Gojo or Sukuna — who is stronger?"],
    topics: ["Best Domain Expansion in Jujutsu Kaisen?", "Is the Shibuya arc the peak of the series?", "Whose technique do you like best?"],
    addressed: ["Here! No cursed energy, but plenty of answers 😄"],
    faq: [
      [["order", "watch"], "Season 1 → the film Jujutsu Kaisen 0 (a prequel about Yuta) → season 2 (Gojo's Past and the Shibuya Incident)."],
      [["how many", "season"], "The anime has 2 seasons and the film Jujutsu Kaisen 0. Gege Akutami's manga ended in 2024."],
      [["who", "sukuna"], "Ryomen Sukuna is the King of Curses; Yuji Itadori swallowed his finger and became his vessel."],
      [["gojo", "shibuya"], "In Shibuya, Gojo gets sealed in the Prison Realm.", true],
    ],
    quiz: [
      ["What is the main character of Jujutsu Kaisen called?", "Yuji", "Itadori", "Yuji Itadori"],
      ["What covers Satoru Gojo's eyes?", "A blindfold", "Blindfold", "Sunglasses"],
      ["What is Gojo's technique called?", "Limitless", "Infinity"],
      ["Whose fingers are the heroes collecting?", "Sukuna's", "Sukuna"],
    ],
  },
  "anime-7": {
    greet: ["PLUS ULTRA, {name}! 💥 Ask about My Hero Academia or press !quiz", "{name}, hi! Which quirk would you get?"],
    topics: ["Which quirk in MHA is the strongest?", "Is Bakugo the best character of the series?", "Heroes or the League of Villains?"],
    addressed: ["It's fine now. Why? Because I am here! 💪"],
    faq: [
      [["how many", "season"], "My Hero Academia has 8 seasons (the final one aired in 2025) and several films."],
      [["what", "quirk"], "A quirk is a special ability that about 80% of people in the MHA world have."],
      [["who", "all for one"], "All For One is the main villain, Shigaraki's teacher and All Might's enemy."],
      [["who", "traitor"], "The UA traitor is Yuga Aoyama.", true],
    ],
    quiz: [
      ["What is Midoriya's quirk called?", "One For All"],
      ["Who is the Symbol of Peace, hero number one?", "All Might"],
      ["What does Midoriya call Bakugo?", "Kacchan"],
      ["What is the hero school called?", "UA", "U.A."],
    ],
  },
  "anime-8": {
    greet: ["{name}, hi. Don't write names in notebooks 🍎 Ask about Death Note or !quiz", "Welcome, {name}. Are you on Kira's side or L's?"],
    topics: ["Who is right: Light or L?", "Is the second half of Death Note weaker than the first?", "Which notebook rule is the cleverest?"],
    addressed: ["Ryuk approves of the question. Ask 🍎"],
    faq: [
      [["how many", "episode"], "The Death Note anime has 37 episodes (2006–2007)."],
      [["rule"], "The main rule: a person whose name is written in the notebook dies if the writer pictures their face. The cause and circumstances can be written within 40 seconds."],
      [["how", "l", "die"], "L dies through Rem's notebook; Rem sacrifices herself to protect Misa.", true],
      [["how", "end"], "At the end Light is exposed in the warehouse and Ryuk writes his name in his own notebook.", true],
    ],
    quiz: [
      ["What is the name of the shinigami who dropped the notebook?", "Ryuk"],
      ["Which fruit does Ryuk love?", "Apples", "Apple"],
      ["What nickname is Light Yagami known by?", "Kira"],
      ["Who is the Kira fan that becomes the second Kira?", "Misa", "Misa Amane"],
    ],
  },
  "anime-9": {
    greet: ["{name}, hi! Equivalent exchange: you ask, I answer ⚗️ Or !quiz", "Welcome to Amestris, {name}!"],
    topics: ["Brotherhood or the 2003 anime — which is better?", "The scariest homunculus?", "The strongest moment of Brotherhood?"],
    addressed: ["The alchemist is here. What shall we exchange? 😄"],
    faq: [
      [["2003", "brotherhood"], "The 2003 anime left the manga for its own story. Brotherhood (2009, 64 episodes) follows Hiromu Arakawa's manga fully."],
      [["where", "start"], "If you pick one, start with Brotherhood: it tells the whole story of the manga."],
      [["who", "father"], "Father is the main antagonist, creator of the homunculi, born from Van Hohenheim's blood.", true],
    ],
    quiz: [
      ["Alchemy in FMA follows the law of…?", "Equivalent exchange"],
      ["What is Edward's younger brother called?", "Alphonse", "Al"],
      ["What colour is Edward's coat?", "Red"],
      ["Who is the Flame Alchemist?", "Roy Mustang", "Mustang"],
    ],
  },
  "anime-10": {
    greet: ["{name}, hi! What's your Nen type? ✨ Questions here, !quiz for a quiz"],
    topics: ["Is the Chimera Ant arc the best arc in anime?", "Which Nen type are you?"],
    addressed: ["Here, checking my aura 😄"],
    faq: [
      [["2011", "1999"], "The 2011 anime (148 episodes) adapts more of the manga and stays closer to it. The 1999 version is darker but shorter."],
      [["when", "continue"], "Yoshihiro Togashi's manga comes out with long breaks; the 2011 anime ends with the Election arc."],
      [["gon", "father"], "Gon's father is Ging Freecss, a legendary hunter."],
    ],
    quiz: [
      ["What is the name of Gon's best friend from a family of assassins?", "Killua", "Killua Zoldyck"],
      ["How many main Nen types are there?", "6", "six"],
      ["What is the arc with the ant king Meruem called?", "Chimera Ant", "Chimera Ants"],
    ],
  },
  "anime-12": {
    greet: ["Waku waku, {name}! 🥜 Ask about Spy × Family or !quiz", "{name}, hi! Anya approves 🥜"],
    topics: ["Who is the best member of the Forger family?", "The funniest Spy × Family episode?"],
    addressed: ["Anya can hear your thoughts… kidding, I'm a bot 😄 Ask!"],
    faq: [
      [["how many", "season"], "Three anime seasons are out, plus the film Spy × Family Code: White."],
      [["who", "anya"], "Anya is a telepath adopted by Loid. She reads minds and knows both 'parents'' secrets."],
    ],
    quiz: [
      ["What is the Forger family's dog called?", "Bond"],
      ["What is Loid's code name?", "Twilight"],
      ["What is Anya's favourite snack?", "Peanuts", "Peanut"],
      ["What is Yor's assassin name?", "Thorn Princess"],
    ],
  },
  "anime-13": {
    greet: ["Vroom-vroom, {name}! 🪚 Chainsaw Man questions — to me", "{name}, hi! Have you seen the Reze Arc yet?"],
    topics: ["Is Makima the best antagonist of recent years?", "Chainsaw Man anime or manga — which is stronger?"],
    addressed: ["Woof! I mean — I'm here 🪚"],
    faq: [
      [["order", "watch"], "Season 1 (12 episodes) → the film Chainsaw Man – The Movie: Reze Arc (2025). Then Tatsuki Fujimoto's manga."],
      [["who", "makima"], "Makima is the Control Devil.", true],
    ],
    quiz: [
      ["What is the dog devil that became Denji's heart called?", "Pochita"],
      ["What is the horned Blood Fiend, Denji's partner, called?", "Power"],
      ["What does Denji pull to turn into Chainsaw Man?", "The cord", "A cord", "Starter cord"],
    ],
  },
  "anime-14": {
    greet: ["{name}, hi. Have a seat, it's quiet here ✨ Frieren questions — to me"],
    topics: ["Which Frieren episode moved you most?", "Is Himmel the best hero in fantasy?"],
    addressed: ["Elves don't hurry, but I'll answer quickly 🙂"],
    faq: [
      [["how many", "season"], "Frieren season 1 has 28 episodes (2023–2024); season 2 was announced for 2026."],
      [["who", "himmel"], "Himmel is the hero with whom Frieren defeated the Demon King; after his death she sets out to understand people."],
    ],
    quiz: [
      ["What is Frieren's apprentice called?", "Fern"],
      ["Which hero did Frieren defeat the Demon King with?", "Himmel"],
      ["What kind of spells does Frieren love to collect?", "Useless ones", "Useless", "Odd ones"],
    ],
  },
  "anime-17": {
    greet: ["{name}, synchronisation established 🤖 Evangelion questions — to me"],
    topics: ["End of Evangelion or the Rebuild finale — which ending speaks to you?", "What is the main meaning of Evangelion for you?"],
    addressed: ["NERV terminal online."],
    faq: [
      [["order", "watch"], "The series (26 episodes) → The End of Evangelion → the Rebuild tetralogy (1.11, 2.22, 3.33, 3.0+1.0)."],
      [["what", "rebuild"], "Rebuild is four films by Hideaki Anno that retell the story and give it a new ending."],
    ],
    quiz: [
      ["Who pilots Eva-01?", "Shinji", "Shinji Ikari"],
      ["What is the organisation running the Evas called?", "NERV"],
      ["What are the enemies attacking Tokyo-3 called?", "Angels"],
    ],
  },
  "anime-19": {
    greet: ["{name}, a wild fan appeared! ⚡ Ask about Pokémon or !quiz", "Hi, {name}! Who's your starter?"],
    topics: ["Best starter Pokémon of all generations?", "Which Pokémon generation is your favourite?"],
    addressed: ["Pokédex on! What are we looking for?"],
    faq: [
      [["how many", "pokemon"], "There are over 1,000 Pokémon species now, and every generation of games adds more."],
      [["where", "start"], "Anime: the classic series with Ash and Pikachu; games: any main title, such as Scarlet/Violet or remakes of older generations."],
    ],
    quiz: [
      ["Which Pokémon is always with Ash?", "Pikachu"],
      ["What does Charmander evolve into?", "Charmeleon"],
      ["What is the professor from Pallet Town called?", "Oak", "Professor Oak"],
      ["What is Pikachu's National Pokédex number?", "25"],
    ],
  },
  "anime-21": {
    greet: ["{name}, are you a Stand user too?! ⭐ JoJo questions — here"],
    topics: ["Which JoJo part is the best?", "Favourite Stand?"],
    addressed: ["Ora ora! I'm here 😄"],
    faq: [
      [["order", "watch"], "Parts in order: 1 Phantom Blood, 2 Battle Tendency, 3 Stardust Crusaders, 4 Diamond is Unbreakable, 5 Golden Wind, 6 Stone Ocean."],
    ],
    quiz: [
      ["What is Jotaro's Stand called?", "Star Platinum"],
      ["Which vampire is the main enemy of the early parts?", "Dio", "Dio Brando"],
      ["Who is the main character of part 4?", "Josuke", "Josuke Higashikata"],
    ],
  },
  "anime-24": {
    greet: ["{name}, hi! Waiting for the Catbus 🐱🚌 Ghibli questions — to me, !quiz — a quiz", "Welcome, {name}! Which Ghibli film is your favourite?"],
    topics: ["Which Ghibli film would you recommend first?", "The coziest food in Ghibli films?", "Joe Hisaishi's best score?"],
    addressed: ["Here, under an umbrella at the bus stop ☔"],
    faq: [
      [["where", "start"], "Good first films: Spirited Away, My Neighbor Totoro or Howl's Moving Castle."],
      [["oscar"], "Spirited Away won the Oscar for Best Animated Feature in 2003, The Boy and the Heron in 2024."],
      [["who", "founded"], "Studio Ghibli was founded by Hayao Miyazaki, Isao Takahata and Toshio Suzuki in 1985."],
    ],
    quiz: [
      ["What is the girl in Spirited Away called?", "Chihiro", "Sen"],
      ["Which animal is a bus in My Neighbor Totoro?", "A cat", "Cat", "Catbus"],
      ["Who composed most of Miyazaki's films?", "Joe Hisaishi", "Hisaishi"],
      ["What is the fire demon in Howl's Moving Castle called?", "Calcifer"],
    ],
  },
};
export default en;
