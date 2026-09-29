# QuestLogg — AION 2 Desktop

Aplicativo Windows para acompanhar a rotina, eventos e exploração do AION 2. Os dados ficam salvos localmente e separados por Nick.

## Recursos da primeira versão

- Janela compacta e tela cheia.
- Timers editáveis de World Boss, Shugo, Festival e eventos da guilda.
- Alertas nativos do Windows com antecedência configurável.
- Checklist diário, histórico automático e lembrete rápido.
- Penas, dungeons e acampamentos por mapa.
- Aba com o mapa externo do QuestLog.gg e botão para abertura separada.
- Tema Bruxa Carmesim e gradiente por perfil.
- Exportação e importação de backup em JSON.
- Ícone na bandeja do Windows.

## Testar a interface

```bash
npm install
npm run dev
```

## Gerar o aplicativo localmente

No Windows, instale Node.js 22, Rust e Microsoft C++ Build Tools. Depois:

```bash
npm install
npm run tauri build
```

Os instaladores serão gerados em `src-tauri/target/release/bundle`.

## Publicar pelo GitHub

1. Envie este projeto para um repositório GitHub.
2. Crie uma tag, por exemplo: `git tag v0.1.0`.
3. Envie a tag: `git push origin v0.1.0`.
4. O workflow cria um rascunho em **Releases** com os instaladores do Windows.

Os horários incluídos são provisórios e podem ser editados dentro do aplicativo.
