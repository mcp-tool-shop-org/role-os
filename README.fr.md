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

Un système d'exploitation multi-Claude qui affecte du personnel, gère les flux de travail, valide et exécute les tâches à travers 31 contrats de rôles spécialisés. Il crée des ensembles de tâches, assemble l'équipe appropriée en fonction de la compatibilité des rôles, détecte les problèmes potentiels avant l'exécution, redirige automatiquement la reprise en cas de blocage ou de rejet des tâches, et exige des preuves structurées pour chaque décision.

## Ce que cela fait

Role OS est la manière professionnelle d'utiliser multi-Claude. Il évite les échecs spécifiques que produisent les flux de travail d'IA génériques :

- **Dérive** : les rôles restent dans leur domaine. Le produit ne subit pas de refonte. L'interface utilisateur ne redéfinit pas la portée. Le backend n'invente pas la direction du produit.
- **Fausse complétion** : la définition de "terminé" est concrète. Le travail qui masque des lacunes, saute des vérifications ou résout un problème différent est rejeté.
- **Contamination** : les projets divisés ou hérités conservent des résidus d'identité. Role OS détecte et rejette les dérives inter-projets en termes de terminologie, de visuels et de modèles mentaux.
- **Progrès basé sur des impressions** : chaque transmission est structurée. Chaque verdict est étayé par des preuves. "Cela semble terminé" n'est pas un état valide.

## Comment cela fonctionne

Décrivez votre tâche. Role OS détermine automatiquement le niveau d'orchestration approprié.

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

**L'échelle de secours :**

1. **Mission** — lorsque la tâche correspond à un flux de travail récurrent éprouvé (correction de bugs, traitement, déploiement de fonctionnalités, documentation, sécurité, recherche). Chaîne de rôles connue, flux d'artefacts, branches d'escalade et définitions partielles claires.
2. **Pack** — lorsque la tâche appartient à une famille connue, mais ne correspond pas à une mission complète. 7 ensembles d'équipe calibrés avec sélection automatique et mécanismes de prévention des incompatibilités.
3. **Routage libre** — lorsque la tâche est nouvelle, complexe ou incertaine. Évalue les 31 rôles en fonction du contenu de la tâche et assemble une chaîne dynamique.

Le système ne force jamais une tâche à travers le mauvais niveau d'abstraction. Il explique pourquoi il a choisi chaque niveau et propose des alternatives.

**Une seule commande pour activer l'exécution :**

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

Les exécutions sont enregistrées sur le disque (dans le dossier `.claude/runs/`), ce qui permet de reprendre les sessions interrompues sans problème. Chaque étape comprend des instructions pour l'utilisateur : ce qu'il faut produire, les sections requises et les conditions d'arrêt.

**Une fois routée :**

1. **Chaque rôle produit une transmission** — sortie structurée avec des éléments de preuve qui réduisent l'ambiguïté pour le rôle suivant.
2. **Le critique effectue une revue par rapport au contrat** — accepte, rejette ou bloque en fonction de preuves structurées, et non d'impressions.
3. **La reprise est gérée automatiquement** — les tâches bloquées ou rejetées sont redirigées vers le responsable approprié, avec une raison, un type de reprise et les artefacts requis.

## État de déploiement au sein de l'organisation

