// English content for the film and series rooms (see ./index.mjs).
const en = {
  "cinema-0": {
    greet: ["May the Force be with you, {name}! ✨ Star Wars questions — to me, !quiz — a quiz", "{name}, hi! Light side or dark side?"],
    topics: ["Which Star Wars trilogy is the best?", "Best Star Wars series: The Mandalorian, Andor or The Clone Wars?", "Which lightsaber colour would you pick?"],
    addressed: ["Help me, Obi-Wan… oh, it's me you called 😄 Listening!"],
    faq: [
      [["order", "watch"], "By release: IV, V, VI → I, II, III → VII, VIII, IX. Chronologically: I–III, Rogue One, IV–VI, VII–IX. Andor comes before Rogue One."],
      [["andor"], "Andor is two seasons about Cassian Andor's road to the rebellion, a prequel to Rogue One."],
      [["luke", "father"], "Luke's father is Anakin Skywalker, who became Darth Vader.", true],
      [["who", "palpatine"], "Senator Palpatine is Darth Sidious, the Sith who seized power in the Republic.", true],
    ],
    quiz: [
      ["Which Wookiee co-pilots the Millennium Falcon?", "Chewbacca", "Chewie"],
      ["Which planet is Luke Skywalker's home?", "Tatooine"],
      ["What is the green Jedi Master called?", "Yoda"],
      ["What do the rebels blow up in Episode IV?", "The Death Star", "Death Star"],
    ],
  },
  "cinema-5": {
    greet: ["{name}, welcome to Hogwarts! 🦉 Which house are you? Questions — to me, quiz — !quiz", "Hi, {name}! Has the Hat sorted you yet?"],
    topics: ["Which house are you in and why?", "Is Prisoner of Azkaban the best book?", "Which Harry Potter film do you rewatch most?"],
    addressed: ["Hoot! The owl has brought an answer 🦉"],
    faq: [
      [["how many", "book"], "There are seven main books and eight films (the last book is split into two)."],
      [["order", "film"], "Philosopher's Stone → Chamber of Secrets → Prisoner of Azkaban → Goblet of Fire → Order of the Phoenix → Half-Blood Prince → Deathly Hallows Part 1 and Part 2."],
      [["who", "half blood"], "The Half-Blood Prince is Severus Snape.", true],
      [["who", "killed", "dumbledore"], "Snape killed Dumbledore — as Dumbledore himself had arranged.", true],
    ],
    quiz: [
      ["What is Harry's owl called?", "Hedwig"],
      ["Which house is Harry in?", "Gryffindor"],
      ["Which platform does the Hogwarts Express leave from?", "9 3/4", "nine and three quarters"],
      ["What is the game played on broomsticks?", "Quidditch"],
    ],
  },
  "cinema-7": {
    greet: ["{name}, Avengers, assemble! 🛡️ Marvel questions — to me, !quiz — a quiz", "Hi, {name}! Who is your favourite Avenger?"],
    topics: ["The best Marvel film of all time?", "Which MCU phase is the strongest?", "Which hero is underrated?"],
    addressed: ["JARVIS — I mean, the bot — at your service 🤖"],
    faq: [
      [["order", "watch"], "By release starting with Iron Man (2008) is easiest. Chronologically, Captain America: The First Avenger (set in the 1940s) comes first."],
      [["scene", "credit"], "Almost every Marvel film has post-credit scenes — wait until the very end."],
      [["who", "dies", "endgame"], "Tony Stark and Natasha Romanoff die in Avengers: Endgame.", true],
    ],
    quiz: [
      ["What is Thor's hammer called?", "Mjolnir", "Mjölnir"],
      ["Who plays Iron Man?", "Robert Downey Jr.", "Robert Downey Jr", "Downey"],
      ["How many Infinity Stones are there?", "6", "six"],
      ["Which country is Black Panther from?", "Wakanda"],
    ],
  },
  "cinema-4": {
    greet: ["{name}, welcome to Bree! 🍺 Middle-earth questions — to me", "Hi, {name}! Hobbits or elves?"],
    topics: ["Are the extended editions of The Lord of the Rings worth it?", "The best character in Middle-earth?", "Books or films — which are stronger?"],
    addressed: ["A wizard is never late — nor is a bot 🧙"],
    faq: [
      [["order", "watch"], "The Hobbit (3 films) is a prequel, but The Lord of the Rings trilogy (2001–2003) came first. Start with it."],
      [["extended"], "The extended editions add about two hours to the trilogy — fans love them."],
      [["who", "gollum"], "Gollum is the hobbit Sméagol, changed by the Ring over hundreds of years."],
    ],
    quiz: [
      ["What is Frodo's uncle called?", "Bilbo"],
      ["In which volcano is the Ring destroyed?", "Mount Doom", "Orodruin"],
      ["What is the grey wizard called?", "Gandalf"],
      ["How many rings were given to men?", "9", "nine"],
    ],
  },
  "cinema-16": {
    greet: ["{name}, winter is coming ❄️ Game of Thrones questions — to me, I hide spoilers", "Hi, {name}! Which house do you choose?"],
    topics: ["Was the Game of Thrones ending good or not?", "The best battle of the series?", "Which house of Westeros is closest to you?"],
    addressed: ["The Citadel's maester is listening."],
    faq: [
      [["how many", "season"], "8 seasons, 73 episodes (2011–2019). Prequels: House of the Dragon and A Knight of the Seven Kingdoms."],
      [["book"], "The show is based on George R. R. Martin's A Song of Ice and Fire: five books are out; the sixth, The Winds of Winter, isn't yet."],
      [["jon", "mother"], "Jon Snow's mother is Lyanna Stark, his father Rhaegar Targaryen.", true],
      [["red", "wedding"], "Robb and Catelyn Stark die at the Red Wedding.", true],
    ],
    quiz: [
      ["What is Jon Snow's direwolf called?", "Ghost"],
      ["What are the words of House Stark?", "Winter is coming"],
      ["How many dragons does Daenerys have?", "3", "three"],
      ["What is the huge wall in the north called?", "The Wall", "Wall"],
    ],
  },
  "cinema-15": {
    greet: ["{name}, greens or blacks? 🐉 House of the Dragon questions — to me"],
    topics: ["Are you with the greens or the blacks?", "Which dragon in the show is the most spectacular?"],
    addressed: ["Dracarys! I mean — I'm here 🐉"],
    faq: [
      [["how many", "season"], "Two seasons of House of the Dragon are out, the third is planned for 2026; four in total are planned."],
      [["when", "set"], "It is set about 170 years before Game of Thrones, during the Targaryen civil war — the Dance of the Dragons."],
      [["book"], "It is based on Martin's book Fire & Blood."],
    ],
    quiz: [
      ["What is Rhaenyra's dragon called?", "Syrax"],
      ["The biggest dragon in the show?", "Vhagar"],
      ["What is the Targaryen civil war called?", "The Dance of the Dragons", "Dance of the Dragons"],
    ],
  },
  "cinema-3": {
    greet: ["{name}, hi from Hawkins! 🚲 Stranger Things questions — to me", "{name}, the fairy lights are blinking… is that you typing? 💡"],
    topics: ["The best season of Stranger Things?", "Favourite character — Steve, Eddie or Eleven?"],
    addressed: ["Friends don't lie — I'm here 😄"],
    faq: [
      [["how many", "season"], "5 seasons: the final fifth came out in November–December 2025."],
      [["what", "upside down"], "The Upside Down is a dark parallel dimension, a 'reflection' of Hawkins where the Demogorgon and Vecna live."],
      [["who", "vecna"], "Vecna is Henry Creel, also known as One, the lab's first test subject.", true],
    ],
    quiz: [
      ["What is the girl with the number 11 called?", "Eleven", "El"],
      ["Which game do the kids love?", "Dungeons & Dragons", "D&D"],
      ["In which town is the show set?", "Hawkins"],
    ],
  },
  "cinema-12": {
    greet: ["{name}, hmm… hi! 🐺 Witcher questions — to me", "Hi, {name}! Books, games or the series?"],
    topics: ["The best Witcher game?", "Yennefer or Triss?", "Where to start: the books or the games?"],
    addressed: ["The medallion is humming — someone called me 🐺"],
    faq: [
      [["where", "start"], "Start the books with the story collections The Last Wish and Sword of Destiny, then the five saga novels."],
      [["game", "order"], "Games: The Witcher (2007) → The Witcher 2: Assassins of Kings → The Witcher 3: Wild Hunt with its expansions. The Witcher 4 is in development."],
      [["who", "ciri"], "Ciri is the princess of Cintra, the Child of Destiny and Geralt's adopted daughter."],
    ],
    quiz: [
      ["What is Geralt's horse called?", "Roach"],
      ["What is the bard, Geralt's friend, called?", "Dandelion", "Jaskier"],
      ["Which witcher school is Geralt from?", "School of the Wolf", "Wolf"],
      ["Who wrote the Witcher books?", "Sapkowski", "Andrzej Sapkowski"],
    ],
  },
  "cinema-17": {
    greet: ["{name}, say my name… kidding, hi 😎 Breaking Bad questions — to me", "Hi, {name}! Have you watched Better Call Saul?"],
    topics: ["Is 'Ozymandias' the best Breaking Bad episode?", "Who is stronger: Walter White or Gus Fring?"],
    addressed: ["I am the one who answers 😎"],
    faq: [
      [["how many", "season"], "Breaking Bad has 5 seasons (62 episodes). Better Call Saul has 6. The film El Camino follows Jesse."],
      [["order", "watch"], "By release: Breaking Bad → El Camino → Better Call Saul. Or Saul first — it is mostly a prequel."],
      [["who", "dies", "end"], "In the finale Walter White dies of a wound in the lab.", true],
    ],
    quiz: [
      ["Under what alias does Walter White cook?", "Heisenberg"],
      ["What is Gus Fring's restaurant chain called?", "Los Pollos Hermanos"],
      ["What is Walt's partner called?", "Jesse", "Jesse Pinkman"],
    ],
  },
  "cinema-19": {
    greet: ["How you doin', {name}? 😏 Welcome to Central Perk ☕", "{name}, hi! 'We were on a break' — yes or no?"],
    topics: ["Were Ross and Rachel 'on a break'?", "The funniest Friends episode?", "Which of the six are you closest to?"],
    addressed: ["Pivot! I mean — I'm here 😄"],
    faq: [
      [["how many", "season"], "10 seasons, 236 episodes (1994–2004). The special Friends: The Reunion came out in 2021."],
      [["ross", "rachel", "together"], "Yes — in the finale Rachel stays with Ross and doesn't fly to Paris.", true],
    ],
    quiz: [
      ["What is the friends' coffee shop called?", "Central Perk"],
      ["What is Ross's monkey called?", "Marcel"],
      ["Which friend plays Dr. Drake Ramoray?", "Joey"],
      ["Which song does Phoebe sing about a cat?", "Smelly Cat"],
    ],
  },
  "cinema-14": {
    greet: ["{name}, hi. Look for the light 🔦 The Last of Us questions — to me"],
    topics: ["The HBO series or the game — which is stronger?", "Joel's choice at the hospital — right or wrong?"],
    addressed: ["Here, no clickers nearby 🔦"],
    faq: [
      [["how many", "season"], "The HBO series: 2 seasons (2023, 2025), the third in the works. Games: The Last of Us Part I and Part II."],
      [["what", "cordyceps"], "Cordyceps is a fungus that turns people into the infected: runners, clickers and others."],
    ],
    quiz: [
      ["What is the immune girl called?", "Ellie"],
      ["What are the blind infected that hunt by sound called?", "Clickers"],
      ["What is the group searching for a cure called?", "The Fireflies", "Fireflies"],
    ],
  },
  "cinema-13": {
    greet: ["{name}. I don't care that you came. But hi 🖤 Wednesday questions — to me"],
    topics: ["Is Wednesday season 2 better than season 1?", "Who is your favourite Nevermore student?"],
    addressed: ["I'm here. Not smiling, but here 🖤"],
    faq: [
      [["how many", "season"], "Two seasons of Wednesday are out (2022, 2025); a third is confirmed."],
      [["who", "thing"], "Thing is a living hand, the Addams family's loyal helper."],
    ],
    quiz: [
      ["Which academy does Wednesday attend?", "Nevermore"],
      ["What is the living hand called?", "Thing"],
      ["Who plays Wednesday?", "Jenna Ortega", "Ortega"],
    ],
  },
  "cinema-10": {
    greet: ["{name}, you've been in Afghanistan, I perceive… no? Then just hi 🔍"],
    topics: ["The best Sherlock episode?", "Is Andrew Scott's Moriarty the best villain?"],
    addressed: ["Elementary, I'm here 🔍"],
    faq: [
      [["how many", "season"], "4 seasons of 3 episodes plus the special The Abominable Bride — 13 episodes in all (2010–2017)."],
      [["how", "survive"], "How Sherlock survived the fall, the show deliberately leaves to several versions.", true],
    ],
    quiz: [
      ["Who plays Sherlock in the BBC series?", "Benedict Cumberbatch", "Cumberbatch"],
      ["What is the doctor, Sherlock's friend, called?", "John Watson", "Watson"],
      ["Sherlock's main enemy?", "Moriarty", "Jim Moriarty"],
    ],
  },
  "cinema-11": {
    greet: ["{name}, jump in the Impala 🚗 Supernatural questions — to me"],
    topics: ["The best season of Supernatural?", "Is Cas the best character of the show?"],
    addressed: ["The family business: hunting and answers 🚗"],
    faq: [
      [["how many", "season"], "15 seasons, 327 episodes (2005–2020)."],
    ],
    quiz: [
      ["Which car does Dean drive?", "Impala", "Chevrolet Impala"],
      ["What is the angel, the brothers' friend, called?", "Castiel", "Cas"],
      ["What is the younger Winchester brother called?", "Sam"],
    ],
  },
};
export default en;
