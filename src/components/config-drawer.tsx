import { useEffect, useRef, useState, type ReactNode } from 'react';

import { getNodeForm, useClientContext } from '@flowgram.ai/fixed-layout-editor';

import { useDesigner, type Selection } from './designer-context';
import {
  MEMBERS,
  POSITIONS,
  PROJECTS,
  DEPARTMENTS,
  FORM_FIELDS,
  newGroup,
  newRule,
  validateApproval,
  validateBranch,
  reorderBranches,
  type ApprovalConfig,
  type ApproverType,
  type BranchConfig,
  type ConditionRule,
  type NodeConfig,
} from '../workflow';

function Check({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="choice">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {children}
    </label>
  );
}
function Radio({
  value,
  selected,
  onChange,
  children,
  name,
}: {
  value: string;
  selected: string;
  onChange: (v: string) => void;
  children: ReactNode;
  name: string;
}) {
  return (
    <label className="choice">
      <input
        type="radio"
        name={name}
        checked={selected === value}
        onChange={() => onChange(value)}
      />
      {children}
    </label>
  );
}
function Options({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div className="option-list" role="group" aria-label={label}>
      {options.map((option) => (
        <Check
          key={option}
          checked={selected.includes(option)}
          onChange={(checked) =>
            onChange(checked ? [...selected, option] : selected.filter((v) => v !== option))
          }
        >
          {option}
        </Check>
      ))}
    </div>
  );
}
function FormRow({
  label,
  children,
  required = false,
}: {
  label: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <div className="form-row">
      <div className="form-label">
        {required && <span className="required">*</span>}
        {label}：
      </div>
      <div className="form-value">{children}</div>
    </div>
  );
}

function ApprovalSettings({
  config,
  set,
}: {
  config: ApprovalConfig;
  set: (config: ApprovalConfig) => void;
}) {
  const patch = (next: Partial<ApprovalConfig>) => set({ ...config, ...next });
  return (
    <>
      <h3>审批人：</h3>
      <FormRow label="类型">
        <div className="choices">
          <Radio
            name="selection"
            value="specified"
            selected={config.selection}
            onChange={(selection) => patch({ selection })}
          >
            指定成员
          </Radio>
          <Radio
            name="selection"
            value="self"
            selected={config.selection}
            onChange={(selection) => patch({ selection })}
          >
            发起人自选
          </Radio>
        </div>
      </FormRow>
      {config.selection === 'specified' ? (
        <>
          <FormRow label="审批人类型" required>
            <div className="choices wrap">
              {(['岗位', '人员', '发起人', '部门负责人', '发起人直属主管'] as ApproverType[]).map(
                (type) => (
                  <Check
                    key={type}
                    checked={config.types.includes(type)}
                    onChange={(checked) =>
                      patch({
                        types: checked
                          ? [...config.types, type]
                          : config.types.filter((v) => v !== type),
                      })
                    }
                  >
                    {type}
                  </Check>
                )
              )}
            </div>
          </FormRow>
          {config.types.includes('岗位') && (
            <FormRow label="选择岗位" required>
              <Options
                label="岗位"
                options={POSITIONS}
                selected={config.positions}
                onChange={(positions) => patch({ positions })}
              />
            </FormRow>
          )}
          {config.types.includes('人员') && (
            <FormRow label="选择人员" required>
              <Options
                label="人员"
                options={MEMBERS}
                selected={config.members}
                onChange={(members) => patch({ members })}
              />
            </FormRow>
          )}
        </>
      ) : (
        <p className="inline-hint">发起流程时，由发起人选择此节点的审批人。</p>
      )}
      <FormRow label="审批方式" required>
        <div className="choices column">
          <Radio name="mode" value="or" selected={config.mode} onChange={(mode) => patch({ mode })}>
            或签（一名审批人通过或否决即可）
          </Radio>
          <Radio
            name="mode"
            value="and"
            selected={config.mode}
            onChange={(mode) => patch({ mode })}
          >
            会签（需所有人审批通过）
          </Radio>
        </div>
      </FormRow>
      <h3>电签配置：</h3>
      <p className="muted">此演示暂不接入电子签章服务</p>
      <h3>操作权限：</h3>
      <FormRow label="当前节点选项">
        <div className="choices">
          <Check checked={config.transferable} onChange={(transferable) => patch({ transferable })}>
            可转交
          </Check>
          <Check
            checked={config.preventWithdraw}
            onChange={(preventWithdraw) => patch({ preventWithdraw })}
          >
            禁止撤回
          </Check>
        </div>
      </FormRow>
      <FormRow label="下一审批人选项">
        <div className="choices">
          {[
            ['optional', '可选'],
            ['required', '必选'],
            ['none', '无'],
          ].map(([value, label]) => (
            <Radio
              key={value}
              name="nextApprover"
              value={value}
              selected={config.nextApprover}
              onChange={(nextApprover) => patch({ nextApprover })}
            >
              {label}
            </Radio>
          ))}
        </div>
      </FormRow>
      <div className="resubmit-label">
        <span className="required">*</span>被回退的节点再次提交时{' '}
        <span title="配置回退后的审批路径">ⓘ</span>：
      </div>
      <div className="choices resubmit-choices">
        <Radio
          name="resubmit"
          value="restart"
          selected={config.resubmit}
          onChange={(resubmit) => patch({ resubmit })}
        >
          重新依次审批
        </Radio>
        <Radio
          name="resubmit"
          value="current"
          selected={config.resubmit}
          onChange={(resubmit) => patch({ resubmit })}
        >
          直达当前节点
        </Radio>
      </div>
      <h3>抄送：</h3>
      <FormRow label="抄送发起人">
        <button
          type="button"
          role="switch"
          aria-label="抄送发起人"
          aria-checked={config.ccInitiator}
          className={`switch ${config.ccInitiator ? 'on' : ''}`}
          onClick={() => patch({ ccInitiator: !config.ccInitiator })}
        >
          <span />
        </button>
      </FormRow>
      <FormRow label="抄送人">
        <Options
          label="抄送人"
          options={MEMBERS}
          selected={config.ccMembers}
          onChange={(ccMembers) => patch({ ccMembers })}
        />
      </FormRow>
    </>
  );
}

