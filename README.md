# 曲线拟合工具包

这是一个独立的 React + TypeScript 曲线拟合工具，后续可以接入智实验学生端。它不会修改现有的 `smart-lab` 项目。

## 已实现功能

- 手动输入多组 x、y 数据。
- 添加和删除数据行。
- 选择线性、二次多项式、三次多项式、指数、对数、幂函数拟合。
- 显示拟合方程和拟合参数。
- 线性拟合显示斜率和截距；其他模型显示对应的系数。
- 显示决定系数 R²、调整决定系数 R²、均方根误差 RMSE、AIC、BIC。
- 绘制实验数据散点和拟合曲线。
- 将当前拟合图下载为 PNG 图片。
- 对数拟合、幂函数拟合和指数拟合进行定义域校验。
- 算法和界面分离，拟合结果可以通过 `onFit` 回调交给报告保存或 AI 报告模块。

## 本地预览

在终端执行：

```bash
cd /Users/mac/Documents/Codex/2026-10-02/users-mac-work-smartlab/outputs/smart-lab-fit-toolkit
npm install
npm run dev
```

打开终端显示的本地地址，通常是 `http://localhost:5173`。

使用步骤：

1. 在“输入数据”表格中填写至少三组 x、y 数据。
2. 在“拟合模型”中选择曲线类型。
3. 点击“生成拟合曲线”。
4. 查看方程、参数、R² 和误差指标。
5. 点击“下载 PNG 图片”保存图像。

## 检查代码

```bash
npm run typecheck
npm test
npm run build
```

## 接入学生端

构建或复制组件后，在学生端页面中使用：

```tsx
import { CurveFitWorkbench } from "@smart-lab/curve-fit-toolkit";

export default function AnalysisPage() {
  return (
    <CurveFitWorkbench
      onFit={(result) => {
        // 将原始数据和 result 保存到实验报告
        console.log(result);
      }}
    />
  );
}
```

`result` 中包含拟合模型、方程、参数、拟合曲线点、残差和统计指标：

```ts
{
  model: "linear",
  equation: "y = 2 x + 1",
  parameters: { b: 2, c: 1 },
  metrics: {
    rSquared: 1,
    adjustedRSquared: 1,
    rmse: 0,
    aic: 0,
    bic: 0
  },
  fittedPoints: [],
  residuals: [],
  warnings: []
}
```

## 统计指标说明

- **R²**：决定系数，越接近 1 表示样本点对该模型的解释程度越高。
- **调整 R²**：对参数数量进行惩罚，比较不同复杂度模型时比 R² 更稳妥。
- **RMSE**：均方根误差，越小表示拟合点与原始数据的平均偏差越小。
- **AIC / BIC**：同时考虑拟合误差和模型复杂度，可辅助比较模型；不能脱离实验物理规律单独决定模型。

## 注意事项

指数拟合和幂函数拟合目前使用对数变换。对于误差不是乘性误差的实验，应进一步替换为非线性最小二乘法，再把结果作为正式实验计算依据。高阶多项式也可能把噪声拟合进去，应结合真实实验规律选择模型。
