<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.md">English</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
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

Una capa de sistema operativo portátil y nativa del repositorio que dirige el trabajo a través de contratos de roles, paquetes estructurados, revisiones y escalamientos, para que los equipos puedan realizar tareas de desarrollo de funciones, integración, corrección de identidad y tratamiento completo del repositorio, sin desviaciones, finalizaciones falsas ni afirmaciones de progreso basadas en impresiones subjetivas.

## ¿Qué hace?

Role OS previene las fallas específicas que producen los flujos de trabajo de IA genéricos:

- **Desviación (Drift)**: Los roles se mantienen dentro de su ámbito. El producto no se rediseña. La interfaz de usuario no redefine el alcance. El backend no inventa la dirección del producto.
- **Finalización falsa**: La definición de "hecho" es concreta. El trabajo que oculta deficiencias, omite la verificación o resuelve un problema diferente es rechazado.
- **Contaminación**: Los proyectos bifurcados o heredados conservan residuos de identidad. Role OS detecta y rechaza las desviaciones entre proyectos en terminología, elementos visuales y modelos mentales.
- **Progreso basado en impresiones**: Cada transferencia es estructurada. Cada decisión se basa en evidencia. "Parece que está terminado" no es un estado válido.

## ¿Cómo funciona?

1. **Crear un paquete**: Definir qué elementos deben existir cuando se complete el trabajo.
2. **Dirigir a través de una cadena**: El conjunto más pequeño de roles especializados necesarios.
3. **Cada rol produce una transferencia**: Una salida estructurada que reduce la ambigüedad para el siguiente rol.
4. **El revisor evalúa según el contrato**: Acepta, rechaza o bloquea basándose en evidencia, no en impresiones.

## Memoria y continuidad

Role OS no posee ni duplica la capa de memoria. Cuando existe la memoria del proyecto Claude, esta es el sistema de continuidad canónico: los hechos del repositorio, las decisiones, los problemas pendientes y el historial de tratamiento se almacenan allí.

Role OS se integra con la memoria del proyecto Claude. No la reemplaza.

## Tratamiento completo y verificación de entrega

El tratamiento completo es un protocolo canónico de 7 fases definido en la memoria del proyecto Claude (`memory/full-treatment.md`). Role OS dirige y revisa los tratamientos utilizando contratos de roles, transferencias y puertas de revisión, y no redefine el protocolo.

La **verificación de entrega (Shipcheck)** es la puerta de calidad de 31 elementos que se ejecuta antes del tratamiento completo. Las puertas A, B, C y D deben superarse antes de que comience cualquier tratamiento. Referencia canónica: `memory/shipcheck.md`.

Orden: Verificación de entrega primero, luego tratamiento completo. No hay versión 1.0.0 sin superar las puertas obligatorias.

## La estructura

Role OS incluye 8 contratos de roles probados:

| Rol | Tarea |
|------|-----|
| **Orchestrator** | Descompone el trabajo en la cadena más pequeña y lógica. |
| **Product Strategist** | Define el alcance y protege la intención del producto. |
| **UI Designer** | Diseña la jerarquía, la interacción y la estructura visual. |
| **Frontend Developer** | Implementa las interfaces de usuario de forma fiel. |
| **Backend Engineer** | Implementa los contratos de servidor/datos y el comportamiento del sistema. |
| **Test Engineer** | Verifica el trabajo en función de riesgos reales, no de formalidades. |
| **Launch Copywriter** | Escribe mensajes precisos basados en el trabajo realizado. |
| **Critic Reviewer** | Acepta o rechaza según el cumplimiento del contrato. |

## Cómo empezar

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

## Seguridad

El sistema operativo del rol opera **únicamente de forma local**. Copia las plantillas de Markdown y escribe archivos de paquetes/verdictos en el directorio `.claude/` de su repositorio. No accede a la red, no maneja secretos ni recopila datos de telemetría. No se realizan operaciones peligrosas; todas las escrituras de archivos utilizan la opción "omitir si existe" de forma predeterminada. Consulte [SECURITY.md](SECURITY.md) para obtener la política completa.

## Estado

**v1.0.0 — Lanzado**

- v0.1: Operacional — 3 pruebas, 3 aprobaciones, 0 conflictos de roles.
- v0.2: Adopción — flujo de trabajo predeterminado en el repositorio principal, portable a un segundo repositorio.
- v0.3: Productización — paquete de inicio, CLI de configuración inicial, documentación de adopción.

## Licencia

MIT

---

Creado por <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a
