# CONTEXTO — jogador-caro

> Gerado automaticamente em 2026-08-25 antes de formatar o PC, para o Claude reconhecer o projeto ao voltar.

- **Caminho original:** `/c/Projetos/jogador-caro`
- **Stack detectada:** indefinido
- **Git:** branch `main`
- **Remote:** https://github.com/rhaniel221/jogador-caro.git
- **Ultimos commits:**
```
    45bb54c feat: notificacoes premium com icone e glass effect
    b9b2cc9 fix: badges do menu atualizam instantaneamente ao coletar
    5e7f7fb fix: loading screen espera jogador carregar antes de liberar
    2fe3c6b feat: loading screen de 4s + fix mobile completo
    5550c0d feat: badges de notificacao no menu com contagem de coletas
    f1b7df0 feat: overlays premium (level up, dialogos, tutorial, capitulos)
    350a2c0 feat: reorganizacao completa do fluxo do jogo
    7e537fa fix: tutorial funcionando com nova estrutura de rotas
```

## Estrutura (topo)
```
    Dockerfile
    backend
    frontend
    jogacraque.exe
    static
    tools
```

## Para retomar depois
- Reinstale dependencias (node_modules/.venv NAO foram copiados): `npm install` / `pip install -r requirements.txt` conforme a stack.
- Consulte o git log acima e a branch `backup` (se existir) para o ultimo estado salvo.
