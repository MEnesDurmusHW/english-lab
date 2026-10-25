/* ============================================================
   English Lab — Shades of Meaning verisi (shades.html)

   Her aile tek bir "joker" kelimenin (happy, good, look, very…) yerine
   geçen kelimeleri toplar. Kelimelerin tam kaydı data.js'te (grup 7-8);
   burada yalnızca ayırt etmeye yarayanlar durur.

     plain     yerine geçtikleri genel kelime(ler); Write sekmesi metinde
               bunları arar (plainRe)
     question  doğru kelimeyi seçtiren tek soru
     words     w: data.js'teki en · cue: tek satırlık ayırt edici ·
               level: yoğunluk 1-3 · reg: casual | neutral | formal ·
               pat: tipik kalıp (BÜYÜK harf vurgulanır)
     pair      aynı cümle, farklı kelime: s (___ boşluklu) + v {kelime: ne
               ima ettiği}; "✗" ile başlayan açıklama: o kelime oturmuyor
     partners  (pair yerine) kelime -> tipik eşleri
     remember  akılda tutma imgesi
     trap      sık yapılan hata
     quiz      s: senaryo (___ boşluk, seçenekler ailenin kelimeleri) ·
               a: doğru kelime · why: neden
   ============================================================ */
const SHADES = [
{
  id:'happy', plain:'happy', title:'Feeling good',
  plainRe:'happy|glad',
  question:'What caused the feeling?',
  words:[
    {w:'thrilled',  cue:'Excited by great news or an event you hoped for.', level:3, reg:'casual', pat:'thrilled TO hear · thrilled ABOUT/WITH sth'},
    {w:'delighted', cue:'Very pleased; the polite, slightly formal choice.', level:3, reg:'formal', pat:'delighted TO accept/announce · delighted WITH sth'},
    {w:'relieved',  cue:'A worry or danger has gone away.', level:2, reg:'neutral', pat:'relieved TO hear · relieved THAT'},
    {w:'content',   cue:'Calm satisfaction; nothing is missing.', level:1, reg:'neutral', pat:'content WITH sth · content TO do sth'}
  ],
  pair:{ s:'I was ___ when I read the email.', v:{
    thrilled:'It brought exciting news you had hoped for. You are buzzing.',
    delighted:'Very pleased, and it sounds polite, like a reply: "I\'m delighted to accept."',
    relieved:'You had feared bad news, and it did not come.',
    content:'✗ Odd fit: content is a steady state, not a reaction to one moment.'
  }},
  remember:'Relieved looks back at a fear. Thrilled jumps forward with excitement. Content sits still and wants nothing more. Delighted says "very pleased" with good manners.',
  trap:'The adjective content is stressed on the second syllable /kənˈtent/ and usually comes after the verb: "She seems content", not "a content woman".',
  quiz:[
    {s:'The surgery went well and he will make a full recovery. His family are deeply ___.', a:'relieved', why:'The fear has ended. That is relief, not excitement.'},
    {s:'We are ___ to announce that Dr Lee will join our board next month.', a:'delighted', why:'A formal announcement: polite and very pleased.'},
    {s:'She just found out she got into her dream university. She is absolutely ___!', a:'thrilled', why:'Big, exciting news with lots of energy.'},
    {s:'He does not want a promotion; he is perfectly ___ with his quiet job and short commute.', a:'content', why:'Calm satisfaction. He needs nothing more.'},
    {s:'I thought I had lost my passport, so I was ___ to find it in my coat pocket.', a:'relieved', why:'A worry suddenly disappeared.'},
    {s:'The kids were ___ when they saw the snow and ran outside screaming.', a:'thrilled', why:'Excitement, high energy.'}
  ]
},
{
  id:'angry', plain:'angry', title:'Feeling annoyed',
  plainRe:'angry|annoyed|mad',
  question:'How strong is it, and how long has it lasted?',
  words:[
    {w:'irritated', cue:'Mild, short annoyance, often at something small and repeated.', level:1, reg:'neutral', pat:'irritated BY noise · irritated WITH sb'},
    {w:'fed up',    cue:'Tired of something that has gone on too long.', level:2, reg:'casual', pat:'fed up WITH sth/sb · fed up WITH waiting'},
    {w:'resentful', cue:'Quiet, lasting bitterness about unfair treatment.', level:2, reg:'neutral', pat:'resentful OF/ABOUT sth · FEEL resentful'},
    {w:'furious',   cue:'Extremely angry, right now.', level:3, reg:'neutral', pat:'furious WITH sb · furious ABOUT/AT sth'}
  ],
  pair:{ s:'She was ___ with her manager.', v:{
    irritated:'He did something small and annoying, maybe interrupting again.',
    'fed up':'This has gone on for months. She has had enough.',
    resentful:'She feels treated unfairly and keeps it inside. It lingers.',
    furious:'He did something serious. She is exploding with anger.'
  }},
  remember:'Think of a thermometer and a calendar. Irritated: low heat, short time. Furious: maximum heat, right now. Fed up: it has gone on far too long. Resentful: a quiet grudge about unfairness that will not go away.',
  trap:'Fed up takes "with": fed up with the noise. "Fed up of" is informal British English; avoid it in writing.',
  quiz:[
    {s:'I was getting a little ___ by the constant tapping of his pen.', a:'irritated', why:'Small, repeated annoyance. Mild.'},
    {s:'When he found out someone had scratched his new car on purpose, he was ___.', a:'furious', why:'Something serious happened. Extreme anger, right now.'},
    {s:'I am ___ with this printer. It jams every single day and I have had enough.', a:'fed up', why:'It has gone on too long.'},
    {s:'She is still ___ that her brother got the house and she got nothing.', a:'resentful', why:'Lasting bitterness about unfairness.'},
    {s:'The fans were ___ after the referee\'s decision cost them the final; some threw bottles onto the pitch.', a:'furious', why:'Explosive anger in the moment.'},
    {s:'Workers grew ___ of managers who took bonuses while everyone else\'s pay was frozen.', a:'resentful', why:'Unfair treatment that builds a grudge.'}
  ]
},
{
  id:'worried', plain:'worried', title:'Feeling worried',
  plainRe:'worried|nervous',
  question:'Is there a clear reason, or is it about trust?',
  words:[
    {w:'anxious', cue:'Real worry about something that might happen; can be strong and last.', level:3, reg:'neutral', pat:'anxious ABOUT sth · anxious FOR sb'},
    {w:'uneasy',  cue:'A vague feeling that something is wrong, without a clear reason.', level:1, reg:'neutral', pat:'FEEL uneasy · an uneasy SILENCE/feeling'},
    {w:'wary',    cue:'Careful and a bit suspicious, because something might cause trouble.', level:1, reg:'neutral', pat:'wary OF strangers/offers · wary ABOUT doing sth'}
  ],
  pair:{ s:'I felt ___ about the new business partner.', v:{
    anxious:'You are worried something will go wrong: the meeting, the deal, the money.',
    uneasy:'You cannot say why, but something does not feel right.',
    wary:'You do not fully trust them yet, so you are careful.'
  }},
  remember:'Anxious worries about an outcome. Uneasy is a gut feeling with no clear reason. Wary keeps its guard up; it is about trust. (Apprehensive: mild worry about a specific thing coming up.)',
  trap:'Anxious TO do something can mean "eager": "We are anxious to start" = we really want to start.',
  quiz:[
    {s:'The house was too quiet when I got home, and I had an ___ feeling that someone had been inside.', a:'uneasy', why:'A vague gut feeling, no clear proof.'},
    {s:'Investors are ___ of companies that promise huge returns with no risk.', a:'wary', why:'Careful, suspicious, slow to trust.'},
    {s:'She is very ___ about her exam results; she has not slept properly all week.', a:'anxious', why:'Strong worry about an outcome.'},
    {s:'Cats are naturally ___ of strangers, so give her time to come to you.', a:'wary', why:'Cautious until trust is built.'},
    {s:'There was an ___ silence after he mentioned the layoffs.', a:'uneasy', why:'Uncomfortable atmosphere; something feels wrong.'},
    {s:'Parents are understandably ___ when their teenager starts driving at night.', a:'anxious', why:'Real worry about what might happen.'}
  ]
},
{
  id:'surprised', plain:'surprised', title:'Feeling surprised',
  plainRe:'surprised|shocked',
  question:'How big is the shock, and how do you react?',
  words:[
    {w:'taken aback', cue:'Briefly surprised and a little uncomfortable, often by a remark.', level:1, reg:'neutral', pat:'taken aback BY a question/remark · SLIGHTLY taken aback'},
    {w:'astonished',  cue:'Very surprised by something hard to believe; often amazed.', level:2, reg:'neutral', pat:'astonished AT/BY sth · astonished TO find'},
    {w:'stunned',     cue:'So shocked you cannot speak or react for a moment.', level:3, reg:'neutral', pat:'stunned BY the news · a stunned SILENCE'}
  ],
  pair:{ s:'I was ___ by his answer.', v:{
    'taken aback':'It was unexpected and a bit rude or blunt. You paused awkwardly.',
    astonished:'It was hard to believe: so impressive or strange you double-checked.',
    stunned:'It hit you hard. You froze and could not say anything.'
  }},
  remember:'Taken aback: one small step backwards (an awkward moment). Astonished: eyes wide open (hard to believe). Stunned: frozen, as if hit (no reaction possible).',
  trap:'Taken aback is passive and usually takes "by": "I was taken aback by her tone." Never "It took me aback by".',
  quiz:[
    {s:'When she asked how much I earn in front of everyone, I was a little ___.', a:'taken aback', why:'A small, awkward surprise caused by a remark.'},
    {s:'The whole room fell into a ___ silence when the CEO announced she was resigning.', a:'stunned', why:'Shock so strong that nobody could react.'},
    {s:'Scientists were ___ to find the fish alive after decades in the frozen lake.', a:'astonished', why:'Hard to believe; amazing.'},
    {s:'Fans were left ___ after their team lost 7-0 at home; nobody moved.', a:'stunned', why:'Frozen by a heavy shock.'},
    {s:'I was ___ by how direct the feedback was, but it turned out to be useful.', a:'taken aback', why:'Briefly surprised and slightly uncomfortable.'},
    {s:'Visitors are always ___ at how small the famous painting actually is.', a:'astonished', why:'Surprised by something hard to believe.'}
  ]
},
{
  id:'good', plain:'good', title:'Saying it is good',
  plainRe:'good|nice|great',
  question:'How good: good enough, reliable, surprising or the best?',
  words:[
    {w:'decent',      cue:'Good enough; acceptable and fair.', level:1, reg:'casual', pat:'a decent SALARY/meal · PRETTY decent'},
    {w:'solid',       cue:'Reliable and well built; no weak points.', level:2, reg:'neutral', pat:'solid EVIDENCE/work · a solid PERFORMANCE'},
    {w:'remarkable',  cue:'Unusual enough to deserve comment; surprising in a good way.', level:3, reg:'neutral', pat:'a remarkable ACHIEVEMENT/recovery · REMARKABLY similar'},
    {w:'outstanding', cue:'Clearly better than all the others; excellent.', level:3, reg:'neutral', pat:'outstanding PERFORMANCE/results · TRULY outstanding'}
  ],
  pair:{ s:'She gave a ___ presentation.', v:{
    decent:'It was fine: nothing wrong, nothing special.',
    solid:'Well structured and reliable, with no weak points.',
    remarkable:'Something about it surprised people. Worth talking about afterwards.',
    outstanding:'The best of the day, far above the rest.'
  }},
  remember:'Climb the ladder: decent (fine) → solid (reliable) → outstanding (the best). Remarkable stands off to the side: it is about being surprising, not only good. (Compelling: so convincing you cannot ignore it.)',
  trap:'Outstanding also means "not yet paid or done": outstanding invoices, outstanding issues. Context decides.',
  quiz:[
    {s:'It is not a luxury hotel, but the rooms are clean and the breakfast is ___.', a:'decent', why:'Good enough, nothing more.'},
    {s:'The prosecution needs ___ evidence, not just rumours.', a:'solid', why:'Reliable, with no weak points.'},
    {s:'She made a ___ recovery; doctors had said she might never walk again.', a:'remarkable', why:'Surprising, worth comment.'},
    {s:'He was named player of the season after an ___ year.', a:'outstanding', why:'Better than everyone else.'},
    {s:'I am looking for a ___ job with fair pay; it does not have to be my dream career.', a:'decent', why:'Acceptable and fair.'},
    {s:'The team put in a ___ performance: no mistakes, nothing flashy.', a:'solid', why:'Dependable, without being spectacular.'}
  ]
},
{
  id:'bad', plain:'bad', title:'Saying it is bad',
  plainRe:'bad|terrible|awful',
  question:'Is it weak in one spot, depressing, or shocking?',
  words:[
    {w:'flawed',    cue:'Has a specific weakness or defect that spoils it.', level:1, reg:'formal', pat:'a flawed ARGUMENT/study · DEEPLY flawed'},
    {w:'dismal',    cue:'Depressingly bad; gloomy, with no hope or energy.', level:2, reg:'neutral', pat:'dismal RESULTS/weather · a dismal FAILURE'},
    {w:'appalling', cue:'Shockingly bad, in quality or morally.', level:3, reg:'neutral', pat:'appalling CONDITIONS/behaviour · ABSOLUTELY appalling'}
  ],
  pair:{ s:'The report was ___.', v:{
    flawed:'It has a specific weak point: the method or the data.',
    dismal:'The numbers were depressingly bad; everyone left the meeting gloomy.',
    appalling:'It was shockingly bad: careless, maybe even dishonest.'
  }},
  remember:'Flawed: a crack in the glass (find the weak spot). Dismal: a grey, rainy Monday (depressing). Appalling: it makes you gasp (shocking).',
  trap:'Appalling is already extreme: say "absolutely appalling", not "very appalling".',
  quiz:[
    {s:'The study is ___: it only surveyed twelve people, all from the same office.', a:'flawed', why:'One specific weakness spoils it.'},
    {s:'Refugees were living in ___ conditions, without clean water or heating.', a:'appalling', why:'Shockingly bad; morally upsetting.'},
    {s:'After another ___ quarter, the owners decided to close the shop.', a:'dismal', why:'Depressingly bad results.'},
    {s:'Rain all week and grey skies: the weather on our holiday was ___.', a:'dismal', why:'Gloomy, depressing.'},
    {s:'His treatment of the junior staff was ___; he shouted at them and insulted them daily.', a:'appalling', why:'Shocking behaviour.'},
    {s:'The plan sounds good in theory, but it is ___ in one key way: nobody budgeted for maintenance.', a:'flawed', why:'A specific defect.'}
  ]
},
{
  id:'important', plain:'important / big', title:'Saying it matters',
  plainRe:'important|big|huge',
  question:'Is it a turning point, essential, wide-reaching, or notable?',
  words:[
    {w:'pivotal',     cue:'A turning point: what comes after depends on it.', level:3, reg:'neutral', pat:'a pivotal MOMENT/role · pivotal IN sth'},
    {w:'vital',       cue:'Absolutely necessary; without it, things fail.', level:3, reg:'neutral', pat:'vital FOR/TO sth · it is vital THAT'},
    {w:'sweeping',    cue:'Wide-ranging; affects many things at once.', level:2, reg:'neutral', pat:'sweeping CHANGES/reforms · a sweeping GENERALISATION'},
    {w:'significant', cue:'Big or important enough to notice and matter; the neutral, data-friendly word.', level:2, reg:'formal', pat:'a significant INCREASE/impact · STATISTICALLY significant'}
  ],
  pair:{ s:'Her support was ___ to the project.', v:{
    vital:'Without it, the project would have failed.',
    pivotal:'It was the turning point; the project changed direction because of it.',
    significant:'It made a noticeable, real difference.',
    sweeping:'✗ Does not fit: sweeping describes changes or claims that cover a lot.'
  }},
  remember:'Pivotal: the hinge a door turns on. Vital: vital signs, you need it to live. Sweeping: a broom across the whole floor. Significant: big enough to show up in the numbers. (Crucial: decisive at a key moment. Substantial: large in amount.)',
  trap:'"A sweeping generalisation" is a criticism: a claim that covers far too much.',
  quiz:[
    {s:'The election of 1989 was a ___ moment in the country\'s history.', a:'pivotal', why:'A turning point.'},
    {s:'It is ___ that patients take the medicine at the same time every day.', a:'vital', why:'Absolutely necessary.'},
    {s:'The new government promised ___ reforms to healthcare, education and tax.', a:'sweeping', why:'Changes that cover many areas at once.'},
    {s:'The survey found a ___ increase in remote work since 2020.', a:'significant', why:'Noticeable and measurable.'},
    {s:'Clean water is ___ to the health of the village.', a:'vital', why:'Life depends on it.'},
    {s:'Saying all teenagers are lazy is a ___ generalisation.', a:'sweeping', why:'A claim that covers far too much.'}
  ]
},
{
  id:'show', plain:'show', title:'Showing',
  plainRe:'show|shows|showed|shown|showing',
  question:'Was it hidden, pointed at, emphasised again, or proved?',
  words:[
    {w:'reveal',      cue:'Make something hidden or secret known.', level:2, reg:'neutral', pat:'reveal a SECRET/the truth · reveal THAT'},
    {w:'highlight',   cue:'Draw attention to something so people notice it.', level:1, reg:'neutral', pat:'highlight the NEED/problem · highlight the IMPORTANCE of'},
    {w:'underscore',  cue:'Emphasise again something already known; make it more serious.', level:2, reg:'formal', pat:'underscore the NEED/importance · underscore HOW'},
    {w:'demonstrate', cue:'Prove with evidence, or show how something works.', level:2, reg:'formal', pat:'demonstrate THAT · demonstrate HOW to'}
  ],
  pair:{ s:'The data ___ a serious problem.', v:{
    reveals:'Nobody knew about it; now it is out in the open.',
    highlights:'It points at the problem so people pay attention.',
    underscores:'We already knew about it; the data makes it more urgent.',
    demonstrates:'It proves the problem exists, with evidence.'
  }},
  remember:'Reveal: open a curtain (hidden → seen). Highlight: a yellow marker (look here!). Underscore: a second line under something already written (now stronger). Demonstrate: show the proof or the steps.',
  trap:'Highlight is not "underline" in meaning. Highlight draws attention to something new; underscore adds weight to something already said.',
  quiz:[
    {s:'Leaked emails could ___ that the company knew about the fault for years.', a:'reveal', why:'Hidden information comes out.'},
    {s:'The chef will ___ how to make fresh pasta in under ten minutes.', a:'demonstrate', why:'Showing how something is done, step by step.'},
    {s:'This latest accident only serves to ___ the need for the stricter rules we have been calling for.', a:'underscore', why:'The need was already known; now it is stronger.'},
    {s:'In your cover letter, ___ the skills that match the job description.', a:'highlight', why:'Draw the reader\'s attention to them.'},
    {s:'The experiment was designed to ___ that the drug works better than a placebo.', a:'demonstrate', why:'Prove with evidence.'},
    {s:'The magician refused to ___ how the trick was done.', a:'reveal', why:'A secret would become known.'}
  ]
},
{
  id:'problem', plain:'problem', title:'Problems',
  plainRe:'problem|problems',
  question:'Does it push you back, stand in your way, or just catch you?',
  words:[
    {w:'setback', cue:'Something that moves your progress backwards.', level:2, reg:'neutral', pat:'SUFFER/face a setback · a MAJOR/minor setback'},
    {w:'hurdle',  cue:'An obstacle ahead that you must get over to continue.', level:2, reg:'neutral', pat:'CLEAR/overcome a hurdle · the FINAL hurdle'},
    {w:'snag',    cue:'A small, unexpected, often practical problem.', level:1, reg:'casual', pat:'HIT a snag · the ONLY snag is'}
  ],
  pair:{ s:'That was a ___ for the project.', v:{
    setback:'It pushed the project back; you lost ground.',
    hurdle:'It stood in the way and had to be overcome before you could go on.',
    snag:'A small hiccup, quickly fixed.'
  }},
  remember:'Setback: one step backwards on the board. Hurdle: a fence on the track; jump it to go on. Snag: a sleeve caught on a nail, small and annoying.',
  trap:'Setback (noun, one word) vs set back (verb): "The fire set the project back months. It was a major setback."',
  quiz:[
    {s:'The final ___ is getting planning permission from the city council.', a:'hurdle', why:'An obstacle ahead that must be cleared.'},
    {s:'Losing our lead engineer was a major ___; we are now three months behind.', a:'setback', why:'Progress went backwards.'},
    {s:'We hit a small ___: the hotel had no record of our booking, but they found us a room.', a:'snag', why:'A small, unexpected, practical problem.'},
    {s:'Language is often the biggest ___ for people moving abroad.', a:'hurdle', why:'An obstacle to get over.'},
    {s:'The only ___ is that the café does not take cards.', a:'snag', why:'A small practical drawback.'},
    {s:'Despite an early ___, a knee injury in March, she won the championship.', a:'setback', why:'Something that pushed her back.'}
  ]
},
{
  id:'change', plain:'change', title:'Changing',
  plainRe:'change|changes|changed|changing',
  question:'How big is the change?',
  words:[
    {w:'tweak',    cue:'A small adjustment to improve something.', level:1, reg:'casual', pat:'MAKE a few tweaks · tweak the SETTINGS/design'},
    {w:'shift',    cue:'A change in direction, position or attitude, often gradual.', level:2, reg:'neutral', pat:'a shift IN attitude · a shift TOWARDS sth'},
    {w:'overhaul', cue:'A complete repair or redesign of a whole system.', level:3, reg:'neutral', pat:'a COMPLETE overhaul · overhaul the SYSTEM'}
  ],
  pair:{ s:'The new manager wants to ___ the way we work.', v:{
    tweak:'A few small adjustments here and there.',
    shift:'Move it in a new direction, step by step.',
    overhaul:'Change everything, top to bottom.'
  }},
  remember:'Tweak: turn one small screw. Shift: the ground slowly moves (a new direction). Overhaul: take the whole engine apart and rebuild it.',
  trap:'All three work as nouns and verbs: a tweak / to tweak, a shift / to shift, an overhaul / to overhaul. "Shift in", not "shift of", for attitudes and opinions.',
  quiz:[
    {s:'The design is almost perfect; we just need to ___ the colours a little.', a:'tweak', why:'A small adjustment.'},
    {s:'The railway network is so old that it needs a complete ___.', a:'overhaul', why:'The whole system must be rebuilt.'},
    {s:'There has been a clear ___ in public opinion towards electric cars.', a:'shift', why:'A change of direction in attitude.'},
    {s:'After the scandal, the club promised to ___ its entire youth system.', a:'overhaul', why:'A complete redesign.'},
    {s:'I made one small ___ to the recipe: less sugar, more lemon.', a:'tweak', why:'A minor change.'},
    {s:'Remote work caused a major ___ in how cities use office space.', a:'shift', why:'A gradual change of direction.'}
  ]
},
{
  id:'numbers', plain:'increase / decrease', title:'Going up, going down',
  plainRe:'increase|increases|increased|decrease|decreases|decreased|go up|went up|go down|went down',
  question:'Up or down, and how fast?',
  words:[
    {w:'surge',    cue:'Rise suddenly and strongly, like a wave.', level:3, reg:'neutral', pat:'a surge IN demand · surge AHEAD'},
    {w:'soar',     cue:'Rise quickly to a very high level.', level:3, reg:'neutral', pat:'prices/temperatures soar · SOARING costs'},
    {w:'plummet',  cue:'Fall very fast and very far.', level:3, reg:'neutral', pat:'plummet TO a record low · shares plummet'},
    {w:'dwindle',  cue:'Become gradually smaller until little is left.', level:1, reg:'neutral', pat:'dwindle TO nothing · DWINDLING numbers/supplies'}
  ],
  pair:{ s:'Ticket sales ___ last month.', v:{
    surged:'A sudden wave upwards, maybe after a viral video.',
    soared:'They climbed to a very high level.',
    plummeted:'They crashed downwards, fast and far.',
    dwindled:'They slowly shrank, week after week.'
  }},
  remember:'Up: surge is a sudden wave; soar is a bird climbing high. Down: plummet is a stone dropping; dwindle is a candle slowly burning down.',
  trap:'Surge is very often a noun: "a surge in demand". Dwindle is slow; never use it for a crash.',
  quiz:[
    {s:'When the heatwave hit, demand for fans began to ___ overnight.', a:'surge', why:'A sudden, strong rise.'},
    {s:'The village\'s population continues to ___ as young people move to the cities.', a:'dwindle', why:'A slow decline.'},
    {s:'After the scandal, the share price could ___ by 60% in a single day.', a:'plummet', why:'A fast, steep fall.'},
    {s:'House prices in the capital continue to ___, reaching record highs.', a:'soar', why:'Rising to very high levels.'},
    {s:'Our supplies began to ___; by day five, we had only rice left.', a:'dwindle', why:'Gradually getting smaller.'},
    {s:'Temperatures can ___ to minus 20 overnight in the mountains.', a:'plummet', why:'A sharp, fast drop.'}
  ]
},
{
  id:'look', plain:'look', title:'Looking',
  plainRe:'look|looks|looked|looking',
  question:'How long, and with what feeling?',
  words:[
    {w:'glance', cue:'A quick look.', level:1, reg:'neutral', pat:'glance AT · glance THROUGH a report'},
    {w:'stare',  cue:'A long, fixed look, often rude or shocked.', level:2, reg:'neutral', pat:'stare AT sb · stare INTO space'},
    {w:'gaze',   cue:'A long, steady look, full of wonder, love or dreaminess.', level:2, reg:'formal', pat:'gaze AT/INTO · gaze OUT OF the window'},
    {w:'glare',  cue:'An angry look.', level:3, reg:'neutral', pat:'glare AT sb · an ANGRY glare'}
  ],
  pair:{ s:'She ___ at him across the room.', v:{
    glanced:'A quick look, maybe just to check.',
    stared:'A long, fixed look: shocked, or a bit rude.',
    gazed:'A long, soft look, full of love or wonder.',
    glared:'An angry look. He is in trouble.'
  }},
  remember:'A clock and a face. Glance: one second. Stare: long and blank. Gaze: long and dreamy. Glare: long and angry (glare rhymes with flare: fire in the eyes).',
  trap:'All four take "at": stare at someone, never "stare someone".',
  quiz:[
    {s:'She only had time to ___ at the headline before the bus came.', a:'glance', why:'A very quick look.'},
    {s:'It is rude to ___ at people on the train.', a:'stare', why:'A long, fixed look that makes people uncomfortable.'},
    {s:'On clear nights, she loves to lie outside and ___ at the stars.', a:'gaze', why:'A long, dreamy look full of wonder.'},
    {s:'When I interrupted him for the third time, he turned to ___ at me.', a:'glare', why:'An angry look.'},
    {s:'Could you ___ through this report before the meeting? It only takes five minutes.', a:'glance', why:'A quick look over something.'},
    {s:'Too tired to think, he could only sit and ___ into space.', a:'stare', why:'A long, blank look.'}
  ]
},
{
  id:'walk', plain:'walk', title:'Walking',
  plainRe:'walk|walks|walked|walking',
  question:'What is the mood, and how fast?',
  words:[
    {w:'stroll',  cue:'Walk slowly and relaxed, for pleasure.', level:1, reg:'neutral', pat:'stroll ALONG the beach · GO FOR a stroll'},
    {w:'stride',  cue:'Walk with long, confident, purposeful steps.', level:3, reg:'neutral', pat:'stride INTO the room · stride ACROSS'},
    {w:'trudge',  cue:'Walk slowly and heavily, tired or unwilling.', level:2, reg:'neutral', pat:'trudge THROUGH the snow · trudge HOME'},
    {w:'wander',  cue:'Walk with no fixed direction or purpose.', level:1, reg:'neutral', pat:'wander AROUND town · wander OFF'}
  ],
  pair:{ s:'He ___ down the street.', v:{
    strolled:'Relaxed, enjoying the evening.',
    strode:'Fast and confident; he has somewhere to be.',
    trudged:'Tired, heavy steps, maybe in the rain.',
    wandered:'No plan, just looking around.'
  }},
  remember:'Stroll: holiday feet. Stride: boss feet. Trudge: Monday feet in snow. Wander: lost-in-thought feet.',
  trap:'Wander (walk around) vs wonder (ask yourself): /ˈwɒndə/ vs /ˈwʌndə/. The past of stride is strode.',
  quiz:[
    {s:'After a long shift, the nurses had to ___ home through the heavy snow.', a:'trudge', why:'Slow, heavy, tired steps.'},
    {s:'On Sunday mornings we like to ___ along the river and stop for coffee.', a:'stroll', why:'A relaxed walk for pleasure.'},
    {s:'We had no map, so we just let ourselves ___ through the old town\'s alleys.', a:'wander', why:'No fixed direction.'},
    {s:'Watch her ___ into the boardroom like she owns the place.', a:'stride', why:'Long, confident steps.'},
    {s:'Keep an eye on the kids; they tend to ___ off in big shops.', a:'wander', why:'Moving away with no purpose.'},
    {s:'Soaked and exhausted, the hikers had to ___ the last five kilometres uphill.', a:'trudge', why:'Unwilling, heavy walking.'}
  ]
},
{
  id:'very', plain:'very / really', title:'Instead of "very"',
  plainRe:'very|really|so much',
  question:'What kind of adjective comes next?',
  words:[
    {w:'utterly',  cue:'With extreme or absolute adjectives: ridiculous, exhausted, impossible.', level:3, reg:'neutral', pat:'utterly RIDICULOUS/exhausted · utterly CONVINCED'},
    {w:'deeply',   cue:'With feelings, beliefs and roots: moved, concerned, rooted.', level:2, reg:'neutral', pat:'deeply MOVED/concerned · deeply ROOTED'},
    {w:'highly',   cue:'With likelihood and ratings: likely, unlikely, recommended, skilled.', level:2, reg:'formal', pat:'highly LIKELY/unlikely · highly RECOMMENDED/skilled'},
    {w:'bitterly', cue:'With disappointment, regret, cold and conflict.', level:3, reg:'neutral', pat:'bitterly DISAPPOINTED/cold · bitterly REGRET'}
  ],
  partners:{
    utterly:['ridiculous','exhausted','impossible','convinced','brilliant'],
    deeply:['moved','concerned','rooted','grateful','regret'],
    highly:['likely','unlikely','recommended','skilled','effective'],
    bitterly:['disappointed','cold','regret','divided','complain']
  },
  remember:'Utterly: 100%, extreme words only. Deeply: down to the heart (feelings and beliefs). Highly: high up on a scale (chances and ratings). Bitterly: a bitter taste (disappointment, regret, cold).',
  trap:'Do not put utterly before ordinary adjectives: "utterly good" ✗, "utterly brilliant" ✓. Highly is not for feelings: "highly sad" ✗, "deeply sad" ✓.',
  quiz:[
    {s:'It is ___ unlikely that the train will be on time in this weather.', a:'highly', why:'Likelihood goes with highly.'},
    {s:'I was ___ moved by her speech about her father.', a:'deeply', why:'A feeling that goes to the heart.'},
    {s:'After a 14-hour flight next to a crying baby, I was ___ exhausted.', a:'utterly', why:'Exhausted is already extreme.'},
    {s:'The fans were ___ disappointed to lose in the last minute.', a:'bitterly', why:'Disappointment pairs with bitterly.'},
    {s:'This restaurant comes ___ recommended by everyone at work.', a:'highly', why:'A rating: highly recommended.'},
    {s:'It was a ___ cold night, and the wind cut through our coats.', a:'bitterly', why:'Bitterly cold is the fixed pairing.'},
    {s:'The custom is ___ rooted in the region\'s history.', a:'deeply', why:'Roots and beliefs go deep.'}
  ]
}
];

