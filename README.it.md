<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.md">English</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/role-os/readme.png" alt="Role OS" width="600">
</p>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/role-os/actions"><img src="https://github.com/mcp-tool-shop-org/role-os/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://www.npmjs.com/package/role-os"><img src="https://img.shields.io/npm/v/role-os" alt="npm"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License"></a>
  <a href="https://mcp-tool-shop-org.github.io/role-os/"><img src="https://img.shields.io/badge/Landing_Page-live-brightgreen" alt="Landing Page"></a>
</p>

Un sistema operativo multi-Claude che assegna personale, definisce i percorsi, convalida e gestisce i processi attraverso 50 contratti di ruolo specializzati. Crea pacchetti di attività, assembla il team giusto in base alla corrispondenza dei ruoli, rileva eventuali problemi prima dell'esecuzione, reindirizza automaticamente le attività in caso di blocco o rifiuto e richiede prove strutturate in ogni decisione.

## Cosa fa

Role OS è il modo professionale di utilizzare multi-Claude. Previene i problemi specifici che i flussi di lavoro AI generici possono causare:

- **Deviazioni (Drift)**: i ruoli rimangono nel loro ambito. Il prodotto non viene ridisegnato. L'interfaccia utente non ridefinisce l'ambito. Il backend non inventa la direzione del prodotto.
- **Completamenti errati (False completion)**: la definizione di "completato" è concreta. Il lavoro che nasconde lacune, omette verifiche o risolve un problema diverso viene rifiutato.
- **Contaminazione (Contamination)**: i progetti derivati o ereditati contengono residui di identità. Role OS rileva e rifiuta le deviazioni cross-progetto in termini, elementi visivi e modelli mentali.
- **Avanzamento basato su impressioni (Vibes-based progress)**: ogni passaggio è strutturato. Ogni decisione si basa su prove. "Sembra fatto" non è uno stato valido.

## Come funziona

Descrivi la tua attività. Role OS decide automaticamente il livello di orchestrazione appropriato.

```bash
roleos start "fix the crash in save handler"
# → MISSION: Bugfix & Diagnosis (70% confidence)
#   Chain: Repo Researcher → Backend Engineer → Test Engineer → Critic Reviewer

roleos start "add a new export command"
# → PACK: Feature Build (50% confidence)
#   Roles: Orchestrator, Product Strategist, Spec Writer, Backend Engineer, Test Engineer, Critic Reviewer

roleos start "something completely novel"
# → FREE-ROUTING (10% confidence)
#   Hint: Create a packet and run `roleos route` for role-level routing
```

**La gerarchia di fallback:**

1. **Missione** — quando l'attività corrisponde a un flusso di lavoro ricorrente consolidato (correzione di bug, trattamento, rilascio di funzionalità, documentazione, sicurezza, ricerca). Catena di ruoli nota, flusso di artefatti, rami di escalation e definizioni parziali chiare.
2. **Pacchetto** — quando l'attività appartiene a una famiglia nota ma non ha una struttura di missione completa. 7 pacchetti di team calibrati con selezione automatica e protezioni contro errori.
3. **Routing libero** — quando l'attività è nuova, complessa o incerta. Valuta tutti i 31 ruoli in base al contenuto del pacchetto e crea una catena dinamica.

Il sistema non forza mai l'esecuzione di un'attività attraverso un livello di astrazione errato. Spiega perché ha scelto ogni livello e offre alternative.

**Un comando per avviare l'esecuzione:**

```bash
roleos run "fix the crash in save handler"
# → Created run: run-1234
# → Entry: MISSION (bugfix)
# → Started step 0: Repo Researcher → diagnosis-report
# → Guidance: Required sections: entrypoints, module-map, build-test-commands

roleos next                    # Start the next step
roleos complete diagnosis.md   # Complete the active step with artifact
roleos explain                 # Show full run state and guidance
roleos resume                  # Continue an interrupted run
roleos report                  # Generate completion report
roleos friction                # Measure operator touches
```

**Interventi in caso di problemi:**

