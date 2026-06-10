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

Um sistema operacional multi-Claude que aloca, direciona, valida e executa tarefas por meio de 61 contratos de função especializados. Cria pacotes de tarefas, monta a equipe ideal com base na correspondência de funções, detecta falhas antes da execução, roteia automaticamente a recuperação quando uma tarefa é interrompida ou rejeitada e exige evidências estruturadas em cada verificação. Inclui despacho dinâmico para missões de grande escala — um repositório de 10 componentes se transforma automaticamente em 28 etapas de auditoria, em vez de 6.

## O que ele faz

Role OS é a maneira profissional de usar o multi-Claude. Ele previne as falhas específicas que os fluxos de trabalho genéricos de IA produzem:

- **Desvio** — as funções permanecem dentro de seus limites. O produto não é redesenhado. O frontend não redefine o escopo. O backend não inventa a direção do produto.
- **Conclusão falsa** — a definição de "concluído" é concreta. O trabalho que oculta lacunas, ignora a verificação ou resolve um problema diferente é rejeitado.
- **Contaminação** — projetos ramificados ou herdados carregam resíduos de identidade. O Role OS detecta e rejeita o desvio entre projetos na terminologia, elementos visuais e modelos mentais.
- **Progresso baseado em "vibes"** — cada transferência é estruturada. Cada verificação está vinculada a evidências. "Parece concluído" não é um estado válido.

## Como funciona

Descreva sua tarefa. O Role OS decide automaticamente o nível ideal de orquestração.

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

**Um único comando para iniciar a execução:**

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

As execuções são persistidas em disco (`.claude/runs/`), para que as sessões interrompidas sejam retomadas de forma limpa. Cada etapa inclui orientação para o operador: o que produzir, seções necessárias e condições de parada.

**Após o roteamento:**

1. **Cada função produz uma transferência** — saída estruturada com itens de evidência que reduzem a ambiguidade para a próxima função.
2. **O crítico avalia em relação ao contrato** — aceita, rejeita ou bloqueia com base em evidências estruturadas, não em impressões.
3. **O roteamento de recuperação é feito automaticamente** — o trabalho bloqueado ou rejeitado é roteado para o resolvedor correto, com um motivo, tipo de recuperação e artefato necessário.

## Despacho com consciência de orçamento

