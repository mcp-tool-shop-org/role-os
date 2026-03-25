<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.md">English</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

# Role OS

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/role-os/readme.png" alt="Role OS" width="400">
</p>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/role-os/actions"><img src="https://github.com/mcp-tool-shop-org/role-os/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://www.npmjs.com/package/role-os"><img src="https://img.shields.io/npm/v/role-os" alt="npm"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License"></a>
  <a href="https://mcp-tool-shop-org.github.io/role-os/"><img src="https://img.shields.io/badge/Landing_Page-live-brightgreen" alt="Landing Page"></a>
</p>

Un sistema operativo multi-Claude que asigna personal, dirige, valida y ejecuta tareas a través de 31 contratos de roles especializados. Crea paquetes de tareas, ensambla el equipo adecuado a partir de la coincidencia de roles, detecta problemas antes de la ejecución, redirige automáticamente la recuperación cuando una tarea se bloquea o se rechaza, y requiere evidencia estructurada en cada decisión.

## ¿Qué hace?

Role OS es la forma profesional de utilizar multi-Claude. Evita los fallos específicos que producen los flujos de trabajo de IA genéricos:

- **Desviación (Drift)**: Los roles se mantienen dentro de su ámbito. El producto no se rediseña. La interfaz de usuario no redefine el alcance. El backend no inventa la dirección del producto.
- **Finalización falsa**: La definición de "hecho" es concreta. El trabajo que oculta deficiencias, omite la verificación o resuelve un problema diferente es rechazado.
- **Contaminación**: Los proyectos bifurcados o heredados conservan residuos de identidad. Role OS detecta y rechaza las desviaciones entre proyectos en terminología, elementos visuales y modelos mentales.
- **Progreso basado en impresiones**: Cada transferencia es estructurada. Cada decisión se basa en evidencia. "Parece que está terminado" no es un estado válido.

## ¿Cómo funciona?

Describa su tarea. Role OS decide automáticamente el nivel de orquestación adecuado.

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

1. **Misión:** cuando la tarea coincide con un flujo de trabajo recurrente probado (corrección de errores, tratamiento, lanzamiento de funciones, documentación, seguridad, investigación). Cadena de roles conocida, flujo de artefactos, ramas de escalamiento y definiciones parciales.
2. **Paquete:** cuando la tarea pertenece a una familia conocida pero no tiene una estructura de misión completa. 7 paquetes de equipo calibrados con selección automática y mecanismos de protección contra errores.
3. **Enrutamiento libre:** cuando la tarea es novedosa, mixta o incierta. Asigna una puntuación a los 31 roles en función del contenido del paquete y ensambla una cadena dinámica.

El sistema nunca fuerza una tarea a través de una abstracción incorrecta. Explica por qué eligió cada nivel y ofrece alternativas.

**Una vez enrutada:**

1. **Cada rol produce una transferencia:** salida estructurada con elementos de evidencia que reducen la ambigüedad para el siguiente rol.
2. **El revisor evalúa según el contrato:** acepta, rechaza o bloquea en función de la evidencia estructurada, no de la impresión.
3. **La recuperación se redirige automáticamente:** las tareas bloqueadas o rechazadas se redirigen al responsable adecuado, junto con la razón, el tipo de recuperación y el artefacto requerido.

## Estado de implementación en la organización