```bash
roleos retry 0                 # Retry a failed step
roleos reroute 1 "Frontend Developer" "UI bug"  # Swap a role
roleos escalate "Test Engineer" "Repo Researcher" "missed edge case" "re-diagnose"
roleos block 2 "waiting for API spec"
roleos reopen 0 "found issue in review"
```

I processi vengono salvati su disco (`.claude/runs/`), quindi le sessioni interrotte possono essere riprese correttamente. Ogni fase include una guida per l'operatore: cosa produrre, sezioni richieste e condizioni di arresto.

**Una volta definito il percorso:**

1. **Ogni ruolo produce un passaggio** — output strutturato con elementi di prova che riducono l'ambiguità per il ruolo successivo.
2. **La revisione verifica rispetto al contratto** — accetta, rifiuta o blocca in base a prove strutturate, non a impressioni.
3. **Il percorso di ripristino viene attivato automaticamente** — le attività bloccate o rifiutate vengono reindirizzate al risolutore appropriato, con una motivazione, il tipo di ripristino e l'artefatto richiesto.

## Stato di implementazione a livello di organizzazione

Lo stato di implementazione a livello di organizzazione (coda, decisioni, registri di controllo, pacchetti di blocco per repository) è contenuto in un repository privato separato: [`role-os-rollout`](https://github.com/mcp-tool-shop-org/role-os-rollout). Questo repository contiene il prodotto; quello è lo stato operativo.

## Memoria e continuità

Role OS non possiede né duplica il livello di memoria. Quando esiste la memoria del progetto Claude, questa è il sistema di continuità canonico: i fatti del repository, le decisioni, i problemi aperti e la cronologia delle modifiche sono memorizzati lì.

Role OS si integra con la memoria del progetto Claude. Non la sostituisce.

## Elaborazione completa e controllo di qualità

L'elaborazione completa è un protocollo canonico di 7 fasi definito nella memoria del progetto Claude (`memory/full-treatment.md`). Role OS indirizza e valuta le elaborazioni utilizzando contratti di ruolo, passaggi e controlli, ma non ridefinisce il protocollo.

Il **controllo di qualità (shipcheck)** è il sistema di controllo di 31 elementi che viene eseguito prima dell'elaborazione completa. I controlli obbligatori A-D devono essere superati prima che qualsiasi elaborazione possa iniziare. Riferimento canonico: `memory/shipcheck.md`.

Ordine: controllo di qualità, quindi elaborazione completa. Nessuna versione 1.0.0 senza aver superato i controlli obbligatori.

## 32 ruoli in 8 pacchetti

| Pacchetto | Ruoli |
|------|-------|
| **Core** (3) | Orchestratore, Product Strategist, Recensore |
| **Engineering** (7) | Sviluppatore Frontend, Ingegnere Backend, Ingegnere di Test, Ingegnere di Refactoring, Ingegnere delle Prestazioni, Revisore delle Dipendenze, Revisore di Sicurezza |
| **Design** (2) | UI Designer, Responsabile del Brand |
| **Marketing** (1) | Copywriter per il lancio |
| **Treatment** (7) | Ricercatore di Repository, Traduttore di Repository, Architetto della Documentazione, Curatore dei Metadati, Revisore della Copertura, Verificatore del Deployment, Ingegnere del Rilascio |
| **Product** (3) | Generatore di feedback, Prioritizzatore di roadmap, Redattore di specifiche. |
| **Research** (4) | Ricercatore UX, Analista della Concorrenza, Ricercatore di Tendenze, Sintetizzatore di Interviste con gli Utenti |
| **Growth** (4) | Strategista per il lancio, Strategista dei Contenuti, Community Manager, Responsabile del Supporto |

Ogni ruolo ha un contratto completo: missione, quando utilizzarlo, quando non utilizzarlo, input richiesti, output necessari, standard di qualità e trigger di escalation. Ogni ruolo può essere indirizzato — `roleos route` può suggerirne uno qualsiasi in base al contenuto del pacchetto.

## Guida rapida

```bash
npx role-os init

# Describe what you need — Role OS picks the right level:
roleos run "fix the crash in save handler"
# → Creates run, picks bugfix mission, starts first step with guidance

# Step through:
roleos next                    # Start next step
roleos complete artifact.md    # Complete with artifact
roleos explain                 # Show full state
roleos report                  # Completion report

# Or go manual:
roleos start "fix the crash"   # Entry decision only (no run)
roleos packet new feature
roleos route .claude/packets/my-feature.md
roleos review .claude/packets/my-feature.md accept

# Explore missions and packs:
roleos mission list
roleos packs list
```

## Quando non utilizzare Role OS

- Correzioni di una sola riga, errori di battitura o bug evidenti
- Ricerche esplorative senza un output definito
- Lavori che possono essere completati nella mente di una persona in 5 minuti
- Correzioni urgenti che devono essere rilasciate prima che la catena di revisione sia completa
- Progetti in cui si privilegia la velocità rispetto alla struttura

## Prove

Role OS è stato testato in tre scenari diversi in due repository strutturalmente diversi:

**Test 001 — Sviluppo funzionalità** (Schermata Crew, Star Freight)
- Catena di 7 ruoli, 45 scenari di test, 0 conflitti di ruolo.
- Ha prevenuto la contaminazione da un progetto antenato, ha rilevato modifiche non autorizzate e ha evidenziato i blocchi reali.

**Test 002 — Integrazione** (Collegamento CampaignState, Star Freight)
- Catena di 5 ruoli, ha risolto la connessione architetturale senza soluzioni di ripiego.
- I test anti-fallback hanno dimostrato che il percorso attivo è reale, non un segnaposto.

**Test 003 — Correzione di identità** (Pulizia della contaminazione, Star Freight)
- Catena di 6 ruoli, 51 scenari di test, inclusa la difesa duratura contro la contaminazione del sistema di integrazione continua.
- Ha corretto le incongruenze ereditate senza dover rifare completamente il progetto.

**Prova di portabilità** (Coerenza della persona, sensibilità al contesto)
- Stessa struttura di base, ma con linguaggio/ambito/stack diversi.
- Adattamento solo al contesto, senza modifiche al contratto principale.

**Trattamento completo FT-001** (portlight-desktop)
- Trattamento con personale dedicato in 7 fasi, con ruoli del pacchetto di trattamento
- Controllo di spedizione dimostrato, zero conflitti tra ruoli

**Trattamento completo FT-002** (studioflow)
- Stesso pacchetto di trattamento, repository strutturalmente diverso (spazio di lavoro creativo vs gioco)
- Pacchetto di trattamento portatile: non sono necessarie modifiche al contratto

**Esempio di esecuzione ottimale** (argomento del marketplace dei server MCP)
- Catena di 9 ruoli, 4 analisti in parallelo, esame incrociato + grafico di contestazione e replica.
- 4 sfide proposte, 3 affermazioni raffinate, 1 irrisolta — pressione sana, non stallo.
- Oltre 16 collegamenti di tracciamento dagli artefatti generati agli elementi fondamentali di verità.
- Catena di custodia completa dimostrata: verità → elementi → contestazione → sintesi → espansione → giudizio → rendering → tracciamento.

## Proprietà fondamentali

Queste sono non negoziabili. Se una modifica ne indebolisce una, rifiutarla.

- I confini dei ruoli rimangono validi.
- La revisione è efficace.
- L'escalation rimane trasparente.
- I pacchetti rimangono testabili.
- La portabilità richiede adattamento al contesto, non modifiche radicali.

## Struttura del progetto

```
role-os/
  bin/roleos.mjs               ← CLI entrypoint
  src/
    entry.mjs                  ← Unified entry: mission → pack → free routing
    entry-cmd.mjs              ← `roleos start` CLI command
    run.mjs                    ← Persistent run engine: create → step → pause → resume → report
    run-cmd.mjs                ← `roleos run/resume/next/explain/complete/fail` + interventions
    mission.mjs                ← 7 named mission types (feature, bugfix, treatment, docs, security, research, brainstorm)
    mission-run.mjs            ← Mission runner: create → step → complete → report
    mission-cmd.mjs            ← `roleos mission` CLI commands
    route.mjs                  ← 31-role routing + dynamic chain builder
    packs.mjs                  ← 7 calibrated team packs + auto-selection
    conflicts.mjs              ← 4-pass conflict detection
    escalation.mjs             ← Auto-routing for blocked/rejected/split
    evidence.mjs               ← Structured evidence + role-aware requirements
    dispatch.mjs               ← Runtime dispatch manifests for multi-claude
    artifacts.mjs              ← 30 per-role artifact contracts + 7 pack handoffs
    decompose.mjs              ← Composite task detection + splitting
    composite.mjs              ← Dependency-ordered execution + recovery
    replan.mjs                 ← Mid-run adaptive replanning
    calibration.mjs            ← Outcome recording + weight tuning
    hooks.mjs                  ← 5 lifecycle hooks for runtime enforcement
    session.mjs                ← Session scaffolding + doctor
    brainstorm.mjs             ← Evidence modes, request validation, finding/synthesis/judge schemas
    brainstorm-roles.mjs       ← Role-native schemas, input partitioning, blindspot enforcement, cross-exam
    brainstorm-render.mjs      ← Two-layer rendering: lexical bans, render schemas, debate transcript
  test/                        ← 894 tests across 30 test files
  starter-pack/                ← Drop-in role contracts, policies, schemas, workflows
```

## Sicurezza

Il sistema operativo del ruolo opera **solo localmente**. Copia i modelli Markdown e scrive i file dei pacchetti/verdetto nella directory `.claude/` del tuo repository. Non accede alla rete, non gestisce segreti e non raccoglie dati di telemetria. Nessuna operazione pericolosa: tutte le scritture di file utilizzano la funzione "skip-if-exists" per impostazione predefinita. Consultare il file [SECURITY.md](SECURITY.md) per la politica completa.

## Il sistema operativo

| Livello | Cosa fa | Stato |
|-------|-------------|--------|
| **Routing** | Valuta tutti i 31 ruoli in base al contenuto del pacchetto, spiega le raccomandazioni, valuta la confidenza. | ✓ Implementato |
| **Chain builder** | Assembla catene ordinate per fase dai ruoli valutati, orientato al tipo di pacchetto, non vincolato a modelli. | ✓ Implementato |
| **Conflict detection** | Convalida in 4 passaggi: conflitti evidenti, sequenza, ridondanza, lacune di copertura. Suggerimenti per la correzione. | ✓ Implementato |
| **Escalation** | Reindirizza automaticamente le attività bloccate/rifiutate/divise al risolutore appropriato con motivazione e artefatto richiesto. | ✓ Implementato |
| **Evidence** | Prove strutturate e specifiche per il ruolo nelle decisioni. Controlli di completezza. 12 tipi di prove. | ✓ Implementato |
| **Dispatch** | Genera manifesti di esecuzione per multi-claude. Profili degli strumenti per ruolo, prompt di sistema, budget. | ✓ Implementato |
| **Trials** | Roster completo dimostrato: 30/30 attività di successo + 5/5 test negativi. 7 test di pacchetto completati. | ✓ Completo |
| **Team Packs** | 7 pacchetti calibrati con selezione automatica, protezioni contro errori e fallback con routing libero. | ✓ Implementato |
| **Outcome calibration** | Registra i risultati delle esecuzioni, regola i pesi dei pacchetti/ruoli in base ai risultati e adatta le soglie di confidenza. | ✓ Implementato |
| **Mixed-task decomposition** | Rileva attività complesse, le suddivide in pacchetti secondari, assegna i pacchetti e preserva le dipendenze. | ✓ Implementato |
| **Composite execution** | Esegue i pacchetti secondari in ordine di dipendenza, trasferendo gli artefatti, gestendo il ripristino dei rami e la sintesi. | ✓ Implementato |
| **Adaptive replanning** | Modifiche, scoperte o nuovi requisiti durante l'esecuzione aggiornano il piano senza doverlo riavviare. | ✓ Implementato |
| **Session spine** | `roleos init claude` crea i file CLAUDE.md, /roleos-route, /roleos-review, /roleos-status. `roleos doctor` verifica la configurazione. Le schede di routing indicano l'impegno. | ✓ Implementato |
| **Hook spine** | 5 hook del ciclo di vita (SessionStart, PromptSubmit, PreToolUse, SubagentStart, Stop). Applicazione di regole: promemoria sulle schede di routing, controllo sull'uso degli strumenti, assegnazione di ruoli ai subagent e verifica della completezza. | ✓ Implementato |
| **Artifact spine** | 30 contratti per ruolo relativi agli artefatti. 7 contratti di passaggio dei pacchetti. Validazione strutturale. Controlli di completezza della catena. Gli altri ruoli non devono mai indovinare cosa hanno ricevuto. | ✓ Implementato |
| **Mission library** | 7 missioni denominate (feature-ship, bugfix, treatment, docs-release, security-hardening, research-launch, brainstorm). Ognuna definisce pacchetti, catena di ruoli, flusso di artefatti, rami di escalation e una definizione parziale e onesta. Tutte e 7 sono state testate. | ✓ Implementato |
| **Mission runner** | Crea esecuzioni, esegui passo dopo passo con tracciamento dello stato, completa o fallisci con reportistica onesta. Propagazione dei passaggi bloccati, avvisi di escalation fuori catena, riapertura dell'ultimo passaggio. | ✓ Implementato |
| **Unified entry** | `roleos start` decide automaticamente tra missione, pacchetto o routing libero. Sistema di fallback con punteggi di confidenza, alternative e rilevamento di attività complesse. | ✓ Implementato |
| **Persistent runs** | `roleos run` crea esecuzioni basate su file. Comandi: `resume`, `next`, `explain`, `complete`, `fail`. Interventi: reindirizzamento, escalation, riprova, blocco, riapertura. Guida specifica per ogni passaggio. Misurazione dell'attrito. | ✓ Implementato |
| **Brainstorm** | Architettura a due livelli: verità (schemi nativi per ruolo, atomi di provenienza, grafo di contestazione incrociata) + rendering (5 voci distinte, divieti lessicali, trascrizione del dibattito). I collegamenti di traccia dimostrano che ogni affermazione resa corrisponde a un atomo di verità. Esecuzione di riferimento: 894 test. | ✓ Implementato |

## 7 missioni

| Missione | Pacchetto | Ruoli | Quando utilizzarla |
|---------|------|-------|-------------|
| `feature-ship` | funzionalità | 5 | Consegna completa della funzionalità: ambito → specifica → implementazione → test → revisione |
| `bugfix` | correzione di bug | 4 | Diagnosi della causa principale, correzione, test, verifica |
| `treatment` | ottimizzazione | 4 | Controllo + rifinitura + documentazione + verifica CI + revisione |
| `docs-release` | documentazione | 2 | Scrittura/aggiornamento della documentazione, note di rilascio |
| `security-hardening` | Sicurezza | 4 | Modello delle minacce, audit, correzione delle vulnerabilità, nuovo audit, verifica |
| `research-launch` | ricerca | 4 | Formulazione della domanda, ricerca, documentazione dei risultati, decisione |
| `brainstorm` | brainstorming | 9 | Indagine strutturata con molteplici prospettive, con disaccordo tracciabile e output con verdetto |

Ogni missione include definizioni parziali e oneste: quando il lavoro si blocca, il sistema documenta ciò che è stato completato e ciò che rimane, invece di dichiarare falsamente il completamento.

### Missione di brainstorming

Non "brainstorming dell'IA". La missione di brainstorming è **un insieme di ruoli specializzati, con disaccordo tracciabile e output con verdetto.**

```bash
roleos run "explore product directions for a developer tool discovery platform"
# → MISSION: Brainstorm (Structured Inquiry)
#   Chain: 4 Analysts (parallel) → Normalize → Cross-Examine → Rebut → Synthesize → Expand → Judge
```

**Cosa la rende diversa:**

- **Livello 1 (verità):** Quattro analisti emettono schemi nativi per ruolo (ContextMap, UserValueMap, MechanicsMap, PositioningMap) — non prosa condivisa. Ogni ruolo è soggetto a controlli per evitare punti ciechi: frasi vietate, tipi di affermazioni vietate, partizioni di input filtrate. Gli atomi contengono informazioni sulla provenienza. Un grafo di contestazione incrociata genera sfide mirate. Gli analisti originali difendono, restringono o ritraggono le loro affermazioni sotto pressione.

- **Livello 2 (rendering):** Cinque voci umane distinte (Boundary Memo, Field Notes, System Sketch, Claim Brief, Cross-Exam Transcript) con restrizioni lessicali che impediscono la convergenza delle voci. La sintesi utilizza informazioni verificate, ma non produce testo. Entrambi i livelli sono sempre disponibili.

- **Catena di custodia:** Ogni frase generata può essere ricondotta a un elemento del livello di verità. Le istruzioni di sintesi fanno riferimento a questi elementi. Le domande di controinterrogatorio si basano su identificativi di pretese reali. Il grafo delle controversie è il risultato, non il testo.

**Verificato:** Versione 0.4, test completi — 894 test, catena di custodia completamente verificata. Consultare [`examples/golden-run.md`](examples/golden-run.md) per la catena completa degli artefatti.

## Stato

- v0.1–v0.4: Fondamenta — test, adozione, pacchetto di trattamento, pacchetto di avvio
- v1.0.0: 32 ruoli, interfaccia a riga di comando completa, trattamento verificato, portabilità multi-repository
- v1.0.2: Blocco del sistema operativo dei ruoli (correzioni iniziali della verità, init --force)
- v1.1.0: 31 ruoli, infrastruttura di routing completa, rilevamento dei conflitti, escalation, prove, dispatch, 7 pacchetti di team verificati. 35 esecuzioni di prova. 212 test.
- v1.2.0: Pacchetti calibrati promossi a impostazione predefinita. Selezione automatica, rilevamento delle incongruenze, suggerimenti alternativi, fallback di routing libero. 246 test.
- v1.3.0: Calibrazione dei risultati, decomposizione di attività complesse, esecuzione composita, riprogrammazione adattiva. 317 test.
- v1.4.0: Infrastruttura delle sessioni — `roleos init claude`, `roleos doctor`, schede di routing, comandi /roleos-route + /roleos-review + /roleos-status. 335 test.
- v1.5.0: Infrastruttura degli hook — 5 hook del ciclo di vita per l'applicazione in fase di esecuzione. 358 test.
- v1.6.0: Infrastruttura degli artefatti — 20 contratti di artefatti specifici per ruolo, 7 contratti di trasferimento di pacchetti, convalida strutturale. 385 test.
- v1.7.0: Dimostrazione del completamento — attività reali eseguite sull'intera piattaforma. Interfaccia a riga di comando `roleos artifacts`. Escalation trasparente per le correzioni strutturali. 398 test.
- v1.8.0: Libreria di missioni (Fase S) — 6 missioni denominate, motore di esecuzione, report di completamento. Rafforzata da 6 esecuzioni di prova reali. 481 test.
- v1.9.0: Percorso di accesso unificato (Fase T) — `roleos start` decide automaticamente tra missione, pacchetto o routing libero. Scala di fallback, rilevamento composito, test di confronto del percorso di accesso. 527 test.
- **v2.0.0**: Ottimizzazione dell'esperienza utente (Fase U) — `roleos run` crea esecuzioni persistenti supportate dal disco. Riprendi, successivo, spiega, completa, fallisci. Interventi: reindirizza, aumenta, riprova, blocca, riapri. Guida specifica per ogni passaggio. Misurazione dell'attrito. 6 test di attrito. 613 test.
- **v2.0.1**: Revisione del manuale, documentazione per principianti, correzioni del conteggio dei test. 617 test.
- **v2.1.0**: Missione di brainstorming (v0.4) — ruoli specializzati nel campo legale, disaccordo tracciabile, output con valore probatorio. Architettura a due livelli (verità + rendering), matrice di autorizzazioni per il controinterrogatorio, grafo delle controversie, prova di esecuzione completa. 7 missioni, 50 ruoli, 8 pacchetti. 894 test.

## Licenza

MIT

---

Creato da <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a
