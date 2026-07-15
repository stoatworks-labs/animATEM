export type TapMode = 'preview' | 'program'

interface Props {
  mode: TapMode
  onModeChange: (mode: TapMode) => void
  onCut: () => void
  onAuto: () => void
  onFtb: () => void
  isKiosk: boolean
  onToggleKiosk: () => void
}

/** Bottom row of large touch targets for standard live switching, below the MultiviewCanvas. */
function FunctionKeyRow({
  mode,
  onModeChange,
  onCut,
  onAuto,
  onFtb,
  isKiosk,
  onToggleKiosk
}: Props): React.JSX.Element {
  return (
    <div className="function-key-row">
      <button
        className={`fkey ${mode === 'preview' ? 'active' : ''}`}
        onClick={() => onModeChange('preview')}
      >
        Tap → PVW
      </button>
      <button
        className={`fkey ${mode === 'program' ? 'active' : ''}`}
        onClick={() => onModeChange('program')}
      >
        Tap → PGM
      </button>
      <button className="fkey fkey-cut" onClick={onCut}>
        Cut
      </button>
      <button className="fkey fkey-auto" onClick={onAuto}>
        Auto
      </button>
      <button className="fkey fkey-ftb" onClick={onFtb}>
        FTB
      </button>
      <button className="fkey" onClick={onToggleKiosk}>
        {isKiosk ? 'Exit kiosk' : 'Kiosk'}
      </button>
    </div>
  )
}

export default FunctionKeyRow
