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

## Cosa fa

Role OS è il modo professionale per gestire il lavoro degli agenti di codifica. Previene i problemi specifici che i flussi di lavoro AI generici causano:

- **Deriva:** i ruoli mantengono la loro area di competenza. Il prodotto non viene riprogettato. Il frontend non ridefinisce l'ambito. Il backend non inventa la direzione del prodotto.
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

**Interventi quando qualcosa va storto:**

```bash
roleos retry 0                 # Retry a failed step
roleos reroute 1 "Frontend Developer" "UI bug"  # Swap a role
roleos escalate "Test Engineer" "Repo Researcher" "missed edge case" "re-diagnose"
roleos block 2 "waiting for API spec"
roleos reopen 0 "found issue in review"
```

Le esecuzioni vengono salvate su disco (`.claude/runs/`), quindi le sessioni interrotte riprendono senza problemi. Ogni passaggio include indicazioni per l'operatore: cosa produrre, sezioni richieste e condizioni di arresto.

**Una volta instradato:**

1. **Ogni ruolo produce un passaggio:** output strutturato con elementi di prova che riducono l'ambiguità per il ruolo successivo.
2. **La revisione critica viene eseguita in base al contratto:** accetta, rifiuta o blocca in base a prove strutturate, non a impressioni.
3. **L'instradamento di recupero avviene automaticamente:** il lavoro bloccato o rifiutato viene indirizzato al risolutore corretto con una motivazione, un tipo di recupero e l'artefatto richiesto.

## Distribuzione consapevole del budget

