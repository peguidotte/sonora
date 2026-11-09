# Physical Computing — nó acústico simulado

**Responsável:** Leonardo Correa de Mello, RM555573. **Dependências:** contrato de ingestão e conectividade ao backend. Circuito pode começar antes do C#.

## Exigência do professor

PDF p. 38: ESP32 funcional no Wokwi, integrado à CitizenTech; link do projeto, vídeo até 4 minutos apresentando solução/circuito e TXT de integrantes. Pesos não detalhados no material coletado; conferir tarefa atual antes do envio.

## Proposta de circuito

ESP32 + potenciômetro + display OLED (ou serial legível) + LEDs/resistores. Potenciômetro representa a variação do nível sonoro; não é microfone e não mede decibéis físicos. Não armazenar/transmitir áudio.

- Potenciômetro em entrada ADC adequada ao ESP32, preferindo ADC1 se Wi-Fi estiver ativo.
- Firmware mapeia o valor lido para uma faixa sintética, proposta 35–95 dB(A), identificada como simulação.
- A cada 5 segundos, mostrar valor e estado; produzir uma observação de janela de 5 s compatível com o contrato.
- LEDs indicam faixas **didáticas**, por exemplo <55 / 55–70 / >70, sem afirmar limites legais ou de saúde.
- Gerar externalId que não colida após reboot; usar identificador de inicialização mais sequência, preservando o mesmo ID ao reenviar.
- Sincronizar relógio; se não houver data válida, mostrar erro e não enviar timestamp inventado.
- POST /api/v1/observacoes com credencial descartável vinculada ao dispositivo. Não colocar chave administrativa no circuito.

O valor “LAeq” sintético é um valor de demonstração para a janela, não uma calibração linear válida de um sonômetro. Explique essa diferença no vídeo/README.

## Passos e integração

1. Montar e validar entradas/saídas sem rede.
2. Emitir JSON pelo serial com deviceId, sessionId, externalId, observedAt, durationSeconds e laeqDbA.
3. Configurar Wi-Fi e URL; conferir HTTP/status e reenvio sem duplicidade.
4. Demonstrar o registro aparecendo no painel/API como simulated.
5. Interromper conexão e mostrar estado de falha com tentativas limitadas; retomar sem gerar duplicações.

A [documentação do Wokwi](https://docs.wokwi.com/guides/esp32-wifi) informa que o gateway público acessa a internet, mas não a rede local. Uma API em localhost da VM não fica automaticamente acessível. Validar opção de conectividade com Pedro antes de prometer live; não exigir compra de plano por inferência.

Preferir transmissão real por endpoint de laboratório acessível e controlado. Se só for viável replay do JSON emitido, declarar a reprodução e confirmar aceitação com o professor; serial isolado não prova integração HTTP. Não abrir a máquina pessoal indiscriminadamente.

## Critérios de aceite

- Girar o potenciômetro altera leitura e saída visual.
- JSON atende tipos, duração, data e identificador definidos.
- API rejeita chave inválida e aceita credencial do dispositivo correto.
- Retry usa o mesmo externalId; painel mostra origem simulada.
- Perda de conexão fica visível sem travar circuito em loop infinito.
- Nenhum áudio, segredo administrativo ou alegação de medição real.

## Entrega e metas

Pasta iot/ com sketch, diagram.json, libraries.txt quando necessário, README, contrato e evidências de integração; link Wokwi e TXT com nomes/RMs.

**Meta 10/11:** circuito e serial. **Meta 12/11:** conectividade decidida/testada. **Meta 15/11:** fluxo completo e vídeo.

Roteiro até 4 min: problema/uso; função do nó na plataforma; explicar simulação; variar entrada; mostrar API/painel; demonstrar falha/limites e repositório.

## Pendências

Acesso de rede entre simulador e API. Instalação física em postes e calibração de hardware real ficam fora da GS. Dados sintéticos do circuito não entram no treino de ML.

## Organização no monorepo

Pasta `iot/`; branch `leo/iot`. [Responsabilidades](../equipe.md), [modos de execução](../modos-de-execucao.md), [contratos v0.2.0](../../contracts/README.md) e [auditoria](../auditoria.md). Componentes devem funcionar em modo standalone e integrado conforme aplicável; documentar comandos reais em README/component.json.
