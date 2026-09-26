"use client"

import { PrinterIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

export function PrintButton() { return <Button type="button" onClick={() => window.print()}><PrinterIcon data-icon="inline-start" />طباعة السند</Button> }
