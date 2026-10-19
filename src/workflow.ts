export const STORAGE_KEY = 'flowgram-approval-designer-v1';
export const PROJECTS = ['中建鹏城测试项目一期', '中建鹏城测试项目二期', '总部办公楼改造'];
export const MEMBERS = ['张敏', '李明', '王芳', '刘洋'];
export const POSITIONS = ['工程负责人', '项目经理', '财务主管', '总经理'];
export const DEPARTMENTS = ['工程部', '财务部', '行政部', '采购部'];
export const FORM_FIELDS = ['工程名称', '申请金额', '发起人部门', '申请说明'];
export type ApproverType = '岗位' | '人员' | '发起人' | '部门负责人' | '发起人直属主管';
export interface ApprovalConfig {
  name: string;
  selection: string;
  types: ApproverType[];
  members: string[];
  positions: string[];
  mode: string;
  transferable: boolean;
  preventWithdraw: boolean;
  nextApprover: string;
  resubmit: string;
  ccInitiator: boolean;
  ccMembers: string[];
  permissions: Record<string, string>;
  extension: string;
}
export interface ConditionRule {
  id: string;
  field: string;
  operator: string;
  values: string[];
  value: string;
}
export interface ConditionGroup {
  id: string;
  conditions: ConditionRule[];
}
export interface BranchConfig {
  name: string;
  isDefault: boolean;
  groups: ConditionGroup[];
}
export type NodeConfig = ApprovalConfig | BranchConfig;
export const uid = () => globalThis.crypto.randomUUID();
export const newRule = (): ConditionRule => ({
  id: uid(),
  field: '工程名称',
  operator: '属于',
  values: [],
  value: '',
});
export const newGroup = (): ConditionGroup => ({ id: uid(), conditions: [newRule()] });
export function approvalDefaults(): ApprovalConfig {
  return {
    name: '审批人',
    selection: 'specified',
    types: [],
    members: [],
    positions: [],
    mode: 'or',
    transferable: true,
    preventWithdraw: false,
    nextApprover: 'optional',
    resubmit: 'restart',
    ccInitiator: false,
    ccMembers: [],
    permissions: Object.fromEntries(FORM_FIELDS.map((f) => [f, 'read'])),
    extension: '',
  };
}
export function branchDefaults(isDefault = false): BranchConfig {
  return {
    name: isDefault ? '默认条件' : '条件分支',
    isDefault,
    groups: isDefault ? [] : [newGroup()],
  };
}
export function approvalSummary(config: ApprovalConfig): string {
  if (config.selection === 'self') return '发起人自选';
  return config.types
    .flatMap((t) =>
      t === '人员'
        ? config.members
        : t === '岗位'
        ? config.positions
        : t === '发起人'
        ? ['提交人本人']
        : [t]
    )
    .join('、');
}
export function conditionSummary(config: BranchConfig): string {
  if (config.isDefault) return '不满足其他条件时，将进入默认流程';
  return config.groups
    .map((g) =>
      g.conditions
        .map(
          (c) =>
            `${c.field} ${c.operator} ${c.field === '申请金额' ? c.value : c.values.join('、')}`
        )
        .join(' 且 ')
    )
    .join('；或 ');
}
export function validateApproval(config: ApprovalConfig): string {
  if (!config.name.trim()) return '请输入节点名称';
  if (config.selection === 'self') return '';
  if (!config.types.length) return '请选择审批人类型';
  if (config.types.includes('人员') && !config.members.length) return '请选择人员';
  if (config.types.includes('岗位') && !config.positions.length) return '请选择岗位';
  return '';
}
export function validateBranch(config: BranchConfig): string {
  if (!config.name.trim()) return '请输入分支名称';
  if (config.isDefault) return '';
  if (!config.groups.length || config.groups.some((g) => !g.conditions.length))
    return '请至少添加一个条件组';
  for (const group of config.groups) {
    for (const rule of group.conditions) {
      if (rule.field === '申请金额') {
        if (!rule.value.trim() || !Number.isFinite(Number(rule.value)) || Number(rule.value) < 0)
          return '请输入有效的申请金额';
      } else if (!rule.values.length) return `请选择${rule.field}`;
    }
  }
  return '';
}
interface FlowItem {
  id?: string;
  type?: string | number;
  data?: { config?: NodeConfig };
  blocks?: FlowItem[];
}
export function reorderBranches<T extends FlowItem>(
  branches: T[],
  nodeId: string,
  priority: number
): T[] {
  const current = branches.find((b) => b.id === nodeId);
  if (!current || (current.data?.config as BranchConfig)?.isDefault) return [...branches];
  const regular = branches.filter(
    (b) => b.id !== nodeId && !(b.data?.config as BranchConfig)?.isDefault
  );
  regular.splice(Math.max(0, Math.min(regular.length, priority - 1)), 0, current);
  return [...regular, ...branches.filter((b) => (b.data?.config as BranchConfig)?.isDefault)];
}
export function validateFlow(flow: { nodes: FlowItem[] }): string {
  for (const node of flow.nodes) {
    const config = node.data?.config;
    const error =
      node.type === 'approval'
        ? validateApproval(config as ApprovalConfig)
        : node.type === 'block'
        ? validateBranch(config as BranchConfig)
        : '';
    if (error) return `${config?.name || '节点'}：${error}`;
    if (node.blocks) {
      const nested = validateFlow({ nodes: node.blocks });
      if (nested) return nested;
    }
  }
  return '';
}
export function readSavedFlow(raw: string | null): { nodes: FlowItem[] } | undefined {
  try {
    const saved = JSON.parse(raw || 'null');
    const nodes = saved?.flow?.nodes;
    if (
      saved?.version !== 1 ||
      !Array.isArray(nodes) ||
      nodes.length < 2 ||
      nodes[0].type !== 'start' ||
      nodes[nodes.length - 1].type !== 'end'
    )
      return undefined;
    const ids = new Set<string>();
    const valid = (items: FlowItem[]): boolean =>
      items.every((n) => {
        if (
          !n.id ||
          ids.has(n.id) ||
          !['start', 'end', 'approval', 'condition', 'block'].includes(String(n.type || ''))
        )
          return false;
        ids.add(n.id);
        if (n.type === 'approval') {
          const c = n.data?.config as ApprovalConfig;
          if (
            !c ||
            typeof c.name !== 'string' ||
            !Array.isArray(c.types) ||
            !Array.isArray(c.members) ||
            !Array.isArray(c.positions) ||
            !Array.isArray(c.ccMembers) ||
            !c.permissions
          )
            return false;
        }
        if (n.type === 'block') {
          const c = n.data?.config as BranchConfig;
          if (
            !c ||
            typeof c.name !== 'string' ||
            !Array.isArray(c.groups) ||
            !c.groups.every(
              (g) =>
                Array.isArray(g.conditions) &&
                g.conditions.every((r) => typeof r.value === 'string' && Array.isArray(r.values))
            )
          )
            return false;
        }
        if (n.type === 'condition') {
          if (
            !n.blocks ||
            n.blocks.length < 2 ||
            n.blocks.some((b) => b.type !== 'block') ||
            n.blocks.filter((b) => (b.data?.config as BranchConfig)?.isDefault).length !== 1 ||
            !(n.blocks[n.blocks.length - 1]?.data?.config as BranchConfig)?.isDefault
          )
            return false;
        }
        return !n.blocks || valid(n.blocks);
      });
    return valid(nodes) ? saved.flow : undefined;
  } catch {
    return undefined;
  }
}
