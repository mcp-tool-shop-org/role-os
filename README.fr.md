<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.md">English</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
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

Une couche d'abstraction portable et native du référentiel qui dirige le travail à travers des contrats de rôle, des paquets structurés, des revues et des escalades, afin que les équipes puissent réaliser des fonctionnalités, des intégrations, des corrections d'identité et des traitements complets du référentiel, sans dérive, sans fausses déclarations de complétion, ni progrès basés sur des impressions subjectives.

## Ce que cela fait

Role OS empêche les échecs spécifiques que produisent les flux de travail d'IA génériques :

- **Dérive** : les rôles restent dans leur domaine. Le produit ne subit pas de refonte. L'interface utilisateur ne redéfinit pas la portée. Le backend n'invente pas la direction du produit.
- **Fausse complétion** : la définition de "terminé" est concrète. Le travail qui masque des lacunes, saute des vérifications ou résout un problème différent est rejeté.
- **Contamination** : les projets divisés ou hérités conservent des résidus d'identité. Role OS détecte et rejette les dérives inter-projets en termes de terminologie, de visuels et de modèles mentaux.
- **Progrès basé sur des impressions** : chaque transmission est structurée. Chaque verdict est étayé par des preuves. "Cela semble terminé" n'est pas un état valide.

## Comment cela fonctionne

1. **Créer un paquet** : définir ce qui doit exister lorsque le travail est terminé.
2. **Diriger à travers une chaîne** : l'ensemble le plus petit de rôles spécialisés nécessaires.
3. **Chaque rôle produit une transmission** : une sortie structurée qui réduit l'ambiguïté pour le rôle suivant.
4. **Le critique examine par rapport au contrat** : accepte, rejette ou bloque en fonction des preuves, et non des impressions.

## Mémoire et continuité

Role OS ne possède ni ne duplique la couche de mémoire. Lorsqu'une mémoire de projet Claude existe, elle constitue le système de continuité canonique : les faits du référentiel, les décisions, les boucles ouvertes et l'historique des traitements y sont stockés.

Role OS s'intègre à la mémoire du projet Claude. Il ne la remplace pas.

## Traitement complet et vérification de la livraison

Le traitement complet est un protocole canonique en 7 phases défini dans la mémoire du projet Claude (`memory/full-treatment.md`). Role OS dirige et examine les traitements à l'aide de contrats de rôle, de transmissions et de passerelles de critique ; il ne redéfinit pas le protocole.

La **vérification de la livraison** est la porte de qualité de 31 éléments qui s'exécute avant le traitement complet. Les portes obligatoires A à D doivent être validées avant que tout traitement ne commence. Référence canonique : `memory/shipcheck.md`.

Ordre : Vérification de la livraison, puis traitement complet. Aucune version 1.0.0 sans validation des portes obligatoires.

## 32 rôles répartis dans 8 ensembles

| Ensemble | Rôles |
|------|-------|
| **Core** (3) | Orchestrateur, Stratège produit, Rédacteur de critiques |
| **Engineering** (7) | Développeur frontend, Ingénieur backend, Ingénieur de tests, Ingénieur de refactoring, Ingénieur des performances, Auditeur de dépendances, Rédacteur de revues de sécurité |
| **Design** (2) | Concepteur d'interface utilisateur, Gardien de la marque |
| **Marketing** (1) | Rédacteur de contenu pour le lancement |
| **Treatment** (7) | Chercheur de référentiels, Traducteur de référentiels, Architecte de documentation, Conservateur de métadonnées, Auditeur de couverture, Vérificateur de déploiement, Ingénieur de publication |
| **Product** (4) | Synthétiseur de retours, Priorisateur de feuille de route, Rédacteur de spécifications, Architecte de l'information |
| **Research** (4) | Chercheur UX, Analyste concurrentiel, Chercheur de tendances, Synthétiseur d'entretiens utilisateurs |
| **Growth** (4) | Stratège de lancement, Stratège de contenu, Responsable de la communauté, Responsable du triage du support |

Chaque rôle possède un contrat complet : mission, utilisation appropriée, non-utilisation, entrées attendues, sorties requises, critères de qualité et déclencheurs d'escalade.

## Démarrage rapide

```bash
npx @mcptoolshop/role-os init

# Fill context/ files for your project, then:
roleos packet new feature
roleos route .claude/packets/my-feature.md
roleos review .claude/packets/my-feature.md accept
roleos status
```

## Quand ne pas utiliser Role OS

- Corrections ponctuelles, fautes de frappe ou bogues évidents
- Recherches exploratoires sans résultat défini
- Travaux qui tiennent dans la tête d'une seule personne en 5 minutes
- Corrections urgentes qui doivent être déployées avant la fin du processus de revue
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
- Traitement complet avec personnel affecté, utilisant les rôles de l'ensemble de traitement
- Contrôle de qualité avant déploiement prouvé, aucune collision de rôles.

**Traitement complet FT-002** (studioflow)
- Même ensemble de traitement, référentiel structurellement différent (espace de travail créatif vs jeu)
- Ensemble de traitement portable – aucune modification de contrat nécessaire.

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

## Sécurité

Le rôle OS fonctionne **uniquement localement**. Il copie les modèles Markdown et écrit les fichiers de paquets/de verdicts dans le répertoire `.claude/` de votre dépôt. Il n'accède pas au réseau, ne gère pas les secrets et ne collecte pas de données télémétriques. Aucune opération dangereuse n'est effectuée : toutes les écritures de fichiers utilisent par défaut la fonction "skip-if-exists". Consultez le fichier [SECURITY.md](SECURITY.md) pour connaître la politique complète.

## Statut

**v1.0.0 — Surface large, mêmes règles**

- v0.1 : Opérationnel – 3 essais, 3 acceptations, 0 collision de rôles
- v0.2 : adoption (du produit) – flux de travail par défaut dans le référentiel principal, portable vers un deuxième référentiel
- v0.3 : Productivité – ensemble de démarrage, CLI de démarrage, surface de démonstration
- v0.4 : Ensemble de traitement – 8 rôles de traitement/identité, traitement complet avec personnel affecté, portable entre 2 référentiels
- v1.0.0 : 32 rôles répartis dans 8 ensembles, CLI complète, traitement prouvé, portabilité multi-référentiels.

## Licence

MIT

---

Créé par <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a
