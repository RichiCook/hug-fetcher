import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Direct product_code → Line mapping from the official Casadei spreadsheet
const PRODUCT_CODE_TO_LINE: Record<string, string> = {
  // Ale (3)
  '3W383W0000LOVEC9000': 'Ale', '2R524A0411VELOU2506': 'Ale', '2R525A0411VELOU2506': 'Ale',
  // Annabel (2)
  '1L450B100MC29319999': 'Annabel', '1L450B100MC29319000': 'Annabel',
  // Antilope (2)
  '1A253X0101C23632608': 'Antilope', '1D283J0101C23633217': 'Antilope',
  // Avenida (6)
  '1L419B0501C29362625': 'Avenida', '1H069B0101C29452625': 'Avenida', '1H068B1001C29399000': 'Avenida',
  '1L421B1001C29349999': 'Avenida', '1H064B1001C29392605': 'Avenida', '1M501B0801C29472804': 'Avenida',
  // Ballet (7)
  '1A305B0101C30054201': 'Ballet', '1A305B0101C30055315': 'Ballet', '1G671B0101TIFFA9999': 'Ballet',
  '1A289J0101C28062804': 'Ballet', '1A290J0101C28013301': 'Ballet', '1A289J0101C28081400': 'Ballet',
  '1A290J0101C28019999': 'Ballet',
  // Beat (2)
  '1Q202Y0501C18342403': 'Beat', '1Q202Y0501C25269000': 'Beat',
  // Beaurivage (9)
  '3W457J0000BEAURMTCL': 'Beaurivage', '3W457J0000BEAUR9999': 'Beaurivage', '3W436Y0000LOVEC9000': 'Beaurivage',
  '3W382W0000LOVEC9000': 'Beaurivage', '3W380V0000BEAUR9000': 'Beaurivage', '3W380V0000BEAUR9999': 'Beaurivage',
  '3W379V0000BEAUR2804': 'Beaurivage', '3W380V0000BEAUR2615': 'Beaurivage', '3W379V0000BEAURMTCL': 'Beaurivage',
  // Belle (1)
  '1N253B0301C29709000': 'Belle',
  // Betty (2)
  '1H977W1201MINOR4104': 'Betty', '1H977W1201MINOR9999': 'Betty',
  // Blade (60)
  '1F916W120MC11909000': 'Blade', '1T000D125MC18942616': 'Blade', '1T022V120MC21493106': 'Blade',
  '1R665E120TT00059000': 'Blade', '1R665E120MC21489000': 'Blade', '1R665E120MC21492616': 'Blade',
  '1R665E120MC2274': 'Blade', '1T076A100MC18329000': 'Blade', '1T076A100MC18322403': 'Blade',
  '1L556P120MAMINO9999': 'Blade', '1L556P120MAMINO9000': 'Blade', '1F916W120MSELEN9700': 'Blade',
  '1F916W120MINTER9700': 'Blade', '1F916W120MINTER4208': 'Blade', '1F916W120MINTER1301': 'Blade',
  '1T000D125TT02389000': 'Blade', '1F916W120MC11559000': 'Blade', '1L162W120MT03959999': 'Blade',
  '1M889V100MC11559999': 'Blade', '1T000D125TT00059000': 'Blade', '1T023V100MC21489000': 'Blade',
  '1F916W120MC14449000': 'Blade', '1L166W120MC21549000': 'Blade', '1F916W120TMINOR9999': 'Blade',
  '1F916W120TMINOR9000': 'Blade', '1F915W100MTRINI9998': 'Blade', '1F915W100MTRINI9701': 'Blade',
  '1F915W100MTRINI1105': 'Blade', '1F916W120MINTER4415': 'Blade', '1F916W120MINTER3306': 'Blade',
  '1F916W120MINTER5411': 'Blade', '1F915W100MC11559000': 'Blade', '1F915W100MC11552605': 'Blade',
  '1F915W100MC1155': 'Blade', '1H052B100MC29243614': 'Blade', '1H052B100MC13139000': 'Blade',
  '1F940X100MC29243614': 'Blade', '1F940X100MC2924': 'Blade', '1L413B080MC29243203': 'Blade',
  '1L413B100MC11552605': 'Blade', '1L413B100MC11559000': 'Blade', '1L446B100MC29684415': 'Blade',
  '1L446B100MC29681306': 'Blade', '1L446B100MC2966': 'Blade', '1H060B100MINTER4415': 'Blade',
  '1L413B100MC2627': 'Blade', '1R475Y100MC2149': 'Blade', '1R672H100TT0005': 'Blade',
  '1S329Y100MC18329000': 'Blade', '1S329Y100MC18322403': 'Blade', '1H038A100TT05344408': 'Blade',
  '1S329Y100MC18323702': 'Blade', '1S330Y100MC22749000': 'Blade', '1S330Y100MC22742608': 'Blade',
  '1F916W120TSATIN3302': 'Blade', '1F916W120TSATIN9000': 'Blade', '1L488N120MC05969000': 'Blade',
  '1L488N120MC03529000': 'Blade', '1L488N120MC05963200': 'Blade', '1M889V100MC11559000': 'Blade',
  // Brera (3)
  '3W486A0000BRRDM4408': 'Brera', '3W486A0000BRRDM9000': 'Brera', '3W486A0000BRRON3217': 'Brera',
  // Cappa Blade (12)
  '1LG50D125MC26265315': 'Cappa Blade', '1LG50D125MC26272807': 'Cappa Blade',
  '1LG40D100MC11559000': 'Cappa Blade', '1LG40D100MC11553302': 'Cappa Blade',
  '1LG50D125MAMINO4104': 'Cappa Blade', '1LG50D125MTRINI9701': 'Cappa Blade',
  '1LG40D100MTRINI9998': 'Cappa Blade', '1LG40D100TT0555B032': 'Cappa Blade',
  '1LG50D125MTRINI1105': 'Cappa Blade', '1LG50D125TTRINI9001': 'Cappa Blade',
  '1LG50D125MATIFN': 'Cappa Blade', '1L432B120TT05769000': 'Cappa Blade',
  // Cathedral (2)
  '1N249B0101CATHEZZZZ': 'Cathedral', '1F045B100MCATHEZZZZ': 'Cathedral',
  // Chantilly (3)
  '1A307B0101T05773301': 'Chantilly', '1F054B100MT05773206': 'Chantilly', '1G680B080TT05779000': 'Chantilly',
  // Charlie (8)
  '1S357Y0301LAABR9000': 'Charlie', '1S357Y0301ARCEU2413': 'Charlie',
  '1R480Y0301STATU9000': 'Charlie', '1R480Y0301STATU3121': 'Charlie',
  '1S334Y0301STATU3121': 'Charlie', '1S334Y0301STATU9000': 'Charlie',
  '1S346Y0301T0499': 'Charlie', '1S346Y0301T0499B273': 'Charlie',
  // Cleo (1)
  '1M510B0801C2963B338': 'Cleo',
  // Concept (6)
  '1R543A0311C28842403': 'Concept', '1R542A0811C28843119': 'Concept',
  '1D315A0811C28842403': 'Concept', '1R523A0301C28589000': 'Concept',
  '1R522A0801C28589000': 'Concept', '1S370A0801C28589000': 'Concept',
  // Criss (1)
  '1L556P120MAMINO3107': 'Criss',
  // Crystal (2)
  '1A283J0101C26759999': 'Crystal', '1A283J0101C26759000': 'Crystal',
  // Dami (2)
  '2Q209A0211RENNA3219': 'Dami', '2Q209A0211RENNA8500': 'Dami',
  // Damier (2)
  '1M441J1001T0264': 'Damier', '1M441J0501T02642615': 'Damier',
  // Demetra (1)
  '3W382W0000DEMET2608': 'Demetra',
  // Divine (4)
  '1F036A100MC29039000': 'Divine', '1F038A0801C29039000': 'Divine',
  '1L407A1001C29039000': 'Divine', '1L408A0801C29039000': 'Divine',
  // Dome (2)
  '3W471J0000NAPON2403': 'Dome', '3W468J0000NAPON9000': 'Dome',
  // Double Face (14)
  '2S336Y0801RENNA3219': 'Double Face', '2S399A0811T05623121': 'Double Face',
  '2S395A081NT05569000': 'Double Face', '2S399A0811T0562': 'Double Face',
  '2S395A0811T0556': 'Double Face', '2S397A081NSUBZE9000': 'Double Face',
  '2S394A0811T0561B329': 'Double Face', '2S397A0811SUBLEZZZZ': 'Double Face',
  '2S399A0811T05622403': 'Double Face', '2S336Y0801RENNA2403': 'Double Face',
  '2S336Y0801RENNA3702': 'Double Face', '1S398A0801T0561B329': 'Double Face',
  '1S398A0801T05619000': 'Double Face', '2X082A0801SALEN3206': 'Double Face',
  // Emily (2)
  '1A296A0101C28494408': 'Emily', '1F011A0501SAMUR4408': 'Emily',
  // Flash (1)
  '1A283J0101C26769700': 'Flash',
  // Flat (1)
  '1M442J0101T02642804': 'Flat',
  // Flora (20)
  '1F156E1401CAMOS9000': 'Flora', '1T028W1401ARCEU2616': 'Flora',
  '1F324K1401TIFFA9000': 'Flora', '1L214L1401TIFFA9000': 'Flora',
  '1T831E1401T00059000': 'Flora', '1T028W1401ARCEU9000': 'Flora',
  '1R627L1401T00059000': 'Flora', '1L287Y1401INTER4208': 'Flora',
  '1L287Y1401INTER9700': 'Flora', '1L287Y1401INTER1100': 'Flora',
  '1L287Y1401MINOR9000': 'Flora', '1L287Y1401MINOR4104': 'Flora',
  '1T831E1401T00539000': 'Flora', '1T028W1401ARCEU3810': 'Flora',
  '1R627L1401T00539000': 'Flora', '1L091V1401INTER4415': 'Flora',
  '1L287Y1401SAMUR3614': 'Flora', '1L287Y1401SOLAE4201': 'Flora',
  '1L428B1401SOLAE9700': 'Flora', '1L091V1401SOLEC3300': 'Flora',
  // Geraldine (1)
  '1R417W1001LABBB9000': 'Geraldine',
  // Goldmember (2)
  '1R535A0501C28999000': 'Goldmember', '1S383A0501C28999000': 'Goldmember',
  // Hanoi (5)
  '1A255X0101C23665315': 'Hanoi', '1A255X0101C23662615': 'Hanoi',
  '1A255X0101C23666404': 'Hanoi', '1M934V0801T04172801': 'Hanoi', '1M934V0801T0417': 'Hanoi',
  // High (6)
  '2X023Y0801SALEN9999': 'High', '2X023Y080NSALEN9000': 'High',
  '2X082A0801RENNA8500': 'High', '2X082A0801RENNA2710': 'High',
  '2X082A0801RENNA3121': 'High', '2X023Y0801NOMAD2403': 'High',
  // Interstellar (2)
  '1L405A1301INTER1100': 'Interstellar', '1L405A1301INTER9700': 'Interstellar',
  // Jelly (23)
  '2Y263B0101BEACH6301': 'Jelly', '2Y000D0101BEACH3607': 'Jelly',
  '2Y010D0101BEACH': 'Jelly', '2Y010D0101BEACH3114': 'Jelly',
  '2Y010D0101BEACH9600': 'Jelly', '2Y010D0101BEACH9000': 'Jelly',
  '2Y000D0101BEACH3401': 'Jelly', '2Y255J0101BHGLTC146': 'Jelly',
  '2Y263B0101BEACH6706': 'Jelly', '2Y263B0101BEACH1306': 'Jelly',
  '2Y264B0101BHGLTC147': 'Jelly', '2Y263B0101BEACH9000': 'Jelly',
  '2Y268B0101BECPEA513': 'Jelly', '2Y269B0101BEAPE9000': 'Jelly',
  '2Y269B0101BEAPE3401': 'Jelly', '2Y250X0101APBEA3114': 'Jelly',
  '2Y250X0101APBEA4109': 'Jelly', '2Y252X0101APBEA3401': 'Jelly',
  '2Y250X0101APBEA2309': 'Jelly', '2Y254X0101APBEA9000': 'Jelly',
  '2Y256J0101BHGLTA514': 'Jelly', '2Y255J0101BHGLTA513': 'Jelly',
  '2Y255J0101BHGLTB294': 'Jelly',
  // Josephine (6)
  '1M524B0101C2955C134': 'Josephine', '1N251B0101C2952A317': 'Josephine',
  '1L439B1001C2952A317': 'Josephine', '1L436B0801C2955C134': 'Josephine',
  '1L438B1001C2953B176': 'Josephine', '1H072B0801C2955C135': 'Josephine',
  // Julia (32)
  '1F911W1001MINOR9000': 'Julia', '1T012Z1001NEONA9000': 'Julia',
  '1T012Z1001ARCEU2616': 'Julia', '1T012Z1001ARCEU9000': 'Julia',
  '1H034A1001CAMOS9000': 'Julia', '1L414B1001TIFFA9999': 'Julia',
  '1L414B1001TIFFA9000': 'Julia', '1L418B1001INTER4415': 'Julia',
  '1L418B1001INTER9700': 'Julia', '1M407J0801MINOR9000': 'Julia',
  '1F993J0501MINOR3200': 'Julia', '1F911W0801MINOR4104': 'Julia',
  '1L293J1001MINOR9999': 'Julia', '1G619J1001MINOR9000': 'Julia',
  '1G652A0801MINOR2212': 'Julia', '1F014A0801MINOR9000': 'Julia',
  '1F009A1001C28329000': 'Julia', '1F009A1001C28323200': 'Julia',
  '1F014A0801T05209999': 'Julia', '1S363A0501PLONG9000': 'Julia',
  '1F911W1001TIFFA': 'Julia', '1F911W1001MINOR9999': 'Julia',
  '1G669B1001SAMUR3203': 'Julia', '1L445B0801C29673306': 'Julia',
  '1L420B0801INTER1100': 'Julia', '1L420B0801INTER5411': 'Julia',
  '1L420B1001SATIN4805': 'Julia', '1L420B1001SATIN9999': 'Julia',
  '1L420B1001SATIN3601': 'Julia', '1L305J1001T05069000': 'Julia',
  '1G670B0501SAMUR3614': 'Julia', '1G621J0501MINOR3302': 'Julia',
  // K-Blade (1)
  '1H071B060MINTER9700': 'K-Blade',
  // Knee-high (1)
  '1S404A080MC29079000': 'Knee-high',
  // Kroccobel (1)
  '1D268Y0101C26203202': 'Kroccobel',
  // Leather Ballet (2)
  '1A285J0101C23633217': 'Leather Ballet', '1A285J0101C23639000': 'Leather Ballet',
  // Liberty (9)
  '1A291A0101C28673713': 'Liberty', '1A291A0101C28679000': 'Liberty',
  '1F940X100MC28379999': 'Liberty', '1F940X100MC28369000': 'Liberty',
  '1F940X100MC2836': 'Liberty', '1H038A100MT05469000': 'Liberty',
  '2X894U0701T05429999': 'Liberty', '2X894U070NT05429000': 'Liberty',
  '2X869T0201C28673713': 'Liberty',
  // Lingerie (2)
  '1T082A120TLNGRE9000': 'Lingerie', '1F024A120TLINGE9000': 'Lingerie',
  // Malesia (6)
  '1A283J0101C2894ZZZZ': 'Malesia', '1Q202Y0501C2865ZZZZ': 'Malesia',
  '1F915W100TMALESZZZZ': 'Malesia', '1G660A080TMALESZZZZ': 'Malesia',
  '2X894U0701MALESZZZZ': 'Malesia', '2X869T0201C2865ZZZZ': 'Malesia',
  // Marta (2)
  '1L162W120MT05149700': 'Marta', '1L162W120MC2933': 'Marta',
  // Maxxxi (4)
  '2R360Z070NC15119000': 'Maxxxi', '2Q178Z070NNEONA9000': 'Maxxxi',
  '2S263Z070NNEONA9000': 'Maxxxi', '2R360Z0701C15119999': 'Maxxxi',
  // Mia (5)
  '2J924A0211MIAMOMULT': 'Mia', '2J924A0211MIAMOMTCL': 'Mia',
  '2J918A0201RNWSH2413': 'Mia', '2J918A0201RNWSH5807': 'Mia', '2J918A0201RNWSH2612': 'Mia',
  // Michelle (4)
  '1M464J1001T02689999': 'Michelle', '1T079A1001NOMAD3121': 'Michelle',
  '1F982Y1001TIFFA9000': 'Michelle', '1S335Y1001LABBB': 'Michelle',
  // Milano (1)
  '3W484A0000MLNVL3121': 'Milano',
  // Mini (3)
  '3W492B0000VDMNO9999': 'Mini', '3W492B0000VDMNO6403': 'Mini', '3W492B0000VDMNO5204': 'Mini',
  // Mule (1)
  '1M413J080MC29245412': 'Mule',
  // Muni (5)
  '1R534A0501T04409000': 'Muni', '1T081A0501NOMAD9000': 'Muni',
  '1S376A0501NOMAD2403': 'Muni', '1R528A0501NOMAD3121': 'Muni', '1S388A0501T04409000': 'Muni',
  // Nancy (7)
  '1R538A1201NOMAD9000': 'Nancy', '1R538A1201NOMAD3702': 'Nancy',
  '1R538A1201NOMAD2403': 'Nancy', '1S246Z1201RENNA3121': 'Nancy',
  '1S246Z1201RENNA2403': 'Nancy', '1S246Z1201RENNA3702': 'Nancy', '1S246Z1201RENNA9000': 'Nancy',
  // New (8)
  '1A298A0111C25112621': 'New', '1A298A0111C25119000': 'New', '1A298A0111C28719999': 'New',
  '1D312A0111C29122621': 'New', '1D312A0111C29129000': 'New',
  '2S336Y0801RENNA3121': 'New', '2S338Y080NNOMAD9000': 'New', '1M443J0201C27229999': 'New',
  // Nexus (54)
  '2T009T070NNEONA9000': 'Nexus', '2R308T070NC15119000': 'Nexus',
  '2S227T070NRENNA9000': 'Nexus', '2X097B0701C29839999': 'Nexus',
  '2X094B0701C29869999': 'Nexus', '2X894U070NSALEN9000': 'Nexus',
  '2X102B0701C29793206': 'Nexus', '2X119B0701NXPIC7705': 'Nexus',
  '2X097B0701C29823206': 'Nexus', '2X094B0701C29853206': 'Nexus',
  '2Q160T070NLABBB9000': 'Nexus', '2X091A070NT05649000': 'Nexus',
  '2X091A0701T05643219': 'Nexus', '2X924Z0711T05439607': 'Nexus',
  '2X080A071NT04349000': 'Nexus', '2X924Z0711T05432403': 'Nexus',
  '2X104B0701C2980B341': 'Nexus', '2X113B0701T0583B347': 'Nexus',
  '2X090A0701C29143219': 'Nexus', '2X090A070NC29119000': 'Nexus',
  '2X043J0701FLORE3206': 'Nexus', '2X896U0701HANOI3301': 'Nexus',
  '2X896U0701HANOI2615': 'Nexus', '2X896U0701HANOI9999': 'Nexus',
  '2X894U0701SALEN9999': 'Nexus', '2X044J0701SALEN9999': 'Nexus',
  '2X044J070NSALEN9000': 'Nexus', '2X116B0701C29935315': 'Nexus',
  '2X116B0701C29934208': 'Nexus', '2X116B0701C29931306': 'Nexus',
  '2X067J070NSALEN9000': 'Nexus', '2X104B0701C2980B339': 'Nexus',
  '2X068J0701HANOI9999': 'Nexus', '2X068J0701HANOI2804': 'Nexus',
  '2X067J0701SALEN9999': 'Nexus', '2X976W0701C21872621': 'Nexus',
  '2X976W070NC21889000': 'Nexus', '2X975W0701C21879999': 'Nexus',
  '2X063J0701C29139998': 'Nexus', '2X063J0701C29139701': 'Nexus',
  '2X924Z0711T05432704': 'Nexus', '2X084A0701C17953206': 'Nexus',
  '2X084A070NC17959000': 'Nexus', '2X076A070NSALEN9000': 'Nexus',
  '2X076A0701SALEN9999': 'Nexus', '2X063J0701C29191100': 'Nexus',
  '2X081A0701C17959999': 'Nexus', '2X081A070NC17959000': 'Nexus',
  '2X041J0701C2981B342': 'Nexus', '2X041J0701C2988B343': 'Nexus',
  '2X037Y070NC26149000': 'Nexus', '2X037Y0701C26139999': 'Nexus',
  '2X895U0701T0268': 'Nexus', '2X895U0701T02689999': 'Nexus',
  // Nuova Mun (5)
  '1S387A0511HIPPO3220': 'Nuova Mun', '1S387A0511HIPPO2500': 'Nuova Mun',
  '1F033A0501C19229000': 'Nuova Mun', '1F035A0501C21982621': 'Nuova Mun',
  '1S384A0511C21979999': 'Nuova Mun',
  // Off Road (13)
  '2X822P0201HANOI9000': 'Off Road', '2X822P0201HANOI9999': 'Off Road',
  '2X822P0201HANOI2804': 'Off Road', '2X100B0201C29793206': 'Off Road',
  '2X089A0201C29113219': 'Off Road', '2X940V0201C19709999': 'Off Road',
  '2X869T0201C18639999': 'Off Road', '2X022Y0201ORMLKZZZZ': 'Off Road',
  '2X869T020NC22099000': 'Off Road', '2X096B0201C29849999': 'Off Road',
  '2X117B0201C29935204': 'Off Road', '2X052J0201C2672A005': 'Off Road',
  '2X075A0201C17959999': 'Off Road',
  // Over (1)
  '1T069Y100MC21493810': 'Over',
  // Panarea (2)
  '3W431X0000PANARA579': 'Panarea', '3W432X0000PANARC074': 'Panarea',
  // Park Avenue (9)
  '3W485A0000PAKDM3121': 'Park Avenue', '3W458J0000PKAVN9000': 'Park Avenue',
  '3W458J0000PKAVN2804': 'Park Avenue', '3W458J0000PKAVN3217': 'Park Avenue',
  '3W458J0000PAKDM4408': 'Park Avenue', '3W485A0000PKIMG2605': 'Park Avenue',
  '3W485A0000PKIMG2403': 'Park Avenue', '3W458J0000PAKVL2403': 'Park Avenue',
  '3W485A0000PAKVL4408': 'Park Avenue',
  // Passage (2)
  '1D320B0201C23633115': 'Passage', '1D320B0201C23633113': 'Passage',
  // Patty (11)
  '1R532A1301LAABD2608': 'Patty', '1R532A1301LAABD9000': 'Patty',
  '1L405A1301DREAM3217': 'Patty', '1T084A1301LAABD2608': 'Patty',
  '1L405A1301NOMAD2611': 'Patty', '1G659A1301NOMAD2624': 'Patty',
  '1L404A1301CAMOS4507': 'Patty', '1R532A1301ARCEU3106': 'Patty',
  '1H046A1301CAMOS9000': 'Patty', '1G659A1301CAMOS2413': 'Patty',
  '1S381A1301LOVEC9000': 'Patty',
  // Platform (2)
  '1L444B1301C29671100': 'Platform', '1M514B1301C29679700': 'Platform',
  // Pon Pon (2)
  '3W482A0000PONND9000': 'Pon Pon', '3W482A0000PONND4408': 'Pon Pon',
  // Positano (3)
  '1M449J0101POSIT2615': 'Positano', '1M449J0101POSIT9999': 'Positano', '1M449J0101POSIT9000': 'Positano',
  // Reflex (1)
  '1G683B0501C29623200': 'Reflex',
  // ReflexCleo (1)
  '1L442B0501C2963B335': 'ReflexCleo',
  // Riderama (7)
  '1S371A0211C28849000': 'Riderama', '1S371A0211C28842413': 'Riderama',
  '1R516A0201C28799000': 'Riderama', '1S365A0501C28794408': 'Riderama',
  '1S364A0201C28799000': 'Riderama', '1S372A0201C28589000': 'Riderama',
  '1S372A0201C28582604': 'Riderama',
  // Riviera (1)
  '3W478J0000B03599000': 'Riviera',
  // Samurai (14)
  '1F010A100MC2834': 'Samurai', '1F915W100MC2834': 'Samurai',
  '1F915W100MC28343203': 'Samurai', '1F010A100MC14449000': 'Samurai',
  '1F915W100MC28349406': 'Samurai', '1G647A100MC2834': 'Samurai',
  '1G647A080MC28345807': 'Samurai', '1H032A1001SAMUR3203': 'Samurai',
  '1F911W1001SAMUR5807': 'Samurai', '1H035A0501SAMUR4408': 'Samurai',
  '1F013A1001SAMUR4408': 'Samurai', '1H036A1001TIFFA9000': 'Samurai',
  '1L287Y1401SAMUR4408': 'Samurai', '1L287Y1401SAMUR3203': 'Samurai',
  // Scarpa (1)
  '1F911W1001MINOR3302': 'Scarpa',
  // Sirio (5)
  '1M507B0101C2964A317': 'Sirio', '1M508B100HC2958A850': 'Sirio',
  '1L434B1001T05789700': 'Sirio', '1M506B0801C2960A547': 'Sirio', '1M505B0801C2958': 'Sirio',
  // Slingback (2)
  '1H058B100MINTER1100': 'Slingback', '1G662A080MC29079000': 'Slingback',
  // Sneakers (2)
  '2X108B0701C30169998': 'Sneakers', '2X108B0701C30164208': 'Sneakers',
  // Solar (3)
  '1L305J1001T05721306': 'Solar', '1L305J1001T05726504': 'Solar', '1L420B0801SOLAE9700': 'Solar',
  // Soraya (2)
  '1N234J0101SOLAC9700': 'Soraya', '1N234J0101SOLAC1200': 'Soraya',
  // Starsway (11)
  '1F016A080TT0526B048': 'Starsway', '1L396A100MT0529A905': 'Starsway',
  '1L395A100TT05289000': 'Starsway', '1L396A080TT05289000': 'Starsway',
  '1L400A0801T05359700': 'Starsway', '1L394A120TT0527C033': 'Starsway',
  '3W480A0000AFERA9000': 'Starsway', '3W480A0000INTER9700': 'Starsway',
  '1L402A1001T0535': 'Starsway', '1L402A1001T05369000': 'Starsway',
  '1L401A0801T0531C033': 'Starsway',
  // Stitch (2)
  '2X086A0201ORSTI9606': 'Stitch', '2X087A0201ORSTI9000': 'Stitch',
  // Suede (2)
  '1T908L100TT0005': 'Suede', '1G660A080TCAMOS2413': 'Suede',
  // Superblade (11)
  '1H061B100MC11559000': 'Superblade', '1F920W100MC14449000': 'Superblade',
  '1G590X100MC14819000': 'Superblade', '1F023A100MCAMOS9000': 'Superblade',
  '1G676B100MC13139000': 'Superblade', '1G678B100MC13139999': 'Superblade',
  '1G590X080MC29246706': 'Superblade', '1G590X080MC29242309': 'Superblade',
  '1F023A100MCAMOS4802': 'Superblade', '1F023A100MCAMOS5807': 'Superblade',
  '1S331Y080MC22454408': 'Superblade',
  // Twiga (1)
  '1M727S0201T03052615': 'Twiga',
  // Universe Blade (3)
  '1Q210A100TUNIVE9000': 'Universe Blade', '1S400A080TUNIVE9000': 'Universe Blade',
  '1F040A100TUNIVE9000': 'Universe Blade',
  // V Celebrity (1)
  '1L488N120MC2629': 'V Celebrity',
  // Valsenales (5)
  '1D264Y0101C25192621': 'Valsenales', '1D298A0111C28712621': 'Valsenales',
  '1D299A0111C28712621': 'Valsenales', '1D298A0111C25119000': 'Valsenales',
  '1D299A0111C25119000': 'Valsenales',
  // Vandome (5)
  '3W483A0000VDMVL8500': 'Vandome', '3W483A0000VDMNO': 'Vandome',
  '3W488A0000VDMSZ9999': 'Vandome', '3W488A0000VDMSZ9000': 'Vandome',
  '3W483A0000VDMNO4208': 'Vandome',
  // Vegas (1)
  '1N250B0101C29549000': 'Vegas',
  // Venus (8)
  '1S403A0801T0540B032': 'Venus', '1H047A0801T0540B032': 'Venus',
  '1L406A0801T0540B032': 'Venus', '1M512B0801SAMUR5204': 'Venus',
  '1T088A0801NOMAD2608': 'Venus', '1T089A0801ARCEU2413': 'Venus',
  '1L406A0801T05399000': 'Venus', '1H075B0801SAMUR1306': 'Venus',
  // Versilia (3)
  '1D278J0101C19672804': 'Versilia', '1D278J0101C19679999': 'Versilia',
  '2X951V0201C19673301': 'Versilia',
  // Winnie (1)
  '1F000J0801WTIFF9999': 'Winnie',
  // Zeppa (1)
  '1M484J0801T03059999': 'Zeppa',
};

