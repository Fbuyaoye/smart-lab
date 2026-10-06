import "./curve-fit.css";
import { useRef, useState } from "react";
import { CurveChart } from "./CurveChart";
import { FIT_MODELS, FitError, fitCurve, type FitModel, type FitResult, type Point } from "./core";

type EditablePoint = { id: number; x: string; y: string };

export type CurveFitWorkbenchProps = {
  initialPoints?: Point[];
  initialModel?: FitModel;
  onFit?: (result: FitResult) => void;
};

const INITIAL_ROWS: EditablePoint[] = [
  { id: 1, x: "", y: "" },
  { id: 2, x: "", y: "" },
  { id: 3, x: "", y: "" },
];

function formatMetric(value: number | null): string {
  return value === null ? "无" : Number(value.toPrecision(6)).toString();
}

function parameterLabel(model: FitModel, key: string): string {
  if (model === "linear") return key === "b" ? "斜率 b" : "截距 c";
  if (model === "quadratic") return key === "a" ? "二次项 a" : key === "b" ? "一次项 b" : "截距 c";
  if (model === "cubic") return key === "d" ? "三次项 d" : key === "a" ? "二次项 a" : key === "b" ? "一次项 b" : "截距 c";
  if (model === "exponential") return key === "a" ? "系数 a" : "指数系数 b";
  if (model === "logarithmic") return key === "a" ? "对数系数 a" : "截距 b";
  return key === "a" ? "系数 a" : "指数 b";
}

function exportPng(svg: SVGSVGElement): void {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const viewBox = svg.viewBox.baseVal;
  clone.setAttribute("width", String(viewBox.width));
  clone.setAttribute("height", String(viewBox.height));
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const image = new Image();
  const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  image.onload = () => {
    const canvas = document.createElement("canvas");
    const scale = 2;
    canvas.width = viewBox.width * scale;
    canvas.height = viewBox.height * scale;
    const context = canvas.getContext("2d");
    if (context) {
      context.scale(scale, scale);
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, viewBox.width, viewBox.height);
      context.drawImage(image, 0, 0);
      const link = document.createElement("a");
      link.download = "曲线拟合.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    }
    URL.revokeObjectURL(url);
  };
  image.src = url;
}

export function CurveFitWorkbench({ initialPoints, initialModel = "linear", onFit }: CurveFitWorkbenchProps) {
  const [rows, setRows] = useState<EditablePoint[]>(() =>
    initialPoints?.length
      ? initialPoints.map((point, index) => ({ id: index + 1, x: String(point.x), y: String(point.y) }))
      : INITIAL_ROWS,
  );
  const [model, setModel] = useState<FitModel>(initialModel);
  const [result, setResult] = useState<FitResult | null>(null);
  const [error, setError] = useState("");
  const svgRef = useRef<SVGSVGElement>(null);

  const updateRow = (id: number, field: "x" | "y", value: string) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const createFit = () => {
    try {
      const points = rows.map((row, index) => {
        if (row.x.trim() === "" || row.y.trim() === "") throw new FitError(`Row ${index + 1} needs both x and y.`);
        return { x: Number(row.x), y: Number(row.y) };
      });
      const nextResult = fitCurve(points, model);
      setResult(nextResult);
      setError("");
      onFit?.(nextResult);
    } catch (fitError) {
      setResult(null);
      setError(fitError instanceof Error ? fitError.message : "Unable to fit this data.");
    }
  };

  return (
    <section className="curve-fit-workbench" aria-label="曲线拟合工具">
      <div className="curve-fit-heading">
        <div>
          <p>数据分析工具</p>
          <h1>曲线拟合</h1>
        </div>
        <button type="button" className="curve-fit-download" onClick={() => svgRef.current && exportPng(svgRef.current)} disabled={!result}>
          下载 PNG 图片
        </button>
      </div>

      <div className="curve-fit-layout">
        <section className="curve-fit-panel">
          <div className="curve-fit-panel-title"><h2>输入数据</h2><span>{rows.length} 组数据</span></div>
          <div className="curve-fit-table-wrap">
            <table>
              <thead><tr><th>序号</th><th>x</th><th>y</th><th aria-label="删除数据行" /></tr></thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id}>
                    <td>{index + 1}</td>
                    <td><input aria-label={`第 ${index + 1} 行 x 数据`} inputMode="decimal" value={row.x} onChange={(event) => updateRow(row.id, "x", event.target.value)} /></td>
                    <td><input aria-label={`第 ${index + 1} 行 y 数据`} inputMode="decimal" value={row.y} onChange={(event) => updateRow(row.id, "y", event.target.value)} /></td>
                    <td><button type="button" className="curve-fit-icon-button" aria-label={`删除第 ${index + 1} 行`} onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))} disabled={rows.length <= 2}>删除</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className="curve-fit-add" onClick={() => setRows((current) => [...current, { id: Date.now(), x: "", y: "" }])}>+ 添加数据行</button>
          <label className="curve-fit-field">
            <span>拟合模型</span>
            <select value={model} onChange={(event) => setModel(event.target.value as FitModel)}>
              {FIT_MODELS.map((option) => <option value={option.id} key={option.id}>{option.label}</option>)}
            </select>
          </label>
          <button type="button" className="curve-fit-submit" onClick={createFit}>生成拟合曲线</button>
          {error && <p className="curve-fit-error" role="alert">{error}</p>}
        </section>

        <section className="curve-fit-panel curve-fit-output">
          {!result ? <div className="curve-fit-empty" aria-live="polite">输入数据并生成拟合曲线。</div> : <>
            <div className="curve-fit-panel-title"><h2>拟合结果</h2><span>{FIT_MODELS.find((option) => option.id === result.model)?.label}</span></div>
            <p className="curve-fit-equation">{result.equation}</p>
            <CurveChart ref={svgRef} points={result.residuals} result={result} />
            <div className="curve-fit-parameters" aria-label="拟合参数">
              <h3>拟合参数</h3>
              <dl>{Object.entries(result.parameters).map(([key, value]) => <div key={key}><dt>{parameterLabel(result.model, key)}</dt><dd>{formatMetric(value)}</dd></div>)}</dl>
            </div>
            <dl className="curve-fit-metrics">
              <div><dt>决定系数 R²</dt><dd>{formatMetric(result.metrics.rSquared)}</dd></div>
              <div><dt>调整决定系数 R²</dt><dd>{formatMetric(result.metrics.adjustedRSquared)}</dd></div>
              <div><dt>均方根误差 RMSE</dt><dd>{formatMetric(result.metrics.rmse)}</dd></div>
              <div><dt>赤池信息量 AIC</dt><dd>{formatMetric(result.metrics.aic)}</dd></div>
              <div><dt>贝叶斯信息量 BIC</dt><dd>{formatMetric(result.metrics.bic)}</dd></div>
            </dl>
            {result.warnings.length > 0 && <ul className="curve-fit-warnings">{result.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
          </>}
        </section>
      </div>
    </section>
  );
}
