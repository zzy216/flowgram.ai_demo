import test from "node:test";
import assert from "node:assert/strict";
import {
  approvalDefaults,
  branchDefaults,
  approvalSummary,
  conditionSummary,
  validateApproval,
  validateBranch,
  reorderBranches,
  readSavedFlow,
  validateFlow,
} from "../src/workflow.ts";

test("approver selection requires concrete members for selected types", () => {
  const config = approvalDefaults();
  assert.equal(validateApproval(config), "请选择审批人类型");
  config.types = ["人员"];
  assert.equal(validateApproval(config), "请选择人员");
  config.members = ["张敏", "李明"];
  assert.equal(validateApproval(config), "");
  assert.equal(approvalSummary(config), "张敏、李明");
  config.types = ["发起人"];
  assert.equal(approvalSummary(config), "提交人本人");
  config.name = "  ";
  assert.equal(validateApproval(config), "请输入节点名称");
});

test("self selected approvers do not require preselected members", () => {
  const config = { ...approvalDefaults(), selection: "self" };
  assert.equal(validateApproval(config), "");
  assert.equal(approvalSummary(config), "发起人自选");
});

test("condition groups are AND internally and OR between groups", () => {
  const config = branchDefaults();
  assert.equal(validateBranch(config), "请选择工程名称");
  config.groups[0].conditions[0].values = ["中建鹏城测试项目一期"];
  config.groups[0].conditions.push({
    id: "amount",
    field: "申请金额",
    operator: "大于等于",
    values: [],
    value: "10000",
  });
  config.groups.push({
    id: "dept",
    conditions: [
      {
        id: "department",
        field: "发起人部门",
        operator: "属于",
        values: ["财务部"],
        value: "",
      },
    ],
  });
  assert.equal(validateBranch(config), "");
  assert.equal(
    conditionSummary(config),
    "工程名称 属于 中建鹏城测试项目一期 且 申请金额 大于等于 10000；或 发起人部门 属于 财务部"
  );
  config.groups[0].conditions[1].value = "not a number";
  assert.equal(validateBranch(config), "请输入有效的申请金额");
  config.groups = [];
  assert.equal(validateBranch(config), "请至少添加一个条件组");
});

test("branch reorder preserves fallback last and priority follows execution order", () => {
  const branches = [
    { id: "a", data: { config: {} } },
    { id: "b", data: { config: {} } },
    { id: "fallback", data: { config: { isDefault: true } } },
  ];
  assert.deepEqual(
    reorderBranches(branches, "b", 1).map((b) => b.id),
    ["b", "a", "fallback"]
  );
  assert.deepEqual(
    reorderBranches(branches, "fallback", 1).map((b) => b.id),
    ["a", "b", "fallback"]
  );
  assert.deepEqual(
    reorderBranches(branches, "a", 99).map((b) => b.id),
    ["b", "a", "fallback"]
  );
});

test("stored flow handles corruption and refuses invalid topology", () => {
  assert.equal(readSavedFlow("broken"), undefined);
  assert.equal(readSavedFlow('{"nodes":[]}'), undefined);
  const nodes = [
    { id: "start", type: "start" },
    { id: "end", type: "end" },
  ];
  assert.deepEqual(
    readSavedFlow(JSON.stringify({ version: 1, flow: { nodes } })),
    { nodes }
  );
  assert.equal(
    readSavedFlow(
      JSON.stringify({
        version: 1,
        flow: { nodes: [{ id: "start", type: "start" }] },
      })
    ),
    undefined
  );
  assert.equal(
    readSavedFlow(
      JSON.stringify({
        version: 1,
        flow: {
          nodes: [
            nodes[0],
            { id: "c", type: "condition", blocks: [] },
            nodes[1],
          ],
        },
      })
    ),
    undefined
  );
});

test("save reports incomplete approval nodes including nested branches", () => {
  const invalid = {
    nodes: [
      {
        type: "condition",
        blocks: [
          {
            type: "block",
            data: { config: { ...branchDefaults(), isDefault: true } },
            blocks: [
              { type: "approval", data: { config: approvalDefaults() } },
            ],
          },
        ],
      },
    ],
  };
  assert.match(validateFlow(invalid), /请选择审批人类型/);
});

test("position approvers and department managers produce readable summaries", () => {
  const config = { ...approvalDefaults(), types: ["岗位", "部门负责人"] };
  assert.equal(validateApproval(config), "请选择岗位");
  config.positions = ["项目经理"];
  assert.equal(validateApproval(config), "");
  assert.equal(approvalSummary(config), "项目经理、部门负责人");
});

test("amount boundaries, empty groups and fallback remain validatable", () => {
  const config = branchDefaults();
  const rule = config.groups[0].conditions[0];
  rule.field = "申请金额";
  rule.value = "-1";
  assert.equal(validateBranch(config), "请输入有效的申请金额");
  rule.value = "0";
  assert.equal(validateBranch(config), "");
  config.groups[0].conditions = [];
  assert.equal(validateBranch(config), "请至少添加一个条件组");
  const fallback = branchDefaults(true);
  assert.equal(validateBranch(fallback), "");
  assert.equal(conditionSummary(fallback), "不满足其他条件时，将进入默认流程");
  fallback.name = " ";
  assert.equal(validateBranch(fallback), "请输入分支名称");
});

test("full configuration roundtrips with nested branches and rejects duplicate ids", () => {
  const branch = branchDefaults();
  branch.groups[0].conditions[0].values = ["总部办公楼改造"];
  const flow = {
    nodes: [
      { id: "s", type: "start" },
      {
        id: "split",
        type: "condition",
        blocks: [
          {
            id: "b",
            type: "block",
            data: { config: branch },
            blocks: [
              {
                id: "approval",
                type: "approval",
                data: { config: { ...approvalDefaults(), types: ["发起人"] } },
              },
            ],
          },
          {
            id: "fallback",
            type: "block",
            data: { config: branchDefaults(true) },
          },
        ],
      },
      { id: "e", type: "end" },
    ],
  };
  const serialized = () => JSON.stringify({ version: 1, flow });
  assert.equal(validateFlow(flow), "");
  assert.deepEqual(readSavedFlow(serialized()), flow);
  flow.nodes[1].blocks[0].blocks[0].id = "s";
  assert.equal(readSavedFlow(serialized()), undefined);
  flow.nodes[1].blocks[0].blocks[0].id = "approval";
  delete flow.nodes[1].blocks[0].blocks[0].data.config.members;
  assert.equal(readSavedFlow(serialized()), undefined);
});
