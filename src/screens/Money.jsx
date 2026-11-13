import { useEffect, useState } from 'react'
import { Segmented } from '../components/ui'
import Wallets from './Wallets'
import Subscriptions from './Subscriptions'
import Plan from './Plan'

/** "เงิน" group: wallets, subscriptions and planning under one tab. */
export default function Money({ onEdit, onAdd, go, opt }) {
  const [tab, setTab] = useState(opt || 'wallets')
  useEffect(() => { if (opt) setTab(opt) }, [opt])
  return (
    <div className="space-y-4">
      <Segmented className="sticky top-0 z-10 bg-[#f5f7fa]/90 backdrop-blur" value={tab} onChange={setTab}
        options={[{ value: 'wallets', label: 'กระเป๋า' }, { value: 'subs', label: 'Subscription' }, { value: 'plan', label: 'วางแผน' }]} />
      {tab === 'wallets' && <Wallets onEdit={onEdit} go={go} />}
      {tab === 'subs' && <Subscriptions />}
      {tab === 'plan' && <Plan onAdd={onAdd} />}
    </div>
  )
}
