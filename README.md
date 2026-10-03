# 智实验 · 学生端

智实验（Smart Lab）是面向大学物理实验教学的智能实验辅助平台。

当前 `student-frontend` 分支主要负责**学生端页面、实验工作台、数据分析以及学生端交互体验**，覆盖从查看实验任务、录入实验数据、计算与拟合分析，到实验报告提交的完整学生侧流程。

---

## 学生端功能

### 1. 学生登录

路径：

```text
/login
```

当前使用 Supabase Auth 完成学生登录。

> 当前登录流程已经可以正常使用；正式的“学号 + 密码”登录映射方案后续可根据团队统一的账号方案进一步调整。

### 2. 学生首页

路径：

```text
/student
```

提供：

- 学生基本信息
- 实验任务统计
- 最近实验任务
- 实验完成状态
- 实验、数据分析、班级等快捷入口

首页任务状态已经与 Supabase `reports` 数据联动：

```text
待完成
已提交
已批改
```

### 3. 我的任务

路径：

```text
/student/tasks
```

学生可以查看当前可完成的实验任务，包括：

- 实验名称
- 班级
- 截止时间
- 实验状态
- 进入实验

任务页面使用 Supabase 的 `tasks`、`experiments` 和 `reports` 数据进行组合展示。

### 4. 实验工作台

路径：

```text
/student/experiment
```

支持通过任务 ID 打开指定实验：

```text
/student/experiment?taskId=任务ID
```

没有指定 `taskId` 时，页面会自动寻找当前学生尚未完成的实验任务。

实验工作台包含：

```text
实验原理
    ↓
实验数据
    ↓
数据计算
    ↓
拟合分析
    ↓
AI 实验报告
    ↓
提交实验
```

主要功能：

- 查看实验原理
- 查看实验重点
- 查看实验步骤
- 录入实验数据
- 自动计算实验结果
- 曲线拟合
- 查看拟合方程、参数和 R²
- 查看 AI 实验报告区域
- 提交实验报告

### 5. 实验数据

目前支持实验数据的录入与编辑，包括：

- 添加数据
- 删除数据
- 数据有效性判断
- 实验数据状态提示
- 根据实验类型生成对应数据点

### 6. 数据计算

实验页面根据不同实验类型进行对应计算，并展示计算结果。

当前学生端已针对多个实验配置实验数据和计算流程，包括：

1. 用伏安法测电阻
2. 单摆法测重力加速度
3. 薄透镜焦距测量
4. 分光计-三棱镜实验
5. 液晶电光效应实验
6. 电表的改装
7. 落球法测液体的粘滞系数

### 7. 拟合曲线

学生端实验页面支持实验数据拟合和结果展示：

- 实验数据点绘制
- 动态拟合曲线
- 拟合方程
- 拟合参数
- R²
- 残差/数据质量相关信息
- X/Y 坐标轴展示

曲线拟合核心能力已经独立封装到：

```text
fit-toolkit/
```

并以本地 npm package 的形式供学生端使用：

```text
@smart-lab/curve-fit-toolkit
```

### 8. 通用数据分析

路径：

```text
/student/analysis
```

提供独立的数据拟合与分析工作台：

```text
输入 X / Y 数据
      ↓
选择拟合模型
      ↓
进行数据分析
      ↓
查看拟合曲线
      ↓
查看拟合结果
```

该页面主要用于展示和使用曲线拟合工具包能力。

### 9. AI 实验报告

实验页面已经完成 AI 实验报告相关的前端交互区域，包括：

- 实验数据摘要
- 有效数据组数
- 平均值/计算结果
- 拟合参数
- R²
- 数据质量提示
- 报告生成状态
- 报告正文展示

目前**AI 模型/API 尚未正式接入**。

团队正在开发针对大学物理实验场景的 AI 模型，后续根据最终模型的调用方式接入学生端。

AI 报告生成结果计划写入：

```text
reports.ai_content
```

### 10. 实验报告提交

学生完成实验后可以提交报告。

提交后会将实验数据和计算结果写入 Supabase `reports` 表，并将报告状态更新为：

```text
submitted
```

教师批改后可以进一步变为：

```text
graded
```

因此首页和任务页可以根据数据库状态显示：

```text
待完成 → 已提交 → 已批改
```

### 11. 我的班级

路径：

```text
/student/class
```

主要功能：

- 查看当前加入的班级
- 查看班级信息
- 使用邀请码加入班级

班级关系通过 Supabase `class_members` 表保存。

### 12. AI 知识问答

路径：

```text
/student/qa
```

提供大学物理实验相关的 AI 辅助问答入口。

当前主要完成学生端页面和交互，AI 接口后续统一接入。

### 13. 学生设置

路径：

```text
/student/settings
```

包括：

- 个人信息
- 账号设置
- 密码设置
- 通知设置
- 关于平台

---

## 页面结构

```text
app/
├── login/
│   └── page.tsx
│
└── student/
    ├── layout.tsx
    ├── page.tsx
    ├── tasks/
    │   └── page.tsx
    ├── experiment/
    │   └── page.tsx
    ├── analysis/
    │   └── page.tsx
    ├── class/
    │   └── page.tsx
    ├── qa/
    │   └── page.tsx
    └── settings/
        ├── page.tsx
        ├── password/
        │   └── page.tsx
        ├── notifications/
        │   └── page.tsx
        └── about/
            └── page.tsx
```

