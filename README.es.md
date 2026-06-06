<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.md">English</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
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

Un sistema operativo multi-Claude que asigna personal, dirige, valida y ejecuta tareas a través de 61 contratos de roles especializados. Crea paquetes de tareas, ensambla el equipo adecuado a partir de una evaluación de roles, detecta fallos en la cadena antes de la ejecución, redirige automáticamente la recuperación cuando una tarea se bloquea o se rechaza, y requiere pruebas estructuradas en cada evaluación. Incluye una distribución dinámica para misiones de gran escala: un repositorio de 10 componentes se convierte automáticamente en 28 pasos de auditoría, en lugar de 6.

## Qué hace

Role OS es la forma profesional de utilizar multi-Claude. Evita los fallos específicos que producen los flujos de trabajo genéricos de IA:

- **Desviación:** los roles se mantienen dentro de su ámbito. El producto no se rediseña. El frontend no redefine el alcance. El backend no inventa la dirección del producto.
- **Finalización falsa:** la definición de "completado" es concreta. El trabajo que oculta lagunas, omite la verificación o resuelve un problema diferente se rechaza.
- **Contaminación:** los proyectos derivados o heredados conservan residuos de identidad. Role OS detecta y rechaza la desviación entre proyectos en la terminología, los elementos visuales y los modelos mentales.
- **Progreso basado en "sensaciones":** cada transferencia es estructurada. Cada evaluación se vincula a pruebas. "Parece terminado" no es un estado válido.

## Cómo funciona

Describe tu tarea. Role OS decide automáticamente el nivel de orquestación adecuado.

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

**La jerarquía de respaldo:**

1. **Misión:** cuando la tarea coincide con un flujo de trabajo recurrente probado (corrección de errores, tratamiento, lanzamiento de funciones, documentación, seguridad, investigación, lluvia de ideas, auditoría exhaustiva, prueba con usuarios). Cadena de roles conocida, flujo de artefactos, ramas de escalamiento y definiciones honestas y parciales.
2. **Paquete:** cuando la tarea pertenece a una familia conocida, pero no tiene la estructura completa de una misión. 10 paquetes de equipo calibrados con selección automática y mecanismos de protección contra errores.
3. **Enrutamiento libre:** cuando la tarea es novedosa, mixta o incierta. Evalúa los 61 roles en función del contenido del paquete y ensambla una cadena dinámica.

El sistema nunca fuerza la ejecución de una tarea a través de una abstracción incorrecta. Explica por qué eligió cada nivel y ofrece alternativas.

**Un solo comando para iniciar la ejecución:**

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

**Intervenciones cuando algo sale mal:**

```bash
roleos retry 0                 # Retry a failed step
roleos reroute 1 "Frontend Developer" "UI bug"  # Swap a role
roleos escalate "Test Engineer" "Repo Researcher" "missed edge case" "re-diagnose"
roleos block 2 "waiting for API spec"
roleos reopen 0 "found issue in review"
```

Las ejecuciones se guardan en el disco (`.claude/runs/`), por lo que las sesiones interrumpidas se reanudan sin problemas. Cada paso incluye una guía para el operador: qué producir, las secciones requeridas y las condiciones de finalización.

**Una vez enrutada:**

1. **Cada rol produce una transferencia:** salida estructurada con elementos de prueba que reducen la ambigüedad para el siguiente rol.
2. **El crítico revisa según el contrato:** acepta, rechaza o bloquea basándose en pruebas estructuradas, no en impresiones.
3. **El enrutamiento de recuperación se realiza automáticamente:** el trabajo bloqueado o rechazado se redirige al solucionador adecuado con una razón, el tipo de recuperación y el artefacto requerido.

## Distribución consciente del presupuesto

