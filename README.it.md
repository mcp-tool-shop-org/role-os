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

## La struttura

Role OS include 8 contratti di ruolo collaudati:

| Ruolo | Lavoro |
|------|-----|
| **Orchestrator** | Decompone il lavoro nella catena più piccola e logica. |
| **Product Strategist** | Definisce l'ambito e protegge l'intento del prodotto. |
| **UI Designer** | Progetta la gerarchia, l'interazione e la struttura visiva. |
| **Frontend Developer** | Implementa le interfacce utente in modo fedele. |
| **Backend Engineer** | Implementa i contratti e il comportamento del server/dati. |
| **Test Engineer** | Verifica il lavoro rispetto a rischi reali, non a formalità. |
| **Launch Copywriter** | Scrive messaggi veritieri basati sul lavoro completato. |
| **Critic Reviewer** | Accetta o rifiuta in base alla conformità al contratto. |

## Guida rapida

```bash
# Copy the starter pack into your repo
cp -r starter-pack/ your-repo/.claude/

# Fill the four context files
# - context/product-brief.md   (what this product is)
# - context/repo-map.md        (how the repo works)
# - context/current-priorities.md (what's happening now)
# - context/brand-rules.md     (identity law)

# Create your first packet, route it, review it
# See starter-pack/handbook.md for the full flow
```

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
  starter-pack/
    handbook.md                ← How Role OS works (under 500 words)
    context/                   ← Fill these for your repo
    examples/                  ← Feature, integration, identity packets
    agents/                    ← 8 role contracts
    schemas/                   ← Packet, handoff, verdict formats
    policy/                    ← Routing, permissions, escalation, done
    workflows/                 ← Ship feature, fix bug, launch update, full treatment (reference)
```

## Sicurezza

Il sistema operativo del ruolo opera **solo localmente**. Copia i modelli Markdown e scrive i file dei pacchetti/verdetto nella directory `.claude/` del tuo repository. Non accede alla rete, non gestisce segreti e non raccoglie dati di telemetria. Nessuna operazione pericolosa: tutte le scritture di file utilizzano la funzione "skip-if-exists" per impostazione predefinita. Consultare il file [SECURITY.md](SECURITY.md) per la politica completa.

## Stato

**v1.0.0 — Rilasciata**

- v0.1: Funzionante — 3 prove, 3 accettazioni, 0 conflitti di ruolo.
- v0.2: Adozione — flusso di lavoro predefinito nel repository principale, portabile a un secondo repository.
- v0.3: Prodotto — pacchetto di avvio, CLI di bootstrap, documentazione sull'adozione.

## Licenza

MIT

---

Creato da <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a
