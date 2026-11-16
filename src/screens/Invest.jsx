import { useEffect, useState } from 'react'
import { Segmented } from '../components/ui'
import Portfolio from './Portfolio'
import Market from './Market'

/** "ลงทุน" group: your portfolio and the market, under one tab. */
export default function Invest({ onTrade, opt }) {
  const [tab, setTab] = useState(opt || 'portfolio')
  useEffect(() => { if (opt) setTab(opt) }, [opt])
  return (
    <div className="space-y-4">
      <Segmented className="ui-subtabs sticky top-0 z-20" value={tab} onChange={setTab}
        options={[{ value: 'portfolio', label: 'พอร์ตของฉัน' }, { value: 'market', label: 'ตลาด' }]} />
      {tab === 'portfolio' ? <Portfolio onTrade={onTrade} /> : <Market onTrade={onTrade} />}
    </div>
  )
}
