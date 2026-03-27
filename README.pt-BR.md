<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.md">English</a>
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

Um sistema operacional multi-Claude que aloca, direciona, valida e executa tarefas por meio de 31 contratos de funções especializadas. Cria pacotes de tarefas, monta a equipe certa com base em correspondência de funções, detecta problemas antes da execução, direciona automaticamente a recuperação quando o trabalho é bloqueado ou rejeitado e exige evidências estruturadas em cada decisão.

## O que ele faz

Role OS é a maneira profissional de usar o multi-Claude. Ele evita as falhas específicas que os fluxos de trabalho de IA genéricos produzem:

- **Desvio (Drift)** — as funções permanecem em seu domínio. O produto não é redesenhado. A interface não redefine o escopo. O backend não inventa a direção do produto.
- **Conclusão falsa** — a definição de "concluído" é concreta. O trabalho que esconde lacunas, ignora a verificação ou resolve um problema diferente é rejeitado.
- **Contaminação** — projetos bifurcados ou herdados carregam resíduos de identidade. O Role OS detecta e rejeita desvios entre projetos em termos, visuais e modelos mentais.
- **Progresso baseado em impressões** — cada transferência é estruturada. Cada veredicto está vinculado a evidências. "Parece pronto" não é um estado válido.

## Como funciona

Descreva sua tarefa. O Role OS decide automaticamente o nível de orquestração adequado.

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

**A hierarquia de fallback:**

1. **Missão:** quando a tarefa corresponde a um fluxo de trabalho recorrente comprovado (correção de bugs, tratamento, lançamento de recursos, documentação, segurança, pesquisa). Cadeia de funções conhecida, fluxo de artefatos, ramificações de escalonamento e definições parciais claras.
2. **Pacote:** quando a tarefa é uma família conhecida, mas não se encaixa em um formato de missão completo. 7 pacotes de equipe calibrados com seleção automática e proteções contra incompatibilidades.
3. **Direcionamento livre:** quando a tarefa é nova, mista ou incerta. Avalia todas as 31 funções com base no conteúdo do pacote e monta uma cadeia dinâmica.

O sistema nunca força o trabalho a passar pela camada de abstração incorreta. Ele explica por que escolheu cada nível e oferece alternativas.

**Um comando para iniciar a execução:**

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

**Intervenções quando algo dá errado:**

```bash
roleos retry 0                 # Retry a failed step
roleos reroute 1 "Frontend Developer" "UI bug"  # Swap a role
roleos escalate "Test Engineer" "Repo Researcher" "missed edge case" "re-diagnose"
roleos block 2 "waiting for API spec"
roleos reopen 0 "found issue in review"
```

As execuções são persistidas no disco (em `.claude/runs/`), permitindo que as sessões interrompidas sejam retomadas sem problemas. Cada etapa inclui orientações para o operador: o que produzir, as seções necessárias e as condições de parada.

**Depois de direcionado:**

1. **Cada função produz uma transferência:** saída estruturada com itens de evidência que reduzem a ambiguidade para a próxima função.
2. **O revisor avalia em relação ao contrato:** aceita, rejeita ou bloqueia com base em evidências estruturadas, e não em impressões.
3. **A recuperação é direcionada automaticamente:** o trabalho bloqueado ou rejeitado é direcionado ao resolvedor correto, com um motivo, tipo de recuperação e artefato necessário.

## Estado de implantação na organização

