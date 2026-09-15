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

Uma camada operacional nativa de repositório que aloca, roteia, valida e executa o trabalho de agentes de codificação por meio de 61 contratos de função especializados. Cria pacotes de tarefas, monta a equipe certa a partir de uma correspondência de funções avaliada, detecta falhas antes da execução, roteia automaticamente a recuperação quando o trabalho é bloqueado ou rejeitado e exige evidências estruturadas em cada verificação. Inclui despacho dinâmico para missões de escala de manifesto — um repositório de 10 componentes se torna automaticamente 28 etapas de auditoria, em vez de 6.

O adaptador Claude Code é lançado (`roleos init` cria `.claude/`). Os contratos são em formato markdown, que qualquer estrutura de codificação pode consumir — este repositório não afirma que um segundo adaptador já está em execução.

## O que ele faz

O Role OS é a maneira profissional de alocar o trabalho de agentes de codificação. Ele evita as falhas específicas que os fluxos de trabalho genéricos de IA produzem:

- **Desvio** — as funções permanecem dentro de seus limites. O produto não é redesenhado. O frontend não redefine o escopo. O backend não inventa a direção do produto.
- **Conclusão falsa** — a definição de "concluído" é concreta. O trabalho que oculta lacunas, ignora a verificação ou resolve um problema diferente é rejeitado.
- **Contaminação** — projetos ramificados ou herdados carregam resíduos de identidade. O Role OS detecta e rejeita o desvio entre projetos na terminologia, elementos visuais e modelos mentais.
- **Progresso baseado em "vibes"** — cada transferência é estruturada. Cada verificação está vinculada a evidências. "Parece concluído" não é um estado válido.

## Como funciona

Descreva sua tarefa. O Role OS decide automaticamente o nível correto de orquestração.

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

**A escada de fallback:**

1. **Missão** — quando a tarefa corresponde a um fluxo de trabalho recorrente comprovado (correção de bug, tratamento, lançamento de recurso, documentação, segurança, pesquisa, brainstorming, auditoria aprofundada, teste em grupo). Cadeia de funções conhecida, fluxo de artefatos, ramificações de escalonamento e definições honestas e parciais.
2. **Pacote** — quando a tarefa pertence a uma família conhecida, mas não tem a forma completa de uma missão. 10 pacotes de equipe calibrados com seleção automática e proteções contra incompatibilidades.
3. **Roteamento livre** — quando a tarefa é nova, mista ou incerta. Avalia todas as 61 funções em relação ao conteúdo do pacote e monta uma cadeia dinâmica.

O sistema nunca força o trabalho por meio da abstração errada. Ele explica por que escolheu cada nível e oferece alternativas.

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

**Intervenções quando as coisas dão errado:**

```bash
roleos retry 0                 # Retry a failed step
roleos reroute 1 "Frontend Developer" "UI bug"  # Swap a role
roleos escalate "Test Engineer" "Repo Researcher" "missed edge case" "re-diagnose"
roleos block 2 "waiting for API spec"
roleos reopen 0 "found issue in review"
```

As execuções são persistidas em disco (`.claude/runs/`), para que as sessões interrompidas sejam retomadas de forma limpa. Cada etapa inclui orientação para o operador: o que produzir, as seções necessárias e as condições de parada.

**Após o roteamento:**

1. **Cada função produz uma transferência** — saída estruturada com itens de evidência que reduzem a ambiguidade para a próxima função.
2. **Crítico analisa em relação ao contrato** — aceita, rejeita ou bloqueia com base em evidências estruturadas, não em impressões.
3. **Rotas de recuperação são executadas automaticamente** — o trabalho bloqueado ou rejeitado é roteado para o resolvedor correto com um motivo, tipo de recuperação e artefato necessário.

## Despacho com consciência de orçamento

