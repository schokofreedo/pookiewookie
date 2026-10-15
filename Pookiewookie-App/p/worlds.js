/* The Starway Home: the worlds. Palettes, enemy casts, hazards, bosses, music parameters and Toffo's lines. */
(function () {
  const G = window.PW = window.PW || {};
  const tr = (de, en) => (G.tr ? G.tr(de, en) : de);
  G.WORLDS = [
    {
      key: 'wiese', name: tr('Zuckerwattewiese', 'Cotton Candy Meadow'), levels: tr(['Erste Hüpfer', 'Herzchenhügel', 'Keksklippen', 'Turm der Sauerdrops'], ['First Hops', 'Heart Hills', 'Cookie Cliffs', 'Tower of Sour Drops']),
      sky: ['#ffc9dc', '#e6d6ff', '#fff4e0'], sun: '#fff4b0', hills: ['#c9f0d0', '#b4e6c0'], far: 'cupcakes',
      ground: {top: '#8fe0a0', edge: '#6cc482', dirt: '#f2d9a6', dot: '#ff9eb0', dot2: '#8fd3ff'}, block: {a: '#d9a066', b: '#e6b57c', c: '#5a3a1a'},
      pipe: {a: '#ffb3c6', b: '#fff', c: '#e8738f', style: 'mug'}, liquid: {a: '#e0457b', b: '#ff9eb0', c: '#f06a96', name: tr('Himbeersirup', 'Raspberry syrup')}, slow: {a: '#f5c242', b: '#ffe08a', c: '#e3a92a'},
      decor: ['lolli', 'cupcake', 'bush', 'sign'], weather: 'petals',
      ents: {E: 'drop', G: 'bee', M: 'spiky', S: 'cloud', C: 'cookie', V: 'cookie', T: null, J: null, D: null},
      boss: {name: tr('Riesen-Sauerdrop', 'Giant Sour Drop'), kind: 'hopper', a: '#c7ef6b', b: '#8fb84a', hp: 3, arena: 'ground', attacks: ['spit'], tip: tr('Er spuckt saure Tropfen. Spring ihm 3× auf den Kopf!', 'He spits sour drops. Jump on his head 3 times!')},
      music: {bpm: 118, pattern: 0, transpose: 0, lead: 'bell', bass: 'sine', perc: 0},
      lines: ['Where is my Mallo?', 'I need to find my Mallo!', 'Mallo, where are you?', 'I miss my Mallo...'],
    },
    {
      key: 'insel', name: tr('Kokosinsel', 'Coconut Island'), levels: tr(['Muschelstrand', 'Palmenpfad', 'Riffsprung', 'Turm der Krabben'], ['Seashell Beach', 'Palm Path', 'Reef Leap', 'Tower of Crabs']),
      sky: ['#7fd7ff', '#bfefff', '#fff2c9'], sun: '#fff0a0', hills: ['#5ec8d8', '#3fb3c9'], far: 'sea',
      ground: {top: '#ffe9a8', edge: '#e6c97a', dirt: '#f7d58a', dot: '#fff', dot2: '#ffb37a'}, block: {a: '#c98a4a', b: '#dfa062', c: '#7a4a1a'},
      pipe: {a: '#b9793f', b: '#dfa062', c: '#8a5a2b', style: 'barrel'}, liquid: {a: '#3aa0e8', b: '#9fe0ff', c: '#5ab8f5', name: tr('Meer', 'Sea')}, slow: {a: '#f3d9a4', b: '#fff0c8', c: '#d9b870'},
      decor: ['palm', 'shell', 'board', 'sign'], weather: 'none',
      ents: {E: 'crab', G: 'gull', M: 'urchin', S: 'snapper', C: 'raft', V: 'raft', T: null, J: 'fish', D: null},
      boss: {name: tr('Krabbenkönig', 'Crab King'), kind: 'charger', a: '#ff6a4a', b: '#c43a1f', hp: 4, arena: 'cave', attacks: ['bubble'], tip: tr('Unten in der Meereshöhle! Weich seinem Ansturm aus und spring ihm auf den Panzer, wenn er gegen die Wand kracht.', 'Down in the sea cave! Dodge his charge and jump on his shell when he crashes into the wall.')},
      music: {bpm: 128, pattern: 1, transpose: 2, lead: 'marimba', bass: 'triangle', perc: 1},
      lines: ['Mallo, is that the sea?', 'Coconuts... but no Mallo.', 'Where is my Mallo?', 'Mallo, where are you?'],
    },
    {
      /* Korallenmeer: every level is played in the submarine (p/sub.js, G.modes.sub); the hub is a beach dock */
      key: 'unterwasser', name: tr('Korallenmeer', 'Coral Sea'), levels: tr(['Korallenriff', 'Das Schiffswrack', 'Der Tiefseegraben', 'Die Krakenhöhle'], ['Coral Reef', 'The Shipwreck', 'The Deep Trench', 'The Kraken\'s Lair']), modes: ['sub', 'sub', 'sub', 'sub'], bgKey: 'insel',
      sky: ['#3aa0e8', '#7fd7ff', '#d8f6ff'], sun: '#fff0a0', hills: ['#5ec8d8', '#3fb3c9'], far: 'sea',
      ground: {top: '#ffe9a8', edge: '#e6c97a', dirt: '#f7d58a', dot: '#fff', dot2: '#8fd3ff'}, block: {a: '#3fb3c9', b: '#7fe0ea', c: '#1f6a7a'},
      pipe: {a: '#b9793f', b: '#dfa062', c: '#8a5a2b', style: 'barrel'}, liquid: {a: '#2a80c8', b: '#9fe0ff', c: '#4aa0e0', name: tr('Meer', 'Sea')}, slow: {a: '#f3d9a4', b: '#fff0c8', c: '#d9b870'},
      decor: ['palm', 'shell', 'board', 'sign'], weather: 'none',
      ents: {E: 'crab', G: 'gull', M: 'urchin', S: null, C: 'raft', V: 'raft', T: null, J: 'fish', D: null},
      boss: {name: tr('Kraken Krawall', 'Kraken Kaboom'), kind: 'mode', a: '#8a4ab0', b: '#4a2a7a', hp: 20},
      music: {bpm: 96, pattern: 2, transpose: -2, lead: 'bell', bass: 'sine', perc: 0},
      lines: ['Where is my Mallo?', 'I need to find my Mallo!', 'Mallo, where are you?', "I'm coming, Mallo!"],
    },
    {
      key: 'dschungel', name: tr('Dschungel', 'Jungle'), levels: tr(['Rankenwald', 'Affenbrücke', 'Sumpfsprung', 'Turm der Affen'], ['Vine Forest', 'Monkey Bridge', 'Swamp Jump', 'Tower of Monkeys']),
      sky: ['#5fb37a', '#9ee0a8', '#e7f7c8'], sun: '#fff7c0', hills: ['#2f7a4e', '#1f5a3a'], far: 'jungle',
      ground: {top: '#5fcf6a', edge: '#3a9a46', dirt: '#8a5a2b', dot: '#6b3f1d', dot2: '#b6f0bd'}, block: {a: '#8a5a2b', b: '#a56f3a', c: '#4a2a0f'},
      pipe: {a: '#4fa65a', b: '#8fe08a', c: '#2f7a3a', style: 'bamboo'}, liquid: {a: '#4e8a2a', b: '#9ed66a', c: '#6ba53a', name: tr('Sumpf', 'Swamp')}, slow: {a: '#6b4a2a', b: '#8a6a4a', c: '#4a2a0f'},
      decor: ['tree', 'fern', 'flower', 'sign'], weather: 'leaves', vines: true, bouncy: true,
      ents: {E: 'beetle', G: 'parrot', M: 'thornball', S: 'snapper', C: 'log', V: 'log', T: 'monkey', J: null, D: null},
      boss: {name: tr('Affenkönig', 'Monkey King'), kind: 'hopper', a: '#8a5a2b', b: '#5a3a1a', hp: 4, arena: 'sky', attacks: ['coco'], tip: tr('Hoch oben in den Baumkronen. Achte auf die Schatten der Kokosnüsse!', 'High up in the treetops. Watch the shadows of the coconuts!')},
      music: {bpm: 132, pattern: 1, transpose: -3, lead: 'marimba', bass: 'triangle', perc: 2},
      lines: ['Mallo? The jungle is so big...', 'Monkeys! Have you seen my Mallo?', 'I need to find my Mallo!', 'Mallo, where are you?'],
    },
    {
      /* Schokoladenland: chocolate rivers, caramel swamps and the great chocolate waterfall (parachute level) */
      key: 'schoko', name: tr('Schokoladenland', 'Chocolate Land'), levels: tr(['Pralinenpfad', 'Karamellsümpfe', 'Der Schokowasserfall', 'Turm des Kakao-Drachen'], ['Praline Path', 'Caramel Swamps', 'The Chocolate Waterfall', 'Tower of the Cocoa Dragon']), waterfall: 2, bgKey: 'wiese',
      sky: ['#ffd6b0', '#f0b8a0', '#fff0dc'], sun: '#fff4c0', hills: ['#8a5a3a', '#6a3a22'], far: 'cupcakes',
      ground: {top: '#7a4425', edge: '#5a2e14', dirt: '#a8643a', dot: '#ffe9c8', dot2: '#ff9eb0'}, block: {a: '#5a2e14', b: '#8a5030', c: '#2e1408'},
      pipe: {a: '#fff1dc', b: '#ffffff', c: '#d9b88a', style: 'mug'}, liquid: {a: '#5a2e14', b: '#8a5030', c: '#6a3a1e', name: tr('Heiße Schokolade', 'Hot chocolate')}, slow: {a: '#e0a040', b: '#ffd27a', c: '#b07820'},
      decor: ['lolli', 'cupcake', 'bush', 'sign'], weather: 'petals',
      ents: {E: 'gummi', G: 'bonbon', M: 'nuss', S: 'cloud', C: 'cookie', V: 'cookie', T: null, J: null, D: null},
      boss: {name: tr('Kakao-Drache', 'Cocoa Dragon'), kind: 'flyer', a: '#7a4425', b: '#3a1a0c', hp: 9, arena: 'cover', attacks: ['fire'], weapon: true, tip: tr('Er speit heißen Kakao! Versteck dich hinter den Säulen und schieß mit B (Shift / X).', 'He breathes hot cocoa! Hide behind the pillars and shoot with B (Shift / X).')},
      music: {bpm: 124, pattern: 1, transpose: 3, lead: 'marimba', bass: 'triangle', perc: 1},
      lines: ['Chocolate!', 'I need to find my Mallo!', 'Mallo, where are you?', "I'm coming, Mallo!"],
    },
    {
      key: 'schnee', name: tr('Schneeland', 'Snowland'), levels: tr(['Flockenfeld', 'Eiszapfenpfad', 'Pinguinrutsche', 'Turm des Yeti'], ['Snowflake Field', 'Icicle Path', 'Penguin Slide', 'Tower of the Yeti']),
      sky: ['#9fc8ff', '#dbeaff', '#ffffff'], sun: '#fff', hills: ['#dfe9f7', '#c3d3ea'], far: 'mountains',
      ground: {top: '#ffffff', edge: '#cfe0f5', dirt: '#a9c4e6', dot: '#dfe9f7', dot2: '#8fd3ff'}, block: {a: '#9fd0f0', b: '#c7e8ff', c: '#5aa0d0'},
      pipe: {a: '#bfe2ff', b: '#ffffff', c: '#7fb8e6', style: 'ice'}, liquid: {a: '#2f6fb3', b: '#8fc8ff', c: '#4a8ad0', name: tr('Eiswasser', 'Icy water')}, slow: {a: '#eef6ff', b: '#ffffff', c: '#cfe0f5'},
      decor: ['pine', 'snowman', 'bush', 'sign'], weather: 'snow', ice: true,
      ents: {E: 'penguin', G: 'owl', M: 'iceball', S: 'frost', C: 'floe', V: 'floe', T: 'snowman', J: null, D: 'icicle'},
      boss: {name: 'Yeti', kind: 'hopper', a: '#f4f8ff', b: '#9fb8d8', hp: 5, arena: 'cave', attacks: ['quake', 'spit'], tip: tr('In der Eishöhle! Wenn er landet, fallen Eiszapfen. Spring ihm auf den Kopf!', 'In the ice cave! When he lands, icicles fall. Jump on his head!')},
      music: {bpm: 104, pattern: 2, transpose: 0, lead: 'bell', bass: 'sine', perc: 0},
      lines: ['Brrr... Mallo, are you cold?', 'Snow! Mallo, where are you?', 'I miss my Mallo...', 'Where is my Mallo?'],
    },
    {
      key: 'lava', name: tr('Lavawelt', 'Lava World'), levels: tr(['Glutpfad', 'Feuerbrücke', 'Magmasprung', 'Turm des Lavaklops'], ['Ember Path', 'Fire Bridge', 'Magma Leap', 'Tower of the Lava Lump']),
      sky: ['#2b1024', '#6b1f2a', '#ff8a3a'], sun: '#ff5a2a', hills: ['#4a1a1a', '#2a0f12'], far: 'volcano',
      ground: {top: '#6b5a5a', edge: '#4a3a3a', dirt: '#3a2a2e', dot: '#ff7a2a', dot2: '#ffb347'}, block: {a: '#5a4a4a', b: '#7a6a6a', c: '#2a1a1a'},
      pipe: {a: '#7a5a5a', b: '#a08080', c: '#4a2a2a', style: 'stone'}, liquid: {a: '#ff6a1a', b: '#ffd24a', c: '#ff9a2a', name: tr('Lava', 'Lava')}, slow: {a: '#3a3a3a', b: '#5a5a5a', c: '#1a1a1a'},
      decor: ['torch', 'rock', 'skull', 'sign'], weather: 'embers', crumble: true,
      ents: {E: 'lavablob', G: 'firebat', M: 'magmarock', S: 'geyser', C: 'lavarock', V: 'lavarock', T: 'cannon', J: 'fireball', D: null},
      boss: {name: tr('Lavaklops', 'Lava Lump'), kind: 'charger', a: '#ff7a2a', b: '#8a2a0a', hp: 10, arena: 'cover', attacks: ['fire', 'rain'], weapon: true, tip: tr('Feuerbälle und Lavaregen! Schieß mit B (Shift / X) und nutz die Steinsäulen als Deckung.', 'Fireballs and lava rain! Shoot with B (Shift / X) and take cover behind the stone pillars.')},
      music: {bpm: 140, pattern: 3, transpose: 0, lead: 'synth', bass: 'square', perc: 2},
      lines: ['Too hot! Mallo, hold on!', 'Lava! I need to find my Mallo!', 'Mallo, where are you?', 'Where is my Mallo?'],
    },
    {
      key: 'himmel', name: tr('Wolkenschloss', 'Cloud Castle'), levels: tr(['Wolkenweg', 'Sturmbrücke', 'Blitzsprung', 'Turm des Wolkenkönigs'], ['Cloud Walk', 'Storm Bridge', 'Lightning Leap', 'Tower of the Cloud King']),
      sky: ['#3b2a6a', '#8a6ad0', '#ffd6e8'], sun: '#fff', hills: ['#c9b8f0', '#a893e0'], far: 'clouds',
      ground: {top: '#ffffff', edge: '#d8ccf5', dirt: '#e6ddfb', dot: '#ffd6e8', dot2: '#ffe9a8'}, block: {a: '#b9a3ec', b: '#d3c3f7', c: '#6f55b8'},
      pipe: {a: '#d8ccf5', b: '#ffffff', c: '#a893e0', style: 'cloud'}, liquid: {a: '#2b1a4a', b: '#6a4ab0', c: '#3f2a6a', name: tr('Abgrund', 'Abyss')}, slow: {a: '#ffe9a8', b: '#fff6d0', c: '#e6c76a'},
      decor: ['star', 'balloon', 'bush', 'sign'], weather: 'stars', wind: true, vertical: true,
      ents: {E: 'cloudling', G: 'bat', M: 'thunderball', S: 'storm', C: 'cloud', V: 'cloud', T: null, J: null, D: 'thwomp'},
      boss: {name: tr('Wolkenkönig', 'Cloud King'), kind: 'flyer', a: '#8a8ab0', b: '#4a4a7a', hp: 10, arena: 'sky', attacks: ['bolt'], weapon: true, tip: tr('Flieg mit dem Jetpack zu seiner Wolkeninsel! Blitze kündigen sich an. Schieß mit B (Shift / X).', 'Fly to his cloud island with the jetpack! Lightning gives a warning first. Shoot with B (Shift / X).')},
      doorLine: 'They took Mallo to space!',
      music: {bpm: 112, pattern: 2, transpose: 4, lead: 'flute', bass: 'sine', perc: 1},
      lines: ['Mallo! I can see your tower!', "I'm coming, Mallo!", 'Where is my Mallo?', 'Mallo, hold on!'],
    },
    {
      key: 'weltraum', name: tr('Weltraum', 'Outer Space'), levels: tr(['Raketenflug', 'Mond', 'Mars', 'Saturn-Gefängnis'], ['Rocket Flight', 'Moon', 'Mars', 'Saturn Prison']), rocket: true,
      sky: ['#05030f', '#0b0a2a', '#1a1038'], sun: '#ffffff', hills: ['#2a2a4a', '#1a1a33'], far: 'space',
      ground: {top: '#c9c9d9', edge: '#8e8ea8', dirt: '#6e6e86', dot: '#55556e', dot2: '#ffffff'}, block: {a: '#6e6e86', b: '#9a9ab4', c: '#3a3a4e'},
      pipe: {a: '#8e8ea8', b: '#d0d0e0', c: '#5a5a72', style: 'metal'}, liquid: {a: '#3b1e6b', b: '#8a5cff', c: '#5a36b0', name: 'Plasma'}, slow: {a: '#9a9ab0', b: '#c0c0d0', c: '#6a6a80'},
      decor: ['flag', 'crater', 'rover', 'sign'], weather: 'stars',
      ents: {E: 'alien', G: 'ufo', M: 'meteor', S: 'plasma', C: 'hover', V: 'hover', T: 'robot', J: null, D: 'laserfall'},
      boss: {name: tr("Käpt'n Bitterbart", 'Captain Bitterbeard'), kind: 'flyer', a: '#6a4ab0', b: '#2a1a50', hp: 12, final: true, arena: 'cover', attacks: ['laser', 'spit'], weapon: true, tip: tr('Sein Laser zeigt erst eine rote Linie. Duck dich hinter die Kisten und schieß mit B (Shift / X)!', 'His laser shows a red line first. Duck behind the crates and shoot with B (Shift / X)!')},
      music: {bpm: 126, pattern: 1, transpose: -4, lead: 'synth', bass: 'square', perc: 2},
      lines: ['Mallo, I am in space!', 'Low gravity! I can jump so high!', 'Mallo, I can see Saturn!', 'Where is my Mallo?'],
      /* per-level skins: the hub is the station, then the planets; gravity drops on the moon */
      skins: [
        {skin: 'station', grav: 1},
        {skin: 'mond', grav: 0.55, ground: {top: '#d8d8e6', edge: '#9a9ab4', dirt: '#7a7a92', dot: '#5c5c74', dot2: '#ffffff'}, sky: ['#000008', '#05051a', '#101030']},
        {skin: 'mars', grav: 0.8, ground: {top: '#e07a3a', edge: '#a8521f', dirt: '#8a3f18', dot: '#6a2e10', dot2: '#ffb27a'}, block: {a: '#8a3f18', b: '#b8602a', c: '#4a2008'}, sky: ['#2a0f0a', '#7a2f18', '#e8a070'], hills: ['#9a4a22', '#6a2e14'], slow: {a: '#c97a4a', b: '#e8a070', c: '#8a4a22'}},
        {skin: 'saturn', grav: 0.9, ground: {top: '#b48cf0', edge: '#7a56c0', dirt: '#4e3488', dot: '#3a2666', dot2: '#ffe9a8'}, block: {a: '#5a3a9a', b: '#8a66c8', c: '#2a1850'}, sky: ['#120826', '#2a1458', '#6a3a9a'], hills: ['#3a2270', '#241448']},
      ],
    },
    {
      /* the finale: linear, no hub. Black hole flight with Mallo aboard, car chase through the city, the ranch showdown, the ending film */
      key: 'finale', name: tr('Finale', 'Finale'), levels: tr(['Schwarzes Loch', 'Großstadt', 'Ranch', 'Zuhause'], ['Black Hole', 'Big City', 'Ranch', 'Home']), linear: true, modes: ['blackhole', 'chase', 'ranch', 'cinema'], bgKey: 'wiese',
      sky: ['#ff9a3a', '#ffb87a', '#ffe0b0'], sun: '#fff2c0', hills: ['#8a5a6a', '#5a3a4a'], far: 'ranch',
      ground: {top: '#c9a05a', edge: '#9a7a3a', dirt: '#7a5a2a', dot: '#5a3a1a', dot2: '#ffe9a8'}, block: {a: '#8a5a2b', b: '#a56f3a', c: '#4a2a0f'},
      pipe: {a: '#7a5a3a', b: '#a08060', c: '#4a3a2a', style: 'barrel'}, liquid: {a: '#3aa0e8', b: '#9fe0ff', c: '#5ab8f5', name: tr('Teich', 'Pond')}, slow: {a: '#c9a05a', b: '#e0c080', c: '#9a7a3a'},
      decor: ['fence', 'hay', 'cactus', 'sign'], weather: 'none',
      ents: {E: 'mafia', G: null, M: null, S: null, C: null, V: null, T: null, J: null, D: null},
      boss: {name: 'Don Pralino', kind: 'charger', a: '#2a2a2a', b: '#111', hp: 8},
      music: {bpm: 140, pattern: 3, transpose: -2, lead: 'synth', bass: 'square', perc: 2},
      lines: ['Mallo, hold on tight!', 'We are almost home!', 'Get off my ranch!', 'Nobody touches my Mallo!'],
      skins: [{skin: 'blackhole', grav: 1}, {skin: 'city', grav: 1}, {skin: 'ranch', grav: 1}, {skin: 'home', grav: 1}],
      bosses: [
        {name: 'Don Pralino', hp: 6}, {name: tr('Big Trüffel', 'Big Truffle'), hp: 8}, {name: 'Lorenzo Nougat', hp: 10}, {name: 'Madame Marzipan', hp: 12}, {name: tr('Der Pate', 'The Chocfather'), hp: 16},
      ],
    },
  ];
  /* the finale is part of the world list (its levels are the modes from p/finale1.js and p/finale2.js) */
  G.FINALE_READY = true;
  G.FINALE_WORLD = G.WORLDS.find(w => w.key === 'finale'); G.WORLDS = G.WORLDS.filter(w => w.key !== 'finale' || G.FINALE_READY);
  /* Mallo's letters: the story part and the P.S. per world. The puzzle tips are added from the puzzle files at runtime.
     The first letters after "P.S." in the first seven worlds spell the wormhole coordinates (Z-U-H-A-U-S-E). */
  G.LETTER_STORY = G.lang === 'en' ? {
    wiese: {title: 'Letter from the Cotton Candy Meadow', text: "Dear Toffo, the Cloud King just carried me off! But don't worry, I have my lucky pen, and I'll write to you from every world we fly through. Here in the Cotton Candy Meadow he locked two gates with puzzles. I secretly listened in:", ps: 'Hugs are sweeter than cotton candy, so save a big one for me!'},
    insel: {title: 'Letter from Coconut Island', text: "Dear Toffo, now we're on Coconut Island. It's hot, and the crabs pinch. There are two locked gates here too:", ps: 'On every palm tree I scratched a tiny heart for you.'},
    unterwasser: {title: 'Letter from the Coral Sea', text: "Dear Toffo, they took me across the Coral Sea in a glass boat. Everything sparkles below us! You'll need a submarine, and the gates down there are tricky:", ps: 'Many fish swim down here, but none of them is as sweet as you.'},
    dschungel: {title: 'Letter from the Jungle', text: 'Dear Toffo, the jungle is so loud! The monkeys guard two gates and laugh all day long:', ps: 'Even monkeys steal bananas, but never letters. Lucky me!'},
    schoko: {title: 'Letter from Chocolate Land', text: "Dear Toffo, Chocolate Land! Everything smells of cocoa, and there's a giant chocolate waterfall. Bring a parachute! I keep hearing them whisper about my cocoa recipe. Strange... The gates here are sweet but sneaky:", ps: 'Would you save me a praline? Just one!'},
    schnee: {title: 'Letter from Snowland', text: 'Dear Toffo, brrr, my paws are freezing in Snowland. The penguins are sweet, but the gates are ice-cold hard:', ps: 'All snowflakes are different, just like the two of us.'},
    lava: {title: 'Letter from the Lava World', text: 'Dear Toffo, the Lava World is so hot that my bow almost melted. Watch your paws:', ps: 'Really, some ice cream would be nice right now. With you.'},
    himmel: {title: 'Letter from the Cloud Castle', text: "Dear Toffo, I'm in the Cloud Castle. The Cloud King isn't the boss at all! He takes orders from Captain Bitterbeard, a star pirate made of dark chocolate. The gates up here:", ps: "Don't think my P.S. lines are random, Toffo. Keep my letters safe."},
    weltraum: {title: 'Letter from Outer Space', text: 'Toffo!!! Captain Bitterbeard is taking me to Saturn, into a cage. And I heard him on the radio: he works for the Chocfather, the boss of the Choco Mafia! They want my secret recipe for the sweetest cocoa in the world. You need a rocket! And two gates are still in the way:', ps: "If you're ever looking for the way home: my P.S. lines are the signposts, from the very beginning."},
    finale: {title: 'A letter for the very end', text: "Toffo, we're free, but the black hole is pulling us in! And down on Earth the Chocfather and his Choco Mafia are already waiting. He won't give up until he has my recipe ...", ps: "After that we'll go home and cuddle. Promise."},
  } : {
    wiese: {title: 'Brief aus der Zuckerwattewiese', text: 'Lieber Toffo, der Wolkenkönig hat mich einfach mitgenommen! Aber keine Angst, ich habe meinen Glücksstift dabei und schreibe dir aus jeder Welt, durch die wir fliegen. Auf der Zuckerwattewiese hat er zwei Tore mit Rätseln verschlossen. Ich habe heimlich gelauscht:', ps: 'Zucker macht stark, also iss genug davon!'},
    insel: {title: 'Brief von der Kokosinsel', text: 'Lieber Toffo, jetzt sind wir auf der Kokosinsel. Es ist heiß, und die Krabben zwicken. Auch hier gibt es zwei verschlossene Tore:', ps: 'Unter jeder Palme liegt ein Kokos-Kuss für dich.'},
    unterwasser: {title: 'Brief aus dem Korallenmeer', text: 'Lieber Toffo, sie haben mich in einem Glasboot über das Korallenmeer gefahren. Unter uns glitzert alles! Du brauchst ein U-Boot, und die Tore da unten sind knifflig:', ps: 'Hast du gewusst, dass Kraken drei Herzen haben? Ich habe nur eins, und das gehört dir.'},
    dschungel: {title: 'Brief aus dem Dschungel', text: 'Lieber Toffo, im Dschungel ist es so laut! Die Affen bewachen zwei Tore und lachen den ganzen Tag:', ps: 'Affen klauen Bananen, aber nie Briefe. Zum Glück!'},
    schoko: {title: 'Brief aus dem Schokoladenland', text: 'Lieber Toffo, Schokoladenland! Alles riecht nach Kakao, und es gibt einen riesigen Schokowasserfall. Nimm einen Fallschirm mit! Ständig flüstern sie hier über mein Kakao-Rezept. Komisch ... Die Tore hier sind süß, aber gemein:', ps: 'Und heb mir eine Praline auf!'},
    schnee: {title: 'Brief aus dem Schneeland', text: 'Lieber Toffo, brrr, im Schneeland frieren meine Pfoten. Die Pinguine sind lieb, die Tore aber eiskalt schwer:', ps: 'Schneeflocken sind alle verschieden, genau wie wir zwei.'},
    lava: {title: 'Brief aus der Lavawelt', text: 'Lieber Toffo, die Lavawelt ist so heiß, dass meine Schleife fast geschmolzen ist. Pass auf deine Pfoten auf:', ps: 'Eis wäre jetzt schön. Mit dir.'},
    himmel: {title: 'Brief aus dem Wolkenschloss', text: "Lieber Toffo, ich sitze im Wolkenschloss. Der Wolkenkönig ist gar nicht der Chef! Er bekommt Befehle von Käpt'n Bitterbart, einem Sternenpiraten aus Zartbitter-Schokolade. Die Tore hier oben:", ps: 'Meine P.S. sind keine Zufälle, Toffo. Heb meine Briefe gut auf.'},
    weltraum: {title: 'Brief aus dem Weltraum', text: "Toffo!!! Käpt'n Bitterbart bringt mich zum Saturn, in einen Käfig. Und ich habe ihn funken hören: Er arbeitet für den Paten, den Boss der Schoko-Mafia! Die wollen mein Geheimrezept für den süßesten Kakao der Welt. Du brauchst eine Rakete! Und zwei Tore stehen noch im Weg:", ps: 'Wenn du je den Weg nach Hause suchst: Meine P.S. sind die Wegweiser, von Anfang an.'},
    finale: {title: 'Brief für ganz am Ende', text: 'Toffo, wir sind frei, aber das Schwarze Loch zieht uns an! Und unten auf der Erde warten schon der Pate und seine Schoko-Mafia. Er gibt nicht auf, bis er mein Rezept hat ...', ps: 'Danach gehen wir nach Hause und kuscheln. Versprochen.'},
  };
  /* the wormhole coordinates hidden in the P.S. initials: German worlds 1-7, English worlds 1-8 */
  G.PS_WORD = G.lang === 'en' ? {word: 'HOMEWARD', count: 8} : {word: 'ZUHAUSE', count: 7};

  /* the shop: Taler are earned in every level and in the rocket; rocket parts and outfits are bought once */
  G.SHOP = {
    rocket: [
      {id: 'shield', name: tr('Schutzschild', 'Shield'), desc: tr('Fängt pro Flug einen Treffer ab', 'Blocks one hit per flight'), price: 250},
      {id: 'fat', name: tr('Fette Rakete', 'Big Rocket'), desc: tr('Zwei Herzen mehr und ein dicker Rumpf', 'Two extra hearts and a chunky hull'), price: 400},
      {id: 'laser2', name: tr('Doppellaser', 'Double Laser'), desc: tr('Zwei Laser auf einmal', 'Two lasers at once'), price: 300},
      {id: 'laser3', name: tr('Dreifachlaser', 'Triple Laser'), desc: tr('Fächerschuss (braucht den Doppellaser)', 'Spread shot (needs the Double Laser)'), price: 600, needs: 'laser2'},
      {id: 'turbo', name: tr('Turbo-Düsen', 'Turbo Jets'), desc: tr('Schnellere Steuerung und mehr Schub', 'Snappier steering and more thrust'), price: 200},
      {id: 'magnet', name: tr('Herzmagnet', 'Heart Magnet'), desc: tr('Herzen und Taler fliegen zur Rakete', 'Hearts and coins fly to your rocket'), price: 150},
      {id: 'paint', name: tr('Goldlack', 'Gold Paint'), desc: tr('Eine goldene Rakete, nur fürs Auge', 'A golden rocket, just for looks'), price: 120},
    ],
    outfits: [
      {id: 'o_wiese', outfit: 'wiese', name: tr('Roter Schal', 'Red Scarf'), desc: tr('Der Klassiker', 'The classic'), price: 150}, {id: 'o_insel', outfit: 'insel', name: tr('Strohhut & Sonnenbrille', 'Straw Hat & Shades'), desc: tr('Strandurlaub-Look', 'Beach holiday look'), price: 250},
      {id: 'o_dschungel', outfit: 'dschungel', name: tr('Tropenhelm', 'Pith Helmet'), desc: tr('Für echte Entdecker', 'For true explorers'), price: 250}, {id: 'o_schnee', outfit: 'schnee', name: tr('Bommelmütze', 'Bobble Hat'), desc: tr('Warm und kuschelig', 'Warm and cozy'), price: 300},
      {id: 'o_lava', outfit: 'lava', name: tr('Grubenhelm mit Lampe', "Miner's Helmet"), desc: tr('Leuchtet im Dunkeln', 'Glows in the dark'), price: 350}, {id: 'o_himmel', outfit: 'himmel', name: tr('Fliegerkappe & Cape', 'Aviator Cap & Cape'), desc: tr('Mit Sternen-Cape', 'With a starry cape'), price: 400},
      {id: 'o_gold', outfit: 'gold', name: tr('Goldener Toffo', 'Golden Toffo'), desc: tr('Glänzt von Kopf bis Fuß', 'Shiny from head to toe'), price: 1500},
    ],
  };
  /* seasonal events: worlds outside G.WORLDS, played from the dashboard while the event runs */
  G.EVENT = {key: 'halloween', from: '2026-10-01', to: '2026-11-08'};
  G.EVENT_WORLDS = {halloween: {
    key: 'halloween', name: tr('Gruselnacht', 'Spooky Night'), levels: tr(['Kürbisfeld', 'Geisterwald', 'Spukschloss', 'Spukschloss'], ['Pumpkin Patch', 'Ghost Woods', 'Haunted Castle', 'Haunted Castle']), diff: 3,
    sky: ['#1a0f33', '#4a2366', '#ff8a3a'], sun: '#fff3c0', hills: ['#2a1840', '#1c1030'], far: 'clouds',
    ground: {top: '#5a4a6e', edge: '#3a2c50', dirt: '#2e2238', dot: '#ff9a2a', dot2: '#9be7a5'}, block: {a: '#6a4a8a', b: '#8a6aaa', c: '#2a1a3a'},
    pipe: {a: '#4a3a5a', b: '#6a5a7a', c: '#2a1a3a', style: 'barrel'}, liquid: {a: '#3a9a3a', b: '#a8f07a', c: '#5ac04a', name: tr('Hexensuppe', 'Witch soup')}, slow: {a: '#6a4a8a', b: '#8a6aaa', c: '#4a2a6a'},
    decor: ['sign', 'bush', 'sign', 'bush'], weather: 'none',
    ents: {E: 'jacko', G: 'ghost', M: 'spider', S: null, C: 'broom', V: 'broom', T: null, J: null, D: null},
    boss: {name: tr('Kürbiskönig', 'Pumpkin King'), kind: 'hopper', a: '#ff8a2a', b: '#a04a10', hp: 4, arena: 'ground', attacks: ['spit'], tip: ''},
    music: {bpm: 100, pattern: 2, transpose: -3, lead: 'bell', bass: 'sine', perc: 1, minor: true},
    lines: ['Happy Halloween!', 'Trick or treat!', 'Where is my Mallo?', 'Mallo, where are you?'],
  }};
  G.SAD = ['Where is my Mallo...', 'Ouch... I need my Mallo.', 'Mallo... I have a problem.', 'Oh no... Mallo...'];
  /* Mallo's letters: one per world, read at the mailbox in the hub; each hints at the puzzle room of that world */
  G.LETTERS = [
    {title: 'Brief 1', text: 'Lieber Toffo, ich bin im Turm und zähle die Wolken. Der Wolkenkönig hat ein Geheimnis in deiner Wiese versteckt: Im zweiten Level, hinter einer LILA Röhre, warten vier Glocken. Läute sie so, wie die Tafel es zeigt, dann gehört dir die erste Schokomünze. Ich vermisse dich. Deine Mallo'},
    {title: 'Brief 2', text: 'Lieber Toffo, hier riecht es nach Kokosnuss, also bist du auf der Insel? Suche im dritten Level die lila Röhre. Diesmal gibt es keine Tafel: Die Glocken singen dir eine Melodie vor. Merk sie dir und spiel sie nach! Deine Mallo'},
    {title: 'Brief 3', text: 'Lieber Toffo, die Affen haben gelacht, als sie die lila Röhre im ersten Dschungel-Level versteckt haben. Die Reihenfolge steht auf der Tafel. Bring mir die Schokomünze, ich habe Hunger! Deine Mallo'},
    {title: 'Brief 4', text: 'Lieber Toffo, im Schnee friert sogar meine Tinte. Im zweiten Level von Schneeland klingen die Glocken wie Eiszapfen. Hör gut zu, sie spielen die Melodie zweimal, wenn du dich auf den Stein stellst. Deine Mallo'},
    {title: 'Brief 5', text: 'Lieber Toffo, der Lavaklops bewacht die lila Röhre im dritten Lavalevel. Die Tafel dort ist halb verbrannt, aber die Farben kann man noch lesen. Pass auf deine Pfoten auf! Deine Mallo'},
    {title: 'Brief 6', text: 'Lieber Toffo, der Wolkenkönig ist nicht der Boss, er bekommt Befehle von Käpt\'n Bitterbart! Im ersten Wolkenlevel steht eine lila Röhre mit einer Melodie. Danach sieh zum Himmel: Dort geht es weiter. Deine Mallo'},
    {title: 'Brief 7', text: 'Toffo!!! Ich bin auf dem Saturn, in einem Käfig von Käpt\'n Bitterbart. Auf dem Mars, im dritten Level, hat er eine lila Röhre mit vier Glocken vergessen. Die Tafel zeigt die Reihenfolge. Und dann: Komm und hol mich! Deine Mallo'},
  ];
  /* which level of each world holds the puzzle room and how the order is told: 'sign' (a board shows it) or 'melody' (the bells play it) */
  G.PUZZLES = [{li: 1, kind: 'sign'}, {li: 2, kind: 'melody'}, {li: 0, kind: 'sign'}, {li: 1, kind: 'melody'}, {li: 2, kind: 'sign'}, {li: 0, kind: 'melody'}, {li: 2, kind: 'sign'}];
})();