El estado de implementación en toda la organización (cola, decisiones, registros de auditoría, paquetes de bloqueo por repositorio) se encuentra en un repositorio privado separado: [`role-os-rollout`](https://github.com/mcp-tool-shop-org/role-os-rollout). Este repositorio es el producto; el otro es el estado operativo.

## Memoria y continuidad

Role OS no posee ni duplica la capa de memoria. Cuando existe la memoria del proyecto Claude, esta es el sistema de continuidad canónico: los hechos del repositorio, las decisiones, los problemas pendientes y el historial de tratamiento se almacenan allí.

Role OS se integra con la memoria del proyecto Claude. No la reemplaza.

## Tratamiento completo y verificación de entrega

El tratamiento completo es un protocolo canónico de 7 fases definido en la memoria del proyecto Claude (`memory/full-treatment.md`). Role OS dirige y revisa los tratamientos utilizando contratos de roles, transferencias y puertas de revisión, y no redefine el protocolo.

La **verificación de entrega (Shipcheck)** es la puerta de calidad de 31 elementos que se ejecuta antes del tratamiento completo. Las puertas A, B, C y D deben superarse antes de que comience cualquier tratamiento. Referencia canónica: `memory/shipcheck.md`.

Orden: Verificación de entrega primero, luego tratamiento completo. No hay versión 1.0.0 sin superar las puertas obligatorias.

## 32 roles en 8 paquetes

| Paquete | Roles |
|------|-------|
| **Core** (3) | Orquestador, Estratega de Producto, Evaluador Crítico. |
| **Engineering** (7) | Desarrollador Frontend, Ingeniero Backend, Ingeniero de Pruebas, Ingeniero de Refactorización, Ingeniero de Rendimiento, Auditor de Dependencias, Evaluador de Seguridad. |
| **Design** (2) | Diseñador de Interfaz de Usuario, Guardián de la Marca. |
| **Marketing** (1) | Redactor para Lanzamiento. |
| **Treatment** (7) | Investigador de Repositorios, Traductor de Repositorios, Arquitecto de Documentación, Curador de Metadatos, Auditor de Cobertura, Verificador de Despliegue, Ingeniero de Lanzamiento. |
| **Product** (3) | Sintetizador de comentarios, Priorizador de hoja de ruta, Redactor de especificaciones. |
| **Research** (4) | Investigador de Experiencia de Usuario, Analista de la Competencia, Investigador de Tendencias, Sintetizador de Entrevistas con Usuarios. |
| **Growth** (4) | Estratega de Lanzamiento, Estratega de Contenido, Community Manager, Líder de Soporte. |

Cada rol tiene un contrato completo: misión, cuándo usar, cuándo no usar, entradas esperadas, salidas requeridas, nivel de calidad y desencadenantes de escalamiento. Cada rol es enrutable; `roleos route` puede recomendar cualquiera de ellos en función del contenido del paquete.

## Cómo empezar

```bash
npx role-os init

# Describe what you need — Role OS picks the right level:
roleos start "fix the crash in save handler"

# Or go manual:
roleos packet new feature
roleos route .claude/packets/my-feature.md
roleos review .claude/packets/my-feature.md accept
roleos status

# Explore missions and packs:
roleos mission list
roleos mission show bugfix
roleos packs list
roleos packs show feature
```

## Cuándo no usar Role OS

- Correcciones de una sola línea, errores tipográficos o errores obvios.
- Investigación exploratoria sin una salida definida.
- Trabajo que se puede realizar en la mente de una persona en 5 minutos.
- Correcciones urgentes que deben enviarse antes de que se complete una cadena de revisión.
- Proyectos donde se prioriza la velocidad sobre la estructura.

## Evidencia

Role OS se ha probado en tres tipos de tareas diferentes en dos repositorios con estructuras diferentes:

**Prueba 001: Trabajo de funciones** (Pantalla de la tripulación, Star Freight)
- Cadena de 7 roles, 45 escenarios de prueba, 0 conflictos de roles.
- Evitó la contaminación de un proyecto derivado, detectó invenciones realizadas directamente y reveló bloqueos reales.

**Prueba 002: Trabajo de integración** (Conexión de CampaignState, Star Freight)
- Cadena de 5 roles, resolvió la interfaz arquitectónica sin soluciones alternativas falsas.
- Las pruebas anti-fallback demostraron que la ruta activa es real, no un marcador de posición.

**Prueba 003: Trabajo de identidad** (Eliminación de contaminación, Star Freight)
- Cadena de 6 roles, 51 escenarios de prueba, incluyendo una defensa duradera contra la contaminación en el sistema de integración continua.
- Corrigió la desviación de la ficción heredada sin provocar una reestructuración general.

**Prueba de portabilidad** (Consistencia de la persona, sensor-humor)
- Misma estructura base, diferentes idioma/dominio/entorno.
- Se adapta solo con cambios de contexto; no se realizan modificaciones en el contrato principal.

**Tratamiento completo FT-001** (portlight-desktop)
- Tratamiento con personal en 7 fases con roles del paquete de tratamiento.
- Verificación de envío probada, sin colisiones de roles.

**Tratamiento completo FT-002** (studioflow)
- Mismo paquete de tratamiento, repositorio estructuralmente diferente (espacio de trabajo creativo vs. juego).
- Paquete de tratamiento portátil: no se requieren modificaciones en el contrato.

## Propiedades fundamentales

Estas son innegociables. Si un cambio debilita alguna de ellas, recházalo.

- Los límites de los roles se mantienen.
- La revisión es rigurosa.
- La escalación se mantiene transparente.
- Los paquetes siguen siendo verificables.
- La portabilidad requiere adaptación al contexto, no una modificación profunda.

## Estructura del proyecto

```
role-os/
  bin/roleos.mjs               ← CLI entrypoint
  src/
    entry.mjs                  ← Unified entry: mission → pack → free routing
    entry-cmd.mjs              ← `roleos start` CLI command
    mission.mjs                ← 6 named mission types (feature, bugfix, treatment, docs, security, research)
    mission-run.mjs            ← Mission runner: create → step → complete → report
    mission-cmd.mjs            ← `roleos mission` CLI commands
    route.mjs                  ← 31-role routing + dynamic chain builder
    packs.mjs                  ← 7 calibrated team packs + auto-selection
    conflicts.mjs              ← 4-pass conflict detection
    escalation.mjs             ← Auto-routing for blocked/rejected/split
    evidence.mjs               ← Structured evidence + role-aware requirements
    dispatch.mjs               ← Runtime dispatch manifests for multi-claude
    artifacts.mjs              ← 20 per-role artifact contracts + 7 pack handoffs
    decompose.mjs              ← Composite task detection + splitting
    composite.mjs              ← Dependency-ordered execution + recovery
    replan.mjs                 ← Mid-run adaptive replanning
    calibration.mjs            ← Outcome recording + weight tuning
    hooks.mjs                  ← 5 lifecycle hooks for runtime enforcement
    session.mjs                ← Session scaffolding + doctor
  test/                        ← 527 tests across 20 test files
  starter-pack/                ← Drop-in role contracts, policies, schemas, workflows
```

## Seguridad

El sistema operativo del rol opera **únicamente de forma local**. Copia las plantillas de Markdown y escribe archivos de paquetes/verdictos en el directorio `.claude/` de su repositorio. No accede a la red, no maneja secretos ni recopila datos de telemetría. No se realizan operaciones peligrosas; todas las escrituras de archivos utilizan la opción "omitir si existe" de forma predeterminada. Consulte [SECURITY.md](SECURITY.md) para obtener la política completa.

## El sistema operativo

| Capa. | ¿Qué hace? | Estado |
|-------|-------------|--------|
| **Routing** | Asigna una puntuación a los 31 roles en función del contenido del paquete, explica las recomendaciones, evalúa la confianza. | ✓ Implementado. |
| **Chain builder** | Ensambla cadenas ordenadas por fases a partir de roles con puntuación, sesgadas por tipo de paquete, pero no bloqueadas por plantillas. | ✓ Implementado. |
| **Conflict detection** | Validación de 4 pasos: conflictos graves, secuencia, redundancia, lagunas de cobertura. Sugerencias de corrección. | ✓ Implementado. |
| **Escalation** | Redirige automáticamente las tareas bloqueadas/rechazadas/divididas al responsable adecuado, junto con la razón y el artefacto requerido. | ✓ Implementado. |
| **Evidence** | Evidencia estructurada en las decisiones, específica para cada rol. Comprobaciones de suficiencia. 12 tipos de evidencia. | ✓ Implementado. |
| **Dispatch** | Genera manifiestos de ejecución para multi-claude. Perfiles de herramientas por rol, indicaciones del sistema, presupuestos. | ✓ Implementado. |
| **Trials** | Lista completa probada: 30/30 tareas de oro + 5/5 pruebas negativas. 7 pruebas de paquete completadas. | ✓ Completo. |
| **Team Packs** | 7 paquetes calibrados con selección automática, mecanismos de protección contra errores y enrutamiento libre como respaldo. | ✓ Implementado. |
| **Outcome calibration** | Registra los resultados de la ejecución, ajusta los pesos de los paquetes/roles en función de los resultados y ajusta los umbrales de confianza. | ✓ Implementado. |
| **Mixed-task decomposition** | Detecta tareas compuestas, las divide en paquetes secundarios, asigna paquetes y conserva las dependencias. | ✓ Implementado. |
| **Composite execution** | Ejecuta los paquetes secundarios en orden de dependencia, con transferencia de artefactos, recuperación de ramas y síntesis. | ✓ Implementado. |
| **Adaptive replanning** | Los cambios de alcance, los hallazgos o los nuevos requisitos durante la ejecución actualizan el plan sin necesidad de reiniciar. | ✓ Implementado. |
| **Session spine** | `roleos init claude` crea CLAUDE.md, /roleos-route, /roleos-review, /roleos-status. `roleos doctor` verifica la configuración. Las tarjetas de enrutamiento demuestran la participación. | ✓ Implementado. |
| **Hook spine** | 5 ganchos de ciclo de vida (SessionStart, PromptSubmit, PreToolUse, SubagentStart, Stop). Aplicación de políticas: recordatorios en las tarjetas de ruta, control de acceso a herramientas, inyección de roles de subagente, auditoría de finalización. | ✓ Implementado. |
| **Artifact spine** | 20 contratos de artefactos por rol. 7 contratos de transferencia de paquetes. Validación estructural. Comprobaciones de integridad de la cadena. Los roles posteriores nunca adivinan lo que recibieron. | ✓ Implementado. |
| **Mission library** | 6 misiones con nombre (desarrollo de características, corrección de errores, implementación, lanzamiento de documentación, endurecimiento de seguridad, lanzamiento de investigación). Cada una define el paquete, la cadena de roles, el flujo de artefactos, las ramas de escalada y una definición honesta y parcial. Las 6 misiones se probaron y se optimizaron. | ✓ Implementado. |
| **Mission runner** | Crear ejecuciones, avanzar paso a paso con el estado rastreado, completar/fallar con informes precisos. Propagación de pasos bloqueados, advertencias de escalada fuera de la cadena, reapertura del último paso. | ✓ Implementado. |
| **Unified entry** | `roleos start` decide automáticamente entre una misión, un paquete o una ruta libre. Escalera de respaldo con puntuaciones de confianza, alternativas y detección compuesta. | ✓ Implementado. |

## 6 misiones

| Misión | Paquete | Roles | Cuándo usar |
|---------|------|-------|-------------|
| `feature-ship` | característica | 5 | Entrega completa de una característica: alcance → especificación → implementación → prueba → revisión |
| `bugfix` | corrección de errores | 4 | Diagnosticar la causa raíz, corregir, probar, verificar |
| `treatment` | implementación | 4 | Verificación + pulido + documentación + verificación CI + revisión |
| `docs-release` | documentación | 2 | Escribir/actualizar documentación, notas de la versión |
| `security-hardening` | Seguridad | 4 | Modelo de amenazas, auditoría, corregir vulnerabilidades, volver a auditar, verificar |
| `research-launch` | investigación | 4 | Formular la pregunta, investigar, documentar los hallazgos, decidir |

Cada misión incluye definiciones honestas y parciales: cuando el trabajo se detiene, el sistema documenta lo que se completó y lo que queda, en lugar de simular una finalización.

## Estado

- v0.1–v0.4: Fundación: pruebas, adopción, paquete de implementación, paquete de inicio
- v1.0.0: 32 roles, CLI completa, implementación probada, portabilidad multi-repositorio
- v1.0.2: Bloqueo del sistema de roles (correcciones de inicialización de la verdad, init --force)
- v1.1.0: 31 roles, columna vertebral de enrutamiento completa, detección de conflictos, escalada, evidencia, despacho, 7 paquetes de equipo probados. 35 ejecuciones de prueba. 212 pruebas.
- v1.2.0: Paquetes calibrados promovidos a la entrada predeterminada. Selección automática, detección de incompatibilidades, sugerencia de alternativas, respaldo de enrutamiento libre. 246 pruebas.
- v1.3.0: Calibración de resultados, descomposición de tareas mixtas, ejecución compuesta, replanificación adaptativa. 317 pruebas.
- v1.4.0: Columna vertebral de la sesión: `roleos init claude`, `roleos doctor`, tarjetas de ruta, comandos /roleos-route + /roleos-review + /roleos-status. 335 pruebas.
- v1.5.0: Columna vertebral de los ganchos: 5 ganchos de ciclo de vida para la aplicación en tiempo de ejecución. 358 pruebas.
- v1.6.0: Columna vertebral de los artefactos: 20 contratos de artefactos por rol, 7 contratos de transferencia de paquetes, validación estructural. 385 pruebas.
- v1.7.0: Prueba de finalización: tareas reales que se ejecutan a través de toda la pila. CLI `roleos artifacts`. Escalada honesta para correcciones estructurales. 398 pruebas.
- v1.8.0: Biblioteca de misiones (Fase S): 6 misiones con nombre, motor de ejecución, informes de finalización. Optimizadas a partir de 6 ejecuciones de prueba reales. 481 pruebas.
- **v1.9.0**: Ruta de entrada unificada (Fase T): `roleos start` decide automáticamente entre una misión, un paquete o una ruta libre. Escalera de respaldo, detección compuesta, pruebas de comparación de la ruta de entrada. 527 pruebas.

## Licencia

MIT

---

Creado por <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a
