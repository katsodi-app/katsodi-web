import { readFileSync as read, writeFileSync as write } from "node:fs";
const notes = {
  "anime-18": [
    "Манга Наоко Такэути о школьницах-воительницах, защищающих Землю.",
    "Naoko Takeuchi’s manga about schoolgirls who become guardians of Earth.",
  ],
  "anime-22": [
    "Тёмное фэнтези Кэнтаро Миуры о наёмнике Гатсе.",
    "Kentaro Miura’s dark fantasy manga following the mercenary Guts.",
  ],
  "anime-23": [
    "Историческая манга Макото Юкимуры о Торфинне и мире викингов.",
    "Makoto Yukimura’s historical manga following Thorfinn in the Viking age.",
  ],
  "anime-24": [
    "Анимационный фильм Хаяо Миядзаки о Тихиро, попавшей в мир духов.",
    "Hayao Miyazaki’s animated film about Chihiro entering a world of spirits.",
  ],
  "games-3": [
    "Серия симуляторов жизни, в которой игрок создаёт персонажей, строит дома и управляет повседневными историями.",
    "A life simulation series about creating characters, building homes and shaping everyday stories.",
  ],
  "games-5": [
    "Приключение Nintendo в открытом мире Хайрула, где Линк противостоит Ганону.",
    "Nintendo’s open-world adventure following Link across Hyrule as he confronts Ganon.",
  ],
  "games-7": [
    "Платформер Sega 1991 года, познакомивший игроков с ежом Соником.",
    "Sega’s 1991 platform game introducing Sonic the Hedgehog.",
  ],
  "games-10": [
    "Японская ролевая игра Atlus о школьниках, ведущих двойную жизнь Призрачных похитителей.",
    "Atlus’s role-playing game about students living double lives as the Phantom Thieves.",
  ],
  "games-19": [
    "Ролевая игра Bethesda в открытом мире Скайрима, где герой становится Драконорождённым.",
    "Bethesda’s open-world role-playing game set in Skyrim, following the Dragonborn.",
  ],
  "games-24": [
    "Независимая ролевая игра Тоби Фокса о ребёнке, оказавшемся в подземном мире монстров.",
    "Toby Fox’s independent role-playing game about a child exploring an underground world of monsters.",
  ],
  "music-3": [
    "Южнокорейская женская поп-группа из девяти участниц, созданная JYP Entertainment.",
    "A nine-member South Korean girl group formed by JYP Entertainment.",
  ],
  "music-4": [
    "Южнокорейская мужская группа из тринадцати участников, созданная Pledis Entertainment.",
    "A thirteen-member South Korean boy band formed by Pledis Entertainment.",
  ],
  "music-6": [
    "Американская певица и автор песен, известная автобиографической лирикой и сменой музыкальных направлений.",
    "An American singer-songwriter known for autobiographical lyrics and musical reinvention.",
  ],
  "music-7": [
    "Американская певица и автор песен с узнаваемой сдержанной вокальной манерой.",
    "An American singer-songwriter known for her distinctive musical and vocal style.",
  ],
  "music-8": [
    "Американская певица и автор песен, работающая в альтернативной поп-музыке.",
    "An American singer-songwriter associated with alternative pop music.",
  ],
  "music-9": [
    "Американская певица, автор песен и актриса с широким вокальным диапазоном.",
    "An American singer, songwriter and actress known for her wide vocal range.",
  ],
  "music-10": [
    "Канадский певец, автор песен и актёр Эйбел Тесфайе, выступающий как The Weeknd.",
    "Canadian singer, songwriter and actor Abel Tesfaye, professionally known as The Weeknd.",
  ],
  "music-11": [
    "Британская певица и автор песен, исполняющая поп- и танцевальную музыку.",
    "A British singer-songwriter working in pop and dance music.",
  ],
  "music-12": [
    "Американская певица, автор песен и актриса, начавшая карьеру на телевидении.",
    "An American singer-songwriter and actress who began her career on television.",
  ],
  "music-13": [
    "Американская певица, автор песен и актриса.",
    "An American singer, songwriter and actress.",
  ],
  "music-14": [
    "Британский певец, автор песен и актёр, участник группы One Direction.",
    "A British singer, songwriter and actor, formerly a member of One Direction.",
  ],
  "books-0": [
    "«Цвет волшебства» Терри Пратчетта открывает цикл юмористического фэнтези о Плоском мире.",
    "Terry Pratchett’s The Colour of Magic begins the humorous Discworld fantasy series.",
  ],
  "books-1": [
    "«Око мира» Роберта Джордана — первая книга фэнтезийного цикла «Колесо Времени».",
    "Robert Jordan’s The Eye of the World begins The Wheel of Time fantasy series.",
  ],
  "books-2": [
    "Фэнтезийный роман Брэндона Сандерсона о мире, где металлы становятся источником магических сил.",
    "Brandon Sanderson’s fantasy novel set in a world where metals grant magical abilities.",
  ],
  "books-3": [
    "«Путь королей» Брэндона Сандерсона открывает эпический цикл «Архив Буресвета».",
    "Brandon Sanderson’s The Way of Kings begins The Stormlight Archive epic fantasy series.",
  ],
  "books-4": [
    "Антиутопия Сьюзен Коллинз о Китнисс Эвердин и телевизионном состязании на выживание.",
    "Suzanne Collins’s dystopian novel following Katniss Everdeen in a televised survival competition.",
  ],
  "books-5": [
    "Фэнтезийный роман Рика Риордана о Перси Джексоне и мире греческих богов.",
    "Rick Riordan’s fantasy novel following Percy Jackson in a world of Greek gods.",
  ],
  "books-6": [
    "Роман Клайва Стейплза Льюиса о детях, открывающих путь в Нарнию через платяной шкаф.",
    "C. S. Lewis’s fantasy novel about children discovering Narnia through a wardrobe.",
  ],
  "books-7": [
    "«Северное сияние» Филипа Пулмана — фэнтезийный роман о Лире и путешествии по параллельному миру.",
    "Philip Pullman’s Northern Lights follows Lyra on a journey through a parallel world.",
  ],
  "books-9": [
    "Серия комиксов Нила Геймана о Сне и других Вечных.",
    "Neil Gaiman’s comic series following Dream and the other Endless.",
  ],
  "books-10": [
    "Комикс Алана Мура и Дэйва Гиббонса о супергероях в альтернативной истории.",
    "Alan Moore and Dave Gibbons’s comic series about superheroes in an alternate history.",
  ],
  "books-11": [
    "Серия графических романов Брайана Ли О’Мэлли о музыканте Скотте Пилигриме.",
    "Bryan Lee O’Malley’s graphic novel series following musician Scott Pilgrim.",
  ],
  "books-13": [
    "Серия комиксов Джерарда Уэя и Габриэля Ба о необычной семье супергероев.",
    "Gerard Way and Gabriel Bá’s comic series about an unusual family of superheroes.",
  ],
  "books-14": [
    "Космическая сага в комиксах Брайана Вона и Фионы Стейплз.",
    "A space opera comic series by Brian K. Vaughan and Fiona Staples.",
  ],
  "books-15": [
    "Герой комиксов Майка Миньолы — исследователь паранормальных явлений с демоническим происхождением.",
    "Mike Mignola’s comic character, a paranormal investigator with demonic origins.",
  ],
  "books-18": [
    "Юмористический научно-фантастический роман Дугласа Адамса о путешествии Артура Дента по космосу.",
    "Douglas Adams’s comic science-fiction novel following Arthur Dent across the galaxy.",
  ],
  "books-20": [
    "«Пробуждение Левиафана» Джеймса Кори открывает научно-фантастический цикл «Пространство».",
    "James S. A. Corey’s Leviathan Wakes begins The Expanse science-fiction series.",
  ],
  "books-21": [
    "Детектив Артура Конан Дойла, раскрывающий преступления с помощью наблюдательности и дедукции.",
    "Arthur Conan Doyle’s fictional detective, solving crimes through observation and deduction.",
  ],
  "books-24": [
    "Американский писатель, известный романами в жанрах ужасов, фантастики и триллера.",
    "An American author known for horror, science fiction and thriller novels.",
  ],
  "sport-1": [
    "Международные шоссейно-кольцевые мотогонки, включающие класс MotoGP.",
    "International motorcycle road racing, including the MotoGP class.",
  ],
  "sport-2": [
    "Чемпионат мира по ралли под управлением Международной автомобильной федерации.",
    "The international rally championship governed by the FIA.",
  ],
  "sport-6": [
    "Командная игра, в которой две команды по одиннадцать игроков стремятся забить мяч в ворота соперника.",
    "A team sport in which two sides of eleven players aim to score in the opposing goal.",
  ],
  "sport-8": [
    "Командный вид спорта с мячом на площадке, разделённой сеткой.",
    "A team ball sport played on a court divided by a net.",
  ],
  "sport-9": [
    "Игра с ракетками и мячом для двух игроков или двух пар.",
    "A racket and ball sport played by two individuals or two pairs.",
  ],
  "sport-11": [
    "Игра с маленькими ракетками и мячом на столе, разделённом сеткой.",
    "A racket and ball sport played on a table divided by a net.",
  ],
  "sport-12": [
    "Командный вид спорта на льду, в котором игроки используют клюшки и шайбу.",
    "A team sport played on ice with sticks and a puck.",
  ],
  "sport-13": [
    "Командная игра с клюшками и мячом на поле.",
    "A team sport played on a field using curved sticks and a ball.",
  ],
  "sport-14": [
    "Контактный командный вид спорта с овальным мячом, возникший в Англии.",
    "A contact team sport with an oval ball, originating in England.",
  ],
};
const path = "src/data/fandom-information.json",
  data = JSON.parse(read(path, "utf8"));
for (const [id, [ru, en]] of Object.entries(notes)) {
  data[id].description = { ru, en };
}
data["anime-23"].sources.en =
  "https://en.wikipedia.org/wiki/Vinland_Saga_(manga)";
write(path, JSON.stringify(data, null, 2) + "\n");
