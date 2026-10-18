/* The Starway Home: the story cutscenes, one pair per world. `boss` plays before the tower level (the boss shows up, laughs,
   taunts), `outro` plays after the boss is beaten (the boss spills where the cloud ship went, a clue turns up, Toffo names the
   next destination). The red thread: the Cloud King carries Mallo through the worlds in his cloud ship and bribes each world's
   biggest grump to stop Toffo; from world 5 on the bigger plot leaks out (the Chocfather wants Mallo's cocoa recipe, Captain
   Bitterbeard is the pirate who takes her to space). Played by p/cutscene.js. Texts: {de, en}. who: 'boss' | 'toffo' | 'mallo' | 'clue'.
   Boss moods: laugh (evil laugh, shake, flash), taunt, angry (attack shout), dizzy (beaten, stars), plead (confesses).
   Toffo moods: cool, angry, happy, wide (surprised), sad. clue: an item pops up (item id) with a caption. */
(function () {
  const G = window.PW = window.PW || {};
  const L = (who, mood, de, en) => ({who, mood, de, en});
  const C = (item, de, en) => ({who: 'clue', item, de, en});
  G.CUTS = {
    wiese: {
      boss: {lines: [
        L('boss', 'laugh', 'Hähähä! Ein Bär! Der Wolkenkönig hat mich vor dir gewarnt, Toffo!', 'Heh heh heh! A bear! The Cloud King warned me about you, Toffo!'),
        L('boss', 'taunt', 'Mallo ist längst weitergeflogen. Hier endet deine Reise – sauer macht lustig!', 'Mallo is long gone. Your journey ends here – sour makes you sorry!'),
        L('toffo', 'angry', 'Spuck ruhig, Sauerdrop. Ich hab Zucker im Blut!', "Spit all you want, Sour Drop. I've got sugar in my veins!"),
        L('boss', 'angry', 'Dann wollen wir mal sehen, wie sauer DU werden kannst!', "Then let's see how sour YOU can get!"),
      ]},
      outro: {next: 'insel', lines: [
        L('boss', 'dizzy', 'Uff … okay, okay! Du hast gewonnen …', 'Oof... okay, okay! You win...'),
        L('toffo', 'angry', 'Wo ist Mallo?! Rede!', 'Where is Mallo?! Talk!'),
        L('boss', 'plead', 'Der Wolkenkönig ist mit ihr übers Meer geflogen. Richtung Kokosinsel! Mehr weiß ich nicht!', "The Cloud King flew her out over the sea. Toward Coconut Island! That's all I know!"),
        C('bottle', 'Eine Flaschenpost! Mallos Handschrift: „Ich sehe Palmen!“', "A message in a bottle! Mallo's handwriting: 'I can see palm trees!'"),
        L('toffo', 'cool', 'Halt durch, Mallo. Ich komme!', "Hold on, Mallo. I'm coming!"),
      ]},
    },
    insel: {
      boss: {lines: [
        L('boss', 'laugh', 'Klick-klack! Wer wagt es, in MEINE Höhle zu krabbeln?', 'Click-clack! Who dares to crawl into MY cave?'),
        L('toffo', 'cool', 'Toffo. Ich suche Mallo. Rück sie raus, Krabbe!', "Toffo. I'm looking for Mallo. Hand her over, crab!"),
        L('boss', 'taunt', 'Der Wolkenkönig hat mir einen Berg Kokos-Pralinen geschenkt, damit ich dich zerkneife! Hähähä!', 'The Cloud King gave me a mountain of coconut pralines to pinch you to pieces! Heh heh heh!'),
        L('toffo', 'angry', "Pralinen? Für Mallo gibt's gleich Krabbensalat!", "Pralines? For Mallo, I'm making crab salad!"),
      ]},
      outro: {next: 'unterwasser', lines: [
        L('boss', 'dizzy', 'Autsch, meine Scheren … Du bist zäh für einen Teddy.', "Ouch, my claws... You're tough for a teddy."),
        L('boss', 'plead', 'Die Wolkenschiff-Leute haben Mallo in ein Glasboot gesetzt. Es ist ins Korallenmeer getaucht!', 'The cloud-ship crew put Mallo in a glass boat. It dived into the Coral Sea!'),
        C('glass', 'Eine Scherbe vom Glasboot … und ein rosa Faden von Mallos Schleife.', "A shard from the glass boat... and a pink thread from Mallo's bow."),
        L('toffo', 'wide', 'Unter Wasser? Dann brauche ich ein U-Boot!', 'Under water? Then I need a submarine!'),
      ]},
    },
    unterwasser: {
      boss: {draw: 'kraken', lines: [
        L('boss', 'laugh', 'Blubb-hahaha! Ein Spielzeug-U-Boot in meiner Höhle!', 'Blub-ha-ha-ha! A toy submarine in my lair!'),
        L('boss', 'taunt', 'Der Wolkenkönig versprach mir alle Perlen des Meeres, wenn ich dich versenke!', 'The Cloud King promised me every pearl in the sea if I sink you!'),
        L('toffo', 'cool', 'Acht Arme und trotzdem keine Ahnung. Wo ist Mallo?', 'Eight arms and still no clue. Where is Mallo?'),
        L('boss', 'angry', 'TINTE FREI!', 'INK AWAY!'),
      ]},
      outro: {draw: 'kraken', next: 'dschungel', lines: [
        L('boss', 'dizzy', 'Blubb … meine Tentakel sind ganz verknotet …', 'Blub... my tentacles are all tangled...'),
        L('boss', 'plead', 'Das Glasboot kam am Dschungelstrand wieder hoch! Die Affen haben es gesehen!', 'The glass boat surfaced again at the jungle beach! The monkeys saw it!'),
        C('map', 'Eine durchweichte Karte vom Wolkenschiff – der Dschungeltempel ist eingekreist!', 'A soggy map from the cloud ship – the jungle temple is circled!'),
        L('toffo', 'cool', "Dann weiß ich ja, wo's hingeht. Affen, ich komme!", 'Then I know where to go. Monkeys, here I come!'),
      ]},
    },
    dschungel: {
      boss: {lines: [
        L('boss', 'laugh', 'Uh-uh-ah-ah! Der Bär aus den Briefen! Die Affen lachen schon seit Tagen über dich!', 'Oo-oo-ah-ah! The bear from the letters! The monkeys have been laughing at you for days!'),
        L('toffo', 'angry', 'Ihr habt Mallos Briefe gelesen?!', "You read Mallo's letters?!"),
        L('boss', 'taunt', 'Gelesen? Wir haben einen GEFRESSEN! Der Wolkenkönig zahlt in Bananen, hähä!', 'Read them? We ATE one! The Cloud King pays in bananas, heh heh!'),
        L('toffo', 'cool', 'Dann hol ich mir den Brief zurück – mitsamt deiner Krone.', "Then I'll take that letter back – crown and all."),
      ]},
      outro: {next: 'schoko', lines: [
        L('boss', 'dizzy', 'Uuuh … mir dreht sich alles … hier, nimm den blöden Brief!', "Oooh... everything's spinning... here, take the silly letter!"),
        C('letter', 'Ein angeknabberter Brief von Mallo: „Es riecht nach Kakao. Sie fliegen mich ins Schokoladenland!“', "A nibbled letter from Mallo: 'It smells of cocoa. They're flying me to Chocolate Land!'"),
        L('boss', 'plead', 'Das Wolkenschiff tankt dort heiße Schokolade. Der Drache bewacht die Quelle …', 'The cloud ship refuels on hot chocolate there. The dragon guards the spring...'),
        L('toffo', 'happy', 'Schokolade UND Mallo? Das wird mein Lieblingsland.', "Chocolate AND Mallo? That's going to be my favorite land."),
      ]},
    },
    schoko: {
      boss: {lines: [
        L('boss', 'laugh', 'Grrrooaaar! Riechst du das, Bärchen? Heißer Kakao – und gleich bist du drin!', "Grrrooaaar! Smell that, little bear? Hot cocoa – and you're about to be in it!"),
        L('toffo', 'cool', 'Ich nehm meinen Kakao lieber mit Mallo. Wo ist sie?', 'I prefer my cocoa with Mallo. Where is she?'),
        L('boss', 'taunt', 'Die Bärin mit dem Rezept? Hähä, der Pate zahlt gut für sie … und für deinen Pelz!', 'The bear with the recipe? Heh, the Chocfather pays well for her... and for your fur!'),
        L('toffo', 'wide', 'Der … Pate? Was für ein Rezept?', 'The... Chocfather? What recipe?'),
        L('boss', 'angry', 'Genug geplaudert! FEUER … äh, KAKAO!', 'Enough chit-chat! FIRE... er, COCOA!'),
      ]},
      outro: {next: 'schnee', lines: [
        L('boss', 'dizzy', 'Hust … zu viel Kakao … Ich rede ja schon!', "Cough... too much cocoa... Fine, I'll talk!"),
        L('boss', 'plead', 'Das Wolkenschiff ist nach Norden, ins Schneeland. Dort friert ihnen das Schiff ein, hähä … äh, hust.', 'The cloud ship went north, to Snowland. Their ship will freeze there, heh... er, cough.'),
        C('snowflake', 'Schneeflocken auf den Drachenflügeln … und ein Fetzen Papier: „Mallos Geheim-Kakao – Rezept“!', "Snowflakes on the dragon's wings... and a scrap of paper: 'Mallo's secret cocoa – recipe'!"),
        L('toffo', 'angry', 'Dieser Pate will Mallos Rezept. Nicht mit mir! Ab in den Schnee!', "This Chocfather wants Mallo's recipe. Not on my watch! Off to the snow!"),
      ]},
    },
    schnee: {
      boss: {lines: [
        L('boss', 'laugh', 'RÖÖÖAR! Endlich Besuch! Hier oben ist es so einsam … und so KALT!', "ROOOAR! Finally a visitor! It's so lonely up here... and so COLD!"),
        L('boss', 'taunt', 'Der Wolkenkönig hat es versprochen: Friere ich dich ein, bekomme ich seine Wolkendecke!', 'The Cloud King promised: if I freeze you, I get his cloud blanket!'),
        L('toffo', 'cool', "Eine Decke? Ich bring dir 'ne Umarmung – gleich nach dem Kopfsprung.", "A blanket? I'll bring you a hug – right after the head-stomp."),
        L('boss', 'angry', 'EISZAPFEN-REGEN!', 'ICICLE RAIN!'),
      ]},
      outro: {next: 'lava', lines: [
        L('boss', 'dizzy', 'Brrr … du bist warmherzig UND hart im Nehmen …', "Brrr... you're warm-hearted AND tough..."),
        L('boss', 'plead', 'Das Wolkenschiff ist hier eingefroren. Sie mussten es auftauen – in der Lavawelt!', 'The cloud ship froze solid here. They had to thaw it – in the Lava World!'),
        C('icekey', 'Ein eingefrorener Schlüssel mit Wolken-Wappen … Der gehört zum Wolkenschiff!', 'A frozen key with a cloud crest... It belongs to the cloud ship!'),
        L('toffo', 'cool', 'Dann folge ich dem Tauwasser. Lavawelt, ich komme!', "Then I'll follow the meltwater. Lava World, here I come!"),
      ]},
    },
    lava: {
      boss: {lines: [
        L('boss', 'laugh', 'BLUBB-HAHA! Schon wieder ein Pelztier für meinen Lava-Grill!', 'BLUB-HAHA! Another furball for my lava grill!'),
        L('toffo', 'angry', 'Wo ist das Wolkenschiff? Ich weiß, dass es hier aufgetaut wurde!', "Where's the cloud ship? I know it was thawed here!"),
        L('boss', 'taunt', 'Aufgetaut und weg! Und ein Pirat war dabei – mit einem Bart aus Zartbitter! Hähä!', 'Thawed and gone! And a pirate was with them – with a beard of dark chocolate! Heh heh!'),
        L('toffo', 'wide', 'Ein Pirat …? Erst der Pate, jetzt ein Pirat!', 'A pirate...? First the Chocfather, now a pirate!'),
        L('boss', 'angry', 'LAVAREGEN!', 'LAVA RAIN!'),
      ]},
      outro: {next: 'himmel', lines: [
        L('boss', 'dizzy', 'Uff … ich schmelze … äh, ich meine: Ich gebe auf.', "Oof... I'm melting... I mean: I give up."),
        L('boss', 'plead', 'Das Schiff ist in den Himmel gestiegen. Zum Wolkenschloss! Höher als jeder Vulkan!', 'The ship rose into the sky. To the Cloud Castle! Higher than any volcano!'),
        C('feather', 'Eine Wolkenfeder des Wolkenkönigs … und sie ist noch warm. Er war gerade erst hier!', 'A cloud feather from the Cloud King... still warm. He was just here!'),
        L('toffo', 'cool', 'Dann ist es Zeit zu fliegen. Wolkenschloss, ich komme!', "Then it's time to fly. Cloud Castle, here I come!"),
      ]},
    },
    himmel: {
      boss: {lines: [
        L('boss', 'laugh', 'Hohoho! Da ist er ja, der Bär, der mir durch alle Welten nachrennt!', 'Ho ho ho! There he is, the bear who chased me through every world!'),
        L('toffo', 'angry', 'Du hast Mallo entführt! Gib sie zurück!', 'You kidnapped Mallo! Give her back!'),
        L('boss', 'taunt', 'Ich? Ich bin nur der Lieferant! Mallo ist längst … woanders. Hohoho!', "Me? I'm just the delivery man! Mallo is long... elsewhere. Ho ho ho!"),
        L('toffo', 'cool', 'Dann liefere ich dir jetzt einen Blitz zurück.', 'Then let me deliver a lightning bolt right back.'),
        L('boss', 'angry', 'BLITZ UND DONNER!', 'THUNDER AND LIGHTNING!'),
      ]},
      outro: {next: 'weltraum', lines: [
        L('boss', 'dizzy', 'Au … meine Krone … Gut, du sollst es wissen!', 'Ow... my crown... Fine, you shall know!'),
        L('boss', 'plead', "Ich arbeite für Käpt'n Bitterbart, den Sternenpiraten! Er hat Mallo ins Weltall gebracht – zum Saturn!", 'I work for Captain Bitterbeard, the star pirate! He took Mallo into space – to Saturn!'),
        C('crown', 'Die Wolkenkrone … und darin ein Funkspruch: „Bitterbart an Paten: Paket unterwegs zum Saturn.“', "The cloud crown... with a radio message inside: 'Bitterbeard to Chocfather: package on its way to Saturn.'"),
        L('toffo', 'angry', 'Paket?! Mallo ist kein Paket! Ich brauche eine Rakete!', 'Package?! Mallo is not a package! I need a rocket!'),
      ]},
    },
    weltraum: {
      boss: {lines: [
        L('boss', 'laugh', 'Harr-harr-harr! Ein Teddy auf dem Saturn! Du bist weit gereist, um zu verlieren.', "Harr harr harr! A teddy on Saturn! You've come a long way to lose."),
        L('toffo', 'angry', 'Bitterbart! Lass Mallo frei!', 'Bitterbeard! Let Mallo go!'),
        L('boss', 'taunt', 'Die kleine Bärin kennt das Rezept für den süßesten Kakao der Welt. Der Pate will es – und ich will sein Gold!', 'The little bear knows the recipe for the sweetest cocoa in the world. The Chocfather wants it – and I want his gold!'),
        L('toffo', 'cool', "Süß wird's gleich. Für dich eher … bitter.", 'Things are about to get sweet. For you... bitter.'),
        L('boss', 'angry', 'LASERKANONEN – FEUER!', 'LASER CANNONS – FIRE!'),
      ]},
      outro: {next: 'finale', lines: [
        L('boss', 'dizzy', 'Harr … mein schöner Bart … verkohlt …', 'Harr... my beautiful beard... scorched...'),
        L('mallo', 'happy', 'Toffo! Ich wusste, dass du kommst!', "Toffo! I knew you'd come!"),
        L('toffo', 'happy', 'Mallo! Endlich! Nichts wie weg hier!', "Mallo! Finally! Let's get out of here!"),
        L('boss', 'laugh', 'Weg? Harr-harr … Euer Raumschiff treibt direkt auf ein Schwarzes Loch zu! Grüßt den Paten von mir!', 'Out? Harr harr... Your spaceship is drifting straight toward a black hole! Say hi to the Chocfather for me!'),
        L('toffo', 'wide', 'Festhalten, Mallo!', 'Hold on tight, Mallo!'),
      ]},
    },
  };
})();
