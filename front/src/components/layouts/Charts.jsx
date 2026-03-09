import React from "react"
import { Package } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, LabelList, RadialBar, RadialBarChart } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

// User Distribution Chart (Radial)
const roleColors = {
  admin: "hsl(0, 70%, 55%)",
  head_of_lab: "hsl(270, 70%, 60%)",
  lecturer: "hsl(210, 70%, 55%)",
  lab_assistant: "hsl(45, 90%, 55%)",
  student: "hsl(160, 70%, 50%)",
}

const roleLabels = {
  admin: 'Administrators',
  head_of_lab: 'Head of Lab',
  lecturer: 'Lecturers',
  lab_assistant: 'Lab Assistants',
  student: 'Students',
}

const userChartConfig = {
  count: {
    label: "Users",
  },
  admin: {
    label: "Administrators",
    color: roleColors.admin,
  },
  head_of_lab: {
    label: "Head of Lab",
    color: roleColors.head_of_lab,
  },
  lecturer: {
    label: "Lecturers",
    color: roleColors.lecturer,
  },
  lab_assistant: {
    label: "Lab Assistants",
    color: roleColors.lab_assistant,
  },
  student: {
    label: "Students",
    color: roleColors.student,
  },
}

export function UserDistributionChart({ users = [] }) {
  // Calculate user distribution
  const distribution = ['admin', 'head_of_lab', 'lecturer', 'lab_assistant', 'student'].map(role => ({
    role: roleLabels[role],
    count: users.filter(u => u.role === role).length,
    fill: roleColors[role],
  })).filter(item => item.count > 0)

  const totalUsers = users.length

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>User Distribution</CardTitle>
        <CardDescription>By Role</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={userChartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <RadialBarChart
            data={distribution}
            startAngle={-90}
            endAngle={270}
            innerRadius={30}
            outerRadius={110}
          >
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel nameKey="role" />}
            />
            <RadialBar dataKey="count" background>
              <LabelList
                position="insideStart"
                dataKey="role"
                className="fill-white capitalize mix-blend-luminosity"
                fontSize={11}
              />
            </RadialBar>
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 leading-none font-medium">
          Total users: {totalUsers}
        </div>
        <div className="leading-none text-slate-500">
          Distribution across all user roles
        </div>
      </CardFooter>
    </Card>
  )
}

// Equipment Statistics Chart (Bar)
const equipmentChartConfig = {
  borrowed: {
    label: "Borrowed",
    color: "hsl(210, 70%, 55%)",
  },
  available: {
    label: "Available",
    color: "hsl(160, 70%, 50%)",
  },
}

export function EquipmentStatsChart({ equipment = [], requests = [] }) {
  // Calculate borrowed count per equipment
  const borrowedCounts = {}
  requests.forEach(req => {
    if (req.status === 'borrowed') {
      const key = req.equipment_id || req.equipment_name
      borrowedCounts[key] = (borrowedCounts[key] || 0) + (req.quantity || 1)
    }
  })

  // Prepare chart data - top 5 most borrowed equipment
  const chartData = equipment
    .map(eq => ({
      name: eq.name.length > 15 ? eq.name.substring(0, 15) + '...' : eq.name,
      borrowed: borrowedCounts[eq.id] || borrowedCounts[eq.name] || 0,
      available: eq.available || 0,
    }))
    .sort((a, b) => b.borrowed - a.borrowed)
    .slice(0, 5)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Equipment Statistics</CardTitle>
        <CardDescription>Top 5 Most Borrowed Equipment</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={equipmentChartConfig} className="h-[300px] w-full">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="name"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              className="text-xs"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="text-xs"
            />
            <ChartTooltip
              content={<ChartTooltipContent />}
            />
            <Bar
              dataKey="borrowed"
              fill={equipmentChartConfig.borrowed.color}
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="available"
              fill={equipmentChartConfig.available.color}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 font-medium leading-none">
          Equipment usage overview <Package className="h-4 w-4" />
        </div>
        <div className="leading-none text-slate-500">
          Showing borrowed vs available units
        </div>
      </CardFooter>
    </Card>
  )
}
