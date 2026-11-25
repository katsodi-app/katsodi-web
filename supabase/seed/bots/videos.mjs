// Starting videos of the fandom rooms (scripts/pick-room-videos.ts, then
// scripts/fix-room-videos.ts after review: official channels only).
const videos = {
  "anime-1": {
    "en": {
      "url": "https://www.youtube.com/watch?v=qegp2LHzGfU",
      "title": "All Naruto Shippuden Openings",
      "author": "Crunchyroll"
    },
    "ru": {
      "url": "https://www.youtube.com/watch?v=qegp2LHzGfU",
      "title": "All Naruto Shippuden Openings",
      "author": "Crunchyroll"
    }
  },
  "anime-0": {
    "en": {
      "url": "https://www.youtube.com/watch?v=YoeP9w5UIlg",
      "title": "Opening Theme | We Are! | Hiroshi Kitadani",
      "author": "ONE PIECE Official - ENG"
    },
    "ru": {
      "url": "https://www.youtube.com/watch?v=YFbno_aPm0w",
      "title": "＜オープニング映像フル＞TVアニメ「ONE PIECE」／オープニングテーマ「あーーっす！」歌：きただにひろし",
      "author": "ONE PIECE公式YouTubeチャンネル"
    }
  },
  "anime-4": {
    "en": {
      "url": "https://www.youtube.com/watch?v=8OkpRK2_gVs",
      "title": "Attack on Titan Opening 1 | Feuerroter Pfeil und Bogen",
      "author": "Crunchyroll"
    },
    "ru": {
      "url": "https://www.youtube.com/watch?v=8OkpRK2_gVs",
      "title": "Attack on Titan Opening 1 | Feuerroter Pfeil und Bogen",
      "author": "Crunchyroll"
    }
  },
  "anime-5": {
    "en": {
      "url": "https://www.youtube.com/watch?v=x7uLutVRBfI",
      "title": "Demon Slayer: Kimetsu no Yaiba Infinity Castle | MAIN TRAILER",
      "author": "Sony Pictures Entertainment"
    },
    "ru": {
      "url": "https://www.youtube.com/watch?v=x7uLutVRBfI",
      "title": "Demon Slayer: Kimetsu no Yaiba Infinity Castle | MAIN TRAILER",
      "author": "Sony Pictures Entertainment"
    }
  },
  "anime-6": {
    "en": {
      "url": "https://www.youtube.com/watch?v=GwaRztMaoY0",
      "title": "JUJUTSU KAISEN Opening | Kaikai Kitan by Eve",
      "author": "Crunchyroll"
    },
    "ru": {
      "url": "https://www.youtube.com/watch?v=5yb2N3pnztU",
      "title": "TVアニメ『呪術廻戦』第2期「渋谷事変」ノンクレジットOPムービー／OPテーマ：King Gnu「SPECIALZ」｜毎週木曜夜11時56分～MBS/TBS系列全国28局にて放送中!!",
      "author": "TOHO animation チャンネル"
    }
  },
  "cinema-5": {
    "en": {
      "url": "https://www.youtube.com/watch?v=SJVmeJaS44s",
      "title": "Harry Potter and the Philosopher's Stone | Official Teaser Trailer | HBO Max",
      "author": "Harry Potter и ещё 2"
    },
    "ru": {
      "url": "https://www.youtube.com/watch?v=SJVmeJaS44s",
      "title": "Harry Potter and the Philosopher's Stone | Official Teaser Trailer | HBO Max",
      "author": "Harry Potter и ещё 2"
    }
  },
  "cinema-7": {
    "en": {
      "url": "https://www.youtube.com/watch?v=TcMBFSGVi1c",
      "title": "Marvel Studios' Avengers: Endgame - Official Trailer",
      "author": "Marvel Entertainment"
    },
    "ru": {
      "url": "https://www.youtube.com/watch?v=TcMBFSGVi1c",
      "title": "Marvel Studios' Avengers: Endgame - Official Trailer",
      "author": "Marvel Entertainment"
    }
  },
  "cinema-0": {
    "en": {
      "url": "https://www.youtube.com/watch?v=sGbxmsDFVnE",
      "title": "Star Wars: The Force Awakens Trailer (Official)",
      "author": "Star Wars"
    },
    "ru": {
      "url": "https://www.youtube.com/watch?v=sGbxmsDFVnE",
      "title": "Star Wars: The Force Awakens Trailer (Official)",
      "author": "Star Wars"
    }
  },
  "games-0": {
    "en": {
      "url": "https://www.youtube.com/watch?v=MmB9b5njVbA",
      "title": "Official Minecraft Trailer",
      "author": "Minecraft"
    },
    "ru": {
      "url": "https://www.youtube.com/watch?v=MmB9b5njVbA",
      "title": "Official Minecraft Trailer",
      "author": "Minecraft"
    }
  },
  "games-11": {
    "en": {
      "url": "https://www.youtube.com/watch?v=HLUY1nICQRY",
      "title": "Genshin Impact - Official Launch Trailer",
      "author": "IGN"
    },
    "ru": {
      "url": "https://www.youtube.com/watch?v=TAlKhARUcoY",
      "title": "Тизер «Genshin Impact - Тейват» | Genshin Impact",
      "author": "Genshin Impact"
    }
  },
  "cinema-16": {
    "en": {
      "url": "https://www.youtube.com/watch?v=KPLWWIOCOOQ",
      "title": "Game of Thrones | Official Series Trailer (HBO)",
      "author": "GameofThrones"
    },
    "ru": {
      "url": "https://www.youtube.com/watch?v=KPLWWIOCOOQ",
      "title": "Game of Thrones | Official Series Trailer (HBO)",
      "author": "GameofThrones"
    }
  },
  "sport-6": {
    "en": {
      "url": "https://www.youtube.com/watch?v=izNyEr9Yedo",
      "title": "CRAZIEST Champions League Matches In Football History",
      "author": "UEFA"
    },
    "ru": {
      "url": "https://www.youtube.com/watch?v=izNyEr9Yedo",
      "title": "CRAZIEST Champions League Matches In Football History",
      "author": "UEFA"
    }
  },
  "music-0": {
    "en": {
      "url": "https://www.youtube.com/watch?v=gdZLi9oWNZg",
      "title": "BTS (방탄소년단) 'Dynamite' Official MV",
      "author": "HYBE LABELS"
    },
    "ru": {
      "url": "https://www.youtube.com/watch?v=WMweEpGlu_U",
      "title": "BTS (방탄소년단) 'Butter' Official MV",
      "author": "HYBE LABELS"
    }
  },
  "anime-8": {
    "en": {
      "url": "https://www.youtube.com/watch?v=NlJZ-YgAt-c",
      "title": "Death Note | OFFICIAL TRAILER",
      "author": "Crunchyroll"
    },
    "ru": {
      "url": "https://www.youtube.com/watch?v=NlJZ-YgAt-c",
      "title": "Death Note | OFFICIAL TRAILER",
      "author": "Crunchyroll"
    }
  },
  "cinema-3": {
    "en": {
      "url": "https://www.youtube.com/watch?v=PssKpzB0Ah0",
      "title": "Stranger Things 5 | Official Trailer | Netflix",
      "author": "Netflix и Stranger Things"
    },
    "ru": {
      "url": "https://www.youtube.com/watch?v=PssKpzB0Ah0",
      "title": "Stranger Things 5 | Official Trailer | Netflix",
      "author": "Netflix и Stranger Things"
    }
  },
  "cinema-12": {
    "en": {
      "url": "https://www.youtube.com/watch?v=53MyR_Z3i1w",
      "title": "The Witcher 3: Wild Hunt - The Sword of Destiny E3 2014 Trailer",
      "author": "GameSpot"
    },
    "ru": {
      "url": "https://www.youtube.com/watch?v=53MyR_Z3i1w",
      "title": "The Witcher 3: Wild Hunt - The Sword of Destiny E3 2014 Trailer",
      "author": "GameSpot"
    }
  },
  "cinema-4": {
    "en": {
      "url": "https://www.youtube.com/watch?v=V75dMMIW2B4",
      "title": "The Lord of the Rings: The Fellowship of the Ring Official Trailer #1 - (2001) HD",
      "author": "Movieclips"
    },
    "ru": {
      "url": "https://www.youtube.com/watch?v=V75dMMIW2B4",
      "title": "The Lord of the Rings: The Fellowship of the Ring Official Trailer #1 - (2001) HD",
      "author": "Movieclips"
    }
  },
  "anime-3": {
    "en": {
      "url": "https://www.youtube.com/watch?v=ezbYAglQoxI",
      "title": "“Dragon Ball DAIMA” The main Trailer / October 2024",
      "author": "東映アニメーション公式YouTubeチャンネル"
    },
    "ru": {
      "url": "https://www.youtube.com/watch?v=ezbYAglQoxI",
      "title": "“Dragon Ball DAIMA” The main Trailer / October 2024",
      "author": "東映アニメーション公式YouTubeチャンネル"
    }
  },
  "cinema-17": {
    "en": {
      "url": "https://www.youtube.com/watch?v=XZ8daibM3AE",
      "title": "BREAKING BAD - Seasons 1-5 Trailer",
      "author": "Sony Pics at Home UK"
    },
    "ru": {
      "url": "https://www.youtube.com/watch?v=XZ8daibM3AE",
      "title": "BREAKING BAD - Seasons 1-5 Trailer",
      "author": "Sony Pics at Home UK"
    }
  },
  "music-6": {
    "en": {
      "url": "https://www.youtube.com/watch?v=b1kbLwvqugk",
      "title": "Taylor Swift - Anti-Hero (Official Music Video)",
      "author": "Taylor Swift"
    },
    "ru": {
      "url": "https://www.youtube.com/watch?v=nfWlot6h_JM",
      "title": "Taylor Swift - Shake It Off",
      "author": "Taylor Swift"
    }
  },
  "anime-13": {
    "en": {
      "url": "https://www.youtube.com/watch?v=tAzAhDNdehs",
      "title": "CHAINSAW MAN – THE MOVIE: REZE ARC - Official Trailer (HD)",
      "author": "Sony Pictures Entertainment"
    },
    "ru": {
      "url": "https://www.youtube.com/watch?v=dFlDRhvM4L0",
      "title": "『チェンソーマン』ノンクレジットオープニング / CHAINSAW MAN Opening│米津玄師 「KICK BACK」",
      "author": "MAPPA CHANNEL"
    }
  },
  "anime-7": {
    "en": {
      "url": "https://www.youtube.com/watch?v=-77UEct0cZM",
      "title": "My Hero Academia - Official Opening",
      "author": "animelab"
    },
    "ru": {
      "url": "https://www.youtube.com/watch?v=-77UEct0cZM",
      "title": "My Hero Academia - Official Opening",
      "author": "animelab"
    }
  },
  "sport-0": {
    "en": {
      "url": "https://www.youtube.com/watch?v=Vyk_6bNm7lo",
      "title": "Race Highlights | 2026 Las Vegas Grand Prix",
      "author": "FORMULA 1"
    },
    "ru": {
      "url": "https://www.youtube.com/watch?v=Vyk_6bNm7lo",
      "title": "Race Highlights | 2026 Las Vegas Grand Prix",
      "author": "FORMULA 1"
    }
  },
  "games-21": {
    "en": {
      "url": "https://www.youtube.com/watch?v=qIcTM8WXFjk",
      "title": "Cyberpunk 2077 — Official E3 2019 Cinematic Trailer",
      "author": "Cyberpunk 2077"
    },
    "ru": {
      "url": "https://www.youtube.com/watch?v=aSrFWinrkeQ",
      "title": "Cyberpunk 2077 — Официальный релизный трейлер — Ви",
      "author": "Cyberpunk 2077"
    }
  },
  "anime-2": {
    "en": {
      "url": "https://www.youtube.com/watch?v=mjeR7vUrDvM",
      "title": "Part 1 OPENING | BLEACH: Thousand Year-Blood War | VIZ",
      "author": "vizmedia"
    },
    "ru": {
      "url": "https://www.youtube.com/watch?v=5emM3JGI5JA",
      "title": "OPENING 13 | BLEACH | Ranbu no Melody by SID | VIZ",
      "author": "vizmedia"
    }
  },
  "cinema-19": {
    "en": {
      "url": "https://www.youtube.com/watch?v=2IS8Jw728co",
      "title": "Celebrating 30 Years of Friends | Max",
      "author": "HBO Max"
    }
  },
  "anime-12": {
    "en": {
      "url": "https://www.youtube.com/watch?v=U_rWZK_8vUY",
      "title": "『SPY×FAMILY』オープニング主題歌アニメ映像／“SPY × FAMILY” Opening theme song animation",
      "author": "TOHO animation チャンネル"
    }
  },
  "games-13": {
    "en": {
      "url": "https://www.youtube.com/watch?v=E3Huy2cdih0",
      "title": "ELDEN RING - Official Gameplay Reveal",
      "author": "BANDAI NAMCO Europe"
    }
  },
  "games-20": {
    "en": {
      "url": "https://www.youtube.com/watch?v=NZY5WiqeyQQ",
      "title": "Fallout Season 2 - Official Teaser Trailer | gamescom 2025",
      "author": "IGN"
    }
  },
  "cinema-15": {
    "en": {
      "url": "https://www.youtube.com/watch?v=DotnJ7tTA34",
      "title": "House of the Dragon | Official Trailer | Max",
      "author": "HBO Max"
    }
  },
  "cinema-14": {
    "en": {
      "url": "https://www.youtube.com/watch?v=uLtkt8BonwM",
      "title": "The Last of Us | Official Trailer | Max",
      "author": "HBO Max"
    }
  },
  "cinema-13": {
    "en": {
      "url": "https://www.youtube.com/watch?v=03u4xyj0TH4",
      "title": "Wednesday: Season 2 | Official Trailer | Netflix",
      "author": "Netflix"
    }
  },
  "anime-24": {
    "en": {
      "url": "https://www.youtube.com/watch?v=t5khm-VjEu4",
      "title": "THE BOY AND THE HERON | Official English Trailer",
      "author": "GKIDS Films"
    }
  },
  "anime-19": {
    "en": {
      "url": "https://www.youtube.com/watch?v=1roy4o4tqQM",
      "title": "POKÉMON Detective Pikachu - Official Trailer #1",
      "author": "Warner Bros."
    }
  },
  "music-1": {
    "en": {
      "url": "https://www.youtube.com/watch?v=2GJfWMYCWY0",
      "title": "BLACKPINK - ‘GO’ M/V",
      "author": "BLACKPINK"
    }
  },
  "music-7": {
    "en": {
      "url": "https://www.youtube.com/watch?v=S2dRcipMCpw",
      "title": "Billie Eilish - Lost Cause (Official Music Video)",
      "author": "Billie Eilish"
    }
  },
  "anime-9": {
    "en": {
      "url": "https://www.youtube.com/watch?v=S2IOrt-n2fc",
      "title": "again - YUI",
      "author": "YUI OFFICIAL YouTube CHANNEL"
    }
  },
  "games-5": {
    "en": {
      "url": "https://www.youtube.com/watch?v=uHGShqcAHlQ",
      "title": "The Legend of Zelda: Tears of the Kingdom – Official Trailer #3",
      "author": "Nintendo of America"
    }
  },
  "games-3": {
    "en": {
      "url": "https://www.youtube.com/watch?v=DyNv44QR14g",
      "title": "The Sims 4 Free Base Game Launch Trailer",
      "author": "GameSpot Trailers"
    }
  },
  "sport-7": {
    "en": {
      "url": "https://www.youtube.com/watch?v=8fxZAV3qXxk",
      "title": "NBA's Top 10 Plays of the Night | November 24, 2026",
      "author": "NBA"
    }
  },
  "music-21": {
    "en": {
      "url": "https://www.youtube.com/watch?v=YLHpvjrFpe0",
      "title": "From The Inside (Official Music Video) [4K UPGRADE] – Linkin Park",
      "author": "Linkin Park"
    }
  },
  "games-12": {
    "en": {
      "url": "https://www.youtube.com/watch?v=VJ6XyhwuaMc",
      "title": "The Deliverer Trailer - \"Trailblazer\" | Honkai: Star Rail",
      "author": "Honkai: Star Rail"
    }
  },
  "games-19": {
    "en": {
      "url": "https://www.youtube.com/watch?v=JSRtYpNRoN0",
      "title": "The Elder Scrolls V: Skyrim - Official Trailer",
      "author": "Bethesda Softworks"
    }
  },
  "music-2": {
    "en": {
      "url": "https://www.youtube.com/watch?v=BZ4UzthYTss",
      "title": "Stray Kids \"This & That\" M/V",
      "author": "JYP Entertainment и Stray Kids"
    }
  },
  "books-4": {
    "en": {
      "url": "https://www.youtube.com/watch?v=mfmrPu43DF8",
      "title": "The Hunger Games (2012 Movie) - Official Theatrical Trailer - Jennifer Lawrence & Liam Hemsworth",
      "author": "Lionsgate Movies"
    }
  }
};
export default videos;
