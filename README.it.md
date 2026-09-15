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

Un livello operativo nativo per repository che gestisce, indirizza, convalida ed esegue il lavoro degli agenti di codifica attraverso 61 contratti di ruolo specializzati. Crea pacchetti di attività, assembla il team giusto in base a una valutazione dei ruoli, rileva eventuali problemi prima dell'esecuzione, indirizza automaticamente il recupero quando il lavoro viene bloccato o rifiutato e richiede prove strutturate in ogni valutazione. Include la distribuzione dinamica per missioni su larga scala: un repository con 10 componenti diventa automaticamente un processo di audit con 28 passaggi, anziché 6.

L'adattatore Claude Code è disponibile (`roleos init` fornisce gli schemi `.claude/`). I contratti sono in formato markdown, quindi possono essere utilizzati da qualsiasi framework di codifica. Questo repository non afferma che un secondo adattatore sia già in esecuzione.

## A cosa serve

Role OS è il modo professionale per gestire il lavoro degli agenti di codifica. Previene i problemi specifici che i flussi di lavoro AI generici causano:

- **Deriva:** i ruoli rimangono all'interno dei loro ambiti. Il prodotto non viene riprogettato. Il frontend non ridefinisce l'ambito. Il backend non inventa la direzione del prodotto.
- **Completamento errato:** la definizione di "completato" è precisa. Il lavoro che nasconde lacune, omette la verifica o risolve un problema diverso viene rifiutato.
- **Contaminazione:** i progetti derivati o ereditati conservano residui di identità. Role OS rileva e rifiuta la deriva tra progetti in termini di terminologia, elementi visivi e modelli mentali.
- **Progressi basati sulle sensazioni:** ogni passaggio è strutturato. Ogni valutazione è collegata a prove. "Sembra completato" non è uno stato valido.

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

1. **Missione:** quando l'attività corrisponde a un flusso di lavoro ricorrente comprovato (correzione di bug, trattamento, rilascio di funzionalità, documentazione, sicurezza, ricerca, brainstorming, audit approfondito, test su un gruppo ristretto). Catena di ruoli nota, flusso di artefatti, rami di escalation e definizioni parziali oneste.
2. **Pacchetto:** quando l'attività appartiene a una famiglia nota, ma non ha la forma completa di una missione. 10 pacchetti di team calibrati con selezione automatica e protezioni contro le incongruenze.
3. **Instradamento libero:** quando l'attività è nuova, mista o incerta. Valuta tutti i 61 ruoli in base al contenuto del pacchetto e assembla una catena dinamica.

Il sistema non forza mai il lavoro attraverso un'astrazione errata. Spiega perché ha scelto ogni livello e offre alternative.

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

**Interventi quando qualcosa va storto:**

```bash
roleos retry 0                 # Retry a failed step
roleos reroute 1 "Frontend Developer" "UI bug"  # Swap a role
roleos escalate "Test Engineer" "Repo Researcher" "missed edge case" "re-diagnose"
roleos block 2 "waiting for API spec"
roleos reopen 0 "found issue in review"
```

Le esecuzioni vengono salvate su disco (`.claude/runs/`), quindi le sessioni interrotte riprendono senza problemi. Ogni passaggio include le istruzioni per l'operatore: cosa produrre, sezioni richieste e condizioni di arresto.

**Una volta instradato:**

1. **Ogni ruolo produce un passaggio:** output strutturato con elementi di prova che riducono l'ambiguità per il ruolo successivo.
2. **La revisione critica viene eseguita in base al contratto:** accetta, rifiuta o blocca in base a prove strutturate, non a impressioni.
3. **L'instradamento di recupero avviene automaticamente:** il lavoro bloccato o rifiutato viene indirizzato al risolutore corretto con una motivazione, un tipo di recupero e l'artefatto richiesto.

## Distribuzione consapevole del budget