O estado de implantação em toda a organização (fila, decisões, registros de auditoria, pacotes de bloqueio por repositório) reside em um repositório privado separado: [`role-os-rollout`](https://github.com/mcp-tool-shop-org/role-os-rollout). Este repositório é o produto; aquele repositório é o estado operacional.

## Memória e continuidade

O Role OS não possui nem duplica a camada de memória. Onde a memória do projeto Claude existe, ela é o sistema de continuidade canônico — os fatos do repositório, decisões, lacunas abertas e histórico de tratamento residem lá.

O Role OS se integra com a memória do projeto Claude. Ele não a substitui.

## Tratamento completo e verificação de envio

O tratamento completo é um protocolo canônico de 7 fases definido na memória do projeto Claude (`memory/full-treatment.md`). O Role OS direciona e revisa os tratamentos usando contratos de função, transferências e portas de revisão — ele não redefine o protocolo.

A **verificação de envio (Shipcheck)** é a porta de qualidade de 31 itens que é executada antes do tratamento completo. As portas rígidas A a D devem ser aprovadas antes que qualquer tratamento comece. Referência canônica: `memory/shipcheck.md`.

Ordem: Verificação de envio primeiro, depois tratamento completo. Não há v1.0.0 sem a aprovação das portas rígidas.

## 32 funções em 8 pacotes

| Pacote | Funções |
|------|-------|
| **Core** (3) | Coordenador, Estrategista de Produto, Avaliador Crítico |
| **Engineering** (7) | Desenvolvedor Front-end, Engenheiro Back-end, Engenheiro de Testes, Engenheiro de Refatoração, Engenheiro de Desempenho, Auditor de Dependências, Avaliador de Segurança |
| **Design** (2) | Designer de Interface, Guardião da Marca |
| **Marketing** (1) | Redator para Lançamento |
| **Treatment** (7) | Pesquisador de Repositórios, Tradutor de Repositórios, Arquiteto de Documentação, Curador de Metadados, Auditor de Cobertura, Verificador de Implantação, Engenheiro de Lançamento |
| **Product** (3) | Sintetizador de feedback, Priorizador de roteiro, Redator de especificações. |
| **Research** (4) | Pesquisador de Experiência do Usuário, Analista da Concorrência, Pesquisador de Tendências, Sintetizador de Entrevistas com Usuários |
| **Growth** (4) | Estrategista de Lançamento, Estrategista de Conteúdo, Gerente de Comunidade, Líder de Triagem de Suporte |

Cada função tem um contrato completo: missão, quando usar, quando não usar, entradas esperadas, saídas necessárias, padrão de qualidade e gatilhos de escalonamento. Cada função pode ser direcionada — `roleos route` pode recomendar qualquer uma delas com base no conteúdo do pacote.

## Como começar

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

## Quando não usar o Role OS

- Correções simples, erros de digitação ou bugs óbvios
- Pesquisa exploratória sem saída definida
- Trabalho que cabe na cabeça de uma pessoa em 5 minutos
- Correções emergenciais que precisam ser lançadas antes que a cadeia de revisão seja concluída
- Projetos onde a velocidade é mais importante que a estrutura

## Evidências

O Role OS foi comprovado em três modelos de teste em dois repositórios estruturalmente diferentes:

**Teste 001 — Trabalho de funcionalidade** (Tela da Equipe, Star Freight)
- Cadeia de 7 funções, 45 cenários de teste, 0 conflito de funções.
- Preveniu a contaminação de um ancestral bifurcado, detectou invenções inline e revelou bloqueios reais.

**Teste 002 — Trabalho de integração** (Conexão do Estado da Campanha, Star Freight)
- Cadeia de 5 funções, resolveu a junção arquitetural sem mentiras de fallback.
- Testes anti-fallback provaram que o caminho ativo é real, não um espaço reservado.

**Teste 003 — Trabalho de identidade** (Remoção de contaminação, Star Freight)
- Cadeia de 6 funções, 51 cenários de teste, incluindo defesa durável contra contaminação do CI.
- Corrigiu a derivação de ficção herdada sem reverter para uma grande reformulação.

**Teste de portabilidade** (Consistência da persona, sensibilidade aos sensores)
- Mesma estrutura básica, diferentes idiomas/domínios/pilhas de tecnologias.
- Adaptado apenas com mudanças de contexto — sem modificações no contrato principal.

**Tratamento Completo FT-001** (portlight-desktop)
- Tratamento completo em 7 fases, com funções do Pacote de Tratamento
- Verificação de lançamento comprovada, sem colisões de funções

**Tratamento Completo FT-002** (studioflow)
- Mesmo pacote de tratamento, repositório estruturalmente diferente (ambiente de criação vs. jogo)
- Pacote de tratamento portátil — nenhuma modificação no contrato é necessária

**Sessão de brainstorming de alta qualidade** (tópico do mercado de servidores MCP)
- Cadeia de 9 papéis, 4 analistas em paralelo, análise cruzada + gráfico de refutação de disputas.
- 4 desafios propostos, 3 alegações refinadas, 1 não resolvida — pressão saudável, sem impasse.
- Mais de 16 links de rastreamento dos artefatos gerados até os átomos da camada de verdade.
- Cadeia de custódia completa comprovada: verdade → átomos → disputa → síntese → expandir → julgar → renderizar → rastrear.

## Propriedades essenciais

Estas são inegociáveis. Se uma alteração enfraquecer qualquer uma delas, rejeite-a.

- Os limites de função são mantidos.
- A revisão é rigorosa.
- A escalação permanece transparente.
- Os pacotes permanecem testáveis.
- A portabilidade requer adaptação ao contexto, não alterações profundas na estrutura.

## Estrutura do projeto

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

## Segurança

O sistema "Role OS" opera **apenas localmente**. Ele copia modelos em formato Markdown e escreve arquivos de pacotes/resultados no diretório `.claude/` do seu repositório. Ele não acessa a rede, não lida com informações confidenciais e não coleta dados de telemetria. Não há operações perigosas — todas as operações de escrita de arquivos usam a opção "skip-if-exists" por padrão. Consulte o arquivo [SECURITY.md](SECURITY.md) para a política completa.

## O sistema operacional

| Camada. | O que ele faz | Status |
|-------|-------------|--------|
| **Routing** | Avalia todas as 31 funções com base no conteúdo do pacote, explica as recomendações, avalia a confiança. | ✓ Implementado. |
| **Chain builder** | Monta cadeias ordenadas por fase a partir de funções classificadas, com viés para o tipo de pacote, mas não bloqueadas por modelos. | ✓ Implementado. |
| **Conflict detection** | Validação em 4 etapas: conflitos graves, sequência, redundância, lacunas de cobertura. Sugestões de correção. | ✓ Implementado. |
| **Escalation** | Direciona automaticamente o trabalho bloqueado/rejeitado/dividido para o resolvedor correto, com motivo + artefato necessário. | ✓ Implementado. |
| **Evidence** | Evidências estruturadas em decisões, específicas para cada função. Verificações de suficiência. 12 tipos de evidência. | ✓ Implementado. |
| **Dispatch** | Gera manifestos de execução para multi-claude. Perfis de ferramentas por função, prompts do sistema, orçamentos. | ✓ Implementado. |
| **Trials** | Conjunto completo comprovado: 30/30 tarefas de sucesso + 5/5 testes negativos. 7 testes de pacote concluídos. | ✓ Completo. |
| **Team Packs** | 7 pacotes calibrados com seleção automática, proteções contra incompatibilidades e fallback de direcionamento livre. | ✓ Implementado. |
| **Outcome calibration** | Registra os resultados da execução, ajusta os pesos dos pacotes/funções com base nos resultados e ajusta os limites de confiança. | ✓ Implementado. |
| **Mixed-task decomposition** | Detecta trabalhos compostos, divide em pacotes filhos, atribui pacotes, preserva dependências. | ✓ Implementado. |
| **Composite execution** | Executa pacotes filhos na ordem de dependência, com passagem de artefatos, recuperação de ramificação e síntese. | ✓ Implementado. |
| **Adaptive replanning** | Alterações de escopo, descobertas ou novos requisitos durante a execução atualizam o plano sem reinicialização. | ✓ Implementado. |
| **Session spine** | `roleos init claude` cria os arquivos CLAUDE.md, /roleos-route, /roleos-review, /roleos-status. `roleos doctor` verifica as conexões. Os cartões de roteamento comprovam o engajamento. | ✓ Implementado. |
| **Hook spine** | 5 ganchos de ciclo de vida (SessionStart, PromptSubmit, PreToolUse, SubagentStart, Stop). Aplicação de políticas: lembretes de roteamento, controle de acesso a ferramentas, injeção de papéis de subagente, auditoria de conclusão. | ✓ Implementado. |
| **Artifact spine** | 20 contratos de artefatos por papel. 7 contratos de transferência de pacotes. Validação estrutural. Verificações de integridade da cadeia. Os papéis subsequentes nunca adivinham o que receberam. | ✓ Implementado. |
| **Mission library** | 6 missões nomeadas (feature-ship, bugfix, treatment, docs-release, security-hardening, research-launch). Cada uma define pacote, cadeia de papéis, fluxo de artefatos, ramificações de escalonamento, definição honesta e parcial. Todas as 6 foram testadas e aprimoradas. | ✓ Implementado. |
| **Mission runner** | Criação de execuções, acompanhamento passo a passo com estado rastreado, conclusão/falha com relatórios precisos. Propagação de etapas bloqueadas, avisos de escalonamento fora da cadeia, reabertura da última etapa. | ✓ Implementado. |
| **Unified entry** | `roleos start` decide automaticamente entre missão, pacote ou roteamento livre. Sistema de fallback com pontuações de confiança, alternativas e detecção composta. | ✓ Implementado. |
| **Persistent runs** | `roleos run` cria execuções com backup no disco. Comandos: `resume` (retomar), `next` (próximo), `explain` (explicar), `complete` (concluir), `fail` (falha). Intervenções: redirecionar, escalar, tentar novamente, bloquear, reabrir. Orientações específicas para cada etapa. Medição de atrito. | ✓ Implementado. |
| **Brainstorm** | Arquitetura de duas camadas: verdade (esquemas nativos do papel, átomos de procedência, gráfico de disputa de análise cruzada) + renderização (5 vozes distintas, restrições lexicais, transcrição do debate). Os links de rastreamento comprovam que cada alegação renderizada corresponde a um átomo de verdade. Sessão de brainstorming de alta qualidade: 894 testes. | ✓ Implementado. |

## 6 missões

| Missão | Pacote | Funções | Quando usar |
|---------|------|-------|-------------|
| `feature-ship` | Funcionalidade (feature) | 5 | Entrega completa da funcionalidade: escopo → especificação → implementação → teste → revisão |
| `bugfix` | Correção de bug (bugfix) | 4 | Diagnosticar a causa raiz, corrigir, testar, verificar |
| `treatment` | Tratamento | 4 | Verificação + polimento + documentação + verificação CI + revisão |
| `docs-release` | Documentação | 2 | Escrever/atualizar documentação, notas de lançamento |
| `security-hardening` | Segurança | 4 | Modelo de ameaças, auditoria, correção de vulnerabilidades, re-auditoria, verificação |
| `research-launch` | Pesquisa | 4 | Formular a pergunta, pesquisar, documentar os resultados, decidir |
| `brainstorm` | brainstorming | 9 | Investigação estruturada com múltiplas perspectivas, com desacordo rastreável e veredicto. |

Cada missão inclui definições honestas e parciais — quando o trabalho é interrompido, o sistema documenta o que foi concluído e o que resta, em vez de apresentar uma conclusão falsa.

### Missão de brainstorming

Não é "brainstorming de IA". A missão de brainstorming é **papéis especializados sob a lei, com desacordo rastreável e resultados que comprovam o veredicto.**

```bash
roleos run "explore product directions for a developer tool discovery platform"
# → MISSION: Brainstorm (Structured Inquiry)
#   Chain: 4 Analysts (parallel) → Normalize → Cross-Examine → Rebut → Synthesize → Expand → Judge
```

**O que a diferencia:**

- **Camada 1 (verdade):** Quatro analistas emitem esquemas nativos do papel (ContextMap, UserValueMap, MechanicsMap, PositioningMap) — não é prosa compartilhada. Cada papel tem restrições para evitar pontos cegos: frases proibidas, tipos de alegações proibidas, partições de entrada filtradas. Os átomos carregam informações de procedência. Um gráfico de análise cruzada direcionada gera desafios específicos. Os analistas originais defendem, refinam ou retiram suas alegações sob pressão.

- **Camada 2 (renderização):** Cinco vozes humanas distintas (Boundary Memo, Field Notes, System Sketch, Claim Brief, Cross-Exam Transcript) com restrições lexicais para evitar a convergência das vozes. A síntese consome a verdade, nunca a prosa renderizada. Ambas as camadas estão sempre disponíveis.

- **Cadeia de custódia:** Cada frase renderizada rastreia até um átomo da camada de verdade. As instruções de síntese citam os átomos. Os alvos da análise cruzada são IDs de alegações reais. O gráfico de disputa é o produto, não a prosa.

**Comprovado:** versão 0.4 da sessão de brainstorming de alta qualidade — 894 testes, cadeia de custódia completa verificada. Consulte [`examples/golden-run.md`](examples/golden-run.md) para a cadeia completa de artefatos.

## Status

- v0.1–v0.4: Fundação — testes, adoção, pacote de tratamento, pacote inicial.
- v1.0.0: 32 funções, CLI completa, tratamento comprovado, portabilidade multi-repositório.
- v1.0.2: Bloqueio do sistema operacional para funções (correções de inicialização, `init --force`).
- v1.1.0: 31 funções, roteamento completo, detecção de conflitos, escalonamento, evidências, despacho, 7 pacotes de equipe comprovados. 35 testes de execução. 212 testes.
- v1.2.0: Pacotes calibrados promovidos a entrada padrão. Seleção automática, detecção de incompatibilidades, sugestão alternativa, fallback de roteamento livre. 246 testes.
- v1.3.0: Calibração de resultados, decomposição de tarefas mistas, execução composta, replanejamento adaptativo. 317 testes.
- v1.4.0: Espinha dorsal da sessão — `roleos init claude`, `roleos doctor`, cartões de rota, comandos `/roleos-route + /roleos-review + /roleos-status`. 335 testes.
- v1.5.0: Espinha dorsal de hooks — 5 hooks de ciclo de vida para aplicação em tempo de execução. 358 testes.
- v1.6.0: Espinha dorsal de artefatos — 20 contratos de artefatos por função, 7 contratos de transferência de pacotes, validação estrutural. 385 testes.
- v1.7.0: Prova de conclusão — tarefas reais executadas em toda a pilha. CLI `roleos artifacts`. Escalabilidade honesta para correções estruturais. 398 testes.
- v1.8.0: Biblioteca de missões (Fase S) — 6 missões nomeadas, motor de execução, relatórios de conclusão. Reforçado com 6 execuções de teste reais. 481 testes.
- v1.9.0: Caminho de entrada unificado (Fase T) — `roleos start` decide automaticamente entre missão, pacote ou roteamento livre. Escada de fallback, detecção composta, testes de comparação de caminho de entrada. 527 testes.
- **v2.0.0**: Otimização da experiência do usuário (Fase U) — `roleos run` cria execuções persistentes com backup em disco. Retomar, próximo, explicar, completar, falhar. Intervenções: redirecionar, escalar, tentar novamente, bloquear, reabrir. Orientação passo a passo em cada etapa. Medição de atrito. 6 testes de atrito. 613 testes.
- **v2.0.1**: Auditoria do manual, documentação para iniciantes, correções na contagem de testes. 617 testes.
- **v2.1.0**: Missão de brainstorming (v0.4) — funções especializadas sob a lei, desacordo rastreável, saída com valor de decisão. Arquitetura de duas camadas (verdade + renderização), matriz de permissão de interrogatório, grafo de disputas, prova de execução ideal. 7 missões, 50 funções, 8 pacotes. 894 testes.

## Licença

MIT

---

Desenvolvido por <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a
