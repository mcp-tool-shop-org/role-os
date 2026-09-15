<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.md">English</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
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

Une couche d’exécution native pour les dépôts, qui affecte du personnel, route les tâches, valide et exécute le travail des agents de codage à travers 61 contrats de rôle spécialisés. Elle crée des paquets de tâches, assemble l’équipe appropriée à partir d’une évaluation des rôles, détecte les chaînes interrompues avant l’exécution, effectue automatiquement le reroutage en cas de blocage ou de rejet du travail, et exige des preuves structurées pour chaque verdict. Elle inclut une répartition dynamique pour les missions à l’échelle du manifeste : un dépôt à 10 composants devient automatiquement un processus d’audit en 28 étapes, au lieu de 6.

L’adaptateur Claude Code est disponible (`roleos init` fournit des modèles `.claude/`). Les contrats sont au format Markdown, ce qui permet à tout système de codage de les utiliser. Ce dépôt ne prétend pas qu’un deuxième adaptateur est déjà en fonctionnement.

## Ce qu’il fait

Role OS est la méthode professionnelle pour affecter du personnel au travail des agents de codage. Il prévient les défaillances spécifiques que les flux de travail d’IA génériques produisent :

- **Dérive** : les rôles restent dans leur domaine d’expertise. Le produit ne se redéfinit pas. L’interface utilisateur ne redéfinit pas la portée. Le backend n’invente pas la direction du produit.
- **Achèvement incorrect** : la définition de ce qui est terminé est précise. Le travail qui masque les lacunes, omet la vérification ou résout un problème différent est rejeté.
- **Contamination** : les projets dérivés ou hérités conservent des éléments d’identité. Role OS détecte et rejette la dérive inter-projets en termes de terminologie, d’éléments visuels et de modèles mentaux.
- **Progrès basé sur les impressions** : chaque transfert est structuré. Chaque verdict est lié à des preuves. « Cela semble terminé » n’est pas un état valide.

## Comment cela fonctionne

Décrivez votre tâche. Role OS détermine automatiquement le niveau d’orchestration approprié.

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

**L’échelle de repli :**

1. **Mission** : lorsque la tâche correspond à un flux de travail récurrent et éprouvé (correction de bug, traitement, lancement de fonctionnalité, documentation, sécurité, recherche, brainstorming, audit approfondi, test en groupe). Chaîne de rôles connue, flux d’artefacts, branches d’escalade et définitions honnêtes et partielles.
2. **Paquet** : lorsque la tâche appartient à une famille connue, mais ne correspond pas à une mission complète. 10 paquets d’équipe calibrés avec sélection automatique et protections contre les incompatibilités.
3. **Routage libre** : lorsque la tâche est nouvelle, mixte ou incertaine. Évalue tous les 61 rôles par rapport au contenu du paquet et assemble une chaîne dynamique.

Le système ne force jamais le travail à travers une abstraction incorrecte. Il explique pourquoi il a choisi chaque niveau et propose des alternatives.

**Une seule commande pour lancer l’exécution :**

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

**Interventions en cas de problème :**

```bash
roleos retry 0                 # Retry a failed step
roleos reroute 1 "Frontend Developer" "UI bug"  # Swap a role
roleos escalate "Test Engineer" "Repo Researcher" "missed edge case" "re-diagnose"
roleos block 2 "waiting for API spec"
roleos reopen 0 "found issue in review"
```

Les exécutions sont persistées sur le disque (`.claude/runs/`), de sorte que les sessions interrompues reprennent en douceur. Chaque étape comprend des instructions pour l’opérateur : ce qui doit être produit, les sections requises et les conditions d’arrêt.

**Une fois le routage effectué :**

1. **Chaque rôle produit un transfert** : une sortie structurée avec des éléments de preuve qui réduisent l’ambiguïté pour le rôle suivant.
2. **Un critique examine par rapport au contrat** : accepte, rejette ou bloque en fonction de preuves structurées, et non d’impressions.
3. **Le reroutage s’effectue automatiquement** : le travail bloqué ou rejeté est routé vers le résolveur approprié avec une raison, un type de récupération et l’artefact requis.

## Répartition tenant compte du budget

