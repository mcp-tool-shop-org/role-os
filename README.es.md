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

## 32 roles en 8 paquetes

| Paquete | Roles |
|------|-------|
| **Core** (3) | Orquestador, Estratega de Producto, Evaluador Crítico. |
| **Engineering** (7) | Desarrollador Frontend, Ingeniero Backend, Ingeniero de Pruebas, Ingeniero de Refactorización, Ingeniero de Rendimiento, Auditor de Dependencias, Evaluador de Seguridad. |
| **Design** (2) | Diseñador de Interfaz de Usuario, Guardián de la Marca. |
| **Marketing** (1) | Redactor para Lanzamiento. |
| **Treatment** (7) | Investigador de Repositorios, Traductor de Repositorios, Arquitecto de Documentación, Curador de Metadatos, Auditor de Cobertura, Verificador de Despliegue, Ingeniero de Lanzamiento. |
| **Product** (4) | Sintetizador de Retroalimentación, Priorizador de la Hoja de Ruta, Redactor de Especificaciones, Arquitecto de la Información. |
| **Research** (4) | Investigador de Experiencia de Usuario, Analista de la Competencia, Investigador de Tendencias, Sintetizador de Entrevistas con Usuarios. |
| **Growth** (4) | Estratega de Lanzamiento, Estratega de Contenido, Community Manager, Líder de Soporte. |

Cada rol tiene un contrato completo: misión, cuándo usar, cuándo no usar, entradas esperadas, salidas requeridas, estándares de calidad y desencadenantes de escalamiento.

## Cómo empezar

```bash
npx @mcptoolshop/role-os init

# Fill context/ files for your project, then:
roleos packet new feature
roleos route .claude/packets/my-feature.md
roleos review .claude/packets/my-feature.md accept
roleos status
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

## Seguridad

El sistema operativo del rol opera **únicamente de forma local**. Copia las plantillas de Markdown y escribe archivos de paquetes/verdictos en el directorio `.claude/` de su repositorio. No accede a la red, no maneja secretos ni recopila datos de telemetría. No se realizan operaciones peligrosas; todas las escrituras de archivos utilizan la opción "omitir si existe" de forma predeterminada. Consulte [SECURITY.md](SECURITY.md) para obtener la política completa.

## Estado

**v1.0.0 — Superficie Amplia, Mismas Reglas**

- v0.1: Operacional — 3 pruebas, 3 aprobaciones, 0 colisiones de roles.
- v0.2: Adopción — flujo de trabajo predeterminado en el repositorio principal, portátil a un segundo repositorio.
- v0.3: Productización — paquete de inicio, CLI de inicio, superficie de pruebas.
- v0.4: Paquete de tratamiento — 8 roles de tratamiento/identidad, tratamiento completo con personal, portátil entre 2 repositorios.
- v1.0.0: 32 roles en 8 paquetes, CLI completa, tratamiento probado, portabilidad multi-repositorio.

## Licencia

MIT

---

Creado por <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a
