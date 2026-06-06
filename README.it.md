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

Un sistema operativo multi-Claude che gestisce il personale, indirizza, convalida ed esegue il lavoro attraverso 61 contratti di ruolo specializzati. Crea pacchetti di attività, assembla il team giusto in base a una valutazione dei ruoli, rileva eventuali problemi prima dell'esecuzione, indirizza automaticamente le azioni correttive quando il lavoro è bloccato o rifiutato e richiede prove strutturate per ogni decisione. Include una distribuzione dinamica per missioni di dimensioni variabili: un repository di 10 componenti diventa automaticamente 28 fasi di audit, anziché 6.

## A cosa serve

Role OS è il modo professionale per utilizzare multi-Claude. Previene i problemi specifici che i flussi di lavoro AI generici causano:

- **Deriva:** i ruoli rimangono all'interno dei loro ambiti. Il prodotto non viene riprogettato. Il frontend non ridefinisce l'ambito. Il backend non inventa la direzione del prodotto.
- **Completamento errato:** la definizione di "completato" è precisa. Il lavoro che nasconde lacune, omette la verifica o risolve un problema diverso viene rifiutato.
- **Contaminazione:** i progetti derivati o ereditati conservano residui di identità. Role OS rileva e rifiuta la deriva tra progetti in termini di terminologia, elementi visivi e modelli mentali.
- **Progressi basati su "sensazioni":** ogni passaggio è strutturato. Ogni decisione è collegata a prove. "Sembra completato" non è uno stato valido.

## Come funziona

Descrivi la tua attività. Role OS determina automaticamente il livello di orchestrazione appropriato.

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

**La scala di fallback:**

1. **Missione:** quando l'attività corrisponde a un flusso di lavoro ricorrente comprovato (correzione di bug, trattamento, rilascio di funzionalità, documentazione, sicurezza, ricerca, brainstorming, audit approfondito, test su larga scala). Catena di ruoli nota, flusso di artefatti, rami di escalation e definizioni parziali chiare.
2. **Pacchetto:** quando l'attività appartiene a una famiglia nota, ma non ha la forma completa di una missione. 10 pacchetti di team calibrati con selezione automatica e protezioni contro incongruenze.
3. **Instradamento libero:** quando l'attività è nuova, mista o incerta. Valuta tutti i 61 ruoli in base al contenuto del pacchetto e assembla una catena dinamica.

Il sistema non forza mai l'esecuzione del lavoro attraverso un livello di astrazione errato. Spiega perché ha scelto ogni livello e offre alternative.

**Un singolo comando per avviare l'esecuzione:**

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

Le esecuzioni vengono salvate su disco (`.claude/runs/`), in modo che le sessioni interrotte riprendano senza problemi. Ogni fase include indicazioni per l'operatore: cosa produrre, sezioni richieste e condizioni di arresto.

**Una volta instradato:**

1. **Ogni ruolo produce un passaggio:** output strutturato con elementi di prova che riducono l'ambiguità per il ruolo successivo.
2. **La revisione critica avviene in base al contratto:** accetta, rifiuta o blocca in base a prove strutturate, non a impressioni.
3. **L'instradamento per la correzione avviene automaticamente:** il lavoro bloccato o rifiutato viene indirizzato al risolutore corretto con una motivazione, il tipo di correzione e l'artefatto richiesto.

## Distribuzione consapevole del budget

