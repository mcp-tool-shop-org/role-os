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

Une couche d’exécution native pour les dépôts qui affecte du personnel, dirige, valide et exécute le travail des agents de codage à travers 61 contrats de rôle spécialisés. Elle crée des paquets de tâches, assemble l’équipe appropriée à partir d’une correspondance de rôles évaluée, détecte les chaînes interrompues avant l’exécution, redirige automatiquement la reprise lorsque le travail est bloqué ou rejeté, et exige des preuves structurées pour chaque verdict. Elle inclut une répartition dynamique pour les missions à l’échelle du manifeste : un dépôt à 10 composants devient automatiquement un processus d’audit en 28 étapes, au lieu de 6.

L’adaptateur Claude Code est disponible (`roleos init` fournit des modèles `.claude/`). Les contrats sont au format Markdown, ce qui permet à tout système de codage de les utiliser. Ce dépôt ne prétend pas qu’un deuxième adaptateur est déjà en fonctionnement.

## Ce qu’il fait

Role OS est la méthode professionnelle pour affecter du personnel au travail des agents de codage. Il prévient les défaillances spécifiques que les flux de travail d’IA génériques produisent :

- **Dérive** : les rôles restent dans leur domaine d’intervention. Le produit ne se redéfinit pas. L’interface utilisateur ne redéfinit pas la portée. Le backend n’invente pas la direction du produit.
- **Achèvement incorrect** : la définition de « terminé » est concrète. Le travail qui masque les lacunes, omet la vérification ou résout un problème différent est rejeté.
- **Contamination** : les projets dérivés ou hérités conservent des éléments d’identité. Role OS détecte et rejette la dérive inter-projets en termes de terminologie, d’éléments visuels et de modèles mentaux.
- **Progrès basé sur les impressions** : chaque transfert est structuré. Chaque verdict est lié à des preuves. « Cela semble terminé » n’est pas un état valide.

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

**L’échelle de repli :**

1. **Mission** : lorsque la tâche correspond à un flux de travail récurrent et éprouvé (correction de bug, traitement, lancement de fonctionnalité, documentation, sécurité, recherche, brainstorming, audit approfondi, test en groupe). Chaîne de rôles connue, flux d’artefacts, branches d’escalade et définitions honnêtes et partielles.
2. **Paquet** : lorsque la tâche appartient à une famille connue, mais ne correspond pas à une mission complète. 10 paquets d’équipe calibrés avec sélection automatique et protections contre les incompatibilités.
3. **Routage libre** : lorsque la tâche est nouvelle, mixte ou incertaine. Évalue tous les 61 rôles par rapport au contenu du paquet et assemble une chaîne dynamique.

Le système ne force jamais le travail à travers une abstraction incorrecte. Il explique pourquoi il a choisi chaque niveau et propose des alternatives.

**Une seule commande pour lancer l’exécution :**

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

**Interventions en cas de problème :**

```bash
roleos retry 0                 # Retry a failed step
roleos reroute 1 "Frontend Developer" "UI bug"  # Swap a role
roleos escalate "Test Engineer" "Repo Researcher" "missed edge case" "re-diagnose"
roleos block 2 "waiting for API spec"
roleos reopen 0 "found issue in review"
```

Les exécutions sont persistantes sur le disque (`.claude/runs/`), de sorte que les sessions interrompues reprennent en douceur. Chaque étape comprend des instructions pour l’opérateur : ce qui doit être produit, les sections requises et les conditions d’arrêt.

**Une fois le routage effectué :**

1. **Chaque rôle produit un transfert** : une sortie structurée avec des éléments de preuve qui réduisent l’ambiguïté pour le rôle suivant.
2. **Un critique examine par rapport au contrat** : accepte, rejette ou bloque en fonction de preuves structurées, et non d’impressions.
3. **Le routage de reprise se fait automatiquement** : le travail bloqué ou rejeté est redirigé vers le résolveur approprié avec une raison, un type de reprise et l’artefact requis.

## Répartition tenant compte du budget