---

## 技术栈

| 技术 | 用途 |
|---|---|
| Next.js | 学生端 Web 应用 |
| React | 页面与交互 |
| TypeScript | 类型支持 |
| Tailwind CSS | 页面样式 |
| Supabase | 数据库与用户认证 |
| PostgreSQL | 业务数据存储 |
| Supabase Auth | 用户认证 |
| @supabase/ssr | Next.js Supabase 客户端 |
| @smart-lab/curve-fit-toolkit | 数据拟合与分析 |
| Git / GitHub | 版本管理 |
| Vercel | 后续公网部署 |

---

## Supabase 数据

学生端已经接入 Supabase，主要使用以下数据表：

```text
users
classes
class_members
experiments
tasks
reports
```

### users

保存用户基本信息：

```text
id
name
role
student_id
```

### classes

保存课程/班级信息。

### class_members

保存学生与班级之间的关系。

### experiments

保存实验基础信息：

```text
id
name
principle
key_points
procedure
created_at
```

当前数据库中已经录入的实验包括：

1. 用伏安法测电阻
2. 单摆法测重力加速度
3. 薄透镜焦距测量
4. 分光计-三棱镜实验
5. 液晶电光效应实验
6. 电表的改装
7. 落球法测液体的粘滞系数

### tasks

保存教师发布给班级的实验任务：

```text
id
class_id
experiment_id
deadline
created_at
```

### reports

保存学生实验报告和提交状态：

```text
task_id
student_id
raw_data
calculation
ai_content
final_content
status
```

其中：

- `raw_data`：实验原始数据
- `calculation`：实验计算结果
- `ai_content`：AI 生成的实验报告内容
- `final_content`：学生最终提交的报告内容
- `status`：报告状态

当前主要状态：

```text
submitted
graded
```

---

## 学生端数据流程

```text
Supabase Auth 登录
        ↓
学生首页
        ↓
查看任务
        ↓
进入实验
        ↓
读取 experiments
        ↓
录入实验数据
        ↓
计算 / 拟合分析
        ↓
AI 实验报告（待接入）
        ↓
写入 reports
        ↓
提交实验
        ↓
教师端查看 / 批改
```

---

## 本地运行

进入项目目录：

```bash
cd D:\project\smart-lab
```

安装依赖：

```bash
npm install
```

启动开发服务器：

```bash
npm run dev
```

访问：

```text
http://localhost:3000
```

---

## 环境变量

在项目根目录创建：

```text
.env.local
```

配置 Supabase：

```env
NEXT_PUBLIC_SUPABASE_URL=你的_Supabase_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=你的_Supabase_Publishable_Key
```

不要将 Supabase Service Role Key、AI API Key 等敏感密钥提交到 GitHub。

---

## 当前开发进度

### 已完成

- [x] 学生端整体布局
- [x] 学生登录页面
- [x] 学生首页
- [x] 学生任务页面
- [x] Supabase 真实任务数据
- [x] 实验工作台
- [x] 实验原理
- [x] 实验数据录入
- [x] 实验计算
- [x] 动态曲线拟合
- [x] 拟合曲线坐标轴
- [x] R² / 数据质量分析
- [x] 独立数据分析工具
- [x] `@smart-lab/curve-fit-toolkit` 接入
- [x] Supabase Auth 接入
- [x] 学生班级页面
- [x] 学生设置页面
- [x] 实验报告保存到 Supabase
- [x] 实验报告提交状态同步
- [x] 首页显示“待完成 / 已提交 / 已批改”
- [x] 学生 AI 实验报告前端页面
- [x] 学生 AI 问答前端页面

### 待完成

- [ ] 接入最终 AI 实验报告模型/API
- [ ] AI 实验报告正式生成
- [ ] AI 问答接口
- [ ] 与教师端完整联调
- [ ] 最终登录方案统一
- [ ] 全流程测试
- [ ] Vercel 公网部署

---

## 学生端核心流程

```text
登录
 ↓
学生首页
 ↓
查看实验任务
 ↓
进入实验工作台
 ↓
实验原理
 ↓
录入实验数据
 ↓
数据计算
 ↓
拟合分析
 ↓
AI 实验报告
 ↓
提交实验
 ↓
教师查看 / 批改
```

---

## Git 分支

当前学生端开发分支：

```text
student-frontend
```

本分支主要负责：

- 学生端页面
- 学生端 UI 与交互
- 实验工作台
- 学生端 Supabase 数据读取与提交
- 数据分析工具前端接入
- AI 报告接口的前端对接

教师端、AI 模型核心能力以及最终公网部署由团队后续统一联调。

---

## 当前项目状态

学生端已经完成主要页面、实验流程、Supabase 数据读写和实验报告提交功能，当前处于**学生端已基本完成、等待 AI 模型和教师端联调**的阶段。

下一阶段主要工作：

```text
AI 模型 / API
      +
教师端
      +
学生端
      ↓
完整联调
      ↓
全流程测试
      ↓
Vercel 公网部署
```
