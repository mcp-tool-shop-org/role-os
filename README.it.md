<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.md">English</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

# Role OS

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/role-os/readme.png" alt="Role OS" width="400">
</p>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/role-os/actions"><img src="https://github.com/mcp-tool-shop-org/role-os/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://www.npmjs.com/package/role-os"><img src="https://img.shields.io/npm/v/role-os" alt="npm"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License"></a>
  <a href="https://mcp-tool-shop-org.github.io/role-os/"><img src="https://img.shields.io/badge/Landing_Page-live-brightgreen" alt="Landing Page"></a>
</p>

Un sistema operativo multi-Claude che assegna personale, definisce i percorsi, convalida e gestisce le attività attraverso 31 contratti di ruolo specializzati. Crea pacchetti di attività, assembla il team giusto in base alla corrispondenza dei ruoli, rileva problemi prima dell'esecuzione, indirizza automaticamente le operazioni di ripristino quando un'attività viene bloccata o rifiutata e richiede prove strutturate in ogni decisione.

## Cosa fa

Role OS è il modo professionale di utilizzare multi-Claude. Previene i problemi specifici che i flussi di lavoro AI generici possono causare:

- **Deviazioni (Drift)**: i ruoli rimangono nel loro ambito. Il prodotto non viene ridisegnato. L'interfaccia utente non ridefinisce l'ambito. Il backend non inventa la direzione del prodotto.
- **Completamenti errati (False completion)**: la definizione di "completato" è concreta. Il lavoro che nasconde lacune, omette verifiche o risolve un problema diverso viene rifiutato.
- **Contaminazione (Contamination)**: i progetti derivati o ereditati contengono residui di identità. Role OS rileva e rifiuta le deviazioni cross-progetto in termini, elementi visivi e modelli mentali.
- **Avanzamento basato su impressioni (Vibes-based progress)**: ogni passaggio è strutturato. Ogni decisione si basa su prove. "Sembra fatto" non è uno stato valido.

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

**La gerarchia di fallback:**

1. **Missione** — quando l'attività corrisponde a un flusso di lavoro ricorrente consolidato (correzione di bug, trattamento, rilascio di funzionalità, documentazione, sicurezza, ricerca). Catena di ruoli nota, flusso di artefatti, rami di escalation e definizioni parziali chiare.
2. **Pacchetto** — quando l'attività appartiene a una famiglia nota, ma non corrisponde a una missione completa. 7 pacchetti di team calibrati con selezione automatica e protezioni contro le incompatibilità.
3. **Instradamento libero** — quando l'attività è nuova, complessa o incerta. Assegna un punteggio a tutti i 31 ruoli in base al contenuto del pacchetto e crea una catena dinamica.

Il sistema non forza mai un'attività attraverso un livello di astrazione errato. Spiega perché ha scelto ogni livello e offre alternative.

**Una volta instradata:**

1. **Ogni ruolo produce un passaggio** — output strutturato con elementi di prova che riducono l'ambiguità per il ruolo successivo.
2. **La revisione critica avviene in base al contratto** — accetta, rifiuta o blocca in base a prove strutturate, non a impressioni.
3. **Il ripristino avviene automaticamente** — le attività bloccate o rifiutate vengono indirizzate al risolutore appropriato con una motivazione, il tipo di ripristino e gli artefatti richiesti.

## Stato di implementazione nell'organizzazione

