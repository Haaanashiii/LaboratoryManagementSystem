import * as React from "react"

const ChartContext = React.createContext({})

function useChart() {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }

  return context
}

const ChartContainer = React.forwardRef(
  ({ id, className, children, config, ...props }, ref) => {
    const uniqueId = React.useId()
    const chartId = `chart-${id || uniqueId}`

    return (
      <ChartContext.Provider value={{ config }}>
        <div
          data-chart={chartId}
          ref={ref}
          className={className}
          {...props}
        >
          {children}
        </div>
      </ChartContext.Provider>
    )
  }
)
ChartContainer.displayName = "ChartContainer"

const ChartTooltip = ({ active, payload, config }) => {
  if (!active || !payload?.length) {
    return null
  }

  return (
    <div className="rounded-lg border bg-white p-2 shadow-sm">
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-sm text-slate-600">
            {entry.name}: {entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}
ChartTooltip.displayName = "ChartTooltip"

const ChartTooltipContent = ({ active, payload, labelKey, hideLabel }) => {
  if (!active || !payload?.length) {
    return null
  }

  return (
    <div className="rounded-lg border bg-white px-3 py-2 shadow-sm">
      <div className="grid gap-2">
        {!hideLabel && payload[0]?.payload?.[labelKey || 'name'] && (
          <div className="font-medium text-slate-900">
            {payload[0].payload[labelKey || 'name']}
          </div>
        )}
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: entry.fill || entry.color }}
            />
            <span className="text-sm text-slate-600">
              {entry.name || entry.dataKey}: <span className="font-medium text-slate-900">{entry.value}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
ChartTooltipContent.displayName = "ChartTooltipContent"

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  useChart,
}
