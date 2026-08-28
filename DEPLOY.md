# Guia de publicação — Clube do Intensivista

Este guia leva o site do estado atual (arquivos no seu computador) até no ar, com banco de dados real (Supabase) e integração de pagamento (Hotmart). Siga na ordem — cada parte depende da anterior.

Partes que só você pode fazer (login, criação de conta, cartão de pagamento se aplicável): estão marcadas com 👤. As demais eu já deixei prontas no código.

---

## Parte 1 — Colocar o código no GitHub

1. 👤 Crie uma conta em [github.com](https://github.com) se ainda não tiver.
2. 👤 Crie um repositório novo, vazio (sem README, sem .gitignore — já temos um). Pode ser privado.
3. Me avise o endereço do repositório (algo como `https://github.com/seu-usuario/clube-do-intensivista.git`) que eu conecto e envio o código local para lá.

*(Alternativa: se preferir, você já tem o GitHub Desktop instalado — pode abrir esta pasta lá, "Publish repository", e me avisar quando terminar.)*

---

## Parte 2 — Criar o projeto no Supabase

1. 👤 Crie uma conta em [supabase.com](https://supabase.com) (dá para entrar com GitHub).
2. 👤 Clique em **New project**. Escolha um nome (ex: `clube-do-intensivista`), uma senha forte para o banco (guarde essa senha) e a região mais próxima (South America - São Paulo, se disponível).
3. Aguarde 1–2 minutos até o projeto ficar pronto.
4. 👤 No menu lateral, vá em **SQL Editor > New query**. Abra o arquivo [`supabase/schema.sql`](supabase/schema.sql) deste projeto, copie todo o conteúdo, cole lá e clique em **Run**. Isso cria todas as tabelas (cursos, aulas, matrículas, materiais, eventos, comunicados, dúvidas) já com as permissões de segurança certas.
5. 👤 Vá em **Project Settings (ícone de engrenagem) > API**. Você vai precisar de três valores — copie e me envie (ou guarde para colar na Vercel na Parte 3):
   - **Project URL** (algo como `https://abcdefgh.supabase.co`)
   - **anon public key**
   - **service_role key** (fica escondida por padrão, clique no olhinho para revelar) — **essa é secreta, nunca cole em código que vai para o navegador**

---

## Parte 3 — Publicar na Vercel

1. 👤 Crie uma conta em [vercel.com](https://vercel.com), de preferência entrando com a mesma conta do GitHub.
2. 👤 Clique em **Add New... > Project** e selecione o repositório que você criou na Parte 1.
3. Na tela de configuração do projeto:
   - **Root Directory**: clique em "Edit" e selecione a pasta `site` (é onde está o código do site).
   - **Framework Preset**: deixe "Other" (não é Next.js nem nada disso — é HTML puro + funções serverless).
4. Antes de clicar em Deploy, abra **Environment Variables** e adicione as três chaves que você pegou na Parte 2:
   - `SUPABASE_URL` → a Project URL
   - `SUPABASE_SERVICE_ROLE_KEY` → a service_role key
   - `SUPABASE_ANON_KEY` → a anon public key
   - (`HOTMART_HOTTOK` você adiciona na Parte 4, pode deixar em branco por enquanto)
5. Clique em **Deploy**. Em 1–2 minutos o site estará no ar em um endereço tipo `clube-do-intensivista.vercel.app`.
6. Teste abrindo `https://SEU-ENDERECO.vercel.app/api/ping` — deve aparecer um JSON confirmando que as variáveis foram reconhecidas (`true` em cada uma).
7. 👤 (Opcional, quando quiser) em **Project Settings > Domains**, adicione seu domínio próprio (ex: clubedointensivista.com.br) e siga as instruções de DNS que a Vercel mostra.

A partir daqui, toda vez que eu (ou você) enviar uma alteração para o GitHub, a Vercel publica automaticamente uma nova versão — sem precisar repetir esses passos.

---

## Parte 4 — Conectar a Hotmart

1. Primeiro, cadastre no Supabase qual curso corresponde a qual produto da Hotmart. No **SQL Editor** do Supabase, rode (trocando pelos valores reais):
   ```sql
   update public.courses
   set hotmart_product_id = 'ID-DO-PRODUTO-NA-HOTMART'
   where title = 'Nome exato do curso';
   ```
   *(o ID do produto aparece no painel da Hotmart, na página do produto)*
2. 👤 No [painel de produtor da Hotmart](https://app-vlc.hotmart.com), vá até o produto em questão e procure por **Ferramentas > Webhook** (o nome exato pode variar um pouco conforme a versão do painel deles).
3. 👤 Cadastre a URL: `https://SEU-ENDERECO.vercel.app/api/hotmart-webhook`
4. 👤 Marque os eventos: **Compra aprovada**, **Compra completa**, **Compra cancelada**, **Compra reembolsada**, **Chargeback**.
5. 👤 A Hotmart vai gerar (ou pedir para você definir) um token secreto (**Hottok**). Copie esse valor e volte na Vercel: **Project Settings > Environment Variables**, adicione `HOTMART_HOTTOK` com esse valor, e clique em **Redeploy** para aplicar.
6. Se a Hotmart tiver um botão de "testar webhook" com uma compra fictícia, use-o. Depois, vá em **Vercel > seu projeto > Deployments > (deployment atual) > Functions > hotmart-webhook > Logs** para ver se a chamada chegou e se os dados (e-mail, produto) foram lidos corretamente.

⚠️ **Ponto de atenção:** o formato exato dos campos que a Hotmart envia pode variar um pouco. Preparei o código para tentar alguns caminhos comuns (`data.buyer.email`, etc.), mas o ideal é conferir nos Logs da Vercel, no primeiro teste real, se o e-mail e o ID do produto estão sendo lidos certo — e me avisar se algo vier vazio, que eu ajusto na hora.

---

## O que ainda falta para o site "ler" o Supabase de verdade

Hoje (neste protótipo) o site público, a área do aluno e o admin ainda leem os dados do `localStorage` do navegador — não do Supabase. Depois que as Partes 1–4 estiverem no ar, o próximo passo (que eu já deixo pronto na sequência) é:

1. Trocar o `js/data-store.js` para buscar/gravar direto no Supabase em vez do localStorage.
2. Criar a tela de login (compartilhada entre aluno e admin, como conversamos).
3. Fazer a Área do Aluno mostrar só os cursos em que a matrícula (`enrollments`) está `active` — inclusive as liberadas automaticamente pelo webhook da Hotmart.

Me avisa quando estiver com o GitHub e a Vercel prontos que eu sigo para essa parte.
