/* The Starway Home: Toffo's lines. He "speaks" with real human vocalizations (p/vox.js); the bubble shows the words.
   text (English, as used by speak()) -> {cat: vocal category, de: German bubble text}. */
(function () {
  const G = window.PW = window.PW || {};
  const L = (cat, de) => ({cat, de});
  G.VOICE_LINES = {
    'Where is my Mallo?': L('call', 'Wo ist meine Mallo?'), 'I need to find my Mallo!': L('cheer', 'Ich muss meine Mallo finden!'),
    'Mallo, where are you?': L('call', 'Mallo, wo bist du?'), 'I miss my Mallo...': L('sad', 'Ich vermisse meine Mallo …'),
    'Mallo, is that the sea?': L('wow', 'Mallo, ist das das Meer?'), 'Coconuts... but no Mallo.': L('huh', 'Kokosnüsse … aber keine Mallo.'),
    'Mallo? The jungle is so big...': L('call', 'Mallo? Der Dschungel ist so groß …'), 'Monkeys! Have you seen my Mallo?': L('wow', 'Affen! Habt ihr meine Mallo gesehen?'),
    'Brrr... Mallo, are you cold?': L('phew', 'Brrr … Mallo, frierst du?'), 'Snow! Mallo, where are you?': L('wow', 'Schnee! Mallo, wo bist du?'),
    'Too hot! Mallo, hold on!': L('phew', 'Zu heiß! Mallo, halt durch!'), 'Lava! I need to find my Mallo!': L('wow', 'Lava! Ich muss Mallo finden!'),
    'Mallo! I can see your tower!': L('wow', 'Mallo! Ich sehe deinen Turm!'), "I'm coming, Mallo!": L('cheer', 'Ich komme, Mallo!'),
    'Mallo, hold on!': L('cheer', 'Mallo, halt durch!'), 'Where is my Mallo...': L('sad', 'Wo ist meine Mallo …'),
    'Ouch... I need my Mallo.': L('sad', 'Aua … ich brauche meine Mallo.'), 'Mallo... I have a problem.': L('sad', 'Mallo … ich hab ein Problem.'),
    'Oh no... Mallo...': L('doh', 'Oh nein … Mallo …'), 'Star power! Nothing can stop me!': L('wahoo', 'Sternenkraft! Mich hält nichts auf!'),
    'A jetpack! Wheee!': L('whoo', 'Ein Jetpack! Juhuu!'), 'Bouncy boots! Boing, boing!': L('whoo', 'Sprungstiefel! Boing, boing!'),
    'I can climb walls now!': L('aha', 'Jetzt kann ich Wände hochklettern!'), 'Honey blaster! Splat, splat!': L('laugh', 'Honigschleuder! Platsch, platsch!'),
    'All the hearts come to me!': L('laugh', 'Alle Herzen kommen zu mir!'), 'A bubble! I feel so safe.': L('phew', 'Eine Schutzblase! Ich fühl mich sicher.'),
    'Everything is sooo slow!': L('wow', 'Alles ist sooo langsam!'), 'Mallo!': L('call', 'Mallo!'), 'Toffo!': L('none', 'Toffo!'),
    'Mallo is in another tower...': L('sad', 'Mallo ist in einem anderen Turm …'), 'Here I come, Mallo!': L('wahoo', 'Ich komme, Mallo!'),
    "Let's go!": L('cheer', 'Los geht’s!'), 'Yay! I did it!': L('cheer', 'Juhu, geschafft!'), 'Hello! I am Toffo.': L('laugh', 'Hallo! Ich bin Toffo.'),
    'Honey time!': L('laugh', 'Honigzeit!'), 'They took Mallo to space!': L('doh', 'Sie haben Mallo ins All gebracht!'),
    'Rocket time! To the moon!': L('wahoo', 'Raketenzeit! Ab zum Mond!'), 'Next planet, Mallo!': L('cheer', 'Nächster Planet, Mallo!'),
    'Mallo, I am in space!': L('wow', 'Mallo, ich bin im Weltall!'), 'Low gravity! I can jump so high!': L('whoo', 'Wenig Schwerkraft! Ich springe sooo hoch!'),
    'Mallo, I can see Saturn!': L('wow', 'Mallo, ich sehe den Saturn!'), 'A puzzle! Let me think...': L('think', 'Ein Rätsel! Lass mich nachdenken …'),
    'I solved it!': L('aha', 'Gelöst!'), 'Chocolate!': L('wow', 'Schokolade!'), 'A chocolate pen! I can draw!': L('aha', 'Ein Schokostift! Ich kann malen!'),
    'A letter from Mallo!': L('wow', 'Ein Brief von Mallo!'), 'Happy Halloween!': L('laugh', 'Fröhliches Halloween!'), 'Trick or treat!': L('laugh', 'Süßes oder Saures!'),
    'Mallo, hold on tight!': L('cheer', 'Mallo, halt dich fest!'), 'We are almost home!': L('cheer', 'Wir sind fast zu Hause!'),
    'Get off my ranch!': L('cheer', 'Runter von meiner Ranch!'), 'Nobody touches my Mallo!': L('cheer', 'Niemand fasst meine Mallo an!'),
  };
  G.VOICE_FILES = {};   /* (the old synthetic recordings are gone) */
})();