L'état de déploiement au niveau de l'organisation (file d'attente, décisions, enregistrements d'audit, ensembles de verrouillage par dépôt) se trouve dans un dépôt privé distinct : [`role-os-rollout`](https://github.com/mcp-tool-shop-org/role-os-rollout). Ce dépôt est le produit ; ce dernier est l'état opérationnel.

## Mémoire et continuité

Role OS ne possède ni ne duplique la couche de mémoire. Lorsqu'une mémoire de projet Claude existe, elle constitue le système de continuité canonique : les faits du référentiel, les décisions, les boucles ouvertes et l'historique des traitements y sont stockés.

Role OS s'intègre à la mémoire du projet Claude. Il ne la remplace pas.

## Traitement complet et vérification de la livraison

Le traitement complet est un protocole canonique en 7 phases défini dans la mémoire du projet Claude (`memory/full-treatment.md`). Role OS dirige et examine les traitements à l'aide de contrats de rôle, de transmissions et de passerelles de critique ; il ne redéfinit pas le protocole.

La **vérification de la livraison** est la porte de qualité de 31 éléments qui s'exécute avant le traitement complet. Les portes obligatoires A à D doivent être validées avant que tout traitement ne commence. Référence canonique : `memory/shipcheck.md`.

Ordre : Vérification de la livraison, puis traitement complet. Aucune version 1.0.0 sans validation des portes obligatoires.

## 31 rôles répartis dans 8 ensembles

| Ensemble | Rôles |
|------|-------|
| **Core** (3) | Orchestrateur, Stratège Produit, Critique |
| **Engineering** (7) | Développeur Frontend, Ingénieur Backend, Ingénieur Tests, Ingénieur Refactoring, Ingénieur Performance, Auditeur de Dépendances, Expert en Sécurité |
| **Design** (2) | Concepteur UI, Gardien de la Marque |
| **Marketing** (1) | Rédacteur de Contenu de Lancement |
| **Treatment** (7) | Chercheur de Dépôts, Traducteur de Dépôts, Architecte de Documentation, Conservateur de Métadonnées, Auditeur de Couverture, Vérificateur de Déploiement, Ingénieur de Release |
| **Product** (3) | Synthétiseur de Commentaires, Priorisateur de Feuille de Route, Rédacteur de Spécifications |
| **Research** (4) | Chercheur UX, Analyste Concurrentiel, Chercheur de Tendances, Synthétiseur d'Entretiens Utilisateurs |
| **Growth** (4) | Stratège de Lancement, Stratège de Contenu, Community Manager, Responsable de Tri des Demandes d'Assistance |

Chaque rôle a un contrat complet : mission, conditions d'utilisation, conditions de non-utilisation, entrées attendues, sorties requises, niveau de qualité et déclencheurs d'escalade. Chaque rôle peut être routé — `roleos route` peut recommander n'importe lequel d'entre eux en fonction du contenu de la tâche.

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

- Corrections de ligne unique, fautes de frappe ou bugs évidents
- Recherche exploratoire sans résultat défini
- Tâches qui peuvent être comprises par une seule personne en 5 minutes
- Corrections urgentes qui doivent être déployées avant qu'une chaîne de revue ne soit terminée
- Projets où la rapidité est privilégiée par rapport à la structure

## Preuves

Role OS a été testé sur trois types de tâches différents dans deux référentiels structurellement différents :

**Test 001 — Travail de fonctionnalité** (Écran de l'équipe, Star Freight)
- Chaîne de 7 rôles, 45 scénarios de test, 0 conflit de rôle.
- A empêché la contamination provenant de l'ancêtre de la branche, a détecté les inventions improvisées, et a mis en évidence les blocages réels.

**Test 002 — Travail d'intégration** (Câblage de l'état de la campagne, Star Freight)
- Chaîne de 5 rôles, a résolu la limite architecturale sans mensonges.
- Les tests anti-fallback ont prouvé que le chemin actif est réel, et non un simple espace réservé.

**Test 003 — Travail d'identité** (Suppression de la contamination, Star Freight)
- Chaîne de 6 rôles, 51 scénarios de test, y compris une défense durable contre la contamination de l'intégration continue.
- A corrigé la dérive de la fiction héritée sans se transformer en une refonte complète.

**Phase d'essai de portabilité** (Cohérence des personas, humour lié aux capteurs)
- Même structure de base, mais langage/domaine/pile différents.
- adoption (du produit) avec modification du contexte uniquement – aucune modification du contrat principal.

**Traitement complet FT-001** (portlight-desktop)
- Traitement en 7 phases avec rôles du "Traitement Pack"
- Vérification de déploiement prouvée, absence de conflits de rôles

**Traitement complet FT-002** (studioflow)
- Même ensemble de traitement, dépôt structurellement différent (espace de travail créatif vs jeu)
- Ensemble de traitement portable — aucune modification de contrat n'est nécessaire

**Brainstorming pour une exécution optimale** (sujet du marché de serveurs MCP)
- Chaîne de 9 rôles, 4 analystes en parallèle, examen croisé + réfutation, graphe de désaccord.
- 4 défis lancés, 3 affirmations affinées, 1 non résolue – pression saine, pas de blocage.
- Plus de 16 liens de traçabilité des artefacts générés vers les éléments de base de la couche de vérité.
- Chaîne de traçabilité complète prouvée : vérité → éléments de base → désaccord → synthèse → expansion → jugement → rendu → traçabilité.

## Propriétés essentielles

Ce sont des éléments non négociables. Si une modification affaiblit l'un de ces éléments, elle doit être rejetée.

- Les limites des rôles sont respectées.
- Les revues sont rigoureuses.
- Les escalades restent transparentes.
- Les tests restent réalisables.
- La portabilité nécessite une adaptation du contexte, et non une modification profonde.

## Structure du projet

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

## Sécurité

Le rôle OS fonctionne **uniquement localement**. Il copie les modèles Markdown et écrit les fichiers de paquets/de verdicts dans le répertoire `.claude/` de votre dépôt. Il n'accède pas au réseau, ne gère pas les secrets et ne collecte pas de données télémétriques. Aucune opération dangereuse n'est effectuée : toutes les écritures de fichiers utilisent par défaut la fonction "skip-if-exists". Consultez le fichier [SECURITY.md](SECURITY.md) pour connaître la politique complète.

## Le système d'exploitation

| Couche | Ce que cela fait | Statut |
|-------|-------------|--------|
| **Routing** | Évalue les 31 rôles en fonction du contenu de la tâche, explique les recommandations, évalue la confiance | ✓ Déployé |
| **Chain builder** | Assemble des chaînes ordonnées en fonction des rôles, avec une préférence pour certains types de paquets, sans être verrouillée à un modèle spécifique. | ✓ Déployé |
| **Conflict detection** | Validation en 4 étapes : conflits majeurs, séquences, redondances, lacunes de couverture. Suggestions de correction. | ✓ Déployé |
| **Escalation** | Redirection automatique des tâches bloquées, rejetées ou divisées vers le module de résolution approprié, avec indication de la raison et des artefacts requis. | ✓ Déployé |
| **Evidence** | Preuves structurées et adaptées aux rôles dans les verdicts. Vérifications de suffisance. 12 types de preuves. | ✓ Déployé |
| **Dispatch** | Génération de manifestes d'exécution pour les environnements multi-Claude. Profils d'outils par rôle, instructions système, budgets. | ✓ Déployé |
| **Trials** | Ensemble complet validé : 30 tâches réussies sur 30 + 5 essais négatifs réussis sur 5. 7 ensembles de tests terminés. | ✓ Terminé |
| **Team Packs** | 7 ensembles calibrés avec sélection automatique, protections contre les erreurs et mécanisme de repli en cas de problème. | ✓ Déployé |
| **Outcome calibration** | Enregistrement des résultats des exécutions, ajustement des poids des ensembles/rôles en fonction des résultats, modification des seuils de confiance. | ✓ Déployé |
| **Mixed-task decomposition** | Détection des tâches complexes, division en paquets secondaires, attribution des ensembles, préservation des dépendances. | ✓ Déployé |
| **Composite execution** | Exécution des paquets secondaires dans l'ordre des dépendances, avec transmission des artefacts, reprise en cas de branchement et synthèse. | ✓ Déployé |
| **Adaptive replanning** | Les modifications de la portée, les résultats ou les nouvelles exigences pendant l'exécution mettent à jour le plan sans redémarrage. | ✓ Déployé |
| **Session spine** | `roleos init claude` crée les fichiers CLAUDE.md, /roleos-route, /roleos-review, /roleos-status. `roleos doctor` vérifie la configuration. Les cartes de routage prouvent l'engagement. | ✓ Déployé |
| **Hook spine** | 5 points d'accroche du cycle de vie (SessionStart, PromptSubmit, PreToolUse, SubagentStart, Stop). Application des règles : rappels sur les cartes de routage, contrôle de l'utilisation des outils, injection de rôle des sous-agents, audit de la finalisation. | ✓ Déployé |
| **Artifact spine** | 20 contrats d'artefacts par rôle. 7 contrats de transmission d'ensembles. Validation structurelle. Vérifications de l'intégrité des chaînes. Les rôles suivants ne peuvent jamais deviner ce qu'ils ont reçu. | ✓ Déployé |
| **Mission library** | 6 missions nommées (développement de fonctionnalité, correction de bug, amélioration, publication de documentation, renforcement de la sécurité, lancement de recherche). Chaque mission définit l'ensemble, la chaîne de rôles, le flux d'artefacts, les branches de relance et une définition partielle et honnête. Les 6 missions ont été testées et optimisées. | ✓ Déployé |
| **Mission runner** | Création d'exécutions, suivi de l'état, finalisation ou échec avec un rapport précis. Propagation des étapes bloquées, avertissements de relance en dehors de la chaîne, réouverture de la dernière étape. | ✓ Déployé |
| **Unified entry** | `roleos start` détermine automatiquement si l'exécution est une mission, un ensemble ou un routage libre. Mécanisme de repli avec scores de confiance, alternatives et détection des tâches complexes. | ✓ Déployé |
| **Persistent runs** | `roleos run` crée des exécutions enregistrées sur le disque. Commandes : `resume` (reprendre), `next` (suivant), `explain` (expliquer), `complete` (terminer), `fail` (échec). Interventions : `reroute` (rediriger), `escalate` (escalader), `retry` (réessayer), `block` (bloquer), `reopen` (réouvrir). Instructions spécifiques à chaque étape. Mesure du niveau de friction. | ✓ Déployé |
| **Brainstorm** | Architecture à deux niveaux : vérité (schémas natifs des rôles, éléments de base de provenance, graphe de désaccord) + rendu (5 voix distinctes, interdictions lexicales, transcription du débat). Les liens de traçabilité prouvent que chaque affirmation rendue correspond à un élément de base de la couche de vérité. Exécution optimale : 894 tests. | ✓ Déployé |

## 6 missions

| Mission | Ensemble | Rôles | Quand utiliser |
|---------|------|-------|-------------|
| `feature-ship` | Fonctionnalité | 5 | Livraison complète d'une fonctionnalité : définition de la portée → spécifications → implémentation → test → revue |
| `bugfix` | Correction de bug | 4 | Diagnostic de la cause profonde, correction, test, vérification |
| `treatment` | Amélioration | 4 | Vérification + peaufinage + documentation + vérification CI + revue |
| `docs-release` | Documentation | 2 | Rédaction/mise à jour de la documentation, notes de publication |
| `security-hardening` | Sécurité | 4 | Analyse des menaces, audit, correction des vulnérabilités, nouvel audit, vérification |
| `research-launch` | Recherche | 4 | Définition de la question, recherche, documentation des résultats, prise de décision |
| `brainstorm` | brainstorming | 9 | Enquête structurée avec plusieurs perspectives, désaccord traçable et verdict. |

Chaque mission inclut des définitions partielles et honnêtes : lorsque le travail est bloqué, le système documente ce qui a été réalisé et ce qui reste, au lieu de prétendre que le travail est terminé.

### Mission de brainstorming

Ce n'est pas un "brainstorming par IA". La mission de brainstorming est **l'attribution de rôles spécialisés dans le domaine juridique, avec un désaccord traçable et une production de résultats justifiés.**

```bash
roleos run "explore product directions for a developer tool discovery platform"
# → MISSION: Brainstorm (Structured Inquiry)
#   Chain: 4 Analysts (parallel) → Normalize → Cross-Examine → Rebut → Synthesize → Expand → Judge
```

**Ce qui le différencie :**

- **Couche 1 (vérité) :** Quatre analystes produisent des schémas spécifiques à chaque rôle (ContextMap, UserValueMap, MechanicsMap, PositioningMap) – pas de prose partagée. Chaque rôle est soumis à des contraintes pour éviter les biais : phrases interdites, types d'affirmations interdits, partitions d'entrée filtrées. Les éléments de base contiennent des informations de provenance. Un graphe d'examen croisé dirigé génère des défis ciblés. Les analystes originaux défendent, affinent ou retirent leurs affirmations sous pression.

- **Couche 2 (rendu) :** Cinq voix humaines distinctes (Boundary Memo, Field Notes, System Sketch, Claim Brief, Cross-Exam Transcript) avec des interdictions lexicales pour éviter la convergence des voix. La synthèse utilise la couche de vérité, et non la prose rendue. Les deux couches sont toujours disponibles.

- **Chaîne de traçabilité :** Chaque phrase rendue est traçable jusqu'à un élément de base de la couche de vérité. Les instructions de synthèse citent les éléments de base. Les cibles de l'examen croisé sont des identifiants d'affirmations réels. Le graphe de désaccord est le résultat, et non la prose.

**Prouvé :** Exécution optimale v0.4 – 894 tests, chaîne de traçabilité complète vérifiée. Consultez [`examples/golden-run.md`](examples/golden-run.md) pour la chaîne complète des artefacts.

## Statut

- v0.1–v0.4 : Bases – essais, adoption (du produit), ensemble de traitement, ensemble de démarrage.
- v1.0.0 : 32 rôles, CLI complète, traitement éprouvé, portabilité multi-dépôts.
- v1.0.2 : Blocage du système d'exploitation par rôle (corrections de la "vérité" de l'initialisation, `init --force`).
- v1.1.0 : 31 rôles, infrastructure de routage complète, détection de conflits, escalade, preuves, répartition, 7 ensembles d'équipe éprouvés. 35 essais d'exécution. 212 tests.
- v1.2.0 : Ensembles calibrés promus au point d'entrée par défaut. Sélection automatique, détection de discordances, suggestion alternative, repli sur le routage libre. 246 tests.
- v1.3.0 : Calibrage des résultats, décomposition de tâches complexes, exécution composite, replanification adaptative. 317 tests.
- v1.4.0 : Infrastructure de session – `roleos init claude`, `roleos doctor`, cartes de routage, commandes `/roleos-route`, `/roleos-review` et `/roleos-status`. 335 tests.
- v1.5.0 : Infrastructure de "hooks" – 5 "hooks" de cycle de vie pour l'application en temps réel. 358 tests.
- v1.6.0 : Infrastructure des artefacts – 20 contrats d'artefacts par rôle, 7 contrats de transmission d'ensembles, validation structurelle. 385 tests.
- v1.7.0 : Preuve de complétion – tâches réelles exécutées sur toute la pile. CLI `roleos artifacts`. Escalade honnête pour les corrections structurelles. 398 tests.
- v1.8.0 : Bibliothèque de missions (Phase S) – 6 missions nommées, moteur d'exécution, rapports de complétion. Durcissement basé sur 6 exécutions réelles. 481 tests.
- v1.9.0 : Chemin d'entrée unifié (Phase T) – `roleos start` décide automatiquement entre mission, ensemble et routage libre. Système de repli, détection composite, essais de comparaison du chemin d'entrée. 527 tests.
- **v2.0.0** : Optimisation de l'expérience utilisateur (Phase U) – `roleos run` crée des exécutions persistantes avec sauvegarde sur disque. Reprise, suivant, explication, complétion, échec. Interventions : réacheminement, escalade, nouvelle tentative, blocage, réouverture. Assistance spécifique à chaque étape. Mesure du niveau de difficulté. 6 essais de difficulté. 613 tests.
- **v2.0.1** : Audit du manuel, documentation pour débutants, corrections du nombre de tests. 617 tests.
- **v2.1.0** : Mission de brainstorming (v0.4) – rôles spécialisés dans le domaine juridique, désaccord traçable, résultat avec verdict. Architecture à deux niveaux (vérité + rendu), matrice de permissions de contre-interrogatoire, graphe de litiges, preuve d'exécution optimale. 7 missions, 50 rôles, 8 ensembles. 894 tests.

## Licence

MIT

---

Créé par <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a
