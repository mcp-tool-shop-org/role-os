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

## L'épine dorsale

Role OS est livré avec 8 contrats de rôle éprouvés :

| Rôle | Fonction |
|------|-----|
| **Orchestrator** | Décompose le travail en la chaîne la plus petite et la plus logique. |
| **Product Strategist** | Définit la portée et protège l'intention du produit. |
| **UI Designer** | Conçoit la hiérarchie, l'interaction et la structure visuelle. |
| **Frontend Developer** | Implémente les interfaces utilisateur fidèlement. |
| **Backend Engineer** | Implémente les contrats serveur/données et le comportement du système. |
| **Test Engineer** | Vérifie le travail par rapport aux risques réels, et non aux formalités. |
| **Launch Copywriter** | Rédige des messages véridiques basés sur le travail réalisé. |
| **Critic Reviewer** | Accepte ou rejette en fonction de la conformité au contrat. |

## Démarrage rapide

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
  starter-pack/
    handbook.md                ← How Role OS works (under 500 words)
    context/                   ← Fill these for your repo
    examples/                  ← Feature, integration, identity packets
    agents/                    ← 8 role contracts
    schemas/                   ← Packet, handoff, verdict formats
    policy/                    ← Routing, permissions, escalation, done
    workflows/                 ← Ship feature, fix bug, launch update, full treatment (reference)
```

## Sécurité

Le rôle OS fonctionne **uniquement localement**. Il copie les modèles Markdown et écrit les fichiers de paquets/de verdicts dans le répertoire `.claude/` de votre dépôt. Il n'accède pas au réseau, ne gère pas les secrets et ne collecte pas de données télémétriques. Aucune opération dangereuse n'est effectuée : toutes les écritures de fichiers utilisent par défaut la fonction "skip-if-exists". Consultez le fichier [SECURITY.md](SECURITY.md) pour connaître la politique complète.

## Statut

**v1.0.0 — Disponible**

- v0.1 : Fonctionnel — 3 essais, 3 acceptations, 0 conflits de rôles.
- v0.2 : adoption (du produit) — flux de travail par défaut dans le dépôt principal, portable vers un deuxième dépôt.
- v0.3 : Industrialisation — kit de démarrage, CLI de base, documentation pour l'adoption.

## Licence

MIT

---

Créé par <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a
