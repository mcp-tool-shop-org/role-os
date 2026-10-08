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

Una capa operativa nativa de repositorios que asigna personal, enruta, valida y ejecuta el trabajo de los agentes de codificación a través de 61 contratos de roles especializados. Crea paquetes de tareas, ensambla el equipo adecuado a partir de la correspondencia de roles calificada, detecta fallas en las cadenas antes de la ejecución, enruta automáticamente la recuperación cuando el trabajo se bloquea o se rechaza y requiere evidencia estructurada en cada evaluación. Incluye una distribución dinámica para misiones a gran escala: un repositorio de 10 componentes se convierte automáticamente en 28 pasos de auditoría, no 6.

El adaptador de Claude Code se envía (`roleos init` crea `.claude/`). Los contratos son en formato Markdown, que cualquier marco de codificación puede utilizar; este repositorio no afirma que ya se esté ejecutando un segundo adaptador.

## Qué hace

Role OS es la forma profesional de asignar personal al trabajo de los agentes de codificación. Evita las fallas específicas que producen los flujos de trabajo de IA genéricos:

- **Desviación:** los roles se mantienen dentro de su ámbito. El producto no se rediseña. El frontend no redefine el alcance. El backend no inventa la dirección del producto.
- **Finalización falsa:** la definición de "completado" es concreta. El trabajo que oculta lagunas, omite la verificación o resuelve un problema diferente se rechaza.
- **Contaminación:** los proyectos bifurcados o heredados conservan residuos de identidad. Role OS detecta y rechaza la desviación entre proyectos en la terminología, los elementos visuales y los modelos mentales.
- **Progreso basado en "sensaciones":** cada transferencia es estructurada. Cada evaluación se vincula a la evidencia. "Parece terminado" no es un estado válido.

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

**La escala de respaldo:**

1. **Misión:** cuando la tarea coincide con un flujo de trabajo recurrente probado (corrección de errores, tratamiento, lanzamiento de funciones, documentación, seguridad, investigación, lluvia de ideas, auditoría exhaustiva, prueba con usuarios). Cadena de roles conocida, flujo de artefactos, ramas de escalamiento y definiciones honestas y parciales.
2. **Paquete:** cuando la tarea pertenece a una familia conocida, pero no tiene la forma completa de una misión. 10 paquetes de equipo calibrados con selección automática y protecciones contra incompatibilidades.
3. **Enrutamiento libre:** cuando la tarea es novedosa, mixta o incierta. Evalúa los 61 roles según el contenido del paquete y ensambla una cadena dinámica.

El sistema nunca fuerza el trabajo a través de la abstracción incorrecta. Explica por qué eligió cada nivel y ofrece alternativas.

**Un comando para activar la ejecución:**

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

**Intervenciones cuando las cosas salen mal:**

```bash
roleos retry 0                 # Retry a failed step
roleos reroute 1 "Frontend Developer" "UI bug"  # Swap a role
roleos escalate "Test Engineer" "Repo Researcher" "missed edge case" "re-diagnose"
roleos block 2 "waiting for API spec"
roleos reopen 0 "found issue in review"
```

Las ejecuciones se guardan en el disco (`.claude/runs/`), por lo que las sesiones interrumpidas se reanudan sin problemas. Cada paso incluye una guía para el operador: qué producir, las secciones requeridas y las condiciones de finalización.

**Una vez enrutado:**

1. **Cada rol produce una transferencia:** salida estructurada con elementos de evidencia que reducen la ambigüedad para el siguiente rol.
2. **El crítico revisa según el contrato:** acepta, rechaza o bloquea en función de la evidencia estructurada, no de la impresión.
3. **Las rutas de recuperación se enrutan automáticamente:** el trabajo bloqueado o rechazado se enruta al solucionador adecuado con una razón, el tipo de recuperación y el artefacto requerido.

## Distribución con conocimiento del presupuesto

