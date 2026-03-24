<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.md">English</a>
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

Uma camada de sistema operacional portátil e nativa do repositório que direciona o trabalho através de contratos de função, pacotes estruturados, revisões e escalonamento, para que as equipes possam realizar trabalhos de funcionalidade, integração, correção de identidade e tratamento completo do repositório, sem desvios, conclusão falsa ou alegações de progresso baseadas em impressões.

## O que ele faz

O Role OS previne as falhas específicas que os fluxos de trabalho de IA genéricos produzem:

- **Desvio (Drift)** — as funções permanecem em seu domínio. O produto não é redesenhado. A interface não redefine o escopo. O backend não inventa a direção do produto.
- **Conclusão falsa** — a definição de "concluído" é concreta. O trabalho que esconde lacunas, ignora a verificação ou resolve um problema diferente é rejeitado.
- **Contaminação** — projetos bifurcados ou herdados carregam resíduos de identidade. O Role OS detecta e rejeita desvios entre projetos em termos, visuais e modelos mentais.
- **Progresso baseado em impressões** — cada transferência é estruturada. Cada veredicto está vinculado a evidências. "Parece pronto" não é um estado válido.

## Como funciona

1. **Crie um pacote** — defina o que deve existir quando o trabalho estiver concluído.
2. **Direcione através de uma cadeia** — o menor conjunto de funções especializadas necessárias.
3. **Cada função produz uma transferência** — uma saída estruturada que reduz a ambiguidade para a próxima função.
4. **O revisor avalia em relação ao contrato** — aceita, rejeita ou bloqueia com base em evidências, não em impressões.

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
| **Product** (4) | Sintetizador de Feedback, Priorizador de Roteiro, Redator de Especificações, Arquiteto de Informação |
| **Research** (4) | Pesquisador de Experiência do Usuário, Analista da Concorrência, Pesquisador de Tendências, Sintetizador de Entrevistas com Usuários |
| **Growth** (4) | Estrategista de Lançamento, Estrategista de Conteúdo, Gerente de Comunidade, Líder de Triagem de Suporte |

Cada função possui um contrato completo: missão, quando usar, quando não usar, entradas esperadas, saídas necessárias, padrão de qualidade e gatilhos de escalonamento.

## Como começar

```bash
npx @mcptoolshop/role-os init

# Fill context/ files for your project, then:
roleos packet new feature
roleos route .claude/packets/my-feature.md
roleos review .claude/packets/my-feature.md accept
roleos status
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

## Segurança

O sistema "Role OS" opera **apenas localmente**. Ele copia modelos em formato Markdown e escreve arquivos de pacotes/resultados no diretório `.claude/` do seu repositório. Ele não acessa a rede, não lida com informações confidenciais e não coleta dados de telemetria. Não há operações perigosas — todas as operações de escrita de arquivos usam a opção "skip-if-exists" por padrão. Consulte o arquivo [SECURITY.md](SECURITY.md) para a política completa.

## Status

**v1.0.0 — Superfície Ampla, Mesmas Regras**

- v0.1: Operacional — 3 testes, 3 aprovações, 0 colisões de funções
- v0.2: Adoção — fluxo de trabalho padrão no repositório principal, portátil para o segundo repositório
- v0.3: Produto — pacote inicial, CLI de inicialização, superfície de evidências
- v0.4: Pacote de Tratamento — 8 funções de tratamento/identidade, tratamento completo com equipe, portátil entre 2 repositórios
- v1.0.0: 32 funções em 8 pacotes, CLI completa, tratamento comprovado, portabilidade multi-repositório

## Licença

MIT

---

Desenvolvido por <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a