Role OS può consultare un **analista del budget dei token** locale per ogni fase di distribuzione e allegare una previsione di spesa indicativa al manifesto: opzionale (`ROLEOS_BUDGET_CONSULT`), indicativa (non blocca mai una distribuzione) e con fallback a una base di riferimento deterministica. Disattivata per impostazione predefinita; la previsione è locale e gratuita. Consulta il [manuale](https://mcp-tool-shop-org.github.io/role-os/handbook/specialist-budget/).

## Stato di implementazione a livello di organizzazione

Lo stato di implementazione a livello di organizzazione (coda, decisioni, registri di audit, pacchetti di blocco per repository) è memorizzato in un repository privato separato: [`role-os-rollout`](https://github.com/mcp-tool-shop-org/role-os-rollout). Questo repository è il prodotto; l'altro repository è lo stato operativo.

## Memoria e continuità

Role OS non possiede né duplica il livello di memoria. Laddove esiste la memoria del progetto Claude, essa è il sistema di continuità canonico: i fatti del repository, le decisioni, i problemi irrisolti e la cronologia del trattamento sono memorizzati lì.

Role OS si integra con la memoria del progetto Claude. Non la sostituisce.

## Trattamento completo e controllo finale

Il trattamento completo è un protocollo canonico di 7 fasi definito nella memoria del progetto Claude (`memory/full-treatment.md`). Role OS instrada e rivede i trattamenti utilizzando contratti di ruolo, passaggi e porte di controllo: non ridefinisce il protocollo.

**Il controllo finale** è la serie di 31 elementi che costituisce la fase di controllo della qualità che viene eseguita prima del trattamento completo. Le porte rigide A-D devono essere superate prima che possa iniziare qualsiasi trattamento. Riferimento canonico: `memory/shipcheck.md`.

Ordine: prima il controllo finale, poi il trattamento completo. Nessuna versione 1.0.0 senza il superamento delle porte rigide.

## 61 ruoli suddivisi in 10 pacchetti

| Pacchetto | Ruoli |
|------|-------|
| **Core** (3) | Orchestratore, stratega del prodotto, revisore critico |
| **Engineering** (7) | Sviluppatore frontend, ingegnere backend, ingegnere di test, ingegnere di refactoring, ingegnere delle prestazioni, revisore delle dipendenze, revisore della sicurezza |
| **Design** (2) | Designer dell'interfaccia utente, responsabile del marchio |
| **Marketing** (1) | Copywriter per il lancio |
| **Treatment** (7) | Ricercatore del repository, traduttore del repository, architetto della documentazione, curatore dei metadati, revisore della copertura, verificatore della distribuzione, ingegnere del rilascio |
| **Product** (3) | Sintetizzatore di feedback, prioritizzatore della roadmap, scrittore di specifiche |
| **Research** (4) | Ricercatore UX, analista della concorrenza, ricercatore di tendenze, sintetizzatore di interviste con gli utenti |
| **Growth** (4) | Stratega del lancio, stratega dei contenuti, responsabile della community, responsabile del triage del supporto |
| **Deep Audit** (4) | Revisore dei componenti, revisore della verità dei test, revisore dei punti di connessione, sintetizzatore di audit |
| **Swarm** (7) | Coordinatore dello swarm, agente backend dello swarm, agente di collegamento dello swarm, agente di test dello swarm, agente dell'infrastruttura dello swarm, agente frontend dello swarm, sintetizzatore dello swarm |

Ogni ruolo ha un contratto completo: missione, quando usarlo, quando non usarlo, input previsti, output richiesti, standard di qualità e fattori scatenanti per l'escalation. Ogni ruolo è instradabile: `roleos route` può raccomandarne uno qualsiasi in base al contenuto del pacchetto.

## Avvio rapido

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

# Deep audit:
roleos audit manifest --generate   # Create audit-manifest.json
roleos audit                       # Start component-level deep audit
roleos audit status                # Check audit progress
roleos audit verify                # Verify manifest and outputs

# Dogfood swarm:
roleos swarm manifest --generate   # Auto-detect domains from repo structure
roleos swarm                       # Start multi-pass convergence swarm
roleos swarm status                # Check swarm progress by stage
roleos swarm findings              # List findings by severity
roleos swarm approve               # Approve feature gate

# Or go manual:
roleos start "fix the crash"   # Entry decision only (no run)
roleos packet new feature
roleos route .claude/packets/my-feature.md
roleos review .claude/packets/my-feature.md accept

# Explore missions and packs:
roleos mission list
roleos packs list
```

## Quando non usare Role OS

- Correzioni di singole righe, errori di battitura o bug evidenti
- Ricerca esplorativa senza risultati definiti
- Lavoro che può essere svolto da una sola persona in 5 minuti
- Correzioni urgenti che devono essere implementate prima del completamento del processo di revisione
- Progetti in cui si privilegia la velocità rispetto alla struttura

## Evidenza

Role OS è stato testato con tre diverse configurazioni in due repository strutturalmente differenti:

**Test 001 — Lavoro sulle funzionalità** (Schermata dell'equipaggio, Trasporto di merci)
- Catena di 7 ruoli, 45 scenari di test, 0 conflitti di ruolo
- Prevenzione di contaminazioni da rami precedenti, individuazione di invenzioni in corso, evidenziazione di ostacoli reali

**Test 002 — Lavoro di integrazione** (Collegamento CampaignState, Trasporto di merci)
- Catena di 5 ruoli, risoluzione di un problema architettonico senza ricorrere a soluzioni di ripiego
- I test anti-ripiego hanno dimostrato che il percorso attivo è reale, non un segnaposto

**Test 003 — Lavoro sull'identità** (Eliminazione delle contaminazioni, Trasporto di merci)
- Catena di 6 ruoli, 51 scenari di test, inclusa una difesa robusta contro le contaminazioni nel processo di integrazione continua
- Riparazione di incongruenze ereditate senza sfociare in una riprogettazione radicale

**Test di portabilità** (Coerenza della persona, umorismo sensoriale)
- Stessa struttura di base, linguaggio/dominio/stack diversi
- Adottato con modifiche al contesto, senza modifiche al contratto principale

**Trattamento completo FT-001** (portlight-desktop)
- Trattamento in 7 fasi con ruoli definiti nel Treatment Pack
- Il controllo Shipcheck è stato verificato, zero conflitti di ruolo

**Trattamento completo FT-002** (studioflow)
- Stesso Treatment Pack, repository strutturalmente diverso (spazio di lavoro creativo rispetto al gioco)
- Il Treatment Pack è portabile, non sono necessarie modifiche al contratto

**Sessione di brainstorming** (argomento del marketplace del server MCP)
- Catena di 9 ruoli, 4 analisti in parallelo, esame incrociato + confutazione del grafico delle controversie
- Sono state sollevate 4 sfide, 3 affermazioni sono state ridotte, 1 è rimasta irrisolta: una pressione sana, non uno stallo
- Più di 16 collegamenti di traccia dagli artefatti renderizzati agli atomi del livello di verità
- È stata dimostrata la completa catena di custodia: verità → atomi → controversia → sintesi → espansione → giudizio → renderizzazione → traccia

## Proprietà fondamentali

Queste sono innegociabili. Se una modifica le indebolisce, rifiutarla.

- I confini dei ruoli sono mantenuti
- La revisione è efficace
- L'escalation rimane trasparente
- I pacchetti rimangono testabili
- La portabilità richiede un adattamento al contesto, non un intervento radicale

## Struttura del progetto

```
role-os/
  bin/roleos.mjs               ← CLI entrypoint
  src/
    entry.mjs                  ← Unified entry: mission → pack → free routing
    entry-cmd.mjs              ← `roleos start` CLI command
    run.mjs                    ← Persistent run engine: create → step → pause → resume → report
    run-cmd.mjs                ← `roleos run/resume/next/explain/complete/fail` + interventions
    mission.mjs                ← 9 named mission types (feature, bugfix, treatment, docs, security, research, brainstorm, deep-audit, dogfood-swarm)
    mission-run.mjs            ← Mission runner: create → step → complete → report
    mission-cmd.mjs            ← `roleos mission` CLI commands
    audit-cmd.mjs              ← `roleos audit` — deep audit entry point with manifest generation
    swarm-cmd.mjs              ← `roleos swarm` — dogfood swarm entry point with domain detection
    swarm/                     ← Domain detection, build gate, evidence persistence bridge
    route.mjs                  ← 61-role routing + dynamic chain builder
    packs.mjs                  ← 10 calibrated team packs + auto-selection
    conflicts.mjs              ← 4-pass conflict detection
    escalation.mjs             ← Auto-routing for blocked/rejected/split
    evidence.mjs               ← Structured evidence + role-aware requirements
    dispatch.mjs               ← Runtime dispatch manifests for multi-claude
    tool-profiles.mjs          ← Per-role tool sandboxing (shared by dispatch + trial)
    state-machine.mjs          ← Canonical step/run transition maps
    artifacts.mjs              ← Per-role artifact contracts + pack handoffs
    decompose.mjs              ← Composite task detection + splitting
    composite.mjs              ← Dependency-ordered execution + recovery + cycle detection
    replan.mjs                 ← Mid-run adaptive replanning
    calibration.mjs            ← Outcome recording + weight tuning
    hooks.mjs                  ← 5 lifecycle hooks for runtime enforcement
    session.mjs                ← Session scaffolding + doctor
    brainstorm.mjs             ← Evidence modes, request validation, finding/synthesis/judge schemas
    brainstorm-roles.mjs       ← Role-native schemas, input partitioning, blindspot enforcement, cross-exam
    brainstorm-render.mjs      ← Two-layer rendering: lexical bans, render schemas, debate transcript
  test/                        ← 1150 tests across 37 test files
  starter-pack/                ← Drop-in role contracts, policies, schemas, workflows
```

## Sicurezza

Role OS opera **solo a livello locale**. Copia i modelli Markdown e scrive i file di pacchetto/verdetto nella directory `.claude/` del repository. Non accede alla rete, non gestisce segreti e non raccoglie dati di telemetria. Non esegue operazioni pericolose: tutte le scritture di file utilizzano di default l'opzione "salta se esiste". Consultare [SECURITY.md](SECURITY.md) per la politica completa.

## Il sistema operativo

| Livello | A cosa serve | Stato |
|-------|-------------|--------|
| **Routing** | Valuta tutti i 61 ruoli in base al contenuto del pacchetto, spiega le raccomandazioni, valuta il livello di confidenza | ✓ Implementato |
| **Chain builder** | Assembla catene ordinate per fasi dai ruoli valutati, con una preferenza per il tipo di pacchetto, ma non vincolato al modello | ✓ Implementato |
| **Conflict detection** | Validazione in 4 fasi: conflitti, sequenza, ridondanza, lacune nella copertura. Suggerimenti per la correzione. | ✓ Implementato |
| **Escalation** | Instrada automaticamente il lavoro bloccato/rifiutato/diviso verso il resolver corretto, con motivazione + artefatto richiesto | ✓ Implementato |
| **Evidence** | Evidenza strutturata e specifica per il ruolo nei verdetti. Controlli di sufficienza. 12 tipi di evidenza. | ✓ Implementato |
| **Dispatch** | Genera manifesti di esecuzione per multi-claude. Profili degli strumenti per ruolo, prompt di sistema, budget. | ✓ Implementato |
| **Trials** | Roster completo verificato: 30/30 attività principali + 5/5 test negativi. 7 test di pacchetto completati. | ✓ Completato |
| **Team Packs** | 10 pacchetti calibrati con selezione automatica, protezioni contro le incongruenze e fallback con instradamento libero. | ✓ Implementato |
| **Outcome calibration** | Registra i risultati dell'esecuzione, ottimizza i pesi dei pacchetti/ruoli in base ai risultati, regola le soglie di confidenza. | ✓ Implementato |
| **Mixed-task decomposition** | Rileva il lavoro composito, lo suddivide in pacchetti secondari, assegna i pacchetti, preserva le dipendenze. | ✓ Implementato |
| **Composite execution** | Esegue i pacchetti secondari in ordine di dipendenza con passaggio di artefatti, ripristino dei rami e sintesi. | ✓ Implementato |
| **Adaptive replanning** | Le modifiche all'ambito, le scoperte o i nuovi requisiti a metà dell'esecuzione aggiornano il piano senza riavviare. | ✓ Implementato |
| **Session spine** | `roleos init claude` crea i file CLAUDE.md, /roleos-route, /roleos-review, /roleos-status. `roleos doctor` verifica il collegamento. Le schede di instradamento dimostrano l'impegno. | ✓ Implementato |
| **Hook spine** | 5 hook del ciclo di vita (SessionStart, PromptSubmit, PreToolUse, SubagentStart, Stop). Applicazione di consigli: promemoria della scheda di instradamento, controllo dell'utilizzo degli strumenti, iniezione del ruolo del subagente, audit del completamento. | ✓ Implementato |
| **Artifact spine** | Contratti sugli artefatti per ruolo. Contratti di passaggio dei pacchetti. Validazione strutturale. Controlli di completezza della catena. I ruoli a valle non devono mai indovinare cosa hanno ricevuto. | ✓ Implementato |
| **Mission library** | 9 missioni nominate (feature-ship, bugfix, treatment, docs-release, security-hardening, research-launch, brainstorm, deep-audit, dogfood-swarm). Ognuna dichiara il pacchetto, la catena di ruoli, il flusso di artefatti, i rami di escalation, una definizione onesta e parziale. | ✓ Implementato |
| **Mission runner** | Crea esecuzioni, esegue i passaggi con lo stato tracciato, completa/fallisce con una segnalazione trasparente. Propagazione dei passaggi bloccati, avvisi di escalation al di fuori della catena, riapertura dell'ultimo passaggio. | ✓ Implementato |
| **Unified entry** | `roleos start` decide automaticamente se utilizzare una missione, un pacchetto o un instradamento libero. Scala di fallback con punteggi di confidenza, alternative e rilevamento di elementi compositi. | ✓ Implementato |
| **Persistent runs** | `roleos run` crea esecuzioni archiviate su disco. `resume`, `next`, `explain`, `complete`, `fail`. Interventi: reindirizzamento, escalation, riprova, blocco, riapertura. Guida specifica per ogni passaggio. Misurazione dell'attrito. | ✓ Implementato |
| **Brainstorm** | Architettura a due livelli: verità (schemi nativi del ruolo, atomi di provenienza, grafico delle controversie di esame incrociato) + renderizzazione (5 voci distinte, divieti lessicali, trascrizione del dibattito). I collegamenti di traccia dimostrano che ogni affermazione renderizzata corrisponde a un atomo di verità. Esecuzione di successo dimostrata. | ✓ Implementato |
| **Deep Audit** | Audit del repository basato sul manifest: scomporre il repository in componenti, assegnare N auditor + M auditor per la verifica dei test + K auditor per le interfacce dal grafico delle dipendenze, sintetizzare in una valutazione classificata e in un piano d'azione. L'assegnazione dinamica si adatta alle dimensioni del repository (formula 2N + K + 3). Esecuzione nativa con convalida degli artefatti a ogni passaggio. | ✓ Implementato |
| **Dogfood Swarm** | Convergenza multi-pass: tre fasi di verifica (bug/sicurezza → proattiva → umanizzazione) quindi fase delle funzionalità. Proprietà esclusiva dei file, controlli di build dopo ogni iterazione, checkpoint utente. Il rilevamento automatico del dominio genera i manifest. Collegamento alle prove per i test interni. | ✓ Implementato |

## 9 missioni

| Missione | Pacchetto | Ruoli | Quando utilizzare |
|---------|------|-------|-------------|
| `feature-ship` | Funzionalità | 5 | Consegna completa della funzionalità: ambito → specifiche → implementazione → test → revisione |
| `bugfix` | Correzione di bug | 4 | Diagnosticare la causa principale, correggere, testare, verificare |
| `treatment` | Intervento | 4 | Verifica prima della pubblicazione + rifinitura + documentazione + verifica CI + revisione |
| `docs-release` | Documentazione | 2 | Scrivere/aggiornare la documentazione, le note di rilascio |
| `security-hardening` | Sicurezza | 4 | Modello delle minacce, audit, correzione delle vulnerabilità, ri-audit, verifica |
| `research-launch` | Ricerca | 4 | Formulare la domanda, effettuare la ricerca, documentare i risultati, decidere |
| `brainstorm` | Brainstorming | 9 | Indagine strutturata e multi-prospettica con disaccordo e valutazione tracciabili |
| `deep-audit` | Audit approfondito | 5 (livelli) | Audit del repository basato sul manifest: il numero di worker si adatta al grafico del repository tramite l'assegnazione dinamica |
| `dogfood-swarm` | Swarm | 8 (livelli) | Convergenza multi-pass: health-a → health-b → health-c → funzionalità → sintesi finale |

Ogni missione include definizioni parziali e oneste: quando il lavoro si interrompe, il sistema documenta ciò che è stato completato e ciò che rimane, invece di fingere di aver completato tutto.

### Missione di brainstorming

Non si tratta di "brainstorming con l'IA". La missione di brainstorming prevede **ruoli specializzati definiti dalla legge, con disaccordo e risultati valutabili tracciabili.**

```bash
roleos run "explore product directions for a developer tool discovery platform"
# → MISSION: Brainstorm (Structured Inquiry)
#   Chain: 4 Analysts (parallel) → Normalize → Cross-Examine → Rebut → Synthesize → Expand → Judge
```

**Cosa la rende diversa:**

- **Livello 1 (verità):** Quattro analisti emettono schemi specifici per il ruolo (ContextMap, UserValueMap, MechanicsMap, PositioningMap) – non si tratta di prosa condivisa. Ogni ruolo applica un filtro per evitare punti ciechi: frasi proibite, tipi di affermazioni proibite, partizioni di input filtrate. Gli atomi contengono informazioni sulla provenienza. Un grafico di controinterrogatorio diretto produce sfide mirate. Gli analisti originali difendono, restringono o ritrattano sotto pressione.

- **Livello 2 (rendering):** Cinque voci umane distinte (Boundary Memo, Field Notes, System Sketch, Claim Brief, Cross-Exam Transcript) con divieti lessicali che impediscono la convergenza delle voci. La sintesi utilizza la verità, non la prosa resa. Entrambi i livelli sono sempre disponibili.

- **Catena di custodia:** Ogni frase resa può essere fatta risalire a un atomo del livello di verità. Le direttive di sintesi citano gli atomi. I target del controinterrogatorio sono ID di affermazioni reali. Il grafico delle controversie è il prodotto, non la prosa.

**Provato:** Esecuzione di riferimento v0.4: catena di custodia completa verificata. Consultare [`examples/golden-run.md`](examples/golden-run.md) per la catena completa degli artefatti.

### Missione di audit approfondito

Non si tratta di una scansione superficiale. La missione di audit approfondito **scompone un repository in componenti delimitati e assegna auditor specializzati in base a una scala determinata dal grafico delle dipendenze del repository stesso.**

```bash
roleos run "deep audit this repo" --manifest=audit-manifest.json
# → MISSION: Deep Audit (Manifest-Scaled)
#   Steps: Component Auditor ×6 + Test Truth Auditor ×6 + Seam Auditor ×8 + Synthesizer + Action Plan + Critic = 23 steps
```

**Cosa la rende diversa:**

- **Assegnazione dinamica:** il numero di worker non è fisso. Un repository con 10 componenti e 5 cluster di confine produce 28 passaggi (2 × 10 + 5 + 3). Un repository con 3 componenti produce 12 passaggi. La formula di scalabilità è `2N + K + 3`, dove N = componenti, K = confini.
- **Pacchetti basati sul manifest:** un file `audit-manifest.json` definisce i componenti (con percorsi dei file, conteggi delle righe, descrizioni) e i confini (da/a con descrizioni dell'interfaccia). Ogni auditor riceve solo il proprio pacchetto.
- **Quattro archetipi di ruolo:** Auditor dei componenti (verità del codice per modulo), Auditor della verifica dei test (test che dimostrano vs test che esistono), Auditor delle interfacce (confini di integrazione dal grafico delle dipendenze), Sintetizzatore dell'audit (valutazione classificata + piano d'azione da tutti i pacchetti).
- **Convalida degli artefatti a ogni passaggio:** `validateArtifact()` viene eseguito al termine di ogni passaggio in entrambi i percorsi di esecuzione. I risultati vengono allegati agli oggetti di passaggio. Il sistema sa se ogni artefatto ha soddisfatto il suo contratto.
- **Onestà parziale:** quando il budget o l'ambito impediscono il completamento, i risultati per componente sono validi individualmente. Il sistema sintetizza ciò che è stato completato, senza mai fingere di aver coperto tutto.

**Provato:** Esecuzione nativa di Runner: 18 test su un manifest reale, ciclo di vita completo verificato, inclusa la riapertura in caso di escalation e il fallimento parziale. La formula di scalabilità è stata verificata per manifest con 3/6/10/15 componenti.

### Missione di swarm per i test interni

Non si tratta di un linting a passaggio singolo. La missione di swarm per i test interni **esegue un protocollo di convergenza multi-pass che porta un repository da "funzionante" a "pronto per la produzione" attraverso tre fasi di verifica e la consegna iterativa delle funzionalità.**

```bash
roleos swarm
# → MISSION: Dogfood Swarm (Multi-Pass Convergence)
#   Stages: Health-A → Health-B → Health-C → Feature → Final
#   Domain agents: 3-5 parallel per wave (exclusive file ownership)
```

**Cosa la rende diversa:**

- **Sistema di controllo a tre fasi** — La fase A corregge bug e problemi di sicurezza (il ciclo continua finché non vengono risolti 0 problemi CRITICI e 0 problemi ALTI). La fase B applica misure di sicurezza proattive (gli utenti esaminano i risultati). La fase C rende il codice più intuitivo — messaggi di errore che aiutano gli utenti, feedback sulla riconnessione, indicatori di caricamento, accessibilità. Ogni fase rappresenta una prospettiva distinta e non è una semplice ripetizione della stessa scansione.
- **Proprietà esclusiva dei file** — ogni agente di dominio possiede file specifici tramite `swarm-manifest.json`. Nessun agente modifica lo stesso file. Nessun conflitto di unione. Nessun sovraccarico di coordinamento.
- **Controlli di build** — lint, controllo dei tipi e test devono essere superati dopo ogni ciclo. Il sistema rileva automaticamente il sistema di build (Node, Rust, Python, Go) ed esegue i comandi appropriati.
- **Punti di controllo utente** — Health-B e la fase di test delle funzionalità richiedono l'approvazione esplicita dell'utente prima dell'esecuzione. Il sistema presenta i risultati e l'utente decide cosa costruire.
- **Convergenza iterativa** — le fasi si ripetono in cicli finché non vengono soddisfatte le condizioni di uscita o raggiunto il numero massimo di iterazioni. Ogni ciclo riesamina tutto da zero per individuare eventuali regressioni introdotte dalle correzioni precedenti.
- **Rilevamento automatico del dominio** — `roleos swarm manifest --generate` rileva il tipo di repository (CLI, web, desktop, MCP, monorepo) e genera assegnazioni di dominio non sovrapposte.

**Dimostrato:** claude-collaborate (2026-03-28) — 35→129 test, 106 problemi di controllo risolti, versione v1.1.0 rilasciata. Protocollo v2.0 con 9 fasi.

## Stato

Stabile e pronto per il rilascio. Consultare il [REGISTRO DELLE MODIFICHE](CHANGELOG.md) per la cronologia completa delle versioni e le modifiche apportate in ogni rilascio.

## Licenza

MIT

---

Realizzato da <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a>
