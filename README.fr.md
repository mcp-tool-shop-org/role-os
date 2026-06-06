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

Un système d’exploitation multi-Claude qui affecte du personnel, dirige, valide et exécute des tâches à travers 61 contrats de rôles spécialisés. Il crée des paquets de tâches, assemble l’équipe appropriée en fonction de critères de correspondance de rôles, détecte les problèmes avant l’exécution, redirige automatiquement les tâches en cas de blocage ou de rejet, et exige des preuves structurées pour chaque décision. Il inclut une répartition dynamique pour les missions à grande échelle — un dépôt de 10 composants devient automatiquement 28 étapes d’audit, au lieu de 6.

## Ce qu’il fait

Role OS est la méthode professionnelle pour utiliser multi-Claude. Il prévient les défaillances spécifiques que les flux de travail d’IA génériques produisent :

- **Dérive** — les rôles restent dans leur domaine d’intervention. Le produit ne se redéfinit pas. L’interface ne redéfinit pas la portée. Le backend n’invente pas la direction du produit.
- **Achèvement incorrect** — la définition de « terminé » est concrète. Les tâches qui masquent des lacunes, omettent la vérification ou résolvent un problème différent sont rejetées.
- **Contamination** — les projets dérivés ou hérités conservent des éléments d’identité. Role OS détecte et rejette la dérive inter-projets en termes de terminologie, d’éléments visuels et de modèles mentaux.
- **Progrès basé sur des impressions** — chaque transfert est structuré. Chaque décision est liée à des preuves. « Cela semble terminé » n’est pas un état valide.

## Comment il fonctionne

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

1. **Mission** — lorsque la tâche correspond à un flux de travail récurrent et éprouvé (correction de bug, traitement, lancement de fonctionnalité, documentation, sécurité, recherche, brainstorming, audit approfondi, test en conditions réelles). Chaîne de rôles connue, flux d’artefacts, branches d’escalade et définitions honnêtes et partielles.
2. **Paquet** — lorsque la tâche appartient à une famille connue, mais ne correspond pas à une mission complète. 10 paquets d’équipe calibrés avec sélection automatique et protections contre les incompatibilités.
3. **Routage libre** — lorsque la tâche est nouvelle, mixte ou incertaine. Il évalue les 61 rôles en fonction du contenu du paquet et assemble une chaîne dynamique.

Le système ne force jamais une tâche à passer par une abstraction incorrecte. Il explique pourquoi il a choisi chaque niveau et propose des alternatives.

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

Les exécutions sont conservées sur le disque (`.claude/runs/`), de sorte que les sessions interrompues reprennent en douceur. Chaque étape comprend des instructions pour l’opérateur : ce qui doit être produit, les sections requises et les conditions d’arrêt.

**Une fois la tâche routée :**

1. **Chaque rôle produit un transfert** — une sortie structurée avec des éléments de preuve qui réduisent l’ambiguïté pour le rôle suivant.
2. **Un critique examine par rapport au contrat** — accepte, rejette ou bloque en fonction de preuves structurées, et non d’une simple impression.
3. **Le routage de reprise se fait automatiquement** — les tâches bloquées ou rejetées sont redirigées vers le bon responsable avec une raison, un type de reprise et l’artefact requis.

## Répartition tenant compte du budget

