import { FC, useEffect, useMemo, useState } from 'react'
import { Alert, Button, IconUsers, Listbox, Loading, Modal } from 'ui'
import * as Tooltip from '@radix-ui/react-tooltip'
import { PermissionAction } from '@supabase/shared-types/out/constants'

import { useStore, useSelectedProject, useCheckPermissions } from 'hooks'
import { useProjectTransferPreviewQuery } from 'data/projects/project-transfer-preview-query'
import { useProjectTransferMutation } from 'data/projects/project-transfer-mutation'
import { useOrganizationsQuery } from 'data/organizations/organizations-query'

const TransferProjectButton: FC<{}> = () => {
  const { ui } = useStore()

  const project = useSelectedProject()
  const projectRef = project?.ref
  const projectOrgId = project?.organization_id
  const { data: allOrganizations } = useOrganizationsQuery()

  const organizations = useMemo(
    () =>
      (allOrganizations || [])
        .filter((it) => it.id !== projectOrgId)
        // Only orgs with org-level subscription
        .filter((it) => it.subscription_id),
    [allOrganizations, projectOrgId]
  )

  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const [selectedOrg, setSelectedOrg] = useState()

  const { error: transferError, mutateAsync: transferProject } = useProjectTransferMutation()

  const {
    data: transferPreviewData,
    error: transferPreviewError,
    isLoading: transferPreviewIsLoading,
    remove,
  } = useProjectTransferPreviewQuery(
    { projectRef, targetOrganizationSlug: selectedOrg },
    { enabled: !isLoading && isOpen }
  )

  useEffect(() => {
    if (isOpen) {
      // reset state
      setSelectedOrg(undefined)
      setIsLoading(false)
    } else {
      // Invalidate cache
      remove()
    }
  }, [isOpen])

  const canTransferProject = useCheckPermissions(PermissionAction.UPDATE, 'projects')

  const toggle = () => {
    setIsOpen(!isOpen)
  }

  async function handleTransferProject() {
    if (project === undefined) return
    if (selectedOrg === undefined) return

    setIsLoading(true)

    try {
      await transferProject({ projectRef, targetOrganizationSlug: selectedOrg })
      ui.setNotification({
        category: 'success',
        
        duration: 5000,
        message: `Successfully transfered project ${project?.name}.`,
      })
      setIsOpen(false)
    } catch {
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Tooltip.Root delayDuration={0}>
        <Tooltip.Trigger>
          <Button onClick={toggle} type="default" disabled={!canTransferProject}>
            Transfer project
          </Button>
        </Tooltip.Trigger>
        {!canTransferProject && (
          <Tooltip.Portal>
            <Tooltip.Content side="bottom">
              <Tooltip.Arrow className="radix-tooltip-arrow" />
              <div
                className={[
                  'rounded bg-scale-100 py-1 px-2 leading-none shadow', // background
                  'border border-scale-200 ', //border
                ].join(' ')}
              >
                <span className="text-xs text-scale-1200">
                  You need additional permissions to delete this project
                </span>
              </div>
            </Tooltip.Content>
          </Tooltip.Portal>
        )}
      </Tooltip.Root>

      <Modal
        closable
        onCancel={() => toggle()}
        visible={isOpen}
        loading={isLoading}
        size={'medium'}
        header={`Transfer project ${project?.name}`}
        customFooter={
          <div className="flex items-center space-x-2 justify-end">
            <Button type="default" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => handleTransferProject()}
              disabled={
                !transferPreviewData || !transferPreviewData.valid || isLoading || !selectedOrg
              }
            >
              Transfer Project
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-4 text-scale-1100">
          <Modal.Content>
            <p className="text-sm">
              Projects can be transferred between organizations as long as the project owner is a
              member of both the source and destinations of the transfer. Please keep the following
              in mind:
            </p>
            <ul className="list-disc pl-4 text-sm mt-1 space-y-1">
              <li>There is no downtime or restrictions involved when transfering a project</li>
              <li>
                Depending on your role in the target organization, you might have less permissions
                after transfering
              </li>
              <li>
                If you move your project to an organization with a smaller subscription plan, you
                may lose access to some features
              </li>
            </ul>
          </Modal.Content>
          <Modal.Content>
            {organizations.length > 0 && (
              <Listbox
                label="Select Target Organization"
                layout="vertical"
                value={selectedOrg}
                onChange={(slug) => setSelectedOrg(slug)}
                placeholder="Select Organization"
              >
                <Listbox.Option disabled key="no-results" label="Select Organization" value="">
                  Select Organization
                </Listbox.Option>
                {organizations.map((x: any) => (
                  <Listbox.Option
                    key={x.id}
                    label={x.name}
                    value={x.slug}
                    addOnBefore={() => <IconUsers />}
                  >
                    {x.name}
                  </Listbox.Option>
                ))}
              </Listbox>
            )}
          </Modal.Content>

          <Loading active={selectedOrg !== undefined && transferPreviewIsLoading}>
            {transferPreviewData && <Modal.Separator />}

            <Modal.Content>
              <div className="py-2">
                {transferPreviewData && transferPreviewData.valid && (
                  <div className="text-sm text-scale-1100">
                    {transferPreviewData.source_subscription_plan ===
                    transferPreviewData.target_subscription_plan ? (
                      <div>
                        <p>
                          Your project is currently on the{' '}
                          {transferPreviewData.source_subscription_plan} plan, whereas the target
                          organization uses the {transferPreviewData.target_subscription_plan} plan.
                        </p>
                      </div>
                    ) : (
                      <div>
                        Your project and the target organization are both on the{' '}
                        {transferPreviewData.source_subscription_plan} subscription plan.
                      </div>
                    )}

                    <div>
                      {transferPreviewData.credits_on_source_organization === 0 ? (
                        <span>
                          {' '}
                          Your current organization won't be granted any prorated credits.
                        </span>
                      ) : (
                        <span>
                          {' '}
                          Your current organization will be granted $
                          {transferPreviewData.credits_on_source_organization} in credits as
                          proration.
                        </span>
                      )}
                      {transferPreviewData.costs_on_target_organization === 0 ? (
                        <span>
                          {' '}
                          The target organization won't be charged any immediate upfront payment.
                        </span>
                      ) : (
                        <span>
                          {' '}
                          The target organization will be billed $
                          {transferPreviewData.costs_on_target_organization} immediately to prorate
                          for the remainder of the billing period.
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {transferPreviewData && transferPreviewData.warnings.length > 0 && (
                  <Alert withIcon variant="warning" title="Warnings for project transfer">
                    <ul className="list-disc list-inside">
                      {transferPreviewData.warnings.map((warning) => (
                        <li key={warning.key}>{warning.message}</li>
                      ))}
                    </ul>
                  </Alert>
                )}
                {transferPreviewData && transferPreviewData.errors.length > 0 && (
                  <Alert withIcon variant="danger" title="Errors for project transfer">
                    <ul className="list-disc list-inside">
                      {transferPreviewData.errors.map((error) => (
                        <li key={error.key}>{error.message}</li>
                      ))}
                    </ul>
                    {transferPreviewData.members_exceeding_free_project_limit.length && (
                      <div className="space-y-2">
                        <p className="text-sm text-scale-1100">
                          The following members have reached their maximum limits for the number of
                          active free plan projects within organizations where they are an
                          administrator or owner:
                        </p>
                        <ul className="pl-5 text-sm list-disc text-scale-1100">
                          {(transferPreviewData.members_exceeding_free_project_limit || []).map(
                            (member, idx: number) => (
                              <li key={`member-${idx}`}>
                                {member.name} (Limit: {member.limit} free projects)
                              </li>
                            )
                          )}
                        </ul>
                        <p className="text-sm text-scale-1100">
                          These members will need to either delete, pause, or upgrade one or more of
                          these projects before you're able to downgrade this project.
                        </p>
                      </div>
                    )}
                  </Alert>
                )}
                {transferPreviewError && !transferError && (
                  <Alert withIcon variant="danger" title="Project cannot be tranfered">
                    <p>{transferPreviewError.message}</p>
                  </Alert>
                )}
                {transferError && (
                  <Alert withIcon variant="danger" title="Project cannot be tranfered">
                    <p>{transferError.message}</p>
                  </Alert>
                )}
                {transferPreviewData &&
                  transferPreviewData.members_exceeding_free_project_limit.length > 0 && (
                    <div>
                      c{JSON.stringify(transferPreviewData.members_exceeding_free_project_limit)}
                    </div>
                  )}
              </div>
            </Modal.Content>
          </Loading>
        </div>
      </Modal>
    </>
  )
}

export default TransferProjectButton
