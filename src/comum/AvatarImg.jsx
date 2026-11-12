import { useEffect, useState } from 'react'
import { linkAssinado } from '../lib/dados'

// Molduras que o jogador pode escolher. A posição na lista é o número gravado no banco.
export const MOLDURAS = [
  { nome: 'Verde-água', cor: 'linear-gradient(135deg, var(--g-accent), var(--hood-2))' },
  { nome: 'Dourada', cor: 'linear-gradient(135deg, var(--g-xp), var(--g-hot))' },
  { nome: 'Laranja', cor: 'linear-gradient(135deg, var(--hood-3), var(--hood-2))' },
]

const guardados = new Map()

export async function linkDoAvatar(familiaId) {
  if (guardados.has(familiaId)) return guardados.get(familiaId)
  const url = await linkAssinado(`${familiaId}/avatar/base.jpg`, 60 * 60 * 6)
  if (url) guardados.set(familiaId, url)
  return url
}

export default function AvatarImg({ familiaId, moldura = 0, grande = false, mini = false, nome = '' }) {
  const [url, setUrl] = useState(guardados.get(familiaId) ?? null)
  useEffect(() => {
    let vivo = true
    linkDoAvatar(familiaId).then((u) => vivo && setUrl(u))
    return () => { vivo = false }
  }, [familiaId])
  const cor = (MOLDURAS[moldura] ?? MOLDURAS[0]).cor
  return (
    <span className={grande ? 'av av-big' : mini ? 'av av-mini' : 'av'} style={{ '--ring': cor }}>
      <span className="av-in">{url && <img src={url} alt={nome ? `Avatar de ${nome}` : ''} width="400" height="400" />}</span>
    </span>
  )
}