O Role OS pode consultar um **analista de orçamento de tokens** local para cada etapa de despacho e anexar uma previsão de gastos consultiva ao manifesto — opcional (`ROLEOS_BUDGET_CONSULT`), consultiva (nunca bloqueia um despacho) e com fallback para uma linha de base determinística. Desativado por padrão; a previsão é local e gratuita. Consulte o [manual](https://mcp-tool-shop-org.github.io/role-os/handbook/specialist-budget/).

## Supervisão das chamadas de ferramentas

O Role OS verifica e controla as chamadas de ferramentas no ponto `PreToolUse` — de forma determinística, sem nenhum modelo no caminho crítico:

- **Monitor de conformidade** (aconselhamento, falha aberta) — um esquema determinístico + verificações de contrato computável avaliam uma chamada proposta em relação ao seu contrato de ferramenta catalogado e anexam um parecer consultivo sobre uma chamada *comprovadamente* não conforme; nunca bloqueia. Um limite opcional do LLM (`ROLEOS_CONFORMANCE_CONSULT`) lida com o resíduo genuinamente semântico.
- **Controle de capacidade** (falha fechada, opcional `ROLEOS_CAPABILITY_GATE`, padrão DESLIGADO) — privilégio mínimo determinístico em ações *irreversíveis* (publicação no npm/PyPI, `gh release`, `git push`, edições do repositório, implantação de Páginas). Uma ação controlada é negada, a menos que o administrador tenha concedido sua capacidade em `.claude/role-os/capabilities.json`, portanto, um passo errado — um erro honesto ou um erro intencional — não pode acionar uma ação irreversível não autorizada. O complemento preventivo da regra de compensação nomeada. Consulte o [manual](https://mcp-tool-shop-org.github.io/role-os/handbook/).

## Dossiê da equipe

Cada função tem um **dossiê** — uma ficha de personagem que também serve como configuração para o tempo de execução. Seis aptidões (Rigor, Ritmo, Alcance, Ceticismo, Autonomia, Franqueza) correspondem a parâmetros reais de distribuição; uma camada de **disposição** com oito arquétipos (Cético, Construtor, Investigador, Rebelde…) contém uma instrução comportamental; e cada função tem um retrato pintado e uma classificação. Veja toda a equipe como uma galeria (`dossier/dossier.html`) — o radar de cada função mostra sua configuração ajustada em relação ao seu ideal canônico.

Quando uma função tem um dossiê, a distribuição injeta uma **Postura Operacional** — a instrução comportamental da disposição mais uma linha de postura das aptidões da função —, para que a ficha configure efetivamente a função. Opcional e aditivo: as funções sem um dossiê se comportam exatamente como antes. Consulte o [manual](https://mcp-tool-shop-org.github.io/role-os/handbook/crew-dossier/).

## Estado de implantação em toda a organização

O estado do lançamento em toda a organização (fila de tarefas, decisões, registos de auditoria, pacotes de bloqueio por repositório) está armazenado num repositório **privado** e interno da organização (`role-os-rollout`). Este repositório é o produto; esse repositório contém o estado operacional.

## Memória e continuidade

O Role OS não possui nem duplica a camada de memória. Onde a memória do projeto Claude existe, ela é o sistema de continuidade canônico — fatos do repositório, decisões, tarefas pendentes e histórico de tratamento estão armazenados lá.

O Role OS se integra à memória do projeto Claude. Ele não a substitui.

## Tratamento completo e verificação de lançamento

O tratamento completo é um protocolo canônico de 7 fases definido na memória do projeto Claude (`memory/full-treatment.md`). O Role OS roteia e revisa os tratamentos usando contratos de função, transferências e portões de críticos — ele não redefine o protocolo.

**Verificação de lançamento** é o portão de qualidade de 31 itens que é executado antes do tratamento completo. Os portões rígidos A-D devem ser aprovados antes que qualquer tratamento comece. Referência canônica: `memory/shipcheck.md`.

Ordem: Verificação de lançamento primeiro, depois tratamento completo. Sem v1.0.0 sem a aprovação dos portões rígidos.

## O catálogo de 61 funções

O catálogo agrupa as suas 61 funções em 11 famílias. (O Dispatch utiliza um conjunto separado de 10 **pacotes de equipa** — funcionalidades, correção de erros, segurança, documentação, lançamento, pesquisa, tratamento, auditoria aprofundada, brainstorming, trabalho colaborativo — que retiram funções destas famílias.)

| Família | Funções |
|--------|-------|
| **Core** (2) | Orquestrador, Avaliador Crítico |
| **Product** (4) | Estrategista de Produto, Sintetizador de Feedback, Priorizador do Roteiro, Redator de Especificações |
| **Engineering** (7) | Desenvolvedor Frontend, Engenheiro Backend, Engenheiro de Testes, Engenheiro de Refatoração, Engenheiro de Desempenho, Auditor de Dependências, Revisor de Segurança |
| **Design** (2) | Designer de UI, Guardião da Marca |
| **Marketing** (1) | Redator de Conteúdo de Lançamento |
| **Treatment** (7) | Pesquisador de Repositório, Tradutor de Repositório, Arquiteto de Documentação, Curador de Metadados, Auditor de Cobertura, Verificador de Implantação, Engenheiro de Lançamento |
| **Research** (4) | Pesquisador de UX, Analista Competitivo, Pesquisador de Tendências, Sintetizador de Entrevistas com Usuários |
| **Growth** (4) | Estrategista de Lançamento, Estrategista de Conteúdo, Gerente de Comunidade, Líder de Triagem de Suporte |
| **Brainstorm** (19) | Explorador de Contexto, Explorador de Valor para o Utilizador, Explorador de Ideias Criativas, Explorador de Mecânicas, Explorador de Mercado, Explorador Contrário, Explorador de Viabilidade, Explorador de Qualidade, Analista de Contexto, Analista de Valor para o Utilizador, Analista de Mecânicas, Analista de Posicionamento, Analista Contrário, Normalizador, Sintetizador, Expansor de Produto, Expansor de Cenários, Expansor de Vantagem Competitiva, Juiz |
| **Deep Audit** (4) | Auditor de Componentes, Auditor de Verdade de Testes, Auditor de Interface, Sintetizador de Auditoria |
| **Swarm** (7) | Coordenador de Grupo, Agente Backend do Grupo, Agente de Ponte do Grupo, Agente de Testes do Grupo, Agente de Infraestrutura do Grupo, Agente Frontend do Grupo, Sintetizador do Grupo |

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

- Correções pontuais, erros de digitação ou bugs óbvios
- Pesquisa exploratória sem resultados definidos
- Trabalho que cabe na cabeça de uma pessoa em 5 minutos
- Correções de emergência que precisam ser implementadas antes que a cadeia de revisão seja concluída
- Projetos em que você prioriza a velocidade em vez da estrutura

## Evidências

O Role OS foi comprovado em três cenários de teste em dois repositórios estruturalmente diferentes:

**Teste 001 — Trabalho em funcionalidades** (Tela da equipe, Star Freight)
- Cadeia de 7 funções, 45 cenários de teste, 0 conflitos de funções
- Evitou a contaminação de um ancestral de fork, detectou invenções em tempo real e identificou obstáculos reais

**Teste 002 — Trabalho de integração** (Configuração do CampaignState, Star Freight)
- Cadeia de 5 funções, resolveu uma lacuna arquitetônica sem recorrer a soluções alternativas
- Testes anti-fallback comprovaram que o caminho ativo é real, não apenas um espaço reservado

**Teste 003 — Trabalho de identidade** (Purga de contaminação, Star Freight)
- Cadeia de 6 funções, 51 cenários de teste, incluindo defesa duradoura contra contaminação no CI
- Corrigiu desvios de informações herdadas sem levar a um redesenho amplo

**Teste de portabilidade** (Consistência da persona, humor do sensor)
- Mesma estrutura, linguagem/domínio/pilha diferentes
- Adotado com apenas alterações de contexto — sem modificações no contrato principal

**Tratamento completo FT-001** (portlight-desktop)
- Tratamento em 7 fases com funções do Treatment Pack
- Comprovação do controle de Shipcheck, zero conflitos de funções

**Tratamento completo FT-002** (studioflow)
- Mesmo Treatment Pack, repositório estruturalmente diferente (espaço de trabalho criativo versus jogo)
- Treatment Pack portátil — nenhuma modificação no contrato necessária

**Sessão de brainstorming** (tópico do mercado do servidor MCP)
- Cadeia de 9 funções, 4 analistas em paralelo, análise cruzada + refutação do gráfico de disputa
- 4 desafios lançados, 3 alegações restritas, 1 não resolvida — pressão saudável, não um impasse
- Mais de 16 links de rastreamento de artefatos renderizados de volta aos átomos da camada de verdade
- Cadeia completa de custódia comprovada: verdade → átomos → disputa → síntese → expansão → julgamento → renderização → rastreamento

## Propriedades principais

Estas são inegociáveis. Se uma alteração enfraquecer alguma delas, rejeite-a.

- Os limites das funções são mantidos
- A revisão é rigorosa
- A escalada permanece honesta
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
  test/                        ← 1435 tests across 65 test files
  starter-pack/                ← Drop-in role contracts, policies, schemas, workflows
```

## Segurança

Por padrão, o Role OS opera apenas no **sistema de arquivos local**. Copia modelos Markdown e escreve ficheiros de pacote/verificação/execução para o diretório `.claude/` do seu repositório. A operação padrão não faz pedidos de rede, não lida com segredos e não recolhe dados de telemetria. Não realiza operações perigosas — todas as escritas de ficheiros utilizam a opção "ignorar se existir" por padrão.

Três **funcionalidades opcionais** interagem com a rede quando são ativadas explicitamente:

- **`roleos verify-citations`** — executa o comando externo `prism` na linha de comandos, que resolve os identificadores de citação em relação às APIs públicas do arXiv/Crossref (envia os IDs/URLs das citações a serem verificadas).
- **Nível Especialista** (`roleos specialist`, funções registadas) — envia pedidos para o `backend_url` que configura em `.role-os/specialists.json` (normalmente, um ponto final de modelo local).
- **Consulta de orçamento / conformidade** (`ROLEOS_BUDGET_CONSULT` / `ROLEOS_CONFORMANCE_CONSULT`) — envia o contexto da etapa/chamada de ferramenta para um modelo local através de HTTP para obter uma avaliação consultiva.

As três estão desativadas por padrão e, em caso de falha, recorrem ao comportamento determinístico local. Consulte [SECURITY.md](SECURITY.md) para a política completa.

## O sistema operacional

| Camada | O que ele faz | Status |
|-------|-------------|--------|
| **Routing** | Avalia todas as 61 funções em relação ao conteúdo do pacote, explica as recomendações e avalia a confiança | ✓ Implementado |
| **Chain builder** | Monta cadeias ordenadas por fase a partir de funções avaliadas, com viés para o tipo de pacote, mas não restrito a modelos | ✓ Implementado |
| **Conflict detection** | Validação em 4 etapas: conflitos graves, sequência, redundância, lacunas de cobertura. Sugestões de correção. | ✓ Implementado |
| **Escalation** | Roteia automaticamente o trabalho bloqueado/rejeitado/dividido para o resolvedor correto, com razão + artefato necessário | ✓ Implementado |
| **Evidence** | Evidências estruturadas e conscientes da função nos veredictos. Verificações de suficiência. 12 tipos de evidências. | ✓ Implementado |
| **Dispatch** | Gera manifestos de execução para multi-claude. Perfis de ferramentas por função, prompts do sistema, orçamentos. | ✓ Implementado |
| **Trials** | Conjunto completo comprovado: 30/30 tarefas de ouro + 5/5 testes negativos. 7 testes de pacote concluídos. | ✓ Completo |
| **Team Packs** | 10 pacotes calibrados com seleção automática, proteções contra incompatibilidade e fallback de roteamento livre. | ✓ Implementado |
| **Outcome calibration** | Registra os resultados da execução, ajusta os pesos do pacote/função com base nos resultados e ajusta os limites de confiança. | ✓ Implementado |
| **Mixed-task decomposition** | Detecta trabalho composto, divide em pacotes filhos, atribui pacotes e preserva as dependências. | ✓ Implementado |
| **Composite execution** | Executa os pacotes filhos em ordem de dependência, com passagem de artefatos, recuperação de ramificações e síntese. | ✓ Implementado |
| **Adaptive replanning** | Alterações de escopo, descobertas ou novos requisitos durante a execução atualizam o plano sem reiniciar. | ✓ Implementado |
| **Session spine** | `roleos init claude` cria os arquivos CLAUDE.md, /roleos-route, /roleos-review, /roleos-status. `roleos doctor` verifica a configuração. Os cartões de roteamento comprovam o envolvimento. | ✓ Implementado |
| **Hook spine** | 5 ganchos de ciclo de vida (SessionStart, PromptSubmit, PreToolUse, SubagentStart, Stop). Aplicação consultiva: lembretes do cartão de roteamento, controle de escrita de ferramentas, injeção de função de subagente, auditoria de conclusão. | ✓ Implementado |
| **Artifact spine** | Contratos de artefato por função. Contratos de transferência de pacote. Validação estrutural. Verificações de integridade da cadeia. As funções a jusante nunca adivinham o que receberam. | ✓ Implementado |
| **Mission library** | 9 missões nomeadas (feature-ship, bugfix, treatment, docs-release, security-hardening, research-launch, brainstorm, deep-audit, dogfood-swarm). Cada uma declara o pacote, a cadeia de funções, o fluxo de artefatos, as ramificações de escalada e a definição honesta-parcial. | ✓ Implementado |
| **Mission runner** | Crie execuções, percorra-as com estado rastreado, complete/falhe com relatórios honestos. Propagação de etapas bloqueadas, avisos de escalada fora da cadeia, reabertura da última etapa. | ✓ Implementado |
| **Unified entry** | `roleos start` decide automaticamente entre missão, pacote ou roteamento livre. Escada de fallback com pontuações de confiança, alternativas e detecção de composição. | ✓ Implementado |
| **Persistent runs** | `roleos run` cria execuções armazenadas em disco. `resume`, `next`, `explain`, `complete`, `fail`. Intervenções: reroute, escalate, retry, block, reopen. Orientação local da etapa. Medição de atrito. | ✓ Implementado |
| **Brainstorm** | Arquitetura de duas camadas: verdade (esquemas nativos da função, átomos de proveniência, gráfico de disputa de análise cruzada) + renderização (5 vozes distintas, proibições lexicais, transcrição do debate). Os links de rastreamento comprovam que cada afirmação renderizada se relaciona com um átomo de verdade. Execução de ouro comprovada. | ✓ Implementado |
| **Deep Audit** | Auditoria de repositório com base no manifesto: decompor o repositório em componentes, enviar N auditores + M auditores de testes de verificação + K auditores de interface a partir do grafo de dependências, sintetizar em um veredicto classificado e plano de ação. O envio dinâmico é dimensionado de acordo com o tamanho do repositório (fórmula 2N + K + 3). Nativo do executor, com validação de artefatos em cada etapa. | ✓ Implementado |
| **Dogfood Swarm** | Convergência de múltiplas etapas: três estágios de saúde (bug/segurança → proativo → humanização) e, em seguida, etapa de recursos. Propriedade exclusiva de arquivos, barreiras de construção após cada iteração, pontos de verificação do usuário. A detecção automática de domínio gera manifestos. Ponte de evidências para os laboratórios de testes internos. | ✓ Implementado |

## 9 missões

| Missão | Pacote | Funções | Quando usar |
|---------|------|-------|-------------|
| `feature-ship` | Recurso | 5 | Entrega completa de recursos: escopo → especificação → implementação → teste → revisão |
| `bugfix` | Correção de bug | 4 | Diagnosticar a causa raiz, corrigir, testar, verificar |
| `treatment` | Tratamento | 4 | Verificação de envio + refinamento + documentação + verificação de CI + revisão |
| `docs-release` | Documentação | 2 | Escrever/atualizar a documentação, notas de lançamento |
| `security-hardening` | Segurança | 4 | Modelo de ameaças, auditoria, correção de vulnerabilidades, reauditoria, verificação |
| `research-launch` | Pesquisa | 4 | Formular a pergunta, pesquisar, documentar as descobertas, decidir |
| `brainstorm` | Brainstorming | 9 | Análise estruturada e multiperspectiva com discordância e veredicto rastreáveis |
| `deep-audit` | Auditoria aprofundada | 5 (escalas) | Auditoria de repositório com base no manifesto — o número de trabalhadores é dimensionado de acordo com o grafo do repositório por meio de envio dinâmico |
| `dogfood-swarm` | Enxame | 8 (escalas) | Convergência de múltiplas etapas: saúde-a → saúde-b → saúde-c → recurso → síntese final |

Cada missão inclui definições honestas e parciais — quando o trabalho é interrompido, o sistema documenta o que foi concluído e o que resta, em vez de fingir que tudo foi concluído.

### Missão de brainstorming

Não é um "brainstorming de IA". A missão de brainstorming é composta por **funções especializadas sob a lei, com discordância e resultados que levam a um veredicto rastreáveis.**

```bash
roleos run "explore product directions for a developer tool discovery platform"
# → MISSION: Brainstorm (Structured Inquiry)
#   Chain: 4 Analysts (parallel) → Normalize → Cross-Examine → Rebut → Synthesize → Expand → Judge
```

**O que a torna diferente:**

- **Camada 1 (verdade):** Quatro analistas emitem esquemas nativos de função (ContextMap, UserValueMap, MechanicsMap, PositioningMap) — não é uma prosa compartilhada. Cada função tem pontos cegos aplicados: frases proibidas, tipos de afirmações proibidas, partições de entrada filtradas. Os átomos carregam a proveniência. Um grafo de questionamento cruzado direcionado produz desafios direcionados. Os analistas originais defendem, restringem ou retiram suas afirmações sob pressão.

- **Camada 2 (renderização):** Cinco vozes humanas distintas (Memorando de Limites, Notas de Campo, Esboço do Sistema, Resumo de Afirmações, Transcrição do Questionamento Cruzado) com proibições lexicais que impedem a convergência das vozes. A síntese consome a verdade, nunca a prosa renderizada. Ambas as camadas estão sempre disponíveis.

- **Cadeia de custódia:** Cada frase renderizada rastreia até um átomo da camada de verdade. As direções de síntese citam átomos. Os alvos do questionamento cruzado são IDs de afirmações reais. O grafo de disputa é o produto, não a prosa.

**Comprovado:** Execução de referência v0.4 — cadeia de custódia completa verificada. Consulte [`examples/golden-run.md`](examples/golden-run.md) para a cadeia completa de artefatos.

### Missão de auditoria aprofundada

Não é uma varredura superficial. A missão de auditoria aprofundada **decompõe um repositório em componentes delimitados e envia auditores especializados em uma escala determinada pelo próprio grafo de dependências do repositório.**

```bash
roleos run "deep audit this repo" --manifest=audit-manifest.json
# → MISSION: Deep Audit (Manifest-Scaled)
#   Steps: Component Auditor ×6 + Test Truth Auditor ×6 + Seam Auditor ×8 + Synthesizer + Action Plan + Critic = 23 steps
```

**O que a torna diferente:**

- **Envio dinâmico:** o número de trabalhadores não é fixo. Um repositório de 10 componentes com 5 clusters de limites produz 28 etapas (2 × 10 + 5 + 3). Um repositório de 3 componentes produz 12. A fórmula de dimensionamento é `2N + K + 3`, onde N = componentes, K = limites.
- **Pacotes com base no manifesto:** um arquivo `audit-manifest.json` define os componentes (com caminhos de arquivo, contagem de linhas, descrições) e os limites (de/para com descrições da interface). Cada auditor recebe apenas seu pacote.
- **Quatro arquétipos de função:** Auditor de Componentes (verdade do código por módulo), Auditor de Testes de Verificação (testes que comprovam vs. testes que existem), Auditor de Interface (limites de integração do grafo de dependências), Sintetizador de Auditoria (veredicto classificado + plano de ação de todos os pacotes).
- **Validação de artefatos em cada etapa:** `validateArtifact()` é acionado em cada etapa de conclusão em ambos os caminhos de execução. Os resultados são anexados aos objetos de etapa. O sistema sabe se cada artefato atendeu ao seu contrato.
- **Honestidade parcial:** quando o orçamento ou o escopo impedem a conclusão, as descobertas por componente são individualmente válidas. O sistema sintetiza a partir do que foi concluído, nunca finge cobertura total.

**Comprovado:** Execução nativa do executor — 18 testes em um manifesto real, ciclo de vida completo verificado, incluindo reabertura de escalonamento e falha parcial. A fórmula de dimensionamento foi verificada para manifestos de 3/6/10/15 componentes.

### Missão de enxame de testes internos

Não é uma varredura única. A missão de enxame de testes internos **executa um protocolo de convergência de múltiplas etapas que move um repositório de "funciona" para "pronto para produção" por meio de três estágios de saúde e entrega iterativa de recursos.**

```bash
roleos swarm
# → MISSION: Dogfood Swarm (Multi-Pass Convergence)
#   Stages: Health-A → Health-B → Health-C → Feature → Final
#   Domain agents: 3-5 parallel per wave (exclusive file ownership)
```

**O que a torna diferente:**

- **Sistema de validação em três etapas** — A etapa A corrige erros e problemas de segurança (ciclo até que não haja mais erros CRÍTICOS ou de ALTA prioridade). A etapa B aplica medidas de segurança proativas (os utilizadores avaliam os resultados). A etapa C torna o código mais intuitivo — mensagens de erro que ajudam os utilizadores, feedback de reconexão, estados de carregamento, acessibilidade. Cada etapa é uma lente distinta, não a mesma análise repetida.
- **Propriedade exclusiva de ficheiros** — cada agente de domínio possui ficheiros específicos através do ficheiro `swarm-manifest.json`. Nenhum dos agentes edita o mesmo ficheiro. Não há conflitos de fusão. Não há sobrecarga de coordenação.
- **Controles de construção** — a análise de código, a verificação de tipos e os testes devem ser aprovados após cada ciclo. O sistema deteta automaticamente o sistema de construção (Node, Rust, Python, Go) e executa os comandos corretos.
- **Pontos de verificação do utilizador** — a etapa de validação (Health-B) e a etapa de funcionalidades exigem a aprovação explícita do utilizador antes da execução. O sistema apresenta os resultados e o utilizador decide o que construir.
- **Convergência iterativa** — as etapas são executadas em ciclos, juntamente com os ciclos de validação, até que as condições de saída sejam cumpridas ou o número máximo de iterações seja atingido. Cada ciclo reavalia tudo desde o início para detetar regressões introduzidas por correções anteriores.
- **Deteção automática de domínio** — o comando `roleos swarm manifest --generate` deteta o tipo de repositório (CLI, web, desktop, MCP, monorepo) e gera atribuições de domínio não sobrepostas.

**Comprovado:** claude-collaborate (2026-03-28) — 35→129 testes, 106 problemas de validação corrigidos, versão v1.1.0 lançada. Protocolo v2.0 com 9 fases.

## Status

Estável e em produção. Consulte o [REGISTO DE ALTERAÇÕES](CHANGELOG.md) para obter o histórico completo das versões e o que mudou em cada lançamento.

## Licença

MIT

---

Criado por <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a>
