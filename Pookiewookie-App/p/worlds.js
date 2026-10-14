/* Pookiewookie: the six worlds. Palettes, enemy casts, hazards, bosses, music parameters and Wookie's lines. */
(function () {
  const G = window.PW = window.PW || {};
  G.WORLDS = [
    {
      key: 'wiese', name: 'Zuckerwattewiese', levels: ['Erste Hüpfer', 'Herzchenhügel', 'Keksklippen', 'Turm der Sauerdrops'],
      sky: ['#ffc9dc', '#e6d6ff', '#fff4e0'], sun: '#fff4b0', hills: ['#c9f0d0', '#b4e6c0'], far: 'cupcakes',
      ground: {top: '#8fe0a0', edge: '#6cc482', dirt: '#f2d9a6', dot: '#ff9eb0', dot2: '#8fd3ff'}, block: {a: '#d9a066', b: '#e6b57c', c: '#5a3a1a'},
      pipe: {a: '#ffb3c6', b: '#fff', c: '#e8738f', style: 'mug'}, liquid: {a: '#e0457b', b: '#ff9eb0', c: '#f06a96', name: 'Himbeersirup'}, slow: {a: '#f5c242', b: '#ffe08a', c: '#e3a92a'},
      decor: ['lolli', 'cupcake', 'bush', 'sign'], weather: 'petals',
      ents: {E: 'drop', G: 'bee', M: 'spiky', S: 'cloud', C: 'cookie', V: 'cookie', T: null, J: null, D: null},
      boss: {name: 'Riesen-Sauerdrop', kind: 'hopper', a: '#c7ef6b', b: '#8fb84a', hp: 3},
      music: {bpm: 118, pattern: 0, transpose: 0, lead: 'bell', bass: 'sine', perc: 0},
      lines: ['Where is my Pookie?', 'I need to find my Pookie!', 'Pookie, where are you?', 'I miss my Pookie...'],
    },
    {
      key: 'insel', name: 'Kokosinsel', levels: ['Muschelstrand', 'Palmenpfad', 'Riffsprung', 'Turm der Krabben'],
      sky: ['#7fd7ff', '#bfefff', '#fff2c9'], sun: '#fff0a0', hills: ['#5ec8d8', '#3fb3c9'], far: 'sea',
      ground: {top: '#ffe9a8', edge: '#e6c97a', dirt: '#f7d58a', dot: '#fff', dot2: '#ffb37a'}, block: {a: '#c98a4a', b: '#dfa062', c: '#7a4a1a'},
      pipe: {a: '#b9793f', b: '#dfa062', c: '#8a5a2b', style: 'barrel'}, liquid: {a: '#3aa0e8', b: '#9fe0ff', c: '#5ab8f5', name: 'Meer'}, slow: {a: '#f3d9a4', b: '#fff0c8', c: '#d9b870'},
      decor: ['palm', 'shell', 'board', 'sign'], weather: 'none',
      ents: {E: 'crab', G: 'gull', M: 'urchin', S: 'snapper', C: 'raft', V: 'raft', T: null, J: 'fish', D: null},
      boss: {name: 'Krabbenkönig', kind: 'charger', a: '#ff6a4a', b: '#c43a1f', hp: 3},
      music: {bpm: 128, pattern: 1, transpose: 2, lead: 'marimba', bass: 'triangle', perc: 1},
      lines: ['Pookie, is that the sea?', 'Coconuts... but no Pookie.', 'Where is my Pookie?', 'Pookie, where are you?'],
    },
    {
      key: 'dschungel', name: 'Dschungel', levels: ['Rankenwald', 'Affenbrücke', 'Sumpfsprung', 'Turm der Affen'],
      sky: ['#5fb37a', '#9ee0a8', '#e7f7c8'], sun: '#fff7c0', hills: ['#2f7a4e', '#1f5a3a'], far: 'jungle',
      ground: {top: '#5fcf6a', edge: '#3a9a46', dirt: '#8a5a2b', dot: '#6b3f1d', dot2: '#b6f0bd'}, block: {a: '#8a5a2b', b: '#a56f3a', c: '#4a2a0f'},
      pipe: {a: '#4fa65a', b: '#8fe08a', c: '#2f7a3a', style: 'bamboo'}, liquid: {a: '#4e8a2a', b: '#9ed66a', c: '#6ba53a', name: 'Sumpf'}, slow: {a: '#6b4a2a', b: '#8a6a4a', c: '#4a2a0f'},
      decor: ['tree', 'fern', 'flower', 'sign'], weather: 'leaves', vines: true, bouncy: true,
      ents: {E: 'beetle', G: 'parrot', M: 'thornball', S: 'snapper', C: 'log', V: 'log', T: 'monkey', J: null, D: null},
      boss: {name: 'Affenkönig', kind: 'hopper', a: '#8a5a2b', b: '#5a3a1a', hp: 3},
      music: {bpm: 132, pattern: 1, transpose: -3, lead: 'marimba', bass: 'triangle', perc: 2},
      lines: ['Pookie? The jungle is so big...', 'Monkeys! Have you seen my Pookie?', 'I need to find my Pookie!', 'Pookie, where are you?'],
    },
    {
      key: 'schnee', name: 'Schneeland', levels: ['Flockenfeld', 'Eiszapfenpfad', 'Pinguinrutsche', 'Turm des Yeti'],
      sky: ['#9fc8ff', '#dbeaff', '#ffffff'], sun: '#fff', hills: ['#dfe9f7', '#c3d3ea'], far: 'mountains',
      ground: {top: '#ffffff', edge: '#cfe0f5', dirt: '#a9c4e6', dot: '#dfe9f7', dot2: '#8fd3ff'}, block: {a: '#9fd0f0', b: '#c7e8ff', c: '#5aa0d0'},
      pipe: {a: '#bfe2ff', b: '#ffffff', c: '#7fb8e6', style: 'ice'}, liquid: {a: '#2f6fb3', b: '#8fc8ff', c: '#4a8ad0', name: 'Eiswasser'}, slow: {a: '#eef6ff', b: '#ffffff', c: '#cfe0f5'},
      decor: ['pine', 'snowman', 'bush', 'sign'], weather: 'snow', ice: true,
      ents: {E: 'penguin', G: 'owl', M: 'iceball', S: 'frost', C: 'floe', V: 'floe', T: 'snowman', J: null, D: 'icicle'},
      boss: {name: 'Yeti', kind: 'hopper', a: '#f4f8ff', b: '#9fb8d8', hp: 4},
      music: {bpm: 104, pattern: 2, transpose: 0, lead: 'bell', bass: 'sine', perc: 0},
      lines: ['Brrr... Pookie, are you cold?', 'Snow! Pookie, where are you?', 'I miss my Pookie...', 'Where is my Pookie?'],
    },
    {
      key: 'lava', name: 'Lavawelt', levels: ['Glutpfad', 'Feuerbrücke', 'Magmasprung', 'Turm des Lavaklops'],
      sky: ['#2b1024', '#6b1f2a', '#ff8a3a'], sun: '#ff5a2a', hills: ['#4a1a1a', '#2a0f12'], far: 'volcano',
      ground: {top: '#6b5a5a', edge: '#4a3a3a', dirt: '#3a2a2e', dot: '#ff7a2a', dot2: '#ffb347'}, block: {a: '#5a4a4a', b: '#7a6a6a', c: '#2a1a1a'},
      pipe: {a: '#7a5a5a', b: '#a08080', c: '#4a2a2a', style: 'stone'}, liquid: {a: '#ff6a1a', b: '#ffd24a', c: '#ff9a2a', name: 'Lava'}, slow: {a: '#3a3a3a', b: '#5a5a5a', c: '#1a1a1a'},
      decor: ['torch', 'rock', 'skull', 'sign'], weather: 'embers', crumble: true,
      ents: {E: 'lavablob', G: 'firebat', M: 'magmarock', S: 'geyser', C: 'lavarock', V: 'lavarock', T: 'cannon', J: 'fireball', D: null},
      boss: {name: 'Lavaklops', kind: 'charger', a: '#ff7a2a', b: '#8a2a0a', hp: 4},
      music: {bpm: 140, pattern: 3, transpose: 0, lead: 'synth', bass: 'square', perc: 2},
      lines: ['Too hot! Pookie, hold on!', 'Lava! I need to find my Pookie!', 'Pookie, where are you?', 'Where is my Pookie?'],
    },
    {
      key: 'himmel', name: 'Wolkenschloss', levels: ['Wolkenweg', 'Sturmbrücke', 'Blitzsprung', 'Turm des Wolkenkönigs'],
      sky: ['#3b2a6a', '#8a6ad0', '#ffd6e8'], sun: '#fff', hills: ['#c9b8f0', '#a893e0'], far: 'clouds',
      ground: {top: '#ffffff', edge: '#d8ccf5', dirt: '#e6ddfb', dot: '#ffd6e8', dot2: '#ffe9a8'}, block: {a: '#b9a3ec', b: '#d3c3f7', c: '#6f55b8'},
      pipe: {a: '#d8ccf5', b: '#ffffff', c: '#a893e0', style: 'cloud'}, liquid: {a: '#2b1a4a', b: '#6a4ab0', c: '#3f2a6a', name: 'Abgrund'}, slow: {a: '#ffe9a8', b: '#fff6d0', c: '#e6c76a'},
      decor: ['star', 'balloon', 'bush', 'sign'], weather: 'stars', wind: true, vertical: true,
      ents: {E: 'cloudling', G: 'bat', M: 'thunderball', S: 'storm', C: 'cloud', V: 'cloud', T: null, J: null, D: 'thwomp'},
      boss: {name: 'Wolkenkönig', kind: 'flyer', a: '#8a8ab0', b: '#4a4a7a', hp: 5},
      doorLine: 'They took Pookie to space!',
      music: {bpm: 112, pattern: 2, transpose: 4, lead: 'flute', bass: 'sine', perc: 1},
      lines: ['Pookie! I can see your tower!', "I'm coming, Pookie!", 'Where is my Pookie?', 'Pookie, hold on!'],
    },
    {
      key: 'weltraum', name: 'Weltraum', levels: ['Raketenflug', 'Mond', 'Mars', 'Saturn-Gefängnis'], rocket: true,
      sky: ['#05030f', '#0b0a2a', '#1a1038'], sun: '#ffffff', hills: ['#2a2a4a', '#1a1a33'], far: 'space',
      ground: {top: '#c9c9d9', edge: '#8e8ea8', dirt: '#6e6e86', dot: '#55556e', dot2: '#ffffff'}, block: {a: '#6e6e86', b: '#9a9ab4', c: '#3a3a4e'},
      pipe: {a: '#8e8ea8', b: '#d0d0e0', c: '#5a5a72', style: 'metal'}, liquid: {a: '#3b1e6b', b: '#8a5cff', c: '#5a36b0', name: 'Plasma'}, slow: {a: '#9a9ab0', b: '#c0c0d0', c: '#6a6a80'},
      decor: ['flag', 'crater', 'rover', 'sign'], weather: 'stars',
      ents: {E: 'alien', G: 'ufo', M: 'meteor', S: 'plasma', C: 'hover', V: 'hover', T: 'robot', J: null, D: 'laserfall'},
      boss: {name: 'Sternenpirat', kind: 'flyer', a: '#6a4ab0', b: '#2a1a50', hp: 6, final: true},
      music: {bpm: 126, pattern: 1, transpose: -4, lead: 'synth', bass: 'square', perc: 2},
      lines: ['Pookie, I am in space!', 'Low gravity! I can jump so high!', 'Pookie, I can see Saturn!', 'Where is my Pookie?'],
      /* per-level skins: the hub is the station, then the planets; gravity drops on the moon */
      skins: [
        {skin: 'station', grav: 1},
        {skin: 'mond', grav: 0.55, ground: {top: '#d8d8e6', edge: '#9a9ab4', dirt: '#7a7a92', dot: '#5c5c74', dot2: '#ffffff'}, sky: ['#000008', '#05051a', '#101030']},
        {skin: 'mars', grav: 0.8, ground: {top: '#e07a3a', edge: '#a8521f', dirt: '#8a3f18', dot: '#6a2e10', dot2: '#ffb27a'}, block: {a: '#8a3f18', b: '#b8602a', c: '#4a2008'}, sky: ['#2a0f0a', '#7a2f18', '#e8a070'], hills: ['#9a4a22', '#6a2e14'], slow: {a: '#c97a4a', b: '#e8a070', c: '#8a4a22'}},
        {skin: 'saturn', grav: 0.9, ground: {top: '#b48cf0', edge: '#7a56c0', dirt: '#4e3488', dot: '#3a2666', dot2: '#ffe9a8'}, block: {a: '#5a3a9a', b: '#8a66c8', c: '#2a1850'}, sky: ['#120826', '#2a1458', '#6a3a9a'], hills: ['#3a2270', '#241448']},
      ],
    },
  ];
  G.SAD = ['Where is my Pookie...', 'Ouch... I need my Pookie.', 'Pookie... I have a problem.', 'Oh no... Pookie...'];
  /* Pookie's letters: one per world, read at the mailbox in the hub; each hints at the puzzle room of that world */
  G.LETTERS = [
    {title: 'Brief 1', text: 'Lieber Wookie, ich bin im Turm und zähle die Wolken. Der Wolkenkönig hat ein Geheimnis in deiner Wiese versteckt: Im zweiten Level, hinter einer LILA Röhre, warten vier Glocken. Läute sie so, wie die Tafel es zeigt, dann gehört dir die erste Schokomünze. Ich vermisse dich. Deine Pookie'},
    {title: 'Brief 2', text: 'Lieber Wookie, hier riecht es nach Kokosnuss, also bist du auf der Insel? Suche im dritten Level die lila Röhre. Diesmal gibt es keine Tafel: Die Glocken singen dir eine Melodie vor. Merk sie dir und spiel sie nach! Deine Pookie'},
    {title: 'Brief 3', text: 'Lieber Wookie, die Affen haben gelacht, als sie die lila Röhre im ersten Dschungel-Level versteckt haben. Die Reihenfolge steht auf der Tafel. Bring mir die Schokomünze, ich habe Hunger! Deine Pookie'},
    {title: 'Brief 4', text: 'Lieber Wookie, im Schnee friert sogar meine Tinte. Im zweiten Level von Schneeland klingen die Glocken wie Eiszapfen. Hör gut zu, sie spielen die Melodie zweimal, wenn du dich auf den Stein stellst. Deine Pookie'},
    {title: 'Brief 5', text: 'Lieber Wookie, der Lavaklops bewacht die lila Röhre im dritten Lavalevel. Die Tafel dort ist halb verbrannt, aber die Farben kann man noch lesen. Pass auf deine Pfoten auf! Deine Pookie'},
    {title: 'Brief 6', text: 'Lieber Wookie, der Wolkenkönig ist nicht der Boss, er bekommt Befehle vom Sternenpiraten! Im ersten Wolkenlevel steht eine lila Röhre mit einer Melodie. Danach sieh zum Himmel: Dort geht es weiter. Deine Pookie'},
    {title: 'Brief 7', text: 'Wookie!!! Ich bin auf dem Saturn, in einem Käfig des Sternenpiraten. Auf dem Mars, im dritten Level, hat er eine lila Röhre mit vier Glocken vergessen. Die Tafel zeigt die Reihenfolge. Und dann: Komm und hol mich! Deine Pookie'},
  ];
  /* which level of each world holds the puzzle room and how the order is told: 'sign' (a board shows it) or 'melody' (the bells play it) */
  G.PUZZLES = [{li: 1, kind: 'sign'}, {li: 2, kind: 'melody'}, {li: 0, kind: 'sign'}, {li: 1, kind: 'melody'}, {li: 2, kind: 'sign'}, {li: 0, kind: 'melody'}, {li: 2, kind: 'sign'}];
})();
