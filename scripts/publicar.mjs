// Gera a versão pronta e publica no ramo gh-pages (GitHub Pages).
import { execSync } from 'node:child_process'
import { copyFileSync, existsSync, rmSync } from 'node:fs'

const sh = (comando, opcoes = {}) => execSync(comando, { stdio: 'inherit', ...opcoes })
const ler = (comando) => execSync(comando).toString().trim()

sh('npx vite build')
copyFileSync('dist/index.html', 'dist/404.html')
if (existsSync('dist/.git')) rmSync('dist/.git', { recursive: true, force: true })
const remoto = ler('git remote get-url origin')
const nome = ler('git config user.name')
const email = ler('git config user.email')
const d = { cwd: 'dist' }
sh('git init -q -b gh-pages', d)
sh('git add -A', d)
sh(`git -c user.name="${nome}" -c user.email="${email}" commit -q -m "Publica o app"`, d)
sh(`git push -q -f "${remoto}" gh-pages`, d)
rmSync('dist/.git', { recursive: true, force: true })
console.log('publicado')
