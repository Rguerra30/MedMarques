# Rota Médica · MedMarques

Plataforma de estudo para Step 1 e Step 2 CK com trilhas, simulados cronometrados, evolução semanal e explicações por alternativa. O código público contém as 32 questões autorais iniciais. O progresso dos alunos é armazenado no Supabase, isolado por conta.

## Executar e configurar

1. Use a migração em `supabase/migrations/` em um novo projeto Supabase. Ela cria o banco e carrega as questões iniciais.
2. Aponte `dist/config.js` para a URL e a chave publicável do projeto. Mantenha chaves secretas e credenciais de OAuth no painel do Supabase.
3. Publique os arquivos da pasta `dist/` em um servidor estático HTTPS. Para desenvolvimento local, sirva a pasta, por exemplo com `python3 -m http.server --directory dist 8080`.
4. No [Supabase Auth](https://supabase.com/docs/guides/auth/redirect-urls), configure a URL exata da aplicação como Site URL e inclua os destinos de retorno autorizados. Ative a confirmação por e-mail e configure SMTP para enviar e-mails aos alunos. Para Google, siga a [configuração do provedor](https://supabase.com/docs/guides/auth/social-sign-in/auth-google) e use o callback do Supabase no cliente OAuth do Google.
5. Se o hospedador também exigir autenticação, conceda acesso aos alunos pelo hospedador antes de usar o login da aplicação.

## Importar um banco adquirido

Confirme se a licença permite exportação, armazenamento em uma plataforma própria e uso das explicações. Guarde os arquivos da compra em `imports/`, ignorada pelo Git. Adapte a exportação do fornecedor a uma lista JSON com estes campos por questão:

| Campo | Formato |
|---|---|
| track | `Step 1` ou `Step 2 CK` |
| stage | Nome da etapa nova, preservado como título na interface |
| mode | `practice` ou `mock` |
| topic e stem | Tema e enunciado |
| options | Lista com quatro alternativas distintas |
| answer | Índice da alternativa correta, de 0 a 3 |
| reason | Explicação geral da resposta correta |
| tutor | Quatro explicações, na ordem das alternativas |

Cada etapa importada deve ter questões de treino e de simulado. Prepare o SQL com `node scripts/prepare-import.mjs imports/lote.json imports/lote.private.sql` e execute o arquivo no editor SQL do Supabase. A carga é transacional, preserva as questões e o histórico existentes e rejeita etapas ou enunciados repetidos. Alunos autenticados leem o banco pela plataforma. Se a licença limitar os usuários, configure os cadastros ou convites de acordo com ela antes de importar.

O tutor exibe explicações cadastradas. A aplicação apresenta o gabarito no fim do simulado, e esses simulados são destinados à prática pessoal.
