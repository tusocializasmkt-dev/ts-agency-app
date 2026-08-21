# Firebase Auth por e-mail e senha

O login ativo usa `signInWithEmailAndPassword`. O Firebase Auth mantém a sessão e o aplicativo descobre o papel consultando `admins/{uid}` ou `brands/{uid}`. Nenhum papel ou identificador vindo do navegador é aceito como autorização.

## Administradora principal

Este projeto não cria a conta remota automaticamente. No Firebase Console do projeto correto:

1. Abra Authentication > Sign-in method e habilite Email/Password.
2. Abra Authentication > Users e crie `tusocializasmkt@gmail.com` com uma senha inicial forte, comunicada por canal seguro.
3. Copie o UID gerado.
4. No Firestore, crie `admins/{UID}` com `email: "tusocializasmkt@gmail.com"` e `role: "admin"`.
5. Confirme que o ID do documento é exatamente o UID do Authentication antes da homologação.

Nome de referência: Dani Bandeira. A senha nunca deve ser escrita no repositório, Firestore ou documentação.

## Ambiente local

Defina `VITE_USE_FIREBASE_EMULATORS=true` apenas no arquivo local de ambiente e inicie Auth, Firestore e Functions Emulators. Sem essa variável, ou com `false`, o frontend usa a configuração Firebase real. Crie no Auth Emulator um usuário administrador e um documento `admins/{uid}` correspondente.

O acesso de cliente é criado pela tela administrativa. A callable protegida cria o usuário no Auth com `uid` igual ao ID da Brand, mantendo as Rules e o ownership existentes. Redefinição de senha, ativação e suspensão também passam pelo Admin SDK; senhas não são gravadas no Firestore.

## Fluxo legado

`internalLogin` e `setInternalCredential` permanecem apenas para compatibilidade e recusam chamadas por padrão. Para uma contingência local deliberada, o ambiente das Functions precisa definir `INTERNAL_AUTH_ENABLED=true`. Não use essa flag no fluxo normal.

Não execute deploy nem publique Rules durante a homologação local desta missão.
