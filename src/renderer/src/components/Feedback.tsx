interface FeedbackProps {
  mensagem: string
  tipo?: 'erro' | 'sucesso' | 'informacao'
  id?: string
}

export default function Feedback({
  mensagem, tipo = 'informacao', id
}: FeedbackProps): React.JSX.Element | null {
  if (!mensagem) return null
  return (
    <p
      id={id}
      className={`fincontrol-feedback fincontrol-feedback--${tipo}`}
      role={tipo === 'erro' ? 'alert' : 'status'}
    >
      {mensagem.replace(/^Error invoking remote method '[^']+': Error:\s*/, '')}
    </p>
  )
}
