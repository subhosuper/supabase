import { FC } from 'react'

import { useSelectedProject } from 'hooks'
import Panel from 'components/ui/Panel'

import TransferProjectButton from './TransferProjectButton'
import { FormHeader } from 'components/ui/Forms'
import { IconInfo } from 'ui'

interface Props {}

const TransferProjectPanel: FC<Props> = ({}) => {
  const project = useSelectedProject()

  if (project === undefined) return <></>

  return (
    <section>
      <FormHeader
        title="Transfer Project"
        description="Transfer your project to a different organization without downtime."
      />
      <Panel>
        <Panel.Content>
          <div className="flex justify-between">
            <div className="flex items-center space-x-4">
              <IconInfo />
              <div className='space-y-1'>
                <p className="text-sm">Transfer project to another organization</p>
                <p className="text-sm text-scale-1100">
                  Projects can be transferred between organizations as long as the project owner is
                  a member of both the source and destinations of the transfer.
                </p>
              </div>
            </div>
            <div>
              <TransferProjectButton />
            </div>
          </div>
        </Panel.Content>
      </Panel>
    </section>
  )
}

export default TransferProjectPanel
