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

Un système d’exploitation multi-Claude qui affecte du personnel, répartit les tâches, valide et exécute le travail à travers 61 contrats de rôles spécialisés. Il crée des ensembles de tâches, assemble l’équipe appropriée en fonction de critères définis, détecte les problèmes avant l’exécution, redirige automatiquement vers une solution lorsque le travail est bloqué ou rejeté, et exige des preuves structurées pour chaque décision. Il comprend une répartition dynamique pour les missions à grande échelle — un dépôt de 10 composants devient automatiquement 28 étapes d’audit, au lieu de 6.

## Ce qu’il fait

Role OS est la méthode professionnelle pour utiliser multi-Claude. Il prévient les défaillances spécifiques que produisent les flux de travail d’IA génériques :

- **Dérive** — les rôles restent dans leur domaine d’expertise. Le produit ne se redéfinit pas. L’interface utilisateur ne redéfinit pas la portée. La partie serveur n’invente pas l’orientation du produit.
- **Achèvement incorrect** — la définition de ce qui est terminé est précise. Le travail qui dissimule des lacunes, omet des vérifications ou résout un problème différent est rejeté.
- **Contamination** — les projets dérivés ou hérités conservent des éléments d’identité. Role OS détecte et rejette la dérive inter-projets en termes de terminologie, d’éléments visuels et de modèles mentaux.
- **Progrès basé sur le ressenti** — chaque transfert est structuré. Chaque décision est liée à des preuves. « Ça a l’air terminé » n’est pas un état valide.

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
2. **Ensemble** — lorsque la tâche appartient à une famille connue mais ne correspond pas entièrement à un modèle de mission. 10 ensembles d’équipes calibrées avec sélection automatique et protections contre les incompatibilités.
3. **Répartition libre** — lorsque la tâche est nouvelle, mixte ou incertaine. Évalue tous les 61 rôles par rapport au contenu de l’ensemble et assemble une chaîne dynamique.

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

Les exécutions sont conservées sur le disque (`.claude/runs/`), de sorte que les sessions interrompues reprennent sans problème. Chaque étape comprend des instructions pour l’opérateur : ce qui doit être produit, les sections requises et les conditions d’arrêt.

**Une fois la tâche répartie :**

1. **Chaque rôle produit un transfert** — une sortie structurée avec des éléments de preuve qui réduisent l’ambiguïté pour le rôle suivant.
2. **Un critique examine par rapport au contrat** — accepte, rejette ou bloque en fonction de preuves structurées, et non d’une impression.
3. **La reprise se fait automatiquement** — le travail bloqué ou rejeté est redirigé vers la personne responsable avec une explication, un type de reprise et l’artefact requis.

## Répartition tenant compte du budget