Role OS può consultare un **analista del budget dei token** locale per ogni passaggio di distribuzione e allegare una previsione di spesa consultiva al manifesto: facoltativo (`ROLEOS_BUDGET_CONSULT`), consultivo (non blocca mai una distribuzione) e con fallback a una base deterministica. Disattivato per impostazione predefinita; la previsione è locale e gratuita. Consulta il [manuale](https://mcp-tool-shop-org.github.io/role-os/handbook/specialist-budget/).

## Supervisione delle chiamate agli strumenti

Role OS verifica e controlla le chiamate agli strumenti al punto `PreToolUse`, in modo deterministico, senza modelli attivi:

- **Monitoraggio della conformità** (consultivo, con fallback) — uno schema deterministico + un limite di contratto calcolabile verifica una chiamata proposta rispetto al suo catalogo di contratti di strumenti e allega una valutazione consultiva su una chiamata *comprovatamente* non conforme; non blocca mai. Un limite LLM facoltativo (`ROLEOS_CONFORMANCE_CONSULT`) gestisce i residui genuinamente semantici.
- **Controllo delle capacità** (blocco in caso di errore, facoltativo `ROLEOS_CAPABILITY_GATE`, disattivato per impostazione predefinita) — principio del minimo privilegio deterministico sulle azioni *irreversibili* (pubblicazione su npm/PyPI, `gh release`, `git push`, modifiche al repository, distribuzione su Pages). Un'azione controllata viene negata a meno che il direttore non abbia concesso la sua capacità in `.claude/role-os/capabilities.json`, quindi un passaggio errato (un errore onesto o uno iniettato) non può attivare un'azione irreversibile non autorizzata. Il complemento preventivo della regola del compensatore denominato. Consulta il [manuale](https://mcp-tool-shop-org.github.io/role-os/handbook/).

## Dossier dell'equipaggio

Ogni ruolo ha un **dossier:** una scheda del personaggio che funge anche da configurazione in fase di esecuzione. Sei attitudini (Rigore, Ritmo, Portata, Scetticismo, Autonomia, Candore) corrispondono a controlli di distribuzione reali; uno strato di **disposizione** con otto archetipi (Scettico, Costruttore, Investigatore, Innovatore...) contiene un'istruzione comportamentale; e ogni ruolo ha un ritratto e una valutazione. Esplora l'intero equipaggio come una galleria (`dossier/dossier.html`): il radar di ogni ruolo mostra la sua configurazione ottimizzata rispetto al suo ideale canonico.

Quando un ruolo ha un dossier, la distribuzione inserisce una **postura operativa:** l'istruzione comportamentale della disposizione più una linea di postura dalle attitudini del ruolo, quindi la scheda configura effettivamente il ruolo. Facoltativo e additivo: i ruoli senza un dossier si comportano esattamente come prima. Consulta il [manuale](https://mcp-tool-shop-org.github.io/role-os/handbook/crew-dossier/).

## Stato di implementazione a livello di organizzazione

Lo stato di implementazione a livello di organizzazione (coda, decisioni, registri di audit, pacchetti di blocco per repository) si trova in un repository **privato** e interno all'organizzazione separato (`role-os-rollout`). Questo repository è il prodotto; quell'altro repository è lo stato operativo.

## Memoria e continuità

Role OS non possiede né duplica il livello di memoria. Quando esiste un archivio di memoria del progetto, è il sistema di continuità canonico: i fatti del repository, le decisioni, i problemi aperti e la cronologia del trattamento si trovano lì.

Role OS si integra con tale archivio quando è presente. Non lo sostituisce.

## Trattamento completo e controllo del progetto

Il trattamento completo è un protocollo canonico di 7 fasi definito nella memoria del progetto (`memory/full-treatment.md`). Role OS gestisce e rivede i trattamenti utilizzando contratti di ruolo, passaggi di consegne e punti di controllo critici; non ridefinisce il protocollo.

**Shipcheck** è il controllo di qualità composto da 31 elementi che viene eseguito prima del trattamento completo. I controlli rigorosi A-D devono essere superati prima dell'inizio di qualsiasi trattamento. Riferimento canonico: `memory/shipcheck.md`.

Ordine: prima Shipcheck, poi trattamento completo. Nessuna versione 1.0.0 senza il superamento dei controlli rigorosi.

## Il catalogo dei 61 ruoli

Il catalogo raggruppa i suoi 61 ruoli in 11 famiglie. (Dispatch utilizza un set separato di 10 **pacchetti di team** — funzionalità, correzioni di bug, sicurezza, documentazione, lancio, ricerca, trattamento, audit approfondito, brainstorming, gruppo di lavoro — che attingono ruoli da queste famiglie).

| Famiglia | Ruoli |
|--------|-------|
| **Core** (2) | Orchestratore, revisore critico |
| **Product** (4) | Strategista di prodotto, sintetizzatore di feedback, prioritizzatore della roadmap, scrittore di specifiche |
| **Engineering** (7) | Sviluppatore frontend, ingegnere backend, ingegnere di test, ingegnere di refactoring, ingegnere delle prestazioni, revisore delle dipendenze, revisore della sicurezza |
| **Design** (2) | UI Designer, custode del marchio |
| **Marketing** (1) | Copywriter per il lancio |
| **Treatment** (7) | Ricercatore del repository, traduttore del repository, architetto della documentazione, curatore dei metadati, revisore della copertura, verificatore della distribuzione, ingegnere del rilascio |
| **Research** (4) | Ricercatore UX, analista della concorrenza, ricercatore di tendenze, sintetizzatore delle interviste con gli utenti |
| **Growth** (4) | Strategista del lancio, stratega dei contenuti, responsabile della community, responsabile del triage del supporto |
| **Brainstorm** (19) | Esploratore del contesto, esploratore del valore per l'utente, esploratore di soluzioni creative, esploratore delle meccaniche, esploratore del mercato, esploratore anticonformista, esploratore della fattibilità, esploratore degli standard di qualità, analista del contesto, analista del valore per l'utente, analista delle meccaniche, analista del posizionamento, analista anticonformista, normalizzatore, sintetizzatore, espansore del prodotto, espansore degli scenari, espansore del vantaggio competitivo, giudice |
| **Deep Audit** (4) | Revisore dei componenti, revisore della verità dei test, revisore delle interfacce, sintetizzatore dell'audit |
| **Swarm** (7) | Coordinatore del gruppo di lavoro, agente backend del gruppo di lavoro, agente di collegamento del gruppo di lavoro, agente dei test del gruppo di lavoro, agente dell'infrastruttura del gruppo di lavoro, agente frontend del gruppo di lavoro, sintetizzatore del gruppo di lavoro |

Ogni ruolo ha un contratto completo: missione, quando usarlo, quando non usarlo, input previsti, output richiesti, standard di qualità e fattori scatenanti per l'escalation. Ogni ruolo è gestibile: `roleos route` può raccomandarne uno qualsiasi in base al contenuto del pacchetto.

## Avvio rapido

```bash
# Install (puts `roleos` on your PATH):
npm install -g role-os

# Scaffold the role spine into your repo:
roleos init
# (one-off alternative without installing: `npx role-os init`,
#  then prefix every command below with `npx role-os` instead of `roleos`)

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

## Quando non utilizzare Role OS

- Correzioni su una sola riga, errori di battitura o bug evidenti
- Ricerca esplorativa senza un output definito
- Lavoro che si adatta alla mente di una persona in 5 minuti
- Correzioni urgenti che devono essere implementate prima del completamento della catena di revisione
- Progetti in cui si desidera la velocità rispetto alla struttura

## Evidenza

Role OS è stato testato con successo in tre diversi scenari in due repository strutturalmente diversi:

**Test 001 — Lavoro sulle funzionalità** (Crew Screen, Star Freight)
- Catena di 7 ruoli, 45 scenari di test, 0 conflitti di ruolo
- Ha prevenuto la contaminazione da un ramo antenato, ha individuato un'invenzione in linea, ha evidenziato ostacoli reali

**Test 002 — Lavoro di integrazione** (Collegamento CampaignState, Star Freight)
- Catena di 5 ruoli, ha risolto un'interfaccia architettonica senza ricorrere a soluzioni di ripiego
- I test anti-fallback hanno dimostrato che il percorso attivo è reale, non un segnaposto

**Test 003 — Lavoro sull'identità** (Purga della contaminazione, Star Freight)
- Catena di 6 ruoli, 51 scenari di test, inclusa una difesa durevole contro la contaminazione CI
- Ha corretto la deriva ereditaria senza sfociare in una riprogettazione radicale

**Test di portabilità** (Coerenza della persona, sensor-humor)
- Stessa struttura, linguaggio/dominio/stack diversi
- Adottato con modifiche al contesto, senza modifiche al contratto principale

**Trattamento completo FT-001** (portlight-desktop)
- Trattamento di 7 fasi con ruoli del pacchetto di trattamento
- Il controllo Shipcheck è stato superato, zero conflitti di ruolo

**Trattamento completo FT-002** (studioflow)
- Stesso pacchetto di trattamento, repository strutturalmente diverso (spazio di lavoro creativo rispetto a un gioco)
- Il pacchetto di trattamento è portatile: non sono necessarie modifiche al contratto

**Sessione di brainstorming di successo** (argomento del marketplace del server MCP)
- Catena di 9 ruoli, 4 analisti in parallelo, esame incrociato + grafico di confutazione delle controversie
- Sono state sollevate 4 sfide, 3 affermazioni sono state ridotte, 1 irrisolta: pressione sana, non stallo
- 16+ collegamenti di traccia dagli artefatti renderizzati agli atomi del livello di verità
- È stata dimostrata la completa catena di custodia: verità → atomi → controversia → sintesi → espansione → giudice → rendering → traccia

## Proprietà principali

Queste sono innegociabili. Se una modifica le indebolisce, rifiutarla.

- I confini dei ruoli sono mantenuti
- La revisione è efficace
- L'escalation rimane onesta
- I pacchetti rimangono testabili
- La portabilità richiede un adattamento al contesto, non un intervento chirurgico sul nucleo

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
    dispatch.mjs               ← Runtime dispatch manifests for the coding-agent harness
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
  test/                        ← 1595 tests across 72 test files (1592 pass, 3 skipped)
  starter-pack/                ← Drop-in role contracts, policies, schemas, workflows
```

## Sicurezza

Per impostazione predefinita, Role OS opera solo sul **file system locale**. Copia i modelli Markdown e scrive i file di pacchetto/verdetto/esecuzione nella directory `.claude/` del repository. L'operazione predefinita non effettua richieste di rete, non gestisce segreti e non raccoglie dati di telemetria. Nessuna operazione pericolosa: tutte le scritture di file utilizzano per impostazione predefinita l'opzione "salta se esiste".

Tre funzionalità **opzionali** accedono alla rete quando le si abilita esplicitamente:

- **`roleos verify-citations`** — esegue comandi esterni tramite la CLI `prism`, che risolve gli identificatori di citazione rispetto alle API pubbliche di arXiv/Crossref (invia gli ID/URL delle citazioni in fase di verifica).
- **Livello specialista** (`roleos specialist`, ruoli registrati) — invia prompt a `backend_url` configurato in `.role-os/specialists.json` (in genere un endpoint di modello locale).
- **Consultazione sul budget/conformità** (`ROLEOS_BUDGET_CONSULT` / `ROLEOS_CONFORMANCE_CONSULT`) — invia il contesto della fase/chiamata di strumento a un modello locale tramite HTTP per ottenere un parere.

Tutti e tre sono disabilitati per impostazione predefinita e, in caso di errore, si comportano in modo deterministico a livello locale. Consultare [SECURITY.md](SECURITY.md) per l'elenco completo delle policy.

## Sistema operativo

| Livello | A cosa serve | Stato |
|-------|-------------|--------|
| **Routing** | Valuta tutti i 61 ruoli in base al contenuto dei pacchetti, spiega le raccomandazioni, valuta l'affidabilità. | ✓ Implementato |
| **Chain builder** | Assembla catene ordinate in fasi a partire dai ruoli valutati, con una preferenza per il tipo di pacchetto anziché per un modello predefinito. | ✓ Implementato |
| **Conflict detection** | Validazione in 4 fasi: conflitti, sequenza, ridondanza, lacune di copertura. Suggerimenti per la correzione. | ✓ Implementato |
| **Escalation** | Instrada automaticamente le attività bloccate/rifiutate/suddivise verso il resolver corretto, indicando il motivo e l'artefatto richiesto. | ✓ Implementato |
| **Evidence** | Evidenza strutturata, specifica per ogni ruolo, presente nelle conclusioni. Controlli di sufficienza. 12 tipi di evidenza. | ✓ Implementato |
| **Dispatch** | Genera manifesti di esecuzione per l'ambiente di test dell'agente di codifica. Profili degli strumenti specifici per ogni ruolo, istruzioni di sistema, budget. | ✓ Implementato |
| **Trials** | Elenco completo testato: 30/30 attività principali + 5/5 test negativi. 7 test di pacchetti completati. | ✓ Completato |
| **Team Packs** | 10 pacchetti calibrati con selezione automatica, protezioni contro incongruenze e fallback con instradamento libero. | ✓ Implementato |
| **Outcome calibration** | Registra i risultati dell'esecuzione, ottimizza i pesi dei pacchetti/ruoli in base ai risultati, regola le soglie di affidabilità. | ✓ Implementato |
| **Mixed-task decomposition** | Rileva attività composite, le suddivide in pacchetti secondari, assegna i pacchetti, preserva le dipendenze. | ✓ Implementato |
| **Composite execution** | Esegue i pacchetti secondari in ordine di dipendenza, con passaggio di artefatti, ripristino dei rami e sintesi. | ✓ Implementato |
| **Adaptive replanning** | Le modifiche all'ambito, le scoperte o i nuovi requisiti a metà dell'esecuzione aggiornano il piano senza riavviare. | ✓ Implementato |
| **Session spine** | `roleos init claude` crea i file CLAUDE.md, /roleos-route, /roleos-review, /roleos-status. `roleos doctor` verifica il cablaggio. Le schede di instradamento dimostrano l'impegno. | ✓ Implementato |
| **Hook spine** | 5 hook del ciclo di vita (SessionStart, PromptSubmit, PreToolUse, SubagentStart, Stop). Applicazione di consigli: promemoria della scheda di instradamento, controllo dell'utilizzo degli strumenti, iniezione del ruolo del subagente, audit del completamento. | ✓ Implementato |
| **Artifact spine** | Contratti sugli artefatti specifici per ogni ruolo. Contratti per il passaggio dei pacchetti. Validazione strutturale. Controlli di completezza della catena. I ruoli a valle non indovinano mai cosa hanno ricevuto. | ✓ Implementato |
| **Mission library** | 9 missioni denominate (feature-ship, bugfix, treatment, docs-release, security-hardening, research-launch, brainstorm, deep-audit, dogfood-swarm). Ognuna dichiara il pacchetto, la catena di ruoli, il flusso di artefatti, i rami di escalation e una definizione onesta e parziale. | ✓ Implementato |
| **Mission runner** | Crea esecuzioni, esegue i passaggi con lo stato tracciato, completa/fallisce con una segnalazione onesta. Propagazione dei passaggi bloccati, avvisi di escalation al di fuori della catena, riapertura dell'ultimo passaggio. | ✓ Implementato |
| **Unified entry** | `roleos start` decide automaticamente tra missione, pacchetto e instradamento libero. Scala di fallback con punteggi di affidabilità, alternative e rilevamento di elementi compositi. | ✓ Implementato |
| **Persistent runs** | `roleos run` crea esecuzioni basate su disco. `resume`, `next`, `explain`, `complete`, `fail`. Interventi: reindirizzamento, escalation, riprova, blocco, riapertura. Guida specifica per ogni passaggio. Misurazione dell'attrito. | ✓ Implementato |
| **Brainstorm** | Architettura a due livelli: verità (schemi nativi del ruolo, atomi di provenienza, grafico di controversie incrociate) + rendering (5 voci distinte, divieti lessicali, trascrizione del dibattito). I collegamenti di traccia dimostrano che ogni affermazione resa corrisponde a un atomo di verità. Esecuzione di successo dimostrata. | ✓ Implementato |
| **Deep Audit** | Audit del repository scalato in base al manifesto: scompone il repository in componenti, distribuisce N auditor + M auditor di test della verità + K auditor dei punti di discontinuità dal grafico delle dipendenze, sintetizza in una valutazione classificata e in un piano d'azione. La distribuzione dinamica si adatta alle dimensioni del repository (formula 2N + K + 3). Nativo per l'esecutore con validazione degli artefatti a ogni passaggio. | ✓ Implementato |
| **Dogfood Swarm** | Convergenza multi-pass: tre fasi di salute (bug/sicurezza → proattivo → umanizzazione) quindi fase delle funzionalità. Proprietà esclusiva dei file, controlli di build dopo ogni fase, checkpoint dell'utente. Il rilevamento automatico del dominio genera i manifesti. Ponte di evidenza verso i laboratori di test. | ✓ Implementato |

## 9 missioni

| Missione | Pacchetto | Ruoli | Quando utilizzare |
|---------|------|-------|-------------|
| `feature-ship` | funzionalità | 5 | Consegna completa della funzionalità: ambito → specifica → implementazione → test → revisione |
| `bugfix` | correzione di bug | 4 | Diagnosi della causa principale, correzione, test, verifica |
| `treatment` | miglioramento | 4 | Shipcheck + rifinitura + documentazione + verifica CI + revisione |
| `docs-release` | documentazione | 2 | Scrittura/aggiornamento della documentazione, note di rilascio |
| `security-hardening` | sicurezza | 4 | Modello delle minacce, audit, correzione delle vulnerabilità, ri-audit, verifica |
| `research-launch` | ricerca | 4 | Formulazione della domanda, ricerca, documentazione dei risultati, decisione |
| `brainstorm` | brainstorming | 9 | Indagine strutturata e multi-prospettica con disaccordo tracciabile e output che porta a una decisione. |
| `deep-audit` | audit approfondito | 5 (scale) | Audit del repository basato su manifesto: il numero di worker si adatta al grafico del repository tramite la distribuzione dinamica |
| `dogfood-swarm` | swarm | 8 (scale) | Convergenza multi-pass: salute-a → salute-b → salute-c → funzionalità → sintesi finale |

Ogni missione include definizioni oneste e parziali: quando il lavoro si blocca, il sistema documenta ciò che è stato completato e ciò che rimane, invece di fingere il completamento.

### Missione di brainstorming

Non si tratta di "brainstorming con l'IA". La missione di brainstorming è costituita da **ruoli specializzati, regolati da norme, con disaccordo tracciabile e output che porta a una decisione.**

```bash
roleos run "explore product directions for a developer tool discovery platform"
# → MISSION: Brainstorm (Structured Inquiry)
#   Chain: 4 Analysts (parallel) → Normalize → Cross-Examine → Rebut → Synthesize → Expand → Judge
```

**Cosa la rende diversa:**

- **Livello 1 (verità):** Quattro analisti emettono schemi nativi del ruolo (ContextMap, UserValueMap, MechanicsMap, PositioningMap): non si tratta di prosa condivisa. Ogni ruolo è soggetto a un'applicazione di punti ciechi: frasi proibite, tipi di affermazioni proibite, partizioni di input filtrate. Gli atomi contengono informazioni sulla provenienza. Un grafico di esame incrociato diretto produce sfide mirate. Gli analisti originali difendono, restringono o ritrattano sotto pressione.

- **Livello 2 (rendering):** Cinque voci umane distinte (Boundary Memo, Field Notes, System Sketch, Claim Brief, Cross-Exam Transcript) con divieti lessicali che impediscono la convergenza delle voci. La sintesi utilizza la verità, non la prosa resa. Entrambi i livelli sono sempre disponibili.

- **Catena di custodia:** Ogni frase generata può essere fatta risalire a un atomo del livello di verità. Le direttive di sintesi fanno riferimento agli atomi. Gli obiettivi dell'esame incrociato sono gli ID delle affermazioni reali. Il grafico delle controversie è il prodotto, non il testo.

**Dimostrato:** esecuzione v0.4 — catena di custodia completa verificata. Consultare [`examples/golden-run.md`](examples/golden-run.md) per la catena completa degli artefatti.

### Missione di audit approfondita

Non si tratta di una scansione superficiale. La missione di audit approfondita **scompone un repository in componenti delimitati e assegna revisori specializzati in base a una scala determinata dal grafico delle dipendenze del repository stesso.**

```bash
roleos run "deep audit this repo" --manifest=audit-manifest.json
# → MISSION: Deep Audit (Manifest-Scaled)
#   Steps: Component Auditor ×6 + Test Truth Auditor ×6 + Seam Auditor ×8 + Synthesizer + Action Plan + Critic = 23 steps
```

**Cosa la rende diversa:**

- **Assegnazione dinamica:** il numero di worker non è fisso. Un repository con 10 componenti e 5 cluster di delimitazione produce 28 passaggi (2×10 + 5 + 3). Un repository con 3 componenti produce 12. La formula di scalabilità è `2N + K + 3`, dove N = componenti, K = delimitazioni.
- **Pacchetti basati su manifest:** un `audit-manifest.json` definisce i componenti (con percorsi dei file, numero di righe, descrizioni) e le delimitazioni (da/a con descrizioni dell'interfaccia). Ogni revisore riceve solo il proprio pacchetto.
- **Quattro archetipi di ruolo:** Revisore dei componenti (verità del codice per modulo), Revisore della verità dei test (test che dimostrano rispetto a test che esistono), Revisore delle interfacce (delimitazioni di integrazione dal grafico delle dipendenze), Sintetizzatore di audit (verdetto classificato + piano d'azione da tutti i pacchetti).
- **Validazione degli artefatti a ogni passaggio:** `validateArtifact()` viene eseguito al termine di ogni passaggio in entrambi i percorsi di esecuzione. I risultati vengono allegati agli oggetti di passaggio. Il sistema sa se ogni artefatto ha soddisfatto il suo contratto.
- **Valutazione parziale onesta:** quando il budget o l'ambito impediscono il completamento, le scoperte per componente sono valide individualmente. Il sistema sintetizza ciò che è stato completato, senza mai dare l'impressione di una copertura completa.

**Dimostrato:** esecuzione di prova nativa del runner — 18 test su un manifest reale, ciclo di vita completo verificato, inclusa la riapertura in caso di escalation e il fallimento parziale. La formula di scalabilità è stata verificata per manifest con 3/6/10/15 componenti.

### Missione di gruppo di test

Non si tratta di un linting a passaggio singolo. La missione di gruppo di test **esegue un protocollo di convergenza a più passaggi che porta un repository da "funzionante" a "pronto per la produzione" attraverso tre fasi di controllo e la consegna iterativa delle funzionalità.**

```bash
roleos swarm
# → MISSION: Dogfood Swarm (Multi-Pass Convergence)
#   Stages: Health-A → Health-B → Health-C → Feature → Final
#   Domain agents: 3-5 parallel per wave (exclusive file ownership)
```

**Cosa la rende diversa:**

- **Tre fasi di controllo:** la fase A corregge bug e problemi di sicurezza (ciclo fino a 0 CRITICAL + 0 HIGH). La fase B applica misure di protezione proattive (gli utenti esaminano le scoperte). La fase C umanizza il codice base: messaggi di errore che aiutano gli utenti, feedback di riconnessione, stati di caricamento, accessibilità. Ogni fase è una lente distinta, non la stessa scansione ripetuta.
- **Proprietà esclusiva dei file:** ogni agente di dominio possiede file specifici tramite `swarm-manifest.json`. Nessun agente modifica lo stesso file. Nessun conflitto di merge. Nessun sovraccarico di coordinamento.
- **Barriere di build:** lint + typecheck + test devono essere superati dopo ogni fase. Il sistema rileva automaticamente il sistema di build (Node, Rust, Python, Go) ed esegue i comandi corretti.
- **Checkpoint utente:** la fase di controllo della salute B e la fase delle funzionalità richiedono l'approvazione esplicita dell'utente prima dell'esecuzione. Il sistema presenta le scoperte e l'utente decide cosa costruire.
- **Convergenza iterativa:** le fasi si ripetono con cicli di fase fino al raggiungimento delle condizioni di uscita o al numero massimo di iterazioni. Ogni fase riesegue l'audit da zero per individuare le regressioni introdotte dalle correzioni precedenti.
- **Rilevamento automatico del dominio:** `roleos swarm manifest --generate` rileva il tipo di repository (CLI, web, desktop, MCP, monorepo) e genera assegnazioni di dominio non sovrapposte.

**Dimostrato:** claude-collaborate (2026-03-28) — 35→129 test, 106 problemi di controllo risolti, v1.1.0 rilasciato. Protocollo v2.0 con 9 fasi.

## Stato

Stabile e pronto per la distribuzione. Consultare il [REGISTRO DELLE MODIFICHE](CHANGELOG.md) per la cronologia completa delle versioni e le modifiche apportate in ogni versione.

## Licenza

MIT

---

Creato da <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a>
