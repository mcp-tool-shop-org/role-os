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

Una capa operativa nativa de repositorios que asigna personal, enruta, valida y ejecuta el trabajo de los agentes de codificación a través de 61 contratos de roles especializados. Crea paquetes de tareas, ensambla el equipo adecuado a partir de la correspondencia de roles calificada, detecta fallas en las cadenas antes de la ejecución, enruta automáticamente la recuperación cuando el trabajo se bloquea o se rechaza y requiere evidencia estructurada en cada evaluación. Incluye una distribución dinámica para misiones a gran escala (según el manifiesto); un repositorio de 10 componentes se convierte automáticamente en 28 pasos de auditoría, no 6.

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
2. **El crítico revisa según el contrato:** acepta, rechaza o bloquea según la evidencia estructurada, no según la impresión.
3. **Las rutas de recuperación se enrutan automáticamente:** el trabajo bloqueado o rechazado se enruta al solucionador adecuado con una razón, el tipo de recuperación y el artefacto requerido.

## Distribución con conocimiento del presupuesto

Role OS puede consultar a un **analista de presupuesto de tokens** local para cada paso de la distribución y adjuntar una previsión de gasto orientativa al manifiesto; es opcional (`ROLEOS_BUDGET_CONSULT`), orientativa (nunca bloquea una distribución) y, en caso de fallo, se recurre a una línea de base determinista. Desactivado por defecto; la previsión es local y se puede ejecutar de forma gratuita. Consulte el [manual](https://mcp-tool-shop-org.github.io/role-os/handbook/specialist-budget/).

## Supervisión de las llamadas a herramientas

Role OS verifica y controla las llamadas a herramientas en la unión `PreToolUse`, de forma determinista y sin ningún modelo en el camino crítico:

- **Observador de conformidad** (orientativo, con fallo seguro): un esquema determinista + un límite de contrato computable verifica una llamada propuesta con su contrato de herramienta catalogado y adjunta una evaluación orientativa sobre una llamada *comprobadamente* no conforme; nunca bloquea. Un límite LLM opcional (`ROLEOS_CONFORMANCE_CONSULT`) gestiona los residuos genuinamente semánticos.
- **Control de capacidad** (con fallo seguro, opcional `ROLEOS_CAPABILITY_GATE`, desactivado por defecto): privilegio mínimo determinista en las acciones *irreversibles* (publicación en npm/PyPI, `gh release`, `git push`, ediciones de repositorio, implementación en Pages). Se deniega una acción controlada a menos que el director haya concedido su capacidad en `.claude/role-os/capabilities.json`, por lo que un paso incorrecto (un error honesto o uno inyectado) no puede desencadenar una acción irreversible no autorizada. El complemento preventivo de la regla del compensador con nombre. Consulte el [manual](https://mcp-tool-shop-org.github.io/role-os/handbook/).

## Expediente del equipo

Cada rol tiene un **expediente**, que es una ficha de personaje que también sirve como configuración en tiempo de ejecución. Seis aptitudes (rigor, ritmo, alcance, escepticismo, autonomía, franqueza) se corresponden con los controles de distribución reales; una capa de **disposición** de ocho arquetipos (escéptico, constructor, investigador, inconformista...) contiene una instrucción de comportamiento; y cada rol tiene un retrato y una calificación. Explore todo el equipo como una galería (`dossier/dossier.html`); el radar de cada rol muestra su configuración ajustada en comparación con su ideal canónico.

Cuando un rol tiene un expediente, la distribución inyecta una **postura operativa**: la instrucción de comportamiento de la disposición más una línea de postura de las aptitudes del rol, por lo que la ficha realmente configura el rol. Es opcional y aditivo: los roles sin un expediente se comportan exactamente como antes. Consulte el [manual](https://mcp-tool-shop-org.github.io/role-os/handbook/crew-dossier/).

## Estado de la implementación a nivel de organización

El estado de la implementación a nivel de organización (cola, decisiones, registros de auditoría, paquetes de bloqueo por repositorio) se encuentra en un repositorio **privado** e interno de la organización (`role-os-rollout`). Este repositorio es el producto; ese repositorio es el estado operativo.

## Memoria y continuidad

Role OS no posee ni duplica la capa de memoria. Cuando existe una tienda de memoria de proyectos en un marco, es el sistema de continuidad canónico: los hechos del repositorio, las decisiones, los puntos pendientes y el historial del tratamiento se almacenan allí.

Role OS se integra con esa tienda cuando está presente. No la reemplaza.

## Tratamiento completo e inspección antes del envío

El tratamiento completo es un protocolo canónico de 7 fases definido en la memoria del proyecto del estudio (`memory/full-treatment.md`). Role OS gestiona y revisa los tratamientos utilizando contratos de rol, transferencias y puntos de control de los revisores; no redefine el protocolo.

La **inspección antes del envío** es la verificación de calidad de 31 elementos que se realiza antes del tratamiento completo. Las barreras obligatorias A-D deben superarse antes de que comience cualquier tratamiento. Referencia canónica: `memory/shipcheck.md`.

Orden: primero la inspección antes del envío, luego el tratamiento completo. No se permite la versión 1.0.0 sin superar las barreras obligatorias.

## El catálogo de 61 roles

El catálogo agrupa sus 61 roles en 11 familias. (Dispatch utiliza un conjunto separado de 10 **paquetes de equipo** —características, corrección de errores, seguridad, documentación, lanzamiento, investigación, tratamiento, auditoría exhaustiva, lluvia de ideas, trabajo en equipo— que obtienen roles de estas familias).

| Familia | Roles |
|--------|-------|
| **Core** (2) | Orquestador, revisor crítico |
| **Product** (4) | Estratega de producto, sintetizador de comentarios, priorizador de la hoja de ruta, redactor de especificaciones |
| **Engineering** (7) | Desarrollador frontend, ingeniero backend, ingeniero de pruebas, ingeniero de refactorización, ingeniero de rendimiento, auditor de dependencias, revisor de seguridad |
| **Design** (2) | Diseñador de UI, guardián de la marca |
| **Marketing** (1) | Redactor de textos para el lanzamiento |
| **Treatment** (7) | Investigador de repositorios, traductor de repositorios, arquitecto de documentación, curador de metadatos, auditor de cobertura, verificador de implementación, ingeniero de lanzamiento |
| **Research** (4) | Investigador de UX, analista de la competencia, investigador de tendencias, sintetizador de entrevistas con usuarios |
| **Growth** (4) | Estratega de lanzamiento, estratega de contenido, gestor de la comunidad, responsable de la gestión de incidencias de soporte |
| **Brainstorm** (19) | Explorador de contexto, explorador de valor para el usuario, explorador de ideas creativas, explorador de mecanismos, explorador de mercado, explorador de perspectivas contrarias, explorador de viabilidad, explorador de estándares de calidad, analista de contexto, analista de valor para el usuario, analista de mecanismos, analista de posicionamiento, analista de perspectivas contrarias, normalizador, sintetizador, expansor de productos, expansor de escenarios, expansor de ventajas competitivas, juez |
| **Deep Audit** (4) | Auditor de componentes, auditor de la veracidad de las pruebas, auditor de las interfaces, sintetizador de auditorías |
| **Swarm** (7) | Coordinador del equipo, agente backend del equipo, agente de conexión del equipo, agente de pruebas del equipo, agente de infraestructura del equipo, agente frontend del equipo, sintetizador del equipo |

Cada rol tiene un contrato completo: misión, cuándo usarlo, cuándo no usarlo, entradas esperadas, salidas requeridas, estándares de calidad y factores desencadenantes de escalamiento. Cada rol se puede asignar —`roleos route` puede recomendar cualquiera de ellos en función del contenido del paquete.

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

- Correcciones de una sola línea, errores tipográficos o errores evidentes
- Investigación exploratoria sin una salida definida
- Trabajo que cabe en la cabeza de una persona en 5 minutos
- Correcciones urgentes que deben implementarse antes de que se complete una cadena de revisión
- Proyectos en los que se prioriza la velocidad sobre la estructura

## Evidencia

Se demostró la eficacia de Role OS en tres modelos de prueba en dos repositorios estructuralmente diferentes:

**Prueba 001: trabajo en características** (pantalla de la tripulación, Star Freight)
- Cadena de 7 roles, 45 escenarios de prueba, 0 conflictos de roles
- Evitó la contaminación de un ancestro de la bifurcación, detectó una invención en línea y reveló bloqueos honestos

**Prueba 002: trabajo de integración** (conexión de CampaignState, Star Freight)
- Cadena de 5 roles, resolvió una interfaz arquitectónica sin recurrir a soluciones provisionales
- Las pruebas anti-provisionales demostraron que la ruta activa es real, no un marcador de posición

**Prueba 003: trabajo de identidad** (eliminación de la contaminación, Star Freight)
- Cadena de 6 roles, 51 escenarios de prueba, incluida una defensa duradera contra la contaminación en CI
- Reparó la desviación de la ficción heredada sin colapsar en una reestructuración amplia

**Prueba de portabilidad** (consistencia de la persona, humor del sensor)
- Misma estructura, diferente idioma/dominio/pila
- Se adoptó solo con cambios de contexto; no se realizaron modificaciones en el contrato principal

**Tratamiento completo FT-001** (portlight-desktop)
- Tratamiento de 7 fases con roles del paquete de tratamiento
- Se demostró la eficacia de la inspección antes del envío, sin conflictos de roles

**Tratamiento completo FT-002** (studioflow)
- Mismo paquete de tratamiento, repositorio estructuralmente diferente (espacio de trabajo creativo frente a juego)
- El paquete de tratamiento es portátil; no se necesitan modificaciones en el contrato

**Sesión de lluvia de ideas exitosa** (tema del mercado de servidores MCP)
- Cadena de 9 roles, 4 analistas en paralelo, examen cruzado + refutación del gráfico de disputas
- Se plantearon 4 desafíos, se redujeron 3 afirmaciones, 1 sin resolver; presión saludable, no un punto muerto
- 16+ enlaces de seguimiento desde los artefactos renderizados hasta los átomos de la capa de verdad
- Se demostró la cadena de custodia completa: verdad → átomos → disputa → síntesis → expansión → juicio → renderizado → seguimiento

## Propiedades principales

Estas son innegociables. Si un cambio debilita alguna de ellas, rechácelo.

- Los límites de los roles se mantienen
- La revisión es efectiva
- El escalamiento se mantiene honesto
- Los paquetes se pueden probar
- La portabilidad requiere adaptación al contexto, no una cirugía del núcleo

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
    calibration.mjs            ← Outcome recording + weight tuning
    hooks.mjs                  ← 5 lifecycle hooks for runtime enforcement
    session.mjs                ← Session scaffolding + doctor
    brainstorm.mjs             ← Evidence modes, request validation, finding/synthesis/judge schemas
    brainstorm-roles.mjs       ← Role-native schemas, input partitioning, blindspot enforcement, cross-exam
    brainstorm-render.mjs      ← Two-layer rendering: lexical bans, render schemas, debate transcript
  test/                        ← 1595 tests across 72 test files (1592 pass, 3 skipped)
  starter-pack/                ← Drop-in role contracts, policies, schemas, workflows
```

## Seguridad

De forma predeterminada, Role OS opera solo en el **sistema de archivos local**. Copia las plantillas de Markdown y escribe los archivos de paquete/veredicto/ejecución en el directorio `.claude/` de su repositorio. El funcionamiento predeterminado no realiza ninguna solicitud de red, no gestiona secretos y no recopila telemetría. No se realizan operaciones peligrosas; de forma predeterminada, todas las escrituras de archivos utilizan la opción "omitir si existe".

Tres **funciones opcionales** acceden a la red cuando las habilita explícitamente:

- **`roleos verify-citations`** — ejecuta comandos en la herramienta externa `prism` CLI, que resuelve los identificadores de citas en las API públicas de arXiv/Crossref (envía los ID/URL de las citas que se están verificando).
- **Nivel de especialista** (`roleos specialist`, roles registrados) — envía indicaciones a la herramienta `backend_url` que configure en `.role-os/specialists.json` (normalmente un punto final de modelo local).
- **Consulta de presupuesto/conformidad** (`ROLEOS_BUDGET_CONSULT` / `ROLEOS_CONFORMANCE_CONSULT`) — envía el contexto del paso/llamada a la herramienta a un modelo local a través de HTTP para obtener un veredicto asesor.

Los tres están desactivados por defecto y, en caso de fallo, permiten un comportamiento local determinista. Consulte [SECURITY.md](SECURITY.md) para conocer la política completa.

## Sistema operativo

| Capa | Qué hace | Estado |
|-------|-------------|--------|
| **Routing** | Evalúa los 61 roles en función del contenido del paquete, explica las recomendaciones y evalúa la confianza. | ✓ Implementado |
| **Chain builder** | Ensambla cadenas ordenadas por fases a partir de los roles evaluados, con un sesgo hacia el tipo de paquete, no limitado a una plantilla. | ✓ Implementado |
| **Conflict detection** | Validación en 4 fases: conflictos graves, secuencia, redundancia, lagunas de cobertura. Sugerencias de reparación. | ✓ Implementado |
| **Escalation** | Enruta automáticamente el trabajo bloqueado/rechazado/dividido al solucionador correcto, con la razón y el artefacto requerido. | ✓ Implementado |
| **Evidence** | Evidencia estructurada consciente del rol en las conclusiones. Comprobaciones de suficiencia. 12 tipos de evidencia. | ✓ Implementado |
| **Dispatch** | Genera manifiestos de ejecución para el conjunto de agentes de codificación. Perfiles de herramientas por rol, indicaciones del sistema, presupuestos. | ✓ Implementado |
| **Trials** | Lista completa probada: 30/30 tareas de oro + 5/5 pruebas negativas. 7 pruebas de paquete completadas. | ✓ Completo |
| **Team Packs** | 10 paquetes calibrados con selección automática, protección contra incompatibilidades y alternativa de enrutamiento libre. | ✓ Implementado |
| **Outcome calibration** | Registra los resultados de la ejecución, ajusta los pesos del paquete/rol a partir de los resultados y ajusta los umbrales de confianza. | ✓ Implementado |
| **Mixed-task decomposition** | Detecta el trabajo compuesto, lo divide en paquetes secundarios, asigna paquetes y conserva las dependencias. | ✓ Implementado |
| **Composite execution** | Ejecuta los paquetes secundarios en orden de dependencia, con el paso de artefactos, la recuperación de ramas y la síntesis. | ✓ Implementado |
| **Adaptive replanning** | Los cambios de alcance, los hallazgos o los nuevos requisitos a mitad de la ejecución actualizan el plan sin reiniciar. | ✓ Implementado |
| **Session spine** | `roleos init claude` crea CLAUDE.md, /roleos-route, /roleos-review, /roleos-status. `roleos doctor` verifica el cableado. Las tarjetas de ruta demuestran el compromiso. | ✓ Implementado |
| **Hook spine** | 5 puntos de enganche del ciclo de vida (SessionStart, PromptSubmit, PreToolUse, SubagentStart, Stop). Aplicación de políticas: recordatorios de la tarjeta de ruta, bloqueo de la herramienta de escritura, inyección del rol del subagente, auditoría de finalización. | ✓ Implementado |
| **Artifact spine** | Contratos de artefactos por rol. Contratos de transferencia de paquetes. Validación estructural. Comprobaciones de la integridad de la cadena. Los roles posteriores nunca adivinan lo que han recibido. | ✓ Implementado |
| **Mission library** | 9 misiones nombradas (lanzamiento de funciones, corrección de errores, tratamiento, lanzamiento de documentación, fortalecimiento de la seguridad, lanzamiento de investigación, lluvia de ideas, auditoría exhaustiva, prueba en un entorno real). Cada una declara el paquete, la cadena de roles, el flujo de artefactos, las ramas de escalamiento y una definición honesta y parcial. | ✓ Implementado |
| **Mission runner** | Crear ejecuciones, recorrer los pasos con el estado rastreado, completar/fallar con un informe honesto. Propagación de pasos bloqueados, advertencias de escalamiento fuera de la cadena, reapertura del último paso. | ✓ Implementado |
| **Unified entry** | `roleos start` decide automáticamente entre misión, paquete y enrutamiento libre. Escalera de respaldo con puntuaciones de confianza, alternativas y detección compuesta. | ✓ Implementado |
| **Persistent runs** | `roleos run` crea ejecuciones respaldadas por disco. `resume`, `next`, `explain`, `complete`, `fail`. Intervenciones: redirigir, escalar, reintentar, bloquear, reabrir. Guía local del paso. Medición de la fricción. | ✓ Implementado |
| **Brainstorm** | Arquitectura de dos capas: verdad (esquemas nativos del rol, átomos de procedencia, gráfico de disputa de contra-interrogatorio) + renderizado (5 voces distintas, prohibiciones léxicas, transcripción del debate). Los enlaces de rastreo demuestran que cada afirmación renderizada se asigna a un átomo de verdad. Ejecución de oro probada. | ✓ Implementado |
| **Deep Audit** | Auditoría del repositorio a escala del manifiesto: descomponer el repositorio en componentes, enviar N auditores + M auditores de prueba de la verdad + K auditores de la interfaz desde el gráfico de dependencias, sintetizar en una conclusión clasificada y un plan de acción. El envío dinámico se escala con el tamaño del repositorio (fórmula 2N + K + 3). Nativo del ejecutor con validación de artefactos en cada paso. | ✓ Implementado |
| **Dogfood Swarm** | Convergencia de múltiples pasos: tres etapas de salud (error/seguridad → proactivo → humanización) y luego paso de funciones. Propiedad exclusiva de los archivos, puertas de compilación después de cada ola, puntos de control del usuario. La detección automática del dominio genera manifiestos. Puente de evidencia hacia los laboratorios de prueba en un entorno real. | ✓ Implementado |

## 9 misiones

| Misión | Paquete | Roles | Cuándo usar |
|---------|------|-------|-------------|
| `feature-ship` | función | 5 | Entrega completa de la función: alcance → especificación → implementación → prueba → revisión |
| `bugfix` | corrección de errores | 4 | Diagnosticar la causa raíz, corregir, probar, verificar |
| `treatment` | tratamiento | 4 | Verificación + pulido + documentación + verificación de CI + revisión |
| `docs-release` | documentación | 2 | Escribir/actualizar la documentación, notas de la versión |
| `security-hardening` | seguridad | 4 | Modelo de amenazas, auditoría, corrección de vulnerabilidades, reauditoría, verificación |
| `research-launch` | investigación | 4 | Formular la pregunta, investigar, documentar los hallazgos, decidir |
| `brainstorm` | lluvia de ideas | 9 | Consulta estructurada con múltiples perspectivas, con desacuerdo y resultados rastreables |
| `deep-audit` | auditoría exhaustiva | 5 (escalas) | Auditoría del repositorio respaldada por un manifiesto: el recuento de trabajadores se escala con el gráfico del repositorio mediante el envío dinámico |
| `dogfood-swarm` | equipo | 8 (escalas) | Convergencia de múltiples pasos: salud-a → salud-b → salud-c → función → síntesis final |

Cada misión incluye definiciones honestas y parciales: cuando el trabajo se detiene, el sistema documenta lo que se completó y lo que queda en lugar de fingir que se completó.

### Misión de lluvia de ideas

No es una "lluvia de ideas con IA". La misión de lluvia de ideas es **roles especializados bajo la ley, con desacuerdo rastreable y resultados que sirven de base para tomar decisiones.**

```bash
roleos run "explore product directions for a developer tool discovery platform"
# → MISSION: Brainstorm (Structured Inquiry)
#   Chain: 4 Analysts (parallel) → Normalize → Cross-Examine → Rebut → Synthesize → Expand → Judge
```

**Lo que la hace diferente:**

- **Capa 1 (verdad):** Cuatro analistas emiten esquemas nativos del rol (ContextMap, UserValueMap, MechanicsMap, PositioningMap), no prosa compartida. Cada rol tiene un mecanismo de protección contra puntos ciegos: frases prohibidas, tipos de afirmaciones prohibidas, particiones de entrada filtradas. Los átomos llevan información de procedencia. Un gráfico de contra-interrogatorio dirigido produce desafíos específicos. Los analistas originales defienden, limitan o retiran sus afirmaciones bajo presión.

- **Capa 2 (renderizado):** Cinco voces humanas distintas (Memorándum de límites, Notas de campo, Boceto del sistema, Resumen de la afirmación, Transcripción del contra-interrogatorio) con prohibiciones léxicas que impiden la convergencia de las voces. La síntesis consume la verdad, nunca la prosa renderizada. Ambas capas siempre están disponibles.

- **Cadena de custodia:** Cada sentencia generada se remonta a un átomo de la capa de verdad. Las direcciones de síntesis citan átomos. Los objetivos del interrogatorio cruzado son identificadores de afirmaciones reales. El gráfico de disputas es el producto, no el texto.

**Probado:** Ejecución v0.4 — cadena de custodia completa verificada. Consulte [`examples/golden-run.md`](examples/golden-run.md) para ver la cadena completa de artefactos.

### Misión de auditoría profunda

No es un escaneo superficial. La misión de auditoría profunda **descompone un repositorio en componentes delimitados y asigna auditores especializados a una escala determinada por el propio gráfico de dependencias del repositorio.**

```bash
roleos run "deep audit this repo" --manifest=audit-manifest.json
# → MISSION: Deep Audit (Manifest-Scaled)
#   Steps: Component Auditor ×6 + Test Truth Auditor ×6 + Seam Auditor ×8 + Synthesizer + Action Plan + Critic = 23 steps
```

**Lo que la hace diferente:**

- **Asignación dinámica:** el número de trabajadores no es fijo. Un repositorio de 10 componentes con 5 grupos de límites produce 28 pasos (2×10 + 5 + 3). Un repositorio de 3 componentes produce 12. La fórmula de escalado es `2N + K + 3` donde N = componentes, K = límites.
- **Paquetes respaldados por un manifiesto:** un `audit-manifest.json` define los componentes (con rutas de archivo, recuentos de líneas, descripciones) y los límites (de/a con descripciones de la interfaz). Cada auditor recibe solo su paquete.
- **Cuatro arquetipos de roles:** Auditor de componentes (verdad del código por módulo), Auditor de la verdad de las pruebas (pruebas que demuestran frente a pruebas que existen), Auditor de límites (límites de integración del gráfico de dependencias), Sintetizador de auditoría (veredicto clasificado + plan de acción de todos los paquetes).
- **Validación de artefactos en cada paso:** `validateArtifact()` se activa en cada paso completado en ambos caminos de ejecución. Los resultados se adjuntan a los objetos de paso. El sistema sabe si cada artefacto cumplió con su contrato.
- **Parcial honesto:** cuando el presupuesto o el alcance impiden la finalización, los hallazgos por componente son individualmente válidos. El sistema sintetiza a partir de lo que se completó, nunca falsea la cobertura total.

**Probado:** Ejecución de prueba nativa del ejecutor — 18 pruebas contra un manifiesto real, ciclo de vida completo verificado, incluida la reapertura de la escalada y el fallo parcial. Se verificó la fórmula de escalado para manifiestos de 3/6/10/15 componentes.

### Misión de enjambre de pruebas internas

No es un análisis único. La misión de enjambre de pruebas internas **ejecuta un protocolo de convergencia de múltiples pasos que mueve un repositorio de "funciona" a "listo para producción" a través de tres etapas de salud y la entrega iterativa de funciones.**

```bash
roleos swarm
# → MISSION: Dogfood Swarm (Multi-Pass Convergence)
#   Stages: Health-A → Health-B → Health-C → Feature → Final
#   Domain agents: 3-5 parallel per wave (exclusive file ownership)
```

**Lo que la hace diferente:**

- **Etapa de salud de tres pasos:** la etapa A corrige errores y problemas de seguridad (bucle hasta que haya 0 CRÍTICOS + 0 GRAVES). La etapa B aplica un endurecimiento proactivo (los usuarios revisan los hallazgos). La etapa C humaniza la base de código: mensajes de error que ayudan a los usuarios, comentarios de reconexión, estados de carga, accesibilidad. Cada etapa es una lente distinta, no el mismo análisis repetido.
- **Propiedad exclusiva de archivos:** cada agente de dominio es propietario de archivos específicos a través de `swarm-manifest.json`. Ningún agente edita el mismo archivo. No hay conflictos de fusión. No hay sobrecarga de coordinación.
- **Puertas de compilación:** el análisis, la verificación de tipos y las pruebas deben pasar después de cada ola. El sistema detecta automáticamente el sistema de compilación (Node, Rust, Python, Go) y ejecuta los comandos correctos.
- **Puntos de control del usuario:** la etapa de salud B y la etapa de funciones requieren la aprobación explícita del usuario antes de la ejecución. El sistema presenta los hallazgos y el usuario decide qué compilar.
- **Convergencia iterativa:** las etapas se repiten con bucles de ola hasta que se cumplen las condiciones de salida o se alcanza el número máximo de iteraciones. Cada ola vuelve a auditar desde cero para detectar regresiones introducidas por correcciones anteriores.
- **Detección automática de dominio:** `roleos swarm manifest --generate` detecta el tipo de repositorio (CLI, web, de escritorio, MCP, monorepositorio) y genera asignaciones de dominio que no se superponen.

**Probado:** claude-collaborate (2026-03-28) — 35→129 pruebas, 106 hallazgos de salud corregidos, v1.1.0 lanzado. Protocolo v2.0 con 9 fases.

## Estado

Estable y listo para su lanzamiento. Consulte el [REGISTRO DE CAMBIOS](CHANGELOG.md) para obtener el historial completo de versiones y los cambios realizados en cada versión.

## Licencia

MIT

---

Creado por <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a>