// Updated line names for fallback name-based matching
const LINE_NAMES = [
  // Multi-word names first (longest first to avoid false matches)
  'Universe Blade', 'Leather Ballet', 'Cappa Blade', 'Double Face', 'Park Avenue',
  'Nuova Mun', 'Off Road', 'Pon Pon', 'V Celebrity', 'ReflexCleo',
  'Knee-high', 'Kroccobel', 'Goldmember', 'Interstellar', 'K-Blade',
  'Superblade', 'Beaurivage', 'Starsway', 'Valsenales', 'Chantilly',
  'Cathedral', 'Josephine', 'Positano', 'Riderama',
  'Versilia', 'Offroad', 'Lingerie', 'Geraldine',
  'Malesia', 'Michelle', 'Milano',
  'Annabel', 'Antilope', 'Avenida', 'Ballet', 'Beaurivage',
  'Blade', 'Brera', 'Charlie',
  'Concept', 'Crystal', 'Damier', 'Demetra', 'Divine',
  'Flora', 'Hanoi', 'Jelly', 'Julia',
  'Liberty', 'Maxxxi', 'Marta', 'Nancy', 'Nexus',
  'Panarea', 'Passage', 'Patty',
  'Platform', 'Reflex', 'Riviera', 'Samurai', 'Scarpa',
  'Sirio', 'Sneakers', 'Solar', 'Soraya', 'Stitch',
  'Twiga', 'Vandome', 'Vegas', 'Venus', 'Winnie',
  'Zeppa', 'Emily', 'Flash',
  'Betty', 'Belle', 'Beat', 'Cleo', 'Criss',
  'Dami', 'Dome', 'Ale', 'Mia', 'Mini',
  'Mule', 'Muni',
  'Over', 'New', 'High', 'Flat',
  'Suede', 'Slingback',
];