function RuleEditor({
  rule,
  index,
  update,
  remove,
}: {
  rule: ConditionRule;
  index: number;
  update: (next: ConditionRule) => void;
  remove: () => void;
}) {
  const options =
    rule.field === '工程名称' ? PROJECTS : rule.field === '发起人部门' ? DEPARTMENTS : MEMBERS;
  return (
    <div className="condition-rule">
      <div className="condition-rule-label">
        <span>{index === 0 ? '当' : '且'}</span>
        <button type="button" className="text-button muted" onClick={remove}>
          删除
        </button>
      </div>
      <select
        aria-label="条件字段"
        value={rule.field}
        onChange={(e) =>
          update({
            ...rule,
            field: e.target.value,
            operator: e.target.value === '申请金额' ? '大于等于' : '属于',
            values: [],
            value: '',
          })
        }
      >
        {['工程名称', '申请金额', '发起人部门', '发起人'].map((f) => (
          <option key={f}>{f}</option>
        ))}
      </select>
      <select
        aria-label="条件运算符"
        value={rule.operator}
        onChange={(e) => update({ ...rule, operator: e.target.value })}
      >
        {(rule.field === '申请金额'
          ? ['大于等于', '大于', '等于', '小于', '小于等于', '不等于']
          : ['属于', '不属于']
        ).map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
      {rule.field === '申请金额' ? (
        <input
          aria-label="申请金额"
          type="number"
          min="0"
          step="any"
          value={rule.value}
          placeholder="请输入金额"
          onChange={(e) => update({ ...rule, value: e.target.value })}
        />
      ) : (
        <Options
          label={`${rule.field}选项`}
          options={options}
          selected={rule.values}
          onChange={(values) => update({ ...rule, values })}
        />
      )}
    </div>
  );
}

function BranchSettings({
  config,
  set,
}: {
  config: BranchConfig;
  set: (config: BranchConfig) => void;
}) {
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const groups = config.groups;
  if (config.isDefault)
    return (
      <div className="default-notice">
        <span>ⓘ</span>
        <div>
          默认条件<p>不满足其他条件时，将进入默认流程。默认分支始终位于最后，无需配置条件。</p>
        </div>
      </div>
    );
  return (
    <>
      <h3 className="branch-intro">满足以下条件时进入当前分支</h3>
      <p className="muted">组内条件为「且」，条件组之间为「或」，数字越小，优先级越高。</p>
      {groups.map((group, gi) => (
        <div key={group.id}>
          {gi > 0 && <div className="group-or">或满足</div>}
          <section className="condition-group">
            <div className="condition-group-heading">
              <span>条件组 {gi + 1}</span>
              <button
                type="button"
                className="text-button muted"
                onClick={() => set({ ...config, groups: groups.filter((g) => g.id !== group.id) })}
              >
                删除组
              </button>
            </div>
            {!collapsed.includes(group.id) && (
              <>
                <div className="rules">
                  {group.conditions.map((rule, ri) => (
                    <RuleEditor
                      key={rule.id}
                      rule={rule}
                      index={ri}
                      remove={() =>
                        set({
                          ...config,
                          groups: groups.map((g) =>
                            g.id === group.id
                              ? { ...g, conditions: g.conditions.filter((c) => c.id !== rule.id) }
                              : g
                          ),
                        })
                      }
                      update={(next) =>
                        set({
                          ...config,
                          groups: groups.map((g) =>
                            g.id === group.id
                              ? {
                                  ...g,
                                  conditions: g.conditions.map((c) =>
                                    c.id === rule.id ? next : c
                                  ),
                                }
                              : g
                          ),
                        })
                      }
                    />
                  ))}
                </div>
                <button
                  type="button"
                  className="text-button blue add-condition"
                  onClick={() =>
                    set({
                      ...config,
                      groups: groups.map((g) =>
                        g.id === group.id ? { ...g, conditions: [...g.conditions, newRule()] } : g
                      ),
                    })
                  }
                >
                  ＋添加条件
                </button>
              </>
            )}
            <button
              type="button"
              className="text-button blue collapse-group"
              onClick={() =>
                setCollapsed(
                  collapsed.includes(group.id)
                    ? collapsed.filter((id) => id !== group.id)
                    : [...collapsed, group.id]
                )
              }
            >
              {collapsed.includes(group.id) ? '展开⌄' : '收起⌃'}
            </button>
          </section>
        </div>
      ))}
      <button
        type="button"
        className="add-group"
        onClick={() => set({ ...config, groups: [...groups, newGroup()] })}
      >
        ＋ 添加条件组（或）
      </button>
    </>
  );
}

export function ConfigDrawer({ selection }: { selection: Selection }) {
  const { close, notify } = useDesigner();
  const { operation } = useClientContext();
  const node = selection.node;
  const isBranch = node.flowNodeType === 'block';
  const siblings = node.parent?.blocks || [];
  const [config, setConfig] = useState<NodeConfig>(() => structuredClone(selection.config));
  const initialPriority = siblings.findIndex((n) => n.id === node.id) + 1;
  const [priority, setPriority] = useState(initialPriority);
  const [tab, setTab] = useState('settings');
  const [error, setError] = useState('');
  useEffect(() => setError(''), [config]);
  const dialogRef = useRef<HTMLElement>(null);
  const approval = config as ApprovalConfig;
  const branch = config as BranchConfig;
  const isDefault = isBranch && branch.isDefault;
  const canDelete = !isDefault && (!isBranch || siblings.length > 2);

  useEffect(() => {
    const active = document.activeElement as HTMLElement;
    const panel = dialogRef.current;
    panel?.focus();
    const keydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
      if (e.key === 'Tab' && panel) {
        const focusable = Array.from(
          panel.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]:not(:disabled)'
          )
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
          e.preventDefault();
          last?.focus();
        } else if (
          !e.shiftKey &&
          (document.activeElement === last || document.activeElement === panel)
        ) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', keydown, true);
    return () => {
      document.removeEventListener('keydown', keydown, true);
      active?.focus();
    };
  }, [close]);

  function submit() {
    const validation = isBranch ? validateBranch(branch) : validateApproval(approval);
    setError(validation);
    if (validation) return;
    getNodeForm(node)?.setValueIn('config', { ...config, name: config.name.trim() });
    if (isBranch && !isDefault && priority !== initialPriority) {
      const ordered = reorderBranches(
        siblings.map((sibling) => sibling.toJSON()),
        node.id,
        priority
      );
      operation.moveNode(node, { index: ordered.findIndex((sibling) => sibling.id === node.id) });
    }
    notify('节点配置已更新');
    close();
  }
  function deleteNode() {
    if (!canDelete) return;
    operation.deleteNode(node);
    close();
    notify('已删除，可通过撤销恢复');
  }
  return (
    <div className="drawer-layer">
      <div className="drawer-backdrop" onClick={close} />
      <aside
        ref={dialogRef}
        className="config-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        tabIndex={-1}
      >
        <div className="drawer-heading">
          <h2 id="drawer-title">{isBranch ? '条件分支' : '审批人'}</h2>
          <button type="button" className="close-button" aria-label="关闭配置" onClick={close}>
            ×
          </button>
        </div>
        <div className="drawer-body">
          <div className="drawer-actions">
            <button
              type="button"
              className="button"
              onClick={() => {
                setConfig(structuredClone(selection.config));
                setPriority(initialPriority);
                setError('');
              }}
            >
              重置
            </button>
            <button type="button" className="button primary" onClick={submit}>
              提交
            </button>
          </div>
          {error && (
            <div role="alert" className="form-error">
              {error}
            </div>
          )}
          <div className="drawer-form">
            <FormRow label={isBranch ? '名称' : '节点名称'} required={!isBranch}>
              <input
                aria-label={isBranch ? '分支名称' : '节点名称'}
                maxLength={50}
                value={config.name}
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
              />
            </FormRow>
            {isBranch ? (
              <>
                <FormRow label="优先级">
                  <select
                    aria-label="优先级"
                    value={isDefault ? siblings.length : priority}
                    disabled={isDefault}
                    onChange={(e) => setPriority(Number(e.target.value))}
                  >
                    {Array.from(
                      { length: isDefault ? siblings.length : siblings.length - 1 },
                      (_, i) => (
                        <option key={i} value={i + 1}>
                          {i + 1}
                        </option>
                      )
                    )}
                  </select>
                </FormRow>
                <BranchSettings config={branch} set={setConfig} />
              </>
            ) : (
              <>
                <div className="drawer-tabs" role="tablist" aria-label="审批配置">
                  {[
                    ['settings', '设置'],
                    ['permissions', '表单权限'],
                    ['extension', '扩展标识'],
                  ].map(([key, label]) => (
                    <button
                      type="button"
                      role="tab"
                      aria-selected={tab === key}
                      key={key}
                      onClick={() => setTab(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div role="tabpanel">
                  {tab === 'settings' ? (
                    <ApprovalSettings config={approval} set={setConfig} />
                  ) : tab === 'permissions' ? (
                    <>
                      <h3>表单字段权限</h3>
                      <p className="muted">设置当前审批节点可查看或编辑的字段。</p>
                      <table className="permission-table">
                        <thead>
                          <tr>
                            <th>表单字段</th>
                            {['隐藏', '只读', '可编辑'].map((v) => (
                              <th key={v}>{v}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {FORM_FIELDS.map((field) => (
                            <tr key={field}>
                              <td>{field}</td>
                              {['hidden', 'read', 'edit'].map((value) => (
                                <td key={value}>
                                  <input
                                    type="radio"
                                    aria-label={`${field}${
                                      value === 'hidden'
                                        ? '隐藏'
                                        : value === 'read'
                                        ? '只读'
                                        : '可编辑'
                                    }`}
                                    name={`permission-${field}`}
                                    checked={approval.permissions[field] === value}
                                    onChange={() =>
                                      setConfig({
                                        ...approval,
                                        permissions: { ...approval.permissions, [field]: value },
                                      })
                                    }
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  ) : (
                    <>
                      <h3>扩展标识</h3>
                      <p className="muted">用于与业务系统关联，可选填。</p>
                      <textarea
                        aria-label="扩展标识"
                        rows={5}
                        maxLength={500}
                        placeholder="请输入扩展标识"
                        value={approval.extension}
                        onChange={(e) => setConfig({ ...approval, extension: e.target.value })}
                      />
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        <div className="drawer-footer">
          <button
            type="button"
            className="button danger"
            disabled={!canDelete}
            onClick={deleteNode}
          >
            {isBranch ? '删除当前分支' : '删除节点'}
          </button>
          <span>
            {isBranch ? '至少保留一条条件分支及默认分支' : '提交后更新画布，保存流程后保留配置'}
          </span>
        </div>
      </aside>
    </div>
  );
}
