"use client"

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"

const chartData = [
  { code: "DSM", successful: 450, failed: 300, fullName: "Desarrollo de Software Multiplataforma" },
  { code: "IRD", successful: 380, failed: 420, fullName: "Infraestructura de Redes Digitales" },
  { code: "IDTM", successful: 520, failed: 120, fullName: "Ingenieria en Desarrollo y Transformacion Mobile" },
  { code: "IMI", successful: 140, failed: 550, fullName: "Mecatronica Industrial" },
  { code: "LDDPA", successful: 600, failed: 350, fullName: "Licenciatura en Diseno Digital y Produccion Audiovisual" },
] as const

export function ChartTooltipDefault() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top carreras</CardTitle>
        <CardDescription>Referencia visual del stacked bar usado para tops historicos.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="code" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} />
            <Bar dataKey="failed" stackId="career" fill="hsl(var(--destructive))" radius={[0, 0, 8, 8]} />
            <Bar dataKey="successful" stackId="career" fill="hsl(var(--success))" radius={[8, 8, 0, 0]} />
            <Tooltip />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