Role OS può consultare un **analista del budget dei token** locale per ogni passaggio di distribuzione e allegare una previsione di spesa consultiva al manifesto: facoltativa (`ROLEOS_BUDGET_CONSULT`), consultiva (non blocca mai una distribuzione) e con fallback a una base deterministica. Disattivata per impostazione predefinita; la previsione è locale e gratuita. Consulta il [manuale](https://mcp-tool-shop-org.github.io/role-os/handbook/specialist-budget/).

## Supervisione delle chiamate agli strumenti

Role OS verifica e controlla le chiamate agli strumenti al confine `PreToolUse`: in modo deterministico, senza modelli attivi:

- **Monitoraggio della conformità** (consultivo, con fallback) — uno schema deterministico + un limite di contratto computabile verifica una chiamata proposta rispetto al suo catalogo di contratti di strumenti e allega una valutazione consultiva su una chiamata *comprovatamente* non conforme; non blocca mai. Un limite LLM facoltativo (`ROLEOS_CONFORMANCE_CONSULT`) gestisce i residui genuinamente semantici.
- **Controllo delle capacità** (blocco, facoltativo `ROLEOS_CAPABILITY_GATE`, disattivato per impostazione predefinita) — autorizzazione minima deterministica su azioni *irreversibili* (pubblicazione su npm/PyPI, `gh release`, `git push`, modifiche al repository, distribuzione su Pages). Un'azione controllata viene negata a meno che il direttore non abbia concesso la sua capacità in `.claude/role-os/capabilities.json`, quindi un passaggio errato (un errore onesto o uno iniettato) non può attivare un'azione irreversibile non autorizzata. Il complemento preventivo alla regola del compensatore denominato. Consulta il [manuale](https://mcp-tool-shop-org.github.io/role-os/handbook/).

## Dossier dell'equipaggio

Ogni ruolo ha un **dossier**: una scheda del personaggio che funge anche da configurazione in fase di esecuzione. Sei attitudini (Rigore, Ritmo, Portata, Scetticismo, Autonomia, Candore) corrispondono a controlli di distribuzione reali; uno strato di **disposizione** con otto archetipi (Scettico, Costruttore, Investigatore, Innovatore...) contiene un'istruzione comportamentale; e ogni ruolo ha un ritratto e una valutazione. Esplora l'intero equipaggio come una galleria (`dossier/dossier.html`): il radar di ogni ruolo mostra la sua configurazione ottimizzata rispetto al suo ideale canonico.

Quando un ruolo ha un dossier, la distribuzione inietta una **postura operativa**: l'istruzione comportamentale della disposizione più una linea di postura dalle attitudini del ruolo, quindi la scheda configura effettivamente il ruolo. Facoltativa e additiva: i ruoli senza un dossier si comportano esattamente come prima. Consulta il [manuale](https://mcp-tool-shop-org.github.io/role-os/handbook/crew-dossier/).

## Stato di implementazione a livello di organizzazione

Lo stato di implementazione a livello di organizzazione (coda, decisioni, registri di audit, pacchetti di blocco per repository) si trova in un repository **privato**, interno all'organizzazione (`role-os-rollout`). Questo repository è il prodotto; quell'altro repository è lo stato operativo.

## Memoria e continuità

Role OS non possiede né duplica il livello di memoria. Quando esiste un archivio di memoria del progetto, è il sistema di continuità canonico: i fatti del repository, le decisioni, i problemi aperti e la cronologia del trattamento sono archiviati lì.

Role OS si integra con tale archivio quando è presente. Non lo sostituisce.

## Trattamento completo e controllo del progetto

Il trattamento completo è un protocollo canonico a 7 fasi definito nella memoria del progetto (`memory/full-treatment.md`). Role OS gestisce e rivede i trattamenti utilizzando contratti di ruolo, passaggi di consegne e punti di controllo critici; non ridefinisce il protocollo.

**Shipcheck** è il controllo di qualità composto da 31 elementi che viene eseguito prima del trattamento completo. I controlli rigorosi A-D devono essere superati prima dell'inizio di qualsiasi trattamento. Riferimento canonico: `memory/shipcheck.md`.

Ordine: prima Shipcheck, poi trattamento completo. Nessuna versione 1.0.0 senza il superamento dei controlli rigorosi.

## Il catalogo dei 61 ruoli

Il catalogo raggruppa i suoi 61 ruoli in 11 famiglie. (Dispatch utilizza un set separato di 10 **pacchetti di team** — funzionalità, correzioni di bug, sicurezza, documentazione, lancio, ricerca, trattamento, audit approfondito, brainstorming, gruppo di lavoro — che attingono ruoli da queste famiglie).

| Famiglia | Ruoli |
|--------|-------|
| **Core** (2) | Orchestrator, Revisore critico |
| **Product** (4) | Strategista di prodotto, Sintetizzatore di feedback, Prioritizzatore della roadmap, Redattore di specifiche |
| **Engineering** (7) | Sviluppatore frontend, Ingegnere backend, Ingegnere di test, Ingegnere di refactoring, Ingegnere delle prestazioni, Revisore delle dipendenze, Revisore della sicurezza |
| **Design** (2) | UI Designer, Custode del marchio |
| **Marketing** (1) | Copywriter per il lancio |
| **Treatment** (7) | Ricercatore del repository, Traduttore del repository, Architetto della documentazione, Curatore dei metadati, Revisore della copertura, Verificatore della distribuzione, Ingegnere del rilascio |
| **Research** (4) | Ricercatore UX, Analista della concorrenza, Ricercatore di tendenze, Sintetizzatore delle interviste con gli utenti |
| **Growth** (4) | Strategista del lancio, Strategista dei contenuti, Responsabile della community, Responsabile della gestione delle richieste di supporto |
| **Brainstorm** (19) | Esploratore del contesto, Esploratore del valore per l'utente, Esploratore di soluzioni creative, Esploratore delle meccaniche, Esploratore del mercato, Esploratore anticonformista, Esploratore della fattibilità, Esploratore degli standard di qualità, Analista del contesto, Analista del valore per l'utente, Analista delle meccaniche, Analista del posizionamento, Analista anticonformista, Normalizzatore, Sintetizzatore, Amplificatore del prodotto, Amplificatore degli scenari, Amplificatore dei vantaggi competitivi, Giudice |
| **Deep Audit** (4) | Revisore dei componenti, Revisore della verità dei test, Revisore delle interfacce, Sintetizzatore dell'audit |
| **Swarm** (7) | Coordinatore del gruppo di lavoro, Agente backend del gruppo di lavoro, Agente di collegamento del gruppo di lavoro, Agente dei test del gruppo di lavoro, Agente dell'infrastruttura del gruppo di lavoro, Agente frontend del gruppo di lavoro, Sintetizzatore del gruppo di lavoro |

Ogni ruolo ha un contratto completo: missione, quando utilizzarlo, quando non utilizzarlo, input previsti, output richiesti, standard di qualità e fattori scatenanti per l'escalation. Ogni ruolo può essere gestito: `roleos route` può raccomandarne uno qualsiasi in base al contenuto del pacchetto.

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

- Correzioni di una sola riga, errori di battitura o bug evidenti
- Ricerca esplorativa senza un output definito
- Lavoro che può essere svolto da una sola persona in 5 minuti
- Correzioni urgenti che devono essere implementate prima del completamento della catena di revisione
- Progetti in cui si desidera dare priorità alla velocità rispetto alla struttura

## Evidenza

Role OS è stato testato con successo in tre configurazioni di prova in due repository strutturalmente diversi:

**Prova 001 — Lavoro sulle funzionalità** (Crew Screen, Star Freight)
- Catena di 7 ruoli, 45 scenari di test, 0 conflitti di ruolo
- Ha prevenuto la contaminazione da un ramo antenato, ha individuato un'invenzione in linea e ha evidenziato ostacoli reali

**Prova 002 — Lavoro di integrazione** (Collegamento CampaignState, Star Freight)
- Catena di 5 ruoli, ha risolto un'interfaccia architettonica senza ricorrere a soluzioni di ripiego
- I test anti-fallback hanno dimostrato che il percorso attivo è reale, non un segnaposto

**Prova 003 — Lavoro sull'identità** (Eliminazione della contaminazione, Star Freight)
- Catena di 6 ruoli, 51 scenari di test, inclusa una difesa durevole contro la contaminazione CI
- Ha corretto la deriva ereditaria senza sfociare in una riprogettazione radicale

**Prova di portabilità** (Coerenza della persona, sensor-humor)
- Stessa struttura, linguaggio/dominio/stack diversi
- Adottato con modifiche al contesto, senza modifiche al contratto principale

**Trattamento completo FT-001** (portlight-desktop)
- Trattamento a 7 fasi con ruoli del pacchetto di trattamento
- Il controllo Shipcheck è stato superato, zero conflitti di ruolo

**Trattamento completo FT-002** (studioflow)
- Stesso pacchetto di trattamento, repository strutturalmente diverso (spazio di lavoro creativo rispetto a un gioco)
- Il pacchetto di trattamento è portabile: non sono necessarie modifiche al contratto

**Sessione di brainstorming** (argomento del marketplace del server MCP)
- Catena di 9 ruoli, 4 analisti in parallelo, esame incrociato + grafico di confutazione delle controversie
- Sono state sollevate 4 sfide, 3 affermazioni sono state ridotte, 1 è rimasta irrisolta: una pressione sana, non uno stallo
- 16+ collegamenti di traccia dagli artefatti renderizzati agli atomi del livello di verità
- È stata dimostrata la completa catena di custodia: verità → atomi → controversia → sintesi → espansione → giudizio → rendering → traccia

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
    calibration.mjs            ← Outcome ledger. Pack boosts only; keyword scores stay the score
    calibration-cmd.mjs        ← `roleos calibration`
    recipe-cmd.mjs             ← `roleos recipe` dataset recipe cards
    specialist/recipe-card.mjs ← Recipe-card checks, nine controls, canonical hash
    jury-cmd.mjs               ← `roleos jury check`, `select`, and `score`
    specialist/jury.mjs        ← Critic measurements and panel selection
    hooks.mjs                  ← 5 lifecycle hooks for runtime enforcement
    session.mjs                ← Session scaffolding + doctor
    brainstorm.mjs             ← Evidence modes, request validation, finding/synthesis/judge schemas
    brainstorm-roles.mjs       ← Role-native schemas, input partitioning, blindspot enforcement, cross-exam
    brainstorm-render.mjs      ← Two-layer rendering: lexical bans, render schemas, debate transcript
  test/                        ← 1692 tests across 75 test files (1689 pass, 3 skipped)
  starter-pack/                ← Drop-in role contracts, policies, schemas, workflows
```

La copertura di riga misurata per questa versione è del 90,66% (22778/25123). Il limite minimo CI rimane al 90%.

## Sicurezza

Per impostazione predefinita, Role OS opera solo sul **file system locale**. Copia i modelli Markdown e scrive i file di pacchetto/verdetto/esecuzione nella directory `.claude/` del repository. L'operazione predefinita non effettua richieste di rete, non gestisce segreti e non raccoglie dati di telemetria. Nessuna operazione pericolosa: tutte le scritture di file utilizzano per impostazione predefinita l'opzione "salta se esiste".

Tre funzionalità **opzionali** accedono alla rete quando le si abilita esplicitamente:

- **`roleos verify-citations`** — esegue comandi esterni tramite la CLI `prism`, che risolve gli identificatori di citazione rispetto alle API pubbliche di arXiv/Crossref (invia gli ID/URL delle citazioni in fase di verifica).
- **Livello specialista** (`roleos specialist`, ruoli registrati) — invia richieste a `backend_url` configurato in `.role-os/specialists.json` (in genere un endpoint di modello locale).
- **Consultazione sul budget/conformità** (`ROLEOS_BUDGET_CONSULT` / `ROLEOS_CONFORMANCE_CONSULT`) — invia il contesto del passaggio/chiamata di strumento a un modello locale tramite HTTP per ottenere un parere.

Tutti e tre sono disattivati per impostazione predefinita e, in caso di errore, si comportano in modo deterministico a livello locale. Consultare [SECURITY.md](SECURITY.md) per l'elenco completo delle policy.

## Schede di ricetta, giuria e calibrazione dei pacchetti

Un critico addestrato è efficace solo quanto i dati da cui ha tratto le sue conoscenze. Role OS registra questi dati su una scheda di ricetta, valuta un gruppo di critici e consente a un ciclo completato di migliorare la scelta del pacchetto. Nessuna di queste operazioni richiede l'utilizzo di un modello. Lo stesso file e lo stesso seme producono gli stessi risultati.

### Schede di ricetta

`roleos recipe` verifica una scheda (`roleos-recipe-card/v1`). Nove controlli standard, ciascuno dei quali verifica un aspetto che può far sembrare un critico valido anche se non ha appreso le sue caratteristiche. Un controllo superato senza una misurazione rappresenta una lacuna. Una misurazione incoerente è un errore. `shuffled-labels` deve utilizzare il metodo `balanced-permutation`. `same-generator-no-error`: quando entrambi i metodi di modifica vengono registrati e i loro intervalli non si sovrappongono, lo stato deve essere `unresolved`, altrimenti la verifica fallisce. `reversed-correction` viene superato solo quando il suo intervallo di accuratezza si trova interamente al di sopra di 0,5.

```bash
roleos recipe check starter-pack/examples/auditor-recipe-card.json
```

Quel file è una scheda sintetica compilata, non un critico addestrato. La verifica stampa:

```
✓ starter-pack/examples/auditor-recipe-card.json (auditor-v1, role Auditor)
  note     controls[2] (shuffled-labels): permutation floor is 1/20; a pass at this floor means the observed result beat every null
  controls 9/9 standard controls passed
  sha256   5763c4dd57fc9f7bea41186493e56b72ce73a5e30f4c5c813248655a360b1588
```

La nota è un dato di fatto, non una lacuna. `roleos specialist register` prende `--recipe` e associa l'ID e l'hash della scheda a tale versione. Consultare il [manuale](https://mcp-tool-shop-org.github.io/role-os/handbook/recipe-cards/).

### Giuria

`roleos jury select` mantiene un gruppo solo quando un intervallo nidificato e raggruppato indica che il gruppo supera il miglior singolo critico. In caso contrario, la decisione è che il critico è valido, oppure `insufficient-data` se ci sono meno di 30 elementi o 10 gruppi. Un critico la cui scheda presenta un controllo standard fallito o irrisolto viene escluso, a meno che non sia `--allow-unproven`. Un critico senza scheda viene comunque incluso, a meno che non sia `--require-recipe`. I punteggi non vengono mai invertiti. Lo stesso seme ripete gli stessi risultati.

```bash
roleos jury select starter-pack/examples/jury-validation.json --seed 0
```

Su questo file sintetico, la decisione è `best-single (echo)`. echo e sharp commettono gli stessi errori, quindi la coerenza degli errori è 1,0000 e i nomi dei flag li identificano. Il flag non esclude nessuno dei due critici. L'intervallo nidificato è [-0,1000, 0,0000]. Tocca lo 0, quindi non si trova interamente al di sopra di 0 e, anche con --out, non scriverebbe alcun file di gruppo, perché --out scrive un file solo per una decisione di gruppo. Il [manuale](https://mcp-tool-shop-org.github.io/role-os/handbook/jury/) contiene il rapporto completo.

### Calibrazione dei pacchetti

Quando un ciclo termina, Role OS aggiunge una riga di risultato. Lo stesso ID di ciclo non scrive una seconda riga. Dopo che un pacchetto ha almeno 5 risultati registrati, ogni ciclo completato con correzioni pari a 0 aggiunge +0,5 a quel pacchetto, con un limite massimo di +2. Il miglioramento non assegna mai a un pacchetto le parole chiave che non corrispondevano già. Il livello di confidenza rimane alto con 3 corrispondenze di parole chiave e medio con 2, ricavato dal punteggio delle parole chiave, non dal punteggio migliorato. I pesi di Role non cambiano. Le soglie di confidenza non cambiano. Il rapporto di calibrazione potrebbe suggerire di esaminare la soglia delle parole chiave. Role OS non applica tale suggerimento.

`ROLEOS_NO_CALIBRATION=1` disattiva il miglioramento. La registrazione continua.

```bash
roleos calibration
```

In una directory senza registro dei risultati, questo stampa:

```
no recorded runs yet
```

`roleos route --verbose` e `roleos explain` stampano il miglioramento, il numero di cicli e il tasso di successo quando il registro li contiene. Consultare il [manuale](https://mcp-tool-shop-org.github.io/role-os/handbook/calibration/).

## Il sistema operativo

| Livello | Cosa fa | Stato |
|-------|-------------|--------|
| **Routing** | Valuta tutti i 61 ruoli rispetto al contenuto del pacchetto, spiega le raccomandazioni, valuta la confidenza | ✓ Pubblicato |
| **Chain builder** | Assembla catene ordinate per fasi da ruoli valutati, con una preferenza per il tipo di pacchetto, ma non vincolato a un modello. | ✓ Pubblicato |
| **Conflict detection** | Validazione in 4 fasi: conflitti gravi, sequenza, ridondanza, lacune di copertura. Suggerimenti per la correzione. | ✓ Pubblicato |
| **Escalation** | Instrada automaticamente le attività bloccate/rifiutate/suddivise verso il resolver corretto, indicando il motivo e l'artefatto richiesto. | ✓ Pubblicato |
| **Evidence** | Evidenza strutturata consapevole del ruolo nelle decisioni. Controlli di sufficienza. 12 tipi di evidenza. | ✓ Pubblicato |
| **Dispatch** | Genera manifesti di esecuzione per l'ambiente di test dell'agente di codifica. Profili degli strumenti per ruolo, prompt di sistema, budget. | ✓ Pubblicato |
| **Trials** | Elenco completo verificato: 30/30 attività principali + 5/5 prove negative. 7 cicli di prova del pacchetto completati. | ✓ Completato |
| **Team Packs** | 10 pacchetti calibrati con selezione automatica, protezioni per le incongruenze e fallback con instradamento libero. | ✓ Pubblicato |
| **Recipe cards** | La ricetta dei dati di un ruolo addestrato. Nove controlli standard, una misurazione per ogni controllo superato e un hash canonico. | ✓ Pubblicato |
| **Jury** | Valuta i critici addestrati. Mantiene un gruppo solo quando supera il miglior singolo critico su gruppi di test. I controlli di ricetta falliti o irrisolti escludono un critico. | ✓ Pubblicato |
| **Outcome calibration** | Registra un risultato quando un ciclo termina. Dopo 5 risultati, un completamento corretto migliora un pacchetto con le parole chiave che già corrispondevano (+0,5 ciascuno, limite +2). La confidenza deriva ancora dal punteggio delle parole chiave. I pesi di Role e le soglie di confidenza non cambiano. | ✓ Pubblicato |
| **Mixed-task decomposition** | Rileva il lavoro composito, lo suddivide in pacchetti figlio, assegna i pacchetti, preserva le dipendenze. | ✓ Pubblicato |
| **Composite execution** | Esegue i pacchetti figlio in ordine di dipendenza, con passaggio di artefatti, ripristino dei rami e sintesi. | ✓ Pubblicato |
| **Adaptive replanning** | Le modifiche all'ambito, le scoperte o i nuovi requisiti a metà ciclo aggiornano il piano senza riavviare. | ✓ Pubblicato |
| **Session spine** | `roleos init claude` crea lo scheletro di CLAUDE.md, /roleos-route, /roleos-review, /roleos-status. `roleos doctor` verifica il cablaggio. Le schede di instradamento dimostrano il coinvolgimento. | ✓ Pubblicato |
| **Hook spine** | 5 hook del ciclo di vita (SessionStart, PromptSubmit, PreToolUse, SubagentStart, Stop). Applicazione consigliata: promemoria della scheda di instradamento, blocco dell'utilizzo degli strumenti, inserimento del ruolo del subagente, audit del completamento. | ✓ Pubblicato |
| **Artifact spine** | Contratti di artefatto per ruolo. Contratti di passaggio del pacchetto. Validazione strutturale. Controlli di completezza della catena. I ruoli a valle non indovinano mai ciò che hanno ricevuto. | ✓ Pubblicato |
| **Mission library** | 9 missioni denominate (feature-ship, bugfix, treatment, docs-release, security-hardening, research-launch, brainstorm, deep-audit, dogfood-swarm). Ognuna dichiara il pacchetto, la catena di ruoli, il flusso di artefatti, i rami di escalation e una definizione onesta e parziale. | ✓ Pubblicato |
| **Mission runner** | Crea esecuzioni, esegui il debug con lo stato tracciato, completa/fallisci con una segnalazione accurata. Propagazione dei passaggi bloccati, avvisi di escalation al di fuori della catena, riapertura dell'ultimo passaggio. | ✓ Pubblicato |
| **Unified entry** | `roleos start` decide automaticamente tra la modalità "mission", "pack" o "routing libero". Scala di fallback con punteggi di confidenza, alternative e rilevamento composito. | ✓ Pubblicato |
| **Persistent runs** | `roleos run` crea esecuzioni basate su disco. `resume`, `next`, `explain`, `complete`, `fail`. Interventi: reindirizzamento, escalation, riprova, blocco, riapertura. Guida specifica per ogni passaggio. Misurazione dell'attrito. | ✓ Pubblicato |
| **Brainstorm** | Architettura a due livelli: verità (schemi nativi del ruolo, atomi di provenienza, grafico di controversie incrociate) + rendering (5 voci distinte, divieti lessicali, trascrizione del dibattito). I collegamenti di traccia dimostrano che ogni affermazione resa corrisponde a un atomo di verità. Esecuzione di successo verificata. | ✓ Pubblicato |
| **Deep Audit** | Audit del repository basato su manifest: decomponi il repository in componenti, assegna N auditor + M auditor di verifica della verità + K auditor dei punti di confine dal grafico delle dipendenze, sintetizza in un verdetto classificato e in un piano d'azione. Assegnazione dinamica che si adatta alle dimensioni del repository (formula 2N + K + 3). Nativo per l'esecutore, con convalida degli artefatti a ogni passaggio. | ✓ Pubblicato |
| **Dogfood Swarm** | Convergenza multi-pass: tre fasi di controllo (bug/sicurezza → proattivo → umanizzazione) quindi fase delle funzionalità. Proprietà esclusiva dei file, controlli di build dopo ogni iterazione, checkpoint dell'utente. Il rilevamento automatico del dominio genera i manifest. Collegamento di evidenza ai laboratori di test interni. | ✓ Pubblicato |

## 9 missioni

| Missione | Pack | Ruoli | Quando utilizzare |
|---------|------|-------|-------------|
| `feature-ship` | Funzionalità | 5 | Consegna completa di una funzionalità: ambito → specifica → implementazione → test → revisione |
| `bugfix` | Correzione di bug | 4 | Diagnosi della causa principale, correzione, test, verifica |
| `treatment` | Trattamento | 4 | Controllo finale + rifinitura + documentazione + verifica CI + revisione |
| `docs-release` | Documentazione | 2 | Scrivi/aggiorna la documentazione, le note di rilascio |
| `security-hardening` | Sicurezza | 4 | Modello delle minacce, audit, correzione delle vulnerabilità, ri-audit, verifica |
| `research-launch` | Ricerca | 4 | Formula la domanda, effettua la ricerca, documenta i risultati, decidi |
| `brainstorm` | Brainstorming | 9 | Indagine strutturata e multi-prospettica con disaccordo e verdetto tracciabili |
| `deep-audit` | Audit approfondito | 5 (scale) | Audit del repository basato su manifest: il numero di worker si adatta al grafico del repository tramite l'assegnazione dinamica |
| `dogfood-swarm` | Swarm | 8 (scale) | Convergenza multi-pass: controllo-a → controllo-b → controllo-c → funzionalità → sintesi finale |

Ogni missione include definizioni parziali e oneste: quando il lavoro si interrompe, il sistema documenta ciò che è stato completato e ciò che rimane, invece di fingere di aver completato tutto.

### Missione di brainstorming

Non si tratta di "brainstorming con l'IA". La missione di brainstorming è costituita da **ruoli specializzati definiti dalla legge, con disaccordo tracciabile e risultati che portano a un verdetto.**

```bash
roleos run "explore product directions for a developer tool discovery platform"
# → MISSION: Brainstorm (Structured Inquiry)
#   Chain: 4 Analysts (parallel) → Normalize → Cross-Examine → Rebut → Synthesize → Expand → Judge
```

**Cosa la rende diversa:**

- **Livello 1 (verità):** Quattro analisti emettono schemi nativi del ruolo (ContextMap, UserValueMap, MechanicsMap, PositioningMap): non si tratta di prosa condivisa. Ogni ruolo applica un divieto di punti ciechi: frasi proibite, tipi di affermazioni proibite, partizioni di input filtrate. Gli atomi contengono la provenienza. Un grafico di esame incrociato diretto produce sfide mirate. Gli analisti originali difendono, restringono o ritrattano sotto pressione.

- **Livello 2 (rendering):** Cinque voci umane distinte (Boundary Memo, Field Notes, System Sketch, Claim Brief, Cross-Exam Transcript) con divieti lessicali che impediscono la convergenza delle voci. La sintesi utilizza la verità, non la prosa resa. Entrambi i livelli sono sempre disponibili.

- **Catena di custodia:** Ogni frase resa traccia un atomo del livello di verità. Le direttive di sintesi citano gli atomi. Gli obiettivi dell'esame incrociato sono ID di affermazioni reali. Il grafico delle controversie è il prodotto, non la prosa.

**Dimostrato:** Esecuzione di successo v0.4: catena di custodia completa verificata. Consulta [`examples/golden-run.md`](examples/golden-run.md) per la catena completa degli artefatti.

### Missione di audit approfondito

Non si tratta di una scansione superficiale. La missione di audit approfondito **decompone un repository in componenti delimitati e assegna auditor specializzati in una scala determinata dal grafico delle dipendenze del repository stesso.**

```bash
roleos run "deep audit this repo" --manifest=audit-manifest.json
# → MISSION: Deep Audit (Manifest-Scaled)
#   Steps: Component Auditor ×6 + Test Truth Auditor ×6 + Seam Auditor ×8 + Synthesizer + Action Plan + Critic = 23 steps
```

**Cosa la rende diversa:**

- **Assegnazione dinamica:** il numero di worker non è fisso. Un repository con 10 componenti e 5 cluster di confine produce 28 passaggi (2 × 10 + 5 + 3). Un repository con 3 componenti produce 12. La formula di scalabilità è `2N + K + 3`, dove N = componenti, K = confini.
- **Pacchetti basati su manifest:** un `audit-manifest.json` definisce i componenti (con percorsi dei file, conteggi di righe, descrizioni) e i confini (da/a con descrizioni dell'interfaccia). Ogni auditor riceve solo il proprio pacchetto.
- **Quattro archetipi di ruolo:** Auditor dei componenti (verità del codice per modulo), Auditor di verifica della verità (test che dimostrano vs test che esistono), Auditor dei punti di confine (confini di integrazione dal grafico delle dipendenze), Sintetizzatore di audit (verdetto classificato + piano d'azione da tutti i pacchetti).
- **Convalida degli artefatti a ogni passaggio:** `validateArtifact()` viene eseguito al termine di ogni passaggio in entrambi i percorsi di esecuzione. I risultati vengono allegati agli oggetti di passaggio. Il sistema sa se ogni artefatto ha soddisfatto il suo contratto.
- **Onestà parziale:** quando il budget o l'ambito bloccano il completamento, i risultati per componente sono validi individualmente. Il sistema sintetizza ciò che è stato completato, senza mai fingere una copertura completa.

**Dimostrato:** Esecuzione di prova nativa per l'esecutore: 18 test su un manifest reale, ciclo di vita completo verificato, inclusa la riapertura dell'escalation e il fallimento parziale. La formula di scalabilità è stata verificata per i manifest con 3/6/10/15 componenti.

### Missione di swarm di test interni

Non si tratta di un linting a passaggio singolo. La missione di swarm di test interni **esegue un protocollo di convergenza multi-pass che porta un repository da "funzionante" a "pronto per la produzione" attraverso tre fasi di controllo e la consegna iterativa delle funzionalità.**

```bash
roleos swarm
# → MISSION: Dogfood Swarm (Multi-Pass Convergence)
#   Stages: Health-A → Health-B → Health-C → Feature → Final
#   Domain agents: 3-5 parallel per wave (exclusive file ownership)
```

**Cosa la rende diversa:**

- **Controllo sanitario in tre fasi** — La fase A corregge bug e problemi di sicurezza (ciclo fino a 0 CRITICAL + 0 HIGH). La fase B applica misure di sicurezza proattive (gli utenti esaminano i risultati). La fase C rende il codice più intuitivo — messaggi di errore che aiutano gli utenti, feedback sulla riconnessione, stati di caricamento, accessibilità. Ogni fase è una prospettiva distinta, non la stessa scansione ripetuta.
- **Proprietà esclusiva dei file** — ogni agente di dominio possiede file specifici tramite `swarm-manifest.json`. Nessun agente modifica lo stesso file. Nessun conflitto di unione. Nessun sovraccarico di coordinamento.
- **Controlli di build** — lint, controllo dei tipi e test devono essere superati dopo ogni ciclo. Il sistema rileva automaticamente il sistema di build (Node, Rust, Python, Go) ed esegue i comandi corretti.
- **Punti di controllo utente** — Health-B e la fase di funzionalità richiedono l'approvazione esplicita dell'utente prima dell'esecuzione. Il sistema presenta i risultati e l'utente decide cosa costruire.
- **Convergenza iterativa** — le fasi si ripetono con cicli finché non vengono soddisfatte le condizioni di uscita o raggiunto il numero massimo di iterazioni. Ogni ciclo riesamina tutto da zero per individuare eventuali regressioni introdotte dalle correzioni precedenti.
- **Rilevamento automatico del dominio** — `roleos swarm manifest --generate` rileva il tipo di repository (CLI, web, desktop, MCP, monorepo) e genera assegnazioni di dominio non sovrapposte.

**Provato:** claude-collaborate (2026-03-28) — 35→129 test, 106 problemi di controllo sanitario risolti, versione v1.1.0 rilasciata. Protocollo v2.0 con 9 fasi.

## Stato

Stabile e rilasciato. Consultare il [REGISTRO DELLE MODIFICHE](CHANGELOG.md) per la cronologia completa delle versioni e le modifiche apportate in ogni rilascio.

## Licenza

MIT

---

Creato da <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a>
