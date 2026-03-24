<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.md">English</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

# Role OS

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/role-os/readme.png" alt="Role OS" width="400">
</p>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/role-os/actions"><img src="https://github.com/mcp-tool-shop-org/role-os/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://www.npmjs.com/package/@mcptoolshop/role-os"><img src="https://img.shields.io/npm/v/@mcptoolshop/role-os" alt="npm"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License"></a>
  <a href="https://mcp-tool-shop-org.github.io/role-os/"><img src="https://img.shields.io/badge/Landing_Page-live-brightgreen" alt="Landing Page"></a>
</p>

Un livello operativo portatile e integrato che indirizza il lavoro attraverso contratti di ruolo, pacchetti strutturati, revisioni e escalation, in modo che i team possano svolgere attività di sviluppo funzionalità, integrazione, correzione di identità e gestione completa del repository, senza deviazioni, completamenti errati o affermazioni di avanzamento basate su impressioni.

## Cosa fa

Role OS previene i specifici errori che i flussi di lavoro AI generici producono:

- **Deviazioni (Drift)**: i ruoli rimangono nel loro ambito. Il prodotto non viene ridisegnato. L'interfaccia utente non ridefinisce l'ambito. Il backend non inventa la direzione del prodotto.
- **Completamenti errati (False completion)**: la definizione di "completato" è concreta. Il lavoro che nasconde lacune, omette verifiche o risolve un problema diverso viene rifiutato.
- **Contaminazione (Contamination)**: i progetti derivati o ereditati contengono residui di identità. Role OS rileva e rifiuta le deviazioni cross-progetto in termini, elementi visivi e modelli mentali.
- **Avanzamento basato su impressioni (Vibes-based progress)**: ogni passaggio è strutturato. Ogni decisione si basa su prove. "Sembra fatto" non è uno stato valido.

## Come funziona

1. **Crea un pacchetto**: definisci cosa deve esistere quando il lavoro è completato.
2. **Indirizza attraverso una catena**: il più piccolo insieme di ruoli specializzati necessari.
3. **Ogni ruolo produce un passaggio (handoff)**: un output strutturato che riduce l'ambiguità per il ruolo successivo.
4. **Il revisore valuta rispetto al contratto**: accetta, rifiuta o blocca in base alle prove, non alle impressioni.

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
| **Product** (4) | Sintetizzatore di Feedback, Prioritizzatore della Roadmap, Redattore di Specifiche, Architetto dell'Informazione |
| **Research** (4) | Ricercatore UX, Analista della Concorrenza, Ricercatore di Tendenze, Sintetizzatore di Interviste con gli Utenti |
| **Growth** (4) | Strategista per il lancio, Strategista dei Contenuti, Community Manager, Responsabile del Supporto |

Ogni ruolo ha un contratto completo: missione, quando utilizzare, quando non utilizzare, input previsti, output richiesti, standard di qualità e trigger di escalation.

## Guida rapida

```bash
npx @mcptoolshop/role-os init

# Fill context/ files for your project, then:
roleos packet new feature
roleos route .claude/packets/my-feature.md
roleos review .claude/packets/my-feature.md accept
roleos status
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
  README.md                    ← You are here
  bin/roleos.mjs               ← CLI entrypoint
  src/                         ← CLI implementation
  starter-pack/
    handbook.md                ← How Role OS works
    context/                   ← Fill these for your repo
    examples/                  ← Feature, integration, identity packets
    agents/                    ← 32 role contracts across 8 packs
    schemas/                   ← Packet, handoff, verdict formats
    policy/                    ← Routing, permissions, escalation, done
    workflows/                 ← Ship feature, fix bug, launch update, full treatment
```

## Sicurezza

Il sistema operativo del ruolo opera **solo localmente**. Copia i modelli Markdown e scrive i file dei pacchetti/verdetto nella directory `.claude/` del tuo repository. Non accede alla rete, non gestisce segreti e non raccoglie dati di telemetria. Nessuna operazione pericolosa: tutte le scritture di file utilizzano la funzione "skip-if-exists" per impostazione predefinita. Consultare il file [SECURITY.md](SECURITY.md) per la politica completa.

## Stato

**v1.0.0 — Superficie ampia, stesse regole**

- v0.1: Operativo — 3 prove, 3 accettazioni, 0 conflitti tra ruoli
- v0.2: Adozione — flusso di lavoro predefinito nel repository principale, portabile in un secondo repository
- v0.3: Prodotto — pacchetto di avvio, CLI di bootstrap, superficie di prova
- v0.4: Pacchetto di trattamento — 8 ruoli di trattamento/identità, trattamento completo con personale dedicato, portabile tra 2 repository
- v1.0.0: 32 ruoli in 8 pacchetti, CLI completa, trattamento dimostrato, portabilità multi-repository

## Licenza

MIT

---

Creato da <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a