Role OS peut consulter un **analyste de budget de jetons** local pour chaque étape de répartition et joindre une prévision de dépenses indicative au manifeste : optionnel (`ROLEOS_BUDGET_CONSULT`), indicatif (il ne bloque jamais une répartition) et en cas d’échec, il revient à une base de référence déterministe. Désactivé par défaut ; la prévision est locale et gratuite. Voir le [manuel](https://mcp-tool-shop-org.github.io/role-os/handbook/specialist-budget/).

## Supervision des appels d’outils

Role OS vérifie et contrôle les appels d’outils au niveau `PreToolUse`, de manière déterministe, sans modèle sur le chemin critique :

- **Surveillant de conformité** (indicatif, en cas d’échec, il revient à une base de référence) : un schéma déterministe + un seuil de contrat calculable vérifie un appel proposé par rapport à son contrat d’outil catalogué et joint un verdict indicatif sur un appel *manifestement* non conforme ; il ne bloque jamais. Un seuil LLM optionnel (`ROLEOS_CONFORMANCE_CONSULT`) gère les résidus véritablement sémantiques.
- **Contrôle des capacités** (en cas d’échec, optionnel `ROLEOS_CAPABILITY_GATE`, désactivé par défaut) : privilège minimum déterministe sur les actions *irréversibles* (publication sur npm/PyPI, `gh release`, `git push`, modifications du dépôt, déploiement sur Pages). Une action contrôlée est refusée à moins que le directeur n’ait accordé sa capacité dans `.claude/role-os/capabilities.json`, de sorte qu’une étape incorrecte (une erreur honnête ou une action injectée) ne puisse pas déclencher une action irréversible non autorisée. Le complément préventif de la règle du compensateur nommé. Voir le [manuel](https://mcp-tool-shop-org.github.io/role-os/handbook/).

## Dossier de l’équipe

Chaque rôle possède un **dossier** : une fiche de personnage qui sert également de configuration au moment de l’exécution. Six aptitudes (rigueur, rythme, portée, scepticisme, autonomie, franchise) correspondent à de véritables paramètres de répartition ; une couche de **disposition** à huit archétypes (sceptique, constructeur, enquêteur, anticonformiste…) contient une instruction comportementale ; et chaque rôle a un portrait et une note. Parcourez toute l’équipe sous forme de galerie (`dossier/dossier.html`) : le radar de chaque rôle montre sa configuration ajustée par rapport à son idéal canonique.

Lorsqu’un rôle a un dossier, la répartition injecte une **posture opérationnelle** : l’instruction comportementale de la disposition, ainsi qu’une ligne de posture à partir des aptitudes du rôle, de sorte que la fiche configure réellement le rôle. Optionnel et additif : les rôles sans dossier se comportent exactement comme avant. Voir le [manuel](https://mcp-tool-shop-org.github.io/role-os/handbook/crew-dossier/).

## État du déploiement à l’échelle de l’organisation

L’état du déploiement à l’échelle de l’organisation (file d’attente, décisions, enregistrements d’audit, paquets de verrouillage par dépôt) est stocké dans un **dépôt privé** distinct, interne à l’organisation (`role-os-rollout`). Ce dépôt est le produit ; ce dépôt est l’état opérationnel.

## Mémoire et continuité

Role OS ne possède ni ne duplique la couche de mémoire. Lorsqu’un projet de système de mémoire est utilisé, il s’agit du système de continuité canonique : les faits du dépôt, les décisions, les points en suspens et l’historique du traitement y sont stockés.

Role OS s’intègre à ce système lorsqu’il est présent. Il ne le remplace pas.

## Traitement complet et vérification avant déploiement

Le traitement complet est un protocole canonique en 7 phases, défini dans la mémoire du projet en studio (`memory/full-treatment.md`). Role OS gère et examine les traitements à l’aide de contrats de rôle, de transferts et de validations critiques. Il ne redéfinit pas le protocole.

La **vérification avant déploiement** est une série de 31 contrôles de qualité qui s’exécutent avant le traitement complet. Les contrôles critiques A à D doivent être réussis avant le début de tout traitement. Référence canonique : `memory/shipcheck.md`.

Ordre : d’abord la vérification avant déploiement, puis le traitement complet. Aucune version 1.0.0 sans avoir réussi les contrôles critiques.

## Le catalogue de 61 rôles

Le catalogue regroupe ses 61 rôles en 11 familles. (Dispatch utilise un ensemble distinct de 10 « packs d’équipe » : fonctionnalité, correction de bug, sécurité, documentation, lancement, recherche, traitement, audit approfondi, brainstorming, travail collaboratif, qui puisent des rôles dans ces familles.)

| Famille | Rôles |
|--------|-------|
| **Core** (2) | Orchestrateur, critique |
| **Product** (4) | Stratège produit, synthétiseur de commentaires, priorisateur de feuille de route, rédacteur de spécifications |
| **Engineering** (7) | Développeur frontend, ingénieur backend, ingénieur de test, ingénieur de refactoring, ingénieur de performance, auditeur de dépendances, examinateur de sécurité |
| **Design** (2) | Concepteur d’interface utilisateur, gardien de la marque |
| **Marketing** (1) | Rédacteur de textes pour le lancement |
| **Treatment** (7) | Chercheur de dépôt, traducteur de dépôt, architecte de documentation, conservateur de métadonnées, auditeur de couverture, vérificateur de déploiement, ingénieur de publication |
| **Research** (4) | Chercheur UX, analyste concurrentiel, chercheur de tendances, synthétiseur d’entretiens avec les utilisateurs |
| **Growth** (4) | Stratège de lancement, stratège de contenu, gestionnaire de communauté, responsable du tri des demandes d’assistance |
| **Brainstorm** (19) | Explorateur de contexte, explorateur de valeur pour l’utilisateur, explorateur de créativité, explorateur de mécanismes, explorateur de marché, explorateur dissident, explorateur de faisabilité, explorateur de qualité, analyste de contexte, analyste de valeur pour l’utilisateur, analyste de mécanismes, analyste de positionnement, analyste dissident, normalisateur, synthétiseur, développeur de produits, développeur de scénarios, développeur d’avantages concurrentiels, juge |
| **Deep Audit** (4) | Auditeur de composants, auditeur de la vérité des tests, auditeur des points de jonction, synthétiseur d’audit |
| **Swarm** (7) | Coordinateur de travail collaboratif, agent backend de travail collaboratif, agent de liaison de travail collaboratif, agent de tests de travail collaboratif, agent d’infrastructure de travail collaboratif, agent frontend de travail collaboratif, synthétiseur de travail collaboratif |

Chaque rôle dispose d’un contrat complet : mission, cas d’utilisation, cas où il ne doit pas être utilisé, entrées attendues, sorties requises, critères de qualité et déclencheurs d’escalade. Chaque rôle peut être affecté. `roleos route` peut recommander n’importe lequel d’entre eux en fonction du contenu du paquet.

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
- Travail qui peut être réalisé par une seule personne en 5 minutes
- Corrections d’urgence qui doivent être déployées avant la fin de la chaîne de validation
- Projets où vous privilégiez la rapidité par rapport à la structure

## Preuves

Role OS a été testé avec succès dans trois configurations différentes dans deux dépôts structurellement différents :

**Test 001 : travail sur une fonctionnalité** (écran d’équipage, Star Freight)
- Chaîne de 7 rôles, 45 scénarios de test, 0 conflits de rôles
- A empêché la contamination provenant d’un ancêtre de branche, a détecté une invention en ligne et a mis en évidence les blocages réels

**Test 002 : travail d’intégration** (liaison CampaignState, Star Freight)
- Chaîne de 5 rôles, a résolu une jonction architecturale sans faux-semblants
- Les tests anti-faux-semblants ont prouvé que le chemin actif est réel, et non un simple espace réservé

**Test 003 : travail sur l’identité** (purge de la contamination, Star Freight)
- Chaîne de 6 rôles, 51 scénarios de test, y compris une défense durable contre la contamination CI
- A corrigé les dérives de fiction héritées sans entraîner une refonte complète

**Test de portabilité** (cohérence de la persona, sensor-humor)
- Même structure, langage/domaine/pile différents
- Adopté avec seulement des modifications de contexte, sans modifications des contrats principaux

**Traitement complet FT-001** (portlight-desktop)
- Traitement en 7 phases avec des rôles du pack de traitement
- La validation avant déploiement a été prouvée, aucun conflit de rôles

**Traitement complet FT-002** (studioflow)
- Même pack de traitement, dépôt structurellement différent (espace de travail créatif par rapport à un jeu)
- Le pack de traitement est portable, aucune modification du contrat n’est nécessaire

**Session de brainstorming réussie** (sujet du marché MCP)
- Chaîne de 9 rôles, 4 analystes en parallèle, examen croisé + réfutation du graphique des désaccords
- 4 défis lancés, 3 revendications affinées, 1 non résolu : pression saine, pas d’impasse
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

La couverture de ligne mesurée pour cette version est de 90,66 % (22 778/25 123). Le seuil CI reste à 90 %.

## Sécurité

Par défaut, Role OS fonctionne uniquement sur le **système de fichiers local**. Il copie les modèles Markdown et écrit les fichiers de paquet/résultat/exécution dans le répertoire `.claude/` de votre dépôt. Le fonctionnement par défaut n’effectue aucune requête réseau, ne gère aucun secret et ne collecte aucune télémétrie. Aucune opération dangereuse : par défaut, toutes les écritures de fichiers utilisent l’option « ignorer si le fichier existe ».

Trois **fonctionnalités optionnelles** utilisent le réseau lorsque vous les activez explicitement :

- **`roleos verify-citations`** : exécute une commande vers l’outil externe `prism`, qui résout les identifiants de citation par rapport aux API publiques arXiv/Crossref (envoie les ID/URL de citation en cours de vérification).
- **Niveau spécialiste** (`roleos specialist`, rôles enregistrés) : envoie des invites à l’outil `backend_url` que vous configurez dans `.role-os/specialists.json` (généralement un point de terminaison de modèle local).
- **Consultation sur le budget/la conformité** (`ROLEOS_BUDGET_CONSULT` / `ROLEOS_CONFORMANCE_CONSULT`) : envoie le contexte de l’étape/de l’appel d’outil à un modèle local via HTTP pour obtenir un avis.

Les trois sont désactivés par défaut et, en cas d’échec, ils permettent un comportement local déterministe. Voir [SECURITY.md](SECURITY.md) pour connaître l’ensemble de la politique.

## Fiches de recette, jury et calibrage des ensembles

Un critique entraîné n’est aussi bon que les données à partir desquelles il a appris. Role OS enregistre ces données dans une fiche de recette, évalue un groupe de critiques et permet à une exécution terminée d’améliorer le choix de l’ensemble. Aucune de ces opérations n’appelle un modèle. Le même fichier et la même graine produisent les mêmes résultats.

### Fiches de recette

`roleos recipe` vérifie une fiche (`roleos-recipe-card/v1`). Neuf contrôles standard vérifient chacun un aspect qui permet à un critique d’obtenir de bons résultats sans avoir appris l’attribut correspondant. Un contrôle réussi sans mesure est une lacune. Une mesure incohérente est une erreur. `shuffled-labels` doit utiliser la méthode `balanced-permutation`. `same-generator-no-error` : lorsque les deux méthodes d’édition sont enregistrées et que leurs intervalles ne se chevauchent pas, le statut doit être `unresolved`, sinon la vérification échoue. `reversed-correction` réussit uniquement lorsque son intervalle de précision se situe entièrement au-dessus de 0,5.

```bash
roleos recipe check starter-pack/examples/auditor-recipe-card.json
```

Ce fichier est une fiche synthétique remplie, et non un critique entraîné. La vérification affiche :

```
✓ starter-pack/examples/auditor-recipe-card.json (auditor-v1, role Auditor)
  note     controls[2] (shuffled-labels): permutation floor is 1/20; a pass at this floor means the observed result beat every null
  controls 9/9 standard controls passed
  sha256   5763c4dd57fc9f7bea41186493e56b72ce73a5e30f4c5c813248655a360b1588
```

La note est un fait, et non une lacune. `roleos specialist register` prend `--recipe` et associe l’ID et le hachage de la fiche à cette version. Voir le [manuel](https://mcp-tool-shop-org.github.io/role-os/handbook/recipe-cards/).

### Jury

`roleos jury select` conserve un groupe uniquement lorsqu’un intervalle imbriqué et regroupé indique que le groupe surpasse le meilleur critique unique. Sinon, le verdict est que ce critique est le meilleur, ou `insufficient-data`, s’il y a moins de 30 éléments ou 10 groupes. Un critique dont la fiche contient un contrôle standard ayant échoué ou n’ayant pas été résolu est exclu, sauf si `--allow-unproven`. Un critique qui n’a pas de fiche est toujours inclus, sauf si `--require-recipe`. Les scores ne sont jamais inversés. La même graine répète les mêmes résultats.

```bash
roleos jury select starter-pack/examples/jury-validation.json --seed 0
```

Sur ce fichier synthétique, le verdict est `best-single (echo)`. echo et sharp font les mêmes erreurs, de sorte que la cohérence des erreurs est de 1,0000 et les noms des indicateurs les identifient. L’indicateur n’exclut aucun des deux critiques. L’intervalle imbriqué est [-0,1000, 0,0000]. Il touche 0, il ne se situe donc pas entièrement au-dessus de 0, et même avec l’option --out, il n’écrirait aucun fichier de groupe, car l’option --out n’écrit un fichier que pour un verdict de groupe. Le [manuel](https://mcp-tool-shop-org.github.io/role-os/handbook/jury/) contient le rapport complet.

### Calibrage des ensembles

Lorsqu’une exécution se termine, Role OS ajoute une ligne de résultat. Le même ID d’exécution n’écrira pas une deuxième ligne. Après qu’un ensemble a enregistré au moins 5 résultats, chaque exécution terminée avec des corrections de 0 ajoute +0,5 à cet ensemble, avec un maximum de +2. L’amélioration n’associe jamais un ensemble aux mots-clés auxquels il ne correspondait pas déjà. La confiance reste élevée à 3 correspondances de mots-clés et moyenne à 2, en se basant sur le score des mots-clés, et non sur le score amélioré. Les pondérations de Role ne changent pas. Les seuils de confiance ne changent pas. Le rapport de calibrage peut suggérer d’examiner le seuil des mots-clés. Role OS n’applique pas cette suggestion.

`ROLEOS_NO_CALIBRATION=1` désactive l’amélioration. L’enregistrement se poursuit.

```bash
roleos calibration
```

Dans un répertoire sans registre de résultats, cela affiche :

```
no recorded runs yet
```

`roleos route --verbose` et `roleos explain` affichent l’amélioration, le nombre d’exécutions et le taux de réussite lorsque le registre les contient. Voir le [manuel](https://mcp-tool-shop-org.github.io/role-os/handbook/calibration/).

## Le système d’exploitation

| Couche | Ce qu’il fait | Statut |
|-------|-------------|--------|
| **Routing** | Évalue les 61 rôles par rapport au contenu du paquet, explique les recommandations, évalue la confiance | ✓ Publié |
| **Chain builder** | Assemble des chaînes ordonnées par phase à partir des rôles évalués, avec un biais de type de paquet et non verrouillé par un modèle | ✓ Publié |
| **Conflict detection** | Validation en 4 passes : conflits importants, séquence, redondance, lacunes de couverture. Suggestions de correction. | ✓ Publié |
| **Escalation** | Acheminement automatique des tâches bloquées/rejetées/divisées vers le résolveur approprié avec la raison et l’artefact requis | ✓ Publié |
| **Evidence** | Preuves structurées conscientes du rôle dans les verdicts. Vérifications de suffisance. 12 types de preuves. | ✓ Publié |
| **Dispatch** | Génère des manifestes d’exécution pour le harnais d’agent de codage. Profils d’outils par rôle, invites système, budgets. | ✓ Publié |
| **Trials** | Ensemble complet prouvé : 30/30 tâches d’or + 5/5 essais négatifs. 7 essais d’ensemble terminés. | ✓ Terminé |
| **Team Packs** | 10 ensembles calibrés avec sélection automatique, protections contre les incohérences et repli d’acheminement libre. | ✓ Publié |
| **Recipe cards** | La recette de données d’un rôle entraîné. Neuf contrôles standard, une mesure pour chaque contrôle réussi et un hachage canonique. | ✓ Publié |
| **Jury** | Évalue les critiques entraînés. Conserve un groupe uniquement lorsqu’il surpasse le meilleur critique unique sur des groupes mis de côté. Les contrôles de recette ayant échoué ou n’ayant pas été résolus excluent un critique. | ✓ Publié |
| **Outcome calibration** | Enregistre un résultat lorsqu’une exécution se termine. Après 5 résultats, une exécution réussie améliore un ensemble aux mots-clés auxquels il correspondait déjà (+0,5 chacun, avec un maximum de +2). La confiance provient toujours du score des mots-clés. Les pondérations de Role et les seuils de confiance ne changent pas. | ✓ Publié |
| **Mixed-task decomposition** | Détecte les tâches composites, les divise en paquets enfants, attribue des ensembles et conserve les dépendances. | ✓ Publié |
| **Composite execution** | Exécute les paquets enfants dans l’ordre des dépendances, avec passage d’artefacts, récupération de branche et synthèse. | ✓ Publié |
| **Adaptive replanning** | Les modifications de portée, les découvertes ou les nouvelles exigences en cours d’exécution mettent à jour le plan sans redémarrer. | ✓ Publié |
| **Session spine** | `roleos init claude` crée les fichiers CLAUDE.md, /roleos-route, /roleos-review, /roleos-status. `roleos doctor` vérifie le câblage. Les fiches de routage prouvent l’engagement. | ✓ Publié |
| **Hook spine** | 5 hooks de cycle de vie (SessionStart, PromptSubmit, PreToolUse, SubagentStart, Stop). Application consultative : rappels de fiche de routage, verrouillage de l’outil d’écriture, injection du rôle de sous-agent, audit de l’exécution. | ✓ Publié |
| **Artifact spine** | Contrats d’artefacts par rôle. Contrats de transfert d’ensemble. Validation structurelle. Vérifications de l’exhaustivité de la chaîne. Les rôles en aval ne devinent jamais ce qu’ils ont reçu. | ✓ Publié |
| **Mission library** | 9 missions nommées (feature-ship, bugfix, treatment, docs-release, security-hardening, research-launch, brainstorm, deep-audit, dogfood-swarm). Chacune déclare un ensemble, une chaîne de rôles, un flux d’artefacts, des branches d’escalade et une définition honnête et partielle. | ✓ Publié |
| **Mission runner** | Exécutez des tâches, parcourez-les étape par étape en suivant l’état, terminez/échouez avec un rapport honnête. Propagation des étapes bloquées, avertissements d’escalade hors chaîne, réouverture de la dernière étape. | ✓ Publié |
| **Unified entry** | `roleos start` détermine automatiquement si la tâche est une mission, une tâche de groupe ou une tâche libre. Échelle de repli avec des scores de confiance, des alternatives et une détection composite. | ✓ Publié |
| **Persistent runs** | `roleos run` crée des tâches sauvegardées sur disque. `resume`, `next`, `explain`, `complete`, `fail`. Interventions : redirection, escalade, nouvelle tentative, blocage, réouverture. Guide spécifique à chaque étape. Mesure du frottement. | ✓ Publié |
| **Brainstorm** | Architecture à deux couches : vérité (schémas natifs de rôle, atomes de provenance, graphe de contestation croisée) + rendu (5 voix distinctes, interdictions lexicales, transcription du débat). Les liens de traçabilité prouvent que chaque affirmation rendue correspond à un atome de vérité. Exécution réussie vérifiée. | ✓ Publié |
| **Deep Audit** | Audit de dépôt à l’échelle du manifeste : décomposer le dépôt en composants, affecter N auditeurs + M auditeurs de vérification de la vérité + K auditeurs de jonction à partir du graphe de dépendances, synthétiser en un verdict classé et un plan d’action. Affectation dynamique qui s’adapte à la taille du dépôt (formule 2N + K + 3). Natif de l’exécuteur avec validation des artefacts à chaque étape. | ✓ Publié |
| **Dogfood Swarm** | Convergence multi-passe : trois étapes de vérification (bogues/sécurité → proactif → humanisation), puis étape des fonctionnalités. Propriété exclusive des fichiers, barrières de construction après chaque vague, points de contrôle utilisateur. La détection automatique du domaine génère des manifestes. Pont de preuve vers les laboratoires de test. | ✓ Publié |

## 9 missions

| Mission | Tâche de groupe | Rôles | Quand l’utiliser |
|---------|------|-------|-------------|
| `feature-ship` | Fonctionnalité | 5 | Livraison complète d’une fonctionnalité : portée → spécification → implémentation → test → révision |
| `bugfix` | Correction de bogue | 4 | Diagnostiquer la cause première, corriger, tester, vérifier |
| `treatment` | Traitement | 4 | Vérification avant publication + amélioration + documentation + vérification CI + révision |
| `docs-release` | Documentation | 2 | Rédiger/mettre à jour la documentation, notes de publication |
| `security-hardening` | Sécurité | 4 | Modèle de menace, audit, correction des vulnérabilités, réaudit, vérification |
| `research-launch` | Recherche | 4 | Formuler la question, effectuer des recherches, documenter les résultats, décider |
| `brainstorm` | Brainstorming | 9 | Enquête structurée et multiperspective avec désaccord et verdict traçables |
| `deep-audit` | Audit approfondi | 5 (échelles) | Audit de dépôt basé sur un manifeste : le nombre de travailleurs s’adapte à la taille du graphe du dépôt via une affectation dynamique |
| `dogfood-swarm` | Essaim | 8 (échelles) | Convergence multi-passe : santé-a → santé-b → santé-c → fonctionnalité → synthèse finale |

Chaque mission comprend des définitions honnêtes et partielles : lorsque le travail est interrompu, le système documente ce qui a été accompli et ce qui reste à faire au lieu de prétendre que tout est terminé.

### Mission de brainstorming

Ce n’est pas un « brainstorming par IA ». La mission de brainstorming consiste en des **rôles spécialisés encadrés par la loi, avec un désaccord et un résultat traçables.**

```bash
roleos run "explore product directions for a developer tool discovery platform"
# → MISSION: Brainstorm (Structured Inquiry)
#   Chain: 4 Analysts (parallel) → Normalize → Cross-Examine → Rebut → Synthesize → Expand → Judge
```

**Ce qui la rend différente :**

- **Couche 1 (vérité) :** quatre analystes émettent des schémas natifs de rôle (ContextMap, UserValueMap, MechanicsMap, PositioningMap) : pas de prose partagée. Chaque rôle applique une restriction pour éviter les angles morts : phrases interdites, types d’affirmations interdits, partitions d’entrée filtrées. Les atomes contiennent des informations sur leur provenance. Un graphe de contre-interrogatoire dirigé produit des défis ciblés. Les analystes d’origine défendent, affinent ou rétractent leurs affirmations sous la pression.

- **Couche 2 (rendu) :** cinq voix humaines distinctes (Boundary Memo, Field Notes, System Sketch, Claim Brief, Cross-Exam Transcript) avec des interdictions lexicales empêchant la convergence des voix. La synthèse utilise la vérité, jamais la prose rendue. Les deux couches sont toujours disponibles.

- **Chaîne de traçabilité :** chaque phrase rendue remonte à un atome de la couche de vérité. Les directions de synthèse citent les atomes. Les cibles du contre-interrogatoire sont des identifiants d’affirmations réels. Le graphe de contestation est le produit, et non la prose.

**Prouvé :** Exécution réussie v0.4 : chaîne de traçabilité complète vérifiée. Voir [`examples/golden-run.md`](examples/golden-run.md) pour la chaîne d’artefacts complète.

### Mission d’audit approfondi

Ce n’est pas un simple scan de surface. La mission d’audit approfondi **décompose un dépôt en composants délimités et affecte des auditeurs spécialisés à une échelle déterminée par le propre graphe de dépendances du dépôt.**

```bash
roleos run "deep audit this repo" --manifest=audit-manifest.json
# → MISSION: Deep Audit (Manifest-Scaled)
#   Steps: Component Auditor ×6 + Test Truth Auditor ×6 + Seam Auditor ×8 + Synthesizer + Action Plan + Critic = 23 steps
```

**Ce qui la rend différente :**

- **Affectation dynamique** : le nombre de travailleurs n’est pas fixe. Un dépôt de 10 composants avec 5 clusters de limites produit 28 étapes (2 × 10 + 5 + 3). Un dépôt de 3 composants en produit 12. La formule de mise à l’échelle est `2N + K + 3`, où N = composants, K = limites.
- **Parcelles basées sur un manifeste** : un `audit-manifest.json` définit les composants (avec les chemins de fichiers, le nombre de lignes, les descriptions) et les limites (de/à avec les descriptions de l’interface). Chaque auditeur ne reçoit que sa parcelle.
- **Quatre archétypes de rôle** : auditeur de composants (vérité du code par module), auditeur de vérification de la vérité (tests qui prouvent par rapport aux tests qui existent), auditeur de jonction (limites d’intégration à partir du graphe de dépendances), synthétiseur d’audit (verdict classé + plan d’action à partir de toutes les parcelles).
- **Validation des artefacts à chaque étape** : `validateArtifact()` se déclenche à la fin de chaque étape dans les deux chemins d’exécution. Les résultats sont joints aux objets d’étape. Le système sait si chaque artefact a respecté son contrat.
- **Honnêteté partielle** : lorsque le budget ou la portée empêchent l’achèvement, les résultats par composant sont valides individuellement. Le système synthétise à partir de ce qui a été achevé, sans jamais prétendre qu’il y a une couverture complète.

**Prouvé :** Exécution de preuve native de l’exécuteur : 18 tests sur un manifeste réel, cycle de vie complet vérifié, y compris la réouverture de l’escalade et l’échec partiel. La formule de mise à l’échelle a été vérifiée pour les manifestes de 3/6/10/15 composants.

### Mission d’essaim de test interne

Ce n’est pas un simple analyseur en une seule passe. La mission d’essaim de test interne **exécute un protocole de convergence multi-passe qui fait passer un dépôt de « fonctionnel » à « prêt pour la production » en trois étapes de vérification et une livraison itérative des fonctionnalités.**

```bash
roleos swarm
# → MISSION: Dogfood Swarm (Multi-Pass Convergence)
#   Stages: Health-A → Health-B → Health-C → Feature → Final
#   Domain agents: 3-5 parallel per wave (exclusive file ownership)
```

**Ce qui la rend différente :**

- **Processus de validation en trois étapes** — L’étape A corrige les bogues et les problèmes de sécurité (boucle jusqu’à 0 CRITICAL + 0 HIGH). L’étape B applique un renforcement proactif (les utilisateurs examinent les résultats). L’étape C humanise le code — messages d’erreur qui aident les utilisateurs, commentaires sur la reconnexion, états de chargement, accessibilité. Chaque étape est une approche distincte, et non la même analyse répétée.
- **Propriété exclusive des fichiers** — chaque agent de domaine possède des fichiers spécifiques via `swarm-manifest.json`. Aucun agent n’édite le même fichier. Pas de conflits de fusion. Pas de surcharge de coordination.
- **Contrôles de validation** — l’analyse statique, la vérification des types et les tests doivent être réussis après chaque cycle. Le système détecte automatiquement le système de construction (Node, Rust, Python, Go) et exécute les commandes appropriées.
- **Points de contrôle utilisateur** — Health-B et le processus de validation des fonctionnalités nécessitent l’approbation explicite de l’utilisateur avant l’exécution. Le système présente les résultats, et l’utilisateur décide de ce qui doit être construit.
- **Convergence itérative** — les étapes sont répétées en cycles jusqu’à ce que les conditions de sortie soient remplies ou que le nombre maximal d’itérations soit atteint. Chaque cycle réévalue à partir de zéro afin de détecter les régressions introduites par les corrections précédentes.
- **Détection automatique du domaine** — `roleos swarm manifest --generate` détecte le type de dépôt (CLI, web, bureau, MCP, monorepo) et génère des affectations de domaine non superposées.

**Résultats prouvés :** claude-collaborate (2026-03-28) — 35 → 129 tests, 106 problèmes de validation corrigés, version 1.1.0 publiée. Protocole v2.0 avec 9 phases.

## Statut

Stable et prêt à être déployé. Consultez le [JOURNAL DES MODIFICATIONS](CHANGELOG.md) pour obtenir l’historique complet des versions et les modifications apportées à chaque version.

## Licence

MIT

---

Créé par <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a>
