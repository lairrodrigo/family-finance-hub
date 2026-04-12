import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardSection } from "./DashboardSection";
import { Calculator, Delete, Trash2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const CalculatorSection = () => {
  const [display, setDisplay] = useState("0");
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [resetDisplay, setResetDisplay] = useState(false);

  const handleNumber = (num: string) => {
    if (display === "0" || resetDisplay) {
      setDisplay(num);
      setResetDisplay(false);
    } else {
      setDisplay(display + num);
    }
  };

  const handleOperator = (op: string) => {
    const current = parseFloat(display.replace(",", "."));
    
    if (prevValue === null) {
      setPrevValue(current);
    } else if (operator) {
      const result = calculate(prevValue, current, operator);
      setPrevValue(result);
      setDisplay(result.toString().replace(".", ","));
    }
    
    setOperator(op);
    setResetDisplay(true);
  };

  const calculate = (a: number, b: number, op: string): number => {
    switch (op) {
      case "+": return a + b;
      case "-": return a - b;
      case "*": return a * b;
      case "/": return b !== 0 ? a / b : 0;
      default: return b;
    }
  };

  const handleEqual = () => {
    if (prevValue === null || !operator) return;
    
    const current = parseFloat(display.replace(",", "."));
    const result = calculate(prevValue, current, operator);
    
    setDisplay(result.toString().replace(".", ","));
    setPrevValue(null);
    setOperator(null);
    setResetDisplay(true);
  };

  const handleClear = () => {
    setDisplay("0");
    setPrevValue(null);
    setOperator(null);
    setResetDisplay(false);
  };

  const handleDelete = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay("0");
    }
  };

  const buttons = [
    { label: "C", action: handleClear, variant: "destructive", icon: <Trash2 className="h-4 w-4" /> },
    { label: "DEL", action: handleDelete, variant: "secondary", icon: <Delete className="h-4 w-4" /> },
    { label: "/", action: () => handleOperator("/"), variant: "secondary" },
    { label: "*", action: () => handleOperator("*"), variant: "secondary" },
    { label: "7", action: () => handleNumber("7") },
    { label: "8", action: () => handleNumber("8") },
    { label: "9", action: () => handleNumber("9") },
    { label: "-", action: () => handleOperator("-"), variant: "secondary" },
    { label: "4", action: () => handleNumber("4") },
    { label: "5", action: () => handleNumber("5") },
    { label: "6", action: () => handleNumber("6") },
    { label: "+", action: () => handleOperator("+"), variant: "secondary" },
    { label: "1", action: () => handleNumber("1") },
    { label: "2", action: () => handleNumber("2") },
    { label: "3", action: () => handleNumber("3") },
    { label: "=", action: handleEqual, variant: "default", className: "row-span-2 h-full" },
    { label: "0", action: () => handleNumber("0"), className: "col-span-2" },
    { label: ",", action: () => !display.includes(",") && handleNumber(",") },
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card className="flex items-center justify-between p-4 border-none bg-card/60 hover:bg-card/80 transition-all cursor-pointer group">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold">Calculadora</p>
              <p className="text-[12px] text-muted-foreground">Contas rápidas sem sair daqui</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
        </Card>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[360px] p-0 border-none bg-background/95 backdrop-blur-xl">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Calculadora
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-6 space-y-4">
          {/* Display */}
          <div className="rounded-2xl bg-muted/40 p-6 text-right shadow-inner border border-white/5">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold h-4 mb-1">
              {prevValue !== null ? `${prevValue} ${operator || ""}` : ""}
            </p>
            <p className="overflow-hidden text-ellipsis whitespace-nowrap text-3xl font-bold tracking-tighter">
              {display}
            </p>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-4 gap-2.5">
            {buttons.map((btn, idx) => (
              <Button
                key={idx}
                variant={(btn.variant as any) || "outline"}
                onClick={btn.action}
                className={cn(
                  "h-14 rounded-2xl font-bold text-base transition-all hover:scale-105 active:scale-95 border-none",
                  !btn.variant && "bg-muted hover:bg-muted/80",
                  btn.label === "=" && "bg-primary text-primary-foreground shadow-lg shadow-primary/20",
                  btn.className
                )}
              >
                {btn.icon || btn.label}
              </Button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
