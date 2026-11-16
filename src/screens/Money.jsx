import { useEffect, useState } from 'react'
import { Segmented } from '../components/ui'
import Wallets from './Wallets'
import Subscriptions from './Subscriptions'
import Plan from './Plan'
import Transactions from './Transactions'
import Tax from './Tax'

/** "เงิน" group: wallets, transactions, plan, subscriptions and tax under one tab. */
export default function Money({ onEdit, onAdd, onTrade, go, opt }) {
  const [tab, setTab] = useState(opt || 'wallets')
  useEffect(() => { if (opt) setTab(opt) }, [opt])
  return (
    <div className="space-y-4">
      <Segmented className="ui-subtabs sticky top-0 z-20" value={tab} onChange={setTab}
        options={[{ value: 'wallets', label: 'กระเป๋า' }, { value: 'txns', label: 'รายการ' }, { value: 'plan', label: 'แผน' }, { value: 'subs', label: 'รายเดือน' }, { value: 'tax', label: 'ภาษี' }]} />
      {tab === 'txns' && <Transactions onEdit={onEdit} onAdd={onAdd} onTrade={onTrade} go={go} />}
      {tab === 'tax' && <Tax onAdd={onAdd} />}
      {tab === 'wallets' && <Wallets onEdit={onEdit} go={go} />}
      {tab === 'subs' && <Subscriptions />}
      {tab === 'plan' && <Plan onAdd={onAdd} />}
    </div>
  )
}