/* Write sekmesi: yazma görevleri. targets: metinde aranan kelimeler. */
const SHADES_PROMPTS = [
  {id:'day',    title:'A day that went wrong, then right', task:'Tell the story of a day that started badly and ended well. Show how your feelings changed along the way.', targets:['thrilled','delighted','relieved','content','irritated','fed up','furious','anxious','uneasy','stunned','taken aback']},
  {id:'review', title:'Review something', task:'Review a film, a café, a product or a book. Say what worked and what did not, and how much.', targets:['decent','solid','remarkable','outstanding','flawed','dismal','appalling','highly','utterly','deeply']},
  {id:'trend',  title:'Describe a trend', task:'Pick something that went up or down: prices, a habit, a number at work, something in the news. Describe what happened and what it shows.', targets:['surge','soar','plummet','dwindle','significant','shift','reveal','highlight','underscore','demonstrate']},
  {id:'place',  title:'A walk through a place', task:'Describe a walk through a street, a park, a market or a station. What did you see, and how did people move and look?', targets:['stroll','stride','trudge','wander','glance','stare','gaze','glare']},
  {id:'work',   title:'A problem and how it was solved', task:'Describe a problem at work, at school or at home, and what was done about it.', targets:['setback','hurdle','snag','tweak','shift','overhaul','pivotal','vital','sweeping','wary']},
  {id:'rewrite',title:'Rewrite an old text', task:'Paste something you wrote before (a message, an email, an essay) and rewrite it without the plain words. The counter below shows what is left.', targets:[]},
  {id:'free',   title:'Free writing', task:'Write about anything. Try to replace every plain word the counter finds.', targets:[]}
];
