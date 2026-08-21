$ErrorActionPreference = 'Stop'
if (-not $env:FIREBASE_AUTH_EMULATOR_HOST -or -not $env:FIRESTORE_EMULATOR_HOST) {
  throw 'Inicie Auth e Firestore Emulators antes de definir a senha.'
}

$securePassword = Read-Host 'Nova senha do administrador local' -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
  $env:TS_AGENCY_ADMIN_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  npm.cmd --prefix functions run seed:auth:emulator
  if ($LASTEXITCODE -ne 0) { throw 'Não foi possível criar o acesso administrativo local.' }
} finally {
  Remove-Item Env:TS_AGENCY_ADMIN_PASSWORD -ErrorAction SilentlyContinue
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
}
