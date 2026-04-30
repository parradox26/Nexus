export function CardSkeleton() {
  return (
    <div
      className="animate-pulse rounded-[12px] p-4"
      style={{ background: '#F5F4FF', border: '0.5px solid #E0DEF7' }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="h-11 w-11 rounded-[10px]" style={{ background: '#E0DEF7' }} />
        <div className="flex-1 space-y-2">
          <div className="h-3 rounded" style={{ background: '#E0DEF7', width: '60%' }} />
          <div className="h-2.5 rounded" style={{ background: '#E0DEF7', width: '40%' }} />
        </div>
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-2.5 rounded" style={{ background: '#E0DEF7', width: '90%' }} />
        <div className="h-2.5 rounded" style={{ background: '#E0DEF7', width: '75%' }} />
      </div>
      <div className="flex gap-2">
        <div className="h-8 rounded-[8px]" style={{ background: '#E0DEF7', width: '80px' }} />
        <div className="h-8 rounded-[8px]" style={{ background: '#E0DEF7', width: '96px' }} />
      </div>
    </div>
  )
}

export function RowSkeleton() {
  return (
    <div
      className="animate-pulse flex items-center gap-3 px-4 py-3"
      style={{ borderBottom: '0.5px solid #F1EFE8' }}
    >
      <div className="h-[7px] w-[7px] rounded-full flex-shrink-0" style={{ background: '#E0DEF7' }} />
      <div className="h-2.5 rounded" style={{ background: '#E0DEF7', width: '80px' }} />
      <div className="h-2.5 rounded flex-1" style={{ background: '#E0DEF7', width: '90%' }} />
      <div className="h-2.5 rounded" style={{ background: '#E0DEF7', width: '60px' }} />
    </div>
  )
}