Lo stato di implementazione a livello di organizzazione (coda, decisioni, registri di controllo, pacchetti di blocco per repository) si trova in un repository privato separato: [`role-os-rollout`](https://github.com/mcp-tool-shop-org/role-os-rollout). Questo repository è il prodotto; quello è lo stato operativo.

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
| **Product** (3) | Generatore di feedback, Prioritizzatore della roadmap, Redattore di specifiche. |
| **Research** (4) | Ricercatore UX, Analista della Concorrenza, Ricercatore di Tendenze, Sintetizzatore di Interviste con gli Utenti |
| **Growth** (4) | Strategista per il lancio, Strategista dei Contenuti, Community Manager, Responsabile del Supporto |

Ogni ruolo ha un contratto completo: missione, quando utilizzarlo, quando non utilizzarlo, input previsti, output richiesti, standard di qualità e trigger di escalation. Ogni ruolo può essere indirizzato; `roleos route` può raccomandare uno qualsiasi di essi in base al contenuto del pacchetto.

## Guida rapida

```bash
npx role-os init

# Describe what you need — Role OS picks the right level:
roleos start "fix the crash in save handler"

# Or go manual:
roleos packet new feature
roleos route .claude/packets/my-feature.md
roleos review .claude/packets/my-feature.md accept
roleos status

# Explore missions and packs:
roleos mission list
roleos mission show bugfix
roleos packs list
roleos packs show feature
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
    mission.mjs                ← 6 named mission types (feature, bugfix, treatment, docs, security, research)
    mission-run.mjs            ← Mission runner: create → step → complete → report
    mission-cmd.mjs            ← `roleos mission` CLI commands
    route.mjs                  ← 31-role routing + dynamic chain builder
    packs.mjs                  ← 7 calibrated team packs + auto-selection
    conflicts.mjs              ← 4-pass conflict detection
    escalation.mjs             ← Auto-routing for blocked/rejected/split
    evidence.mjs               ← Structured evidence + role-aware requirements
    dispatch.mjs               ← Runtime dispatch manifests for multi-claude
    artifacts.mjs              ← 20 per-role artifact contracts + 7 pack handoffs
    decompose.mjs              ← Composite task detection + splitting
    composite.mjs              ← Dependency-ordered execution + recovery
    replan.mjs                 ← Mid-run adaptive replanning
    calibration.mjs            ← Outcome recording + weight tuning
    hooks.mjs                  ← 5 lifecycle hooks for runtime enforcement
    session.mjs                ← Session scaffolding + doctor
  test/                        ← 527 tests across 20 test files
  starter-pack/                ← Drop-in role contracts, policies, schemas, workflows
```

## Sicurezza

Il sistema operativo del ruolo opera **solo localmente**. Copia i modelli Markdown e scrive i file dei pacchetti/verdetto nella directory `.claude/` del tuo repository. Non accede alla rete, non gestisce segreti e non raccoglie dati di telemetria. Nessuna operazione pericolosa: tutte le scritture di file utilizzano la funzione "skip-if-exists" per impostazione predefinita. Consultare il file [SECURITY.md](SECURITY.md) per la politica completa.

## Il sistema operativo

| Livello. | Cosa fa | Stato |
|-------|-------------|--------|
| **Routing** | Assegna un punteggio a tutti i 31 ruoli in base al contenuto del pacchetto, spiega le raccomandazioni, valuta la confidenza. | ✓ Implementato. |
| **Chain builder** | Assembla catene ordinate per fasi dai ruoli valutati, orientate al tipo di pacchetto, ma non vincolate a modelli. | ✓ Implementato. |
| **Conflict detection** | Convalida in 4 passaggi: conflitti gravi, sequenza, ridondanza, lacune di copertura. Suggerimenti per la correzione. | ✓ Implementato. |
| **Escalation** | Indirizza automaticamente le attività bloccate/rifiutate/divise al risolutore appropriato con la motivazione e gli artefatti richiesti. | ✓ Implementato. |
| **Evidence** | Prove strutturate specifiche per il ruolo nelle decisioni. Controlli di sufficienza. 12 tipi di prove. | ✓ Implementato. |
| **Dispatch** | Genera manifesti di esecuzione per multi-claude. Profili degli strumenti per ruolo, prompt di sistema, budget. | ✓ Implementato. |
| **Trials** | Roster completo dimostrato: 30/30 attività di successo + 5/5 test negativi. 7 test dei pacchetti completati. | ✓ Completo. |
| **Team Packs** | 7 pacchetti calibrati con selezione automatica, protezioni contro le incompatibilità e fallback con instradamento libero. | ✓ Implementato. |
| **Outcome calibration** | Registra i risultati delle esecuzioni, calibra i pesi dei pacchetti/ruoli in base ai risultati, regola le soglie di confidenza. | ✓ Implementato. |
| **Mixed-task decomposition** | Rileva attività composte, le divide in pacchetti secondari, assegna i pacchetti e preserva le dipendenze. | ✓ Implementato. |
| **Composite execution** | Esegue i pacchetti secondari nell'ordine delle dipendenze con il passaggio degli artefatti, il ripristino dei rami e la sintesi. | ✓ Implementato. |
| **Adaptive replanning** | Le modifiche all'ambito, le scoperte o i nuovi requisiti durante l'esecuzione aggiornano il piano senza doverlo riavviare. | ✓ Implementato. |
| **Session spine** | `roleos init claude` crea i file CLAUDE.md, /roleos-route, /roleos-review, /roleos-status. `roleos doctor` verifica la configurazione. Le schede di instradamento dimostrano l'utilizzo. | ✓ Implementato. |
| **Hook spine** | 5 "hook" del ciclo di vita (SessionStart, PromptSubmit, PreToolUse, SubagentStart, Stop). Applicazione delle policy: promemoria sulle "route card", controllo sull'utilizzo degli strumenti, assegnazione di ruoli ai "subagent", verifica del completamento. | ✓ Implementato. |
| **Artifact spine** | 20 contratti per ruolo relativi agli artefatti. 7 contratti per il passaggio di consegne tra "pack". Validazione strutturale. Controlli di completezza della "catena". I ruoli successivi non devono mai indovinare ciò che hanno ricevuto. | ✓ Implementato. |
| **Mission library** | 6 missioni denominate (implementazione di funzionalità, correzione di bug, ottimizzazione, rilascio della documentazione, rafforzamento della sicurezza, avvio della ricerca). Ogni missione definisce il "pack", la catena di ruoli, il flusso degli artefatti, i percorsi di escalation e una definizione parziale e trasparente. Tutte e 6 le missioni sono state testate e ottimizzate. | ✓ Implementato. |
| **Mission runner** | Creazione di esecuzioni, passaggio graduale con tracciamento dello stato, completamento/fallimento con reportistica trasparente. Propagazione dei passaggi bloccati, avvisi di escalation al di fuori della catena, riapertura dell'ultimo passaggio. | ✓ Implementato. |
| **Unified entry** | Il comando `roleos start` decide automaticamente tra l'utilizzo di una missione, di un "pack" o di un percorso libero. Sistema di fallback con punteggi di affidabilità, alternative e rilevamento composito. | ✓ Implementato. |

## 6 missioni

| Missione | Pacchetto | Ruoli | Quando utilizzarla |
|---------|------|-------|-------------|
| `feature-ship` | Funzionalità | 5 | Erogazione completa di una funzionalità: definizione dell'ambito → specifica → implementazione → test → revisione |
| `bugfix` | Correzione di bug | 4 | Diagnosi della causa principale, correzione, test, verifica |
| `treatment` | Ottimizzazione | 4 | Controllo della qualità + rifinitura + documentazione + verifica tramite CI + revisione |
| `docs-release` | Documentazione | 2 | Scrittura/aggiornamento della documentazione, note di rilascio |
| `security-hardening` | Sicurezza | 4 | Modello delle minacce, audit, correzione delle vulnerabilità, nuovo audit, verifica |
| `research-launch` | Ricerca | 4 | Formulazione della domanda, ricerca, documentazione dei risultati, decisione |

Ogni missione include definizioni parziali e trasparenti: quando il lavoro si blocca, il sistema documenta ciò che è stato completato e ciò che rimane, invece di fornire una falsa impressione di completamento.

## Stato

- v0.1–v0.4: Fondamenta: test, adozione, "pack" di ottimizzazione, "pack" di avvio
- v1.0.0: 32 ruoli, interfaccia a riga di comando completa, ottimizzazione collaudata, portabilità multi-repository
- v1.0.2: Blocco del sistema operativo dei ruoli (correzioni per garantire la veridicità, `init --force`)
- v1.1.0: 31 ruoli, "spina dorsale" completa per il routing, rilevamento dei conflitti, escalation, evidenza, dispatch, 7 "pack" di team collaudati. 35 esecuzioni di prova. 212 test.
- v1.2.0: "Pack" calibrati promossi a impostazione predefinita. Selezione automatica, rilevamento delle incongruenze, suggerimento di alternative, fallback per il routing libero. 246 test.
- v1.3.0: Calibrazione dei risultati, decomposizione dei compiti misti, esecuzione composita, riprogrammazione adattiva. 317 test.
- v1.4.0: "Spina dorsale" della sessione: `roleos init claude`, `roleos doctor`, "route card", comandi `/roleos-route + /roleos-review + /roleos-status`. 335 test.
- v1.5.0: "Spina dorsale" dei "hook": 5 "hook" del ciclo di vita per l'applicazione delle policy in fase di esecuzione. 358 test.
- v1.6.0: "Spina dorsale" degli artefatti: 20 contratti per ruolo relativi agli artefatti, 7 contratti per il passaggio di consegne tra "pack", validazione strutturale. 385 test.
- v1.7.0: Prova di completamento: attività reali eseguite sull'intera piattaforma. Interfaccia a riga di comando `roleos artifacts`. Escalation trasparente in caso di correzioni strutturali. 398 test.
- v1.8.0: Libreria di missioni (Fase S): 6 missioni denominate, motore di esecuzione, report di completamento. Ottimizzate da 6 esecuzioni di prova reali. 481 test.
- **v1.9.0**: Percorso di accesso unificato (Fase T) - `roleos start` decide automaticamente tra l'utilizzo di una missione, di un "pack" o di un percorso libero. Sistema di fallback, rilevamento composito, test di confronto del percorso di accesso. 527 test.

## Licenza

MIT

---

Creato da <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a
