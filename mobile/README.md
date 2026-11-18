# Sonora Mobile

Consulte um local, compare perfis acústicos e salve favoritos no celular. O app usa React Native, TypeScript e Expo Router. SQLite guarda favoritos e consultas salvas no aparelho.

[Requisitos da disciplina](../docs/disciplinas/mobile.md) · [Equipe](../README.md#equipe)

## Começar

Use Node.js 22. Para executar em Android, instale Java 17, Android SDK e um emulador ou conecte um aparelho.

```bash
cd mobile
npm ci
npm run android
```

O app abre em modo de demonstração com dados sintéticos. Na tela **Settings**, selecione a API e informe a URL base do C# e uma chave com escopo `acoustics:read`. A chave fica em memória e precisa ser informada de novo após fechar o app.

### Jornada de consulta

1. Abra um local e escolha a origem das medições. O perfil mostra cobertura e indica quando o período não tem dados.
2. Marque um local consultado como favorito. Se abrir esse favorito após reiniciar o app, o último perfil salvo da API aparece identificado com a data da consulta.
3. Na tela **Compare**, selecione dois locais. A comparação verifica período, origem e método de coleta.

## Validação

```bash
npm run typecheck
npm test -- --runInBand
npx expo export --platform android
```

Para montar o APK no Android, execute `npx expo prebuild --platform android` e `./gradlew assembleDebug` a partir de `android/` (no Windows, `gradlew.bat assembleDebug`). Esse também é o fluxo do [GitHub Actions](../.github/workflows/delivery.yml).

As capturas de tela, o vídeo de até três minutos, a Ficha CitizenTech e o teste em aparelho com a API C# são evidências pendentes.