Role OS peut consulter un **analyste de budget de jetons** local pour chaque étape de répartition et joindre une prévision de dépenses indicative au manifeste — optionnel (`ROLEOS_BUDGET_CONSULT`), indicatif (il ne bloque jamais une répartition) et en cas d’échec, il revient à une base de référence déterministe. Désactivé par défaut ; la prévision est locale et gratuite. Voir le [manuel](https://mcp-tool-shop-org.github.io/role-os/handbook/specialist-budget/).

## Supervision des appels d’outils

Role OS vérifie et contrôle les appels d’outils au niveau de `PreToolUse` — de manière déterministe, sans modèle sur le chemin critique :

- **Surveillance de la conformité** (indicatif, en cas d’échec, il revient à une base de référence) — un schéma déterministe + des seuils de contrat calculables vérifient un appel proposé par rapport à son contrat d’outil catalogué et joignent une évaluation indicative sur un appel *manifestement* non conforme ; il ne bloque jamais. Un plafond LLM optionnel (`ROLEOS_CONFORMANCE_CONSULT`) gère les éléments sémantiques restants.
- **Contrôle des capacités** (en cas d’échec, optionnel `ROLEOS_CAPABILITY_GATE`, désactivé par défaut) — privilèges minimums déterministes sur les actions *irréversibles* (publication npm/PyPI, `gh release`, `git push`, modifications du dépôt, déploiement de Pages). Une action contrôlée est refusée à moins que le responsable n’ait accordé sa capacité dans `.claude/role-os/capabilities.json`, de sorte qu’une étape incorrecte — une erreur honnête ou une injection malveillante — ne puisse pas déclencher une action irréversible non autorisée. Le complément préventif à la règle du compensateur nommé. Voir le [manuel](https://mcp-tool-shop-org.github.io/role-os/handbook/).

## État de déploiement au niveau de l’organisation

L’état du déploiement à l’échelle de l’organisation (file d’attente, décisions, journaux d’audit, paquets de verrouillage par dépôt) est stocké dans un référentiel **privé** distinct, interne à l’organisation (`role-os-rollout`). Ce référentiel représente le produit ; ce référentiel contient les données opérationnelles.

## Mémoire et continuité

Role OS ne possède ni ne duplique la couche de mémoire. Là où la mémoire du projet Claude existe, c’est le système de continuité canonique — les faits du dépôt, les décisions, les points en suspens et l’historique des traitements s’y trouvent.

Role OS s’intègre à la mémoire du projet Claude. Il ne la remplace pas.

## Traitement complet et vérification finale

Le traitement complet est un protocole canonique en 7 phases défini dans la mémoire du projet Claude (`memory/full-treatment.md`). Role OS répartit et examine les traitements à l’aide de contrats de rôles, de transferts et de contrôles critiques — il ne redéfinit pas le protocole.

La **vérification finale** est la grille de qualité en 31 éléments qui s’exécute avant le traitement complet. Les étapes A à D doivent être franchies avant que tout traitement ne commence. Référence canonique : `memory/shipcheck.md`.

Ordre : vérification finale d’abord, puis traitement complet. Pas de version 1.0.0 sans avoir réussi les étapes obligatoires.

## 61 rôles répartis en 10 ensembles

| Ensemble | Rôles |
|------|-------|
| **Core** (3) | Orchestrateur, stratège produit, critique |
| **Engineering** (7) | Développeur frontend, ingénieur backend, ingénieur de test, ingénieur de refactoring, ingénieur de performance, auditeur des dépendances, examinateur de sécurité |
| **Design** (2) | Concepteur d’interface utilisateur, gardien de la marque |
| **Marketing** (1) | Rédacteur pour les lancements |
| **Treatment** (7) | Chercheur sur les dépôts, traducteur pour les dépôts, architecte de la documentation, conservateur des métadonnées, auditeur de la couverture, vérificateur du déploiement, ingénieur en charge des versions |
| **Product** (3) | Synthétiseur de commentaires, priorisateur de feuille de route, rédacteur de spécifications |
| **Research** (4) | Chercheur UX, analyste concurrentiel, chercheur sur les tendances, synthétiseur d’entretiens avec les utilisateurs |
| **Growth** (4) | Stratège pour les lancements, stratège en matière de contenu, responsable de la communauté, responsable du tri des demandes d’assistance |
| **Deep Audit** (4) | Auditeur des composants, auditeur de la véracité des tests, auditeur des interfaces, synthétiseur d’audits |
| **Swarm** (7) | Coordinateur de l’essaim, agent backend de l’essaim, agent de pont de l’essaim, agent de test de l’essaim, agent d’infrastructure de l’essaim, agent frontend de l’essaim, synthétiseur de l’essaim |

Chaque rôle est associé à un contrat complet : mission, cas d’utilisation, moments où il ne doit pas être utilisé, entrées attendues, sorties requises, niveau de qualité et déclencheurs d’escalade. Chaque rôle peut être affecté — `roleos route` peut en recommander n’importe lequel en fonction du contenu du paquet.

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

- Corrections sur une seule ligne, fautes de frappe ou bogues évidents
- Recherche exploratoire sans résultat défini
- Travail qui peut être réalisé par une personne en 5 minutes
- Correctifs d’urgence qui doivent être déployés avant la fin du processus d’examen
- Projets où vous privilégiez la rapidité à la structure

## Preuves

Role OS a été testé avec trois types de projets différents dans deux dépôts structurellement différents :

**Projet 001 — Travail sur une fonctionnalité** (écran Crew, Star Freight)
- Chaîne de 7 rôles, 45 scénarios de test, 0 conflits de rôles
- A empêché la contamination provenant d’un ancêtre du fork, a détecté une invention en ligne et a mis en évidence les blocages réels

**Projet 002 — Travail d’intégration** (liaison CampaignState, Star Freight)
- Chaîne de 5 rôles, a résolu un problème architectural sans recourir à des solutions de contournement
- Les tests anti-contournement ont prouvé que le chemin actif est réel et non un simple espace réservé

**Projet 003 — Travail sur l’identité** (suppression de la contamination, Star Freight)
- Chaîne de 6 rôles, 51 scénarios de test, y compris une défense durable contre la contamination dans le CI
- A corrigé les incohérences héritées sans entraîner une refonte importante

**Test de portabilité** (cohérence des personas, humour sensoriel)
- Même structure, langue/domaine/pile différents
- Adopté avec seulement des modifications contextuelles — aucune modification du contrat principal

**Traitement complet FT-001** (portlight-desktop)
- Traitement en 7 phases avec les rôles du pack de traitement
- La validation avant le déploiement a été prouvée, aucun conflit de rôle

**Traitement complet FT-002** (studioflow)
- Même pack de traitement, dépôt structurellement différent (espace de travail créatif par rapport à un jeu)
- Le pack de traitement est portable — aucune modification du contrat n’est nécessaire

**Session de brainstorming réussie** (sujet du marché MCP server)
- Chaîne de 9 rôles, 4 analystes en parallèle, examen croisé + réfutation du graphique des désaccords
- 4 défis lancés, 3 revendications affinées, 1 non résolu — une pression saine, pas d’impasse
- Plus de 16 liens de traçabilité à partir des artefacts rendus vers les atomes de la couche de vérité
- Chaîne complète de traçabilité prouvée : vérité → atomes → désaccord → synthèse → expansion → jugement → rendu → traçabilité

## Propriétés principales

Elles sont non négociables. Si une modification affaiblit l’une d’entre elles, rejetez-la.

- Les limites des rôles sont respectées
- L’examen est rigoureux
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

Role OS fonctionne **uniquement en local**. Il copie les modèles Markdown et écrit les fichiers de paquets/décisions dans le répertoire `.claude/` de votre dépôt. Il n’accède pas au réseau, ne gère pas les secrets et ne collecte pas de données de télémétrie. Aucune opération dangereuse — par défaut, toutes les écritures de fichiers utilisent l’option « ignorer si existant ». Consultez le fichier [SECURITY.md](SECURITY.md) pour connaître la politique complète.

## Le système d’exploitation

| Couche | Ce qu’il fait | Statut |
|-------|-------------|--------|
| **Routing** | Attribue un score à chacun des 61 rôles en fonction du contenu du paquet, explique les recommandations et évalue la confiance. | ✓ Déployé |
| **Chain builder** | Assemble des chaînes ordonnées par phase à partir des rôles notés, avec une préférence pour le type de paquet plutôt que pour un modèle prédéfini. | ✓ Déployé |
| **Conflict detection** | Validation en 4 étapes : conflits importants, séquence, redondance, lacunes de couverture. Suggestions de correction. | ✓ Déployé |
| **Escalation** | Achemine automatiquement les travaux bloqués/rejetés/divisés vers le bon résolveur avec une explication et l’artefact requis. | ✓ Déployé |
| **Evidence** | Preuves structurées tenant compte du rôle dans les décisions. Vérifications de suffisance. 12 types de preuves. | ✓ Déployé |
| **Dispatch** | Génère des manifestes d’exécution pour multi-claude. Profils d’outils par rôle, invites système, budgets. | ✓ Déployé |
| **Trials** | Ensemble complet prouvé : 30/30 tâches réussies + 5/5 essais négatifs. 7 essais de pack terminés. | ✓ Terminé |
| **Team Packs** | 10 packs calibrés avec sélection automatique, protections contre les incompatibilités et repli en cas de routage libre. | ✓ Déployé |
| **Outcome calibration** | Enregistre les résultats des exécutions, ajuste les pondérations des packs/rôles à partir des résultats et modifie les seuils de confiance. | ✓ Déployé |
| **Mixed-task decomposition** | Détecte le travail composite, divise en paquets enfants, assigne des packs et conserve les dépendances. | ✓ Déployé |
| **Composite execution** | Exécute les paquets enfants dans l’ordre des dépendances avec transfert d’artefacts, récupération de branche et synthèse. | ✓ Déployé |
| **Adaptive replanning** | Les modifications de portée, les découvertes ou les nouvelles exigences en cours d’exécution mettent à jour le plan sans redémarrer. | ✓ Déployé |
| **Session spine** | `roleos init claude` crée les fichiers CLAUDE.md, /roleos-route, /roleos-review, /roleos-status. `roleos doctor` vérifie la configuration. Les cartes de routage prouvent l’engagement. | ✓ Déployé |
| **Hook spine** | 5 hooks du cycle de vie (SessionStart, PromptSubmit, PreToolUse, SubagentStart, Stop). Application consultative : rappels sur les cartes de routage, validation avant l’utilisation des outils, injection du rôle d’un sous-agent, audit de la complétion. | ✓ Déployé |
| **Artifact spine** | Contrats d’artefacts par rôle. Contrats de transfert de pack. Validation structurelle. Vérifications de l’exhaustivité de la chaîne. Les rôles en aval ne devinent jamais ce qu’ils ont reçu. | ✓ Déployé |
| **Mission library** | 9 missions nommées (fonctionnalité principale, correction de bugs, traitement, publication de la documentation, renforcement de la sécurité, lancement d’une recherche, séance de brainstorming, audit approfondi, phase de test interne). Chacune définit le groupe, la chaîne de rôles, le flux des éléments, les branches d’escalade et une définition partielle mais précise. | ✓ Déployé |
| **Mission runner** | Exécutez des tests, parcourez les étapes en suivant l’état, terminez ou échouez avec un compte rendu précis. Propagation d’étape bloquée, avertissements de dépassement du nombre maximal d’étapes, réouverture de la dernière étape. | ✓ Déployé |
| **Unified entry** | La commande `roleos start` détermine automatiquement le mode de routage à utiliser : mission, ensemble ou libre. En cas d’échec, elle utilise une série d’options de repli avec des niveaux de confiance, des itinéraires alternatifs et une détection combinée. | ✓ Déployé |
| **Persistent runs** | « `roleos run` » crée des exécutions dont les données sont stockées sur disque. « `resume` », « `next` », « `explain` », « `complete` », « `fail` ». Interventions possibles : redirection, escalade, nouvelle tentative, blocage, réouverture. Instructions spécifiques à chaque étape. Mesure des frottements. | ✓ Déployé |
| **Brainstorm** | Architecture à deux niveaux : vérité (schémas natifs liés aux rôles, éléments de provenance, graphe des arguments contradictoires) + rendu (5 voix distinctes, interdictions lexicales, transcription du débat). Les liens de traçabilité prouvent que chaque affirmation rendue correspond à un élément de vérité. Test réussi et validé. | ✓ Déployé |
| **Deep Audit** | Audit du dépôt basé sur le manifeste : décomposer le dépôt en composants, affecter N auditeurs, M auditeurs chargés de vérifier la conformité et K auditeurs chargés d’examiner les interfaces à partir du graphe des dépendances, synthétiser les résultats pour obtenir un classement et un plan d’action. L’affectation dynamique s’adapte à la taille du dépôt (formule : 2N + K + 3). Exécution native avec validation des artefacts à chaque étape. | ✓ Déployé |
| **Dogfood Swarm** | Convergence en plusieurs étapes : trois phases de développement (correction des bugs/sécurité → approche proactive → amélioration de l’expérience utilisateur), puis phase d’ajout de fonctionnalités. Propriété exclusive des fichiers, validation à chaque étape du processus, points de contrôle pour les utilisateurs. Détection automatique du domaine qui génère les manifestes. Liaison vers les environnements de test internes (dogfood-labs). | ✓ Déployé |

## 9 missions

| Mission | Ensemble | Rôles | Quand l’utiliser ? |
|---------|------|-------|-------------|
| `feature-ship` | fonctionnalité ; mettre en avant ; figurer dans | 5 | Déploiement complet des fonctionnalités : définition du périmètre → spécifications → mise en œuvre → tests → évaluation |
| `bugfix` | correction de bug | 4 | Identifier la cause profonde, corriger, tester, vérifier. |
| `treatment` | traitement | 4 | Vérification du code source + correction + documentation + vérification par l’intégration continue + relecture |
| `docs-release` | documents | 2 | Rédiger et mettre à jour la documentation, les notes de version. |
| `security-hardening` | sécurité | 4 | Analyse des risques, audit, correction des vulnérabilités, nouvel audit, vérification. |
| `research-launch` | recherche | 4 | Définir la problématique, mener des recherches, consigner les résultats, prendre une décision. |
| `brainstorm` | session de brainstorming / séance de remue-méninges | 9 | Enquête structurée et multidimensionnelle, permettant de suivre les désaccords et d’aboutir à une conclusion. |
| `deep-audit` | audit approfondi | 5 (gammes) | Audit de dépôt pris en charge par Manifest : le nombre d’utilisateurs participant à l’audit s’adapte à la taille du graphe du dépôt grâce à une répartition dynamique des tâches. |
| `dogfood-swarm` | essaim | 8 (gammes) | Convergence en plusieurs étapes : état de santé A → état de santé B → état de santé C → caractéristique → synthèse finale. |

Chaque tâche comprend une description précise et honnête de l’état d’avancement : lorsque la progression est interrompue, le système enregistre ce qui a été réalisé et ce qui reste à faire, au lieu de prétendre que la tâche est terminée.

### Session de brainstorming sur la mission

Pas de « séances de remue-méninges sur l’IA ». La mission de la séance de remue-méninges consiste à définir des **rôles spécialisés encadrés par la loi, avec un processus clair permettant d’identifier les désaccords et aboutissant à une décision définitive.**

```bash
roleos run "explore product directions for a developer tool discovery platform"
# → MISSION: Brainstorm (Structured Inquiry)
#   Chain: 4 Analysts (parallel) → Normalize → Cross-Examine → Rebut → Synthesize → Expand → Judge
```

**Qu’est-ce qui le distingue ?**

- **Niveau 1 (vérité) :** Quatre analystes émettent des schémas spécifiques à leur rôle (ContextMap, UserValueMap, MechanicsMap, PositioningMap), et non un texte partagé. Chaque rôle est soumis à des contraintes visant à éviter les angles morts : expressions interdites, types d’affirmations interdits, partitions d’entrée filtrées. Les éléments de données contiennent des informations sur leur origine. Un graphique d’interrogation croisée dirigée permet de formuler des questions ciblées. Les analystes initiaux défendent leurs positions, les affinent ou s’en désistent sous la pression.

- **Couche 2 (rendu) :** Cinq voix humaines distinctes (Note de service, Observations sur le terrain, Schéma du système, Exposé des faits, Transcription d’un contre-interrogatoire), avec des restrictions lexicales empêchant la convergence des voix. La synthèse déforme la vérité, sans jamais produire un texte cohérent. Les deux couches sont toujours accessibles.

- **Chaîne de traçabilité :** Chaque phrase générée peut être retracée jusqu’à un élément fondamental de la couche de vérité. Les instructions de synthèse font référence à ces éléments. Les interrogatoires visent des identifiants de revendications réels. Le graphique des litiges est le résultat, et non le texte lui-même.

**Validé :** version 0.4, exécution de référence – l’intégrité de la chaîne de traçabilité a été vérifiée. Consultez le fichier [`examples/golden-run.md`](examples/golden-run.md) pour obtenir la liste complète des éléments constitutifs.

### Mission d’audit approfondie

Il ne s’agit pas d’une simple analyse superficielle. La mission d’audit approfondi décompose le dépôt en composants distincts et affecte des auditeurs spécialisés, en fonction de l’échelle déterminée par le graphe de dépendances du dépôt.

```bash
roleos run "deep audit this repo" --manifest=audit-manifest.json
# → MISSION: Deep Audit (Manifest-Scaled)
#   Steps: Component Auditor ×6 + Test Truth Auditor ×6 + Seam Auditor ×8 + Synthesizer + Action Plan + Critic = 23 steps
```

**Qu’est-ce qui le distingue ?**

- **Répartition dynamique** : le nombre d’agents n’est pas fixe. Un dépôt de 10 composants avec 5 groupes de limites produit 28 étapes (2 × 10 + 5 + 3). Un dépôt de 3 composants en produit 12. La formule de mise à l’échelle est « 2N + K + 3 », où N = nombre de composants, K = nombre de limites.
- **Ensembles de données basés sur un manifeste** : un fichier `audit-manifest.json` définit les composants (avec les chemins d’accès aux fichiers, le nombre de lignes et les descriptions) et les limites (de/vers, avec des descriptions des interfaces). Chaque auditeur ne reçoit que son ensemble de données.
- **Quatre archétypes de rôles** : Auditeur de composants (vérification du code par module), Auditeur de la validité des tests (tests qui prouvent par rapport aux tests existants), Auditeur des points d’intégration (limites d’intégration à partir du graphe de dépendances), Synthétiseur d’audit (résultat classé + plan d’action à partir de tous les ensembles de données).
- **Validation des artefacts à chaque étape** : la fonction `validateArtifact()` est exécutée à la fin de chaque étape dans les deux chemins d’exécution. Les résultats sont associés aux objets d’étape. Le système sait si chaque artefact a respecté son contrat.
- **Résultats partiels honnêtes** : lorsque le budget ou la portée empêche l’achèvement, les résultats par composant sont valides individuellement. Le système synthétise à partir de ce qui a été achevé et ne prétend jamais avoir couvert tous les aspects.

**Résultats confirmés :** Exécution d’un test de validation effectué par un utilisateur natif – 18 tests réalisés sur des exemples réels, vérification complète du cycle de vie, y compris la réouverture en cas d’escalade et la gestion des échecs partiels. La formule de mise à l’échelle a été validée pour les exemples comportant 3, 6, 10 ou 15 composants.

### Mission consistant à déployer un essaim de drones

Il ne s’agit pas d’un outil d’analyse statique en une seule passe. La mission « dogfood swarm » exécute un protocole de convergence multipasse qui fait passer un dépôt de l’état « fonctionnel » à l’état « prêt pour la production », en trois étapes et grâce à des livraisons itératives de fonctionnalités.

```bash
roleos swarm
# → MISSION: Dogfood Swarm (Multi-Pass Convergence)
#   Stages: Health-A → Health-B → Health-C → Feature → Final
#   Domain agents: 3-5 parallel per wave (exclusive file ownership)
```

**Qu’est-ce qui le distingue ?**

- **Étape d’évaluation en trois phases** : la phase A corrige les bogues et les problèmes de sécurité (boucle jusqu’à ce qu’il n’y ait plus 0 CRITICAL + 0 HIGH). La phase B applique un renforcement proactif (les utilisateurs examinent les résultats). La phase C améliore le code en le rendant plus convivial : messages d’erreur qui aident les utilisateurs, commentaires sur la reconnexion, états de chargement, accessibilité. Chaque étape est une approche distincte, et non la même analyse répétée.
- **Propriété exclusive des fichiers** : chaque agent de domaine possède des fichiers spécifiques via `swarm-manifest.json`. Aucun agent n’édite le même fichier. Pas de conflits de fusion. Pas de surcharge de coordination.
- **Contrôles avant la compilation** : l’analyse statique + la vérification du type + les tests doivent être réussis après chaque vague. Le système détecte automatiquement le système de compilation (Node, Rust, Python, Go) et exécute les commandes appropriées.
- **Points de contrôle utilisateur** : la phase d’évaluation Health-B et la phase de livraison des fonctionnalités nécessitent l’approbation explicite de l’utilisateur avant l’exécution. Le système présente les résultats, et l’utilisateur décide ce qui doit être compilé.
- **Convergence itérative** : les étapes sont répétées en boucle avec les vagues jusqu’à ce que les conditions de sortie soient remplies ou qu’un nombre maximal d’itérations soit atteint. Chaque vague effectue une nouvelle vérification à partir de zéro afin de détecter les régressions introduites par les corrections précédentes.
- **Détection automatique du domaine** : `roleos swarm manifest --generate` détecte le type de dépôt (CLI, web, bureau, MCP, monorepo) et génère des affectations de domaine non superposées.

**Résultats prouvés** : claude-collaborate (2026-03-28) — 35 → 129 tests, 106 problèmes d’évaluation corrigés, v1.1.0 publié. Protocole v2.0 avec 9 phases.

## Statut

Stable et prêt à être déployé. Consultez le fichier [CHANGELOG](CHANGELOG.md) pour obtenir l’historique complet des versions et les modifications apportées dans chaque version.

## Licence

MIT

---

Créé par <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a>