const SORTED_LINES = [...new Set(LINE_NAMES)].sort((a, b) => b.length - a.length);

function normalizeForMatch(text: string): string {
  return text.trim().toLowerCase();
}

function findLineByName(productName: string): string | null {
  if (!productName) return null;

  let name = productName.trim();
  if (name.toLowerCase().startsWith('casadei ')) {
    name = name.substring(8).trim();
  }

  const nameLower = normalizeForMatch(name);

  for (const line of SORTED_LINES) {
    const lineLower = line.toLowerCase();
    if (nameLower === lineLower || nameLower.startsWith(lineLower + ' ')) {
      return line;
    }
  }

  // Second pass: word boundary match for longer names (5+ chars)
  for (const line of SORTED_LINES) {
    if (line.length < 5) continue;
    const lineLower = line.toLowerCase();
    const regex = new RegExp(`\\b${lineLower.replace(/[-]/g, '\\-')}\\b`, 'i');
    if (regex.test(nameLower)) {
      return line;
    }
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting Casadei collection (line) assignment v2...');

    // Fetch all products
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('id, name, product_code, collection');

    if (fetchError) {
      throw new Error(`Failed to fetch products: ${fetchError.message}`);
    }

    console.log(`Processing ${products?.length || 0} products`);

    const results: Record<string, number> = {};
    const updates: { id: string; collection: string }[] = [];
    const unmatched: string[] = [];

    for (const product of products || []) {
      // Priority 1: Direct product_code lookup
      let line: string | null = null;
      if (product.product_code) {
        line = PRODUCT_CODE_TO_LINE[product.product_code] || null;
      }

      // Priority 2: Name-based matching
      if (!line) {
        line = findLineByName(product.name);
      }

      if (line) {
        updates.push({ id: product.id, collection: line });
        results[line] = (results[line] || 0) + 1;
      } else {
        unmatched.push(`${product.name} (${product.product_code || 'no code'})`);
      }
    }

    console.log(`Matched ${updates.length} products to ${Object.keys(results).length} lines`);

    // Group updates by collection for batch processing
    const byCollection: Record<string, string[]> = {};
    for (const update of updates) {
      if (!byCollection[update.collection]) byCollection[update.collection] = [];
      byCollection[update.collection].push(update.id);
    }

    let errorCount = 0;
    for (const [collection, ids] of Object.entries(byCollection)) {
      for (let i = 0; i < ids.length; i += 100) {
        const chunk = ids.slice(i, i + 100);
        const { error: updateError } = await supabase
          .from('products')
          .update({ collection })
          .in('id', chunk);

        if (updateError) {
          console.error(`Error updating collection ${collection}:`, updateError);
          errorCount++;
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Assigned ${updates.length} products to ${Object.keys(results).length} collections (lines)`,
      breakdown: results,
      errors: errorCount,
      remainingUnassigned: unmatched.length,
      unmatchedSamples: unmatched.slice(0, 30),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error assigning collections:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
