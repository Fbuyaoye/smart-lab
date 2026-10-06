import { displayValue, reportData } from "@/lib/reports";

export default function ReportContent({ rawData, calculation }: { rawData: unknown; calculation: unknown }) {
  const data = reportData(rawData, calculation);
  const unit = data.unit ? `（${data.unit}）` : "";

  return <>
    <section className="report-section" aria-label="原始测量数据">
      <h3>原始测量数据</h3>
      {data.measuredRows.length ? <div className="table-wrap">
        <table>
          <thead><tr><th scope="col">序号</th><th scope="col">{data.xLabel}</th><th scope="col">{data.yLabel}</th></tr></thead>
          <tbody>{data.measuredRows.map((row, index) => <tr key={index}>
            <td>{index + 1}</td><td>{displayValue(row.x)}</td><td>{displayValue(row.y)}</td>
          </tr>)}</tbody>
        </table>
      </div> : <p className="muted small">暂无可展示的测量数据。</p>}
    </section>

    <section className="report-section" aria-label="计算结果">
      <h3>{data.calculationTitle}</h3>
      {data.formula && <p>实验公式：<strong>{data.formula}</strong></p>}
      {data.calculatedRows.length > 0 && <div className="table-wrap">
        <table>
          <thead><tr><th scope="col">序号</th><th scope="col">{data.xLabel}</th><th scope="col">{data.yLabel}</th><th scope="col">{data.deriveLabel}{unit}</th></tr></thead>
          <tbody>{data.calculatedRows.map((row, index) => <tr key={index}>
            <td>{index + 1}</td><td>{displayValue(row.x)}</td><td>{displayValue(row.y)}</td><td>{displayValue(row.value)}</td>
          </tr>)}</tbody>
        </table>
      </div>}
      <p>平均值：<strong>{data.averageValue}{data.averageValue !== "—" && data.unit ? ` ${data.unit}` : ""}</strong></p>
      {(data.model || data.equation) && <div className="report-content">
        <div>拟合模型：{data.model === "linear" ? "线性拟合" : data.model || "未提供"}</div>
        <div>拟合方程：{data.equation || "未提供"}</div>
      </div>}
      {data.parameters.length > 0 && <p className="small">拟合参数：{data.parameters.map(([name, value]) => `${name} = ${displayValue(value)}`).join("；")}</p>}
      {data.metrics.length > 0 && <dl className="report-metrics">
        {data.metrics.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{displayValue(value)}</dd></div>)}
      </dl>}
      {data.warnings.map((warning, index) => <p className="notice" key={index}>{warning}</p>)}
    </section>

    <details className="report-source">
      <summary>查看完整原始数据与计算记录</summary>
      <h3>原始数据</h3><pre className="report-content">{JSON.stringify(rawData ?? {}, null, 2)}</pre>
      <h3>计算记录</h3><pre className="report-content">{JSON.stringify(calculation ?? {}, null, 2)}</pre>
    </details>
  </>;
}
