# Mobile — consulta e comparação acústica

**Responsável:** Herbert de Sousa Vilela, RM555701. **Dependências:** contrato C#; começar com mock. A finalidade é demonstrar como uma pessoa compararia locais antes de visitar um imóvel.

## Exigência do professor

PDF p. 34 e tarefa coletada: React Native + TypeScript, Expo Router, API ou mock, banco, acessibilidade e jornada da Ficha CitizenTech. GitHub com README/ficha/integrantes/prints, vídeo de até 3 minutos. Critérios conhecidos: telas/navegação, consumo de dados, banco, acessibilidade, aderência ao problema e documentação; pesos e possíveis complementos ainda precisam ser conferidos.

## Proposta de implementação

Pasta mobile/. App sem login, sem ouvir microfone e sem rastreamento contínuo de localização. Consultar pontos cadastrados; não precisar pagar por geocoding/mapas. Mapa é opcional: lista e coordenadas já permitem cumprir a jornada.

| Tela | Conteúdo e ação |
| --- | --- |
| Locais | Lista, cidade, identificação de demonstração e seleção de dois pontos |
| Detalhe | Série/perfil disponível, origem, fonte, período, amostras e cobertura |
| Comparar | Dois pontos no mesmo intervalo e origem; valores e limitações lado a lado |
| Favoritos | Itens persistidos e resumo em cache com horário da última consulta |

Usar SQLite para favoritos e cache. Configurar API_BASE_URL fora do código; em aparelho físico, localhost não é a VM. Adaptador de mock reproduz o contrato, incluindo no_data e erros. Dados do mock são identificados como sintéticos; trocar mock/API por configuração, não reescrever telas.

Comparação não é ranking de qualidade de vida. Se método, fonte, janela ou cobertura forem incompatíveis, apresentar dados separadamente e informar “dados insuficientes para comparar”. Não usar somente verde/vermelho nem chamar local de seguro/silencioso por ausência de medições. Não exibir 0 dB quando faltar dado.

## Sequência e aceite

1. Montar navegação e telas com fixture compartilhado, sem depender da API.
2. Persistir favorito: favoritar, encerrar e reabrir mantém o item.
3. Implementar detalhe/comparação no mesmo período/origem.
4. Integrar API e tratar carregando, vazio, erro, no_data e informação histórica.
5. Desligar a rede: favoritos/cache continuam legíveis, marcados como cache com data; não inventar atualização.
6. Validar tamanho de fonte, contraste, rótulos para leitor de tela, alvos de toque e mensagens sem depender de cor.

Casos mínimos de demonstração: dois locais com dados de demonstração comparáveis; ponto sem dados; API indisponível; favorito persistente. Se trocar a origem, atualizar ambos os pontos da comparação.

## Handoff e entrega

**Meta 10/11:** telas navegáveis com mock. **Meta 13/11:** API integrada e SQLite funcionando. **Meta 16/11:** acessibilidade/erros e evidências.

Entregar ao C# exemplos de respostas consumidas e à QA a jornada reproduzível. README com plataforma testada, instalação, configuração, modo mock/API, ficha CitizenTech, nomes/RMs e prints reais.

Vídeo até 3 minutos: problema e público; consulta/comparação; indicação da fonte e limite; favorito; reabertura offline; instruções/repositório. Mock permitido pela matéria deve ser declarado; não descrever como integração ao vivo se não ocorreu.

## Pendências

Versão Expo compatível fixada por lockfile e rubrica detalhada atualizada. Aprovar mock com o responsável C# antes de criar campos diferentes.

## Organização no monorepo

Pasta `mobile/`; branch `herbert/mobile`. [Responsabilidades](../equipe.md), [modos de execução](../modos-de-execucao.md), [contratos v0.2.0](../../contracts/README.md) e [auditoria](../auditoria.md). Componentes devem funcionar em modo standalone e integrado conforme aplicável; documentar comandos reais em README/component.json.
