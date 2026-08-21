# Provisionamento seguro do primeiro administrador

## Por que o frontend não pode criar administradores

O código executado no navegador está sob controle do usuário e não é um ambiente confiável para conceder privilégios. Permitir que o frontend crie documentos administrativos possibilitaria elevação indevida de acesso. As regras do Firestore devem continuar bloqueando esse tipo de escrita pelo cliente.

## Processo futuro recomendado

O primeiro administrador deverá ser provisionado por um processo autenticado e privilegiado, como Firebase Admin SDK, Cloud Function protegida, script administrativo local controlado ou painel backend seguro. Esse processo não faz parte desta etapa.

## Dados necessários no Firebase Authentication

Deverá existir uma conta de usuário válida no Firebase Authentication. O UID gerado por essa conta será usado para associar o perfil administrativo. Senhas e tokens nunca devem ser armazenados no Firestore ou no código-fonte.

## Documento `admins/{uid}`

Deverá existir um documento cujo ID seja exatamente o UID do usuário no Firebase Authentication. Ele poderá conter apenas metadados administrativos necessários, como email, papel e data de criação, sem credenciais.

## Documento `agency_config/default`

O documento deverá ser criado ou inicializado pelo mesmo processo privilegiado, com os dados institucionais necessários e sem segredos.

## Necessidade de ambiente privilegiado

Somente um ambiente confiável pode validar a identidade do operador, usar credenciais administrativas protegidas e ignorar as regras do cliente de forma controlada. O navegador não oferece essas garantias.

## Tarefas pendentes

- Escolher o mecanismo privilegiado de provisionamento.
- Definir autenticação e autorização do operador responsável.
- Implementar validações, auditoria e tratamento de repetição segura.
- Testar as regras do Firestore com emuladores.
- Documentar revogação e recuperação de acesso administrativo.