Role OS peut consulter un **analyste de budget de jetons** local pour chaque étape de répartition et joindre une prévision de dépenses indicative au manifeste — optionnel (`ROLEOS_BUDGET_CONSULT`), à titre indicatif (il ne bloque jamais une répartition) et, en cas d’échec, il revient à une base de référence déterministe. Désactivé par défaut ; la prévision est locale et gratuite. Voir le [manuel](https://mcp-tool-shop-org.github.io/role-os/handbook/specialist-budget/).

## État du déploiement à l’échelle de l’organisation

L’état du déploiement à l’échelle de l’organisation (file d’attente, décisions, enregistrements d’audit, paquets de verrouillage par dépôt) est stocké dans un dépôt privé distinct : [`role-os-rollout`](https://github.com/mcp-tool-shop-org/role-os-rollout). Ce dépôt est le produit ; ce dépôt est l’état opérationnel.

## Mémoire et continuité

Role OS ne possède ni ne duplique la couche de mémoire. Là où la mémoire du projet Claude existe, c’est le système de continuité canonique — les faits du dépôt, les décisions, les points en suspens et l’historique du traitement s’y trouvent.

Role OS s’intègre à la mémoire du projet Claude. Il ne la remplace pas.

## Traitement complet et vérification avant lancement

Le traitement complet est un protocole canonique en 7 phases défini dans la mémoire du projet Claude (`memory/full-treatment.md`). Role OS route et examine les traitements à l’aide de contrats de rôles, de transferts et de contrôles — il ne redéfinit pas le protocole.

La **vérification avant lancement** est le contrôle de qualité en 31 étapes qui s’exécute avant le traitement complet. Les contrôles stricts A à D doivent être réussis avant le début de tout traitement. Référence canonique : `memory/shipcheck.md`.

Ordre : vérification avant lancement d’abord, puis traitement complet. Pas de version 1.0.0 sans avoir réussi les contrôles stricts.

## 61 rôles répartis en 10 paquets

| Paquet | Rôles |
|------|-------|
| **Core** (3) | Orchestrateur, stratège produit, critique |
| **Engineering** (7) | Développeur frontend, ingénieur backend, ingénieur de test, ingénieur de refactorisation, ingénieur de performance, auditeur de dépendances, examinateur de sécurité |
| **Design** (2) | Concepteur d’interface utilisateur, gardien de la marque |
| **Marketing** (1) | Rédacteur de contenu de lancement |
| **Treatment** (7) | Chercheur de dépôt, traducteur de dépôt, architecte de documentation, conservateur de métadonnées, auditeur de couverture, vérificateur de déploiement, ingénieur de publication |
| **Product** (3) | Synthétiseur de commentaires, priorisateur de feuille de route, rédacteur de spécifications |
| **Research** (4) | Chercheur UX, analyste concurrentiel, chercheur de tendances, synthétiseur d’entretiens avec les utilisateurs |
| **Growth** (4) | Stratège de lancement, stratège de contenu, responsable de la communauté, responsable du triage du support |
| **Deep Audit** (4) | Auditeur de composants, auditeur de la vérité des tests, auditeur des interfaces, synthétiseur d’audit |
| **Swarm** (7) | Coordinateur de l’équipe, agent backend de l’équipe, agent de liaison de l’équipe, agent de tests de l’équipe, agent d’infrastructure de l’équipe, agent frontend de l’équipe, synthétiseur de l’équipe |

Chaque rôle dispose d’un contrat complet : mission, quand l’utiliser, quand ne pas l’utiliser, entrées attendues, sorties requises, norme de qualité et déclencheurs d’escalade. Chaque rôle peut être affecté — `roleos route` peut en recommander l’un ou l’autre en fonction du contenu du paquet.

## Démarrage rapide

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

## Quand ne pas utiliser Role OS

- Corrections ponctuelles, fautes de frappe ou bogues évidents
- Recherche exploratoire sans résultat défini
- Travail qui tient dans l’esprit d’une seule personne en 5 minutes
- Corrections d’urgence qui doivent être déployées avant la fin du processus de révision
- Projets où la rapidité est plus importante que la structure

## Preuves

Role OS a été testé avec trois configurations différentes dans deux référentiels structurellement distincts :

**Test 001 — Travail sur une fonctionnalité** (écran de l’équipe, Star Freight)
- Chaîne de 7 rôles, 45 scénarios de test, 0 conflits de rôles
- Empêche la contamination provenant d’une branche ancestrale, détecte les inventions en ligne, met en évidence les obstacles réels

**Test 002 — Travail d’intégration** (liaison CampaignState, Star Freight)
- Chaîne de 5 rôles, résolution d’une discontinuité architecturale sans recours à des solutions de contournement
- Les tests anti-contournement prouvent que le chemin actif est réel, et non un simple espace réservé

**Test 003 — Travail sur l’identité** (purge de la contamination, Star Freight)
- Chaîne de 6 rôles, 51 scénarios de test, y compris une défense durable contre la contamination dans l’environnement CI
- Correction des dérives héritées sans entraîner une refonte complète

**Test de portabilité** (cohérence de la persona, humour basé sur les capteurs)
- Même structure de base, langage/domaine/pile technologique différents
- Adapté avec des modifications contextuelles uniquement, sans modifications du contrat de base

**Traitement complet FT-001** (portlight-desktop)
- Traitement en 7 phases avec les rôles du « Treatment Pack »
- La validation du « Shipcheck » a été prouvée, aucun conflit de rôles

**Traitement complet FT-002** (studioflow)
- Même « Treatment Pack », référentiel structurellement différent (espace de travail créatif par rapport à un jeu)
- Le « Treatment Pack » est portable, aucune modification du contrat n’est nécessaire

**Session de brainstorming réussie** (sujet du marché MCP)
- Chaîne de 9 rôles, 4 analystes en parallèle, examen croisé + réfutation du graphique des litiges
- 4 défis lancés, 3 revendications affinées, 1 non résolue — une pression saine, pas d’impasse
- Plus de 16 liens de traçabilité à partir des artefacts rendus vers les atomes de la couche de vérité
- Chaîne de traçabilité complète prouvée : vérité → atomes → litige → synthèse → expansion → jugement → rendu → traçabilité

## Propriétés essentielles

Elles sont non négociables. Si une modification affaiblit l’une d’entre elles, rejetez-la.

- Les limites des rôles sont respectées
- La révision est rigoureuse
- L’escalade reste honnête
- Les paquets restent testables
- La portabilité nécessite une adaptation contextuelle, et non une chirurgie du cœur

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

## Sécurité

Role OS fonctionne **uniquement en local**. Il copie les modèles Markdown et écrit les fichiers de paquets/décisions dans le répertoire `.claude/` de votre référentiel. Il n’accède pas au réseau, ne gère pas les secrets et ne collecte pas de données de télémétrie. Aucune opération dangereuse — par défaut, toutes les écritures de fichiers utilisent l’option « skip-if-exists ». Voir [SECURITY.md](SECURITY.md) pour la politique complète.

## Le système d’exploitation

| Couche | Ce qu’il fait | Statut |
|-------|-------------|--------|
| **Routing** | Attribue un score à chacun des 61 rôles en fonction du contenu du paquet, explique les recommandations et évalue la confiance | ✓ Déployé |
| **Chain builder** | Assemble des chaînes ordonnées par phase à partir des rôles notés, en privilégiant le type de paquet plutôt qu’en se limitant aux modèles | ✓ Déployé |
| **Conflict detection** | Validation en 4 passes : conflits importants, séquence, redondance, lacunes de couverture. Suggestions de correction. | ✓ Déployé |
| **Escalation** | Acheminement automatique du travail bloqué/rejeté/divisé vers le bon résolveur avec la raison et l’artefact requis | ✓ Déployé |
| **Evidence** | Preuves structurées et spécifiques aux rôles dans les décisions. Vérifications de suffisance. 12 types de preuves. | ✓ Déployé |
| **Dispatch** | Génère des manifestes d’exécution pour multi-claude. Profils d’outils par rôle, invites système, budgets. | ✓ Déployé |
| **Trials** | Ensemble complet prouvé : 30 tâches « or » + 5 tests négatifs. 7 tests de paquets terminés. | ✓ Terminé |
| **Team Packs** | 10 paquets calibrés avec sélection automatique, protections contre les incompatibilités et solution de repli à routage libre. | ✓ Déployé |
| **Outcome calibration** | Enregistre les résultats de l’exécution, ajuste les pondérations des paquets/rôles en fonction des résultats et modifie les seuils de confiance. | ✓ Déployé |
| **Mixed-task decomposition** | Détecte le travail composite, le divise en paquets enfants, assigne des paquets et conserve les dépendances. | ✓ Déployé |
| **Composite execution** | Exécute les paquets enfants dans l’ordre des dépendances, avec transfert d’artefacts, récupération des branches et synthèse. | ✓ Déployé |
| **Adaptive replanning** | Les modifications de portée, les découvertes ou les nouvelles exigences en cours d’exécution mettent à jour le plan sans redémarrer. | ✓ Déployé |
| **Session spine** | `roleos init claude` crée les fichiers CLAUDE.md, /roleos-route, /roleos-review, /roleos-status. `roleos doctor` vérifie la configuration. Les cartes de routage prouvent l’engagement. | ✓ Déployé |
| **Hook spine** | 5 hooks de cycle de vie (SessionStart, PromptSubmit, PreToolUse, SubagentStart, Stop). Application consultative : rappels de la carte de routage, validation de l’utilisation des outils, injection du rôle du sous-agent, audit de l’achèvement. | ✓ Déployé |
| **Artifact spine** | Contrats d’artefacts par rôle. Contrats de transfert de paquets. Validation structurelle. Vérifications de l’exhaustivité de la chaîne. Les rôles en aval ne devinent jamais ce qu’ils ont reçu. | ✓ Déployé |
| **Mission library** | 9 missions nommées (feature-ship, bugfix, treatment, docs-release, security-hardening, research-launch, brainstorm, deep-audit, dogfood-swarm). Chacune déclare le paquet, la chaîne de rôles, le flux d’artefacts, les branches d’escalade et une définition honnête et partielle. | ✓ Déployé |
| **Mission runner** | Créer des exécutions, parcourir les étapes avec un état suivi, terminer/échouer avec un rapport honnête. Propagation des étapes bloquées, avertissements d’escalade hors chaîne, réouverture de la dernière étape. | ✓ Déployé |
| **Unified entry** | `roleos start` décide automatiquement de la mission, du paquet ou du routage libre. Échelle de repli avec des scores de confiance, des alternatives et une détection composite. | ✓ Déployé |
| **Persistent runs** | `roleos run` crée des exécutions stockées sur disque. `resume`, `next`, `explain`, `complete`, `fail`. Interventions : reroutage, escalade, nouvelle tentative, blocage, réouverture. Guide spécifique à chaque étape. Mesure du frottement. | ✓ Déployé |
| **Brainstorm** | Architecture à deux couches : vérité (schémas natifs des rôles, atomes de provenance, graphique des litiges d’examen croisé) + rendu (5 voix distinctes, interdictions lexicales, transcription du débat). Les liens de traçabilité prouvent que chaque revendication rendue correspond à un atome de vérité. Session réussie prouvée. | ✓ Déployé |
| **Deep Audit** | Audit de dépôt basé sur le manifeste : décomposer le dépôt en composants, affecter N auditeurs + M auditeurs de tests de validation + K auditeurs de points de jonction à partir du graphe de dépendances, synthétiser en un verdict classé et un plan d’action. L’affectation dynamique s’adapte à la taille du dépôt (formule : 2N + K + 3). Exécution native avec validation des artefacts à chaque étape. | ✓ Déployé |
| **Dogfood Swarm** | Convergence en plusieurs étapes : trois étapes de vérification (bogues/sécurité → proactivité → humanisation), puis étape des fonctionnalités. Propriété exclusive des fichiers, validations après chaque cycle, points de contrôle utilisateur. La détection automatique du domaine génère les manifestes. Pont de preuves vers les laboratoires de test. | ✓ Déployé |

## 9 missions

| Mission | Paquet | Rôles | Quand l’utiliser |
|---------|------|-------|-------------|
| `feature-ship` | Fonctionnalité | 5 | Livraison complète d’une fonctionnalité : portée → spécification → implémentation → test → revue |
| `bugfix` | Correction de bogue | 4 | Diagnostiquer la cause première, corriger, tester, vérifier |
| `treatment` | Traitement | 4 | Vérification avant publication + amélioration + documentation + vérification CI + revue |
| `docs-release` | Documentation | 2 | Rédiger/mettre à jour la documentation, notes de publication |
| `security-hardening` | Sécurité | 4 | Modèle de menace, audit, correction des vulnérabilités, réaudit, vérification |
| `research-launch` | Recherche | 4 | Formuler la question, effectuer des recherches, documenter les résultats, prendre une décision |
| `brainstorm` | Brainstorming | 9 | Analyse structurée et multiperspective avec désaccord et verdict traçables |
| `deep-audit` | Audit approfondi | 5 (échelles) | Audit de dépôt basé sur le manifeste : le nombre de travailleurs s’adapte à la taille du graphe du dépôt via une affectation dynamique |
| `dogfood-swarm` | Essaim | 8 (échelles) | Convergence en plusieurs étapes : vérification-a → vérification-b → vérification-c → fonctionnalité → synthèse finale |

Chaque mission comprend des définitions honnêtes et partielles : lorsque le travail est interrompu, le système documente ce qui a été réalisé et ce qui reste à faire, au lieu de prétendre que tout est terminé.

### Mission de brainstorming

Pas de « brainstorming par IA ». La mission de brainstorming consiste en des **rôles spécialisés encadrés par la loi, avec un désaccord et un résultat traçables.**

```bash
roleos run "explore product directions for a developer tool discovery platform"
# → MISSION: Brainstorm (Structured Inquiry)
#   Chain: 4 Analysts (parallel) → Normalize → Cross-Examine → Rebut → Synthesize → Expand → Judge
```

**Ce qui la rend différente :**

- **Niveau 1 (vérité) :** Quatre analystes émettent des schémas propres à leur rôle (ContextMap, UserValueMap, MechanicsMap, PositioningMap) : pas de texte partagé. Chaque rôle applique des restrictions : phrases interdites, types de revendications interdits, partitions d’entrée filtrées. Les atomes contiennent des informations sur leur provenance. Un graphe d’interrogation croisée dirigé produit des défis ciblés. Les analystes d’origine défendent, affinent ou retirent leurs affirmations sous la pression.

- **Niveau 2 (présentation) :** Cinq voix humaines distinctes (Note de synthèse, Notes de terrain, Schéma du système, Résumé des revendications, Transcription de l’interrogatoire) avec des interdictions lexicales empêchant la convergence des voix. La synthèse utilise la vérité, jamais le texte déjà présenté. Les deux niveaux sont toujours disponibles.

- **Chaîne de traçabilité :** Chaque phrase présentée peut être retracée jusqu’à un atome du niveau de vérité. Les directions de synthèse citent les atomes. Les cibles de l’interrogatoire sont des identifiants de revendications réels. Le graphe de désaccord est le résultat, et non le texte.

**Prouvé :** Exécution de référence v0.4 : chaîne de traçabilité complète vérifiée. Voir [`examples/golden-run.md`](examples/golden-run.md) pour la chaîne d’artefacts complète.

### Mission d’audit approfondi

Pas un simple scan de surface. La mission d’audit approfondi **décompose un dépôt en composants délimités et affecte des auditeurs spécialisés à une échelle déterminée par le propre graphe de dépendances du dépôt.**

```bash
roleos run "deep audit this repo" --manifest=audit-manifest.json
# → MISSION: Deep Audit (Manifest-Scaled)
#   Steps: Component Auditor ×6 + Test Truth Auditor ×6 + Seam Auditor ×8 + Synthesizer + Action Plan + Critic = 23 steps
```

**Ce qui la rend différente :**

- **Affectation dynamique :** le nombre de travailleurs n’est pas fixe. Un dépôt de 10 composants avec 5 clusters de limites produit 28 étapes (2 × 10 + 5 + 3). Un dépôt de 3 composants produit 12 étapes. La formule d’adaptation est : `2N + K + 3`, où N = composants, K = limites.
- **Parcelles basées sur le manifeste :** un fichier `audit-manifest.json` définit les composants (avec les chemins de fichiers, le nombre de lignes, les descriptions) et les limites (de/à avec les descriptions de l’interface). Chaque auditeur ne reçoit que sa parcelle.
- **Quatre archétypes de rôles :** Auditeur de composants (vérité du code par module), Auditeur de tests de validation (tests qui prouvent par rapport aux tests qui existent), Auditeur de points de jonction (limites d’intégration du graphe de dépendances), Synthétiseur d’audit (verdict classé + plan d’action à partir de toutes les parcelles).
- **Validation des artefacts à chaque étape :** `validateArtifact()` est déclenché à la fin de chaque étape dans les deux chemins d’exécution. Les résultats sont joints aux objets d’étape. Le système sait si chaque artefact a respecté son contrat.
- **Honnêteté partielle :** lorsque le budget ou la portée empêchent l’achèvement, les résultats par composant sont valides individuellement. Le système synthétise à partir de ce qui a été réalisé, sans jamais prétendre à une couverture complète.

**Prouvé :** Exécution native du Runner : 18 tests sur un manifeste réel, cycle de vie complet vérifié, y compris la réouverture en cas d’escalade et l’échec partiel. La formule d’adaptation a été vérifiée pour les manifestes de 3/6/10/15 composants.

### Mission d’essaim de test en interne

Pas un simple analyseur en une seule passe. La mission d’essaim de test en interne **exécute un protocole de convergence en plusieurs étapes qui fait passer un dépôt de « fonctionnel » à « prêt pour la production » en trois étapes de vérification et en livrant des fonctionnalités de manière itérative.**

```bash
roleos swarm
# → MISSION: Dogfood Swarm (Multi-Pass Convergence)
#   Stages: Health-A → Health-B → Health-C → Feature → Final
#   Domain agents: 3-5 parallel per wave (exclusive file ownership)
```

**Ce qui la rend différente :**

- **Système de validation en trois étapes** — L’étape A corrige les bogues et les problèmes de sécurité (boucle jusqu’à 0 CRITICAL + 0 HIGH). L’étape B applique un renforcement proactif (les utilisateurs examinent les résultats). L’étape C rend le code plus convivial — messages d’erreur qui aident les utilisateurs, commentaires sur la reconnexion, états de chargement, accessibilité. Chaque étape est une approche distincte, et non la même analyse répétée.
- **Propriété exclusive des fichiers** — chaque agent de domaine possède des fichiers spécifiques via `swarm-manifest.json`. Aucun agent ne modifie le même fichier. Pas de conflits de fusion. Pas de surcharge de coordination.
- **Contrôles de construction** — l’analyse statique, la vérification des types et les tests doivent être réussis après chaque cycle. Le système détecte automatiquement le système de construction (Node, Rust, Python, Go) et exécute les commandes appropriées.
- **Points de contrôle utilisateur** — Health-B et la validation des fonctionnalités nécessitent l’approbation explicite de l’utilisateur avant l’exécution. Le système présente les résultats, et l’utilisateur décide de ce qui doit être construit.
- **Convergence itérative** — les étapes sont répétées en cycles jusqu’à ce que les conditions de sortie soient remplies ou que le nombre maximal d’itérations soit atteint. Chaque cycle réévalue tout à partir de zéro afin de détecter les régressions introduites par les corrections précédentes.
- **Détection automatique du domaine** — `roleos swarm manifest --generate` détecte le type de dépôt (CLI, web, bureau, MCP, monorepo) et génère des affectations de domaine non superposées.

**Résultats prouvés :** claude-collaborate (2026-03-28) — 35→129 tests, 106 problèmes de validation corrigés, version v1.1.0 publiée. Protocole v2.0 avec 9 phases.

## Statut

Stable et prêt à être déployé. Consultez le fichier [CHANGELOG](CHANGELOG.md) pour obtenir l’historique complet des versions et les modifications apportées à chaque version.

## Licence

MIT

---

Créé par <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a>