Role OS puede consultar a un **analista de presupuesto de tokens** local en cada paso de la distribución y adjuntar una previsión de gasto orientativa al manifiesto: opcional (`ROLEOS_BUDGET_CONSULT`), orientativa (nunca bloquea una distribución) y con un mecanismo de seguridad que vuelve a una línea de base determinista. Desactivado por defecto; la previsión es local y gratuita. Consulte el [manual](https://mcp-tool-shop-org.github.io/role-os/handbook/specialist-budget/).

## Estado de la implementación a nivel de organización

El estado de la implementación a nivel de organización (cola, decisiones, registros de auditoría, paquetes de bloqueo por repositorio) se encuentra en un repositorio privado independiente: [`role-os-rollout`](https://github.com/mcp-tool-shop-org/role-os-rollout). Este repositorio es el producto; ese repositorio es el estado operativo.

## Memoria y continuidad

Role OS no posee ni duplica la capa de memoria. Donde existe la memoria del proyecto Claude, es el sistema de continuidad canónico: los hechos del repositorio, las decisiones, los puntos pendientes y el historial del tratamiento se almacenan allí.

Role OS se integra con la memoria del proyecto Claude. No la reemplaza.

## Tratamiento completo y verificación final

El tratamiento completo es un protocolo canónico de 7 fases definido en la memoria del proyecto Claude (`memory/full-treatment.md`). Role OS enruta y revisa los tratamientos utilizando contratos de roles, transferencias y puertas de control: no redefine el protocolo.

La **verificación final** es la puerta de control de calidad de 31 elementos que se ejecuta antes del tratamiento completo. Las puertas de control A-D deben superarse antes de que comience cualquier tratamiento. Referencia canónica: `memory/shipcheck.md`.

Orden: verificación final primero, luego tratamiento completo. No se lanzará la versión 1.0.0 sin superar las puertas de control obligatorias.

## 61 roles en 10 paquetes

| Paquete | Roles |
|------|-------|
| **Core** (3) | Orquestador, estratega de producto, revisor crítico |
| **Engineering** (7) | Desarrollador frontend, ingeniero backend, ingeniero de pruebas, ingeniero de refactorización, ingeniero de rendimiento, auditor de dependencias, revisor de seguridad |
| **Design** (2) | Diseñador de UI, guardián de la marca |
| **Marketing** (1) | Redactor de textos de lanzamiento |
| **Treatment** (7) | Investigador de repositorios, traductor de repositorios, arquitecto de documentación, curador de metadatos, auditor de cobertura, verificador de implementación, ingeniero de lanzamiento |
| **Product** (3) | Sintetizador de comentarios, priorizador de la hoja de ruta, redactor de especificaciones |
| **Research** (4) | Investigador de UX, analista de la competencia, investigador de tendencias, sintetizador de entrevistas con usuarios |
| **Growth** (4) | Estratega de lanzamiento, estratega de contenido, gestor de la comunidad, responsable de la gestión de incidencias de soporte |
| **Deep Audit** (4) | Auditor de componentes, auditor de la verdad de las pruebas, auditor de las uniones, sintetizador de auditorías |
| **Swarm** (7) | Coordinador de la colmena, agente backend de la colmena, agente puente de la colmena, agente de pruebas de la colmena, agente de infraestructura de la colmena, agente frontend de la colmena, sintetizador de la colmena |

Cada rol tiene un contrato completo: misión, cuándo usar, cuándo no usar, entradas esperadas, salidas requeridas, estándar de calidad y desencadenantes de escalamiento. Cada rol se puede enrutar: `roleos route` puede recomendar cualquiera de ellos en función del contenido del paquete.

## Inicio rápido

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

## Cuándo no usar Role OS

- Correcciones de una sola línea, errores tipográficos u errores evidentes
- Investigación exploratoria sin resultados definidos
- Trabajo que cabe en la cabeza de una persona en 5 minutos
- Correcciones urgentes que deben enviarse antes de que se complete la cadena de revisión
- Proyectos en los que se prioriza la velocidad sobre la estructura

## Evidencia

Se demostró la eficacia de Role OS en tres configuraciones de prueba en dos repositorios estructuralmente diferentes:

**Prueba 001: Trabajo de funciones** (Pantalla de la tripulación, Star Freight)
- Cadena de 7 roles, 45 escenarios de prueba, 0 conflictos de roles
- Evitó la contaminación del ancestro de la bifurcación, detectó la invención en línea y reveló obstáculos reales

**Prueba 002: Trabajo de integración** (Conexión de CampaignState, Star Freight)
- Cadena de 5 roles, resolvió la discontinuidad arquitectónica sin recurrir a soluciones provisionales
- Las pruebas anti-provisional demostraron que la ruta activa es real, no un marcador de posición

**Prueba 003: Trabajo de identidad** (Purga de contaminación, Star Freight)
- Cadena de 6 roles, 51 escenarios de prueba, incluida una defensa duradera contra la contaminación de CI
- Reparó la desviación heredada sin colapsar en una reestructuración amplia

**Prueba de portabilidad** (Consistencia de la persona, humor del sensor)
- Misma estructura, diferente idioma/dominio/pila
- Adoptado con cambios de contexto únicamente, sin modificaciones del contrato principal

**Tratamiento completo FT-001** (portlight-desktop)
- Tratamiento de 7 fases con roles del Treatment Pack
- Se demostró la validación de Shipcheck, cero conflictos de roles

**Tratamiento completo FT-002** (studioflow)
- Mismo Treatment Pack, repositorio estructuralmente diferente (espacio de trabajo creativo frente a juego)
- El Treatment Pack es portátil, no se necesitan modificaciones del contrato

**Sesión de lluvia de ideas** (tema del mercado de servidores MCP)
- Cadena de 9 roles, 4 analistas en paralelo, examen cruzado + refutación del gráfico de disputas
- Se plantearon 4 desafíos, se redujeron 3 afirmaciones, 1 sin resolver: presión saludable, no un punto muerto
- Más de 16 enlaces de rastreo desde los artefactos renderizados hasta los átomos de la capa de verdad
- Se demostró la cadena completa de custodia: verdad → átomos → disputa → síntesis → expansión → juicio → renderizado → rastreo

## Propiedades principales

Estas son innegociables. Si un cambio debilita alguna de ellas, rechácelo.

- Los límites de los roles se mantienen
- La revisión es rigurosa
- La escalada se mantiene honesta
- Los paquetes siguen siendo comprobables
- La portabilidad requiere adaptación al contexto, no cirugía del núcleo

## Estructura del proyecto

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

## Seguridad

Role OS opera **solo localmente**. Copia las plantillas de Markdown y escribe los archivos de paquetes/verdictos en el directorio `.claude/` de su repositorio. No accede a la red, no gestiona secretos ni recopila datos de telemetría. No realiza operaciones peligrosas: todos los archivos se escriben utilizando la opción "omitir si existe" de forma predeterminada. Consulte [SECURITY.md](SECURITY.md) para obtener la política completa.

## El sistema operativo

| Capa | Qué hace | Estado |
|-------|-------------|--------|
| **Routing** | Califica los 61 roles según el contenido del paquete, explica las recomendaciones y evalúa la confianza | ✓ Enviado |
| **Chain builder** | Ensambla cadenas ordenadas por fases a partir de roles calificados, con un sesgo hacia el tipo de paquete, no bloqueado por plantillas | ✓ Enviado |
| **Conflict detection** | Validación de 4 pasos: conflictos duros, secuencia, redundancia, lagunas de cobertura. Sugerencias de reparación. | ✓ Enviado |
| **Escalation** | Enruta automáticamente el trabajo bloqueado/rechazado/dividido al resolutor correcto con la razón y el artefacto requerido | ✓ Enviado |
| **Evidence** | Evidencia estructurada consciente del rol en los veredictos. Comprobaciones de suficiencia. 12 tipos de evidencia. | ✓ Enviado |
| **Dispatch** | Genera manifiestos de ejecución para multi-claude. Perfiles de herramientas por rol, indicaciones del sistema, presupuestos. | ✓ Enviado |
| **Trials** | Lista completa probada: 30/30 tareas de oro + 5/5 pruebas negativas. 7 pruebas de paquetes completadas. | ✓ Completo |
| **Team Packs** | 10 paquetes calibrados con selección automática, protecciones de desajuste y alternativa de enrutamiento libre. | ✓ Enviado |
| **Outcome calibration** | Registra los resultados de la ejecución, ajusta los pesos de los paquetes/roles a partir de los resultados y ajusta los umbrales de confianza. | ✓ Enviado |
| **Mixed-task decomposition** | Detecta el trabajo compuesto, lo divide en paquetes secundarios, asigna paquetes y conserva las dependencias. | ✓ Enviado |
| **Composite execution** | Ejecuta los paquetes secundarios en orden de dependencia con el paso de artefactos, la recuperación de ramas y la síntesis. | ✓ Enviado |
| **Adaptive replanning** | Los cambios de alcance, los hallazgos o los nuevos requisitos a mitad de la ejecución actualizan el plan sin reiniciar. | ✓ Enviado |
| **Session spine** | `roleos init claude` crea CLAUDE.md, /roleos-route, /roleos-review, /roleos-status. `roleos doctor` verifica la configuración. Las tarjetas de ruta demuestran la participación. | ✓ Enviado |
| **Hook spine** | 5 ganchos del ciclo de vida (SessionStart, PromptSubmit, PreToolUse, SubagentStart, Stop). Aplicación de asesoramiento: recordatorios de la tarjeta de ruta, validación de la escritura de herramientas, inyección del rol del subagente, auditoría de finalización. | ✓ Enviado |
| **Artifact spine** | Contratos de artefactos por rol. Contratos de transferencia de paquetes. Validación estructural. Comprobaciones de la integridad de la cadena. Los roles posteriores nunca adivinan lo que recibieron. | ✓ Enviado |
| **Mission library** | 9 misiones nombradas (envío de funciones, corrección de errores, tratamiento, lanzamiento de documentación, fortalecimiento de la seguridad, lanzamiento de investigación, lluvia de ideas, auditoría profunda, prueba en grupo). Cada una declara el paquete, la cadena de roles, el flujo de artefactos, las ramas de escalada y la definición honesta-parcial. | ✓ Enviado |
| **Mission runner** | Cree ejecuciones, avance paso a paso con el estado rastreado, complete/falle con informes honestos. Propagación de pasos bloqueados, advertencias de escalada fuera de la cadena, reapertura del último paso. | ✓ Enviado |
| **Unified entry** | `roleos start` decide automáticamente la misión frente al paquete frente al enrutamiento libre. Escalera de respaldo con puntuaciones de confianza, alternativas y detección de composición. | ✓ Enviado |
| **Persistent runs** | `roleos run` crea ejecuciones respaldadas por disco. `resume`, `next`, `explain`, `complete`, `fail`. Intervenciones: reroute, escalate, retry, block, reopen. Guía local del paso. Medición de la fricción. | ✓ Enviado |
| **Brainstorm** | Arquitectura de dos capas: verdad (esquemas nativos del rol, átomos de procedencia, gráfico de disputas de examen cruzado) + renderizado (5 voces distintas, prohibiciones léxicas, transcripción del debate). Los enlaces de rastreo demuestran que cada afirmación renderizada se asigna a un átomo de verdad. Sesión de prueba exitosa. | ✓ Enviado |
| **Deep Audit** | Auditoría de repositorio basada en manifiestos: descomponer el repositorio en componentes, asignar N auditores + M auditores de pruebas de veracidad + K auditores de límites a partir del grafo de dependencias, sintetizar en un veredicto clasificado y un plan de acción. La asignación dinámica se escala con el tamaño del repositorio (fórmula 2N + K + 3). Ejecución nativa con validación de artefactos en cada paso. | ✓ Enviado |
| **Dogfood Swarm** | Convergencia de múltiples pasos: tres etapas de verificación (errores/seguridad → proactiva → humanización) y luego paso de características. Propiedad exclusiva de archivos, puertas de control después de cada iteración, puntos de control del usuario. La detección automática de dominios genera manifiestos. Puente de evidencia hacia los laboratorios de pruebas internas. | ✓ Enviado |

## 9 misiones

| Misión | Paquete | Roles | Cuándo usar |
|---------|------|-------|-------------|
| `feature-ship` | característica | 5 | Entrega completa de una característica: alcance → especificación → implementación → prueba → revisión |
| `bugfix` | corrección de errores | 4 | Diagnosticar la causa raíz, corregir, probar, verificar |
| `treatment` | tratamiento | 4 | Revisión previa al lanzamiento + pulido + documentación + verificación de CI + revisión |
| `docs-release` | documentación | 2 | Escribir/actualizar la documentación, notas de la versión |
| `security-hardening` | seguridad | 4 | Modelo de amenazas, auditoría, corrección de vulnerabilidades, reauditoría, verificación |
| `research-launch` | investigación | 4 | Formular la pregunta, investigar, documentar los hallazgos, decidir |
| `brainstorm` | lluvia de ideas | 9 | Consulta estructurada con múltiples perspectivas, desacuerdo rastreable y resultado verificable |
| `deep-audit` | auditoría profunda | 5 (escalas) | Auditoría de repositorio basada en manifiestos: el número de trabajadores se escala con el grafo del repositorio mediante la asignación dinámica |
| `dogfood-swarm` | enjambre | 8 (escalas) | Convergencia de múltiples pasos: verificación-a → verificación-b → verificación-c → característica → síntesis final |

Cada misión incluye definiciones honestas y parciales: cuando el trabajo se detiene, el sistema documenta lo que se completó y lo que queda, en lugar de simular que se completó todo.

### Misión de lluvia de ideas

No es una "lluvia de ideas con IA". La misión de lluvia de ideas se basa en **roles especializados bajo la ley, con desacuerdo rastreable y resultados verificables.**

```bash
roleos run "explore product directions for a developer tool discovery platform"
# → MISSION: Brainstorm (Structured Inquiry)
#   Chain: 4 Analysts (parallel) → Normalize → Cross-Examine → Rebut → Synthesize → Expand → Judge
```

**Qué la hace diferente:**

- **Capa 1 (veracidad):** Cuatro analistas emiten esquemas nativos de su rol (ContextMap, UserValueMap, MechanicsMap, PositioningMap), no prosa compartida. Cada rol tiene limitaciones impuestas: frases prohibidas, tipos de afirmaciones prohibidas, particiones de entrada filtradas. Los átomos llevan información de procedencia. Un grafo de interrogatorio cruzado dirigido produce desafíos específicos. Los analistas originales defienden, limitan o retiran sus afirmaciones bajo presión.

- **Capa 2 (representación):** Cinco voces humanas distintas (Memorándum de límites, Notas de campo, Esquema del sistema, Resumen de afirmaciones, Transcripción del interrogatorio cruzado) con prohibiciones léxicas que impiden la convergencia de las voces. La síntesis consume la veracidad, nunca la prosa representada. Ambas capas siempre están disponibles.

- **Cadena de custodia:** Cada oración representada se remonta a un átomo de la capa de veracidad. Las direcciones de síntesis citan átomos. Los objetivos del interrogatorio cruzado son identificadores de afirmaciones reales. El grafo de disputa es el producto, no la prosa.

**Probado:** Ejecución de referencia v0.4: se verificó la cadena de custodia completa. Consulte [`examples/golden-run.md`](examples/golden-run.md) para ver la cadena de artefactos completa.

### Misión de auditoría profunda

No es un escaneo superficial. La misión de auditoría profunda **descompone un repositorio en componentes delimitados y asigna auditores especializados a una escala determinada por el propio grafo de dependencias del repositorio.**

```bash
roleos run "deep audit this repo" --manifest=audit-manifest.json
# → MISSION: Deep Audit (Manifest-Scaled)
#   Steps: Component Auditor ×6 + Test Truth Auditor ×6 + Seam Auditor ×8 + Synthesizer + Action Plan + Critic = 23 steps
```

**Qué la hace diferente:**

- **Asignación dinámica:** el número de trabajadores no es fijo. Un repositorio de 10 componentes con 5 clústeres de límites produce 28 pasos (2 × 10 + 5 + 3). Un repositorio de 3 componentes produce 12. La fórmula de escalado es `2N + K + 3`, donde N = componentes, K = límites.
- **Paquetes basados en manifiestos:** un archivo `audit-manifest.json` define los componentes (con rutas de archivo, recuentos de líneas, descripciones) y los límites (de/a con descripciones de la interfaz). Cada auditor recibe solo su paquete.
- **Cuatro arquetipos de roles:** Auditor de componentes (veracidad del código por módulo), Auditor de pruebas de veracidad (pruebas que demuestran vs. pruebas que existen), Auditor de límites (límites de integración del grafo de dependencias), Sintetizador de auditoría (veredicto clasificado + plan de acción de todos los paquetes).
- **Validación de artefactos en cada paso:** `validateArtifact()` se activa en cada paso completado en ambos caminos de ejecución. Los resultados se adjuntan a los objetos de paso. El sistema sabe si cada artefacto cumplió con su contrato.
- **Honestidad parcial:** cuando el presupuesto o el alcance impiden la finalización, los hallazgos por componente son individualmente válidos. El sistema sintetiza a partir de lo que se completó, nunca simula una cobertura completa.

**Probado:** Ejecución nativa de Runner: 18 pruebas contra un manifiesto real, se verificó el ciclo de vida completo, incluida la reapertura de la escalada y el fallo parcial. Se verificó la fórmula de escalado para manifiestos de 3/6/10/15 componentes.

### Misión de enjambre de pruebas internas

No es un análisis de un solo paso. La misión de enjambre de pruebas internas **ejecuta un protocolo de convergencia de múltiples pasos que mueve un repositorio de "funciona" a "listo para producción" a través de tres etapas de verificación y la entrega iterativa de características.**

```bash
roleos swarm
# → MISSION: Dogfood Swarm (Multi-Pass Convergence)
#   Stages: Health-A → Health-B → Health-C → Feature → Final
#   Domain agents: 3-5 parallel per wave (exclusive file ownership)
```

**Qué la hace diferente:**

- **Proceso de verificación en tres etapas:** la etapa A corrige errores y problemas de seguridad (se repite hasta que no haya más errores CRÍTICOS ni ALTOS). La etapa B aplica medidas de seguridad proactivas (los usuarios revisan los resultados). La etapa C humaniza el código: mensajes de error que ayudan a los usuarios, comentarios sobre la reconexión, estados de carga, accesibilidad. Cada etapa es una lente distinta, no es la misma verificación repetida.
- **Propiedad exclusiva de archivos:** cada agente de dominio posee archivos específicos a través de `swarm-manifest.json`. Ningún agente edita el mismo archivo. No hay conflictos de fusión. No hay sobrecarga de coordinación.
- **Barreras de compilación:** después de cada iteración, deben superarse las pruebas de lint, verificación de tipos y pruebas. El sistema detecta automáticamente el sistema de compilación (Node, Rust, Python, Go) y ejecuta los comandos correspondientes.
- **Puntos de control del usuario:** la etapa Health-B y la etapa de características requieren la aprobación explícita del usuario antes de la ejecución. El sistema presenta los resultados y el usuario decide qué compilar.
- **Convergencia iterativa:** las etapas se repiten en bucle con las iteraciones hasta que se cumplen las condiciones de salida o se alcanza el número máximo de iteraciones. Cada iteración vuelve a auditar desde cero para detectar regresiones introducidas por correcciones anteriores.
- **Detección automática de dominio:** `roleos swarm manifest --generate` detecta el tipo de repositorio (CLI, web, escritorio, MCP, monorepositorio) y genera asignaciones de dominio que no se superponen.

**Probado:** claude-collaborate (28-03-2026) — 35→129 pruebas, 106 problemas de verificación resueltos, versión v1.1.0 lanzada. Protocolo v2.0 con 9 fases.

## Estado

Estable y en producción. Consulte el [REGISTRO DE CAMBIOS](CHANGELOG.md) para obtener el historial completo de versiones y los cambios realizados en cada lanzamiento.

## Licencia

MIT

---

Creado por <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a>