Role OS peut consulter un **analyste de budget de jetons** local pour chaque étape de répartition et joindre une prévision de dépenses indicative au manifeste : optionnel (`ROLEOS_BUDGET_CONSULT`), indicatif (il ne bloque jamais une répartition) et en cas d’échec, il revient à une base de référence déterministe. Désactivé par défaut ; la prévision est locale et gratuite. Voir le [manuel](https://mcp-tool-shop-org.github.io/role-os/handbook/specialist-budget/).

## Supervision des appels d’outils

Role OS vérifie et contrôle les appels d’outils au niveau `PreToolUse`, de manière déterministe, sans modèle sur le chemin critique :

- **Surveillant de conformité** (indicatif, en cas d’échec, il revient à une base de référence) : un schéma déterministe + un seuil de contrat calculable vérifie un appel proposé par rapport à son contrat d’outil catalogué et joint un verdict indicatif sur un appel *manifestement* non conforme ; il ne bloque jamais. Un seuil LLM optionnel (`ROLEOS_CONFORMANCE_CONSULT`) gère les résidus véritablement sémantiques.
- **Contrôle des capacités** (en cas d’échec, optionnel `ROLEOS_CAPABILITY_GATE`, désactivé par défaut) : privilèges minimums déterministes sur les actions *irréversibles* (publication sur npm/PyPI, `gh release`, `git push`, modifications du dépôt, déploiement sur Pages). Une action contrôlée est refusée à moins que le directeur n’ait accordé sa capacité dans `.claude/role-os/capabilities.json`, de sorte qu’une étape incorrecte (une erreur honnête ou une action injectée) ne puisse pas déclencher une action irréversible non autorisée. Le complément préventif de la règle du compensateur nommé. Voir le [manuel](https://mcp-tool-shop-org.github.io/role-os/handbook/).

## Dossier de l’équipe

Chaque rôle possède un **dossier** : une fiche de personnage qui sert également de configuration au moment de l’exécution. Six aptitudes (rigueur, rythme, portée, scepticisme, autonomie, franchise) correspondent à de véritables paramètres de répartition ; une couche de **disposition** à huit archétypes (sceptique, constructeur, enquêteur, anticonformiste…) contient une instruction comportementale ; et chaque rôle a un portrait et une note. Parcourez toute l’équipe sous forme de galerie (`dossier/dossier.html`) : le radar de chaque rôle montre sa configuration ajustée par rapport à son idéal canonique.

Lorsqu’un rôle a un dossier, la répartition injecte une **posture opérationnelle** : l’instruction comportementale de la disposition, ainsi qu’une ligne de posture à partir des aptitudes du rôle, de sorte que la fiche configure réellement le rôle. Optionnel et additif : les rôles sans dossier se comportent exactement comme avant. Voir le [manuel](https://mcp-tool-shop-org.github.io/role-os/handbook/crew-dossier/).

## État du déploiement au niveau de l’organisation

L’état du déploiement à l’échelle de l’organisation (file d’attente, décisions, enregistrements d’audit, paquets de verrouillage par dépôt) est stocké dans un **dépôt privé** distinct, interne à l’organisation (`role-os-rollout`). Ce dépôt est le produit ; ce dépôt est l’état opérationnel.

## Mémoire et continuité

Role OS ne possède ni ne duplique la couche de mémoire. Lorsqu’un projet de système de mémoire est utilisé, il s’agit du système de continuité canonique : les faits du dépôt, les décisions, les points en suspens et l’historique du traitement y sont stockés.

Role OS s’intègre à ce système lorsqu’il est présent. Il ne le remplace pas.

## Traitement complet et vérification avant déploiement

Le traitement complet est un protocole canonique en 7 phases, défini dans la mémoire du projet en studio (`memory/full-treatment.md`). Role OS gère et examine les traitements à l’aide de contrats de rôle, de transferts et de validations — il ne redéfinit pas le protocole.

La **vérification avant déploiement** est une série de 31 contrôles de qualité qui s’exécutent avant le traitement complet. Les contrôles critiques A à D doivent être réussis avant le début de tout traitement. Référence canonique : `memory/shipcheck.md`.

Ordre : d’abord la vérification avant déploiement, puis le traitement complet. Aucune version 1.0.0 sans avoir réussi les contrôles critiques.

## Le catalogue de 61 rôles

Le catalogue regroupe ses 61 rôles en 11 familles. (Dispatch utilise un ensemble distinct de 10 **ensembles de rôles** — fonctionnalité, correction de bug, sécurité, documentation, lancement, recherche, traitement, audit approfondi, brainstorming, travail collaboratif — qui puisent des rôles dans ces familles.)

| Famille | Rôles |
|--------|-------|
| **Core** (2) | Orchestrateur, évaluateur critique |
| **Product** (4) | Stratège produit, synthétiseur de commentaires, priorisateur de feuille de route, rédacteur de spécifications |
| **Engineering** (7) | Développeur frontend, ingénieur backend, ingénieur de test, ingénieur de refactoring, ingénieur de performance, auditeur de dépendances, évaluateur de sécurité |
| **Design** (2) | Concepteur d’interface utilisateur, gardien de la marque |
| **Marketing** (1) | Rédacteur de textes pour le lancement |
| **Treatment** (7) | Chercheur de dépôt, traducteur de dépôt, architecte de documentation, conservateur de métadonnées, auditeur de couverture, vérificateur de déploiement, ingénieur de publication |
| **Research** (4) | Chercheur UX, analyste concurrentiel, chercheur de tendances, synthétiseur d’entretiens avec les utilisateurs |
| **Growth** (4) | Stratège de lancement, stratège de contenu, responsable de la communauté, responsable du tri des demandes d’assistance |
| **Brainstorm** (19) | Explorateur de contexte, explorateur de la valeur pour l’utilisateur, explorateur de percées créatives, explorateur de mécanismes, explorateur de marché, explorateur dissident, explorateur de faisabilité, explorateur de la qualité, analyste de contexte, analyste de la valeur pour l’utilisateur, analyste de mécanismes, analyste de positionnement, analyste dissident, normalisateur, synthétiseur, développeur de produits, développeur de scénarios, développeur d’avantages concurrentiels, juge |
| **Deep Audit** (4) | Auditeur de composants, auditeur de la vérité des tests, auditeur des points de jonction, synthétiseur d’audit |
| **Swarm** (7) | Coordinateur de travail collaboratif, agent backend de travail collaboratif, agent de liaison de travail collaboratif, agent de tests de travail collaboratif, agent d’infrastructure de travail collaboratif, agent frontend de travail collaboratif, synthétiseur de travail collaboratif |

Chaque rôle dispose d’un contrat complet : mission, cas d’utilisation, cas où il ne faut pas l’utiliser, entrées attendues, sorties requises, critères de qualité et déclencheurs d’escalade. Chaque rôle peut être affecté — `roleos route` peut en recommander n’importe lequel en fonction du contenu du paquet.

## Démarrage rapide

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

## Quand ne pas utiliser Role OS

- Corrections d’une seule ligne, fautes de frappe ou bugs évidents
- Recherche exploratoire sans résultat défini
- Travail qui tient dans la tête d’une seule personne en 5 minutes
- Corrections d’urgence qui doivent être déployées avant la fin de la chaîne de validation
- Projets où vous privilégiez la rapidité à la structure

## Preuves

Role OS a été testé avec succès dans trois configurations différentes dans deux dépôts structurellement différents :

**Test 001 — Travail sur une fonctionnalité** (Écran d’équipage, Star Freight)
- Chaîne de 7 rôles, 45 scénarios de test, 0 collisions de rôles
- A empêché la contamination provenant d’un ancêtre de branche, a détecté une invention en ligne et a mis en évidence les blocages réels

**Test 002 — Travail d’intégration** (Connexion CampaignState, Star Freight)
- Chaîne de 5 rôles, a résolu une jonction architecturale sans faux-semblants
- Les tests anti-faux-semblants ont prouvé que le chemin actif est réel, et non un simple espace réservé

**Test 003 — Travail sur l’identité** (Purge de la contamination, Star Freight)
- Chaîne de 6 rôles, 51 scénarios de test, y compris une défense durable contre la contamination CI
- A corrigé la dérive de la fiction héritée sans entraîner une refonte complète

**Test de portabilité** (Cohérence de la persona, sensor-humor)
- Même structure, langage/domaine/pile différents
- Adopté avec seulement des modifications de contexte — aucune modification des contrats principaux

**Traitement complet FT-001** (portlight-desktop)
- Traitement en 7 phases avec des rôles du paquet de traitement
- La vérification avant déploiement a été validée, zéro collision de rôles

**Traitement complet FT-002** (studioflow)
- Même paquet de traitement, dépôt structurellement différent (espace de travail créatif par rapport à un jeu)
- Le paquet de traitement est portable — aucune modification du contrat n’est nécessaire

**Session de brainstorming réussie** (Sujet du marché MCP)
- Chaîne de 9 rôles, 4 analystes en parallèle, examen croisé + réfutation du graphique des désaccords
- 4 défis lancés, 3 revendications affinées, 1 non résolu — une pression saine, pas d’impasse
- 16 + liens de traçabilité des artefacts rendus vers les atomes de la couche de vérité
- Chaîne de traçabilité complète prouvée : vérité → atomes → désaccord → synthèse → développement → juge → rendu → traçabilité

## Propriétés essentielles

Elles sont non négociables. Si une modification affaiblit l’une d’entre elles, rejetez-la.

- Les limites des rôles sont respectées
- La validation est efficace
- L’escalade reste honnête
- Les paquets restent testables
- La portabilité nécessite une adaptation du contexte, et non une chirurgie du cœur

## Structure du projet

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

## Sécurité

Par défaut, Role OS fonctionne uniquement sur le **système de fichiers local**. Il copie les modèles Markdown et écrit les fichiers de paquet/résultat/exécution dans le répertoire `.claude/` de votre dépôt. Le fonctionnement par défaut n’effectue aucune requête réseau, ne gère aucun secret et ne collecte aucune télémétrie. Aucune opération dangereuse — toutes les écritures de fichiers utilisent par défaut l’option « ignorer si le fichier existe ».

Trois fonctionnalités **optionnelles** utilisent le réseau lorsque vous les activez explicitement :

- **`roleos verify-citations`** — exécute une commande dans le terminal externe `prism`, qui résout les identifiants de citation par rapport aux API publiques arXiv/Crossref (envoie les ID/URL de citation en cours de vérification).
- **Niveau spécialiste** (`roleos specialist`, rôles enregistrés) — envoie des invites à `backend_url`, que vous configurez dans `.role-os/specialists.json` (généralement un point de terminaison de modèle local).
- **Consultation sur le budget/la conformité** (`ROLEOS_BUDGET_CONSULT` / `ROLEOS_CONFORMANCE_CONSULT`) — envoie le contexte de l’étape/de l’appel d’outil à un modèle local via HTTP pour obtenir un avis.

Les trois sont désactivés par défaut et, en cas d’échec, ils adoptent un comportement déterministe local. Consultez [SECURITY.md](SECURITY.md) pour connaître la politique complète.

## Le système d’exploitation

| Couche | Ce qu’il fait | Statut |
|-------|-------------|--------|
| **Routing** | Évalue les 61 rôles en fonction du contenu des paquets, explique les recommandations et évalue la fiabilité. | ✓ Disponible |
| **Chain builder** | Assemble des chaînes ordonnées à partir des rôles évalués, en privilégiant le type de paquet plutôt qu’en se limitant à un modèle. | ✓ Disponible |
| **Conflict detection** | Validation en 4 étapes : conflits importants, séquence, redondance, lacunes de couverture. Suggestions de correction. | ✓ Disponible |
| **Escalation** | Route automatiquement les tâches bloquées, rejetées ou divisées vers le résolveur approprié, en indiquant la raison et l’artefact requis. | ✓ Disponible |
| **Evidence** | Preuves structurées tenant compte du rôle dans les conclusions. Vérifications de la suffisance. 12 types de preuves. | ✓ Disponible |
| **Dispatch** | Génère des manifestes d’exécution pour l’environnement de test de l’agent de codage. Profils d’outils par rôle, invites système, budgets. | ✓ Disponible |
| **Trials** | Ensemble complet testé : 30/30 tâches principales + 5/5 essais négatifs. 7 essais de paquet terminés. | ✓ Terminé |
| **Team Packs** | 10 paquets calibrés avec sélection automatique, protections contre les incohérences et repli vers un routage libre. | ✓ Disponible |
| **Outcome calibration** | Enregistre les résultats de l’exécution, ajuste les pondérations des paquets/rôles en fonction des résultats et ajuste les seuils de confiance. | ✓ Disponible |
| **Mixed-task decomposition** | Détecte les tâches composites, les divise en paquets enfants, attribue des paquets et conserve les dépendances. | ✓ Disponible |
| **Composite execution** | Exécute les paquets enfants dans l’ordre des dépendances, en transmettant les artefacts, en assurant la reprise des branches et en effectuant la synthèse. | ✓ Disponible |
| **Adaptive replanning** | Les modifications de portée, les découvertes ou les nouvelles exigences en cours d’exécution mettent à jour le plan sans redémarrer. | ✓ Disponible |
| **Session spine** | `roleos init claude` crée les fichiers CLAUDE.md, /roleos-route, /roleos-review, /roleos-status. `roleos doctor` vérifie le câblage. Les cartes de routage prouvent l’engagement. | ✓ Disponible |
| **Hook spine** | 5 points d’ancrage du cycle de vie (SessionStart, PromptSubmit, PreToolUse, SubagentStart, Stop). Application consultative : rappels de la carte de routage, contrôle de l’accès aux outils d’écriture, injection du rôle du sous-agent, audit de l’achèvement. | ✓ Disponible |
| **Artifact spine** | Contrats d’artefacts par rôle. Contrats de transfert de paquets. Validation structurelle. Vérifications de l’exhaustivité de la chaîne. Les rôles en aval ne devinent jamais ce qu’ils ont reçu. | ✓ Disponible |
| **Mission library** | 9 missions nommées (livraison de fonctionnalités, correction de bugs, traitement, publication de documentation, renforcement de la sécurité, lancement de la recherche, séance de brainstorming, audit approfondi, test en interne). Chacune déclare un paquet, une chaîne de rôles, un flux d’artefacts, des branches d’escalade et une définition honnête et partielle. | ✓ Disponible |
| **Mission runner** | Créer des exécutions, parcourir les étapes avec un état suivi, terminer/échouer avec un rapport honnête. Propagation des étapes bloquées, avertissements d’escalade hors chaîne, réouverture de la dernière étape. | ✓ Disponible |
| **Unified entry** | `roleos start` décide automatiquement de la mission par rapport au paquet ou au routage libre. Échelle de repli avec des scores de confiance, des alternatives et une détection composite. | ✓ Disponible |
| **Persistent runs** | `roleos run` crée des exécutions stockées sur disque. `resume`, `next`, `explain`, `complete`, `fail`. Interventions : rediriger, escalader, réessayer, bloquer, rouvrir. Guide local pour chaque étape. Mesure du frottement. | ✓ Disponible |
| **Brainstorm** | Architecture à deux couches : vérité (schémas natifs des rôles, atomes de provenance, graphe de contestation croisée) + rendu (5 voix distinctes, interdictions lexicales, transcription du débat). Les liens de traçabilité prouvent que chaque affirmation rendue correspond à un atome de vérité. Exécution réussie vérifiée. | ✓ Disponible |
| **Deep Audit** | Audit du dépôt à l’échelle du manifeste : décomposer le dépôt en composants, affecter N auditeurs + M auditeurs de vérification de la vérité + K auditeurs de la limite du graphe de dépendances, synthétiser en une conclusion et un plan d’action classés. La distribution dynamique s’adapte à la taille du dépôt (formule : 2N + K + 3). Natif de l’exécuteur avec validation des artefacts à chaque étape. | ✓ Disponible |
| **Dogfood Swarm** | Convergence en plusieurs étapes : trois étapes de santé (bug/sécurité → proactif → humanisation), puis étape des fonctionnalités. Propriété exclusive des fichiers, contrôles de build après chaque vague, points de contrôle utilisateur. La détection automatique du domaine génère des manifestes. Pont de preuves vers les laboratoires de test en interne. | ✓ Disponible |

## 9 missions

| Mission | Paquet | Rôles | Quand l’utiliser |
|---------|------|-------|-------------|
| `feature-ship` | fonctionnalité | 5 | Livraison complète des fonctionnalités : portée → spécification → implémentation → test → examen |
| `bugfix` | correction de bug | 4 | Diagnostiquer la cause première, corriger, tester, vérifier |
| `treatment` | traitement | 4 | Vérification avant publication + amélioration + documentation + vérification CI + examen |
| `docs-release` | documentation | 2 | Rédiger/mettre à jour la documentation, les notes de publication |
| `security-hardening` | sécurité | 4 | Modélisation des menaces, audit, correction des vulnérabilités, réaudit, vérification |
| `research-launch` | recherche | 4 | Formuler la question, effectuer des recherches, documenter les résultats, décider |
| `brainstorm` | brainstorming | 9 | Enquête structurée et multiperspective avec désaccord et conclusion traçables |
| `deep-audit` | audit approfondi | 5 (échelles) | Audit du dépôt basé sur le manifeste : le nombre de travailleurs s’adapte à la taille du graphe du dépôt via une distribution dynamique |
| `dogfood-swarm` | groupe | 8 (échelles) | Convergence en plusieurs étapes : santé-a → santé-b → santé-c → fonctionnalité → synthèse finale |

Chaque mission comprend des définitions honnêtes et partielles : lorsque le travail s’arrête, le système documente ce qui a été accompli et ce qui reste à faire au lieu de prétendre que tout est terminé.

### Mission de brainstorming

Ce n’est pas un « brainstorming par l’IA ». La mission de brainstorming consiste en des **rôles spécialisés encadrés par la loi, avec un désaccord traçable et une production de résultats.**

```bash
roleos run "explore product directions for a developer tool discovery platform"
# → MISSION: Brainstorm (Structured Inquiry)
#   Chain: 4 Analysts (parallel) → Normalize → Cross-Examine → Rebut → Synthesize → Expand → Judge
```

**Ce qui la rend différente :**

- **Couche 1 (vérité) :** Quatre analystes émettent des schémas natifs des rôles (ContextMap, UserValueMap, MechanicsMap, PositioningMap) : pas de prose partagée. Chaque rôle applique une restriction de champ d’application : phrases interdites, types d’affirmations interdits, partitions d’entrée filtrées. Les atomes contiennent des informations sur la provenance. Un graphe d’examen croisé dirigé produit des défis ciblés. Les analystes d’origine défendent, affinent ou rétractent leurs affirmations sous la pression.

- **Couche 2 (rendu) :** Cinq voix humaines distinctes (Boundary Memo, Field Notes, System Sketch, Claim Brief, Cross-Exam Transcript) avec des interdictions lexicales empêchant la convergence des voix. La synthèse consomme la vérité, et non le texte rendu. Les deux couches sont toujours disponibles.

- **Chaîne de traçabilité :** Chaque phrase générée peut être retracée jusqu’à un élément de base de la couche de vérité. Les directives de synthèse font référence aux éléments. Les cibles de l’interrogatoire croisé sont les identifiants de revendications réels. Le graphe des litiges est le résultat, et non le texte.

**Prouvé :** Exécution de référence v0.4 — chaîne de traçabilité complète vérifiée. Voir [`examples/golden-run.md`](examples/golden-run.md) pour la chaîne complète des artefacts.

### Mission d’audit approfondi

Il ne s’agit pas d’une analyse superficielle. La mission d’audit approfondi **décompose un dépôt en composants délimités et affecte des auditeurs spécialisés à une échelle déterminée par le propre graphe de dépendances du dépôt.**

```bash
roleos run "deep audit this repo" --manifest=audit-manifest.json
# → MISSION: Deep Audit (Manifest-Scaled)
#   Steps: Component Auditor ×6 + Test Truth Auditor ×6 + Seam Auditor ×8 + Synthesizer + Action Plan + Critic = 23 steps
```

**Ce qui la rend différente :**

- **Affectation dynamique** — le nombre d’agents n’est pas fixe. Un dépôt de 10 composants avec 5 groupes de délimitation produit 28 étapes (2 × 10 + 5 + 3). Un dépôt de 3 composants produit 12. La formule de mise à l’échelle est `2N + K + 3` où N = composants, K = délimitations.
- **Ensembles basés sur un manifeste** — un `audit-manifest.json` définit les composants (avec les chemins de fichiers, le nombre de lignes, les descriptions) et les délimitations (de/vers avec les descriptions de l’interface). Chaque auditeur ne reçoit que son propre ensemble.
- **Quatre archétypes de rôles** — Auditeur de composants (vérité du code par module), Auditeur de la vérité des tests (tests qui prouvent par rapport aux tests qui existent), Auditeur des points de jonction (délimitations d’intégration du graphe de dépendances), Synthétiseur d’audit (évaluation classée + plan d’action à partir de tous les ensembles).
- **Validation des artefacts à chaque étape** — `validateArtifact()` se déclenche à la fin de chaque étape dans les deux chemins d’exécution. Les résultats sont joints aux objets d’étape. Le système sait si chaque artefact a satisfait son contrat.
- **Résultats partiels honnêtes** — lorsque le budget ou la portée empêchent l’achèvement, les résultats par composant sont valides individuellement. Le système synthétise à partir de ce qui a été achevé, sans jamais prétendre à une couverture complète.

**Prouvé :** Exécution de preuve native du moteur — 18 tests sur un manifeste réel, cycle de vie complet vérifié, y compris la réouverture en cas d’escalade et l’échec partiel. Formule de mise à l’échelle vérifiée pour les manifestes de 3/6/10/15 composants.

### Mission d’essaim de test

Il ne s’agit pas d’une analyse unique. La mission d’essaim de test **exécute un protocole de convergence multi-passe qui fait passer un dépôt de « fonctionnel » à « prêt pour la production » en trois étapes de vérification de l’état et en livrant des fonctionnalités de manière itérative.**

```bash
roleos swarm
# → MISSION: Dogfood Swarm (Multi-Pass Convergence)
#   Stages: Health-A → Health-B → Health-C → Feature → Final
#   Domain agents: 3-5 parallel per wave (exclusive file ownership)
```

**Ce qui la rend différente :**

- **Trois étapes de vérification de l’état** — L’étape A corrige les bogues et les problèmes de sécurité (boucle jusqu’à 0 CRITIQUE + 0 GRAVE). L’étape B applique un renforcement proactif (les utilisateurs examinent les résultats). L’étape C humanise le code — messages d’erreur qui aident les utilisateurs, commentaires de reconnexion, états de chargement, accessibilité. Chaque étape est une perspective distincte, et non la même analyse répétée.
- **Propriété exclusive des fichiers** — chaque agent de domaine est propriétaire de fichiers spécifiques via `swarm-manifest.json`. Aucun agent n’édite le même fichier. Pas de conflits de fusion. Pas de surcharge de coordination.
- **Barrières de construction** — l’analyse statique + la vérification des types + les tests doivent réussir après chaque vague. Le système détecte automatiquement le système de construction (Node, Rust, Python, Go) et exécute les commandes appropriées.
- **Points de contrôle utilisateur** — L’étape de vérification de l’état et l’étape de livraison des fonctionnalités nécessitent une approbation explicite de l’utilisateur avant l’exécution. Le système présente les résultats, et l’utilisateur décide de ce qu’il faut construire.
- **Convergence itérative** — les étapes sont répétées avec des boucles de vagues jusqu’à ce que les conditions de sortie soient remplies ou que le nombre maximal d’itérations soit atteint. Chaque vague ré-évalue à partir de zéro pour détecter les régressions introduites par les corrections précédentes.
- **Détection automatique du domaine** — `roleos swarm manifest --generate` détecte le type de dépôt (CLI, web, bureau, MCP, monorepo) et génère des affectations de domaine non superposées.

**Prouvé :** claude-collaborate (2026-03-28) — 35 → 129 tests, 106 problèmes d’état corrigés, v1.1.0 publié. Protocole v2.0 avec 9 phases.

## Statut

Stable et prêt à être déployé. Consultez le [JOURNAL DES MODIFICATIONS](CHANGELOG.md) pour obtenir l’historique complet des versions et les modifications apportées à chaque version.

## Licence

MIT

---

Créé par <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a>