Role OS puede consultar a un **analista de presupuesto de tokens** local para cada paso de la distribución y adjuntar una previsión de gasto orientativa al manifiesto: opcional (`ROLEOS_BUDGET_CONSULT`), orientativa (nunca bloquea una distribución) y con una alternativa segura a una línea de base determinista. Desactivado por defecto; la previsión es local y se puede ejecutar de forma gratuita. Consulte el [manual](https://mcp-tool-shop-org.github.io/role-os/handbook/specialist-budget/).

## Supervisión de llamadas a herramientas

Role OS verifica y controla las llamadas a herramientas en la unión `PreToolUse`, de forma determinista y sin ningún modelo en el camino principal:

- **Observador de conformidad** (orientativo, alternativa segura): un esquema determinista + un límite de contrato computable verifica una llamada propuesta con su contrato de herramienta catalogado y adjunta una evaluación orientativa sobre una llamada *comprobadamente* no conforme; nunca bloquea. Un límite LLM opcional (`ROLEOS_CONFORMANCE_CONSULT`) gestiona los residuos genuinamente semánticos.
- **Control de capacidad** (alternativa segura, opcional `ROLEOS_CAPABILITY_GATE`, desactivado por defecto): privilegio mínimo determinista en las acciones *irreversibles* (publicación en npm/PyPI, `gh release`, `git push`, ediciones de repositorio, implementación en Pages). Se deniega una acción controlada a menos que el director haya concedido su capacidad en `.claude/role-os/capabilities.json`, por lo que un paso incorrecto (un error honesto o uno inyectado) no puede desencadenar una acción irreversible no autorizada. El complemento preventivo de la regla del compensador con nombre. Consulte el [manual](https://mcp-tool-shop-org.github.io/role-os/handbook/).

## Expediente del equipo

Cada rol tiene un **expediente**, una ficha de personaje que también sirve como configuración en tiempo de ejecución. Seis aptitudes (rigor, ritmo, alcance, escepticismo, autonomía, franqueza) se corresponden con controles de distribución reales; una capa de **disposición** de ocho arquetipos (escéptico, constructor, investigador, inconformista...) contiene una instrucción de comportamiento; y cada rol tiene un retrato y una calificación. Explore todo el equipo como una galería (`dossier/dossier.html`); el radar de cada rol muestra su configuración ajustada en comparación con su ideal canónico.

Cuando un rol tiene un expediente, la distribución inyecta una **postura operativa**: la instrucción de comportamiento de la disposición más una línea de postura de las aptitudes del rol, por lo que la ficha realmente configura el rol. Opcional y aditivo: los roles sin un expediente se comportan exactamente como antes. Consulte el [manual](https://mcp-tool-shop-org.github.io/role-os/handbook/crew-dossier/).

## Estado de implementación a nivel de organización

El estado de implementación a nivel de organización (cola, decisiones, registros de auditoría, paquetes de bloqueo por repositorio) se encuentra en un repositorio **privado** e interno de la organización (`role-os-rollout`). Este repositorio es el producto; ese repositorio es el estado operativo.

## Memoria y continuidad

Role OS no posee ni duplica la capa de memoria. Cuando existe una tienda de memoria de proyectos de un marco, es el sistema de continuidad canónico: los hechos del repositorio, las decisiones, los puntos pendientes y el historial del tratamiento se almacenan allí.

Role OS se integra con esa tienda cuando está presente. No la reemplaza.

## Tratamiento completo y verificación antes del envío

El tratamiento completo es un protocolo canónico de 7 fases definido en la memoria del proyecto del estudio (`memory/full-treatment.md`). Role OS gestiona y revisa los tratamientos utilizando contratos de rol, transferencias y puntos de control de los revisores; no redefine el protocolo.

La **verificación antes del envío** es la puerta de control de calidad de 31 elementos que se ejecuta antes del tratamiento completo. Las puertas de control estrictas A-D deben superarse antes de que comience cualquier tratamiento. Referencia canónica: `memory/shipcheck.md`.

Orden: primero la verificación antes del envío, luego el tratamiento completo. No se permite la versión 1.0.0 sin superar las puertas de control estrictas.

## El catálogo de 61 roles

El catálogo agrupa sus 61 roles en 11 familias. (Dispatch utiliza un conjunto separado de 10 **paquetes de equipo** —características, corrección de errores, seguridad, documentación, lanzamiento, investigación, tratamiento, auditoría exhaustiva, lluvia de ideas, trabajo en equipo— que obtienen roles de estas familias).

| Familia | Roles |
|--------|-------|
| **Core** (2) | Orquestador, revisor crítico |
| **Product** (4) | Estratega de producto, sintetizador de comentarios, priorizador de la hoja de ruta, redactor de especificaciones |
| **Engineering** (7) | Desarrollador de frontend, ingeniero de backend, ingeniero de pruebas, ingeniero de refactorización, ingeniero de rendimiento, auditor de dependencias, revisor de seguridad |
| **Design** (2) | Diseñador de UI, guardián de la marca |
| **Marketing** (1) | Redactor de textos para el lanzamiento |
| **Treatment** (7) | Investigador de repositorios, traductor de repositorios, arquitecto de documentación, curador de metadatos, auditor de cobertura, verificador de implementación, ingeniero de lanzamiento |
| **Research** (4) | Investigador de UX, analista de la competencia, investigador de tendencias, sintetizador de entrevistas con usuarios |
| **Growth** (4) | Estratega de lanzamiento, estratega de contenido, gestor de la comunidad, responsable de la gestión de incidencias de soporte |
| **Brainstorm** (19) | Explorador de contexto, explorador de valor para el usuario, explorador de saltos creativos, explorador de mecánicas, explorador de mercado, explorador disidente, explorador de viabilidad, explorador de estándares de calidad, analista de contexto, analista de valor para el usuario, analista de mecánicas, analista de posicionamiento, analista disidente, normalizador, sintetizador, expansor de productos, expansor de escenarios, expansor de ventajas competitivas, juez |
| **Deep Audit** (4) | Auditor de componentes, auditor de la veracidad de las pruebas, auditor de las uniones, sintetizador de auditorías |
| **Swarm** (7) | Coordinador del equipo, agente de backend del equipo, agente de conexión del equipo, agente de pruebas del equipo, agente de infraestructura del equipo, agente de frontend del equipo, sintetizador del equipo |

Cada rol tiene un contrato completo: misión, cuándo usarlo, cuándo no usarlo, entradas esperadas, salidas requeridas, estándares de calidad y factores desencadenantes de escalamiento. Cada rol se puede gestionar; `roleos route` puede recomendar cualquiera de ellos en función del contenido del paquete.

## Guía de inicio rápido

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

## Cuándo no usar Role OS

- Correcciones de una sola línea, errores tipográficos o errores obvios
- Investigación exploratoria sin una salida definida
- Trabajo que cabe en la cabeza de una persona en 5 minutos
- Correcciones urgentes que deben enviarse antes de que se complete una cadena de revisión
- Proyectos en los que se prioriza la velocidad sobre la estructura

## Evidencia

Se demostró la eficacia de Role OS en tres modelos de prueba en dos repositorios estructuralmente diferentes:

**Prueba 001: trabajo en características** (pantalla de la tripulación, Star Freight)
- Cadena de 7 roles, 45 escenarios de prueba, 0 conflictos de roles
- Evitó la contaminación de un ancestro de la bifurcación, detectó una invención en línea y reveló bloqueos honestos

**Prueba 002: trabajo de integración** (conexión de CampaignState, Star Freight)
- Cadena de 5 roles, resolvió una unión arquitectónica sin recurrir a soluciones provisionales
- Las pruebas anti-provisional demostraron que la ruta activa es real, no un marcador de posición

**Prueba 003: trabajo de identidad** (eliminación de la contaminación, Star Freight)
- Cadena de 6 roles, 51 escenarios de prueba, incluida una defensa duradera contra la contaminación de CI
- Reparó la desviación de la ficción heredada sin colapsar en una reestructuración amplia

**Prueba de portabilidad** (consistencia de la persona, humor del sensor)
- Misma estructura, diferente idioma/dominio/pila
- Se adoptó con cambios de contexto únicamente; no se realizaron modificaciones en el contrato principal

**Tratamiento completo FT-001** (portlight-desktop)
- Tratamiento de 7 fases con roles del paquete de tratamiento
- Se demostró la eficacia de la verificación antes del envío, sin conflictos de roles

**Tratamiento completo FT-002** (studioflow)
- Mismo paquete de tratamiento, repositorio estructuralmente diferente (espacio de trabajo creativo frente a juego)
- El paquete de tratamiento es portátil; no se necesitan modificaciones en el contrato

**Lluvia de ideas: ejecución óptima** (tema del mercado de servidores MCP)
- Cadena de 9 roles, 4 analistas en paralelo, examen cruzado + refutación del gráfico de disputas
- Se plantearon 4 desafíos, se redujeron 3 afirmaciones, 1 sin resolver; presión saludable, no un punto muerto
- 16+ enlaces de rastreo desde los artefactos renderizados hasta los átomos de la capa de verdad
- Se demostró la cadena de custodia completa: verdad → átomos → disputa → síntesis → expansión → juez → renderizado → rastreo

## Propiedades principales

Estas son innegociables. Si un cambio debilita alguna de ellas, rechácelo.

- Los límites de los roles se mantienen
- La revisión tiene peso
- El escalamiento se mantiene honesto
- Los paquetes se pueden probar
- La portabilidad requiere adaptación al contexto, no cirugía en el núcleo

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

La cobertura de líneas medida para esta versión es del 90,66 % (22778/25123). El umbral de CI se mantiene en el 90 %.

## Seguridad

De forma predeterminada, Role OS opera solo en el **sistema de archivos local**. Copia plantillas de Markdown y escribe archivos de paquete/veredicto/ejecución en el directorio `.claude/` de su repositorio. El funcionamiento predeterminado no realiza ninguna solicitud de red, no gestiona secretos y no recopila telemetría. No se realizan operaciones peligrosas; de forma predeterminada, todas las escrituras de archivos utilizan la opción "omitir si existe".

Tres características **opcionales** acceden a la red cuando las habilita explícitamente:

- **`roleos verify-citations`** — ejecuta comandos en la herramienta externa `prism` CLI, que resuelve los identificadores de citas en las API públicas de arXiv/Crossref (envía los ID/URL de las citas que se están verificando).
- **Nivel de especialista** (`roleos specialist`, roles registrados) — envía indicaciones a la herramienta `backend_url` que configure en `.role-os/specialists.json` (normalmente un punto final de modelo local).
- **Consulta de presupuesto/conformidad** (`ROLEOS_BUDGET_CONSULT` / `ROLEOS_CONFORMANCE_CONSULT`) — envía el contexto del paso/llamada a la herramienta a un modelo local a través de HTTP para obtener un veredicto de asesoramiento.

Los tres están desactivados por defecto y, en caso de fallo, permiten un comportamiento local determinista. Consulte [SECURITY.md](SECURITY.md) para conocer la política completa.

## Tarjetas de recetas, el jurado y la calibración de paquetes

Un crítico capacitado solo es tan bueno como los datos de los que aprendió. Role OS registra esos datos en una tarjeta de receta, evalúa un panel de críticos y permite que una ejecución final mejore la selección de paquetes. Ninguno de estos procesos invoca un modelo. El mismo archivo y la misma semilla producen los mismos números.

### Tarjetas de recetas

`roleos recipe` verifica una tarjeta (`roleos-recipe-card/v1`). Nueve controles estándar, cada uno de ellos, evalúa una forma en que un crítico puede parecer bueno sin haber aprendido su atributo. Un control superado sin una medida es una deficiencia. Una medida inconsistente es un error. `shuffled-labels` debe utilizar el método `balanced-permutation`. `same-generator-no-error`: cuando ambos métodos de edición se registran y sus intervalos no se superponen, el estado debe ser `unresolved`, o la verificación fallará. `reversed-correction` solo se supera cuando su intervalo de precisión se encuentra completamente por encima de 0,5.

```bash
roleos recipe check starter-pack/examples/auditor-recipe-card.json
```

Ese archivo es una tarjeta sintética completa, no un crítico capacitado. La verificación imprime:

```
✓ starter-pack/examples/auditor-recipe-card.json (auditor-v1, role Auditor)
  note     controls[2] (shuffled-labels): permutation floor is 1/20; a pass at this floor means the observed result beat every null
  controls 9/9 standard controls passed
  sha256   5763c4dd57fc9f7bea41186493e56b72ce73a5e30f4c5c813248655a360b1588
```

La nota es un hecho, no una deficiencia. `roleos specialist register` toma `--recipe` y registra el ID y el hash de la tarjeta en esa versión. Consulte el [manual](https://mcp-tool-shop-org.github.io/role-os/handbook/recipe-cards/).

### Jurado

`roleos jury select` mantiene un panel solo cuando un intervalo anidado y agrupado indica que el panel supera al mejor crítico individual. De lo contrario, la decisión es ese crítico, o `insufficient-data` con menos de 30 elementos o 10 grupos. Un crítico cuya tarjeta tiene un control estándar fallido o no resuelto se excluye, a menos que `--allow-unproven`. Un crítico sin tarjeta sigue participando, a menos que `--require-recipe`. Las puntuaciones nunca se invierten. La misma semilla repite los mismos números.

```bash
roleos jury select starter-pack/examples/jury-validation.json --seed 0
```

En este archivo sintético, la decisión es `best-single (echo)`. echo y sharp cometen los mismos errores, por lo que la consistencia de los errores es de 1,0000 y las etiquetas de duplicados los identifican. La etiqueta no excluye a ninguno de los dos críticos. El intervalo anidado es [-0,1000, 0,0000]. Toca el 0, por lo que no se encuentra completamente por encima de 0, e incluso con --out no escribiría ningún archivo de panel, porque --out escribe uno solo para una decisión de panel. El [manual](https://mcp-tool-shop-org.github.io/role-os/handbook/jury/) contiene el informe completo.

### Calibración de paquetes

Cuando una ejecución termina, Role OS agrega una línea de resultado. El mismo ID de ejecución no escribe una segunda línea. Después de que un paquete tiene al menos 5 resultados registrados, cada ejecución completada con correcciones 0 agrega +0,5 a ese paquete, con un máximo de +2. La mejora solo se aplica a paquetes con los que las palabras clave ya coincidían. La confianza se mantiene alta en 3 coincidencias de palabras clave y media en 2, obtenidas de la puntuación de palabras clave, no de la puntuación mejorada. Los pesos de Role no cambian. Los umbrales de confianza no cambian. El informe de calibración puede sugerir analizar el límite de palabras clave. Role OS no aplica esa sugerencia.

`ROLEOS_NO_CALIBRATION=1` desactiva la mejora. La grabación continúa.

```bash
roleos calibration
```

En un directorio sin un registro de resultados, esto imprime:

```
no recorded runs yet
```

`roleos route --verbose` y `roleos explain` imprimen la mejora, el recuento de ejecuciones y la tasa de limpieza cuando el registro los tiene. Consulte el [manual](https://mcp-tool-shop-org.github.io/role-os/handbook/calibration/).

## El sistema operativo

| Capa | Qué hace | Estado |
|-------|-------------|--------|
| **Routing** | Evalúa los 61 roles con el contenido del paquete, explica las recomendaciones, evalúa la confianza | ✓ Lanzado |
| **Chain builder** | Ensambla cadenas ordenadas por fases a partir de roles evaluados, con sesgo por tipo de paquete, no bloqueado por plantillas | ✓ Lanzado |
| **Conflict detection** | Validación de 4 pasos: conflictos graves, secuencia, redundancia, lagunas de cobertura. Sugerencias de reparación. | ✓ Lanzado |
| **Escalation** | Enruta automáticamente el trabajo bloqueado/rechazado/dividido al solucionador correcto con la razón y el artefacto requerido | ✓ Lanzado |
| **Evidence** | Evidencia estructurada consciente del rol en las decisiones. Verificaciones de suficiencia. 12 tipos de evidencia. | ✓ Lanzado |
| **Dispatch** | Genera manifiestos de ejecución para el conjunto de agentes de codificación. Perfiles de herramientas por rol, indicaciones del sistema, presupuestos. | ✓ Lanzado |
| **Trials** | Lista completa probada: 30/30 tareas de oro + 5/5 pruebas negativas. 7 pruebas de paquete completadas. | ✓ Completo |
| **Team Packs** | 10 paquetes calibrados con selección automática, protección contra desajustes y alternativa de enrutamiento libre. | ✓ Lanzado |
| **Recipe cards** | La receta de datos de un rol capacitado. Nueve controles estándar, una medida en cada control superado y un hash canónico. | ✓ Lanzado |
| **Jury** | Evalúa a los críticos capacitados. Mantiene un panel solo cuando supera al mejor crítico individual en grupos excluidos. Los controles de receta fallidos o no resueltos excluyen a un crítico. | ✓ Lanzado |
| **Outcome calibration** | Registra un resultado cuando una ejecución termina. Después de 5 resultados, una finalización correcta mejora un paquete con las palabras clave que ya coincidían (+0,5 cada una, con un máximo de +2). La confianza sigue proveniente de la puntuación de palabras clave. Los pesos de Role y los umbrales de confianza no cambian. | ✓ Lanzado |
| **Mixed-task decomposition** | Detecta el trabajo compuesto, lo divide en paquetes secundarios, asigna paquetes y conserva las dependencias. | ✓ Lanzado |
| **Composite execution** | Ejecuta los paquetes secundarios en orden de dependencia con el paso de artefactos, la recuperación de ramas y la síntesis. | ✓ Lanzado |
| **Adaptive replanning** | Los cambios de alcance a mitad de la ejecución, los hallazgos o los nuevos requisitos actualizan el plan sin reiniciar. | ✓ Lanzado |
| **Session spine** | `roleos init claude` crea CLAUDE.md, /roleos-route, /roleos-review, /roleos-status. `roleos doctor` verifica el cableado. Las tarjetas de ruta demuestran el compromiso. | ✓ Lanzado |
| **Hook spine** | 5 ganchos del ciclo de vida (SessionStart, PromptSubmit, PreToolUse, SubagentStart, Stop). Aplicación de asesoramiento: recordatorios de la tarjeta de ruta, bloqueo de la herramienta de escritura, inyección del rol del subagente, auditoría de la finalización. | ✓ Lanzado |
| **Artifact spine** | Contratos de artefactos por rol. Contratos de transferencia de paquetes. Validación estructural. Verificaciones de la integridad de la cadena. Los roles posteriores nunca adivinan lo que recibieron. | ✓ Lanzado |
| **Mission library** | 9 misiones con nombre (feature-ship, bugfix, treatment, docs-release, security-hardening, research-launch, brainstorm, deep-audit, dogfood-swarm). Cada una declara el paquete, la cadena de roles, el flujo de artefactos, las ramas de escalamiento y una definición honesta-parcial. | ✓ Lanzado |
| **Mission runner** | Crear ejecuciones, realizar un seguimiento paso a paso con el estado registrado, completar/fallar con informes honestos. Propagación de pasos bloqueados, advertencias de escalamiento fuera de la cadena, reapertura del último paso. | ✓ Lanzado |
| **Unified entry** | `roleos start` decide automáticamente entre misión, paquete o enrutamiento libre. Escalera de respaldo con puntajes de confianza, alternativas y detección compuesta. | ✓ Lanzado |
| **Persistent runs** | `roleos run` crea ejecuciones respaldadas por disco. `resume`, `next`, `explain`, `complete`, `fail`. Intervenciones: redirigir, escalar, reintentar, bloquear, reabrir. Guía local de cada paso. Medición de la fricción. | ✓ Lanzado |
| **Brainstorm** | Arquitectura de dos capas: verdad (esquemas nativos de roles, átomos de procedencia, grafo de disputa de contra-interrogatorio) + renderizado (5 voces distintas, prohibiciones léxicas, transcripción del debate). Los enlaces de seguimiento demuestran que cada afirmación renderizada se corresponde con un átomo de verdad. Ejecución óptima probada. | ✓ Lanzado |
| **Deep Audit** | Auditoría de repositorio a escala de manifiesto: descomponer el repositorio en componentes, enviar N auditores + M auditores de prueba de verdad + K auditores de límites desde el grafo de dependencias, sintetizar en un veredicto clasificado y un plan de acción. El envío dinámico se escala con el tamaño del repositorio (fórmula 2N + K + 3). Nativo del ejecutor con validación de artefactos en cada paso. | ✓ Lanzado |
| **Dogfood Swarm** | Convergencia de múltiples pasos: tres etapas de salud (error/seguridad → proactivo → humanización) y luego paso de características. Propiedad exclusiva de archivos, puertas de compilación después de cada ola, puntos de control del usuario. La detección automática de dominio genera manifiestos. Puente de evidencia hacia los laboratorios de pruebas internas. | ✓ Lanzado |

## 9 misiones

| Misión | Paquete | Roles | Cuándo usar |
|---------|------|-------|-------------|
| `feature-ship` | Característica | 5 | Entrega completa de una característica: alcance → especificación → implementación → prueba → revisión |
| `bugfix` | Corrección de errores | 4 | Diagnosticar la causa raíz, corregir, probar, verificar |
| `treatment` | Tratamiento | 4 | Verificación de envío + pulido + documentación + verificación de CI + revisión |
| `docs-release` | Documentación | 2 | Escribir/actualizar la documentación, notas de la versión |
| `security-hardening` | Seguridad | 4 | Modelo de amenazas, auditoría, corregir vulnerabilidades, reauditar, verificar |
| `research-launch` | Investigación | 4 | Formular la pregunta, investigar, documentar los hallazgos, decidir |
| `brainstorm` | Lluvia de ideas | 9 | Consulta estructurada con múltiples perspectivas, desacuerdo rastreable y resultado vinculante |
| `deep-audit` | Auditoría profunda | 5 (escalas) | Auditoría de repositorio respaldada por manifiesto: el recuento de trabajadores se escala con el grafo del repositorio mediante el envío dinámico |
| `dogfood-swarm` | Enjambre | 8 (escalas) | Convergencia de múltiples pasos: salud-a → salud-b → salud-c → característica → síntesis final |

Cada misión incluye definiciones honestas y parciales: cuando el trabajo se detiene, el sistema documenta lo que se completó y lo que queda en lugar de fingir que se completó todo.

### Misión de lluvia de ideas

No es una "lluvia de ideas con IA". La misión de lluvia de ideas es **roles especializados bajo la ley, con desacuerdo rastreable y resultados vinculantes.**

```bash
roleos run "explore product directions for a developer tool discovery platform"
# → MISSION: Brainstorm (Structured Inquiry)
#   Chain: 4 Analysts (parallel) → Normalize → Cross-Examine → Rebut → Synthesize → Expand → Judge
```

**Lo que la hace diferente:**

- **Capa 1 (verdad):** Cuatro analistas emiten esquemas nativos de roles (ContextMap, UserValueMap, MechanicsMap, PositioningMap), no prosa compartida. Cada rol tiene un sesgo reforzado: frases prohibidas, tipos de afirmaciones prohibidas, particiones de entrada filtradas. Los átomos llevan la procedencia. Un grafo de contra-interrogatorio dirigido produce desafíos específicos. Los analistas originales defienden, limitan o retiran sus afirmaciones bajo presión.

- **Capa 2 (renderizado):** Cinco voces humanas distintas (Memorándum de límites, Notas de campo, Boceto del sistema, Resumen de la afirmación, Transcripción del contra-interrogatorio) con prohibiciones léxicas que impiden la convergencia de las voces. La síntesis consume la verdad, nunca la prosa renderizada. Ambas capas siempre están disponibles.

- **Cadena de custodia:** Cada oración renderizada se remonta a un átomo de la capa de verdad. Las direcciones de síntesis citan átomos. Los objetivos del contra-interrogatorio son identificadores de afirmaciones reales. El grafo de disputa es el producto, no la prosa.

**Probado:** Ejecución óptima v0.4: cadena de custodia completa verificada. Consulte [`examples/golden-run.md`](examples/golden-run.md) para ver la cadena de artefactos completa.

### Misión de auditoría profunda

No es un escaneo superficial. La misión de auditoría profunda **descompone un repositorio en componentes delimitados y envía auditores especializados a una escala determinada por el propio grafo de dependencias del repositorio.**

```bash
roleos run "deep audit this repo" --manifest=audit-manifest.json
# → MISSION: Deep Audit (Manifest-Scaled)
#   Steps: Component Auditor ×6 + Test Truth Auditor ×6 + Seam Auditor ×8 + Synthesizer + Action Plan + Critic = 23 steps
```

**Lo que la hace diferente:**

- **Envío dinámico:** el recuento de trabajadores no es fijo. Un repositorio de 10 componentes con 5 clústeres de límites produce 28 pasos (2 × 10 + 5 + 3). Un repositorio de 3 componentes produce 12. La fórmula de escalamiento es `2N + K + 3`, donde N = componentes, K = límites.
- **Paquetes respaldados por manifiesto:** un `audit-manifest.json` define los componentes (con rutas de archivo, recuentos de líneas, descripciones) y los límites (de/a con descripciones de la interfaz). Cada auditor recibe solo su paquete.
- **Cuatro arquetipos de roles:** Auditor de componentes (verdad del código por módulo), Auditor de prueba de verdad (pruebas que demuestran vs. pruebas que existen), Auditor de límites (límites de integración del grafo de dependencias), Sintetizador de auditoría (veredicto clasificado + plan de acción de todos los paquetes).
- **Validación de artefactos en cada paso:** `validateArtifact()` se activa en cada paso completado en ambos caminos de ejecución. Los resultados se adjuntan a los objetos de paso. El sistema sabe si cada artefacto cumplió con su contrato.
- **Honestidad parcial:** cuando el presupuesto o el alcance impiden la finalización, los hallazgos por componente son individualmente válidos. El sistema sintetiza a partir de lo que se completó, nunca finge una cobertura completa.

**Probado:** Ejecución nativa del ejecutor: 18 pruebas contra un manifiesto real, ciclo de vida completo verificado, incluida la reapertura del escalamiento y el fallo parcial. Se verificó la fórmula de escalamiento para manifiestos de 3/6/10/15 componentes.

### Misión de enjambre de pruebas internas

No es un análisis de una sola pasada. La misión de enjambre de pruebas internas **ejecuta un protocolo de convergencia de múltiples pasos que mueve un repositorio de "funciona" a "listo para producción" a través de tres etapas de salud y la entrega iterativa de características.**

```bash
roleos swarm
# → MISSION: Dogfood Swarm (Multi-Pass Convergence)
#   Stages: Health-A → Health-B → Health-C → Feature → Final
#   Domain agents: 3-5 parallel per wave (exclusive file ownership)
```

**Lo que la hace diferente:**

- **Proceso de verificación en tres etapas:** la etapa A corrige errores y problemas de seguridad (se repite hasta que no haya más errores CRÍTICOS ni ALTOS). La etapa B aplica medidas de seguridad proactivas (los usuarios revisan los resultados). La etapa C humaniza el código: mensajes de error que ayudan a los usuarios, comentarios sobre la reconexión, estados de carga, accesibilidad. Cada etapa es una lente distinta, no es el mismo análisis repetido.
- **Propiedad exclusiva de archivos:** cada agente de dominio posee archivos específicos mediante `swarm-manifest.json`. Ningún par de agentes edita el mismo archivo. No hay conflictos de fusión. No hay sobrecarga de coordinación.
- **Barreras de compilación:** después de cada iteración, deben superarse las pruebas de lint, verificación de tipos y pruebas. El sistema detecta automáticamente el sistema de compilación (Node, Rust, Python, Go) y ejecuta los comandos correspondientes.
- **Puntos de control del usuario:** la etapa Health-B y la etapa de características requieren la aprobación explícita del usuario antes de la ejecución. El sistema presenta los resultados y el usuario decide qué compilar.
- **Convergencia iterativa:** las etapas se repiten en bucle con las iteraciones hasta que se cumplan las condiciones de salida o se alcance el número máximo de iteraciones. Cada iteración vuelve a auditar desde cero para detectar regresiones introducidas por correcciones anteriores.
- **Detección automática de dominio:** `roleos swarm manifest --generate` detecta el tipo de repositorio (CLI, web, escritorio, MCP, monorepositorio) y genera asignaciones de dominio que no se superponen.

**Probado:** claude-collaborate (28-03-2026) — 35→129 pruebas, 106 problemas de verificación resueltos, versión v1.1.0 lanzada. Protocolo v2.0 con 9 fases.

## Estado

Estable y lanzado. Consulte el [REGISTRO DE CAMBIOS](CHANGELOG.md) para obtener el historial completo de versiones y los cambios realizados en cada lanzamiento.

## Licencia

MIT

---

Creado por <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a>
