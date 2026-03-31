interface Props { score: number; size?: 'sm' | 'md' }

export default function MatchBadge({ score, size = 'md' }: Props) {
  const color = score >= 85 ? 'text-green-700 bg-green-50 border-green-200'
    : score >= 70 ? 'text-yellow-700 bg-yellow-50 border-yellow-200'
    : 'text-red-700 bg-red-50 border-red-200'

  return (
    <span className={`badge border font-semibold ${color} ${size === 'sm' ? 'text-xs' : 'text-sm px-2.5 py-1'}`}>
      {score}% match
    </span>
  )
}