O Role OS pode consultar um **analista de orçamento de tokens** local para cada etapa de despacho e anexar uma previsão de gastos consultiva ao manifesto — opcional (`ROLEOS_BUDGET_CONSULT`), consultiva (nunca bloqueia um despacho) e, em caso de falha, retorna a um valor base determinístico. Desativado por padrão; a previsão é local e gratuita. Consulte o [manual](https://mcp-tool-shop-org.github.io/role-os/handbook/specialist-budget/).

## Supervisão de chamadas de ferramentas

O Role OS verifica e controla as chamadas de ferramentas na junção `PreToolUse` — de forma determinística, sem nenhum modelo no caminho crítico:

- **Observador de conformidade** (consultivo, falha segura) — um esquema determinístico + um limite de contrato computável verifica uma chamada proposta em relação ao seu contrato de ferramenta catalogado e anexa uma verificação consultiva sobre uma chamada comprovadamente não conforme; nunca bloqueia. Um limite LLM opcional (`ROLEOS_CONFORMANCE_CONSULT`) lida com o resíduo genuinamente semântico.
- **Portão de capacidade** (falha fechada, opcional `ROLEOS_CAPABILITY_GATE`, padrão DESATIVADO) — privilégio mínimo determinístico em ações *irreversíveis* (publicação em npm/PyPI, `gh release`, `git push`, edições de repositório, implantação em Páginas). Uma ação controlada é negada, a menos que o diretor tenha concedido sua capacidade em `.claude/role-os/capabilities.json`, para que uma etapa errada — um erro honesto ou um injetado — não possa acionar uma ação irreversível não autorizada. O complemento preventivo da regra de compensador nomeado. Consulte o [manual](https://mcp-tool-shop-org.github.io/role-os/handbook/).

## Dossiê da equipe

Cada função tem um **dossiê** — uma ficha de personagem que também serve como configuração em tempo de execução. Seis aptidões (Rigor, Ritmo, Amplitude, Ceticismo, Autonomia, Franqueza) são mapeadas para controles de despacho reais; uma camada de **disposição** de oito arquétipos (Cético, Construtor, Investigador, Inovador...) carrega uma instrução comportamental; e cada função tem um retrato pintado e uma classificação. Navegue por toda a equipe como uma galeria (`dossier/dossier.html`) — o radar de cada função mostra sua configuração ajustada em relação ao seu ideal canônico.

Quando uma função tem um dossiê, o despacho injeta uma **Postura Operacional** — a instrução comportamental da disposição mais uma linha de postura das aptidões da função — para que a ficha realmente configure a função. Opcional e aditivo: as funções sem um dossiê se comportam exatamente como antes. Consulte o [manual](https://mcp-tool-shop-org.github.io/role-os/handbook/crew-dossier/).

## Estado de implantação organizacional

O estado de implantação em toda a organização (fila, decisões, registros de auditoria, pacotes de bloqueio por repositório) reside em um **privado**, repositório interno da organização separado (`role-os-rollout`). Este repositório é o produto; aquele repositório é o estado operacional.

## Memória e continuidade

O Role OS não possui nem duplica a camada de memória. Onde existe um armazenamento de memória de projeto de estrutura, ele é o sistema de continuidade canônico — fatos do repositório, decisões, ciclos abertos e histórico de tratamento residem lá.

O Role OS se integra a esse armazenamento quando ele está presente. Ele não o substitui.

## Tratamento completo e verificação do projeto

O tratamento completo é um protocolo canônico de 7 fases definido na memória do projeto do estúdio (`memory/full-treatment.md`). O Role OS roteia e revisa os tratamentos usando contratos de função, transferências e portões de avaliação — ele não redefine o protocolo.

A **verificação do projeto** é o portão de qualidade com 31 itens que é executado antes do tratamento completo. Os portões rígidos A-D devem ser aprovados antes que qualquer tratamento comece. Referência canônica: `memory/shipcheck.md`.

Ordem: primeiro a verificação do projeto, depois o tratamento completo. Sem v1.0.0 sem a aprovação dos portões rígidos.

## O catálogo de 61 funções

O catálogo agrupa suas 61 funções em 11 famílias. (O Dispatch usa um conjunto separado de 10 **pacotes de equipe** — funcionalidade, correção de bugs, segurança, documentação, lançamento, pesquisa, tratamento, auditoria aprofundada, brainstorming, trabalho em equipe — que extraem funções dessas famílias.)

| Família | Funções |
|--------|-------|
| **Core** (2) | Orquestrador, Avaliador Crítico |
| **Product** (4) | Estrategista de Produto, Sintetizador de Feedback, Priorizador de Roteiro, Redator de Especificações |
| **Engineering** (7) | Desenvolvedor Front-end, Engenheiro Back-end, Engenheiro de Testes, Engenheiro de Refatoração, Engenheiro de Desempenho, Auditor de Dependências, Avaliador de Segurança |
| **Design** (2) | Designer de UI, Guardião da Marca |
| **Marketing** (1) | Redator de Textos para Lançamento |
| **Treatment** (7) | Pesquisador de Repositório, Tradutor de Repositório, Arquiteto de Documentação, Curador de Metadados, Auditor de Cobertura, Verificador de Implantação, Engenheiro de Lançamento |
| **Research** (4) | Pesquisador de UX, Analista Competitivo, Pesquisador de Tendências, Sintetizador de Entrevistas com Usuários |
| **Growth** (4) | Estrategista de Lançamento, Estrategista de Conteúdo, Gerente de Comunidade, Líder de Triagem de Suporte |
| **Brainstorm** (19) | Explorador de Contexto, Explorador de Valor do Usuário, Explorador de Inovação Criativa, Explorador de Mecânicas, Explorador de Mercado, Explorador Contrário, Explorador de Viabilidade, Explorador de Padrões de Qualidade, Analista de Contexto, Analista de Valor do Usuário, Analista de Mecânicas, Analista de Posicionamento, Analista Contrário, Normalizador, Sintetizador, Expansor de Produto, Expansor de Cenários, Expansor de Barreiras, Juiz |
| **Deep Audit** (4) | Auditor de Componentes, Auditor de Verdade dos Testes, Auditor de Interface, Sintetizador de Auditoria |
| **Swarm** (7) | Coordenador de Equipe, Agente Back-end da Equipe, Agente de Ponte da Equipe, Agente de Testes da Equipe, Agente de Infraestrutura da Equipe, Agente Front-end da Equipe, Sintetizador da Equipe |

Cada função tem um contrato completo: missão, quando usar, quando não usar, entradas esperadas, saídas necessárias, padrão de qualidade e gatilhos de escalonamento. Cada função pode ser roteada — `roleos route` pode recomendar qualquer uma delas com base no conteúdo do pacote.

## Guia rápido

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

## Quando não usar o Role OS

- Correções de uma linha, erros de digitação ou bugs óbvios
- Pesquisa exploratória sem uma saída definida
- Trabalho que cabe na cabeça de uma pessoa em 5 minutos
- Correções urgentes que precisam ser lançadas antes que uma cadeia de revisão seja concluída
- Projetos nos quais você deseja velocidade em vez de estrutura

## Evidências

O Role OS foi comprovado em três modelos de teste em dois repositórios estruturalmente diferentes:

**Teste 001 — Trabalho de funcionalidade** (Tela da tripulação, Star Freight)
- Cadeia de 7 funções, 45 cenários de teste, 0 conflitos de função
- Evitou a contaminação de um ancestral de fork, detectou invenção em linha, revelou bloqueios honestos

**Teste 002 — Trabalho de integração** (Conexão CampaignState, Star Freight)
- Cadeia de 5 funções, resolveu uma interface arquitetural sem mentiras de fallback
- Testes anti-fallback provaram que o caminho ativo é real, não um espaço reservado

**Teste 003 — Trabalho de identidade** (Purga de contaminação, Star Freight)
- Cadeia de 6 funções, 51 cenários de teste, incluindo defesa duradoura contra contaminação de CI
- Corrigiu a deriva de ficção herdada sem entrar em colapso em um redesenho amplo

**Teste de portabilidade** (Consistência de persona, sensor-humor)
- Mesmo núcleo, linguagem/domínio/pilha diferentes
- Adotado com apenas alterações de contexto — sem modificações no contrato principal

**Tratamento completo FT-001** (portlight-desktop)
- Tratamento de 7 fases com funções do Pacote de Tratamento
- A verificação do projeto foi comprovada, zero conflitos de função

**Tratamento completo FT-002** (studioflow)
- Mesmo pacote de tratamento, repositório estruturalmente diferente (espaço de trabalho criativo vs. jogo)
- O Pacote de Tratamento é portátil — nenhuma modificação no contrato é necessária

**Sessão de brainstorming de sucesso** (tópico do mercado MCP)
- Cadeia de 9 funções, 4 analistas em paralelo, examinar em conjunto + refutar o gráfico de disputa
- 4 desafios lançados, 3 reivindicações restritas, 1 não resolvido — pressão saudável, não um impasse
- 16+ links de rastreamento de artefatos renderizados de volta aos átomos da camada de verdade
- Cadeia completa de custódia comprovada: verdade → átomos → disputa → síntese → expansão → juiz → renderização → rastreamento

## Propriedades principais

Estas são inegociáveis. Se uma mudança enfraquecer alguma delas, rejeite-a.

- Os limites das funções são mantidos
- A revisão tem peso
- O escalonamento permanece honesto
- Os pacotes permanecem testáveis
- A portabilidade requer adaptação de contexto, não cirurgia no núcleo

## Estrutura do projeto

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

## Segurança

Por padrão, o Role OS opera apenas no **sistema de arquivos local**. Ele copia modelos Markdown e grava arquivos de pacote/veredicto/execução no diretório `.claude/` do seu repositório. A operação padrão não faz solicitações de rede, não lida com segredos e não coleta telemetria. Nenhuma operação perigosa — todas as gravações de arquivos usam "ignorar se existir" por padrão.

Três recursos **opcionais** acessam a rede quando você os habilita explicitamente:

- **`roleos verify-citations`** — executa o comando externo `prism` CLI, que resolve identificadores de citação em relação às APIs públicas do arXiv/Crossref (envia os IDs/URLs de citação que estão sendo verificados).
- **Nível de especialista** (`roleos specialist`, funções registradas) — envia prompts de despacho para o `backend_url` que você configura em `.role-os/specialists.json` (geralmente um ponto de extremidade de modelo local).
- **Consulta de orçamento/conformidade** (`ROLEOS_BUDGET_CONSULT` / `ROLEOS_CONFORMANCE_CONSULT`) — envia o contexto da etapa/chamada de ferramenta para um modelo local via HTTP para um veredicto consultivo.

Todos os três estão desativados por padrão e, em caso de falha, permitem um comportamento local determinístico. Consulte [SECURITY.md](SECURITY.md) para obter a política completa.

## Sistema operacional

| Camada | O que ele faz | Status |
|-------|-------------|--------|
| **Routing** | Avalia todas as 61 funções em relação ao conteúdo do pacote, explica as recomendações, avalia a confiança. | ✓ Implementado |
| **Chain builder** | Monta cadeias ordenadas por fase a partir de funções avaliadas, com viés para o tipo de pacote, mas não restrito a um modelo. | ✓ Implementado |
| **Conflict detection** | Validação em 4 etapas: conflitos graves, sequência, redundância, lacunas de cobertura. Sugestões de correção. | ✓ Implementado |
| **Escalation** | Roteia automaticamente tarefas bloqueadas/rejeitadas/divididas para o resolvedor correto, com justificativa + artefato necessário. | ✓ Implementado |
| **Evidence** | Evidências estruturadas, conscientes da função, nos resultados. Verificações de suficiência. 12 tipos de evidência. | ✓ Implementado |
| **Dispatch** | Gera manifestos de execução para o conjunto de ferramentas do agente de codificação. Perfis de ferramentas por função, prompts do sistema, orçamentos. | ✓ Implementado |
| **Trials** | Conjunto completo comprovado: 30/30 tarefas de alta prioridade + 5/5 testes negativos. 7 testes de pacote concluídos. | ✓ Concluído |
| **Team Packs** | 10 pacotes calibrados com seleção automática, proteções contra incompatibilidades e fallback de roteamento livre. | ✓ Implementado |
| **Outcome calibration** | Registra os resultados da execução, ajusta os pesos do pacote/função com base nos resultados, ajusta os limites de confiança. | ✓ Implementado |
| **Mixed-task decomposition** | Detecta trabalho composto, divide em pacotes filhos, atribui pacotes, preserva as dependências. | ✓ Implementado |
| **Composite execution** | Executa pacotes filhos na ordem de dependência, com passagem de artefatos, recuperação de ramificações e síntese. | ✓ Implementado |
| **Adaptive replanning** | Alterações de escopo, descobertas ou novos requisitos no meio da execução atualizam o plano sem reiniciar. | ✓ Implementado |
| **Session spine** | `roleos init claude` cria os arquivos CLAUDE.md, /roleos-route, /roleos-review, /roleos-status. `roleos doctor` verifica a configuração. Os cartões de roteamento comprovam o envolvimento. | ✓ Implementado |
| **Hook spine** | 5 ganchos de ciclo de vida (SessionStart, PromptSubmit, PreToolUse, SubagentStart, Stop). Aplicação de políticas: lembretes do cartão de roteamento, bloqueio de ferramentas de escrita, injeção de função de subagente, auditoria de conclusão. | ✓ Implementado |
| **Artifact spine** | Contratos de artefato por função. Contratos de transferência de pacote. Validação estrutural. Verificações de integridade da cadeia. As funções subsequentes nunca adivinham o que receberam. | ✓ Implementado |
| **Mission library** | 9 missões nomeadas (lançamento de recursos, correção de bugs, tratamento, lançamento de documentação, reforço de segurança, lançamento de pesquisa, brainstorming, auditoria aprofundada, teste em grupo). Cada uma declara o pacote, a cadeia de funções, o fluxo de artefatos, as ramificações de escalonamento e a definição honesta-parcial. | ✓ Implementado |
| **Mission runner** | Cria execuções, percorre as etapas com estado rastreado, conclui/falha com relatório honesto. Propagação de etapas bloqueadas, avisos de escalonamento fora da cadeia, reabertura da última etapa. | ✓ Implementado |
| **Unified entry** | `roleos start` decide automaticamente entre missão, pacote ou roteamento livre. Escada de fallback com pontuações de confiança, alternativas e detecção de composição. | ✓ Implementado |
| **Persistent runs** | `roleos run` cria execuções com suporte em disco. `resume`, `next`, `explain`, `complete`, `fail`. Intervenções: roteamento, escalonamento, repetição, bloqueio, reabertura. Orientação local da etapa. Medição de atrito. | ✓ Implementado |
| **Brainstorm** | Arquitetura de duas camadas: verdade (esquemas nativos da função, átomos de proveniência, gráfico de disputa de contra-argumentação) + renderização (5 vozes distintas, proibições lexicais, transcrição do debate). Os links de rastreamento comprovam que cada afirmação renderizada corresponde a um átomo de verdade. Execução de sucesso comprovada. | ✓ Implementado |
| **Deep Audit** | Auditoria de repositório dimensionada por manifesto: decompõe o repositório em componentes, despacha N auditores + M auditores de teste de verdade + K auditores de junção do gráfico de dependência, sintetiza em um resultado classificado e plano de ação. O despacho dinâmico é dimensionado com o tamanho do repositório (fórmula 2N + K + 3). Nativo do executor, com validação de artefato em cada etapa. | ✓ Implementado |
| **Dogfood Swarm** | Convergência em várias etapas: três estágios de saúde (bug/segurança → proativo → humanização) e, em seguida, etapa de recursos. Propriedade exclusiva de arquivos, bloqueios de construção após cada onda, pontos de verificação do usuário. A detecção automática de domínio gera manifestos. Ponte de evidência para os laboratórios de teste. | ✓ Implementado |

## 9 missões

| Missão | Pacote | Funções | Quando usar |
|---------|------|-------|-------------|
| `feature-ship` | recurso | 5 | Entrega completa de recursos: escopo → especificação → implementação → teste → revisão |
| `bugfix` | correção de bug | 4 | Diagnosticar a causa raiz, corrigir, testar, verificar |
| `treatment` | tratamento | 4 | Verificação + polimento + documentação + verificação de CI + revisão |
| `docs-release` | documentação | 2 | Escrever/atualizar a documentação, notas de lançamento |
| `security-hardening` | segurança | 4 | Modelo de ameaças, auditoria, correção de vulnerabilidades, reauditoria, verificação |
| `research-launch` | pesquisa | 4 | Formular a pergunta, pesquisar, documentar as descobertas, decidir |
| `brainstorm` | brainstorming | 9 | Investigação estruturada e multiperspectiva com discordância rastreável e resultado decisório. |
| `deep-audit` | auditoria aprofundada | 5 (escalas) | Auditoria de repositório com suporte em manifesto — o número de trabalhadores é dimensionado com o gráfico do repositório por meio de despacho dinâmico |
| `dogfood-swarm` | grupo | 8 (escalas) | Convergência em várias etapas: saúde-a → saúde-b → saúde-c → recurso → síntese final |

Cada missão inclui definições honestas-parciais — quando o trabalho estagna, o sistema documenta o que foi concluído e o que resta, em vez de fingir a conclusão.

### Missão de brainstorming

Não é "brainstorming de IA". A missão de brainstorming é **funções especializadas sob a lei, com discordância rastreável e saída que produz um resultado decisório.**

```bash
roleos run "explore product directions for a developer tool discovery platform"
# → MISSION: Brainstorm (Structured Inquiry)
#   Chain: 4 Analysts (parallel) → Normalize → Cross-Examine → Rebut → Synthesize → Expand → Judge
```

**O que a torna diferente:**

- **Camada 1 (verdade):** Quatro analistas emitem esquemas nativos da função (ContextMap, UserValueMap, MechanicsMap, PositioningMap) — não prosa compartilhada. Cada função tem aplicação de pontos cegos: frases proibidas, tipos de afirmação proibidos, partições de entrada filtradas. Os átomos carregam a proveniência. Um gráfico de contra-argumentação direcionado produz desafios direcionados. Os analistas originais defendem, restringem ou revogam sob pressão.

- **Camada 2 (renderização):** Cinco vozes humanas distintas (Boundary Memo, Field Notes, System Sketch, Claim Brief, Cross-Exam Transcript) com proibições lexicais que impedem a convergência das vozes. A síntese consome a verdade, nunca a prosa renderizada. Ambas as camadas estão sempre disponíveis.

- **Cadeia de custódia:** Cada frase gerada pode ser rastreada até um átomo da camada de verdade. As direções de síntese citam átomos. Os alvos do interrogatório cruzado são IDs de afirmações reais. O gráfico de disputa é o produto, não o texto.

**Comprovado:** execução v0.4 — cadeia de custódia completa verificada. Consulte [`examples/golden-run.md`](examples/golden-run.md) para a cadeia completa de artefatos.

### Missão de auditoria aprofundada

Não é uma análise superficial. A missão de auditoria aprofundada **decompõe um repositório em componentes delimitados e designa auditores especializados em uma escala determinada pelo próprio gráfico de dependências do repositório.**

```bash
roleos run "deep audit this repo" --manifest=audit-manifest.json
# → MISSION: Deep Audit (Manifest-Scaled)
#   Steps: Component Auditor ×6 + Test Truth Auditor ×6 + Seam Auditor ×8 + Synthesizer + Action Plan + Critic = 23 steps
```

**O que a torna diferente:**

- **Distribuição dinâmica** — o número de trabalhadores não é fixo. Um repositório de 10 componentes com 5 clusters de limite produz 28 etapas (2×10 + 5 + 3). Um repositório de 3 componentes produz 12. A fórmula de dimensionamento é `2N + K + 3`, onde N = componentes, K = limites.
- **Pacotes baseados em manifesto** — um `audit-manifest.json` define componentes (com caminhos de arquivo, contagem de linhas, descrições) e limites (de/para com descrições da interface). Cada auditor recebe apenas seu pacote.
- **Quatro arquétipos de função** — Auditor de Componente (verdade do código por módulo), Auditor de Verdade de Teste (testes que comprovam vs. testes que existem), Auditor de Interface (limites de integração do gráfico de dependências), Sintetizador de Auditoria (veredicto classificado + plano de ação de todos os pacotes).
- **Validação de artefatos em cada etapa** — `validateArtifact()` é acionado em cada conclusão de etapa em ambos os caminhos de execução. Resultados anexados aos objetos de etapa. O sistema sabe se cada artefato atendeu ao seu contrato.
- **Parcial honesto** — quando o orçamento ou o escopo impedem a conclusão, os resultados por componente são individualmente válidos. O sistema sintetiza a partir do que foi concluído, nunca finge cobertura total.

**Comprovado:** execução de prova nativa do Runner — 18 testes contra um manifesto real, ciclo de vida completo verificado, incluindo reabertura de escalonamento e falha parcial. A fórmula de dimensionamento foi verificada para manifestos de 3/6/10/15 componentes.

### Missão de enxame de teste

Não é uma análise única. A missão de enxame de teste **executa um protocolo de convergência de várias etapas que move um repositório de "funciona" para "pronto para produção" por meio de três estágios de saúde e entrega iterativa de recursos.**

```bash
roleos swarm
# → MISSION: Dogfood Swarm (Multi-Pass Convergence)
#   Stages: Health-A → Health-B → Health-C → Feature → Final
#   Domain agents: 3-5 parallel per wave (exclusive file ownership)
```

**O que a torna diferente:**

- **Três estágios de avaliação de saúde** — O estágio A corrige bugs e problemas de segurança (loop até 0 CRÍTICO + 0 ALTO). O estágio B aplica endurecimento proativo (os usuários analisam os resultados). O estágio C humaniza o código — mensagens de erro que ajudam os usuários, feedback de reconexão, estados de carregamento, acessibilidade. Cada estágio é uma lente distinta, não a mesma análise repetida.
- **Propriedade exclusiva de arquivos** — cada agente de domínio possui arquivos específicos por meio de `swarm-manifest.json`. Nenhum agente edita o mesmo arquivo. Sem conflitos de mesclagem. Sem sobrecarga de coordenação.
- **Portões de construção** — lint + verificação de tipo + teste devem ser aprovados após cada onda. O sistema detecta automaticamente o sistema de construção (Node, Rust, Python, Go) e executa os comandos corretos.
- **Pontos de verificação do usuário** — a saúde-B e o estágio de recursos exigem a aprovação explícita do usuário antes da execução. O sistema apresenta os resultados, o usuário decide o que construir.
- **Convergência iterativa** — os estágios fazem um loop com loops de onda até que as condições de saída sejam atendidas ou o número máximo de iterações seja atingido. Cada onda reavalia do zero para detectar regressões introduzidas por correções anteriores.
- **Detecção automática de domínio** — `roleos swarm manifest --generate` detecta o tipo de repositório (CLI, web, desktop, MCP, monorepo) e gera atribuições de domínio não sobrepostas.

**Comprovado:** claude-collaborate (2026-03-28) — 35→129 testes, 106 resultados de saúde corrigidos, v1.1.0 lançado. Protocolo v2.0 com 9 fases.

## Status

Estável e pronto para lançamento. Consulte o [CHANGELOG](CHANGELOG.md) para obter o histórico completo de versões e o que mudou em cada lançamento.

## Licença

MIT

---

Criado por <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a>
