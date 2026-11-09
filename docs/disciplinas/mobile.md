# Mobile — consulta e comparação

**Responsável:** Herbert de Sousa Vilela, RM555701. Pasta `mobile/`; branch `herbert/mobile`.

## Exigência do professor

PDF p. 34 e tarefa coletada: React Native + TypeScript, Expo Router, API ou mock, banco, acessibilidade e jornada da Ficha CitizenTech. GitHub com README/ficha/integrantes/prints, vídeo de até 3 minutos. Critérios conhecidos: telas/navegação, consumo de dados, banco, acessibilidade, aderência ao problema e documentação; pesos e possíveis complementos ainda precisam ser conferidos.

## Responsabilidade

App React Native/TypeScript com Expo Router: locais, detalhe/perfil acústico, comparação de dois locais e favoritos. Consome somente a API C#; não acessa banco remoto ou ingestão Java. SQLite local guarda favoritos/cache.

No demonstrador integrado, usuário fornece origem da API e chave de leitura, mantida apenas em memória por sessão. Não embutir segredo no bundle, URL, logs ou SQLite. Reabrir offline preserva cache com data, sem exigir autenticação de rede nem inventar atualização.

## Aceite

- Adaptador mock local usa as mesmas formas do OpenAPI/fixtures; trocar por URL configurável para integrar.
- Navegação completa, comparação com mesmo período/origem/método e cobertura explícita.
- Estados carregando, vazio/no_data, erro, offline, histórico e dados insuficientes. Não fazer ranking absoluto de conforto de imóvel.
- Favorito persiste após fechar/reabrir; cache offline mostra data.
- Tratar 401/403 de forma compreensível sem retry infinito ou exposição da chave.
- Contraste, fonte ajustável, rótulos acessíveis, alvos de toque e estados sem depender só de cor.

## Entrega

README com ficha CitizenTech, versões, instalação e comandos mock/integrado; prints reais, equipe e vídeo até o limite oficial. Demonstrar consulta/comparação, origem/cobertura e favorito após reabrir offline. Mock permitido deve ser declarado; não é evidência de integração real.


Referências comuns: [arquitetura](../arquitetura.md), [contratos](../../contracts/README.md) e [auditoria](../../CONTRIBUTING.md). Comandos e evidências reais ficam no README/PR da entrega.
