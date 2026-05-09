(function () {
  "use strict";

  var STORAGE_KEY = "m26-knx-checklist";

  var checklistItems = {
    prep: [
      "Åbn korrekt ETS-projektfil og lav backup/export før ændringer.",
      "Tjek funktionsbeskrivelse: hvilke tryk, sensorer, aktuatorer og gruppeadresser indgår?",
      "Kontrollér produktdatabaser og applikationsprogrammer for de KNX-enheder, der skal bruges.",
      "Planlæg fysisk adresse pr. enhed, fx område.linje.enhed, før du downloader.",
    ],
    mount: [
      "Tjek KNX TP-polaritet, busklemme og at enheden er placeret på korrekt linje/segment.",
      "Kontrollér busspænding efter skolens/lærerens procedure og kun med korrekt udstyr.",
      "Mærk enheder og tavlepladser så fysisk installation matcher ETS-projektet.",
      "Kontrollér at programmeringsknap og LED kan tilgås på de enheder, der skal adresseres.",
    ],
    config: [
      "Tildel fysisk adresse og download den til den rigtige enhed via programmeringsknap.",
      "Aktivér relevante parametre, så de nødvendige kommunikationsobjekter bliver synlige.",
      "Link objekter til gruppeadresser: kommando, status, dæmpning og scene holdes adskilt.",
      "Kontrollér DPT på hvert link, fx DPT 1.xxx til tænd/sluk og DPT 3.xxx til relativ dæmpning.",
    ],
    test: [
      "Download applikation efter parameter- eller linkændringer.",
      "Test funktionen fysisk: tryk, relæudgang, status og evt. visualisering.",
      "Brug ETS Group Monitor til at se gruppeadresse, værdi, DPT og afsender.",
      "Mål busspænding på fjerneste enhed – skal være mindst DC 21 V.",
      "Polaritetstjek: tryk programmeringsknap – LED skal lyse, ellers er polariteten omvendt.",
      "Isolationsmåling ved DC 250 V leder mod PE: mindst 500 kΩ (afmontér overspændingsbeskyttelse først).",
      "Notér fejl: forkert gruppeadresse, forkert DPT, manglende download eller forkert fysisk adresse.",
    ],
    handover: [
      "Gem og eksportér opdateret ETS-projektfil.",
      "Opdatér gruppeadressenavne, så næste person kan forstå placering og funktion.",
      "Dokumentér hvilke enheder der er downloadet, og hvilke funktioner der er testet.",
      "Aflever kort testnotat med gruppeadresser, fysisk adressering og eventuelle kendte afvigelser.",
    ],
  };

  var faultNodes = {
    start: {
      title: "Hvilken KNX/ETS-fejl ser du?",
      body:
        "Start med at afgrænse om fejlen ligger i ETS-linket, i download/fysisk adresse, i buslinjen eller i status/visualisering. Brug projektfil, gruppeadresser og monitorer før du ændrer noget.",
      choices: [
        { label: "Tryk/sensor gør ikke det forventede", next: "function_wrong" },
        { label: "Enhed kan ikke programmeres eller findes ikke i ETS", next: "download_issue" },
        { label: "Flere KNX-enheder på linjen virker ikke", next: "bus_line" },
        { label: "Visualisering/status viser forkert tilstand", next: "status_issue" },
      ],
    },
    function_wrong: {
      title: "Funktion virker forkert",
      body:
        "Tjek først gruppeadressen: sender trykkets objekt og modtager aktuatorens objekt på samme gruppeadresse? Sammenlign navnet i ETS med funktionsbeskrivelsen, fx 4/0/1 for tænd/sluk udgang 1.",
      choices: [
        { label: "Gruppeadresse mangler eller er linket forkert", next: "group_link" },
        { label: "Adresse er rigtig, men værdien giver ikke mening", next: "dpt_issue" },
        { label: "Parametre/objekter ser forkerte ud i produktet", next: "parameter_issue" },
      ],
    },
    group_link: {
      title: "Gruppeadresse og objekter",
      body:
        "I ETS: åbn gruppeadressen og se hvilke kommunikationsobjekter der er linket. Et tænd/sluk-tryk skal normalt linkes til et 1-bit switch-objekt på aktuatoren. Undgå at blande kommando og status i samme adresse, medmindre projektet bevidst bruger den struktur.",
      choices: [
        { label: "Link rettet – download applikation og test", next: "test_monitor" },
        { label: "Objektet findes ikke eller er skjult", next: "parameter_issue" },
      ],
    },
    dpt_issue: {
      title: "DPT passer ikke til funktionen",
      body:
        "Kontrollér datapunkttypen: tænd/sluk er typisk DPT 1.xxx, relativ dæmpning DPT 3.xxx, procent/værdi DPT 5.xxx og temperatur ofte DPT 9.xxx. Forkert DPT kan give telegrammer, der sendes, men ikke forstås rigtigt.",
      choices: [
        { label: "DPT/objektvalg rettet i ETS", next: "test_monitor" },
        { label: "Det er en dæmpefunktion med flere objekter", next: "dimming_issue" },
      ],
    },
    parameter_issue: {
      title: "Parametre og synlige objekter",
      body:
        "Mange KNX-produkter viser først bestemte objekter, når funktionen aktiveres i parametrene. Tjek fx om kanal, statusobjekt, dimmeobjekt eller sceneobjekt er slået til i applikationen.",
      choices: [
        { label: "Parametre ændret – download applikation", next: "test_monitor" },
        { label: "Produktet virker stadig forkert", next: "escalate" },
      ],
    },
    dimming_issue: {
      title: "Dæmpning kræver ofte flere adresser",
      body:
        "En dæmper har ofte separat adresse til tænd/sluk, relativ dæmpning, absolut værdi og status. Tjek at langt tryk ikke er linket til tænd/sluk-adressen, og at DPT 3.xxx bruges til relativ dæmpning.",
      choices: [
        { label: "Dæmpeadresser adskilt og testet", next: "test_monitor" },
        { label: "Stadig uklart – brug Group Monitor", next: "test_monitor" },
      ],
    },
    download_issue: {
      title: "Download eller fysisk adresse fejler",
      body:
        "Kontrollér programmeringsknap/LED, interfaceforbindelse, linjevalg og individuel adresse. Hvis en enhed er udskiftet, skal både fysisk adresse og applikation passe til projektet.",
      choices: [
        { label: "Programmerings-LED/interface er problemet", next: "bus_line" },
        { label: "Forkert eller duplikeret fysisk adresse", next: "physical_address" },
        { label: "Download lykkes, men funktion virker ikke", next: "function_wrong" },
      ],
    },
    physical_address: {
      title: "Fysisk adresse",
      body:
        "Den fysiske adresse identificerer enheden, fx 1.1.12. To enheder må ikke have samme adresse på samme installation. Brug ETS diagnose til at finde enheden, og dokumentér ændringen bagefter.",
      choices: [
        { label: "Fysisk adresse rettet og downloadet", next: "test_monitor" },
        { label: "Enheden kan stadig ikke findes", next: "bus_line" },
      ],
    },
    bus_line: {
      title: "Buslinje, forsyning og interface",
      body:
        "Hvis flere enheder fejler, så afgræns linjen: busspænding, polaritet, kortslutning, linjekobler, strømforsyning og om ETS-interfacet er på den rigtige linje. Følg kun målinger du er uddannet til.",
      choices: [
        { label: "Bus/forsyning rettet – test telegrammer", next: "test_monitor" },
        { label: "Linjekobler/filter kan blokere telegrammer", next: "coupler_filter" },
        { label: "Kræver målinger eller leverandørhjælp", next: "escalate" },
      ],
    },
    coupler_filter: {
      title: "Linjekobler og filtertabeller",
      body:
        "Ved flere linjer/områder kan koblere filtrere gruppeadresser. Tjek om gruppeadressen er brugt på tværs af linjer, og om filtertabellen er opdateret/downloadet.",
      choices: [
        { label: "Kobler/filter rettet og downloadet", next: "test_monitor" },
        { label: "Fejlen er lokal på én linje", next: "bus_line" },
      ],
    },
    status_issue: {
      title: "Status eller visualisering viser forkert",
      body:
        "Skeln mellem kommandoadresse og statusadresse. Visualisering bør ofte læse aktuatorens tilbagemelding, fx 4/1/1 for status udgang 1, ikke kun trykkets kommandoadresse.",
      choices: [
        { label: "Statusobjekt mangler gruppeadresse", next: "group_link" },
        { label: "Visualisering bruger forkert adresse/DPT", next: "dpt_issue" },
        { label: "Statusobjekt er ikke aktiveret i parametre", next: "parameter_issue" },
      ],
    },
    test_monitor: {
      title: "Test med Group Monitor",
      body:
        "Brug ETS Group Monitor til at se om den rigtige gruppeadresse sender den forventede værdi. Notér gruppeadresse, DPT, værdi, tidspunkt og hvilken enhed der sender.",
      choices: [
        { label: "Telegrammer ser rigtige ud – dokumentér rettelsen", next: "resolved_docs" },
        { label: "Der kommer ingen telegrammer", next: "download_issue" },
        { label: "Telegrammer kommer, men forkert værdi/DPT", next: "dpt_issue" },
      ],
    },
    resolved_docs: {
      title: "Afslut i ETS-projektet",
      body:
        "Gem/backup projektet, opdatér gruppeadressenavne og noter hvad der blev rettet: fysisk adresse, parametre, gruppeadresse, DPT, download og testresultat. Det er vigtigt for den næste, der overtager projektet.",
      choices: [{ label: "Start en ny KNX/ETS-fejl", next: "start" }],
    },
    escalate: {
      title: "Eskalering",
      body:
        "Saml ETS-projektuddrag, screenshots af gruppeadresser/objekter, monitor-log, produktnavn, fysisk adresse og hvad der er forsøgt. Undgå tilfældige ændringer på et anlæg uden backup.",
      choices: [{ label: "Start forfra med ny afgrænsning", next: "start" }],
    },
  };

  var quizQuestions = [
    {
      q: "Hvad er forskellen på en fysisk adresse og en gruppeadresse i KNX?",
      answers: [
        "Fysisk adresse beskriver funktionen, gruppeadresse beskriver enheden.",
        "Fysisk adresse identificerer enheden, gruppeadresse bruges til funktionen/telegrammer.",
        "De betyder det samme, men skrives med forskellige tegn.",
      ],
      correct: 1,
      explain:
        "Den fysiske adresse er enhedens adresse, fx 1.1.12. Gruppeadressen er den funktion objekter kommunikerer på, fx 4/0/1.",
    },
    {
      q: "Hvad er en gruppeadresse i praksis blevet sammenlignet med i undervisningen?",
      answers: [
        "En elektronisk samlemuffe for kommunikationsobjekter.",
        "En sikring for KNX-strømforsyningen.",
        "En fysisk placering i tavlen.",
      ],
      correct: 0,
      explain:
        "Flere objekter kan linkes til samme gruppeadresse og dermed kommunikere om samme funktion.",
    },
    {
      q: "Hvilken DPT passer typisk til et almindeligt tænd/sluk-objekt?",
      answers: ["DPT 1.xxx", "DPT 3.xxx", "DPT 9.xxx"],
      correct: 0,
      explain:
        "DPT 1.xxx er 1-bit værdier og bruges typisk til tænd/sluk, ja/nej og lignende binære funktioner.",
    },
    {
      q: "Hvad skal du typisk gøre efter ændring af parametre eller gruppeadresselinks i ETS?",
      answers: [
        "Kun gemme projektet, enhederne opdaterer sig selv.",
        "Downloade applikationen til den relevante enhed.",
        "Slette den fysiske adresse.",
      ],
      correct: 1,
      explain:
        "Hvis applikationsparametre eller links er ændret, skal ændringen downloades til enheden før den virker i anlægget.",
    },
    {
      q: "Hvad er den bedste første test, hvis en KNX-funktion ikke virker, og du er usikker på om telegrammet sendes?",
      answers: [
        "Åbn ETS Group Monitor og se gruppeadresse, værdi og afsender.",
        "Udskift alle aktuatorer på linjen.",
        "Opret en ny hovedgruppe uden at undersøge den gamle.",
      ],
      correct: 0,
      explain:
        "Group Monitor er velegnet til at se om den rigtige gruppeadresse sender den forventede værdi.",
    },
    {
      q: "Hvorfor bør kommandoadresse og statusadresse ofte holdes adskilt?",
      answers: [
        "Fordi status ikke må bruges i KNX.",
        "Fordi visualisering ofte skal vise faktisk tilstand fra aktuatoren, ikke bare kommandoen fra trykket.",
        "Fordi status altid bruger DPT 9.xxx.",
      ],
      correct: 1,
      explain:
        "En kommando fortæller hvad man ønsker. En status fortæller hvad aktuatoren faktisk melder tilbage.",
    },
    {
      q: "Hvad gør en KNX-DALI gateway?",
      answers: [
        "Den oversætter KNX-funktioner til DALI-grupper, adresser eller scener.",
        "Den erstatter alle DALI-drivere.",
        "Den er kun en strømforsyning til KNX-bussen.",
      ],
      correct: 0,
      explain:
        "Gatewayen er broen mellem KNX-gruppeadresser og DALI-lysstyring.",
    },
    {
      q: "Hvis ETS Group Monitor viser telegram på 4/0/1, men DALI-armaturgruppen ikke tænder, hvad er et godt næste tjek?",
      answers: [
        "Om KNX-DALI gatewayen mapper 4/0/1 til den rigtige DALI-gruppe.",
        "Om tastaturet på computeren virker.",
        "Om statusadressen har et pænere navn.",
      ],
      correct: 0,
      explain:
        "Når KNX-telegrammet findes, følger man signalvejen videre til gatewayens mapping og DALI-gruppen.",
    },
    {
      q: "Hvad er en typisk fejl ved dæmpning i et KNX/ETS-projekt?",
      answers: [
        "At relativ dæmpning linkes til tænd/sluk-adressen i stedet for dæmpeobjektet.",
        "At dæmpning altid kræver fysisk adresse 0.0.0.",
        "At DPT aldrig betyder noget for dæmpning.",
      ],
      correct: 0,
      explain:
        "Kort tryk og langt tryk bruger ofte forskellige objekter/adresser: switch til tænd/sluk og DPT 3.xxx til relativ dæmpning.",
    },
    {
      q: "Hvad er den typiske maksimale afstand mellem en PSU og den fjerneste enhed på et KNX TP-segment (undervisningsgrundlag)?",
      answers: ["700 m", "350 m", "1000 m"],
      correct: 1,
      explain:
        "Ifølge jeres diagramregler er der typisk maks. 350 m mellem PSU og enhed på linjen (plus kontrol af samlet segment og andre grænser).",
    },
    {
      q: "Hvad er typisk maks. samlet busledning i ét TP-segment?",
      answers: ["350 m", "700 m", "1000 m"],
      correct: 2,
      explain:
        "Diagrammet angiver ofte maks. 1000 m kabel i ét segment – kombineret med regler for PSU/enhed og enhed/enhed.",
    },
    {
      q: "Hvorfor er navngivning af gruppeadresser vigtig?",
      answers: [
        "Fordi ETS ellers ikke kan gemme projektet.",
        "Fordi den næste person skal kunne forstå placering og funktion uden at gætte.",
        "Fordi gruppeadressen kun virker, hvis navnet indeholder ordet lys.",
      ],
      correct: 1,
      explain:
        "Gode navne som “4. Sal – Lok. 406A/B – Tænd/sluk udgang 1” gør projektet lettere at overtage og fejlfinde.",
    },
    {
      q: "Hvad er backbone i en større KNX-installation?",
      answers: [
        "Den øverste buslinje, som forbinder områder via områdekoblere.",
        "Et andet navn for en almindelig trykkontakt.",
        "Den DALI-linje, der forsyner armaturer med lys.",
      ],
      correct: 0,
      explain:
        "Backbone er den overordnede linje i topologien og bruges til at forbinde områder i større anlæg.",
    },
    {
      q: "Hvad gør en områdekobler typisk?",
      answers: [
        "Den forbinder backbone med et område.",
        "Den ændrer DPT automatisk på alle gruppeadresser.",
        "Den tænder og slukker direkte for 230 V-belastninger.",
      ],
      correct: 0,
      explain:
        "Områdekobleren er en topologienhed, der forbinder backbone med et områdes hovedlinje.",
    },
    {
      q: "Hvad gør en linjekobler i KNX-topologien?",
      answers: [
        "Den forbinder en hovedlinje med en underlinje og kan filtrere telegrammer.",
        "Den laver alle gruppeadresser om til fysiske adresser.",
        "Den bruges kun til at programmere DALI-armaturer.",
      ],
      correct: 0,
      explain:
        "Linjekobleren adskiller linjer logisk og kan hjælpe med at begrænse trafik mellem linjer.",
    },
    {
      q: "Hvad beskriver en fysisk adresse som 1.1.12?",
      answers: [
        "Område, linje og enhed i KNX-topologien.",
        "Hovedgruppe, mellemgruppe og undergruppe for funktionen.",
        "DPT-type, værdi og statusflag.",
      ],
      correct: 0,
      explain:
        "En fysisk adresse bruges til at identificere den enkelte enhed i topologien, fx område 1, linje 1, enhed 12.",
    },
    {
      q: "Hvad beskriver en tre-leddet gruppeadresse som 4/0/1?",
      answers: [
        "En funktionsadresse, som kommunikationsobjekter kan linkes til.",
        "En enheds fysiske placering på buskablet.",
        "Antal strømforsyninger, linjeforstærkere og aktuatorer.",
      ],
      correct: 0,
      explain:
        "Gruppeadressen bruges til funktionen, fx tænd/sluk, status, dæmpning eller værdi.",
    },
    {
      q: "Hvad er et kommunikationsobjekt i ETS?",
      answers: [
        "En dataport i enhedens applikation, som linkes til gruppeadresser.",
        "Et billede af tavlen i projektet.",
        "En automatisk backup af ETS-projektet.",
      ],
      correct: 0,
      explain:
        "Objekter som Switch, Status og Dimming er de punkter, der sender eller modtager telegrammer.",
    },
    {
      q: "Hvorfor er DPT vigtig?",
      answers: [
        "Den fortæller, hvordan telegrammets værdi skal forstås.",
        "Den bestemmer kun farven på KNX-kablet.",
        "Den erstatter behovet for gruppeadresser.",
      ],
      correct: 0,
      explain:
        "DPT sikrer, at afsender og modtager tolker værdien ens, fx 1 bit, relativ dæmpning eller temperatur.",
    },
    {
      q: "Hvilken DPT bruges ofte til relativ dæmpning?",
      answers: ["DPT 3.xxx", "DPT 1.xxx", "DPT 9.xxx"],
      correct: 0,
      explain:
        "DPT 3.xxx bruges typisk til relativ dæmpning, fx lysere/mørkere ved langt tryk.",
    },
    {
      q: "Hvilken DPT bruges ofte til temperatur og andre måleværdier?",
      answers: ["DPT 9.xxx", "DPT 1.xxx", "DPT 3.xxx"],
      correct: 0,
      explain:
        "DPT 9.xxx er typisk 2-byte flydende værdi og bruges ofte til temperatur, lysniveau og lignende målinger.",
    },
    {
      q: "Hvad er en aktuator i KNX?",
      answers: [
        "En enhed der udfører en handling, fx tænder et relæ eller styrer en ventil.",
        "En enhed der kun måler temperatur.",
        "Et navn for ETS-projektfilen.",
      ],
      correct: 0,
      explain:
        "Aktuatorer omsætter telegrammer til fysiske handlinger i installationen.",
    },
    {
      q: "Hvad er en sensor i KNX?",
      answers: [
        "En enhed der registrerer noget eller sender en betjeningskommando.",
        "En busstrømforsyning på 30 V DC.",
        "Et filter i linjekobleren.",
      ],
      correct: 0,
      explain:
        "Sensorer kan fx være tryk, bevægelsesmeldere, temperaturfølere eller vindueskontakter.",
    },
    {
      q: "Hvad betyder det, at KNX er hændelsesstyret?",
      answers: [
        "Enheder sender typisk telegrammer, når noget sker.",
        "Alle enheder spørger hinanden hvert sekund.",
        "ETS skal være åbent hele tiden for at anlægget virker.",
      ],
      correct: 0,
      explain:
        "Et tryk, en sensorændring eller en statusændring kan udløse et telegram på bussen.",
    },
    {
      q: "Hvad er Bus Monitor typisk mere rå end Group Monitor til?",
      answers: [
        "At se mere direkte bustrafik og telegrammer på lavere niveau.",
        "At tegne bygningens rumstruktur automatisk.",
        "At oprette DALI-grupper uden gateway.",
      ],
      correct: 0,
      explain:
        "Group Monitor er ofte nok til funktionsfejl, mens Bus Monitor bruges mere forsigtigt til rå busdiagnose.",
    },
    {
      q: "Hvad er en god første regel ved fejlfinding i ETS?",
      answers: [
        "Afgræns fejlen og følg telegrammets vej trin for trin.",
        "Slet alle gruppeadresser og start forfra.",
        "Skift DPT tilfældigt indtil noget virker.",
      ],
      correct: 0,
      explain:
        "Start med funktion, afsender, gruppeadresse, modtager, DPT, flags, download og monitorering.",
    },
    {
      q: "Hvad kan være galt, hvis et objekt ikke sender telegrammer?",
      answers: [
        "Forkerte flags, manglende link, forkert parameter eller manglende download.",
        "At gruppeadressen har for kort navn.",
        "At ETS-projektet har for mange rum.",
      ],
      correct: 0,
      explain:
        "Objektets parametre, flags og gruppeadresselinks skal passe, og ændringer skal downloades til enheden.",
    },
    {
      q: "Hvad er typisk maks. afstand mellem to vilkårlige enheder på samme TP-segment?",
      answers: ["700 m", "350 m", "1200 m"],
      correct: 0,
      explain:
        "I undervisningsgrundlaget bruges typisk maks. 700 m mellem to enheder på samme segment.",
    },
    {
      q: "Hvorfor må man ikke kun kigge på den samlede kabellængde i KNX TP?",
      answers: [
        "Fordi PSU-til-enhed og enhed-til-enhed også har egne grænser.",
        "Fordi kabellængde aldrig betyder noget i KNX.",
        "Fordi kun antallet af tryk betyder noget.",
      ],
      correct: 0,
      explain:
        "Et segment kan godt være under 1000 m samlet, men stadig bryde fx 350 m fra PSU til fjerneste enhed.",
    },
    {
      q: "Hvad gør en linjeforstærker?",
      answers: [
        "Den forstærker/genskaber buskommunikation og opdeler linjen i segmenter.",
        "Den dæmper lys direkte på seks kanaler.",
        "Den oversætter KNX til DALI-scener.",
      ],
      correct: 0,
      explain:
        "En linjeforstærker er infrastruktur på bussen, ikke en funktionsaktuator til lamper.",
    },
    {
      q: "Hvad er en typisk busspænding på KNX TP?",
      answers: ["30 V DC", "230 V AC", "12 V AC"],
      correct: 0,
      explain:
        "KNX TP-bussen forsynes typisk af en KNX-strømforsyning omkring 30 V DC.",
    },
    {
      q: "Hvad bør du gøre før større ændringer i et eksisterende ETS-projekt?",
      answers: [
        "Sørge for backup og dokumentere, hvad du ændrer.",
        "Slette projektfilen og oprette alt igen.",
        "Ændre alle fysiske adresser for en sikkerheds skyld.",
      ],
      correct: 0,
      explain:
        "Backup og dokumentation gør det muligt at rulle tilbage og hjælper den næste, der skal fejlfinde.",
    },
    {
      q: "Hvorfor kan en funktion fejle, selv om gruppeadressen ser rigtig ud?",
      answers: [
        "DPT, objektlink, flags, parameter eller download kan stadig være forkert.",
        "Gruppeadresser virker kun om morgenen.",
        "ETS kræver altid internetforbindelse for at sende telegrammer.",
      ],
      correct: 0,
      explain:
        "Adresse-navnet er kun én del. Objekt, datatype, flags, parameteropsætning og download skal også passe.",
    },
    {
      q: "Hvad skal du typisk kontrollere, hvis status ikke vises i visualisering?",
      answers: [
        "Om aktuatorens statusobjekt er linket til den rigtige statusadresse og sender status.",
        "Om trykkets fysiske adresse har et lavere nummer.",
        "Om DALI-armaturet har samme navn som rummet.",
      ],
      correct: 0,
      explain:
        "Visualisering bør ofte vise faktisk status fra aktuatoren, ikke kun kommandoen fra betjeningen.",
    },
    {
      q: "Hvad er et godt princip for gruppeadressestruktur?",
      answers: [
        "Brug en fast logik, så funktioner er lette at finde og forstå.",
        "Brug tilfældige numre, så projektet bliver mere sikkert.",
        "Lav altid kun én gruppeadresse til hele bygningen.",
      ],
      correct: 0,
      explain:
        "En fast struktur for fx etage, rum og funktion gør projektet nemmere at teste og vedligeholde.",
    },
    {
      q: "Hvad betyder download af fysisk adresse i ETS?",
      answers: [
        "At enheden får sin individuelle adresse på bussen.",
        "At alle gruppeadresser automatisk slettes.",
        "At DALI-bussen får ny spænding.",
      ],
      correct: 0,
      explain:
        "Fysisk adresse-download bruges til at give en KNX-enhed dens individuelle adresse, ofte via programmeringsknap.",
    },
    {
      q: "Hvad betyder applikationsdownload i ETS?",
      answers: [
        "At parametre, objekter og gruppeadresselinks sendes til enheden.",
        "At bygningstegningen downloades til computeren.",
        "At buskablet måles automatisk.",
      ],
      correct: 0,
      explain:
        "Applikationsdownload sender den funktionelle opsætning til enheden, så ændringerne virker i anlægget.",
    },
    {
      q: "Hvor mange enheder er der typisk plads til pr. linjesegment i et moderne KNX TP-anlæg (TP-256)?",
      answers: ["64", "128", "256"],
      correct: 2,
      explain:
        "I anlæg fra 2019 og frem (TP-256) tillades op til 256 enheder pr. linjesegment uden brug af linjeforstærker, hvis kabellængden er inden for 1.000 m.",
    },
    {
      q: "Hvor mange grundlæggende flags har et gruppeobjekt i ETS?",
      answers: ["3", "5", "6"],
      correct: 2,
      explain:
        "De 6 flag er C (Communication), R (Read), W (Write), T (Transmit), U (Update) og I (Read on Init).",
    },
    {
      q: "Hvilken minimum bus-spænding skal en KNX TP-enhed have for at fungere pålideligt?",
      answers: ["DC 12 V", "DC 21 V", "DC 30 V"],
      correct: 1,
      explain:
        "PSU leverer DC 30 V, men enheden skal mindst have DC 21 V ved klemmen for at fungere – tjekkes på fjerneste enhed.",
    },
    {
      q: "Hvilken bitrate kører KNX TP med?",
      answers: ["9.600 bit/s", "100 kbit/s", "1 Mbit/s"],
      correct: 0,
      explain:
        "KNX TP sender ved 9.600 bit/s. Et bit varer ca. 104 µs, og et switch-telegram tager ca. 20 ms inkl. kvittering.",
    },
    {
      q: "Hvad er hop count på et nyt KNX-telegram?",
      answers: ["3", "6", "15"],
      correct: 1,
      explain:
        "Hop count starter ved 6 og tælles 1 ned i hver kobler/forstærker. Når den når 0, stopper telegrammet – det forhindrer evige loops.",
    },
    {
      q: "Hvad er default-fysisk adresse fra fabrik for en almindelig (ulastet) KNX-enhed?",
      answers: ["0.0.0", "1.1.1", "15.15.255"],
      correct: 2,
      explain:
        "Fabriksadressen er 15.15.255 for almindelige enheder. Koblere og IP-routere har default 15.15.0.",
    },
    {
      q: "Hvilken KNX-multicast IP-adresse er reserveret til KNXnet/IP routing?",
      answers: ["192.168.1.1", "224.0.23.12", "255.255.255.0"],
      correct: 1,
      explain:
        "224.0.23.12 er den KNX-registrerede multicast-adresse. Den kan ændres i ETS, hvis netværket kræver det.",
    },
    {
      q: "Hvilken frekvens bruger KNX RF?",
      answers: ["433 MHz", "868 MHz", "2,4 GHz"],
      correct: 1,
      explain:
        "KNX RF arbejder på 868 MHz. Rækkevidde er ca. 100 m i frit felt – betydeligt mindre indendørs.",
    },
    {
      q: "Hvilken testspænding har det skærmede KNX-kabel JY(St)Y 2x2x0,8?",
      answers: ["1,0 kV", "2,5 kV", "4,0 kV"],
      correct: 1,
      explain:
        "JY(St)Y har 2,5 kV testspænding. YCYM 2x2x0,8 har 4 kV og må derfor lægges parallelt med både 230 V og 400 V.",
    },
    {
      q: "Hvilken DPT bruges til scenekald (1 byte med scene-nr. og kald/gem-flag)?",
      answers: ["DPT 1.001", "DPT 17.001", "DPT 18.001"],
      correct: 2,
      explain:
        "DPT 18.001 (Scene Control) er 1 byte og indeholder både scene-nummer og et flag for kald vs. gem.",
    },
    {
      q: "Hvor mange gruppeadresser er reserveret til broadcast?",
      answers: ["0/0/0", "1/1/1", "15/7/255"],
      correct: 0,
      explain:
        "0/0/0 er reserveret til broadcast og bruges bl.a. ved tildeling af individuelle adresser.",
    },
  ];

  var glossary = [
    {
      da: "Aktuator",
      en: "Actuator",
      note: "Enhed der udfører en handling (fx relæ, dimmer).",
    },
    {
      da: "Sensor",
      en: "Sensor",
      note: "Måler en størrelse eller tilstand (bevægelse, temperatur …).",
    },
    {
      da: "Gateway",
      en: "Gateway",
      note: "Binder forskellige net/protokoller sammen kontrolleret.",
    },
    {
      da: "Kommissionering",
      en: "Commissioning",
      note: "Igangsetting, test og dokumentation før/overdragelse.",
    },
    {
      da: "Brugerflade",
      en: "Human-machine interface (HMI)",
      note: "Grafisk visning og betjening – fx på PC eller panel.",
    },
    {
      da: "Topologi",
      en: "Topology",
      note: "Den måde enheder og linjer er forbundet på.",
    },
    {
      da: "Datatype",
      en: "Data type",
      note: "Hvilken form værdier har på bus/integration.",
    },
    {
      da: "Firmware",
      en: "Firmware",
      note: "Indbygget software i enheder – kan kræve opdatering.",
    },
    {
      da: "Gruppeadresse",
      en: "Group address",
      note: "Logisk adresse et telegram sendes til – planlæg struktur og dokumentér.",
    },
    {
      da: "Linje / segment",
      en: "Line / segment",
      note: "Bussegment med egne enheder og evt. strømforsyning.",
    },
    {
      da: "Telegram",
      en: "Telegram",
      note: "Datapakke på bussen med mål og nyttedata.",
    },
    {
      da: "Busafsætning",
      en: "Bus coupling unit",
      note: "Adapter mellem enhed og bus (terminologi kan variere efter fabrikat).",
    },
    {
      da: "Scene",
      en: "Scene",
      note: "Foruddefineret lys-/funktionstilstand ved ét kommando.",
    },
    {
      da: "PID-regulator",
      en: "PID controller",
      note: "Regulator med P, I og D-led til stabil styring (temperatur m.m.).",
    },
    {
      da: "VPN",
      en: "Virtual private network",
      note: "Krypteret tunnel til fjernadgang over usikre net.",
    },
    {
      da: "Områdekobler",
      en: "BC",
      note:
        "Backbone coupler – bogstavkode på internationale diagrammer. Nogle danske skemaer bruger stadig OK.",
    },
    {
      da: "Linjekobler",
      en: "LC",
      note:
        "Line coupler – bogstavkode på diagrammer. Nogle danske skemaer bruger stadig LK.",
    },
    {
      da: "Linjeforstærker",
      en: "LR",
      note:
        "Line repeater – bogstavkode på diagrammer. Bus-enhed med fysisk adresse; forlænger/opdeler linjen i segmenter. Nogle skemaer bruger LF.",
    },
    {
      da: "Bussegment",
      en: "Bus segment",
      note: "Afsnit af linje med egne længde- og afstandsgrænser.",
    },
    {
      da: "DALI",
      en: "Digital Addressable Lighting Interface",
      note: "Digital bus til styring af belysning – dimring, grupper, scenarier m.m.",
    },
    {
      da: "DALI-2",
      en: "DALI-2",
      note: "Udvidet generation efter IEC 62386; certificerede enheder og flere funktioner.",
    },
    {
      da: "Daglysregulering",
      en: "Daylight-linked control",
      note: "Kunstlys tilpasses efter tilført dagslys – typisk med luxsensor.",
    },
    {
      da: "Luxsensor",
      en: "Photosensor / illuminance sensor",
      note: "Måler lysniveau til regulering og energioptimering.",
    },
    {
      da: "BCU",
      en: "Bus Coupling Unit",
      note: "Koblingsenhed mellem KNX-bus og applikationsmodul – findes i alle bus-enheder.",
    },
    {
      da: "BCU-nøgle",
      en: "BCU Key",
      note: "4 bytes adgangsnøgle pr. ETS-projekt – beskytter mod uautoriseret download.",
    },
    {
      da: "Hop count",
      en: "Hop count",
      note: "Tæller i telegrammet (start 6); tæller 1 ned i hver kobler – forhindrer endeløse loops.",
    },
    {
      da: "Default-adresse",
      en: "Default individual address",
      note: "Fra fabrik 15.15.255 (alm. enheder), 15.15.0 (koblere/IP-routere).",
    },
    {
      da: "Multicast-adresse",
      en: "Multicast address",
      note: "224.0.23.12 – KNX-registreret IP-adresse til KNXnet/IP routing.",
    },
    {
      da: "CSMA/CA",
      en: "Carrier Sense Multiple Access / Collision Avoidance",
      note: "Bus-adgang i KNX TP – enheden lytter før den sender; logisk 0 vinder ved samtidighed.",
    },
    {
      da: "Hovedlinje",
      en: "Main line",
      note: "Linje 0 i et område – samler områdets linjekoblere via en områdekobler.",
    },
    {
      da: "Backbone",
      en: "Backbone line",
      note: "Linje 0.0 – øverste niveau, kan være TP eller KNX/IP.",
    },
    {
      da: "Filtertabel",
      en: "Filter table",
      note: "Liste i koblere over hvilke gruppeadresser der må sendes videre. Genereres af ETS.",
    },
    {
      da: "Mediekobler",
      en: "Media coupler",
      note: "Forbinder forskellige KNX-medier, fx TP til RF eller TP til IP.",
    },
    {
      da: "DPSU",
      en: "Decentralized Power Supply Unit",
      note: "Decentral KNX-strømforsyning (25/40/80 mA) – op til 8 stk. pr. linje.",
    },
    {
      da: "SELV",
      en: "Safety Extra Low Voltage",
      note: "Sikker lavspænding – KNX TP er DC 30 V SELV, må ikke jordes.",
    },
    {
      da: "FDSK",
      en: "Factory Device Setup Key",
      note: "Unik fabrikslagt nøgle på KNX Secure-enheder, scannes/indtastes i ETS via QR/kode.",
    },
    {
      da: "KNX Data Secure",
      en: "KNX Data Secure",
      note: "Krypterer og autentificerer telegrammer mellem KNX-enheder uanset medie.",
    },
    {
      da: "KNX IP Secure",
      en: "KNX IP Secure",
      note: "Krypterer hele KNXnet/IP-rammen mellem KNX IP-routere på IP-niveau.",
    },
    {
      da: "Domain-adresse",
      en: "Domain address",
      note: "Pr. KNX RF-linje/segment – sikrer at kun enheder i samme domæne kommunikerer.",
    },
  ];

  function activateMainTab(panelId, scrollIntoMain) {
    if (!panelId) return;
    var buttons = document.querySelectorAll(".tabs__btn");
    var panels = document.querySelectorAll(".panel");

    buttons.forEach(function (b) {
      var target = b.getAttribute("data-panel");
      var active = target === panelId;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-selected", active ? "true" : "false");
    });

    panels.forEach(function (panel) {
      var id = panel.id.replace("panel-", "");
      var page = panel.getAttribute("data-page") || id;
      var visible = page === panelId || id === panelId;
      panel.classList.toggle("is-visible", visible);
      panel.hidden = !visible;
    });

    if (scrollIntoMain) {
      var mainEl = document.getElementById("main");
      if (mainEl && typeof mainEl.scrollIntoView === "function") {
        var reduceMotion =
          window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        mainEl.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      }
    }
  }

  function initTabs() {
    var buttons = document.querySelectorAll(".tabs__btn");

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        activateMainTab(btn.getAttribute("data-panel"), false);
      });
    });

    document.querySelectorAll(".home-zone[data-go-panel]").forEach(function (zone) {
      zone.addEventListener("click", function () {
        activateMainTab(zone.getAttribute("data-go-panel"), true);
      });
    });
  }

  function loadChecks() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function saveChecks(map) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch (e) {
      /* ignore */
    }
  }

  function initChecklists() {
    var stored = loadChecks();

    Object.keys(checklistItems).forEach(function (key) {
      var ul = document.querySelector('.checklist[data-checklist="' + key + '"]');
      if (!ul) return;

      checklistItems[key].forEach(function (text, index) {
        var id = key + "-" + index;
        var li = document.createElement("li");
        var cb = document.createElement("input");
        cb.type = "checkbox";
        cb.id = id;
        cb.checked = !!stored[id];
        cb.addEventListener("change", function () {
          var m = loadChecks();
          m[id] = cb.checked;
          saveChecks(m);
        });
        var label = document.createElement("label");
        label.setAttribute("for", id);
        label.textContent = text;
        li.appendChild(cb);
        li.appendChild(label);
        ul.appendChild(li);
      });
    });

    var resetBtn = document.getElementById("btn-checklist-reset");
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        if (!confirm("Nulstille alle afkrydsninger på denne enhed?")) return;
        saveChecks({});
        document
          .querySelectorAll('.checklist input[type="checkbox"]')
          .forEach(function (cb) {
            cb.checked = false;
          });
      });
    }
  }

  function initSubtabsContainers() {
    document.querySelectorAll(".subtabs-container").forEach(function (container) {
      var subtabBar = container.querySelector(".subtabs");
      if (!subtabBar) return;

      var btns = subtabBar.querySelectorAll(".subtabs__btn");
      var panels = {};
      container.querySelectorAll(":scope > .subpanel").forEach(function (el) {
        var name = el.id.replace(/^sub-/, "");
        panels[name] = el;
      });

      btns.forEach(function (btn) {
        btn.addEventListener("click", function () {
          var sub = btn.getAttribute("data-sub");
          btns.forEach(function (b) {
            var on = b === btn;
            b.classList.toggle("is-active", on);
            b.setAttribute("aria-pressed", on ? "true" : "false");
          });
          Object.keys(panels).forEach(function (k) {
            var el = panels[k];
            if (!el) return;
            var show = k === sub;
            el.classList.toggle("is-visible", show);
            el.hidden = !show;
          });
        });
      });
    });
  }

  function initFaultFinding() {
    var titleEl = document.getElementById("fault-title");
    var bodyEl = document.getElementById("fault-body");
    var choicesEl = document.getElementById("fault-choices");
    var metaEl = document.getElementById("fault-step-label");
    var restartBtn = document.getElementById("fault-restart");
    if (!titleEl || !bodyEl || !choicesEl || !metaEl) return;

    var pathLabels = [];

    function renderMeta() {
      metaEl.textContent =
        pathLabels.length === 0
          ? "Sti: Start"
          : "Sti: Start → " + pathLabels.join(" → ");
    }

    function showNode(id) {
      var node = faultNodes[id];
      if (!node) return;

      if (id === "start") {
        pathLabels = [];
      }

      titleEl.textContent = node.title;
      bodyEl.textContent = node.body;
      choicesEl.innerHTML = "";
      renderMeta();

      node.choices.forEach(function (choice) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "fault-choice-btn";
        b.textContent = choice.label;
        b.addEventListener("click", function () {
          if (choice.next === "start") {
            pathLabels = [];
          } else {
            pathLabels.push(choice.label);
          }
          showNode(choice.next);
        });
        choicesEl.appendChild(b);
      });
    }

    if (restartBtn) {
      restartBtn.addEventListener("click", function () {
        pathLabels = [];
        showNode("start");
      });
    }

    showNode("start");
  }

  function initDaylightDemo() {
    var slider = document.getElementById("daylight-slider");
    var room = document.getElementById("daylight-room");
    var beam = document.getElementById("daylight-beam");
    var valEl = document.getElementById("daylight-value");
    var lamps = [
      { id: "daylight-lamp-a", meterId: "daylight-lamp-a-meter", mode: "daylight", warmRate: 1.24 },
      {
        id: "daylight-lamp-b",
        meterId: "daylight-lamp-b-meter",
        mode: "otherZone",
        warmFloor: 0.76,
        warmLeak: 0.22,
      },
      {
        id: "daylight-lamp-c",
        meterId: "daylight-lamp-c-meter",
        mode: "otherZone",
        warmFloor: 0.84,
        warmLeak: 0.15,
      },
    ];

    function tick() {
      if (!slider || !room) return;
      var v = parseInt(slider.value, 10);
      if (isNaN(v)) v = 0;
      var d = v / 100;

      slider.setAttribute("aria-valuetext", v + " procent udelys");

      if (valEl) {
        valEl.textContent =
          "Udelys " +
          v +
          "% · vindueszonen dæmpes som ved rigtig daglysstyring · de to andre lamper er kun lidt påvirket.";
      }

      var skyTop = Math.round(14 + d * 62);
      var skyMid = Math.round(28 + d * 48);
      var skyBot = Math.round(42 + d * 38);
      room.style.background =
        "linear-gradient(180deg, hsl(215, " +
        Math.round(42 + d * 28) +
        "%, " +
        skyTop +
        "%) 0%, hsl(205, " +
        Math.round(35 + d * 20) +
        "%, " +
        skyMid +
        "%) 55%, hsl(40, " +
        Math.round(18 + d * 25) +
        "%, " +
        skyBot +
        "%) 100%)";

      if (beam) {
        beam.style.opacity = String(0.12 + d * 0.82);
      }

      lamps.forEach(function (cfg) {
        var lamp = document.getElementById(cfg.id);
        if (!lamp) return;
        var warm;
        if (cfg.mode === "daylight") {
          warm = Math.max(0.02, 1 - d * cfg.warmRate);
        } else {
          warm = Math.max(cfg.warmFloor, 1 - d * cfg.warmLeak);
        }
        lamp.style.setProperty("--lamp-warm", warm.toFixed(4));

        var meter = cfg.meterId ? document.getElementById(cfg.meterId) : null;
        if (meter) {
          var pct = Math.round(warm * 100);
          meter.textContent = pct + "%";
          meter.setAttribute("aria-label", pct + " procent simuleret kunstlys");
        }
      });
    }

    if (slider && room) {
      slider.addEventListener("input", tick);
      slider.addEventListener("change", tick);
      tick();
    }
  }

  function fillWordTable() {
    var tbody = document.getElementById("word-table-body");
    if (!tbody) return;

    glossary.forEach(function (row) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" +
        escapeHtml(row.da) +
        "</td><td>" +
        escapeHtml(row.en) +
        "</td><td>" +
        escapeHtml(row.note) +
        "</td>";
      tbody.appendChild(tr);
    });
  }

  function escapeHtml(s) {
    var div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function initDistanceChecker() {
    var form = document.getElementById("distance-check-form");
    var results = document.getElementById("distance-results");
    if (!form || !results) return;

    var limits = [
      { id: "dist-segment", max: 1000, label: "Segment (samlet busledning)" },
      { id: "dist-psu-dev", max: 350, label: "PS til enhed" },
      { id: "dist-dev-dev", max: 700, label: "Enhed til enhed" },
      { id: "dist-lc-lr", max: 700, label: "LC til første LR" },
    ];

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var msgs = [];

      limits.forEach(function (L) {
        var el = document.getElementById(L.id);
        if (!el || el.value === "") return;
        var v = parseFloat(el.value, 10);
        if (isNaN(v) || v < 0) return;
        if (v > L.max) {
          msgs.push({
            type: "bad",
            text:
              L.label +
              ": " +
              v +
              " m overstiger typisk maks. " +
              L.max +
              " m.",
          });
        } else {
          msgs.push({
            type: "ok",
            text:
              L.label +
              ": " +
              v +
              " m er inden for typisk maks. " +
              L.max +
              " m.",
          });
        }
      });

      var psuPsuEl = document.getElementById("dist-psu-psu");
      if (psuPsuEl && psuPsuEl.value !== "") {
        var pp = parseFloat(psuPsuEl.value, 10);
        if (!isNaN(pp) && pp >= 0) {
          if (pp < 200) {
            msgs.push({
              type: "warn",
              text:
                "Mellem to PSU: " +
                pp +
                " m er under den ofte nævnte typiske minimum (~200 m) – kontrollér producent.",
            });
          } else {
            msgs.push({
              type: "ok",
              text:
                "Mellem to PSU: " +
                pp +
                " m – verificér stadig mod datablad og linjetype.",
            });
          }
        }
      }

      if (msgs.length === 0) {
        results.innerHTML =
          '<p class="distance-results__empty">Udfyld mindst ét felt og tryk „Tjek tal“.</p>';
        return;
      }

      results.innerHTML = msgs
        .map(function (m) {
          return (
            '<p class="distance-results__line distance-results__line--' +
            m.type +
            '">' +
            escapeHtml(m.text) +
            "</p>"
          );
        })
        .join("");
    });

    form.addEventListener("reset", function () {
      window.setTimeout(function () {
        results.innerHTML = "";
      }, 0);
    });
  }

  var quizIndex = 0;
  var quizAnswered = false;

  function initQuiz() {
    var progressEl = document.getElementById("quiz-progress");
    var questionEl = document.getElementById("quiz-question");
    var answersEl = document.getElementById("quiz-answers");
    var feedbackEl = document.getElementById("quiz-feedback");
    var nextBtn = document.getElementById("quiz-next");

    function shuffleAnswers(items) {
      var shuffled = items.slice();
      for (var i = shuffled.length - 1; i > 0; i -= 1) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = shuffled[i];
        shuffled[i] = shuffled[j];
        shuffled[j] = temp;
      }
      return shuffled;
    }

    function render() {
      quizAnswered = false;
      var q = quizQuestions[quizIndex];
      var answerOptions = shuffleAnswers(
        q.answers.map(function (text, i) {
          return {
            text: text,
            isCorrect: i === q.correct,
          };
        })
      );

      progressEl.textContent =
        "Spørgsmål " + (quizIndex + 1) + " af " + quizQuestions.length;
      questionEl.textContent = q.q;
      feedbackEl.textContent = "";
      answersEl.innerHTML = "";
      nextBtn.disabled = true;

      answerOptions.forEach(function (answer, i) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "quiz-answer";
        b.textContent = answer.text;
        b.addEventListener("click", function () {
          if (quizAnswered) return;
          quizAnswered = true;
          var correct = answer.isCorrect;
          Array.prototype.forEach.call(answersEl.children, function (child, idx) {
            child.disabled = true;
            if (answerOptions[idx].isCorrect) child.classList.add("is-correct");
            else if (idx === i && !correct) child.classList.add("is-wrong");
            if (idx === i) child.classList.add("is-chosen");
          });
          feedbackEl.textContent = q.explain;
          nextBtn.disabled = false;
        });
        answersEl.appendChild(b);
      });
    }

    nextBtn.addEventListener("click", function () {
      quizIndex = (quizIndex + 1) % quizQuestions.length;
      render();
    });

    render();
  }

  var cardIndex = 0;
  var cardShowEn = true;

  function initFlashcards() {
    var surface = document.getElementById("flashcard-flip");
    var textEl = document.getElementById("flashcard-text");
    var sideEl = document.getElementById("flashcard-side");
    var prevBtn = document.getElementById("flashcard-prev");
    var nextBtn = document.getElementById("flashcard-next");

    function renderCard() {
      var row = glossary[cardIndex];
      cardShowEn = true;
      sideEl.textContent = "EN";
      textEl.textContent = row.en;
    }

    surface.addEventListener("click", function () {
      var row = glossary[cardIndex];
      cardShowEn = !cardShowEn;
      if (cardShowEn) {
        sideEl.textContent = "EN";
        textEl.textContent = row.en;
      } else {
        sideEl.textContent = "DA";
        textEl.textContent = row.da + " – " + row.note;
      }
    });

    prevBtn.addEventListener("click", function () {
      cardIndex = (cardIndex - 1 + glossary.length) % glossary.length;
      renderCard();
    });

    nextBtn.addEventListener("click", function () {
      cardIndex = (cardIndex + 1) % glossary.length;
      renderCard();
    });

    renderCard();
  }

  function initEtsExercise() {
    var form = document.getElementById("ets-exercise-form");
    var gaSelect = document.getElementById("ets-ga-select");
    var dptSelect = document.getElementById("ets-dpt-select");
    var result = document.getElementById("ets-exercise-result");
    var scenarioText = document.getElementById("ets-scenario-text");
    var scenarioFacts = document.getElementById("ets-scenario-facts");
    var scenarioStep = document.getElementById("ets-scenario-step");
    var scenarioFocus = document.getElementById("ets-scenario-focus");
    var signalPath = document.getElementById("ets-signal-path");
    var progress = document.getElementById("ets-exercise-progress");
    var prevBtn = document.getElementById("ets-prev-scenario");
    var nextBtn = document.getElementById("ets-next-scenario");
    var scenarioIndex = 0;
    var scenarios = [
      {
        step: "Trin 1 · Kommando",
        focus: "Tryk styrer relæudgang 1",
        text:
          "Du står i ETS og skal linke venstre tryk i lokale 406A/B til udgang 1 på Hager-relæet. Målet er en almindelig tænd/sluk-kommando.",
        path: ["Bruger trykker venstre tryk", "Trykkets Switch-objekt sender", "Relæets udgang 1 modtager", "Lampen tænder/slukker"],
        facts: [
          "Funktionen er kommando, ikke status.",
          "Afsender og modtager skal ligge på samme gruppeadresse.",
          "Tænd/sluk er en 1-bit værdi, altså DPT 1.xxx.",
        ],
        ga: "4/0/1",
        dpt: "1",
        gaOptions: ["4/0/1", "4/0/2", "4/1/1", "4/3/1"],
        dptOptions: ["1", "3", "5", "9"],
        success:
          "Korrekt. Trykkets Switch-objekt og relæets udgang 1 skal begge linkes til 4/0/1. DPT 1.xxx passer, fordi kommandoen kun er tænd/sluk.",
      },
      {
        step: "Trin 2 · Separat funktion",
        focus: "Højre tryk styrer relæudgang 2",
        text:
          "Højre tryk skal styre en anden lampe på udgang 2 i samme lokale. Den må ikke følge udgang 1, så funktionen skal have sin egen adresse.",
        path: ["Bruger trykker højre tryk", "Trykkets Switch-objekt sender", "Relæets udgang 2 modtager", "Kun lampe 2 tænder/slukker"],
        facts: [
          "Samme lokale betyder ikke nødvendigvis samme gruppeadresse.",
          "Udgang 2 skal holdes adskilt fra udgang 1.",
          "Funktionen er stadig tænd/sluk, så DPT ændrer sig ikke.",
        ],
        ga: "4/0/2",
        dpt: "1",
        gaOptions: ["4/0/1", "4/0/2", "4/1/1", "4/2/1"],
        dptOptions: ["1", "3", "5", "9"],
        success:
          "Korrekt. Udgang 2 får sin egen tænd/sluk-adresse: 4/0/2. DPT 1.xxx bruges stadig, fordi værdien er binær.",
      },
      {
        step: "Trin 3 · Tilbagemelding",
        focus: "Visualisering skal vise faktisk status",
        text:
          "Visualiseringen viser forkert tilstand, når lampen ændres manuelt. Du skal derfor linke tilbagemeldingen fra relæets udgang 1.",
        path: ["Relæudgang ændrer tilstand", "Relæets statusobjekt sender", "Visualisering modtager status", "Skærmen viser faktisk tilstand"],
        facts: [
          "Status er ikke det samme som betjeningskommando.",
          "Status bør komme fra aktuatoren, fordi den kender den faktiske udgang.",
          "Status for tænd/sluk er stadig en 1-bit værdi.",
        ],
        ga: "4/1/1",
        dpt: "1",
        gaOptions: ["4/0/1", "4/1/1", "4/2/1", "4/3/1"],
        dptOptions: ["1", "3", "5", "9"],
        success:
          "Korrekt. 4/1/1 er status for udgang 1. DPT 1.xxx passer, fordi status stadig kun fortæller tændt eller slukket.",
      },
      {
        step: "Trin 4 · Dæmpning",
        focus: "Langt tryk sender relativ dæmpning",
        text:
          "Kort tryk tænder/slukker allerede korrekt. Nu skal langt tryk dæmpe lyset op og ned med relativ dæmpning.",
        path: ["Bruger holder trykket inde", "Trykkets dimmeobjekt sender", "Dæmper/gateway modtager relativ dæmpning", "Lysniveauet ændres trinvis"],
        facts: [
          "Langt tryk bruger et andet objekt end kort tryk.",
          "Relativ dæmpning er ikke 1-bit tænd/sluk.",
          "Dæmpning bør have sin egen gruppeadresse.",
        ],
        ga: "4/2/1",
        dpt: "3",
        gaOptions: ["4/0/1", "4/1/1", "4/2/1", "4/2/2"],
        dptOptions: ["1", "3", "5", "9"],
        success:
          "Korrekt. Relativ dæmpning ligger på 4/2/1 og bruger typisk DPT 3.xxx. Det skal ikke blandes med tænd/sluk eller status.",
      },
      {
        step: "Trin 5 · Fællesfunktion",
        focus: "Flere udgange lytter på samme kommando",
        text:
          "Læreren vil have en fælles sluk-funktion for hele 4. sal. Flere relæudgange skal reagere på samme kommando.",
        path: ["Fælles sluk aktiveres", "Kommando sendes på fælles adresse", "Flere relæudgange lytter", "Hele området slukker"],
        facts: [
          "Her er det meningen, at flere modtagere deler adresse.",
          "Funktionen er en kommando, ikke en statusadresse.",
          "Sluk/tænd er stadig 1 bit.",
        ],
        ga: "4/3/1",
        dpt: "1",
        gaOptions: ["4/0/1", "4/1/1", "4/2/1", "4/3/1"],
        dptOptions: ["1", "3", "5", "9"],
        success:
          "Korrekt. 4/3/1 er en fælles kommandoadresse, som flere aktuatorobjekter kan lytte på. DPT 1.xxx passer til sluk/tænd.",
      },
      {
        step: "Trin 6 · Procentværdi",
        focus: "Panel sætter lyset til præcis 60 %",
        text:
          "Fra et touchpanel skal brugeren kunne sætte lyset i 406A/B til en præcis værdi, fx 60 %. Det er ikke længere op-/nedtrin, men en absolut værdi.",
        path: ["Brugeren skubber slider til 60 %", "Panel sender procentværdi", "Dæmperen modtager 1-byte værdi", "Lyset stiller sig på 60 %"],
        facts: [
          "Det er en absolut værdi, ikke en relativ dæmpning.",
          "1 byte (0–255) bruges som 0–100 % i DPT 5.001.",
          "Adressen er forskellig fra langt-tryk-dæmpning op/ned.",
        ],
        ga: "4/2/2",
        dpt: "5",
        gaOptions: ["4/2/1", "4/2/2", "4/2/3", "4/0/1"],
        dptOptions: ["1", "3", "5", "9"],
        success:
          "Korrekt. 4/2/2 er dæmpeværdien, og DPT 5.001 sender 0–100 % i én byte. DPT 3.xxx (relativ) bruges kun ved langt tryk op/ned.",
      },
      {
        step: "Trin 7 · Dæmpestatus",
        focus: "Aktuator melder aktuelt lysniveau",
        text:
          "Visualiseringen skal vise det aktuelle lysniveau som tal og slider. Det er ikke en kommando – aktuatoren skal melde tilbage, hvor lyset står.",
        path: ["Dæmperen ændrer lysniveau", "Status-objekt sender 1-byte værdi", "Visualisering modtager status", "Slider og tal opdateres på panelet"],
        facts: [
          "Status er afsendt af aktuatoren, ikke af panelet.",
          "Værdien er 0–100 %, så samme datatype som dæmpeværdien.",
          "Status bør ikke ligge på samme adresse som kommandoen.",
        ],
        ga: "4/2/3",
        dpt: "5",
        gaOptions: ["4/2/1", "4/2/2", "4/2/3", "4/1/1"],
        dptOptions: ["1", "3", "5", "9"],
        success:
          "Korrekt. 4/2/3 er status for dæmpeværdien, og DPT 5.001 (0–100 %) bruges også her. Kommando og status holdes adskilt på hver sin adresse.",
      },
      {
        step: "Trin 8 · Persienne kør",
        focus: "Langt tryk kører persienne op eller ned",
        text:
          "Et tryk i lokalet skal styre persienne i vinduet. Langt tryk skal sende kør op/ned, indtil persienne når sin endeposition eller stoppes.",
        path: ["Bruger holder tryk inde", "Trykkets ‘Move’-objekt sender op eller ned", "Persienne-aktuator modtager 1-bit retning", "Motoren kører i den retning"],
        facts: [
          "Op/ned er stadig en 1-bit værdi (0 = op, 1 = ned i DPT 1.008).",
          "Den må ikke deles med stop/step på kort tryk.",
          "Funktionen ligger uden for lys-mellemgruppen.",
        ],
        ga: "4/4/1",
        dpt: "1",
        gaOptions: ["4/4/1", "4/4/2", "4/2/1", "4/0/1"],
        dptOptions: ["1", "3", "5", "9"],
        success:
          "Korrekt. 4/4/1 er kør-op/ned for persiennen og bruger DPT 1.008 (1 bit Up/Down). Stop og lamel ligger på sin egen adresse.",
      },
      {
        step: "Trin 9 · Persienne stop",
        focus: "Kort tryk stopper eller justerer lamel",
        text:
          "Det samme tryk skal med kort tryk stoppe persiennen, mens den kører – eller justere lamel-vinklen et lille trin, hvis den allerede står stille.",
        path: ["Bruger trykker kort", "Trykkets ‘Stop/Step’-objekt sender", "Persienne-aktuator modtager 1-bit step", "Motor stopper eller lamel drejer ét trin"],
        facts: [
          "Kort tryk og langt tryk skal have hver sin gruppeadresse.",
          "Stop/step er en 1-bit værdi (DPT 1.007), men en anden funktion end Up/Down.",
          "Funktionen hører ikke til på lys-adresserne.",
        ],
        ga: "4/4/2",
        dpt: "1",
        gaOptions: ["4/4/1", "4/4/2", "4/2/1", "4/3/1"],
        dptOptions: ["1", "3", "5", "9"],
        success:
          "Korrekt. 4/4/2 er stop/step på persienne og bruger DPT 1.007 (Step). Den må ikke ligge sammen med kør-op/ned, ellers stopper persienne hver gang du holder trykket.",
      },
      {
        step: "Trin 10 · Setpoint",
        focus: "Panel sender ønsket rumtemperatur",
        text:
          "Brugeren stiller ønsket rumtemperatur til 21,5 °C på panelet. Værdien skal sendes til termostaten/HVAC-aktuatoren som et setpoint.",
        path: ["Bruger ændrer setpoint på panel", "Panelets setpoint-objekt sender 2-byte float", "Termostat/HVAC modtager værdien", "Setpoint i regulatoren opdateres"],
        facts: [
          "Det er en måleværdi, ikke tænd/sluk.",
          "Temperatur sendes som 2-byte float (DPT 9.001) i °C.",
          "Setpoint og aktuel temperatur er to forskellige adresser.",
        ],
        ga: "4/5/1",
        dpt: "9",
        gaOptions: ["4/5/1", "4/5/2", "4/2/2", "4/0/1"],
        dptOptions: ["1", "3", "5", "9"],
        success:
          "Korrekt. 4/5/1 er setpoint, og temperatur sendes som DPT 9.001 (2 byte float, °C). 1 byte ville være for upræcist, og 1 bit kan ikke beskrive en temperatur.",
      },
      {
        step: "Trin 11 · Sensorværdi",
        focus: "Temperatursensor melder aktuel temperatur",
        text:
          "En rumføler i 406A/B skal melde den aktuelle temperatur til både panel og HVAC-regulering, så de altid kan vise og regne på den rigtige værdi.",
        path: ["Sensor måler 21,2 °C", "Sensorens måleobjekt sender 2-byte float", "Panel og HVAC modtager værdien", "Skærm opdateres og regulering bruger målingen"],
        facts: [
          "Sensoren er afsenderen, ikke modtageren.",
          "Aktuel temperatur er en målestatus – egen adresse i forhold til setpoint.",
          "Datatypen er stadig 2-byte float (DPT 9.001).",
        ],
        ga: "4/5/2",
        dpt: "9",
        gaOptions: ["4/5/1", "4/5/2", "4/1/1", "4/2/3"],
        dptOptions: ["1", "3", "5", "9"],
        success:
          "Korrekt. 4/5/2 er den aktuelle temperatur fra sensoren, og DPT 9.001 (2 byte float) bruges igen. Setpoint og målt temperatur skal aldrig dele adresse.",
      },
      {
        step: "Trin 12 · Scenekald",
        focus: "Tryk kalder scene 'Møde' (lys + persienne)",
        text:
          "Et scene-tryk skal kalde scenen ‘Møde’: lys på 80 %, persienne kørt halvt ned, projektor klar. Alle berørte aktuatorer skal lytte på samme scenekald.",
        path: ["Bruger trykker scene-knap", "Trykkets scene-objekt sender scene-nummer", "Lys-, persienne- og AV-aktuatorer modtager", "Hver aktuator afspiller sine forudgemte værdier"],
        facts: [
          "Et scenekald sender et scene-nummer, ikke en lysværdi.",
          "Flere aktuatorer lytter på samme scene-adresse.",
          "DPT 18.001 indeholder både scene-nummer og en flag for ‘kald’ vs. ‘gem’.",
        ],
        ga: "4/6/1",
        dpt: "18",
        gaOptions: ["4/6/1", "4/3/1", "4/2/2", "4/0/1"],
        dptOptions: ["1", "5", "17", "18"],
        success:
          "Korrekt. 4/6/1 er scenekaldet, og DPT 18.001 (1 byte Scene Control) bruges, så samme adresse både kan kalde og gemme scener. Aktuatorerne har selv gemt deres egen lys-, persienne- og AV-værdi for hver scene.",
      },
    ];
    var gaLabels = {
      "4/0/1": "4/0/1 – Lok. 406A/B – Tænd/sluk udgang 1",
      "4/0/2": "4/0/2 – Lok. 406A/B – Tænd/sluk udgang 2",
      "4/1/1": "4/1/1 – Lys – Status udgang 1",
      "4/2/1": "4/2/1 – Lys – Dæmpning op/ned (langt tryk)",
      "4/2/2": "4/2/2 – Lys – Dæmpeværdi (sæt 0–100 %)",
      "4/2/3": "4/2/3 – Lys – Status dæmpeværdi (0–100 %)",
      "4/3/1": "4/3/1 – Fælles sluk hele etagen",
      "4/4/1": "4/4/1 – Persienne – Kør op/ned",
      "4/4/2": "4/4/2 – Persienne – Stop / lameljustering",
      "4/5/1": "4/5/1 – Temperatur – Setpoint rum",
      "4/5/2": "4/5/2 – Temperatur – Aktuel måling (sensor)",
      "4/6/1": "4/6/1 – Scenekald (Møde / Aften / Rengøring)",
    };
    var dptLabels = {
      1: "DPT 1.xxx – 1 bit (tænd/sluk, op/ned, stop/step)",
      3: "DPT 3.xxx – 4 bit (relativ dæmpning op/ned)",
      5: "DPT 5.xxx – 1 byte (værdi 0–100 %)",
      9: "DPT 9.xxx – 2 byte float (temperatur, lux, fugt)",
      17: "DPT 17.xxx – 1 byte (scene-nummer)",
      18: "DPT 18.xxx – 1 byte (Scene Control: kald/gem)",
    };

    if (
      !form ||
      !gaSelect ||
      !dptSelect ||
      !result ||
      !scenarioText ||
      !scenarioFacts ||
      !scenarioStep ||
      !scenarioFocus ||
      !signalPath ||
      !progress
    ) return;

    function setResult(kind, text) {
      result.classList.remove("is-good", "is-warn");
      if (kind) result.classList.add(kind);
      result.textContent = text;
    }

    function renderScenario() {
      var scenario = scenarios[scenarioIndex];
      scenarioStep.textContent = scenario.step;
      scenarioFocus.textContent = scenario.focus;
      scenarioText.textContent = scenario.text;
      progress.textContent = "Trin " + (scenarioIndex + 1) + " / " + scenarios.length;
      signalPath.innerHTML = "";
      scenario.path.forEach(function (step) {
        var li = document.createElement("li");
        li.textContent = step;
        signalPath.appendChild(li);
      });
      scenarioFacts.innerHTML = "";
      scenario.facts.forEach(function (fact) {
        var li = document.createElement("li");
        li.textContent = fact;
        scenarioFacts.appendChild(li);
      });
      renderOptions(gaSelect, scenario.gaOptions, "Vælg gruppeadresse", gaLabels);
      renderOptions(dptSelect, scenario.dptOptions, "Vælg DPT", dptLabels);
      if (prevBtn) prevBtn.disabled = scenarioIndex === 0;
      if (nextBtn) nextBtn.textContent = scenarioIndex === scenarios.length - 1 ? "Start forfra" : "Næste scenarie";
      setResult("", "");
    }

    function renderOptions(select, values, placeholder, labels) {
      select.innerHTML = "";
      var empty = document.createElement("option");
      empty.value = "";
      empty.textContent = placeholder;
      select.appendChild(empty);
      values.forEach(function (value) {
        var option = document.createElement("option");
        option.value = value;
        option.textContent = labels[value] || value;
        select.appendChild(option);
      });
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var ga = gaSelect.value;
      var dpt = dptSelect.value;
      var scenario = scenarios[scenarioIndex];

      if (!ga || !dpt) {
        setResult("is-warn", "Vælg både gruppeadresse og datapunkttype, før du tjekker svaret.");
        return;
      }

      if (ga === scenario.ga && dpt === scenario.dpt) {
        setResult("is-good", scenario.success);
        return;
      }

      var dptHints = {
        1: "DPT 1.xxx er kun 1 bit – tænd/sluk, op/ned eller stop/step. Det kan ikke beskrive procent, temperatur eller scenekald.",
        3: "DPT 3.xxx er 4-bit relativ dæmpning – kun korrekt ved langt tryk op/ned, ikke ved en præcis værdi eller en almindelig kommando.",
        5: "DPT 5.xxx er 1 byte (0–100 %). Brug den, når der skal sendes en absolut procentværdi til et lys, ikke tænd/sluk eller temperatur.",
        9: "DPT 9.xxx er 2-byte float til måleværdier som temperatur, lux og fugt. Den passer ikke til en simpel kommando eller procent.",
        17: "DPT 17.xxx er kun et scene-nummer. I moderne anlæg vælger man typisk DPT 18.xxx, så samme telegram både kan kalde og gemme scener.",
        18: "DPT 18.xxx er ‘Scene Control’ – 1 byte med scene-nummer + et flag for kald/gem. Den hører kun til på en scene-adresse.",
      };

      if (ga === scenario.ga && dpt !== scenario.dpt) {
        var hint = dptHints[dpt] || "DPT'en passer ikke til værditypen i scenariet.";
        setResult(
          "is-warn",
          "Gruppeadressen er rigtig, men DPT'en passer ikke. " + hint
        );
        return;
      }

      if (ga !== scenario.ga && dpt === scenario.dpt) {
        setResult(
          "is-warn",
          "DPT'en passer til værditypen, men gruppeadressen matcher ikke signalvejen. Spørg: hvem sender, hvem modtager, og hvilken funktion handler det om?"
        );
        return;
      }

      if (scenario.ga === "4/1/1" && ga !== "4/1/1") {
        setResult(
          "is-warn",
          "Scenariet handler om en tilbagemelding (status). Status sendes af aktuatoren, ikke af trykket – og bør ligge på sin egen status-adresse."
        );
        return;
      }

      if (scenario.ga !== "4/1/1" && ga === "4/1/1") {
        setResult(
          "is-warn",
          "Du har valgt status-adressen, men scenariet er en kommando. Status er kun tilbagemelding fra aktuatoren, ikke det tryk skal sende."
        );
        return;
      }

      if (scenario.ga === "4/0/2" && ga === "4/0/1") {
        setResult(
          "is-warn",
          "4/0/1 er allerede taget af udgang 1. Når udgang 2 skal kunne styres uafhængigt, skal den have sin egen tænd/sluk-adresse."
        );
        return;
      }

      if (
        (scenario.ga === "4/4/1" || scenario.ga === "4/4/2") &&
        ga !== "4/4/1" && ga !== "4/4/2"
      ) {
        setResult(
          "is-warn",
          "Scenariet handler om persienne. Persienne hører til på sin egen mellemgruppe (4/4/x) – ikke sammen med lys eller fælles sluk."
        );
        return;
      }

      if (
        (scenario.ga === "4/5/1" || scenario.ga === "4/5/2") &&
        dpt !== "9"
      ) {
        setResult(
          "is-warn",
          "Temperaturer er måleværdier. Brug DPT 9.xxx (2-byte float) – 1 bit kan ikke beskrive en temperatur, og 1 byte er for upræcist."
        );
        return;
      }

      if (scenario.ga === "4/6/1" && dpt !== "18") {
        setResult(
          "is-warn",
          "Et scenekald skal sende et scene-nummer. DPT 18.001 bruges, så samme telegram både kan kalde og gemme scener."
        );
        return;
      }

      if (scenario.ga === "4/2/2" && dpt === "3") {
        setResult(
          "is-warn",
          "DPT 3.xxx er relativ dæmpning (op/ned). Når der skal sendes en præcis værdi som 60 %, skal du bruge DPT 5.001 (1 byte 0–100 %)."
        );
        return;
      }

      var stillHint = dptHints[dpt] ? " " + dptHints[dpt] : "";
      setResult(
        "is-warn",
        "Ikke helt. Spørg dig selv: er det kommando, status, præcis værdi, måling, persienne eller scene? Vælg derefter den adresse og DPT der passer." + stillHint
      );
    });

    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        scenarioIndex = Math.max(0, scenarioIndex - 1);
        renderScenario();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        scenarioIndex = (scenarioIndex + 1) % scenarios.length;
        renderScenario();
      });
    }

    form.addEventListener("reset", function () {
      window.setTimeout(function () {
        setResult("", "");
      }, 0);
    });

    renderScenario();
  }

  function initDaliExercise() {
    var form = document.getElementById("dali-exercise-form");
    var select = document.getElementById("dali-check-select");
    var result = document.getElementById("dali-exercise-result");

    if (!form || !select || !result) return;

    function setResult(kind, text) {
      result.classList.remove("is-good", "is-warn");
      if (kind) result.classList.add(kind);
      result.textContent = text;
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      if (!select.value) {
        setResult("is-warn", "Vælg hvad du vil kontrollere først.");
        return;
      }

      if (select.value === "mapping") {
        setResult(
          "is-good",
          "Korrekt. Når KNX-telegrammet findes i Group Monitor, er næste logiske tjek om KNX-DALI gatewayen mapper 4/0/1 til den rigtige DALI-gruppe/adresse."
        );
        return;
      }

      setResult(
        "is-warn",
        "Ikke første valg. Når telegrammet allerede ses i ETS, bør du først følge signalvejen ind i gatewayen og tjekke mappingen til DALI-gruppen."
      );
    });

    form.addEventListener("reset", function () {
      window.setTimeout(function () {
        setResult("", "");
      }, 0);
    });
  }

  function initQuickTests() {
    document.querySelectorAll("[data-quick-test]").forEach(function (box) {
      var buttons = box.querySelectorAll("button[data-correct]");
      var feedback = box.querySelector(".quick-test__feedback");
      if (!buttons.length || !feedback) return;

      buttons.forEach(function (button) {
        button.addEventListener("click", function () {
          var isCorrect = button.getAttribute("data-correct") === "true";
          buttons.forEach(function (b) {
            b.classList.remove("is-correct", "is-wrong", "is-selected");
            b.setAttribute("aria-pressed", "false");
          });

          button.classList.add(isCorrect ? "is-correct" : "is-wrong", "is-selected");
          button.setAttribute("aria-pressed", "true");
          feedback.classList.add("is-visible");
          feedback.classList.toggle("is-good", isCorrect);
          feedback.classList.toggle("is-warn", !isCorrect);
          feedback.textContent = (isCorrect ? "" : "Ikke helt. ") + feedback.dataset.answer;
        });
      });

      feedback.dataset.answer = feedback.textContent.trim();
      feedback.textContent = "";
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initTabs();
    initChecklists();
    initSubtabsContainers();
    initFaultFinding();
    initDistanceChecker();
    initDaylightDemo();
    fillWordTable();
    initQuiz();
    initFlashcards();
    initEtsExercise();
    initDaliExercise();
    initQuickTests();
  });
})();
