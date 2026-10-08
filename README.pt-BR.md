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

O adaptador Claude Code é lançado (`roleos init` cria `.claude/`). Os contratos são em formato Markdown, que qualquer estrutura de codificação pode consumir — este repositório não afirma que um segundo adaptador já está em execução.

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
2. **O crítico avalia em relação ao contrato** — aceita, rejeita ou bloqueia com base em evidências estruturadas, não em impressões.
3. **O roteamento de recuperação é feito automaticamente** — o trabalho bloqueado ou rejeitado é roteado para o resolvedor correto com um motivo, tipo de recuperação e artefato necessário.

## Despacho com consciência do orçamento

O Role OS pode consultar um **analista de orçamento de tokens** local para cada etapa de despacho e anexar uma previsão de gastos consultiva ao manifesto — opcional (`ROLEOS_BUDGET_CONSULT`), consultiva (nunca bloqueia um despacho) e com fallback para uma linha de base determinística. Desativado por padrão; a previsão é local e gratuita. Consulte o [manual](https://mcp-tool-shop-org.github.io/role-os/handbook/specialist-budget/).

## Supervisão de chamadas de ferramentas

O Role OS verifica e controla as chamadas de ferramentas na junção `PreToolUse` — de forma determinística, sem nenhum modelo no caminho crítico:

- **Observador de conformidade** (consultivo, com fallback) — um esquema determinístico + um limite de contrato computável verifica uma chamada proposta em relação ao seu contrato de ferramenta catalogado e anexa uma avaliação consultiva sobre uma chamada comprovadamente não conforme; nunca bloqueia. Um limite LLM opcional (`ROLEOS_CONFORMANCE_CONSULT`) lida com o resíduo genuinamente semântico.
- **Controle de capacidade** (bloqueio, opcional `ROLEOS_CAPABILITY_GATE`, padrão DESATIVADO) — privilégio mínimo determinístico em ações *irreversíveis* (publicação em npm/PyPI, `gh release`, `git push`, edições de repositório, implantação em Páginas). Uma ação controlada é negada, a menos que o diretor tenha concedido sua capacidade em `.claude/role-os/capabilities.json`, para que uma etapa errada — um erro honesto ou um erro injetado — não possa acionar uma ação irreversível não autorizada. O complemento preventivo da regra de compensador nomeado. Consulte o [manual](https://mcp-tool-shop-org.github.io/role-os/handbook/).

## Dossiê da equipe

Cada função tem um **dossiê** — uma ficha de personagem que também serve como configuração em tempo de execução. Seis aptidões (Rigor, Ritmo, Amplitude, Ceticismo, Autonomia, Franqueza) são mapeadas para controles de despacho reais; uma camada de **disposição** de oito arquétipos (Cético, Construtor, Investigador, Inovador…) carrega uma instrução comportamental; e cada função tem um retrato e uma classificação. Navegue por toda a equipe como uma galeria (`dossier/dossier.html`) — o radar de cada função mostra sua configuração ajustada em relação ao seu ideal canônico.

Quando uma função tem um dossiê, o despacho injeta uma **Postura Operacional** — a instrução comportamental da disposição mais uma linha de postura das aptidões da função — para que a ficha realmente configure a função. Opcional e aditivo: as funções sem um dossiê se comportam exatamente como antes. Consulte o [manual](https://mcp-tool-shop-org.github.io/role-os/handbook/crew-dossier/).

## Estado de implantação organizacional

O estado de implantação em toda a organização (fila, decisões, registros de auditoria, pacotes de bloqueio por repositório) reside em um repositório **privado**, interno da organização (`role-os-rollout`) separado. Este repositório é o produto; aquele repositório é o estado operacional.

## Memória e continuidade

O Role OS não possui nem duplica a camada de memória. Onde existe uma loja de memória de projeto de estrutura, ela é o sistema de continuidade canônico — fatos do repositório, decisões, ciclos abertos e histórico de tratamento residem lá.

O Role OS se integra a essa loja quando ela está presente. Ele não a substitui.

## Tratamento completo e verificação do projeto

O tratamento completo é um protocolo canônico de 7 fases definido na memória do projeto do estúdio (`memory/full-treatment.md`). O Role OS roteia e revisa os tratamentos usando contratos de função, transferências e portões de avaliação — ele não redefine o protocolo.

A **verificação do projeto** é o portão de qualidade de 31 itens que é executado antes do tratamento completo. Os portões rígidos A-D devem ser aprovados antes que qualquer tratamento comece. Referência canônica: `memory/shipcheck.md`.

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
- Os testes anti-fallback provaram que o caminho ativo é real, não um espaço reservado

**Teste 003 — Trabalho de identidade** (Purga de contaminação, Star Freight)
- Cadeia de 6 funções, 51 cenários de teste, incluindo defesa duradoura contra contaminação de CI
- Corrigiu a deriva de ficção herdada sem entrar em colapso em um redesenho amplo

**Teste de portabilidade** (Consistência de persona, sensor-humor)
- Mesma estrutura, linguagem/domínio/pilha diferentes
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

- Os limites de função são mantidos
- A revisão tem peso
- O escalonamento permanece honesto
- Os pacotes permanecem testáveis
- A portabilidade requer adaptação de contexto, não cirurgia principal

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

A cobertura de linha medida para esta versão é de 90,66% (22778/25123). O limite de CI permanece em 90%.

## Segurança

Por padrão, o Role OS opera apenas no **sistema de arquivos local**. Ele copia modelos Markdown e grava arquivos de pacote/veredicto/execução no diretório `.claude/` do seu repositório. A operação padrão não faz solicitações de rede, não lida com segredos e não coleta telemetria. Nenhuma operação perigosa — todas as gravações de arquivos usam "ignorar se existir" por padrão.

Três recursos **opcionais** acessam a rede quando você os habilita explicitamente:

- **`roleos verify-citations`** — executa o comando externo `prism` CLI, que resolve identificadores de citação em relação às APIs públicas arXiv/Crossref (envia os IDs/URLs de citação que estão sendo verificados).
- **Nível de especialista** (`roleos specialist`, funções registradas) — envia prompts de despacho para o `backend_url` que você configura em `.role-os/specialists.json` (geralmente um ponto de extremidade de modelo local).
- **Consulta de orçamento/conformidade** (`ROLEOS_BUDGET_CONSULT` / `ROLEOS_CONFORMANCE_CONSULT`) — envia o contexto de etapa/chamada de ferramenta para um modelo local via HTTP para um veredicto consultivo.

Todos os três estão desativados por padrão e, em caso de falha, permitem o comportamento determinístico local. Consulte [SECURITY.md](SECURITY.md) para obter a política completa.

## Cartões de receita, o júri e a calibração do pacote

Um crítico treinado é tão bom quanto os dados dos quais aprendeu. O Role OS registra esses dados em um cartão de receita, avalia um painel de críticos e permite que uma execução concluída impulsione a escolha do pacote. Nenhum desses processos invoca um modelo. O mesmo arquivo e a mesma semente produzem os mesmos números.

### Cartões de receita

`roleos recipe` verifica um cartão (`roleos-recipe-card/v1`). Nove controles padrão, cada um deles, avalia uma forma pela qual um crítico pode parecer bom sem ter aprendido seu atributo. Um controle aprovado sem uma medida é uma lacuna. Uma medida inconsistente é um erro. `shuffled-labels` deve usar o método `balanced-permutation`. `same-generator-no-error`: quando ambos os métodos de edição são registrados e seus intervalos não se sobrepõem, o status deve ser `unresolved`, caso contrário, a verificação falha. `reversed-correction` é aprovado apenas quando seu intervalo de precisão está inteiramente acima de 0,5.

```bash
roleos recipe check starter-pack/examples/auditor-recipe-card.json
```

Esse arquivo é um cartão sintético preenchido, não um crítico treinado. A verificação imprime:

```
✓ starter-pack/examples/auditor-recipe-card.json (auditor-v1, role Auditor)
  note     controls[2] (shuffled-labels): permutation floor is 1/20; a pass at this floor means the observed result beat every null
  controls 9/9 standard controls passed
  sha256   5763c4dd57fc9f7bea41186493e56b72ce73a5e30f4c5c813248655a360b1588
```

A anotação é um fato, não uma lacuna. `roleos specialist register` recebe `--recipe` e fixa o ID e o hash do cartão nessa versão. Consulte o [manual](https://mcp-tool-shop-org.github.io/role-os/handbook/recipe-cards/).

### Júri

`roleos jury select` mantém um painel apenas quando um intervalo agrupado aninhado indica que o painel supera o melhor crítico único. Caso contrário, a decisão é esse crítico, ou `insufficient-data` abaixo de 30 itens ou 10 grupos. Um crítico cujo cartão tem um controle padrão com falha ou não resolvido é excluído, a menos que `--allow-unproven`. Um crítico sem cartão ainda é incluído, a menos que `--require-recipe`. As pontuações nunca são invertidas. A mesma semente repete os mesmos números.

```bash
roleos jury select starter-pack/examples/jury-validation.json --seed 0
```

Nesse arquivo sintético, a decisão é `best-single (echo)`. echo e sharp cometem os mesmos erros, portanto, a consistência do erro é 1,0000 e os nomes dos sinalizadores duplicados os identificam. O sinalizador não exclui nenhum dos críticos. O intervalo aninhado é [-0,1000, 0,0000]. Ele toca 0, portanto, não está inteiramente acima de 0 e, mesmo com --out, não escreveria nenhum arquivo de painel, porque --out escreve um apenas para uma decisão de painel. O [manual](https://mcp-tool-shop-org.github.io/role-os/handbook/jury/) contém o relatório completo.

### Calibração do pacote

Quando uma execução termina, o Role OS anexa uma linha de resultado. O mesmo ID de execução não grava uma segunda linha. Depois que um pacote tem pelo menos 5 resultados registrados, cada execução concluída com correções 0 adiciona +0,5 a esse pacote, com um limite de +2. O impulso só se aplica a pacotes com os quais as palavras-chave já correspondiam. A confiança permanece alta em 3 correspondências de palavras-chave e média em 2, obtida da pontuação das palavras-chave, e não da pontuação impulsionada. Os pesos do Role não mudam. Os limites de confiança não mudam. O relatório de calibração pode sugerir analisar o limite das palavras-chave. O Role OS não aplica essa sugestão.

`ROLEOS_NO_CALIBRATION=1` desativa o impulso. O registro continua.

```bash
roleos calibration
```

Em um diretório sem um livro-razão de resultados, isso imprime:

```
no recorded runs yet
```

`roleos route --verbose` e `roleos explain` imprimem o impulso, a contagem de execuções e a taxa de conclusão quando um livro-razão os tem. Consulte o [manual](https://mcp-tool-shop-org.github.io/role-os/handbook/calibration/).

## O sistema operacional

| Camada | O que ele faz | Status |
|-------|-------------|--------|
| **Routing** | Avalia todos os 61 roles em relação ao conteúdo do pacote, explica as recomendações, avalia a confiança | ✓ Enviado |
| **Chain builder** | Monta cadeias ordenadas por fase a partir de roles avaliados, com viés para o tipo de pacote, mas não travado em um modelo. | ✓ Enviado |
| **Conflict detection** | Validação em 4 etapas: conflitos graves, sequência, redundância, lacunas de cobertura. Sugestões de correção. | ✓ Enviado |
| **Escalation** | Roteia automaticamente trabalhos bloqueados/rejeitados/divididos para o resolvedor correto com o motivo + artefato necessário. | ✓ Enviado |
| **Evidence** | Evidências estruturadas, conscientes do role, nas decisões. Verificações de suficiência. 12 tipos de evidência. | ✓ Enviado |
| **Dispatch** | Gera manifestos de execução para o conjunto de agentes de codificação. Perfis de ferramentas por role, prompts do sistema, orçamentos. | ✓ Enviado |
| **Trials** | Lista completa comprovada: 30/30 tarefas de ouro + 5/5 testes negativos. 7 testes de pacote concluídos. | ✓ Concluído |
| **Team Packs** | 10 pacotes calibrados com seleção automática, proteções contra incompatibilidades e fallback de roteamento livre. | ✓ Enviado |
| **Recipe cards** | A receita de dados de um role treinado. Nove controles padrão, uma medida em cada controle aprovado e um hash canônico. | ✓ Enviado |
| **Jury** | Avalia críticos treinados. Mantém um painel apenas quando ele supera o melhor crítico único em grupos mantidos. Controles de receita com falha ou não resolvidos excluem um crítico. | ✓ Enviado |
| **Outcome calibration** | Registra um resultado quando uma execução termina. Após 5 resultados, uma conclusão limpa impulsiona um pacote com as palavras-chave que já correspondiam (+0,5 cada, limite +2). A confiança ainda vem da pontuação das palavras-chave. Os pesos do role e os limites de confiança não mudam. | ✓ Enviado |
| **Mixed-task decomposition** | Detecta trabalho composto, divide em pacotes filhos, atribui pacotes, preserva dependências. | ✓ Enviado |
| **Composite execution** | Executa pacotes filhos em ordem de dependência com passagem de artefatos, recuperação de ramificações e síntese. | ✓ Enviado |
| **Adaptive replanning** | Mudanças de escopo, descobertas ou novos requisitos no meio da execução atualizam o plano sem reiniciar. | ✓ Enviado |
| **Session spine** | `roleos init claude` cria o esqueleto de CLAUDE.md, /roleos-route, /roleos-review, /roleos-status. `roleos doctor` verifica a fiação. Os cartões de rota comprovam o envolvimento. | ✓ Enviado |
| **Hook spine** | 5 ganchos de ciclo de vida (SessionStart, PromptSubmit, PreToolUse, SubagentStart, Stop). Aplicação consultiva: lembretes do cartão de rota, bloqueio de ferramentas de gravação, injeção de role de subagente, auditoria de conclusão. | ✓ Enviado |
| **Artifact spine** | Contratos de artefato por role. Contratos de transferência de pacote. Validação estrutural. Verificações de integridade da cadeia. Os roles subsequentes nunca adivinham o que receberam. | ✓ Enviado |
| **Mission library** | 9 missões nomeadas (lançamento de recursos, correção de bugs, tratamento, lançamento de documentação, reforço de segurança, lançamento de pesquisa, brainstorming, auditoria aprofundada, teste em grupo). Cada uma declara pacote, cadeia de roles, fluxo de artefatos, ramificações de escalonamento, definição honesta-parcial. | ✓ Enviado |
| **Mission runner** | Crie execuções, percorra passo a passo com o estado rastreado, conclua/falhe com relatórios precisos. Propagação de passos bloqueados, avisos de escalonamento fora da cadeia, reabertura do último passo. | ✓ Enviado |
| **Unified entry** | `roleos start` decide automaticamente entre missão, pacote ou roteamento livre. Escada de fallback com pontuações de confiança, alternativas e detecção composta. | ✓ Enviado |
| **Persistent runs** | `roleos run` cria execuções com suporte em disco. `resume`, `next`, `explain`, `complete`, `fail`. Intervenções: redirecionar, escalar, tentar novamente, bloquear, reabrir. Orientação local do passo. Medição de atrito. | ✓ Enviado |
| **Brainstorm** | Arquitetura de duas camadas: verdade (esquemas nativos de função, átomos de proveniência, gráfico de disputa de contra-argumentação) + renderização (5 vozes distintas, proibições lexicais, transcrição do debate). Os links de rastreamento comprovam que cada afirmação renderizada corresponde a um átomo de verdade. Execução de referência comprovada. | ✓ Enviado |
| **Deep Audit** | Auditoria de repositório com escala de manifesto: decomponha o repositório em componentes, envie N auditores + M auditores de teste de verdade + K auditores de junção do gráfico de dependência, sintetize em um veredicto classificado e plano de ação. Envio dinâmico que se ajusta ao tamanho do repositório (fórmula 2N + K + 3). Nativo do executor, com validação de artefatos em cada etapa. | ✓ Enviado |
| **Dogfood Swarm** | Convergência de múltiplas passagens: três estágios de saúde (bug/segurança → proativo → humanização) e, em seguida, passagem de recursos. Propriedade exclusiva de arquivos, portões de construção após cada onda, pontos de verificação do usuário. A detecção automática de domínio gera manifestos. Ponte de evidências para os laboratórios de teste. | ✓ Enviado |

## 9 missões

| Missão | Pacote | Funções | Quando usar |
|---------|------|-------|-------------|
| `feature-ship` | Recurso | 5 | Entrega completa de recursos: escopo → especificação → implementação → teste → revisão |
| `bugfix` | Correção de bug | 4 | Diagnosticar a causa raiz, corrigir, testar, verificar |
| `treatment` | Tratamento | 4 | Verificação de envio + polimento + documentação + verificação de CI + revisão |
| `docs-release` | Documentação | 2 | Escrever/atualizar a documentação, notas de lançamento |
| `security-hardening` | Segurança | 4 | Modelo de ameaças, auditoria, correção de vulnerabilidades, reauditoria, verificação |
| `research-launch` | Pesquisa | 4 | Formular a pergunta, pesquisar, documentar as descobertas, decidir |
| `brainstorm` | Brainstorming | 9 | Investigação estruturada com múltiplas perspectivas, com discordância rastreável e resultado decisório. |
| `deep-audit` | Auditoria aprofundada | 5 (escalas) | Auditoria de repositório com suporte de manifesto — a contagem de trabalhadores se ajusta ao gráfico do repositório por meio de envio dinâmico |
| `dogfood-swarm` | Enxame | 8 (escalas) | Convergência de múltiplas passagens: saúde-a → saúde-b → saúde-c → recurso → síntese final |

Cada missão inclui definições honestas e parciais — quando o trabalho estagna, o sistema documenta o que foi concluído e o que resta, em vez de simular a conclusão.

### Missão de brainstorming

Não é um "brainstorming de IA". A missão de brainstorming é **funções especializadas sob a lei, com discordância rastreável e resultados decisórios.**

```bash
roleos run "explore product directions for a developer tool discovery platform"
# → MISSION: Brainstorm (Structured Inquiry)
#   Chain: 4 Analysts (parallel) → Normalize → Cross-Examine → Rebut → Synthesize → Expand → Judge
```

**O que a torna diferente:**

- **Camada 1 (verdade):** Quatro analistas emitem esquemas nativos de função (ContextMap, UserValueMap, MechanicsMap, PositioningMap) — não é uma prosa compartilhada. Cada função tem reforço de pontos cegos: frases proibidas, tipos de afirmação proibidos, partições de entrada filtradas. Os átomos carregam a proveniência. Um gráfico de contra-argumentação direcionado produz desafios direcionados. Os analistas originais defendem, restringem ou retiram sob pressão.

- **Camada 2 (renderização):** Cinco vozes humanas distintas (Boundary Memo, Field Notes, System Sketch, Claim Brief, Cross-Exam Transcript) com proibições lexicais que impedem a convergência das vozes. A síntese consome a verdade, nunca a prosa renderizada. Ambas as camadas estão sempre disponíveis.

- **Cadeia de custódia:** Cada frase renderizada rastreia até um átomo da camada de verdade. As direções de síntese citam átomos. Os alvos de contra-argumentação são IDs de afirmação reais. O gráfico de disputa é o produto, não a prosa.

**Comprovado:** Execução de referência v0.4 — cadeia de custódia completa verificada. Consulte [`examples/golden-run.md`](examples/golden-run.md) para a cadeia completa de artefatos.

### Missão de auditoria aprofundada

Não é uma varredura superficial. A missão de auditoria aprofundada **decompõe um repositório em componentes delimitados e envia auditores especializados em uma escala determinada pelo próprio gráfico de dependência do repositório.**

```bash
roleos run "deep audit this repo" --manifest=audit-manifest.json
# → MISSION: Deep Audit (Manifest-Scaled)
#   Steps: Component Auditor ×6 + Test Truth Auditor ×6 + Seam Auditor ×8 + Synthesizer + Action Plan + Critic = 23 steps
```

**O que a torna diferente:**

- **Envio dinâmico** — a contagem de trabalhadores não é fixa. Um repositório de 10 componentes com 5 clusters de limite produz 28 etapas (2×10 + 5 + 3). Um repositório de 3 componentes produz 12. A fórmula de dimensionamento é `2N + K + 3`, onde N = componentes, K = limites.
- **Pacotes com suporte de manifesto** — um `audit-manifest.json` define componentes (com caminhos de arquivo, contagens de linhas, descrições) e limites (de/para com descrições de interface). Cada auditor recebe apenas seu pacote.
- **Quatro arquétipos de função** — Auditor de Componente (verdade do código por módulo), Auditor de Teste de Verdade (testes que comprovam vs. testes que existem), Auditor de Junção (limites de integração do gráfico de dependência), Sintetizador de Auditoria (veredicto classificado + plano de ação de todos os pacotes).
- **Validação de artefatos em cada etapa** — `validateArtifact()` é acionado em cada conclusão de etapa em ambos os caminhos de execução. Os resultados são anexados aos objetos de etapa. O sistema sabe se cada artefato atendeu ao seu contrato.
- **Honestidade parcial** — quando o orçamento ou o escopo bloqueiam a conclusão, as descobertas por componente são individualmente válidas. O sistema sintetiza a partir do que foi concluído, nunca simula a cobertura total.

**Comprovado:** Execução de prova nativa do executor — 18 testes em um manifesto real, ciclo de vida completo verificado, incluindo reabertura de escalonamento e falha parcial. A fórmula de dimensionamento foi verificada para manifestos de 3/6/10/15 componentes.

### Missão de enxame de teste

Não é um verificador de passagem única. A missão de enxame de teste **executa um protocolo de convergência de múltiplas passagens que move um repositório de "funciona" para "pronto para produção" por meio de três estágios de saúde e entrega iterativa de recursos.**

```bash
roleos swarm
# → MISSION: Dogfood Swarm (Multi-Pass Convergence)
#   Stages: Health-A → Health-B → Health-C → Feature → Final
#   Domain agents: 3-5 parallel per wave (exclusive file ownership)
```

**O que a torna diferente:**

- **Sistema de validação em três etapas** — A etapa A corrige erros e problemas de segurança (ciclo até que 0 erros CRÍTICOS + 0 erros ALTOS sejam resolvidos). A etapa B aplica medidas de segurança proativas (os utilizadores avaliam os resultados). A etapa C torna o código mais intuitivo — mensagens de erro que ajudam os utilizadores, feedback de reconexão, estados de carregamento, acessibilidade. Cada etapa é uma perspetiva distinta, não a mesma análise repetida.
- **Propriedade exclusiva de ficheiros** — cada agente de domínio possui ficheiros específicos através de `swarm-manifest.json`. Nenhum dos agentes edita o mesmo ficheiro. Não há conflitos de fusão. Não há sobrecarga de coordenação.
- **Controles de construção** — a análise de código, a verificação de tipos e os testes devem ser aprovados após cada ciclo. O sistema deteta automaticamente o sistema de construção (Node, Rust, Python, Go) e executa os comandos corretos.
- **Pontos de verificação do utilizador** — a etapa de validação (Health-B) e a etapa de funcionalidades exigem a aprovação explícita do utilizador antes da execução. O sistema apresenta os resultados e o utilizador decide o que construir.
- **Convergência iterativa** — as etapas são executadas em ciclos com ciclos de validação até que as condições de saída sejam cumpridas ou o número máximo de iterações seja atingido. Cada ciclo reavalia tudo desde o início para detetar regressões introduzidas por correções anteriores.
- **Detecção automática de domínio** — `roleos swarm manifest --generate` deteta o tipo de repositório (CLI, web, desktop, MCP, monorepos) e gera atribuições de domínio não sobrepostas.

**Comprovado:** claude-collaborate (2026-03-28) — 35→129 testes, 106 problemas de validação corrigidos, versão v1.1.0 lançada. Protocolo v2.0 com 9 fases.

## Status

Estável e lançado. Consulte o [REGISTO DE ALTERAÇÕES](CHANGELOG.md) para obter o histórico completo das versões e o que mudou em cada lançamento.

## Licença

MIT

---

Criado por <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a>
