# Especificações — API de ruído

**Versão 0.2.0 — 08/11/2026. Produto Sonora; equipe e monorepo definidos.**

Estas fichas já usam o domínio acústico e podem orientar o trabalho. Responsáveis definidos em [equipe](../equipe.md); confirmar particularidades de aula. **Exigência do professor**, **proposta de implementação** e **pendência** estão identificadas em cada ficha.

Leia primeiro a [solução](../02-proposta-de-solucao.md) e o [contrato comum](../03-integracao.md). Cada responsável entrega sua matéria; as outras fichas servem para conhecer dependências.

| Disciplina | Responsável | Construir | Primeiro resultado |
| --- | --- | --- | --- |
| [C#](csharp.md) | Leonardo | API principal, banco e painel simples | API + migrations + seed + healthchecks |
| [SOA](soa.md) | Felipe | Backend de importação e banco de lotes | Lote validado contra mock da API |
| [Mobile](mobile.md) | Herbert | Consulta, comparação e favoritos | Telas com mock compatível |
| [Physical](physical.md) | Leonardo | ESP32 com sinal acústico simulado | Circuito + JSON por serial |
| [ML](ml.md) | Gabriel | KMeans + PCA de observações reais | Diagnóstico dos dados e divisão treino/teste |
| [Linux](linux.md) | Pedro | Servidor, provisionamento e monitor | VM com systemd e contrato C# conferido |
| [Cybersecurity](cybersecurity.md) | Herbert | Parsing, taint, LLM e Risco Cidadão | Base de aula rodando + cenário sintético |
| [Testing](testing.md) | Felipe | Features/Test Cases no Azure + pitch | Features e casos de aceite cadastrados |

## Como organizar a execução

Cada responsável começa pelo primeiro resultado, registra versão/commit e bloqueios, depois implementa o mínimo da ficha e recolhe evidências reais. Atualizar o contrato antes de alterar integrações. Conferir a rubrica e a tarefa atualizada da própria disciplina antes de gravar/enviar.

Não esperar todas as partes ficarem prontas: Mobile usa mock; SOA usa mock HTTP do receptor; ML trabalha offline; Cyber usa um protótipo mínimo; Linux prepara infraestrutura enquanto recebe o backend. A demonstração final integra as partes efetivamente disponíveis e declara limitações.

## O que falta fechar

| Item | Quem | Bloqueia o quê? |
| --- | --- | --- |
| Usuários GitHub dos outros integrantes | Pedro/grupo | Acesso e CODEOWNERS específicos; nomes/RMs e divisão já definidos |
| Linguagem/stack de SOA usada em aula | Responsável SOA | Escolha do framework; domínio/contrato já podem avançar |
| Motor/dashboard de Cyber usado em aula | Responsável Cyber | Implementação da extensão |
| Território de campo e pessoa a ouvir | Grupo | Ficha/pitch e validação do problema; Paulista é proposta |
| Filtros e suficiência final dos dados ML | Responsável ML | Experimento final, não as demais matérias |
| VM e parâmetros reais de rede | Pedro | Aplicação da configuração Linux |
| Acesso Azure e identificação do professor | Responsável Testing | Cadastro/acesso e entrega oficial |

Não é necessário decidir nome comercial, preço, nuvem paga ou instalar sensores físicos para começar. C# e SOA estão especificados separadamente; eventual reaproveitamento exige confirmação docente e ajuste deste índice.

**Prazo conservador:** 19/11 às 23h55. [Plano proposto com metas internas](../04-plano-de-execucao.md).

Estas são especificações, não tarefas já executadas. Repositório privado criado; branches, CI e estado remoto estão no README principal. Convites, submissões e mensagens ao grupo não são presumidos.
