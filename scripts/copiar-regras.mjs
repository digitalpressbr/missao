// Copia as regras puras para as funções do Supabase, que ficam fora deste repositório.
import { copyFileSync, mkdirSync } from 'node:fs'
const destino = 'C:/Temp/missao-supabase/supabase/functions/_shared'
mkdirSync(destino, { recursive: true })
copyFileSync('src/lib/regras.js', `${destino}/regras.js`)
console.log('regras.js copiado para', destino)
